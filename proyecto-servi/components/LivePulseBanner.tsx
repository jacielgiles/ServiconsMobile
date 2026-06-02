import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FadeInView } from './FadeInView';

type Props = {
  count: number;
  label?: string;
  headline?: string;
  tone?: 'emerald' | 'sky' | 'orange';
};

const tones = {
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: '#22C55E', text: 'text-emerald-400' },
  sky: { border: 'border-sky-500/40', bg: 'bg-sky-500/10', dot: '#0EA5E9', text: 'text-sky-400' },
  orange: { border: 'border-orange-500/40', bg: 'bg-orange-500/10', dot: '#F97316', text: 'text-orange-400' },
};

export function LivePulseBanner({
  count,
  label = 'servicios en monitoreo ahora',
  headline,
  tone = 'emerald',
}: Props) {
  const pulse = useSharedValue(1);
  const ringOpacity = useSharedValue(0.45);
  const t = tones[tone];

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0.12, { duration: 700 }), withTiming(0.45, { duration: 700 })),
      -1,
      false,
    );
  }, [pulse, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: ringOpacity.value,
  }));

  if (count <= 0) return null;

  return (
    <FadeInView delay={80}>
      <View className={`mb-4 flex-row items-center rounded-2xl border px-4 py-3 ${t.border} ${t.bg}`}>
        <View className="mr-3 h-5 w-5 items-center justify-center">
          <Animated.View
            style={[ringStyle, { backgroundColor: t.dot }]}
            className="absolute h-5 w-5 rounded-full"
          />
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.dot }} />
        </View>
        <View className="flex-1">
          <Text className={`text-lg font-black ${t.text}`}>{headline ?? `${count} activas`}</Text>
          <Text className="text-xs text-servi-suave">{label}</Text>
        </View>
        <Ionicons name="pulse" size={22} color={t.dot} />
      </View>
    </FadeInView>
  );
}
