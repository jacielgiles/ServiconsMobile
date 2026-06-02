import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { upsertLiveLocation } from '../services/locationService';

const UPLOAD_INTERVAL_MS = 30_000;

type Options = {
  custodioId: string | undefined;
  bitacoraId: string | undefined;
  enabled: boolean;
};

/** Sube la ubicacion actual del custodio a Supabase cada ~30s mientras hay custodia activa */
export function useLiveLocationTracker({ custodioId, bitacoraId, enabled }: Options) {
  const [lastUploadAt, setLastUploadAt] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastUploadRef = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const pushLocation = async (position: Location.LocationObject) => {
    if (!custodioId) return;

    const now = Date.now();
    if (now - lastUploadRef.current < UPLOAD_INTERVAL_MS - 2000) return;

    lastUploadRef.current = now;

    const { error } = await upsertLiveLocation({
      custodioId,
      bitacoraId,
      latitud: position.coords.latitude,
      longitud: position.coords.longitude,
      precision_m: position.coords.accuracy ?? null,
      heading: position.coords.heading ?? null,
    });

    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setLastUploadAt(new Date().toISOString());
  };

  useEffect(() => {
    if (!enabled || !custodioId) return;

    let cancelled = false;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      try {
        const immediate = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!cancelled) await pushLocation(immediate);
      } catch {
        /* GPS inicial opcional */
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: UPLOAD_INTERVAL_MS,
        },
        (pos) => {
          void pushLocation(pos);
        },
      );
    };

    void start();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active' && custodioId) {
        void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then(pushLocation)
          .catch(() => {});
      }
    };

    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
      sub.remove();
    };
  }, [enabled, custodioId, bitacoraId]);

  return { lastUploadAt, uploadError };
}
