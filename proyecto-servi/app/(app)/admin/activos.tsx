import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { GoogleMapsActions } from '../../../components/GoogleMapsActions';
import { ReportMapView } from '../../../components/ReportMapView';
import { DashboardShell } from '../../../components/DashboardShell';
import { listAdminActiveServices, type AdminActiveServiceRow } from '../../../services/adminService';

export default function AdminActivosScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AdminActiveServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error: listError } = await listAdminActiveServices();
    setItems(data);
    setError(listError);
    setLastRefreshAt(new Date().toISOString());
    if (!silent) setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      intervalRef.current = setInterval(() => {
        void load(true);
      }, 15_000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [load]),
  );

  const withGps = items.filter((item) => item.last_lat != null && item.last_lng != null);
  const withLiveGps = items.filter((item) => item.location_source === 'live');

  return (
    <DashboardShell title="Servicios en vivo">
      <View className="mb-4 rounded-2xl border border-servi-acento/40 bg-servi-acento/10 p-4">
        <Text className="text-3xl font-bold text-servi-texto">{items.length}</Text>
        <Text className="text-sm text-servi-suave">custodias activas ahora</Text>
        <Text className="mt-1 text-xs text-servi-acento">
          {withLiveGps.length} con GPS en vivo · {withGps.length} con ubicacion en mapa
        </Text>
        {lastRefreshAt ? (
          <Text className="mt-1 text-[10px] text-servi-suave">
            Actualizado: {new Date(lastRefreshAt).toLocaleTimeString()} · se refresca cada 15 s
          </Text>
        ) : null}
      </View>

      {withGps.length > 1 ? (
        <View className="mb-4">
          <ReportMapView
            title="Vista general — ubicaciones en vivo"
            height={220}
            points={withGps.map((item) => ({
              id: item.id,
              lat: item.last_lat!,
              lng: item.last_lng!,
              label: item.nombre ?? 'Servicio',
            }))}
          />
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <Text className="text-servi-peligro">{error}</Text>
      ) : items.length === 0 ? (
        <Text className="text-servi-suave">
          No hay servicios activos. Cuando un custodio inicie una custodia, aparecera aqui con su
          mapa en tiempo real.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#F97316" />}
        >
          {items.map((item) => (
            <Pressable
              key={item.id}
              className="mb-4 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie active:opacity-90"
              onPress={() => router.push(`/(app)/admin/reporte/${item.id}`)}
            >
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-1 pr-2">
                  <View className="mb-1 flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Text className="text-xs font-semibold uppercase text-emerald-600">En curso</Text>
                    {item.location_source === 'live' ? (
                      <View className="rounded-full bg-emerald-500/20 px-2 py-0.5">
                        <Text className="text-[10px] font-bold uppercase text-emerald-400">GPS en vivo</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-base font-semibold text-servi-texto">
                    {item.nombre ?? 'Sin nombre'}
                  </Text>
                  <Text className="text-sm text-servi-suave">{item.ruta ?? '—'}</Text>
                  <Text className="mt-1 text-xs text-servi-suave">
                    {item.custodio_nombre ?? 'Custodio'} · {item.evidencias_count} reportes
                  </Text>
                </View>
              </View>

              {item.last_lat != null && item.last_lng != null ? (
                <>
                  <ReportMapView
                    points={[
                      {
                        id: item.id,
                        lat: item.last_lat,
                        lng: item.last_lng,
                        label: item.nombre ?? 'Ultimo reporte',
                      },
                    ]}
                    height={150}
                    interactive={false}
                    showOpenMaps={false}
                  />
                  <View className="p-3 pt-0">
                    <GoogleMapsActions
                      lat={item.last_lat}
                      lng={item.last_lng}
                      label={item.unidad ?? item.nombre ?? 'Unidad en vivo'}
                      coordsLabel={
                        item.location_source === 'live' ? 'Ubicacion en vivo' : 'Ultima evidencia GPS'
                      }
                      variant="compact"
                    />
                  </View>
                  {item.last_report_at ? (
                    <View className="border-t border-servi-borde px-4 py-2">
                      <Text className="text-xs text-servi-suave">
                        {item.location_source === 'live' ? 'En vivo' : 'Reporte'}:{' '}
                        {new Date(item.last_report_at).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View className="items-center border-t border-dashed border-servi-borde px-4 py-8">
                  <Text className="text-sm text-servi-suave">
                    Esperando ubicacion GPS del custodio...
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable className="mt-2 py-2" onPress={() => router.back()}>
        <Text className="text-center text-servi-acento">Volver al panel</Text>
      </Pressable>
    </DashboardShell>
  );
}
