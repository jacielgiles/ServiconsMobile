import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { FadeInView } from './FadeInView';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tone?: 'emerald' | 'sky' | 'orange';
};

const toneMap = {
  emerald: { icon: '#22C55E', ring: 'border-emerald-500/30 bg-emerald-500/10' },
  sky: { icon: '#0EA5E9', ring: 'border-sky-500/30 bg-sky-500/10' },
  orange: { icon: '#F97316', ring: 'border-orange-500/30 bg-orange-500/10' },
};

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  tone = 'emerald',
}: Props) {
  const t = toneMap[tone];

  return (
    <FadeInView>
      <View className={`items-center rounded-3xl border border-dashed p-8 ${t.ring}`}>
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-servi-fondo/80">
          <Ionicons name={icon} size={32} color={t.icon} />
        </View>
        <Text className="mb-2 text-center text-lg font-bold text-servi-texto">{title}</Text>
        <Text className="text-center text-sm leading-5 text-servi-suave">{description}</Text>
      </View>
    </FadeInView>
  );
}
