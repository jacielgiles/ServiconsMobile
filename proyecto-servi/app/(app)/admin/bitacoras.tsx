import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { DashboardShell } from '../../../components/DashboardShell';
import { listAdminBitacoras, type AdminBitacoraRow } from '../../../services/adminService';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  activo: 'Activo',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#64748B',
  activo: '#1B7A4E',
  completado: '#2563EB',
  cancelado: '#DC2626',
};

export default function AdminBitacorasScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AdminBitacoraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'activo' | 'pendiente' | 'completado'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: listError } = await listAdminBitacoras();
    setItems(data);
    setError(listError);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = items.filter((item) => (filter === 'all' ? true : item.estado === filter));

  return (
    <DashboardShell title="Bitacoras">
      <View className="mb-3 flex-row flex-wrap gap-2">
        {(['all', 'activo', 'pendiente', 'completado'] as const).map((key) => (
          <Pressable
            key={key}
            className={`rounded-full px-3 py-1.5 ${
              filter === key ? 'bg-servi-acento' : 'border border-servi-borde bg-servi-superficie'
            }`}
            onPress={() => setFilter(key)}
          >
            <Text
              className={`text-xs font-semibold ${
                filter === key ? 'text-servi-fondo' : 'text-servi-texto'
              }`}
            >
              {key === 'all' ? 'Todas' : ESTADO_LABEL[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <Text className="text-servi-peligro">{error}</Text>
      ) : filtered.length === 0 ? (
        <Text className="text-servi-suave">No hay bitacoras con este filtro.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              className="mb-3 rounded-xl border border-servi-borde bg-servi-superficie p-4 active:opacity-80"
              onPress={() => router.push(`/(app)/admin/bitacora/${item.id}`)}
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-servi-texto">
                  {item.nombre ?? 'Sin nombre'}
                </Text>
                <Text
                  className="text-xs font-semibold"
                  style={{ color: ESTADO_COLOR[item.estado] ?? '#64748B' }}
                >
                  {ESTADO_LABEL[item.estado] ?? item.estado}
                </Text>
              </View>
              <Text className="text-sm text-servi-suave">{item.ruta ?? '—'}</Text>
              <Text className="mt-1 text-xs text-servi-suave">
                {item.empresa_contratante ?? '—'} · {item.unidad ?? '—'}
              </Text>
              <Text className="mt-2 text-xs text-servi-acento">Ver detalle y GPS</Text>
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
