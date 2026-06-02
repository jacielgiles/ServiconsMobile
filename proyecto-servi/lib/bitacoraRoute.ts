import type { BitacoraFormulario } from '../types/models';
import type { GeoPoint } from './geo';
import { formatUbicacionAddress, formatUbicacionShort, getUbicacionCoords } from './ubicacionAddress';

/** Puntos para Google Maps: origen → reportes GPS → destino */
export function buildBitacoraRoutePoints(
  formulario: BitacoraFormulario | null | undefined,
  evidencePoints: GeoPoint[],
): GeoPoint[] {
  const points: GeoPoint[] = [];

  const origenCoords = formulario?.origen ? getUbicacionCoords(formulario.origen) : null;
  if (origenCoords) {
    points.push({
      id: 'origen',
      lat: origenCoords.lat,
      lng: origenCoords.lng,
      label: formatUbicacionShort(formulario?.origen) || 'Origen',
    });
  }

  points.push(...evidencePoints.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)));

  const destinoCoords = formulario?.destino ? getUbicacionCoords(formulario.destino) : null;
  if (destinoCoords) {
    points.push({
      id: 'destino',
      lat: destinoCoords.lat,
      lng: destinoCoords.lng,
      label: formatUbicacionShort(formulario?.destino) || 'Destino',
    });
  }

  return points;
}

export function getBitacoraRouteLabels(formulario: BitacoraFormulario | null | undefined): {
  origen: string;
  destino: string;
} {
  return {
    origen: formatUbicacionAddress(formulario?.origen) || formatUbicacionShort(formulario?.origen),
    destino: formatUbicacionAddress(formulario?.destino) || formatUbicacionShort(formulario?.destino),
  };
}
