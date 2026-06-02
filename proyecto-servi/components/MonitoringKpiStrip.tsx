import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { FadeInView } from './FadeInView';

type Kpi = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'live' | 'warn' | 'info' | 'neutral';
};

const toneStyles = {
  live: { bg: 'bg-emerald-500/15 border-emerald-500/40', icon: '#22C55E', text: 'text-emerald-400' },
  warn: { bg: 'bg-red-500/15 border-red-500/40', icon: '#DC2626', text: 'text-red-400' },
  info: { bg: 'bg-sky-500/15 border-sky-500/40', icon: '#0EA5E9', text: 'text-sky-400' },
  neutral: { bg: 'bg-servi-superficie border-servi-borde', icon: '#F97316', text: 'text-servi-acento' },
};

export function MonitoringKpiStrip({ items }: { items: Kpi[] }) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {items.map((item, index) => {
        const t = toneStyles[item.tone ?? 'neutral'];
        return (
          <FadeInView
            key={item.label}
            delay={60 + index * 50}
            className={`min-w-[46%] flex-1 rounded-2xl border p-3 ${t.bg}`}
          >
            <View className="mb-1 flex-row items-center gap-1.5">
              <Ionicons name={item.icon} size={16} color={t.icon} />
              <Text className="text-[10px] font-bold uppercase text-servi-suave">{item.label}</Text>
            </View>
            <Text className={`text-2xl font-black ${t.text}`}>{item.value}</Text>
          </FadeInView>
        );
      })}
    </View>
  );
}
