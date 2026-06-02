import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (title: string, message?: string, tone?: ToastTone) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<
  ToastTone,
  { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  success: { bg: 'bg-emerald-900', border: 'border-emerald-400', icon: 'checkmark-circle', color: '#34D399' },
  error: { bg: 'bg-red-900', border: 'border-red-400', icon: 'close-circle', color: '#F87171' },
  warning: { bg: 'bg-amber-900', border: 'border-amber-300', icon: 'warning', color: '#FBBF24' },
  info: { bg: 'bg-sky-900', border: 'border-sky-400', icon: 'information-circle', color: '#38BDF8' },
};

const TOAST_DURATION_MS = 5500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useMemo(() => ({ n: 0 }), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, message?: string, tone: ToastTone = 'info') => {
      counter.n += 1;
      const id = counter.n;
      setToasts((prev) => [{ id, title, message, tone }, ...prev].slice(0, 2));
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [counter, dismiss],
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (title: string, message?: string) => showToast(title, message, 'success'),
      error: (title: string, message?: string) => showToast(title, message, 'error'),
      warning: (title: string, message?: string) => showToast(title, message, 'warning'),
      info: (title: string, message?: string) => showToast(title, message, 'info'),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 z-[9999] px-4"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 72 }}
      >
        {toasts.map((toast) => {
          const t = toneStyles[toast.tone];
          return (
            <Animated.View
              key={toast.id}
              entering={FadeInUp.duration(320).springify()}
              exiting={FadeOutDown.duration(220)}
              className={`mb-3 overflow-hidden rounded-2xl border-2 ${t.border} ${t.bg}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 12,
              }}
            >
              <Pressable className="flex-row items-center px-5 py-4" onPress={() => dismiss(toast.id)}>
                <View
                  className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${t.color}22` }}
                >
                  <Ionicons name={t.icon} size={28} color={t.color} />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-white">{toast.title}</Text>
                  {toast.message ? (
                    <Text className="mt-1 text-sm leading-5 text-gray-200">{toast.message}</Text>
                  ) : null}
                </View>
                <Ionicons name="close" size={20} color="#CBD5E1" />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return ctx;
}
