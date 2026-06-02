import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { FadeInView } from './FadeInView';

type Props = {
  tone?: 'emerald' | 'sky' | 'orange';
};

const styles = {
  emerald: { border: 'border-emerald-500/25', bg: 'bg-emerald-950/30', icon: '#34D399', title: 'text-emerald-300' },
  sky: { border: 'border-sky-500/25', bg: 'bg-sky-950/30', icon: '#38BDF8', title: 'text-sky-300' },
  orange: { border: 'border-orange-500/25', bg: 'bg-orange-950/30', icon: '#FB923C', title: 'text-orange-300' },
};

/** Explica el flujo operativo de pendientes / activos */
export function FlowHintCard({ tone = 'emerald' }: Props) {
  const s = styles[tone];

  return (
    <FadeInView delay={180} className={`mb-4 rounded-2xl border p-4 ${s.border} ${s.bg}`}>
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="information-circle-outline" size={18} color={s.icon} />
        <Text className={`text-xs font-bold uppercase ${s.title}`}>Como funciona</Text>
      </View>
      <Text className="text-sm leading-5 text-servi-suave">
        <Text className="font-semibold text-servi-texto">Pendientes</Text> los crea el custodio con el boton + (wizard de
        bitacora).{'\n'}
        <Text className="font-semibold text-servi-texto">Activos</Text> empiezan cuando el custodio confirma e inicia la
        custodia (permisos GPS).{'\n'}
        Admin y cliente solo <Text className="font-semibold text-servi-texto">monitorean</Text>; no crean pendientes.
      </Text>
    </FadeInView>
  );
}
