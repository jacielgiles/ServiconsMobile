import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { clearLiveLocation, upsertLiveLocation } from '../services/locationService';

const UPLOAD_INTERVAL_MS = 30_000;

type Options = {
  custodioId: string | undefined;
  bitacoraId: string | undefined;
  enabled: boolean;
};

function isAppForeground(state: AppStateStatus): boolean {
  return state === 'active';
}

/** Sube GPS solo con la app en primer plano. Al minimizar/cerrar se borra la senal en vivo. */
export function useLiveLocationTracker({ custodioId, bitacoraId, enabled }: Options) {
  const [lastUploadAt, setLastUploadAt] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [appForeground, setAppForeground] = useState(isAppForeground(AppState.currentState));
  const lastUploadRef = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const pushLocation = async (position: Location.LocationObject) => {
    if (!custodioId || !isAppForeground(AppState.currentState)) return;

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

  const stopWatch = () => {
    watchRef.current?.remove();
    watchRef.current = null;
  };

  useEffect(() => {
    if (!enabled || !custodioId) return;

    let cancelled = false;

    const startWatch = async () => {
      if (cancelled || !isAppForeground(AppState.currentState)) return;

      stopWatch();

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

      if (cancelled || !isAppForeground(AppState.currentState)) return;

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

    const onAppState = (state: AppStateStatus) => {
      const foreground = isAppForeground(state);
      setAppForeground(foreground);

      if (foreground) {
        void startWatch();
        return;
      }

      stopWatch();
      setLastUploadAt(null);
      void clearLiveLocation(custodioId);
    };

    if (isAppForeground(AppState.currentState)) {
      void startWatch();
    }

    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      stopWatch();
      sub.remove();
      void clearLiveLocation(custodioId);
    };
  }, [enabled, custodioId, bitacoraId]);

  return {
    lastUploadAt,
    uploadError,
    appForeground,
    isTransmittingLive: appForeground && Boolean(lastUploadAt),
  };
}
