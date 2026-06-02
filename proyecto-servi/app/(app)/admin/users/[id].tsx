import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '../../../../components/AppButton';
import { DashboardShell } from '../../../../components/DashboardShell';
import { useAuth } from '../../../../hooks/useAuth';
import { getCreatableRoleOptions, getRoleLabel } from '../../../../lib/roles';
import {
  getManagedProfile,
  updateProfileFieldsAsAdmin,
  updateUserAsAdmin,
} from '../../../../services/adminService';
import type { UserRole } from '../../../../types/models';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile: actor } = useAuth();
  const roleOptions = getCreatableRoleOptions(actor?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [role, setRole] = useState<UserRole>('custodio');
  const [activo, setActivo] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [userId, setUserId] = useState('');
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: loadError } = await getManagedProfile(id);
    if (loadError || !data) {
      setError(loadError ?? 'Usuario no encontrado');
      setLoading(false);
      return;
    }

    setUserId(data.id);
    setNombre(data.nombre);
    setEmail(data.email ?? '');
    setCelular(data.celular ?? '');
    setEmpresa(data.empresa ?? '');
    setRole(data.role);
    setActivo(data.activo !== false);
    setCreatedAt(data.created_at);
    setIsSuperUser(data.role === 'super_usuario');
    setIsSelf(data.id === actor?.id);
    setError(null);
    setLoading(false);
  }, [id, actor?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!userId || isSuperUser) return;

    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }

    if (role === 'cliente' && !empresa.trim()) {
      Alert.alert('Error', 'Los clientes requieren empresa.');
      return;
    }

    if (role === 'custodio' && !empresa.trim()) {
      Alert.alert('Error', 'Asigna la empresa del custodio.');
      return;
    }

    setSaving(true);

    const { error: fieldsError } = await updateProfileFieldsAsAdmin(userId, {
      nombre: nombre.trim(),
      celular: celular.trim() || null,
      empresa: empresa.trim() || null,
    });

    if (fieldsError) {
      setSaving(false);
      Alert.alert('Error', fieldsError);
      return;
    }

    const { error: adminError } = await updateUserAsAdmin({
      userId,
      role: isSelf ? undefined : role,
      activo: isSelf ? undefined : activo,
      empresa: empresa.trim() || null,
      email: email.trim() !== '' ? email.trim() : undefined,
      newPassword: newPassword.trim() || undefined,
    });

    setSaving(false);

    if (adminError) {
      Alert.alert('Error parcial', adminError);
      load();
      return;
    }

    Alert.alert('Guardado', 'Usuario actualizado correctamente.');
    setNewPassword('');
    load();
  };

  return (
    <DashboardShell title="Detalle de usuario">
      <Pressable className="mb-3 py-1" onPress={() => router.back()}>
        <Text className="text-servi-acento">← Volver a usuarios</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <Text className="text-servi-peligro">{error}</Text>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View className="mb-4 rounded-2xl border border-servi-borde bg-servi-superficie p-4">
              <Text className="text-xs uppercase text-servi-suave">ID de cuenta</Text>
              <Text className="font-mono text-xs text-servi-texto">{userId}</Text>
              <Text className="mt-2 text-xs text-servi-suave">
                Registrado: {new Date(createdAt).toLocaleString()}
              </Text>
              {isSuperUser ? (
                <Text className="mt-2 text-sm text-amber-400">Super usuario — solo lectura</Text>
              ) : null}
            </View>

            <Field label="Nombre completo" value={nombre} onChangeText={setNombre} editable={!isSuperUser} />
            <Field
              label="Correo electronico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSuperUser}
            />
            <Field label="Celular" value={celular} onChangeText={setCelular} editable={!isSuperUser} />
            <Field
              label={
                role === 'custodio'
                  ? 'Empresa asignada (custodio)'
                  : role === 'cliente'
                    ? 'Empresa del cliente'
                    : 'Empresa (opcional)'
              }
              value={empresa}
              onChangeText={setEmpresa}
              editable={!isSuperUser}
              placeholder={role === 'custodio' ? 'Ej. Transportes ABC' : undefined}
            />
            {role === 'custodio' ? (
              <Text className="-mt-2 mb-4 text-xs text-servi-suave">
                Super usuario / Jefe asigna a que empresa contratante pertenece este custodio.
              </Text>
            ) : null}

            {!isSuperUser ? (
              <>
                <Text className="mb-2 text-sm text-servi-suave">Rol</Text>
                <View className="mb-4 flex-row flex-wrap gap-2">
                  {roleOptions.map((item) => (
                    <Pressable
                      key={item.value}
                      disabled={isSelf}
                      className={`rounded-lg border px-3 py-2 ${
                        role === item.value
                          ? 'border-servi-acento bg-servi-acento/20'
                          : 'border-servi-borde bg-servi-fondo'
                      } ${isSelf ? 'opacity-50' : ''}`}
                      onPress={() => setRole(item.value)}
                    >
                      <Text className="text-xs font-semibold text-servi-texto">{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="mb-1 text-sm text-servi-suave">Rol actual: {getRoleLabel(role)}</Text>

                {!isSelf ? (
                  <Pressable
                    className="mb-4 self-start rounded-lg border border-servi-borde px-4 py-2"
                    onPress={() => setActivo((v) => !v)}
                  >
                    <Text className="text-sm font-semibold text-servi-texto">
                      Cuenta {activo ? 'activa' : 'desactivada'} — tocar para cambiar
                    </Text>
                  </Pressable>
                ) : null}

                <Field
                  label="Nueva contrasena (opcional)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Dejar vacio para no cambiar"
                />

                <AppButton label="Guardar cambios" variant="accent" onPress={handleSave} loading={saving} />
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </DashboardShell>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  editable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none';
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm text-servi-suave">{label}</Text>
      <TextInput
        className={`rounded-xl border border-servi-borde px-4 py-3 text-servi-texto ${
          editable ? 'bg-servi-fondo' : 'bg-servi-borde/30'
        }`}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
      />
    </View>
  );
}
