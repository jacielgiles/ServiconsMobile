import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { DashboardShell } from '../../components/DashboardShell';
import { PrivacyPolicyScreen } from '../../components/PrivacyPolicyScreen';

/** Politica de privacidad — desde menu de la app */
export default function AppPrivacyScreen() {
  const router = useRouter();

  return (
    <DashboardShell title="Privacidad y uso">
      <Pressable className="mb-3 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">← Volver</Text>
      </Pressable>
      <PrivacyPolicyScreen />
    </DashboardShell>
  );
}
