import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AnimatedFab } from '../../components/AnimatedFab';
import { CustodyConfirmModal } from '../../components/CustodyConfirmModal';
import { DashboardHeader } from '../../components/DashboardShell';
import { EmptyState } from '../../components/EmptyState';
import { FlowHintCard } from '../../components/FlowHintCard';
import { FadeInView } from '../../components/FadeInView';
import { LivePulseBanner } from '../../components/LivePulseBanner';
import { MonitoringBarChart } from '../../components/MonitoringBarChart';
import { MonitoringDonutChart } from '../../components/MonitoringDonutChart';
import { MonitoringKpiStrip } from '../../components/MonitoringKpiStrip';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { ServiceCard } from '../../components/ServiceCard';
import { countBitacorasByEstado, getBitacoraTotals } from '../../lib/bitacoraStats';
import { getDashboardTitleForRole } from '../../lib/roles';
import { useAuth } from '../../hooks/useAuth';
import { useBitacora, type BitacoraDetalle } from '../../hooks/useBitacora';
import { createEmptyFormulario, useBitacoraStore } from '../../store/useBitacoraStore';
import type { BitacoraResumen } from '../../types/models';

type Filtro = 'pendiente' | 'activo' | 'completado';

/** Pantalla 3 — Home del custodio */
export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { filtro: filtroParam } = useLocalSearchParams<{ filtro?: string }>();
  const { getBitacoras, getBitacoraDetalle, loading, error } = useBitacora();
  const [bitacoras, setBitacoras] = useState<BitacoraResumen[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<BitacoraDetalle | null>(null);

  useEffect(() => {
    if (filtroParam === 'pendiente' || filtroParam === 'activo' || filtroParam === 'completado') {
      setFiltro(filtroParam);
    }
  }, [filtroParam]);

  const loadBitacoras = useCallback(async () => {
    const data = await getBitacoras();
    setBitacoras(data);
  }, [getBitacoras]);

  useFocusEffect(
    useCallback(() => {
      loadBitacoras();
    }, [loadBitacoras]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBitacoras();
    setRefreshing(false);
  }, [loadBitacoras]);

  const filtradas = bitacoras.filter((b) => b.estado === filtro);
  const totals = useMemo(() => getBitacoraTotals(bitacoras), [bitacoras]);
  const chartSegments = useMemo(() => countBitacorasByEstado(bitacoras), [bitacoras]);

  const tabs = useMemo(
    () => [
      { key: 'pendiente' as const, label: 'Pendientes', count: totals.pendiente },
      { key: 'activo' as const, label: 'Activos', count: totals.activo },
      { key: 'completado' as const, label: 'Completados', count: totals.completado },
    ],
    [totals],
  );

  const openService = async (item: BitacoraResumen) => {
    if (item.estado === 'activo') {
      router.push({ pathname: '/(app)/custody/active', params: { id: item.id } });
      return;
    }
    if (item.estado === 'completado') {
      router.push({ pathname: '/(app)/custody/details', params: { id: item.id } });
      return;
    }
    const detail = await getBitacoraDetalle(item.id);
    setConfirmData(detail);
    setConfirmId(item.id);
  };

  const iniciarCustodia = () => {
    if (!confirmId) return;
    setConfirmId(null);
    router.push({ pathname: '/(app)/custody/permissions', params: { id: confirmId } });
  };

  return (
    <View className="flex-1 bg-servi-fondo">
      <DashboardHeader title={getDashboardTitleForRole(profile?.role)} role={profile?.role} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
      >
        <View className="px-4 pt-2">
          <FadeInView className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-4">
            <Text className="text-[10px] uppercase text-emerald-300">Operador en campo</Text>
            <Text className="text-xl font-bold text-white">{profile?.nombre ?? 'Custodio'}</Text>
            {profile?.empresa ? (
              <Text className="mt-1 text-sm text-emerald-200">Empresa: {profile.empresa}</Text>
            ) : null}
            <Text className="mt-2 text-xs text-emerald-100/80">
              {totals.total} servicios registrados · {totals.activo} en monitoreo ahora
            </Text>
          </FadeInView>

          <LivePulseBanner
            count={totals.activo}
            label="custodias activas — reportes GPS en mapa"
            tone="emerald"
          />

          <MonitoringKpiStrip
            items={[
              { label: 'Pendientes', value: totals.pendiente, icon: 'time-outline', tone: 'info' },
              { label: 'En vivo', value: totals.activo, icon: 'radio', tone: totals.activo > 0 ? 'live' : 'neutral' },
              { label: 'Completados', value: totals.completado, icon: 'checkmark-done', tone: 'neutral' },
              { label: 'Total', value: totals.total, icon: 'layers-outline', tone: 'neutral' },
            ]}
          />

          <FadeInView delay={140}>
            <MonitoringDonutChart title="Resumen de tus servicios" segments={chartSegments} />
          </FadeInView>
          <FadeInView delay={180}>
            <MonitoringBarChart title="Servicios por estado" segments={chartSegments} />
          </FadeInView>

          {filtro === 'pendiente' ? <FlowHintCard tone="emerald" /> : null}
        </View>

        <View className="px-4">
          <SegmentedTabs tabs={tabs} active={filtro} onChange={setFiltro} accent="emerald" />

          <Text className="mb-3 text-sm font-semibold uppercase text-emerald-400">
            Registro de servicios — {tabs.find((t) => t.key === filtro)?.label}
          </Text>

          {loading ? (
            <ActivityIndicator color="#22C55E" />
          ) : error ? (
            <Text className="mb-4 text-servi-peligro">{error}</Text>
          ) : filtradas.length === 0 ? (
            <EmptyState
              icon={filtro === 'pendiente' ? 'add-circle-outline' : 'search-outline'}
              title={
                filtro === 'pendiente'
                  ? 'Sin servicios pendientes'
                  : filtro === 'activo'
                    ? 'Nada en monitoreo ahora'
                    : 'Sin historial completado'
              }
              description={
                filtro === 'pendiente'
                  ? 'Toca el boton + abajo para crear una bitacora. Tu la inicias cuando estes listo en campo.'
                  : filtro === 'activo'
                    ? 'Cuando confirmes e inicies una custodia pendiente, aparecera aqui con GPS en vivo.'
                    : 'Los servicios cerrados con foto y firmas apareceran en esta lista.'
              }
              tone="emerald"
            />
          ) : (
            filtradas.map((b, index) => (
              <ServiceCard key={b.id} bitacora={b} index={index} onPress={() => openService(b)} />
            ))
          )}
        </View>
      </ScrollView>

      <AnimatedFab
        pulse={totals.pendiente === 0 && totals.total === 0}
        onPress={() => {
          useBitacoraStore.setState({ formulario: createEmptyFormulario() });
          router.push('/(app)/bitacora/wizard/step1');
        }}
      />

      <CustodyConfirmModal
        visible={Boolean(confirmId)}
        bitacora={confirmData}
        onCancel={() => setConfirmId(null)}
        onConfirm={iniciarCustodia}
      />
    </View>
  );
}
