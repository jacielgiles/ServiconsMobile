import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { EstadoSegment } from '../lib/bitacoraStats';

type Props = {
  title?: string;
  segments: EstadoSegment[];
  height?: number;
};

export function MonitoringBarChart({ title = 'Distribucion de servicios', segments, height = 130 }: Props) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  const barWidth = segments.length > 0 ? Math.min(48, 280 / segments.length) : 40;
  const chartWidth = segments.length * (barWidth + 12) + 8;
  const chartHeight = height - 36;

  if (segments.length === 0) {
    return (
      <View className="mb-4 rounded-2xl border border-servi-borde bg-servi-superficie p-4">
        <Text className="mb-2 text-sm font-semibold text-servi-texto">{title}</Text>
        <Text className="text-sm text-servi-suave">Sin datos para graficar aun.</Text>
      </View>
    );
  }

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie p-4">
      <Text className="mb-3 text-sm font-semibold text-servi-texto">{title}</Text>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {segments.map((seg, i) => {
          const barH = Math.max(8, (seg.value / max) * chartHeight);
          const x = 8 + i * (barWidth + 12);
          const y = chartHeight - barH + 4;
          return (
            <Rect
              key={seg.key}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={6}
              fill={seg.color}
            />
          );
        })}
      </Svg>
      <View className="mt-2 flex-row flex-wrap gap-3">
        {segments.map((seg) => (
          <View key={seg.key} className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <Text className="text-xs text-servi-suave">
              {seg.label}: <Text className="font-bold text-servi-texto">{seg.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
