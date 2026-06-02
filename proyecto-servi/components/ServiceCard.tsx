import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { BitacoraResumen } from '../types/models';
import { AnimatedPressable } from './AnimatedPressable';
import { FadeInView } from './FadeInView';

const estadoConfig: Record<
  string,
  { bg: string; borderColor: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pendiente: {
    bg: 'bg-amber-600',
    borderColor: '#FBBF24',
    label: 'Pendiente',
    icon: 'time-outline',
  },
  activo: {
    bg: 'bg-emerald-600',
    borderColor: '#34D399',
    label: 'En curso',
    icon: 'radio-outline',
  },
  completado: {
    bg: 'bg-sky-600',
    borderColor: '#38BDF8',
    label: 'Completado',
    icon: 'checkmark-circle-outline',
  },
  cancelado: {
    bg: 'bg-red-600',
    borderColor: '#F87171',
    label: 'Cancelado',
    icon: 'close-circle-outline',
  },
};

type Props = {
  bitacora: BitacoraResumen;
  onPress: () => void;
  index?: number;
};

export function ServiceCard({ bitacora, onPress, index = 0 }: Props) {
  const cfg = estadoConfig[bitacora.estado] ?? estadoConfig.pendiente;
  const isActive = bitacora.estado === 'activo';
  const isPending = bitacora.estado === 'pendiente';

  return (
    <FadeInView delay={100 + index * 60}>
      <AnimatedPressable
        className="mb-3 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie"
        style={{ borderLeftWidth: 4, borderLeftColor: cfg.borderColor }}
        onPress={onPress}
      >
        <View className="flex-row items-start p-4">
          <View
            className={`mr-3 h-12 w-12 items-center justify-center rounded-2xl ${
              isActive ? 'bg-emerald-500/20' : isPending ? 'bg-amber-500/15' : 'bg-servi-fondo'
            }`}
          >
            <Ionicons
              name={cfg.icon}
              size={24}
              color={isActive ? '#22C55E' : isPending ? '#FBBF24' : '#F97316'}
            />
          </View>

          <View className="flex-1">
            <View className="mb-1 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-lg font-bold text-servi-texto">
                {bitacora.nombre ?? 'Sin nombre'}
              </Text>
              <View className={`rounded-full px-2.5 py-1 ${cfg.bg}`}>
                <Text className="text-[10px] font-bold uppercase text-white">{cfg.label}</Text>
              </View>
            </View>

            <View className="mb-1 flex-row items-center">
              <Ionicons name="navigate-outline" size={14} color="#A7C4B5" />
              <Text className="ml-1 flex-1 text-sm text-servi-suave">{bitacora.ruta ?? '—'}</Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="business-outline" size={14} color="#A7C4B5" />
              <Text className="ml-1 text-xs text-servi-suave">
                {bitacora.empresa_contratante ?? '—'} · {bitacora.unidad ?? '—'}
              </Text>
            </View>

            {isActive ? (
              <View className="mt-2 flex-row items-center">
                <View className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                <Text className="text-xs font-semibold text-emerald-400">Monitoreo activo · GPS en vivo</Text>
              </View>
            ) : isPending ? (
              <Text className="mt-2 text-xs text-amber-300/90">
                Toca para revisar datos e iniciar custodia
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </View>
      </AnimatedPressable>
    </FadeInView>
  );
}
