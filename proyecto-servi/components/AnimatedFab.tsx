import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { AnimatedPressable } from './AnimatedPressable';

type Props = {
  onPress: () => void;
  pulse?: boolean;
  tone?: 'emerald' | 'sky' | 'orange';
};

const tones = {
  emerald: 'bg-emerald-600 shadow-emerald-900/40',
  sky: 'bg-sky-600 shadow-sky-900/40',
  orange: 'bg-orange-500 shadow-orange-900/40',
};

export function AnimatedFab({ onPress, pulse = false, tone = 'emerald' }: Props) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.35);

  useEffect(() => {
    if (!pulse) return;
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0.08, { duration: 900 }), withTiming(0.35, { duration: 900 })),
      -1,
      false,
    );
  }, [pulse, ringOpacity, ringScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <AnimatedPressable
      className={`absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg ${tones[tone]}`}
      onPress={onPress}
      scaleTo={0.92}
    >
      {pulse ? (
        <Animated.View
          style={ringStyle}
          className="absolute h-14 w-14 rounded-full bg-white"
        />
      ) : null}
      <Text className="text-3xl font-bold text-white">+</Text>
    </AnimatedPressable>
  );
}
