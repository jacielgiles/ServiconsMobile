import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { DashboardShell } from '../../../components/DashboardShell';
import { EmptyState } from '../../../components/EmptyState';
import { FadeInView } from '../../../components/FadeInView';
import { LivePulseBanner } from '../../../components/LivePulseBanner';
import { MonitoringBarChart } from '../../../components/MonitoringBarChart';
import { MonitoringDonutChart } from '../../../components/MonitoringDonutChart';
import { MonitoringKpiStrip } from '../../../components/MonitoringKpiStrip';
import { SegmentedTabs } from '../../../components/SegmentedTabs';
import { ServiceCard } from '../../../components/ServiceCard';
import { countBitacorasByEstado, getBitacoraTotals } from '../../../lib/bitacoraStats';
import { useAuth } from '../../../hooks/useAuth';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { useBitacora } from '../../../hooks/useBitacora';
import type { BitacoraResumen } from '../../../types/models';

type Tab = 'pendiente' | 'activo' | 'completado';

/** Pantalla II — Portal del cliente (monitoreo completo de su empresa) */
export default function ClienteHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { getClienteBitacoras, loading, error } = useBitacora();
  const [bitacoras, setBitacoras] = useState<BitacoraResumen[]>([]);
  const [tab, setTab] = useState<Tab>('activo');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getClienteBitacoras();
    setBitacoras(data);
  }, [getClienteBitacoras]);

  useAutoRefresh(load, 20_000);

  const totals = useMemo(() => getBitacoraTotals(bitacoras), [bitacoras]);
  const chartSegments = useMemo(() => countBitacorasByEstado(bitacoras), [bitacoras]);

  const filtered = bitacoras.filter((b) => b.estado === tab);
  const activosList = bitacoras.filter((b) => b.estado === 'activo');

  const tabs = useMemo(
    () => [
      { key: 'pendiente' as const, label: 'Programados', count: totals.pendiente },
      { key: 'activo' as const, label: 'Activas', count: totals.activo },
      { key: 'completado' as const, label: 'Historial', count: totals.completado },
    ],
    [totals],
  );

  return (
    <DashboardShell role="cliente">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor="#0EA5E9"
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <FadeInView className="mb-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-5">
          <Text className="text-[10px] uppercase text-sky-300">Centro de monitoreo</Text>
          <Text className="text-2xl font-bold text-servi-texto">{profile?.empresa ?? 'Tu empresa'}</Text>
          <Text className="mt-2 text-sm text-servi-suave">
            Programados, en vivo e historial de custodias contratadas — mapas GPS y evidencias.
          </Text>
        </FadeInView>

        <LivePulseBanner
          count={totals.activo}
          label="custodias activas — GPS solo con app abierta del custodio"
          tone="sky"
        />

        <MonitoringKpiStrip
          items={[
            { label: 'Programados', value: totals.pendiente, icon: 'calendar-outline', tone: 'info' },
            { label: 'Activas', value: totals.activo, icon: 'radio', tone: totals.activo > 0 ? 'live' : 'neutral' },
            { label: 'Completados', value: totals.completado, icon: 'archive-outline', tone: 'neutral' },
            { label: 'Total', value: totals.total, icon: 'layers-outline', tone: 'neutral' },
          ]}
        />

        <FadeInView delay={120}>
          <MonitoringDonutChart title="Panorama de servicios de tu empresa" segments={chartSegments} />
        </FadeInView>
        <FadeInView delay={160}>
          <MonitoringBarChart title="Volumen por estado" segments={chartSegments} />
        </FadeInView>

        {activosList.length > 0 ? (
          <FadeInView delay={200} className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <Text className="mb-2 text-sm font-semibold text-emerald-400">En monitoreo ahora</Text>
            {activosList.slice(0, 3).map((b) => (
              <AnimatedPressable
                key={b.id}
                className="mb-2 flex-row items-center justify-between rounded-xl bg-servi-fondo/80 px-3 py-2"
                onPress={() => router.push(`/(app)/cliente/details?id=${b.id}`)}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-servi-texto">{b.nombre ?? b.unidad ?? 'Servicio'}</Text>
                  <Text className="text-xs text-servi-suave">{b.ruta ?? '—'}</Text>
                </View>
                <View className="h-2 w-2 rounded-full bg-emerald-400" />
              </AnimatedPressable>
            ))}
          </FadeInView>
        ) : null}

        <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} accent="sky" />

        <Text className="mb-3 text-sm font-semibold uppercase text-sky-400">
          {tab === 'pendiente'
            ? 'Servicios programados (aun no iniciados)'
            : tab === 'activo'
              ? 'Servicios en monitoreo en vivo'
              : 'Servicios completados'}
        </Text>

        {loading ? (
          <ActivityIndicator color="#0EA5E9" />
        ) : error ? (
          <Text className="text-servi-peligro">{error}</Text>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'activo' ? 'radio-outline' : tab === 'pendiente' ? 'time-outline' : 'archive-outline'}
            title={
              tab === 'activo'
                ? 'Sin monitoreo en vivo'
                : tab === 'pendiente'
                  ? 'Sin servicios programados'
                  : 'Historial vacio'
            }
            description={
              tab === 'activo'
                ? 'Cuando un custodio inicie una custodia de tu empresa, la veras aqui con GPS en tiempo real.'
                : tab === 'pendiente'
                  ? 'El custodio crea la bitacora; aparece aqui hasta que la inicie en campo.'
                  : 'Los servicios cerrados con evidencias apareceran en esta seccion.'
            }
            tone="sky"
          />
        ) : (
          filtered.map((b, index) => (
            <ServiceCard
              key={b.id}
              bitacora={b}
              index={index}
              onPress={() => router.push(`/(app)/cliente/details?id=${b.id}`)}
            />
          ))
        )}
      </ScrollView>
    </DashboardShell>
  );
}
