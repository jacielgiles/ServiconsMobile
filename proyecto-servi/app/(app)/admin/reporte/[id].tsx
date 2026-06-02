import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EvidenciaCompactCard } from '../../../../components/EvidenciaCompactCard';
import { GoogleMapsActions } from '../../../../components/GoogleMapsActions';
import { ReportMapView } from '../../../../components/ReportMapView';
import { AppButton } from '../../../../components/AppButton';
import { DashboardShell } from '../../../../components/DashboardShell';
import { useAutoRefresh } from '../../../../hooks/useAutoRefresh';
import { useBitacoraPdfExport } from '../../../../hooks/useBitacoraPdfExport';
import { buildBitacoraRoutePoints } from '../../../../lib/bitacoraRoute';
import { resolveEvidenceImageUrls } from '../../../../lib/evidenceImage';
import {
  getAdminBitacoraFull,
  listAdminBitacoraEvidencias,
  type AdminEvidenciaRow,
} from '../../../../services/adminService';

type EvidenciaConUrl = AdminEvidenciaRow & { displayUrl: string | null };

export default function AdminReporteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { exportPdf, exporting } = useBitacoraPdfExport();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bitacora, setBitacora] = useState<Awaited<
    ReturnType<typeof getAdminBitacoraFull>
  >['data']>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaConUrl[]>([]);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    const [detailRes, evidenciasRes] = await Promise.all([
      getAdminBitacoraFull(id),
      listAdminBitacoraEvidencias(id),
    ]);

    setBitacora(detailRes.data);
    if (evidenciasRes.data.length > 0) {
      const withUrls = await resolveEvidenceImageUrls(evidenciasRes.data);
      setEvidencias(withUrls);
    } else {
      setEvidencias([]);
    }
    setError(detailRes.error ?? evidenciasRes.error);
    setLoading(false);
  }, [id]);

  useAutoRefresh(load, 20_000);

  const sortedEvidencias = useMemo(
    () => [...evidencias].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [evidencias],
  );

  const routePoints = useMemo(() => {
    const evidence = [...evidencias]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((ev, index) => ({
        id: ev.id,
        lat: ev.latitud,
        lng: ev.longitud,
        label: `Reporte ${index + 1}`,
      }));
    return buildBitacoraRoutePoints(
      (bitacora?.formulario as import('../../../../types/models').BitacoraFormulario | null) ??
        null,
      evidence,
    );
  }, [evidencias, bitacora?.formulario]);

  const fotosVisibles = sortedEvidencias.filter((e) => e.displayUrl).length;

  return (
    <DashboardShell title="Reporte visual">
      <Pressable className="mb-2 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">Volver</Text>
      </Pressable>

      {loading && !bitacora ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <Text className="text-servi-peligro">{error}</Text>
      ) : !bitacora ? (
        <Text className="text-servi-suave">Reporte no encontrado.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-servi-borde bg-servi-superficie px-4 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-servi-texto" numberOfLines={1}>
                {bitacora.nombre ?? 'Sin nombre'}
              </Text>
              <Text className="text-xs text-servi-suave" numberOfLines={1}>
                {bitacora.ruta ?? '—'} · {bitacora.unidad ?? '—'}
              </Text>
            </View>
            <View className="rounded-full bg-servi-acento px-2.5 py-1">
              <Text className="text-[10px] font-bold text-servi-fondo">{bitacora.estado}</Text>
            </View>
          </View>

          <AppButton
            label="Exportar PDF"
            variant="accent"
            loading={exporting}
            onPress={() => void exportPdf(bitacora, evidencias)}
          />
          <Text className="mb-3 mt-1 text-center text-[11px] text-servi-suave">
            {evidencias.length} reportes · {fotosVisibles} fotos visibles · firmas y datos incluidos
          </Text>

          {routePoints.length > 0 ? (
            <View className="mb-3 overflow-hidden rounded-xl border border-servi-borde">
              <ReportMapView
                title="Recorrido GPS"
                height={160}
                points={routePoints}
                showOpenMaps={false}
              />
              <View className="border-t border-servi-borde bg-servi-superficie px-3 py-2">
                <GoogleMapsActions
                  lat={routePoints[routePoints.length - 1].lat}
                  lng={routePoints[routePoints.length - 1].lng}
                  label={bitacora.nombre ?? 'Servicio'}
                  routePoints={routePoints}
                  coordsLabel="Ultimo reporte"
                  variant="compact"
                  showRoute
                />
              </View>
            </View>
          ) : null}

          <View className="mb-3 flex-row gap-2">
            <MiniStat label="Reportes" value={String(evidencias.length)} />
            <MiniStat label="Fotos" value={String(fotosVisibles)} accent />
            <MiniStat label="Custodio" value={bitacora.custodio_nombre?.split(' ')[0] ?? '—'} />
          </View>

          <Text className="mb-2 text-sm font-semibold text-servi-texto">
            Evidencias ({sortedEvidencias.length})
          </Text>

          {sortedEvidencias.length === 0 ? (
            <Text className="text-servi-suave">Este servicio aun no tiene reportes con foto y GPS.</Text>
          ) : (
            sortedEvidencias.map((ev, index) => (
              <EvidenciaCompactCard
                key={ev.id}
                index={sortedEvidencias.length - index}
                latitud={ev.latitud}
                longitud={ev.longitud}
                timestamp={ev.timestamp}
                imageUrl={ev.displayUrl}
                observaciones={ev.observaciones}
                metadata={ev.metadata}
              />
            ))
          )}
        </ScrollView>
      )}
    </DashboardShell>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-xl border px-2 py-2 ${
        accent ? 'border-servi-acento/40 bg-servi-acento/10' : 'border-servi-borde bg-servi-superficie'
      }`}
    >
      <Text className="text-[9px] uppercase text-servi-suave">{label}</Text>
      <Text
        className={`text-sm font-bold ${accent ? 'text-servi-acento' : 'text-servi-texto'}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
