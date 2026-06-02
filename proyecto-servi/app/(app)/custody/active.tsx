import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmFinishModal } from '../../../components/ConfirmFinishModal';
import { CircularTimer } from '../../../components/CircularTimer';
import { LocationDisplay } from '../../../components/LocationDisplay';
import { ReportStatusBar, type ReportSyncStatus } from '../../../components/ReportStatusBar';
import { SOSButton } from '../../../components/SOSButton';
import { useAuth } from '../../../hooks/useAuth';
import { useBitacora, type BitacoraDetalle } from '../../../hooks/useBitacora';
import { useEvidencias } from '../../../hooks/useEvidencias';
import { useLiveLocationTracker } from '../../../hooks/useLiveLocationTracker';
import { useLocation } from '../../../hooks/useLocation';
import { usePermissions } from '../../../hooks/usePermissions';
import { supabase } from '../../../lib/supabaseClient';
import { reportEvidence, triggerSOS, type N8nChannel } from '../../../services/n8nService';

export default function CustodyActiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const { getBitacoraDetalle } = useBitacora();
  const { getCurrentLocation } = useLocation();
  const { ensureFieldPermissions } = usePermissions();
  const { uploadFoto, saveEvidencia, getEvidencias } = useEvidencias();
  const [bitacora, setBitacora] = useState<BitacoraDetalle | null>(null);
  const [evidenciasCount, setEvidenciasCount] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [locationKey, setLocationKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState<ReportSyncStatus>('ok');
  const [finishModal, setFinishModal] = useState(false);

  const { lastUploadAt, uploadError } = useLiveLocationTracker({
    custodioId: userId,
    bitacoraId: id,
    enabled: Boolean(id && userId && bitacora?.estado === 'activo'),
  });

  useEffect(() => {
    if (!id) return;
    getBitacoraDetalle(id).then(setBitacora);
    getEvidencias(id).then((rows) => setEvidenciasCount(rows.length));
  }, [id, getBitacoraDetalle, getEvidencias]);

  const getContactos = (): N8nChannel[] => {
    const grupo = bitacora?.formulario?.whatsappGrupo;
    return grupo ? [grupo] : [];
  };

  const reportarEvidencia = useCallback(async () => {
    if (!id || !userId || reporting) return;

    const permitted = await ensureFieldPermissions();
    if (!permitted) return;

    setReporting(true);

    try {
      const photo = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: false,
      });

      if (photo.canceled || !photo.assets?.[0]?.uri) {
        setReporting(false);
        return;
      }

      const photoUri = photo.assets[0].uri;
      const { latitude, longitude } = await getCurrentLocation();
      const urlImagen = await uploadFoto(photoUri, userId, id);

      if (!urlImagen) {
        throw new Error('No se pudo subir la foto a Storage');
      }

      const saved = await saveEvidencia({
        bitacora_id: id,
        custodio_id: userId,
        url_imagen: urlImagen,
        latitud: latitude,
        longitud: longitude,
      });

      if (!saved) throw new Error('No se guardo la evidencia');

      const n8nResult = await reportEvidence(
        {
          bitacora_id: id,
          custodio_id: userId,
          latitud: latitude,
          longitud: longitude,
          custodio: profile?.nombre ?? 'Custodio',
          estatus: 'en_ruta',
          contactos: getContactos(),
        },
        photoUri,
      );

      setTimerKey((k) => k + 1);
      setLocationKey((k) => k + 1);
      getEvidencias(id).then((rows) => setEvidenciasCount(rows.length));

      Alert.alert(
        n8nResult.success ? 'Reporte enviado' : 'Reporte guardado',
        n8nResult.success
          ? 'Foto + GPS en mapa y Supabase. WhatsApp via n8n.'
          : `Guardado en Supabase. n8n: ${n8nResult.error ?? 'sin respuesta'}.`,
      );
      setSyncStatus(n8nResult.success ? 'ok' : 'error');
    } catch (e) {
      setSyncStatus('error');
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al reportar');
    } finally {
      setReporting(false);
    }
  }, [
    id,
    userId,
    reporting,
    ensureFieldPermissions,
    getCurrentLocation,
    uploadFoto,
    saveEvidencia,
    getEvidencias,
    profile?.nombre,
    bitacora?.formulario?.whatsappGrupo,
  ]);

  const activarSOS = async () => {
    if (!id || !userId) return;

    const permitted = await ensureFieldPermissions();
    if (!permitted) return;

    try {
      const { latitude, longitude } = await getCurrentLocation();

      const { error } = await supabase.from('sos_alerts').insert({
        custodio_id: userId,
        bitacora_id: id,
        latitud: latitude,
        longitud: longitude,
        estado: 'activa',
      });

      if (error) throw error;

      const n8nResult = await triggerSOS({
        custodio_id: userId,
        custodio_nombre: profile?.nombre ?? 'Custodio',
        bitacora_id: id,
        latitud: latitude,
        longitud: longitude,
        timestamp: new Date().toISOString(),
        contactos_emergencia: getContactos(),
      });

      Alert.alert(
        'SOS enviado',
        n8nResult.success
          ? 'Ayuda en camino. Ubicacion GPS compartida con administradores.'
          : `Alerta registrada. n8n: ${n8nResult.error ?? 'sin respuesta'}.`,
      );
    } catch (e) {
      Alert.alert('Error SOS', e instanceof Error ? e.message : 'No se pudo enviar SOS');
    }
  };

  const interval = bitacora?.report_interval_minutes ?? 15;
  const startLabel = bitacora?.start_time
    ? new Date(bitacora.start_time).toLocaleString()
    : '—';

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <View className="bg-emerald-800 px-4 py-3">
        <Text className="text-[10px] uppercase text-emerald-200">Custodio · Monitoreo</Text>
        <Text className="text-lg font-bold text-white">{bitacora?.nombre}</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <ReportStatusBar status={syncStatus} />

        <CircularTimer
          intervalMinutes={interval}
          onExpire={reportarEvidencia}
          onPress={reportarEvidencia}
          resetKey={timerKey}
        />

        <Text className="mb-2 text-center text-sm text-servi-suave">
          Custodia: {bitacora?.unidad ?? bitacora?.nombre}
        </Text>

        <LocationDisplay refreshKey={locationKey} label="Mapa GPS en tiempo real" />

        <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <View className="mb-1 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-emerald-400" />
            <Text className="text-xs font-semibold uppercase text-emerald-300">
              Ubicacion en vivo activa
            </Text>
          </View>
          <Text className="text-sm text-servi-suave">
            {lastUploadAt
              ? `Ultima subida a la base: ${new Date(lastUploadAt).toLocaleTimeString()}`
              : 'Subiendo ubicacion GPS a administradores...'}
          </Text>
          {uploadError ? (
            <Text className="mt-1 text-xs text-servi-peligro">Error GPS: {uploadError}</Text>
          ) : null}
        </View>

        <View className="mb-4 flex-row gap-3">
          <StatBox label="Reportes" value={String(evidenciasCount)} accent />
          <StatBox label="Inicio" value={startLabel.split(',')[1]?.trim() ?? '—'} />
        </View>

        <Pressable
          className="mb-4 items-center rounded-2xl bg-emerald-600 py-4 active:opacity-90"
          onPress={reportarEvidencia}
          disabled={reporting}
        >
          {reporting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-lg font-bold text-white">Reportar ahora (camara)</Text>
          )}
        </Pressable>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t border-servi-borde bg-servi-fondo/95 px-4 py-3">
        <SOSButton onConfirm={activarSOS} disabled={reporting} />
        <Pressable
          className="rounded-2xl bg-slate-700 px-6 py-4 active:opacity-90"
          onPress={() => setFinishModal(true)}
        >
          <Text className="font-bold text-white">Terminar</Text>
        </Pressable>
      </View>

      <ConfirmFinishModal
        visible={finishModal}
        serviceName={bitacora?.nombre}
        onCancel={() => setFinishModal(false)}
        onConfirm={() => {
          setFinishModal(false);
          router.push({ pathname: '/(app)/custody/finish', params: { id } });
        }}
      />
    </SafeAreaView>
  );
}

function StatBox({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-2xl border px-3 py-3 ${
        highlight
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-servi-borde bg-servi-superficie'
      }`}
    >
      <Text className="text-[10px] uppercase text-servi-suave">{label}</Text>
      <Text
        className={`text-lg font-bold ${accent ? 'text-servi-acento' : highlight ? 'text-emerald-400' : 'text-servi-texto'}`}
      >
        {value}
      </Text>
    </View>
  );
}
