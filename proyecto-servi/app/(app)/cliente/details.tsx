import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EvidenciaReportCard } from '../../../components/EvidenciaReportCard';
import { GoogleMapsActions } from '../../../components/GoogleMapsActions';
import { LivePulseBanner } from '../../../components/LivePulseBanner';
import { MonitoringBarChart } from '../../../components/MonitoringBarChart';
import { MonitoringKpiStrip } from '../../../components/MonitoringKpiStrip';
import { ReportMapView } from '../../../components/ReportMapView';
import { useBitacora, type BitacoraDetalle } from '../../../hooks/useBitacora';
import type { EstadoSegment } from '../../../lib/bitacoraStats';
import { isGpsTransmissionLive } from '../../../lib/liveGpsStatus';
import { getLiveLocationByBitacora, type LiveLocationRow } from '../../../services/locationService';

/** Pantalla III — Detalle de servicio (cliente, solo lectura) */
export default function ClienteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getBitacoraDetalle, getBitacoraEvidencias } = useBitacora();
  const [bitacora, setBitacora] = useState<BitacoraDetalle | null>(null);
  const [evidencias, setEvidencias] = useState<
    Awaited<ReturnType<typeof getBitacoraEvidencias>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<LiveLocationRow | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getBitacoraDetalle(id), getBitacoraEvidencias(id)]).then(
      ([detail, evs]) => {
        setBitacora(detail);
        setEvidencias(evs);
        setLoading(false);
      },
    );
  }, [id, getBitacoraDetalle, getBitacoraEvidencias]);

  useEffect(() => {
    if (!id || bitacora?.estado !== 'activo') {
      setLiveLocation(null);
      return;
    }

    const fetchLive = async () => {
      const { data } = await getLiveLocationByBitacora(id);
      if (data) setLiveLocation(data);
    };

    void fetchLive();
    const timer = setInterval(fetchLive, 30_000);
    return () => clearInterval(timer);
  }, [id, bitacora?.estado]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-servi-fondo">
        <ActivityIndicator color="#0EA5E9" />
      </SafeAreaView>
    );
  }

  const form = bitacora?.formulario;
  const isActiveMonitoring = bitacora?.estado === 'activo';
  const gpsTransmitting =
    liveLocation != null && isGpsTransmissionLive(liveLocation.updated_at);
  const routePoints = evidencias.map((ev, i) => ({
    id: ev.id,
    lat: ev.latitud,
    lng: ev.longitud,
    label: `Reporte ${i + 1}`,
  }));

  const mapPoints =
    liveLocation && gpsTransmitting
      ? [
          ...routePoints,
          {
            id: 'live',
            lat: liveLocation.latitud,
            lng: liveLocation.longitud,
            label: 'Ubicacion en vivo',
          },
        ]
      : routePoints;

  const reportTimelineSegments: EstadoSegment[] = [...evidencias]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-6)
    .map((_, i) => ({
      key: `r-${i}`,
      label: `R${i + 1}`,
      value: i + 1,
      color: '#0EA5E9',
    }));

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable className="py-4" onPress={() => router.back()}>
          <Text className="text-sky-400">← Volver al portal</Text>
        </Pressable>

        <View className="mb-4 rounded-3xl border border-sky-500/30 bg-sky-500/10 p-5">
          <Text className="text-xs uppercase text-sky-300">Servicio de tu empresa</Text>
          <Text className="text-2xl font-bold text-servi-texto">{bitacora?.nombre ?? 'Bitacora'}</Text>
          <Text className="mt-1 text-sm text-servi-suave">{bitacora?.ruta}</Text>
        </View>

        {isActiveMonitoring ? (
          <LivePulseBanner
            count={1}
            label={
              gpsTransmitting
                ? `App conectada · GPS ${new Date(liveLocation!.updated_at).toLocaleTimeString()}`
                : 'Custodia activa — el custodio no tiene la app abierta ahora'
            }
            tone={gpsTransmitting ? 'sky' : 'orange'}
          />
        ) : null}

        <MonitoringKpiStrip
          items={[
            { label: 'Reportes GPS', value: evidencias.length, icon: 'camera-outline', tone: 'info' },
            {
              label: 'Estado',
              value: gpsTransmitting ? 'App conectada' : bitacora?.estado ?? '—',
              icon: 'flag-outline',
              tone: gpsTransmitting ? 'live' : isActiveMonitoring ? 'warn' : 'neutral',
            },
            { label: 'Unidad', value: bitacora?.unidad ?? '—', icon: 'bus-outline', tone: 'neutral' },
            { label: 'Empresa', value: bitacora?.empresa_contratante?.slice(0, 12) ?? '—', icon: 'business-outline', tone: 'neutral' },
          ]}
        />

        {reportTimelineSegments.length > 0 ? (
          <MonitoringBarChart
            title="Linea de reportes GPS (ultimos puntos)"
            segments={reportTimelineSegments}
            height={120}
          />
        ) : null}

        <Section title="Resumen">
          <Row label="Estado" value={bitacora?.estado ?? '—'} />
          <Row label="Unidad" value={bitacora?.unidad ?? '—'} />
          <Row label="Operador" value={form?.operador1?.nombre ?? '—'} />
        </Section>

        {mapPoints.length > 0 ? (
          <View className="mb-4">
            <Text className="mb-2 font-semibold text-servi-texto">Recorrido GPS</Text>
            <ReportMapView
              points={mapPoints}
              height={200}
              title={gpsTransmitting ? 'Recorrido + app conectada' : 'Evidencias en mapa'}
              showOpenMaps={false}
            />
            <View className="mt-3">
              <GoogleMapsActions
                lat={
                  liveLocation && gpsTransmitting
                    ? liveLocation.latitud
                    : routePoints[routePoints.length - 1].lat
                }
                lng={
                  liveLocation && gpsTransmitting
                    ? liveLocation.longitud
                    : routePoints[routePoints.length - 1].lng
                }
                label={bitacora?.nombre ?? 'Servicio'}
                routePoints={routePoints}
                coordsLabel={
                  gpsTransmitting
                    ? 'Ubicacion en tiempo real (app abierta)'
                    : 'Ultimo punto del recorrido'
                }
                variant="full"
                showRoute
              />
            </View>
          </View>
        ) : liveLocation && gpsTransmitting ? (
          <View className="mb-4">
            <Text className="mb-2 font-semibold text-servi-texto">App conectada</Text>
            <ReportMapView
              points={[
                {
                  id: 'live',
                  lat: liveLocation.latitud,
                  lng: liveLocation.longitud,
                  label: 'Custodio conectado',
                },
              ]}
              height={200}
              title="GPS en tiempo real"
              showOpenMaps={false}
            />
          </View>
        ) : null}

        <Text className="mb-3 font-semibold text-servi-texto">
          Galeria de evidencias ({evidencias.length})
        </Text>

        {evidencias.length === 0 ? (
          <Text className="text-servi-suave">Aun no hay reportes con GPS para este servicio.</Text>
        ) : (
          evidencias.map((ev, index) => (
            <EvidenciaReportCard
              key={ev.id}
              index={evidencias.length - index}
              latitud={ev.latitud}
              longitud={ev.longitud}
              timestamp={ev.timestamp}
              urlImagen={ev.url_imagen}
              observaciones={ev.observaciones}
              compact
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-xl border border-servi-borde bg-servi-superficie p-4">
      <Text className="mb-3 text-sm font-semibold text-sky-400">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3">
      <Text className="text-xs text-servi-suave">{label}</Text>
      <Text className="text-base text-servi-texto">{value}</Text>
    </View>
  );
}
