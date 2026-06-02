import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../hooks/useAuth';
import { getDashboardTitleForRole, getRoleLabel } from '../lib/roles';
import type { UserRole } from '../types/models';
import { ProfileModal } from './ProfileModal';
import { UserAvatar } from './UserAvatar';

type Props = {
  title?: string;
  role?: UserRole | null;
};

export function DashboardHeader({ title, role: roleProp }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const role = roleProp ?? profile?.role;
  const headerTitle = title ?? getDashboardTitleForRole(role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navigate = (path: string) => {
    closeMenu();
    router.push(path as never);
  };

  return (
    <>
      <View
        className="relative bg-emerald-800 px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            {getRoleLabel(role)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Pressable
            className="active:opacity-70"
            onPress={() => setProfileOpen(true)}
            accessibilityLabel="Ver mi perfil"
          >
            <UserAvatar size={36} />
          </Pressable>

          <Text className="ml-3 flex-1 text-base font-semibold text-white" numberOfLines={1}>
            {headerTitle}
          </Text>

          <Pressable
            className="p-2 active:opacity-60"
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Abrir menu"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#D1FAE5" />
          </Pressable>
        </View>

        <View className="mt-3 h-px bg-servi-borde/40" />

        {menuOpen ? (
          <Pressable className="absolute inset-0 z-10" onPress={closeMenu} />
        ) : null}

        {menuOpen ? (
          <View className="absolute right-3 z-20 mt-14 min-w-[210px] overflow-hidden rounded-xl border border-servi-borde bg-servi-superficie">
            {role === 'custodio' ? (
              <>
                <MenuItem
                  icon="list-outline"
                  label="Mis servicios"
                  onPress={() => navigate('/(app)/home')}
                />
                <MenuItem
                  icon="time-outline"
                  label="Procesos pendientes"
                  onPress={() => {
                    closeMenu();
                    router.push({ pathname: '/(app)/home', params: { filtro: 'pendiente' } });
                  }}
                />
              </>
            ) : null}
            {role === 'cliente' ? (
              <MenuItem
                icon="business-outline"
                label="Portal cliente"
                onPress={() => navigate('/(app)/cliente/home')}
              />
            ) : null}
            {(role === 'super_usuario' || role === 'jefe_custodios') && (
              <>
                <MenuItem
                  icon="grid-outline"
                  label="Panel admin"
                  onPress={() => navigate('/(app)/admin/home')}
                />
                <MenuItem
                  icon="people-outline"
                  label="Gestion de usuarios"
                  onPress={() => navigate('/(app)/admin/users')}
                />
              </>
            )}
            <View className="h-px bg-servi-borde/50" />
            <MenuItem
              icon="person-outline"
              label="Mi informacion"
              onPress={() => {
                closeMenu();
                setProfileOpen(true);
              }}
            />
            <View className="h-px bg-servi-borde/50" />
            {(role === 'super_usuario' || role === 'jefe_custodios') ? (
              <MenuItem
                icon="document-text-outline"
                label="Bitacoras"
                onPress={() => navigate('/(app)/admin/bitacoras')}
              />
            ) : null}
            <MenuItem
              icon="shield-outline"
              label="Privacidad"
              onPress={() => navigate('/(app)/privacidad')}
            />
            <View className="h-px bg-servi-borde/50" />
            <MenuItem
              icon="log-out-outline"
              label="Cerrar sesion"
              onPress={() => {
                closeMenu();
                Alert.alert('Cerrar sesion', 'Deseas salir de tu cuenta?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Salir', style: 'destructive', onPress: () => signOut() },
                ]);
              }}
              danger
            />
          </View>
        ) : null}
      </View>

      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 active:bg-servi-fondo"
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={danger ? '#DC2626' : '#A7C4B5'} />
      <Text className={`text-sm ${danger ? 'text-servi-peligro' : 'text-servi-texto'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MenuCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress?: () => void;
}) {
  const interactive = Boolean(onPress);

  return (
    <Pressable
      className={`mb-3 flex-row items-center rounded-2xl border border-servi-borde bg-servi-superficie p-4 ${
        interactive ? 'active:opacity-90' : 'opacity-70'
      }`}
      onPress={onPress}
      disabled={!onPress}
    >
      {icon ? (
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-servi-fondo">
          <Ionicons name={icon} size={22} color="#F97316" />
        </View>
      ) : null}

      <View className="flex-1">
        <Text className="text-base font-semibold text-servi-texto">{title}</Text>
        <Text className="mt-0.5 text-sm text-servi-suave">{description}</Text>
      </View>

      {interactive ? (
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      ) : (
        <View className="rounded-full bg-servi-fondo px-2 py-0.5">
          <Text className="text-[10px] text-servi-suave">Pronto</Text>
        </View>
      )}
    </Pressable>
  );
}

export function DashboardShell({
  title,
  role,
  children,
}: {
  title?: string;
  role?: UserRole | null;
  children: ReactNode;
}) {
  return (
    <View className="flex-1 bg-servi-fondo">
      <DashboardHeader title={title} role={role} />
      <View className="flex-1 px-4 pt-3">{children}</View>
    </View>
  );
}
