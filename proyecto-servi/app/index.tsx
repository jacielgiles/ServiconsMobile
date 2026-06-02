import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeInView } from '../components/FadeInView';
import { Logo } from '../components/Logo';
import { PrivacyConsentModal } from '../components/PrivacyConsentModal';
import { hasAcceptedPrivacyPolicy } from '../lib/privacyConsent';

const features = [
  { icon: 'map' as const, title: 'Mapa GPS', desc: 'Ubicacion en tiempo real en cada reporte' },
  { icon: 'camera' as const, title: 'Evidencias', desc: 'Fotos georreferenciadas cada X minutos' },
  { icon: 'warning' as const, title: 'SOS', desc: 'Alerta de emergencia con un toque' },
  { icon: 'document-text' as const, title: 'Bitacoras', desc: 'Wizard completo y cierre con firmas' },
];

const roles = [
  { name: 'Super usuario', color: '#F97316' },
  { name: 'Jefe de custodias', color: '#FB923C' },
  { name: 'Custodio', color: '#22C55E' },
  { name: 'Cliente', color: '#0EA5E9' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [privacyReady, setPrivacyReady] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    hasAcceptedPrivacyPolicy().then((accepted) => {
      setShowPrivacy(!accepted);
      setPrivacyReady(true);
    });
  }, []);

  if (!privacyReady) return null;

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView className="items-center pt-4">
          <Logo size={80} />
          <Text className="mb-1 mt-5 text-center text-3xl font-bold text-servi-texto">
            Servicons Mobile
          </Text>
          <Text className="text-center text-base text-servi-suave">
            Monitoreo profesional de custodias en campo
          </Text>
        </FadeInView>

        <View className="my-6 gap-2.5">
          {features.map((f, i) => (
            <FadeInView key={f.title} delay={80 + i * 70}>
              <View className="flex-row items-center rounded-2xl border border-servi-borde bg-servi-superficie p-3.5">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-servi-acento/20">
                  <Ionicons name={f.icon} size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-servi-texto">{f.title}</Text>
                  <Text className="text-xs text-servi-suave">{f.desc}</Text>
                </View>
              </View>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={420}>
          <View className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <Text className="mb-2 text-center text-xs font-semibold uppercase text-emerald-300">
              Un portal por rol
            </Text>
            <View className="flex-row flex-wrap justify-center gap-2">
              {roles.map((r) => (
                <View
                  key={r.name}
                  className="rounded-full border border-servi-borde/60 bg-servi-fondo/60 px-3 py-1"
                >
                  <Text className="text-[11px] font-semibold" style={{ color: r.color }}>
                    {r.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </FadeInView>
      </ScrollView>

      <FadeInView delay={500} className="border-t border-servi-borde/50 bg-servi-fondo px-6 pb-6 pt-5">
        <AppButton label="Iniciar sesion" variant="accent" onPress={() => router.push('/auth/login')} />
        <View className="my-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-servi-borde" />
          <Text className="text-xs uppercase text-servi-suave">o</Text>
          <View className="h-px flex-1 bg-servi-borde" />
        </View>
        <AppButton
          label="Crear cuenta nueva"
          variant="outline"
          onPress={() => router.push('/auth/register')}
        />
        <AnimatedPressable
          className="mt-5 items-center py-2"
          onPress={() => router.push('/legal/privacidad')}
        >
          <Text className="text-xs text-servi-suave">Politica de privacidad y uso de datos</Text>
        </AnimatedPressable>
      </FadeInView>

      <PrivacyConsentModal visible={showPrivacy} onAccepted={() => setShowPrivacy(false)} />
    </SafeAreaView>
  );
}
