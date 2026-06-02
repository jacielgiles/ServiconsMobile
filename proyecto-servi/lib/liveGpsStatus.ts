/** Intervalo de subida del custodio ~30 s → en vivo solo si hubo ping reciente */
export const GPS_LIVE_MS = 45_000;
/** Pasado esto ya no cuenta como transmision activa */
export const GPS_STALE_MS = 3 * 60 * 1000;

export type GpsFreshness = 'live' | 'stale' | 'offline';

export function getGpsFreshness(updatedAt: string | null | undefined): GpsFreshness {
  if (!updatedAt) return 'offline';
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age <= GPS_LIVE_MS) return 'live';
  if (age <= GPS_STALE_MS) return 'stale';
  return 'offline';
}

export function isGpsTransmissionLive(updatedAt: string | null | undefined): boolean {
  return getGpsFreshness(updatedAt) === 'live';
}

export const GPS_FRESHNESS_LABEL: Record<GpsFreshness, string> = {
  live: 'App conectada',
  stale: 'App sin senal',
  offline: 'Sin ubicacion',
};

export const GPS_FRESHNESS_HINT: Record<GpsFreshness, string> = {
  live: 'El custodio tiene la app abierta y esta enviando GPS.',
  stale: 'La custodia sigue activa pero la app no transmite GPS (cerrada o en segundo plano).',
  offline: 'No hay coordenadas recientes para este servicio.',
};
