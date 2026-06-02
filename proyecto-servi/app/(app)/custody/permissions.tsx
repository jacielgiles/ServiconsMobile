import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PermissionsPanel } from '../../../components/PermissionsPanel';
import { useAuth } from '../../../hooks/useAuth';
import { useBitacora, type BitacoraDetalle } from '../../../hooks/useBitacora';
import { useLocation } from '../../../hooks/useLocation';
import { usePermissions } from '../../../hooks/usePermissions';
import { upsertLiveLocation } from '../../../services/locationService';

/** Pantalla 5 — Permisos antes del servicio en proceso */
export default function CustodyPermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { getBitacoraDetalle, iniciarCustodia } = useBitacora();
  const { allGranted, ensureFieldPermissions } = usePermissions();
  const { getCurrentLocation } = useLocation();
  const [bitacora, setBitacora] = useState<BitacoraDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) getBitacoraDetalle(id).then(setBitacora);
  }, [id, getBitacoraDetalle]);

  const continuar = async () => {
    if (!id || !session?.user?.id || !bitacora) return;

    const permitted = await ensureFieldPermissions();
    if (!permitted) return;

    setLoading(true);

    try {
      const { latitude, longitude, accuracy } = await getCurrentLocation();

      if (bitacora.estado === 'pendiente') {
        const ok = await iniciarCustodia(id, session.user.id);
        if (!ok) throw new Error('No se pudo activar la custodia en Supabase');
      }

      await upsertLiveLocation({
        custodioId: session.user.id,
        bitacoraId: id,
        latitud: latitude,
        longitud: longitude,
        precision_m: accuracy ?? null,
      });

      router.replace({ pathname: '/(app)/custody/active', params: { id } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo continuar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable className="py-4" onPress={() => router.back()}>
          <Text className="text-servi-acento">← Volver</Text>
        </Pressable>

        <View className="mb-6 rounded-3xl bg-emerald-700 px-5 py-6">
          <Text className="text-xs uppercase text-emerald-100">Preparacion</Text>
          <Text className="text-2xl font-bold text-white">Permisos del dispositivo</Text>
          <Text className="mt-2 text-sm text-emerald-100">
            Camara y GPS son obligatorios. Todo se guarda en Supabase (sin n8n).
          </Text>
        </View>

        <PermissionsPanel />

        <View className="rounded-2xl border border-servi-borde bg-servi-superficie p-4">
          <Text className="mb-1 text-sm font-semibold text-servi-texto">{bitacora?.nombre}</Text>
          <Text className="text-sm text-servi-suave">{bitacora?.ruta}</Text>
        </View>

        <Pressable
          className={`mt-6 items-center rounded-2xl py-5 active:opacity-90 ${
            allGranted ? 'bg-emerald-600' : 'bg-servi-borde'
          }`}
          onPress={continuar}
          disabled={loading || !allGranted}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text className="text-lg font-bold text-white">Comenzar monitoreo</Text>
              <Text className="text-xs text-emerald-100">
                {allGranted ? 'Ir a servicio en proceso' : 'Activa permisos arriba'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
