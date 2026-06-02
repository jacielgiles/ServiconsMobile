import { useRouter } from 'expo-router';
import { useState } from 'react';

import { SignaturePad } from '../../../../components/SignaturePad';
import { WizardField } from '../../../../components/WizardField';
import { WizardShell } from '../../../../components/WizardShell';
import { useAppToast } from '../../../../hooks/useAppToast';
import { useBitacoraStore } from '../../../../store/useBitacoraStore';

export default function WizardStep4() {
  const router = useRouter();
  const toast = useAppToast();
  const { formulario, updateFormulario } = useBitacoraStore();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const next = () => {
    if (!formulario.responsableOrigen.nombre.trim()) {
      toast.warning('Nombre requerido', 'Indica el responsable de origen.');
      return;
    }
    if (!formulario.responsableOrigen.firma) {
      toast.warning('Firma pendiente', 'Dibuja y confirma la firma del responsable de origen.');
      return;
    }
    if (!formulario.responsableDestino.nombre.trim()) {
      toast.warning('Nombre requerido', 'Indica el responsable de destino.');
      return;
    }
    if (!formulario.responsableDestino.firma) {
      toast.warning('Firma pendiente', 'Dibuja y confirma la firma del responsable de destino.');
      return;
    }
    router.push('/(app)/bitacora/wizard/step5');
  };

  return (
    <WizardShell title="Responsables y firmas" step={4} onNext={next} scrollEnabled={scrollEnabled}>
      <WizardField
        label="Responsable origen"
        value={formulario.responsableOrigen.nombre}
        onChangeText={(v) =>
          updateFormulario({
            responsableOrigen: { ...formulario.responsableOrigen, nombre: v },
          })
        }
      />
      <SignaturePad
        label="Firma responsable origen"
        value={formulario.responsableOrigen.firma}
        onDrawingChange={(drawing) => setScrollEnabled(!drawing)}
        onCapture={(firma) =>
          updateFormulario({
            responsableOrigen: { ...formulario.responsableOrigen, firma },
          })
        }
      />
      <WizardField
        label="Responsable destino"
        value={formulario.responsableDestino.nombre}
        onChangeText={(v) =>
          updateFormulario({
            responsableDestino: { ...formulario.responsableDestino, nombre: v },
          })
        }
      />
      <SignaturePad
        label="Firma responsable destino"
        value={formulario.responsableDestino.firma}
        onDrawingChange={(drawing) => setScrollEnabled(!drawing)}
        onCapture={(firma) =>
          updateFormulario({
            responsableDestino: { ...formulario.responsableDestino, firma },
          })
        }
      />
    </WizardShell>
  );
}
