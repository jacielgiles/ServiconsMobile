import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { DashboardShell } from '../../../components/DashboardShell';
import { SegmentedTabs } from '../../../components/SegmentedTabs';
import { useAppToast } from '../../../hooks/useAppToast';
import { useAuth } from '../../../hooks/useAuth';
import { formatTrashPurgeDate, getTrashDaysRemaining, TRASH_RETENTION_DAYS } from '../../../lib/trashConstants';
import { canManageTrash } from '../../../lib/roles';
import {
  listTrashBitacoras,
  listTrashEvidencias,
  permanentlyDeleteBitacora,
  permanentlyDeleteEvidencia,
  purgeExpiredTrash,
  restoreBitacoraFromTrash,
  restoreEvidenciaFromTrash,
  type TrashBitacoraRow,
  type TrashEvidenciaRow,
} from '../../../services/trashService';

type Tab = 'bitacoras' | 'fotos';

export default function AdminPapeleraScreen() {
  const router = useRouter();
  const toast = useAppToast();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('bitacoras');
  const [bitacoras, setBitacoras] = useState<TrashBitacoraRow[]>([]);
  const [evidencias, setEvidencias] = useState<TrashEvidenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const allowed = canManageTrash(profile?.role);

  const load = useCallback(async () => {
    await purgeExpiredTrash();
    const [bRes, eRes] = await Promise.all([listTrashBitacoras(), listTrashEvidencias()]);
    setBitacoras(bRes.data);
    setEvidencias(eRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!allowed) {
      router.replace('/(app)/admin/home');
      return;
    }
    void load();
  }, [allowed, load, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmPermanent = (title: string, onConfirm: () => Promise<void>) => {
    Alert.alert(title, 'Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void onConfirm();
        },
      },
    ]);
  };

  const handleRestoreBitacora = async (id: string) => {
    const { error } = await restoreBitacoraFromTrash(id);
    if (error) toast.error('Error', error);
    else {
      toast.success('Restaurado', 'Bitacora y fotos de vuelta en el sistema.');
      void load();
    }
  };

  const handleRestoreEvidencia = async (id: string) => {
    const { error } = await restoreEvidenciaFromTrash(id);
    if (error) toast.error('Error', error);
    else {
      toast.success('Foto restaurada');
      void load();
    }
  };

  if (!allowed) return null;

  const tabs = [
    { key: 'bitacoras' as const, label: 'Bitacoras', count: bitacoras.length },
    { key: 'fotos' as const, label: 'Fotos', count: evidencias.length },
  ];

  return (
    <DashboardShell title="Papelera" role={profile?.role}>
      <Pressable className="mb-2 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">← Volver</Text>
      </Pressable>

      <View className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <Text className="font-bold text-amber-200">Retencion {TRASH_RETENTION_DAYS} dias</Text>
        <Text className="mt-1 text-sm text-amber-100/90">
          Lo que esta aqui se elimina permanentemente (BD y archivos) al cumplirse el plazo.
        </Text>
      </View>

      <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} accent="orange" />

      {loading ? (
        <ActivityIndicator className="mt-8" color="#F97316" />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {tab === 'bitacoras' ? (
            bitacoras.length === 0 ? (
              <Text className="py-8 text-center text-servi-suave">Papelera de bitacoras vacia.</Text>
            ) : (
              bitacoras.map((item) => (
                <TrashBitacoraCard
                  key={item.id}
                  item={item}
                  onRestore={() => handleRestoreBitacora(item.id)}
                  onDelete={() =>
                    confirmPermanent('Eliminar bitacora', async () => {
                      const { error } = await permanentlyDeleteBitacora(item.id);
                      if (error) toast.error('Error', error);
                      else {
                        toast.success('Eliminada permanentemente');
                        void load();
                      }
                    })
                  }
                />
              ))
            )
          ) : evidencias.length === 0 ? (
            <Text className="py-8 text-center text-servi-suave">No hay fotos en papelera.</Text>
          ) : (
            evidencias.map((item) => (
              <TrashEvidenciaCard
                key={item.id}
                item={item}
                onRestore={() => handleRestoreEvidencia(item.id)}
                onDelete={() =>
                  confirmPermanent('Eliminar foto', async () => {
                    const { error } = await permanentlyDeleteEvidencia(item.id);
                    if (error) toast.error('Error', error);
                    else {
                      toast.success('Foto eliminada');
                      void load();
                    }
                  })
                }
              />
            ))
          )}

          <Pressable
            className="mt-4 py-2"
            onPress={() => router.push('/(app)/admin/limpieza')}
          >
            <Text className="text-center text-servi-acento">Ir a limpieza de datos →</Text>
          </Pressable>
        </ScrollView>
      )}
    </DashboardShell>
  );
}

function TrashBitacoraCard({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashBitacoraRow;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const daysLeft = getTrashDaysRemaining(item.deleted_at);

  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie">
      <View className="border-b border-servi-borde px-4 py-3">
        <Text className="font-semibold text-servi-texto">{item.nombre ?? 'Sin nombre'}</Text>
        <Text className="text-sm text-servi-suave">{item.ruta ?? '—'}</Text>
        <Text className="mt-1 text-xs text-servi-suave">
          {item.estado} · {item.evidencias_count} fotos · {item.custodio_nombre ?? 'Custodio'}
        </Text>
        <Text className="mt-2 text-xs text-amber-400">
          Se elimina el {formatTrashPurgeDate(item.deleted_at)} ({daysLeft} dia(s) restantes)
        </Text>
      </View>
      <View className="flex-row gap-2 p-3">
        <View className="flex-1">
          <AppButton label="Restaurar" variant="outline" onPress={onRestore} />
        </View>
        <View className="flex-1">
          <AppButton label="Eliminar ya" variant="danger" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}

function TrashEvidenciaCard({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashEvidenciaRow;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const daysLeft = getTrashDaysRemaining(item.deleted_at);

  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie px-4 py-3">
      <Text className="font-semibold text-servi-texto">
        Foto · {item.bitacora_nombre ?? item.bitacora_id.slice(0, 8)}
      </Text>
      <Text className="text-xs text-servi-suave">
        {new Date(item.timestamp).toLocaleString()} · elimina en {daysLeft} dia(s)
      </Text>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <AppButton label="Restaurar" variant="outline" onPress={onRestore} />
        </View>
        <View className="flex-1">
          <AppButton label="Eliminar ya" variant="danger" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}
