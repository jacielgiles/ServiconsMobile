import type { BitacoraResumen } from '../types/models';

export type EstadoSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: '#64748B',
  activo: '#22C55E',
  completado: '#0EA5E9',
  cancelado: '#DC2626',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendientes',
  activo: 'En vivo',
  completado: 'Completados',
  cancelado: 'Cancelados',
};

export function countBitacorasByEstado(bitacoras: BitacoraResumen[]): EstadoSegment[] {
  const keys = ['pendiente', 'activo', 'completado', 'cancelado'] as const;
  return keys
    .map((key) => ({
      key,
      label: ESTADO_LABELS[key],
      value: bitacoras.filter((b) => b.estado === key).length,
      color: ESTADO_COLORS[key],
    }))
    .filter((s) => s.value > 0);
}

export function getBitacoraTotals(bitacoras: BitacoraResumen[]) {
  return {
    total: bitacoras.length,
    pendiente: bitacoras.filter((b) => b.estado === 'pendiente').length,
    activo: bitacoras.filter((b) => b.estado === 'activo').length,
    completado: bitacoras.filter((b) => b.estado === 'completado').length,
    cancelado: bitacoras.filter((b) => b.estado === 'cancelado').length,
    enTransito: bitacoras.filter((b) => b.estado === 'activo' || b.estado === 'pendiente').length,
  };
}
