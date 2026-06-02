import type { Ubicacion } from '../types/models';

function parseCoord(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Direccion completa para busqueda en Google Maps */
export function formatUbicacionAddress(u: Ubicacion | null | undefined): string {
  if (!u) return '';
  const calleLine =
    u.calle && u.numeroExterior
      ? `${u.calle} ${u.numeroExterior}`
      : u.calle?.trim() || '';

  const parts = [
    calleLine || null,
    u.colonia?.trim() || null,
    u.codigoPostal?.trim() ? `CP ${u.codigoPostal.trim()}` : null,
    u.ciudad?.trim() || null,
    u.municipio?.trim() || null,
    u.estado?.trim() || null,
    'Mexico',
  ].filter(Boolean);

  return parts.join(', ');
}

/** Etiqueta corta para listas y rutas */
export function formatUbicacionShort(u: Ubicacion | null | undefined): string {
  if (!u) return '—';
  const cp = u.codigoPostal?.trim();
  const city = u.ciudad?.trim() || u.municipio?.trim();
  if (cp && city) return `${city} CP ${cp}`;
  if (city && u.estado?.trim()) return `${city}, ${u.estado.trim()}`;
  return formatUbicacionAddress(u) || '—';
}

export function hasUbicacionCoords(u: Ubicacion | null | undefined): boolean {
  return parseCoord(u?.lat) != null && parseCoord(u?.lng) != null;
}

export function hasUbicacionAddress(u: Ubicacion | null | undefined): boolean {
  if (!u) return false;
  return Boolean(
    u.estado?.trim() &&
      u.municipio?.trim() &&
      u.codigoPostal?.trim() &&
      (u.calle?.trim() || hasUbicacionCoords(u)),
  );
}

export function buildGoogleMapsAddressUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function buildGoogleMapsUbicacionUrl(u: Ubicacion, label?: string): string {
  const lat = parseCoord(u.lat);
  const lng = parseCoord(u.lng);
  const address = formatUbicacionAddress(u);

  if (lat != null && lng != null) {
    const query = address || label || `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query}@${lat},${lng}`)}`;
  }

  if (address) return buildGoogleMapsAddressUrl(address);
  return 'https://www.google.com/maps';
}

export function getUbicacionCoords(u: Ubicacion): { lat: number; lng: number } | null {
  const lat = parseCoord(u.lat);
  const lng = parseCoord(u.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}
