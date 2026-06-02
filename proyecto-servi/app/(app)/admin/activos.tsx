import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { GoogleMapsActions } from '../../../components/GoogleMapsActions';
import { GpsStatusBadge } from '../../../components/GpsStatusBadge';
import { ReportMapView } from '../../../components/ReportMapView';
import { DashboardShell } from '../../../components/DashboardShell';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { GPS_FRESHNESS_HINT } from '../../../lib/liveGpsStatus';
import { listAdminActiveServices, type AdminActiveServiceRow } from '../../../services/adminService';

export default function AdminActivosScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AdminActiveServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error: listError } = await listAdminActiveServices();
    setItems(data);
    setError(listError);
    setLastRefreshAt(new Date().toISOString());
    if (!silent) setLoading(false);
  }, []);

  useAutoRefresh(() => load(true), 15_000);

  const withGps = items.filter((item) => item.last_lat != null && item.last_lng != null);
  const withLiveGps = items.filter((item) => item.gps_freshness === 'live');
  const withStaleGps = items.filter((item) => item.gps_freshness === 'stale');

  return (
    <DashboardShell title="Servicios en vivo">
      <View className="mb-4 rounded-2xl border border-servi-acento/40 bg-servi-acento/10 p-4">
        <Text className="text-3xl font-bold text-servi-texto">{items.length}</Text>
        <Text className="text-sm text-servi-suave">custodias activas ahora</Text>
        <Text className="mt-1 text-xs text-servi-acento">
          {withLiveGps.length} app conectada · {withStaleGps.length} sin app · {items.length} custodias
          activas
        </Text>
        {lastRefreshAt ? (
          <Text className="mt-1 text-[10px] text-servi-suave">
            Actualizado: {new Date(lastRefreshAt).toLocaleTimeString()} · se refresca cada 15 s
          </Text>
        ) : null}
      </View>

      {withStaleGps.length > 0 ? (
        <View className="mb-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4">
          <Text className="font-bold text-amber-300">Custodias activas sin app abierta</Text>
          <Text className="mt-1 text-sm text-amber-200/90">
            {withStaleGps.length} servicio(s) siguen activos pero el custodio no transmite GPS.{' '}
            {GPS_FRESHNESS_HINT.stale}
          </Text>
        </View>
      ) : null}

      {withLiveGps.length > 0 ? (
        <View className="mb-4">
          <ReportMapView
            title="Mapa — custodios con app conectada ahora"
            height={220}
            points={withLiveGps.map((item) => ({
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
                  <View className="mb-1 flex-row flex-wrap items-center gap-2">
                    <View
                      className={`h-2 w-2 rounded-full ${
                        item.gps_freshness === 'live'
                          ? 'bg-emerald-500'
                          : item.gps_freshness === 'stale'
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                      }`}
                    />
                    <Text
                      className={`text-xs font-semibold uppercase ${
                        item.gps_freshness === 'live'
                          ? 'text-emerald-600'
                          : item.gps_freshness === 'stale'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {item.gps_freshness === 'live'
                        ? 'App conectada · GPS activo'
                        : item.gps_freshness === 'stale'
                          ? 'Custodia activa · app cerrada'
                          : 'Custodia activa · sin ubicacion'}
                    </Text>
                    <GpsStatusBadge updatedAt={item.last_report_at} compact />
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
                        item.gps_freshness === 'live'
                          ? 'Ubicacion en vivo'
                          : item.gps_freshness === 'stale'
                            ? 'Ultima ubicacion (no en vivo)'
                            : 'Ultima evidencia GPS'
                      }
                      variant="compact"
                    />
                  </View>
                  {item.last_report_at ? (
                    <View className="border-t border-servi-borde px-4 py-2">
                      <Text className="text-xs text-servi-suave">
                        {item.gps_freshness === 'live' ? 'En vivo' : 'Ultima posicion'}:{' '}
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
