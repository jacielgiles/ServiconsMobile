import { Image, Text, View } from 'react-native';

import { formatCoords } from '../lib/geo';
import type { EvidenceStampMeta } from '../lib/evidenceMeta';

type Props = {
  uri: string;
  meta: EvidenceStampMeta;
  height?: number;
};

/** Foto de evidencia con logo y datos (marca visual Servicons) */
export function StampedEvidenceImage({ uri, meta, height = 220 }: Props) {
  const when = new Date(meta.timestamp).toLocaleString();

  return (
    <View className="overflow-hidden rounded-xl bg-black" style={{ height }}>
      <Image source={{ uri }} className="absolute inset-0 h-full w-full" resizeMode="cover" />

      <View className="absolute left-2 top-2 flex-row items-center rounded-lg bg-black/55 px-2 py-1">
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <View className="ml-2">
          <Text className="text-[10px] font-bold text-white">Servicons</Text>
          <Text className="text-[9px] text-emerald-300">{meta.empresa || 'Monitoreo'}</Text>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 bg-black/75 px-3 py-2">
        <Text className="text-[11px] font-bold text-white">{meta.servicioNombre}</Text>
        <Text className="text-[10px] text-gray-200">
          {meta.custodioNombre} · {meta.unidad || '—'} · Reporte #{meta.numeroReporte}
        </Text>
        <Text className="text-[10px] text-emerald-300">
          GPS {formatCoords(meta.lat, meta.lng)} · {when}
        </Text>
        {meta.ruta ? (
          <Text className="text-[9px] text-gray-300" numberOfLines={1}>
            {meta.ruta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
