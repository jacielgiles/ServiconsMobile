import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmFinishModal } from '../../../components/ConfirmFinishModal';
import { CircularTimer } from '../../../components/CircularTimer';
import { LocationDisplay } from '../../../components/LocationDisplay';
import { ReportStatusBar, type ReportSyncStatus } from '../../../components/ReportStatusBar';
import { SOSButton } from '../../../components/SOSButton';
import { useAppToast } from '../../../hooks/useAppToast';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { useAuth } from '../../../hooks/useAuth';
import { useBitacora, type BitacoraDetalle } from '../../../hooks/useBitacora';
import { useEvidencias } from '../../../hooks/useEvidencias';
import { useLiveLocationTracker } from '../../../hooks/useLiveLocationTracker';
import { useLocation } from '../../../hooks/useLocation';
import { usePermissions } from '../../../hooks/usePermissions';
import { buildEvidenceObservaciones, type EvidenceStampMeta } from '../../../lib/evidenceMeta';
import { supabase } from '../../../lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';

export default function CustodyActiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();
  const toast = useAppToast();
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

  const { lastUploadAt, uploadError, appForeground, isTransmittingLive } = useLiveLocationTracker({
    custodioId: userId,
    bitacoraId: id,
    enabled: Boolean(id && userId && bitacora?.estado === 'activo'),
  });

  const reload = useCallback(async () => {
    if (!id) return;
    getBitacoraDetalle(id).then(setBitacora);
    getEvidencias(id).then((rows) => setEvidenciasCount(rows.length));
  }, [id, getBitacoraDetalle, getEvidencias]);

  useAutoRefresh(reload, 15_000);

  const reportarEvidencia = useCallback(async () => {
    if (!id || !userId || reporting) return;

    const permitted = await ensureFieldPermissions();
    if (!permitted) return;

    setReporting(true);

    try {
      const photo = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo.canceled || !photo.assets?.[0]?.uri) {
        setReporting(false);
        return;
      }

      const photoUri = photo.assets[0].uri;
      const loc = await getCurrentLocation();
      const nextReportNumber = evidenciasCount + 1;

      const stampMeta: EvidenceStampMeta = {
        timestamp: new Date().toISOString(),
        lat: loc.latitude,
        lng: loc.longitude,
        precision_m: loc.accuracy ?? null,
        custodioNombre: profile?.nombre ?? 'Custodio',
        servicioNombre: bitacora?.nombre ?? 'Servicio',
        empresa: bitacora?.empresa_contratante ?? profile?.empresa ?? '',
        unidad: bitacora?.unidad ?? '',
        ruta: bitacora?.ruta ?? '',
        numeroReporte: nextReportNumber,
      };

      const uploaded = await uploadFoto(photoUri, userId, id);
      if (!uploaded) throw new Error('No se pudo subir la foto a Storage');

      const saved = await saveEvidencia({
        bitacora_id: id,
        custodio_id: userId,
        url_imagen: uploaded.url,
        storage_path: uploaded.path,
        latitud: loc.latitude,
        longitud: loc.longitude,
        precision_m: loc.accuracy ?? null,
        observaciones: buildEvidenceObservaciones(stampMeta),
        metadata: stampMeta,
      });

      if (!saved) throw new Error('No se guardo la evidencia en la base de datos');

      setTimerKey((k) => k + 1);
      setLocationKey((k) => k + 1);
      getEvidencias(id).then((rows) => setEvidenciasCount(rows.length));
      setSyncStatus('ok');

      toast.success(
        'Reporte guardado',
        'Foto y GPS registrados. Admin y cliente ven la ultima ubicacion.',
      );
    } catch (e) {
      setSyncStatus('error');
      toast.error('Error al reportar', e instanceof Error ? e.message : 'Intenta de nuevo.');
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
    profile?.empresa,
    bitacora,
    evidenciasCount,
    toast,
  ]);

  const activarSOS = async () => {
    if (!id || !userId) return;

    const permitted = await ensureFieldPermissions();
    if (!permitted) return;

    try {
      const { latitude, longitude, accuracy } = await getCurrentLocation();

      const { error } = await supabase.from('sos_alerts').insert({
        custodio_id: userId,
        bitacora_id: id,
        latitud: latitude,
        longitud: longitude,
        estado: 'activa',
      });

      if (error) throw error;

      await supabase.from('custodio_ubicaciones_live').upsert(
        {
          custodio_id: userId,
          bitacora_id: id,
          latitud: latitude,
          longitud: longitude,
          precision_m: accuracy ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'custodio_id' },
      );

      toast.warning(
        'SOS enviado',
        'Alerta registrada. Los administradores la ven en Alertas SOS.',
      );
    } catch (e) {
      toast.error('Error SOS', e instanceof Error ? e.message : 'No se pudo enviar SOS');
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

        <View
          className={`mb-4 rounded-2xl border px-4 py-3 ${
            isTransmittingLive
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-amber-500/40 bg-amber-500/10'
          }`}
        >
          <View className="mb-1 flex-row items-center gap-2">
            <View
              className={`h-2 w-2 rounded-full ${
                isTransmittingLive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <Text
              className={`text-xs font-semibold uppercase ${
                isTransmittingLive ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {isTransmittingLive
                ? 'GPS transmitiendo — app abierta'
                : appForeground
                  ? 'Conectando GPS...'
                  : 'GPS pausado — abre la app en custodia'}
            </Text>
          </View>
          <Text className="text-sm text-servi-suave">
            {isTransmittingLive && lastUploadAt
              ? `Ultima subida: ${new Date(lastUploadAt).toLocaleTimeString()} · cada ~30 s`
              : 'Los administradores solo ven "en vivo" mientras esta pantalla esta activa.'}
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
            <Text className="text-lg font-bold text-white">Reportar ahora (camara + GPS)</Text>
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
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-servi-borde bg-servi-superficie px-3 py-3">
      <Text className="text-[10px] uppercase text-servi-suave">{label}</Text>
      <Text className={`text-lg font-bold ${accent ? 'text-servi-acento' : 'text-servi-texto'}`}>
        {value}
      </Text>
    </View>
  );
}
