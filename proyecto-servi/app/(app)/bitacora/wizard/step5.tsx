import { useRouter } from 'expo-router';
import { useState } from 'react';

import { WizardShell } from '../../../../components/WizardShell';
import { useAppToast } from '../../../../hooks/useAppToast';
import { useBitacoraStore } from '../../../../store/useBitacoraStore';

import { OperadorFields } from './operadorFields';

export default function WizardStep5() {
  const router = useRouter();
  const toast = useAppToast();
  const { formulario, updateFormulario } = useBitacoraStore();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const next = () => {
    if (!formulario.operador1.nombre.trim()) {
      toast.warning('Operador requerido', 'Indica el nombre del operador 1.');
      return;
    }
    if (!formulario.operador1.firma) {
      toast.warning('Firma pendiente', 'Dibuja y confirma la firma del operador 1.');
      return;
    }
    router.push('/(app)/bitacora/wizard/step6');
  };

  return (
    <WizardShell title="Operador 1" step={5} onNext={next} scrollEnabled={scrollEnabled}>
      <OperadorFields
        operador={formulario.operador1}
        firmaLabel="Firma operador 1"
        onDrawingChange={(drawing) => setScrollEnabled(!drawing)}
        onChange={(operador1) => updateFormulario({ operador1 })}
      />
    </WizardShell>
  );
}
