import { Text, View } from 'react-native';

import type { EstadoSegment } from '../lib/bitacoraStats';

type Props = {
  title?: string;
  segments: EstadoSegment[];
};

/** Barra apilada 100% — ideal para ver proporcion de estados de un vistazo */
export function MonitoringDonutChart({ title = 'Proporcion por estado', segments }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <View className="mb-4 rounded-2xl border border-servi-borde bg-servi-superficie p-4">
        <Text className="mb-2 text-sm font-semibold text-servi-texto">{title}</Text>
        <Text className="text-sm text-servi-suave">Sin servicios registrados.</Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-2xl border border-servi-borde bg-servi-superficie p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-servi-texto">{title}</Text>
        <Text className="text-2xl font-black text-servi-acento">{total}</Text>
      </View>

      <View className="mb-3 h-4 flex-row overflow-hidden rounded-full bg-servi-fondo">
        {segments.map((seg) => (
          <View
            key={seg.key}
            style={{
              flex: seg.value,
              backgroundColor: seg.color,
              minWidth: seg.value > 0 ? 4 : 0,
            }}
          />
        ))}
      </View>

      <View className="gap-2">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <View key={seg.key} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                <Text className="text-sm text-servi-texto">{seg.label}</Text>
              </View>
              <Text className="text-sm font-semibold text-servi-suave">
                {seg.value} · {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
