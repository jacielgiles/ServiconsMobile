import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getRoleLabel } from '../lib/roles';
import { useAuth } from '../hooks/useAuth';
import { createRoleRequest, getMyPendingRoleRequest } from '../services/adminService';
import { AppButton } from './AppButton';
import { UserAvatar } from './UserAvatar';
import type { UserRole } from '../types/models';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileModal({ visible, onClose }: Props) {
  const { session, profile, updateProfile } = useAuth();
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestedRole, setRequestedRole] = useState<UserRole>('cliente');
  const [requestingRole, setRequestingRole] = useState(false);
  const [pendingRoleRequest, setPendingRoleRequest] = useState<{
    requested_role: UserRole;
    requested_at: string;
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setCelular(profile.celular ?? '');
      setEmpresa(profile.empresa ?? '');
    }
  }, [profile, visible]);

  useEffect(() => {
    if (!visible) return;

    getMyPendingRoleRequest().then(({ data }) => {
      if (data) {
        setPendingRoleRequest({
          requested_role: data.requested_role,
          requested_at: data.requested_at,
        });
      } else {
        setPendingRoleRequest(null);
      }
    });
  }, [visible, profile?.id]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Indica tu nombre completo.');
      return;
    }

    const updates: { nombre: string; celular: string | null; empresa?: string | null } = {
      nombre: nombre.trim(),
      celular: celular.trim() || null,
    };
    if (profile?.role === 'cliente') {
      updates.empresa = empresa.trim() || null;
    }

    setSaving(true);
    const { error } = await updateProfile(updates);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    onClose();
  };

  const handleRequestRole = async () => {
    if (requestedRole === 'cliente') {
      Alert.alert('Selecciona un rol', 'Elige Custodio, Admin o Super usuario para solicitar.');
      return;
    }

    if (requestedRole === profile?.role) {
      Alert.alert('Sin cambios', 'Ya cuentas con ese rol.');
      return;
    }

    if (requestedRole === 'custodio' && !empresa.trim()) {
      Alert.alert('Empresa requerida', 'Para solicitar Custodio, indica tu empresa.');
      return;
    }

    setRequestingRole(true);
    const { error } = await createRoleRequest({
      requestedRole,
      empresa: empresa.trim() || null,
    });
    setRequestingRole(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert(
      'Solicitud enviada',
      `Se envio tu solicitud para ${getRoleLabel(requestedRole)}. Mientras tanto seguiras con tu rol actual.`,
    );
    setPendingRoleRequest({
      requested_role: requestedRole,
      requested_at: new Date().toISOString(),
    });
    setRequestedRole('cliente');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl bg-servi-fondo">
          <View className="items-center py-3">
            <View className="h-1 w-12 rounded-full bg-servi-borde" />
          </View>

          <ScrollView className="px-6" keyboardShouldPersistTaps="handled">
            <View className="mb-6 items-center">
              <UserAvatar size={72} />
              <Text className="mt-4 text-xl font-bold text-servi-texto">Mi informacion</Text>
              <Text className="text-sm text-servi-suave">{getRoleLabel(profile?.role)}</Text>
            </View>

            <ProfileField label="Correo" value={session?.user?.email ?? '—'} editable={false} />
            <ProfileField label="Nombre completo" value={nombre} onChangeText={setNombre} />
            <ProfileField
              label="Telefono"
              value={celular}
              onChangeText={setCelular}
              keyboardType="phone-pad"
              placeholder="Opcional"
            />

            {profile?.role === 'cliente' ? (
              <ProfileField
                label="Empresa"
                value={empresa}
                onChangeText={setEmpresa}
                placeholder="Nombre de tu empresa"
              />
            ) : null}

            <View className="mb-4 rounded-xl border border-servi-borde bg-servi-superficie px-4 py-3">
              <Text className="text-xs text-servi-suave">Rol de acceso</Text>
              <Text className="mt-1 text-base text-servi-texto">{getRoleLabel(profile?.role)}</Text>
            </View>

            <View className="mb-4 rounded-xl border border-servi-borde bg-servi-superficie px-4 py-3">
              <Text className="text-xs text-servi-suave">Solicitar cambio de rol</Text>
              {pendingRoleRequest ? (
                <View className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  <Text className="text-sm font-semibold text-amber-300">Solicitud en revision</Text>
                  <Text className="mt-1 text-xs text-servi-suave">
                    Pediste {getRoleLabel(pendingRoleRequest.requested_role)}. Un super usuario debe
                    aprobarla antes de enviar otra.
                  </Text>
                </View>
              ) : (
                <>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {(['custodio', 'jefe_custodios', 'super_usuario'] as UserRole[]).map((roleOption) => (
                      <Pressable
                        key={roleOption}
                        className={`rounded-lg border px-3 py-2 ${
                          requestedRole === roleOption
                            ? 'border-servi-acento bg-servi-acento/20'
                            : 'border-servi-borde bg-servi-fondo'
                        }`}
                        onPress={() => setRequestedRole(roleOption)}
                      >
                        <Text className="text-xs font-semibold text-servi-texto">
                          {getRoleLabel(roleOption)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text className="mt-2 text-xs text-servi-suave">
                    Tu solicitud la revisa un super usuario. Mientras tanto, conservas tu rol actual.
                  </Text>
                  <View className="mt-3">
                    <AppButton
                      label="Enviar solicitud de rol"
                      variant="outline"
                      onPress={handleRequestRole}
                      loading={requestingRole}
                    />
                  </View>
                </>
              )}
            </View>

            <AppButton label="Guardar cambios" variant="accent" onPress={handleSave} loading={saving} />

            <Pressable className="mb-8 mt-4 items-center py-3" onPress={onClose}>
              <Text className="text-servi-suave">Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProfileField({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  keyboardType?: 'phone-pad';
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-servi-suave">{label}</Text>
      {editable ? (
        <TextInput
          className="rounded-xl border border-servi-borde bg-servi-superficie px-4 py-3 text-base text-servi-texto"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#A7C4B5"
        />
      ) : (
        <View className="rounded-xl border border-servi-borde bg-servi-fondo px-4 py-3">
          <Text className="text-base text-servi-suave">{value}</Text>
        </View>
      )}
    </View>
  );
}
