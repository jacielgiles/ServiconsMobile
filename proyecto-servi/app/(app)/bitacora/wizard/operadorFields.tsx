import { SignaturePad } from '../../../../components/SignaturePad';
import { WizardField } from '../../../../components/WizardField';
import type { OperadorCustodiado } from '../../../../types/models';

export function OperadorFields({
  operador,
  onChange,
  firmaLabel,
  onDrawingChange,
}: {
  operador: OperadorCustodiado;
  onChange: (op: OperadorCustodiado) => void;
  firmaLabel: string;
  onDrawingChange?: (drawing: boolean) => void;
}) {
  const v = operador.vehiculo;

  return (
    <>
      <WizardField
        label="Nombre operador"
        value={operador.nombre}
        onChangeText={(val) => onChange({ ...operador, nombre: val })}
      />
      <WizardField
        label="Celular"
        value={operador.celular}
        onChangeText={(val) => onChange({ ...operador, celular: val })}
      />
      <WizardField
        label="Placas vehiculo"
        value={v.placas}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, placas: val } })}
      />
      <WizardField
        label="Marca"
        value={v.marca}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, marca: val } })}
      />
      <WizardField
        label="Modelo"
        value={v.modelo}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, modelo: val } })}
      />
      <WizardField
        label="Color"
        value={v.color}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, color: val } })}
      />
      <WizardField
        label="Placa remolque 1"
        value={v.placaRemolque1}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, placaRemolque1: val } })}
      />
      <WizardField
        label="No. economico"
        value={v.numEco}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, numEco: val } })}
      />
      <WizardField
        label="Sellos"
        value={v.sellos}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, sellos: val } })}
      />
      <WizardField
        label="Eco tracto"
        value={v.ecoTracto}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, ecoTracto: val } })}
      />
      <WizardField
        label="Pedimento"
        value={v.pedimento}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, pedimento: val } })}
      />
      <WizardField
        label="Placa remolque 2"
        value={v.placaRemolque2}
        onChangeText={(val) => onChange({ ...operador, vehiculo: { ...v, placaRemolque2: val } })}
      />
      <WizardField
        label="Empresa transporte"
        value={v.empresaTransporte}
        onChangeText={(val) =>
          onChange({ ...operador, vehiculo: { ...v, empresaTransporte: val } })
        }
      />
      <SignaturePad
        label={firmaLabel}
        value={operador.firma}
        onDrawingChange={onDrawingChange}
        onCapture={(firma) => onChange({ ...operador, firma })}
      />
    </>
  );
}
