import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from './AppButton';

type Props = {
  title: string;
  subtitle?: string;
  step: number;
  total?: number;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  onSkip?: () => void;
  scrollEnabled?: boolean;
};

export function WizardShell({
  title,
  subtitle,
  step,
  total = 7,
  children,
  onNext,
  nextLabel = 'Siguiente',
  onSkip,
  scrollEnabled = true,
}: Props) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-servi-acento">← Atrás</Text>
        </Pressable>
        <Text className="text-servi-suave">Paso {step}/{total}</Text>
      </View>

      <View className="mx-4 mb-3 flex-row gap-1">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-servi-acento' : 'bg-servi-borde'}`}
          />
        ))}
      </View>

      <View className="mb-4 px-4">
        <Text className="text-xl font-bold text-servi-texto">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-servi-suave">{subtitle}</Text> : null}
        <Text className="mt-2 text-xs font-semibold uppercase text-servi-acento">
          Paso {step} de {total}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View className="border-t border-servi-borde px-4 py-4">
        {onSkip ? (
          <Pressable className="mb-3 items-center py-2" onPress={onSkip}>
            <Text className="text-servi-suave">Omitir</Text>
          </Pressable>
        ) : null}
        <AppButton label={nextLabel} variant="accent" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}
