import { Image, Linking, Pressable, Text, View } from 'react-native';

import { formatCoords } from '../lib/geo';
import type { EvidenceStampMeta } from '../lib/evidenceMeta';

type Props = {
  index: number;
  latitud: number;
  longitud: number;
  timestamp: string;
  imageUrl: string | null;
  observaciones?: string | null;
  metadata?: EvidenceStampMeta | Record<string, unknown> | null;
  onPressMaps?: () => void;
};

/** Tarjeta compacta: foto visible + datos en poco espacio (sin mapa por reporte) */
export function EvidenciaCompactCard({
  index,
  latitud,
  longitud,
  timestamp,
  imageUrl,
  observaciones,
  onPressMaps,
}: Props) {
  const when = new Date(timestamp);

  const openMaps = () => {
    if (onPressMaps) {
      onPressMaps();
      return;
    }
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`,
    );
  };

  return (
    <Pressable
      className="mb-2 flex-row overflow-hidden rounded-xl border border-servi-borde bg-servi-superficie active:opacity-90"
      onPress={openMaps}
    >
      <View className="h-28 w-28 bg-servi-fondo">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center px-1">
            <Text className="text-center text-[10px] text-servi-suave">Sin foto</Text>
          </View>
        )}
      </View>

      <View className="flex-1 justify-center px-3 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold text-servi-acento">Reporte #{index}</Text>
          <View className="rounded-full bg-servi-primario/20 px-2 py-0.5">
            <Text className="text-[9px] font-bold text-emerald-400">GPS</Text>
          </View>
        </View>
        <Text className="mt-0.5 text-sm font-semibold text-servi-texto">
          {when.toLocaleDateString()} · {when.toLocaleTimeString()}
        </Text>
        <Text className="mt-0.5 font-mono text-[11px] text-servi-suave">
          {formatCoords(latitud, longitud, 5)}
        </Text>
        {observaciones ? (
          <Text className="mt-1 text-[11px] text-servi-suave" numberOfLines={2}>
            {observaciones}
          </Text>
        ) : null}
        <Text className="mt-1 text-[10px] text-servi-acento">Tocar para abrir en Maps</Text>
      </View>
    </Pressable>
  );
}
