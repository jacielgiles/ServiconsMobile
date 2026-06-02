import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text } from 'react-native';

import { AdminPreviewCard } from '../../../components/AdminPreviewCard';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { DashboardShell } from '../../../components/DashboardShell';
import { FadeInView } from '../../../components/FadeInView';
import { FlowHintCard } from '../../../components/FlowHintCard';
import { MonitoringKpiStrip } from '../../../components/MonitoringKpiStrip';
import { ReportMapView } from '../../../components/ReportMapView';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAdminDashboardStats,
  listAdminActiveServices,
  type AdminActiveServiceRow,
  type AdminDashboardStats,
} from '../../../services/adminService';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activos, setActivos] = useState<AdminActiveServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const [statsRes, activosRes] = await Promise.all([
      getAdminDashboardStats(),
      listAdminActiveServices(),
    ]);
    setStats(statsRes.data);
    setActivos(activosRes.data);
    setError(statsRes.error ?? activosRes.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const withGps = activos.filter((a) => a.last_lat != null && a.last_lng != null);

  return (
    <DashboardShell role={profile?.role}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor="#F97316" />}
      >
        {loading && !stats ? (
          <ActivityIndicator className="mt-8" color="#F97316" />
        ) : error ? (
          <Text className="mt-4 text-center text-sm text-servi-peligro">{error}</Text>
        ) : stats ? (
          <>
            <MonitoringKpiStrip
              items={[
                {
                  label: 'En vivo',
                  value: stats.bitacoras.activas,
                  icon: 'radio',
                  tone: stats.bitacoras.activas > 0 ? 'live' : 'neutral',
                },
                {
                  label: 'SOS activas',
                  value: stats.sos.activas,
                  icon: 'warning',
                  tone: stats.sos.activas > 0 ? 'warn' : 'neutral',
                },
                {
                  label: 'Pendientes',
                  value: stats.bitacoras.pendientes,
                  icon: 'time-outline',
                  tone: 'info',
                },
                {
                  label: 'Completadas',
                  value: stats.bitacoras.completadas,
                  icon: 'checkmark-done',
                  tone: 'neutral',
                },
              ]}
            />

            <FlowHintCard tone="orange" />

            {withGps.length > 0 ? (
              <FadeInView delay={200}>
                <AnimatedPressable
                  className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/30"
                  onPress={() => router.push('/(app)/admin/activos')}
                >
                  <ReportMapView
                    title={`Flota en mapa · ${withGps.length} unidades con GPS`}
                    height={200}
                    interactive={false}
                    points={withGps.map((item) => ({
                      id: item.id,
                      lat: item.last_lat!,
                      lng: item.last_lng!,
                      label: item.unidad ?? item.nombre ?? 'Unidad',
                    }))}
                  />
                  <Text className="bg-emerald-900/40 py-2 text-center text-xs font-semibold text-emerald-300">
                    Toca para monitoreo en vivo completo →
                  </Text>
                </AnimatedPressable>
              </FadeInView>
            ) : null}

            {[
              {
                icon: 'people-outline' as const,
                title: 'Gestion de usuarios',
                metric: String(stats.users.total),
                metricLabel: 'cuentas registradas',
                lines: [
                  `${stats.users.custodios} custodios · ${stats.users.clientes} clientes`,
                  `${stats.users.jefes} jefes de custodia en el sistema`,
                ],
                route: '/(app)/admin/users' as const,
                accent: 'default' as const,
              },
              {
                icon: 'radio-outline' as const,
                title: 'En vivo',
                metric: String(stats.bitacoras.activas),
                metricLabel: 'servicios activos ahora',
                lines: ['Mapa con ubicacion GPS en tiempo real', 'Se actualiza cada ~30 segundos'],
                route: '/(app)/admin/activos' as const,
                accent: stats.bitacoras.activas > 0 ? ('warning' as const) : ('default' as const),
              },
              {
                icon: 'document-text-outline' as const,
                title: 'Bitacoras',
                metric: String(stats.bitacoras.total),
                metricLabel: 'registradas en total',
                lines: [
                  `${stats.bitacoras.pendientes} pendientes (creadas por custodios)`,
                  `${stats.bitacoras.completadas} completadas`,
                ],
                route: '/(app)/admin/bitacoras' as const,
                accent: 'default' as const,
              },
              {
                icon: 'warning-outline' as const,
                title: 'Alertas SOS',
                metric: String(stats.sos.activas),
                metricLabel: 'alertas activas',
                lines: [
                  stats.sos.activas > 0
                    ? 'Hay emergencias que requieren atencion'
                    : 'Sin emergencias activas en este momento',
                ],
                route: '/(app)/admin/sos' as const,
                accent: stats.sos.activas > 0 ? ('warning' as const) : ('default' as const),
              },
              {
                icon: 'bar-chart-outline' as const,
                title: 'Reportes',
                metric: String(stats.bitacoras.completadas),
                metricLabel: 'servicios cerrados',
                lines: [
                  `${stats.bitacoras.total} servicios registrados en el sistema`,
                  'Evidencias con GPS por servicio completado',
                ],
                route: '/(app)/admin/reportes' as const,
                accent: 'default' as const,
              },
            ].map((card, index) => (
              <FadeInView key={card.title} delay={240 + index * 70}>
                <AdminPreviewCard
                  icon={card.icon}
                  title={card.title}
                  metric={card.metric}
                  metricLabel={card.metricLabel}
                  previewLines={card.lines}
                  accent={card.accent}
                  onPress={() => router.push(card.route)}
                />
              </FadeInView>
            ))}
          </>
        ) : null}
      </ScrollView>
    </DashboardShell>
  );
}
