import { ScrollView, Text, View } from 'react-native';

import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_VERSION } from '../lib/privacyPolicy';

export function PrivacyPolicyScreen() {
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <Text className="text-xs uppercase text-emerald-400">Politica de privacidad</Text>
        <Text className="mt-1 text-sm text-servi-suave">Version {PRIVACY_POLICY_VERSION}</Text>
        <Text className="mt-2 text-sm text-servi-texto">
          Servicons Mobile — monitoreo de custodias con GPS, evidencias fotograficas y alertas SOS.
        </Text>
      </View>

      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <View key={section.title} className="mb-5">
          <Text className="mb-2 text-base font-bold text-servi-texto">{section.title}</Text>
          <Text className="text-sm leading-6 text-servi-suave">{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
