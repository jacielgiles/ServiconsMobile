import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { AutofillTextInput, LoginAutofillForm } from '../../components/AutofillTextInput';
import { FadeInView } from '../../components/FadeInView';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../lib/roles';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa correo y contrasena.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError, role } = await signIn(email.trim(), password);

    setLoading(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    if (role) {
      router.replace(getHomeRouteForRole(role));
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo arriba para enviar el enlace de recuperacion.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error: resetError } = await resetPassword(email.trim());
    setLoading(false);

    if (resetError) {
      setError(resetError);
      return;
    }

    Alert.alert(
      'Correo enviado',
      'Revisa tu bandeja (y spam). Abre el enlace para establecer una nueva contrasena.',
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable className="mb-4 py-2" onPress={() => router.replace('/')}>
            <Text className="text-servi-acento">← Volver al inicio</Text>
          </Pressable>

          <FadeInView className="mb-8 items-center">
            <Logo size={72} />
            <Text className="mt-6 text-3xl font-bold text-servi-texto">Iniciar sesion</Text>
            <Text className="mt-2 text-center text-servi-suave">Accede a Servicons Mobile</Text>
            <Text className="mt-3 text-center text-xs leading-5 text-servi-suave">
              Entras a la pantalla de tu nivel: Super usuario, Jefe de custodias, Custodio o Cliente.
            </Text>
          </FadeInView>

          <LoginAutofillForm>
            <View className="mb-4">
              <Text className="mb-1.5 text-sm text-servi-suave">Correo electronico</Text>
              <AutofillTextInput
                className="rounded-xl border border-servi-borde bg-servi-superficie px-4 py-3.5 text-base text-servi-texto"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor="#A7C4B5"
                returnKeyType="next"
                autoFocus={false}
                autofillRole="loginIdentifier"
                nativeID="login-email"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1.5 text-sm text-servi-suave">Contrasena</Text>
              <View className="flex-row items-center rounded-xl border border-servi-borde bg-servi-superficie">
                <AutofillTextInput
                  ref={passwordRef}
                  className="flex-1 px-4 py-3.5 text-base text-servi-texto"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="********"
                  placeholderTextColor="#A7C4B5"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  autofillRole="password"
                  nativeID="login-password"
                />
                <Pressable className="px-4 py-3" onPress={() => setShowPassword((v) => !v)}>
                  <Text className="text-sm text-servi-acento">{showPassword ? 'Ocultar' : 'Ver'}</Text>
                </Pressable>
              </View>
            </View>
          </LoginAutofillForm>

          {error ? (
            <View className="mb-4 rounded-xl border border-servi-peligro/30 bg-servi-peligro/10 px-3 py-2">
              <Text className="text-center text-sm text-servi-peligro">{error}</Text>
            </View>
          ) : null}

          <AppButton label="Iniciar sesion" variant="accent" onPress={handleLogin} loading={loading} />

          <Pressable className="mt-3 items-center py-2" onPress={handleForgotPassword} disabled={loading}>
            <Text className="text-sm text-servi-acento">Olvidaste tu contrasena?</Text>
          </Pressable>

          <Pressable
            className="mt-4 items-center rounded-xl border border-servi-borde py-3"
            onPress={() => router.push('/auth/register')}
          >
            <Text className="text-servi-texto">
              ¿No tienes cuenta? <Text className="font-bold text-servi-acento">Crear cuenta</Text>
            </Text>
          </Pressable>

          <Pressable className="mt-3 items-center py-2" onPress={() => router.push('/legal/privacidad')}>
            <Text className="text-xs text-servi-suave">Politica de privacidad</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
