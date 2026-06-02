export type EvidenceStampMeta = {
  timestamp: string;
  lat: number;
  lng: number;
  precision_m?: number | null;
  custodioNombre: string;
  servicioNombre: string;
  empresa: string;
  unidad: string;
  ruta: string;
  numeroReporte: number;
};

export function buildEvidenceObservaciones(meta: EvidenceStampMeta): string {
  return [
    `Servicons · ${meta.servicioNombre}`,
    `Custodio: ${meta.custodioNombre}`,
    `Empresa: ${meta.empresa}`,
    `Unidad: ${meta.unidad}`,
    `GPS: ${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`,
    `Reporte #${meta.numeroReporte}`,
    meta.timestamp,
  ].join(' | ');
}
