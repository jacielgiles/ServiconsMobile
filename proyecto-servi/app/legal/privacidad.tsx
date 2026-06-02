import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrivacyPolicyScreen } from '../../components/PrivacyPolicyScreen';

/** Politica de privacidad — accesible sin sesion (welcome / registro) */
export default function LegalPrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="py-1">
          <Text className="text-servi-acento">← Volver</Text>
        </Pressable>
      </View>
      <View className="flex-1 px-4">
        <PrivacyPolicyScreen />
      </View>
    </SafeAreaView>
  );
}
