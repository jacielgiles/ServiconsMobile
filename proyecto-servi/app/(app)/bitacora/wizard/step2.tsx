import { useRouter } from 'expo-router';

import { WizardField } from '../../../../components/WizardField';
import { WizardSectionCard } from '../../../../components/WizardSectionCard';
import { WizardShell } from '../../../../components/WizardShell';
import { useBitacoraStore } from '../../../../store/useBitacoraStore';

export default function WizardStep2() {
  const router = useRouter();
  const { formulario, updateFormulario } = useBitacoraStore();

  return (
    <WizardShell
      title="Vehiculo y tiempos"
      subtitle="Unidad custodiada e intervalo de reportes"
      step={2}
      onNext={() => router.push('/(app)/bitacora/wizard/step3')}
    >
      <WizardSectionCard
        title="Vehiculo en custodia"
        subtitle="Placas y contacto de la unidad"
        icon="car-outline"
        tone="blue"
      >
        <WizardField
          label="Placas vehiculo custodia"
          value={formulario.vehiculoCustodia.placas}
          onChangeText={(v) =>
            updateFormulario({
              vehiculoCustodia: { ...formulario.vehiculoCustodia, placas: v },
            })
          }
          placeholder="ABC-123-D"
        />
        <WizardField
          label="Color"
          value={formulario.vehiculoCustodia.color}
          onChangeText={(v) =>
            updateFormulario({
              vehiculoCustodia: { ...formulario.vehiculoCustodia, color: v },
            })
          }
        />
        <WizardField
          label="Celular"
          value={formulario.vehiculoCustodia.celular}
          onChangeText={(v) =>
            updateFormulario({
              vehiculoCustodia: { ...formulario.vehiculoCustodia, celular: v },
            })
          }
          keyboardType="phone-pad"
        />
      </WizardSectionCard>

      <WizardSectionCard
        title="Programacion"
        subtitle="Cita, odometro e intervalo GPS"
        icon="time-outline"
        tone="orange"
      >
        <WizardField
          label="Fecha/hora presentacion"
          value={formulario.tiempos.fechaHoraPresentacion ?? ''}
          onChangeText={(v) =>
            updateFormulario({ tiempos: { ...formulario.tiempos, fechaHoraPresentacion: v } })
          }
          placeholder="DD/MM/AAAA HH:MM"
        />
        <WizardField
          label="Fecha/hora cita"
          value={formulario.tiempos.fechaHoraCita}
          onChangeText={(v) =>
            updateFormulario({ tiempos: { ...formulario.tiempos, fechaHoraCita: v } })
          }
          placeholder="DD/MM/AAAA HH:MM"
        />
        <WizardField
          label="Odometro inicial"
          value={formulario.tiempos.odometroInicial}
          onChangeText={(v) =>
            updateFormulario({ tiempos: { ...formulario.tiempos, odometroInicial: v } })
          }
          keyboardType="number-pad"
        />
        <WizardField
          label="Intervalo reportes (minutos)"
          value={String(formulario.reportIntervalMinutes ?? 15)}
          onChangeText={(v) => updateFormulario({ reportIntervalMinutes: parseInt(v, 10) || 15 })}
          keyboardType="number-pad"
        />
      </WizardSectionCard>
    </WizardShell>
  );
}
