import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { AuthTextField } from '../../components/AuthTextField';
import { FadeInView } from '../../components/FadeInView';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../hooks/useAuth';
import {
  getEmailRules,
  getPasswordMatchRule,
  getPasswordRules,
  isEmailValid,
  isPasswordValid,
} from '../../lib/authValidation';
import { getHomeRouteForRole, getRoleDestinationHint, ROLES } from '../../lib/roles';
import type { UserRole } from '../../types/models';

const NOMBRE_RULES = (nombre: string) => [
  { id: 'name-min', label: 'Minimo 3 caracteres', met: nombre.trim().length >= 3 },
  { id: 'name-max', label: 'Maximo 80 caracteres', met: nombre.trim().length <= 80 },
  {
    id: 'name-letters',
    label: 'Solo letras y espacios',
    met: nombre.trim().length === 0 || /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim()),
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role] = useState<UserRole>('cliente');
  const [requestedRole, setRequestedRole] = useState<UserRole>('cliente');
  const [empresa, setEmpresa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRules = useMemo(() => getEmailRules(email), [email]);
  const passwordRules = useMemo(() => getPasswordRules(password), [password]);
  const matchRule = useMemo(
    () => getPasswordMatchRule(password, confirmPassword),
    [password, confirmPassword],
  );
  const nombreRules = useMemo(() => NOMBRE_RULES(nombre), [nombre]);

  const emailOk = isEmailValid(email);
  const passwordOk = isPasswordValid(password);
  const nombreOk = nombreRules.every((r) => r.met);
  const matchOk = matchRule.met;
  const formOk = nombreOk && emailOk && passwordOk && matchOk;

  const handleRegister = async () => {
    setError(null);

    if (!formOk) {
      setError('Revisa que todos los requisitos esten en verde.');
      return;
    }

    if ((role === 'cliente' || requestedRole === 'custodio') && !empresa.trim()) {
      setError(
        role === 'cliente'
          ? 'Los clientes deben indicar su empresa.'
          : 'Indica la empresa a la que perteneces como custodio.',
      );
      return;
    }

    setLoading(true);

    const { error: signUpError, role: savedRole, pendingConfirmation } = await signUp({
      email: email.trim(),
      password,
      nombre: nombre.trim(),
      role,
      requestedRole: requestedRole === 'cliente' ? null : requestedRole,
      empresa: role === 'cliente' || requestedRole === 'custodio' ? empresa.trim() : undefined,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    if (pendingConfirmation) {
      Alert.alert(
        'Cuenta creada',
        requestedRole === 'cliente'
          ? `Rol inicial: Cliente.\nConfirma tu correo si Supabase lo pide, luego inicia sesion y entraras a: ${getRoleDestinationHint('cliente')}`
          : `Rol inicial: Cliente.\nTu solicitud para ${ROLES.find((r) => r.value === requestedRole)?.label ?? requestedRole} quedo registrada y la revisara un super usuario.`,
        [{ text: 'Ir a login', onPress: () => router.replace('/auth/login') }],
      );
      return;
    }

    Alert.alert(
      'Bienvenido',
      `Entrando como ${ROLES.find((r) => r.value === (savedRole ?? role))?.label ?? role}.`,
    );
    router.replace(getHomeRouteForRole(savedRole ?? role));
  };

  return (
    <SafeAreaView className="flex-1 bg-servi-fondo" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable className="py-4" onPress={() => router.replace('/')}>
            <Text className="font-medium text-servi-acento">← Volver al inicio</Text>
          </Pressable>

          <FadeInView className="mb-6 items-center">
            <Logo size={64} />
            <Text className="mt-4 text-2xl font-bold text-servi-texto">Crear cuenta</Text>
            <Text className="mt-1 text-center text-sm text-servi-suave">
              Toda cuenta nueva inicia como Cliente. Si necesitas otro rol, solicitalo aqui.
            </Text>
          </FadeInView>

          <AuthTextField
            label="Nombre completo"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Juan Perez"
            autofillRole="name"
            delay={60}
            validationRules={nombreRules}
            validationTitle="Requisitos del nombre"
            showValidation
            isValid={nombreOk}
          />

          <AuthTextField
            label="Correo electronico"
            value={email}
            onChangeText={setEmail}
            placeholder="nombre@empresa.com"
            autofillRole="email"
            delay={120}
            validationRules={emailRules}
            validationTitle="Requisitos del correo"
            showValidation
            isValid={emailOk}
          />

          <Text className="mb-2 text-sm font-medium text-servi-suave">Solicitar acceso adicional</Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {ROLES.filter((option) => option.value !== 'cliente').map((option) => (
              <Pressable
                key={option.value}
                className={`rounded-xl border px-3 py-2.5 ${
                  requestedRole === option.value
                    ? 'border-servi-acento bg-servi-acento'
                    : 'border-servi-borde bg-servi-superficie'
                }`}
                onPress={() => setRequestedRole(option.value)}
              >
                <Text
                  className={`text-xs font-semibold ${
                    requestedRole === option.value ? 'text-servi-fondo' : 'text-servi-texto'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              className={`rounded-xl border px-3 py-2.5 ${
                requestedRole === 'cliente'
                  ? 'border-servi-acento bg-servi-acento'
                  : 'border-servi-borde bg-servi-superficie'
              }`}
              onPress={() => setRequestedRole('cliente')}
            >
              <Text
                className={`text-xs font-semibold ${
                  requestedRole === 'cliente' ? 'text-servi-fondo' : 'text-servi-texto'
                }`}
              >
                Sin solicitud
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <Text className="text-[10px] uppercase text-emerald-400">Pantalla al iniciar sesion</Text>
            <Text className="text-sm font-medium text-servi-texto">
              {getRoleDestinationHint(role)}
            </Text>
            <Text className="mt-1 text-xs text-servi-suave">
              {requestedRole === 'cliente'
                ? 'Tu cuenta se creara como Cliente.'
                : `Se enviara solicitud para ${ROLES.find((r) => r.value === requestedRole)?.label ?? requestedRole}.`}
            </Text>
          </View>

          {requestedRole !== 'cliente' ? (
            <View className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <Text className="text-xs font-semibold text-amber-300">
                Nota: mientras se aprueba tu solicitud, entraras como Cliente.
              </Text>
            </View>
          ) : null}

          {(role === 'cliente' || requestedRole === 'custodio') ? (
            <AuthTextField
              label={requestedRole === 'custodio' ? 'Empresa asignada' : 'Empresa'}
              value={empresa}
              onChangeText={setEmpresa}
              placeholder="Nombre de la empresa contratante"
              delay={150}
            />
          ) : null}

          <AuthTextField
            label="Contrasena"
            value={password}
            onChangeText={setPassword}
            placeholder="Crea una contrasena segura"
            autofillRole="newPassword"
            showToggle
            showPasswordRules
            showValidation
            delay={180}
          />

          <AuthTextField
            label="Confirmar contrasena"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repite la contrasena"
            autofillRole="confirmPassword"
            showToggle
            delay={240}
            validationRules={[matchRule]}
            validationTitle="Confirmacion"
            showValidation={confirmPassword.length > 0}
            isValid={matchOk}
          />

          {error ? (
            <View className="mb-4 rounded-xl border border-servi-peligro/40 bg-servi-peligro/10 px-3 py-2">
              <Text className="text-center text-sm text-servi-peligro">{error}</Text>
            </View>
          ) : null}

          <AppButton
            label="Crear cuenta"
            variant="accent"
            onPress={handleRegister}
            loading={loading}
            disabled={!formOk}
          />

          <Pressable className="mt-6 items-center py-2" onPress={() => router.replace('/auth/login')}>
            <Text className="text-servi-suave">
              Ya tienes cuenta?{' '}
              <Text className="font-semibold text-servi-acento">Inicia sesion</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
