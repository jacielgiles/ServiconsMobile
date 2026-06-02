import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { DashboardShell } from '../../../components/DashboardShell';
import { WizardSectionCard } from '../../../components/WizardSectionCard';
import { useAppToast } from '../../../hooks/useAppToast';
import { useAuth } from '../../../hooks/useAuth';
import { TRASH_RETENTION_DAYS } from '../../../lib/trashConstants';
import { canManageTrash } from '../../../lib/roles';
import {
  getTrashSummary,
  previewCleanup,
  runCleanupToTrash,
  type CleanupFilter,
} from '../../../services/trashService';

export default function AdminLimpiezaScreen() {
  const router = useRouter();
  const toast = useAppToast();
  const { profile, session } = useAuth();
  const [summary, setSummary] = useState({ bitacoras: 0, evidencias: 0 });
  const [preview, setPreview] = useState({ bitacoras: 0, evidencias: 0 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState<CleanupFilter>({
    includeCompletadas: true,
    includeCanceladas: false,
    includePendientes: false,
    olderThanDays: 30,
  });

  const allowed = canManageTrash(profile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, prevRes] = await Promise.all([
      getTrashSummary(),
      previewCleanup(filter),
    ]);
    setSummary({ bitacoras: sumRes.bitacoras, evidencias: sumRes.evidencias });
    setPreview(prevRes.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (!allowed) {
      router.replace('/(app)/admin/home');
      return;
    }
    void load();
  }, [allowed, load, router]);

  const toggle = (key: keyof Pick<CleanupFilter, 'includeCompletadas' | 'includeCanceladas' | 'includePendientes'>) => {
    setFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!allowed) return;
    void previewCleanup(filter).then((res) => setPreview(res.data));
  }, [filter, allowed]);

  const moverAPapelera = async () => {
    if (!session?.user?.id) return;
    if (preview.bitacoras === 0) {
      toast.warning('Nada que mover', 'Ajusta los filtros o no hay registros que coincidan.');
      return;
    }

    setWorking(true);
    const { moved, error } = await runCleanupToTrash(filter, session.user.id);
    setWorking(false);

    if (error) {
      toast.error('No se pudo mover', error);
      return;
    }

    toast.success('Movido a papelera', `${moved} bitacora(s) y sus fotos. Se borran en ${TRASH_RETENTION_DAYS} dias.`);
    void load();
  };

  if (!allowed) return null;

  return (
    <DashboardShell title="Limpieza de datos" role={profile?.role}>
      <Pressable className="mb-3 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">← Volver</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <WizardSectionCard
          title="Papelera activa"
          subtitle={`Eliminacion permanente automatica a los ${TRASH_RETENTION_DAYS} dias`}
          icon="archive-outline"
          tone="orange"
        >
          {loading ? (
            <ActivityIndicator color="#F97316" />
          ) : (
            <>
              <Text className="text-sm text-servi-suave">
                En papelera ahora: {summary.bitacoras} bitacoras · {summary.evidencias} fotos
              </Text>
              <Pressable
                className="mt-3 rounded-xl border border-servi-acento/40 bg-servi-acento/10 py-3 active:opacity-90"
                onPress={() => router.push('/(app)/admin/papelera')}
              >
                <Text className="text-center font-semibold text-servi-acento">Ver papelera →</Text>
              </Pressable>
            </>
          )}
        </WizardSectionCard>

        <WizardSectionCard
          title="Que quieres archivar?"
          subtitle="No se tocan custodias activas en curso"
          icon="trash-outline"
          tone="red"
        >
          <FilterChip
            label="Bitacoras completadas"
            active={filter.includeCompletadas}
            onPress={() => toggle('includeCompletadas')}
          />
          <FilterChip
            label="Bitacoras canceladas"
            active={filter.includeCanceladas}
            onPress={() => toggle('includeCanceladas')}
          />
          <FilterChip
            label="Bitacoras pendientes (sin iniciar)"
            active={filter.includePendientes}
            onPress={() => toggle('includePendientes')}
          />

          <Text className="mb-2 mt-4 text-xs font-bold uppercase text-servi-suave">Antiguedad minima</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {[null, 7, 30, 90].map((days) => (
              <FilterChip
                key={String(days)}
                label={days == null ? 'Todas' : `Mas de ${days} dias`}
                active={filter.olderThanDays === days}
                onPress={() => setFilter((prev) => ({ ...prev, olderThanDays: days }))}
              />
            ))}
          </View>

          <View className="rounded-xl border border-servi-borde bg-servi-fondo p-4">
            <Text className="text-[10px] uppercase text-servi-suave">Vista previa</Text>
            <Text className="mt-1 text-2xl font-bold text-servi-texto">{preview.bitacoras}</Text>
            <Text className="text-sm text-servi-suave">
              bitacoras · ~{preview.evidencias} fotos asociadas
            </Text>
          </View>

          <View className="mt-4">
            <AppButton
              label="Mover a papelera"
              variant="accent"
              loading={working}
              onPress={moverAPapelera}
            />
          </View>
          <Text className="mt-3 text-center text-xs text-servi-suave">
            Puedes restaurar desde la papelera antes de los {TRASH_RETENTION_DAYS} dias.
          </Text>
        </WizardSectionCard>
      </ScrollView>
    </DashboardShell>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`mb-2 mr-2 rounded-full border px-4 py-2 active:opacity-90 ${
        active ? 'border-servi-acento bg-servi-acento/20' : 'border-servi-borde bg-servi-fondo'
      }`}
      onPress={onPress}
    >
      <Text className={`text-sm ${active ? 'font-bold text-servi-acento' : 'text-servi-suave'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
