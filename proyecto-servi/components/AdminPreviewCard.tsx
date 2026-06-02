import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  metric: string;
  metricLabel: string;
  previewLines: string[];
  onPress?: () => void;
  accent?: 'default' | 'warning' | 'muted';
};

export function AdminPreviewCard({
  icon,
  title,
  metric,
  metricLabel,
  previewLines,
  onPress,
  accent = 'default',
}: Props) {
  const interactive = Boolean(onPress);
  const metricColor =
    accent === 'warning' ? '#DC2626' : accent === 'muted' ? '#64748B' : '#F97316';

  return (
    <AnimatedPressable
      className={`mb-3 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie ${
        interactive ? '' : 'opacity-75'
      }`}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-start p-4">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-servi-fondo">
          <Ionicons name={icon} size={20} color="#F97316" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-servi-texto">{title}</Text>
            {interactive ? (
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            ) : (
              <Text className="text-[10px] text-servi-suave">Pronto</Text>
            )}
          </View>

          <View className="mt-2 flex-row items-baseline gap-2">
            <Text className="text-2xl font-bold" style={{ color: metricColor }}>
              {metric}
            </Text>
            <Text className="text-xs text-servi-suave">{metricLabel}</Text>
          </View>
        </View>
      </View>

      <View className="border-t border-servi-borde/60 bg-servi-fondo/50 px-4 py-2.5">
        {previewLines.map((line) => (
          <Text key={line} className="text-xs leading-5 text-servi-suave">
            {line}
          </Text>
        ))}
      </View>
    </AnimatedPressable>
  );
}
