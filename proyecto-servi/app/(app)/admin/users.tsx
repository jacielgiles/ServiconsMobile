import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { AppButton } from '../../../components/AppButton';
import { DashboardHeader } from '../../../components/DashboardShell';
import { useAuth } from '../../../hooks/useAuth';
import { getCreatableRoleOptions, getRoleLabel } from '../../../lib/roles';
import {
  createUserAsAdmin,
  listManagedProfiles,
  listRoleRequests,
  resolveRoleRequest,
  type RoleRequestRow,
} from '../../../services/adminService';
import type { UserRole } from '../../../types/models';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const roleOptions = getCreatableRoleOptions(profile?.role);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [role, setRole] = useState<UserRole>(roleOptions[0]?.value ?? 'custodio');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RoleRequestRow[]>([]);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      nombre: string;
      email: string | null;
      role: UserRole;
      empresa: string | null;
      activo: boolean | null;
    }>
  >([]);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    const [{ data, error: listError }, { data: pendingRequests }] = await Promise.all([
      listManagedProfiles(),
      profile?.role === 'super_usuario'
        ? listRoleRequests()
        : Promise.resolve({ data: [], error: null }),
    ]);
    setUsers(data);
    setRequests(pendingRequests);
    if (listError) setError(listError);
    setListLoading(false);
  }, [profile?.role]);

  const handleResolveRequest = async (item: RoleRequestRow, approve: boolean) => {
    const { error: resolveError } = await resolveRoleRequest({
      requestId: item.id,
      userId: item.user_id,
      requestedRole: item.requested_role,
      approve,
    });

    if (resolveError) {
      Alert.alert('Error', resolveError);
      return;
    }

    Alert.alert('Listo', approve ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
    loadUsers();
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  const resetForm = () => {
    setNombre('');
    setEmail('');
    setPassword('');
    setEmpresa('');
    setRole(roleOptions[0]?.value ?? 'custodio');
    setError(null);
  };

  const handleCreate = async () => {
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Completa nombre, correo y contrasena');
      return;
    }

    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }

    if (role === 'cliente' && !empresa.trim()) {
      setError('Indica la empresa del cliente');
      return;
    }

    if (role === 'custodio' && !empresa.trim()) {
      setError('Asigna la empresa a la que pertenece el custodio');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: createError } = await createUserAsAdmin({
      email: email.trim(),
      password,
      nombre: nombre.trim(),
      role,
      empresa:
        role === 'cliente' || role === 'custodio' ? empresa.trim() : empresa.trim() || undefined,
    });

    setLoading(false);

    if (createError) {
      setError(createError);
      return;
    }

    Alert.alert('Usuario creado', 'El nuevo usuario ya puede iniciar sesion.');
    resetForm();
    setShowCreateForm(false);
    loadUsers();
  };

  return (
    <View className="flex-1 bg-servi-fondo">
      <DashboardHeader title="Gestion de usuarios" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-4 pt-2" keyboardShouldPersistTaps="handled">
          <Pressable className="mb-4 py-2" onPress={() => router.back()}>
            <Text className="font-medium text-servi-acento">Volver al panel</Text>
          </Pressable>

          {!showCreateForm ? (
            <AppButton
              label="+ Nuevo usuario"
              variant="accent"
              onPress={() => setShowCreateForm(true)}
            />
          ) : (
            <View className="mb-6 rounded-xl border border-servi-borde bg-servi-superficie p-4">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-servi-texto">Crear usuario</Text>
                <Pressable onPress={() => { setShowCreateForm(false); resetForm(); }}>
                  <Text className="text-sm text-servi-suave">Cancelar</Text>
                </Pressable>
              </View>

              <Text className="mb-2 text-sm text-servi-suave">Rol a asignar</Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {roleOptions.map((item) => (
                  <Pressable
                    key={item.value}
                    className={`rounded-lg border px-3 py-2 ${
                      role === item.value
                        ? 'border-servi-acento bg-servi-acento'
                        : 'border-servi-borde bg-servi-fondo'
                    }`}
                    onPress={() => setRole(item.value)}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        role === item.value ? 'text-servi-fondo' : 'text-servi-texto'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field label="Nombre completo" value={nombre} onChangeText={setNombre} />
              <Field
                label="Correo"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {(role === 'cliente' || role === 'custodio') ? (
                <Field
                  label={role === 'custodio' ? 'Empresa asignada al custodio' : 'Empresa del cliente'}
                  value={empresa}
                  onChangeText={setEmpresa}
                />
              ) : null}

              {role === 'custodio' ? (
                <Text className="-mt-2 mb-4 text-xs text-servi-suave">
                  El custodio operara servicios vinculados a esta empresa contratante.
                </Text>
              ) : null}

              <Field
                label="Contrasena temporal"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? <Text className="mb-3 text-sm text-servi-peligro">{error}</Text> : null}

              <AppButton label="Crear usuario" variant="primary" onPress={handleCreate} loading={loading} />
            </View>
          )}

          <Text className="mb-3 mt-6 text-lg font-semibold text-servi-texto">Usuarios registrados</Text>

          {profile?.role === 'super_usuario' ? (
            <View className="mb-6 rounded-xl border border-servi-borde bg-servi-superficie p-4">
              <Text className="mb-2 text-base font-semibold text-servi-texto">Solicitudes de rol</Text>
              {requests.length === 0 ? (
                <Text className="text-sm text-servi-suave">No hay solicitudes pendientes.</Text>
              ) : (
                requests.map((item) => (
                  <View key={item.id} className="mb-3 rounded-lg border border-servi-borde bg-servi-fondo p-3">
                    <Text className="font-semibold text-servi-texto">
                      {item.requested_by_name ?? 'Usuario'} solicita {getRoleLabel(item.requested_role)}
                    </Text>
                    <Text className="text-xs text-servi-suave">
                      {item.requested_by_email ?? ''} {item.empresa ? `· ${item.empresa}` : ''}
                    </Text>
                    <View className="mt-2 flex-row gap-2">
                      <Pressable
                        className="flex-1 items-center rounded-lg bg-emerald-600 py-2"
                        onPress={() => handleResolveRequest(item, true)}
                      >
                        <Text className="text-xs font-semibold text-white">Aprobar</Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 items-center rounded-lg bg-servi-peligro py-2"
                        onPress={() => handleResolveRequest(item, false)}
                      >
                        <Text className="text-xs font-semibold text-white">Rechazar</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {listLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : users.length === 0 ? (
            <Text className="text-servi-suave">No hay usuarios visibles.</Text>
          ) : (
            users.map((user) => (
              <Pressable
                key={user.id}
                className="mb-3 rounded-xl border border-servi-borde bg-servi-superficie p-4 active:opacity-90"
                onPress={() => router.push(`/(app)/admin/users/${user.id}`)}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-servi-texto">{user.nombre}</Text>
                    <Text className="text-sm text-servi-suave">{user.email}</Text>
                    <Text className="mt-1 text-xs text-servi-acento">
                      {getRoleLabel(user.role)}
                      {user.empresa ? ` · ${user.empresa}` : ''}
                    </Text>
                    {user.activo === false ? (
                      <Text className="mt-1 text-xs text-servi-peligro">Cuenta desactivada</Text>
                    ) : null}
                  </View>

                  <Text className="text-xs text-servi-suave">Ver todo →</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none';
}) {
  return (
    <>
      <Text className="mb-1 text-sm text-servi-suave">{label}</Text>
      <TextInput
        className="mb-4 rounded-xl border border-servi-borde bg-servi-fondo px-4 py-3 text-servi-texto"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#A7C4B5"
      />
    </>
  );
}
