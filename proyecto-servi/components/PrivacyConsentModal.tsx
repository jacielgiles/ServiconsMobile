import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { acceptPrivacyPolicy } from '../lib/privacyConsent';
import { PRIVACY_POLICY_SECTIONS } from '../lib/privacyPolicy';
import { AppButton } from './AppButton';

type Props = {
  visible: boolean;
  onAccepted: () => void;
};

export function PrivacyConsentModal({ visible, onAccepted }: Props) {
  const router = useRouter();

  const handleAccept = async () => {
    await acceptPrivacyPolicy();
    onAccepted();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-servi-fondo">
        <View className="border-b border-servi-borde bg-emerald-900 px-5 pb-4 pt-12">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700">
              <Ionicons name="shield-checkmark" size={26} color="#D1FAE5" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Politica de privacidad</Text>
              <Text className="text-sm text-emerald-200">Debes aceptar para usar Servicons</Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 20 }}>
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <View key={section.title} className="mb-5">
              <Text className="mb-2 text-base font-bold text-servi-texto">{section.title}</Text>
              <Text className="text-sm leading-6 text-servi-suave">{section.body}</Text>
            </View>
          ))}

          <Pressable
            className="mb-4 items-center py-2"
            onPress={() => router.push('/legal/privacidad')}
          >
            <Text className="text-sm text-servi-acento">Ver politica completa en pantalla dedicada</Text>
          </Pressable>
        </ScrollView>

        <View className="border-t border-servi-borde px-5 py-4">
          <AppButton label="Acepto la politica de privacidad" variant="accent" onPress={handleAccept} />
          <Text className="mt-3 text-center text-xs text-servi-suave">
            Al continuar autorizas el uso de GPS, camara y datos descritos arriba.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
