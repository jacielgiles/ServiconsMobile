import { useRouter } from 'expo-router';

import { LocationFormSection } from '../../../../components/LocationFormSection';
import { WizardField } from '../../../../components/WizardField';
import { WizardSectionCard } from '../../../../components/WizardSectionCard';
import { WizardShell } from '../../../../components/WizardShell';
import { useAppToast } from '../../../../hooks/useAppToast';
import { hasUbicacionAddress } from '../../../../lib/ubicacionAddress';
import { useBitacoraStore } from '../../../../store/useBitacoraStore';

function validateUbicacion(
  u: ReturnType<typeof useBitacoraStore.getState>['formulario']['origen'],
  label: string,
): string | null {
  if (!u.estado.trim()) return `Indica el estado de ${label}.`;
  if (!u.municipio.trim()) return `Indica el municipio de ${label}.`;
  if (!u.codigoPostal?.trim()) return `Indica el codigo postal de ${label}.`;
  if (!u.calle?.trim() && !u.lat?.trim()) {
    return `${label}: agrega calle y numero o coordenadas GPS.`;
  }
  if (u.lat?.trim() && !u.lng?.trim()) return `${label}: falta la longitud GPS.`;
  if (u.lng?.trim() && !u.lat?.trim()) return `${label}: falta la latitud GPS.`;
  if (!hasUbicacionAddress(u) && !(u.lat?.trim() && u.lng?.trim())) {
    return `${label}: completa la direccion para Google Maps.`;
  }
  return null;
}

export default function WizardStep1() {
  const router = useRouter();
  const toast = useAppToast();
  const { formulario, updateFormulario } = useBitacoraStore();

  const next = () => {
    if (!formulario.nombre.trim()) {
      toast.warning('Campo requerido', 'El nombre del servicio es obligatorio.');
      return;
    }
    if (!formulario.empresaContratante.trim()) {
      toast.warning('Campo requerido', 'La empresa contratante es obligatoria.');
      return;
    }

    const origenErr = validateUbicacion(formulario.origen, 'Origen');
    if (origenErr) {
      toast.warning('Origen incompleto', origenErr);
      return;
    }

    const destinoErr = validateUbicacion(formulario.destino, 'Destino');
    if (destinoErr) {
      toast.warning('Destino incompleto', destinoErr);
      return;
    }

    router.push('/(app)/bitacora/wizard/step2');
  };

  return (
    <WizardShell
      title="Datos del servicio"
      subtitle="Direcciones completas para rutas correctas en Google Maps"
      step={1}
      onNext={next}
    >
      <WizardSectionCard
        title="Informacion general"
        subtitle="Identificacion del monitoreo"
        icon="document-text-outline"
        tone="orange"
      >
        <WizardField
          label="Nombre del servicio"
          value={formulario.nombre}
          onChangeText={(v) => updateFormulario({ nombre: v })}
          placeholder="Ej. Custodia Monterrey - CDMX"
          required
        />
        <WizardField
          label="Empresa contratante"
          value={formulario.empresaContratante}
          onChangeText={(v) => updateFormulario({ empresaContratante: v })}
          placeholder="Razon social del cliente"
          required
        />
        <WizardField
          label="Folio cliente"
          value={formulario.folioCliente}
          onChangeText={(v) => updateFormulario({ folioCliente: v })}
          placeholder="Referencia interna del cliente"
        />
      </WizardSectionCard>

      <WizardSectionCard
        title="Punto de origen"
        subtitle="Donde inicia la custodia · CP y calle exactos"
        icon="flag-outline"
        tone="green"
      >
        <LocationFormSection
          title="Origen"
          tone="green"
          ubicacion={formulario.origen}
          onChange={(origen) => updateFormulario({ origen })}
        />
      </WizardSectionCard>

      <WizardSectionCard
        title="Punto de destino"
        subtitle="Donde termina la ruta · misma precision"
        icon="location-outline"
        tone="red"
      >
        <LocationFormSection
          title="Destino"
          tone="red"
          ubicacion={formulario.destino}
          onChange={(destino) => updateFormulario({ destino })}
        />
      </WizardSectionCard>
    </WizardShell>
  );
}
