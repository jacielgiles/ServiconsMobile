import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '../lib/supabaseClient';
import type { UserProfile, UserRole } from '../types/models';

type SignUpParams = {
  email: string;
  password: string;
  nombre: string;
  role: UserRole;
  empresa?: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{
    error: string | null;
    role?: UserRole;
    pendingConfirmation?: boolean;
  }>;
  signOut: () => Promise<void>;
  updateProfile: (data: {
    nombre?: string;
    celular?: string | null;
    empresa?: string | null;
  }) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const data = await fetchProfile(userId);
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
          return { error: 'Correo o contrasena incorrectos.' };
        }
        if (msg.includes('email not confirmed')) {
          return {
            error:
              'Debes confirmar tu correo primero. Revisa tu bandeja o desactiva Confirm email en Supabase.',
          };
        }
        return { error: error.message };
      }

      if (!data.user) return { error: 'No se pudo iniciar sesion.' };

      const userProfile = await loadProfile(data.user.id);

      if (!userProfile) {
        await supabase.auth.signOut();
        return {
          error:
            'Tu cuenta existe pero no tiene perfil. Contacta al administrador o registrate de nuevo.',
        };
      }

      if (userProfile.activo === false) {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        return { error: 'Tu cuenta esta desactivada. Contacta al administrador.' };
      }

      if (data.session) setSession(data.session);
      return { error: null };
    },
    [loadProfile],
  );

  const signUp = useCallback(
    async ({ email, password, nombre, role, empresa }: SignUpParams) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            role,
            empresa: empresa?.trim() ?? '',
          },
        },
      });

      if (error) return { error: error.message };
      if (!data.user) return { error: 'No se pudo crear la cuenta.' };

      // El trigger handle_new_user crea el perfil (SECURITY DEFINER, sin RLS).
      // Solo upsert desde la app si hay sesion activa; sin sesion RLS lo bloquea.
      if (data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre: nombre.trim(),
          email: email.trim(),
          role,
          empresa:
            role === 'cliente' || role === 'custodio' ? empresa?.trim() ?? null : null,
        });

        if (profileError) {
          return { error: `Cuenta creada pero fallo el perfil: ${profileError.message}` };
        }

        setSession(data.session);
        await loadProfile(data.user.id);
        return { error: null, role };
      }

      return {
        error: null,
        role,
        pendingConfirmation: true,
      };
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (data: { nombre?: string; celular?: string | null; empresa?: string | null }) => {
      if (!session?.user) return { error: 'Sesion no activa' };

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', session.user.id);

      if (error) return { error: error.message };
      await loadProfile(session.user.id);
      return { error: null };
    },
    [session?.user, loadProfile],
  );

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo = Linking.createURL('/auth/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (newPassword.length < 8) {
      return { error: 'La contrasena debe tener al menos 8 caracteres.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut, updateProfile, resetPassword, updatePassword }),
    [session, profile, loading, signIn, signUp, signOut, updateProfile, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
