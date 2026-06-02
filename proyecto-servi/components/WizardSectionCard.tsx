import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Tone = 'orange' | 'green' | 'blue' | 'red' | 'neutral';

const toneStyles: Record<
  Tone,
  { border: string; bg: string; iconBg: string; iconColor: string }
> = {
  orange: {
    border: 'border-servi-acento/45',
    bg: 'bg-servi-acento/8',
    iconBg: 'bg-servi-acento',
    iconColor: '#FFF',
  },
  green: {
    border: 'border-emerald-500/45',
    bg: 'bg-emerald-500/8',
    iconBg: 'bg-emerald-600',
    iconColor: '#FFF',
  },
  blue: {
    border: 'border-sky-500/45',
    bg: 'bg-sky-500/8',
    iconBg: 'bg-sky-600',
    iconColor: '#FFF',
  },
  red: {
    border: 'border-red-500/45',
    bg: 'bg-red-500/8',
    iconBg: 'bg-red-600',
    iconColor: '#FFF',
  },
  neutral: {
    border: 'border-servi-borde',
    bg: 'bg-servi-superficie',
    iconBg: 'bg-servi-borde',
    iconColor: '#F97316',
  },
};

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  children: ReactNode;
};

export function WizardSectionCard({
  title,
  subtitle,
  icon,
  tone = 'neutral',
  children,
}: Props) {
  const s = toneStyles[tone];

  return (
    <View className={`mb-5 overflow-hidden rounded-2xl border ${s.border} ${s.bg}`}>
      <View className="flex-row items-center gap-3 border-b border-white/5 px-4 py-3">
        <View className={`h-11 w-11 items-center justify-center rounded-xl ${s.iconBg}`}>
          <Ionicons name={icon} size={22} color={s.iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-servi-texto">{title}</Text>
          {subtitle ? <Text className="mt-0.5 text-xs text-servi-suave">{subtitle}</Text> : null}
        </View>
      </View>
      <View className="px-4 pb-4 pt-3">{children}</View>
    </View>
  );
}
