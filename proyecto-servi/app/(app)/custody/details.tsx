import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationDisplay } from '../../../components/LocationDisplay';
import { PermissionsPanel } from '../../../components/PermissionsPanel';
import { ReportMapView } from '../../../components/ReportMapView';
import { useAuth } from '../../../hooks/useAuth';
import { useBitacora, type BitacoraDetalle } from '../../../hooks/useBitacora';
import { useLocation } from '../../../hooks/useLocation';
import { upsertLiveLocation } from '../../../services/locationService';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Listo para iniciar',
  activo: 'En curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export default function CustodyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { getBitacoraDetalle, iniciarCustodia } = useBitacora();
  const { getCurrentLocation } = useLocation();
  const [bitacora, setBitacora] = useState<BitacoraDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (id) {
      getBitacoraDetalle(id).then((data) => {
        setBitacora(data);
        setLoading(false);
      });
    }
  }, [id, getBitacoraDetalle]);

  useEffect(() => {
    getCurrentLocation()
      .then(({ latitude, longitude }) => setStartCoords({ lat: latitude, lng: longitude }))
      .catch(() => setStartCoords(null));
  }, [getCurrentLocation]);

  const iniciar = async () => {
    if (!id || !session?.user?.id || !bitacora) return;

    setStarting(true);

    try {
      const { latitude, longitude, accuracy } = await getCurrentLocation();
      setStartCoords({ lat: latitude, lng: longitude });

      const ok = await iniciarCustodia(id, session.user.id);
      if (!ok) {
        Alert.alert('Error', 'No se pudo activar la bitacora en Supabase.');
        return;
      }

      await upsertLiveLocation({
        custodioId: session.user.id,
        bitacoraId: id,
        latitud: latitude,
        longitud: longitude,
        precision_m: accuracy ?? null,
      });

      Alert.alert('Servicio iniciado', 'Custodia activa. GPS guardado en Supabase.');
      router.replace({ pathname: '/(app)/custody/active', params: { id } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar el servicio.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-servi-fondo">
        <ActivityIndicator color="#F97316" size="large" />
        <Text className="mt-3 text-servi-suave">Cargando servicio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable className="py-4" onPress={() => router.back()}>
          <Text className="text-servi-acento">← Volver</Text>
        </Pressable>

        <View className="mb-4 overflow-hidden rounded-3xl border border-servi-borde bg-servi-superficie">
          <View className="bg-servi-primario/20 px-5 py-4">
            <Text className="text-xs uppercase text-servi-suave">Pre-arranque</Text>
            <Text className="text-2xl font-bold text-servi-texto">{bitacora?.nombre}</Text>
            <Text className="mt-1 text-sm text-servi-suave">
              {ESTADO_LABEL[bitacora?.estado ?? ''] ?? bitacora?.estado}
            </Text>
          </View>

          <View className="gap-3 p-5">
            <InfoRow icon="map-outline" label="Ruta" value={bitacora?.ruta ?? '—'} />
            <InfoRow icon="bus-outline" label="Unidad" value={bitacora?.unidad ?? '—'} />
            <InfoRow icon="business-outline" label="Empresa" value={bitacora?.empresa_contratante ?? '—'} />
            <InfoRow
              icon="time-outline"
              label="Reportes"
              value={`Cada ${bitacora?.report_interval_minutes ?? 15} min · foto + GPS`}
            />
          </View>
        </View>

        <PermissionsPanel compact />

        {startCoords ? (
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-servi-texto">Punto de salida</Text>
            <ReportMapView
              points={[{ lat: startCoords.lat, lng: startCoords.lng, label: 'Inicio' }]}
              height={180}
              title="Ubicacion de inicio del servicio"
            />
          </View>
        ) : (
          <LocationDisplay label="Obteniendo GPS de inicio..." />
        )}

        {bitacora?.estado === 'pendiente' ? (
          <Pressable
            className="mt-2 items-center rounded-2xl bg-emerald-600 py-5 shadow-lg active:opacity-90"
            onPress={iniciar}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="play-circle" size={28} color="#FFF" />
                <Text className="mt-1 text-xl font-bold text-white">Iniciar servicio</Text>
                <Text className="text-xs text-emerald-100">Activa custodia y guarda GPS en Supabase</Text>
              </>
            )}
          </Pressable>
        ) : bitacora?.estado === 'activo' ? (
          <Pressable
            className="items-center rounded-2xl bg-servi-acento py-5 active:opacity-90"
            onPress={() => router.push({ pathname: '/(app)/custody/active', params: { id } })}
          >
            <Text className="text-lg font-bold text-servi-fondo">Continuar servicio en curso</Text>
          </Pressable>
        ) : (
          <Text className="text-center text-servi-suave">Este servicio ya fue cerrado.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={18} color="#64748B" />
      <View className="ml-3">
        <Text className="text-[10px] uppercase text-servi-suave">{label}</Text>
        <Text className="text-base text-servi-texto">{value}</Text>
      </View>
    </View>
  );
}
