import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '../../../../components/AppButton';
import { DashboardShell } from '../../../../components/DashboardShell';
import {
  getAdminBitacoraFull,
  listAdminBitacoraEvidencias,
  updateAdminBitacora,
  type AdminBitacoraDetail,
} from '../../../../services/adminService';

const ESTADOS = ['pendiente', 'activo', 'completado', 'cancelado'] as const;

export default function AdminBitacoraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bitacora, setBitacora] = useState<AdminBitacoraDetail | null>(null);
  const [evidenciasCount, setEvidenciasCount] = useState(0);

  const [nombre, setNombre] = useState('');
  const [ruta, setRuta] = useState('');
  const [unidad, setUnidad] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [estado, setEstado] = useState<string>('pendiente');
  const [intervalMin, setIntervalMin] = useState('15');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [detailRes, evRes] = await Promise.all([
      getAdminBitacoraFull(id),
      listAdminBitacoraEvidencias(id),
    ]);

    if (detailRes.error || !detailRes.data) {
      setError(detailRes.error ?? 'Bitacora no encontrada');
      setLoading(false);
      return;
    }

    const b = detailRes.data;
    setBitacora(b);
    setNombre(b.nombre ?? '');
    setRuta(b.ruta ?? '');
    setUnidad(b.unidad ?? '');
    setEmpresa(b.empresa_contratante ?? '');
    setEstado(b.estado);
    setIntervalMin(String(b.report_interval_minutes ?? 15));
    setEvidenciasCount(evRes.data.length);
    setError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!id) return;

    const minutes = parseInt(intervalMin, 10);
    if (!Number.isFinite(minutes) || minutes < 1) {
      Alert.alert('Error', 'Intervalo de reporte invalido.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await updateAdminBitacora(id, {
      nombre: nombre.trim(),
      ruta: ruta.trim(),
      unidad: unidad.trim(),
      empresa_contratante: empresa.trim(),
      estado,
      report_interval_minutes: minutes,
    });
    setSaving(false);

    if (saveError) {
      Alert.alert(
        'Error al guardar',
        `${saveError}\n\nSi ves error de permisos, ejecuta el SQL de politicas admin en Supabase.`,
      );
      return;
    }

    Alert.alert('Guardado', 'Bitacora actualizada.');
    load();
  };

  const formPreview = bitacora?.formulario as Record<string, unknown> | null;

  return (
    <DashboardShell title="Administrar bitacora">
      <Pressable className="mb-3 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">← Volver a bitacoras</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <Text className="text-servi-peligro">{error}</Text>
      ) : bitacora ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <Text className="text-xs uppercase text-emerald-400">Resumen</Text>
            <Text className="mt-1 text-sm text-servi-texto">
              Custodio: {bitacora.custodio_nombre ?? '—'}
            </Text>
            <Text className="text-sm text-servi-suave">
              {evidenciasCount} reportes GPS · Creada{' '}
              {new Date(bitacora.created_at).toLocaleString()}
            </Text>
            {bitacora.start_time ? (
              <Text className="text-sm text-servi-suave">
                Inicio servicio: {new Date(bitacora.start_time).toLocaleString()}
              </Text>
            ) : null}
          </View>

          <Field label="Nombre del servicio" value={nombre} onChangeText={setNombre} />
          <Field label="Ruta" value={ruta} onChangeText={setRuta} />
          <Field label="Unidad" value={unidad} onChangeText={setUnidad} />
          <Field label="Empresa contratante" value={empresa} onChangeText={setEmpresa} />
          <Field
            label="Intervalo reportes (minutos)"
            value={intervalMin}
            onChangeText={setIntervalMin}
            keyboardType="numeric"
          />

          <Text className="mb-2 text-sm text-servi-suave">Estado</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {ESTADOS.map((st) => (
              <Pressable
                key={st}
                className={`rounded-full px-3 py-1.5 ${
                  estado === st ? 'bg-servi-acento' : 'border border-servi-borde bg-servi-superficie'
                }`}
                onPress={() => setEstado(st)}
              >
                <Text
                  className={`text-xs font-semibold capitalize ${
                    estado === st ? 'text-servi-fondo' : 'text-servi-texto'
                  }`}
                >
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>

          <AppButton label="Guardar cambios" variant="accent" onPress={handleSave} loading={saving} />

          <Pressable
            className="mt-4 items-center rounded-2xl border border-sky-500/40 bg-sky-500/10 py-4"
            onPress={() => router.push(`/(app)/admin/reporte/${id}`)}
          >
            <Text className="font-bold text-sky-400">Ver reporte visual y exportar PDF →</Text>
          </Pressable>

          {bitacora.estado === 'activo' ? (
            <Pressable
              className="mt-3 items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4"
              onPress={() => router.push('/(app)/admin/activos')}
            >
              <Text className="font-bold text-emerald-400">Ver en monitoreo en vivo →</Text>
            </Pressable>
          ) : null}

          {formPreview ? (
            <View className="mt-6 rounded-2xl border border-servi-borde bg-servi-superficie p-4">
              <Text className="mb-2 font-semibold text-servi-texto">Datos del formulario</Text>
              <InfoRow label="Folio" value={String(formPreview.folioCliente ?? '—')} />
              <InfoRow
                label="Operador"
                value={String((formPreview.operador1 as { nombre?: string })?.nombre ?? '—')}
              />
              <InfoRow
                label="WhatsApp"
                value={String(
                  (formPreview.whatsappGrupo as { pushName?: string })?.pushName ?? 'Sin grupo',
                )}
              />
              <InfoRow
                label="Origen"
                value={String((formPreview.origen as { municipio?: string })?.municipio ?? '—')}
              />
              <InfoRow
                label="Destino"
                value={String((formPreview.destino as { municipio?: string })?.municipio ?? '—')}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </DashboardShell>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'numeric';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm text-servi-suave">{label}</Text>
      <TextInput
        className="rounded-xl border border-servi-borde bg-servi-fondo px-4 py-3 text-servi-texto"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#64748B"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row">
      <Text className="w-28 text-xs text-servi-suave">{label}</Text>
      <Text className="flex-1 text-sm text-servi-texto">{value}</Text>
    </View>
  );
}
