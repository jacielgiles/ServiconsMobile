import { supabase } from '../lib/supabaseClient';

export type LiveLocationRow = {
  custodio_id: string;
  bitacora_id: string | null;
  latitud: number;
  longitud: number;
  precision_m: number | null;
  heading: number | null;
  updated_at: string;
};

export async function upsertLiveLocation(params: {
  custodioId: string;
  bitacoraId?: string | null;
  latitud: number;
  longitud: number;
  precision_m?: number | null;
  heading?: number | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('custodio_ubicaciones_live').upsert(
    {
      custodio_id: params.custodioId,
      bitacora_id: params.bitacoraId ?? null,
      latitud: params.latitud,
      longitud: params.longitud,
      precision_m: params.precision_m ?? null,
      heading: params.heading ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'custodio_id' },
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function clearLiveLocation(custodioId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('custodio_ubicaciones_live')
    .delete()
    .eq('custodio_id', custodioId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getLiveLocationByCustodio(
  custodioId: string,
): Promise<{ data: LiveLocationRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('custodio_ubicaciones_live')
    .select('custodio_id, bitacora_id, latitud, longitud, precision_m, heading, updated_at')
    .eq('custodio_id', custodioId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as LiveLocationRow | null, error: null };
}

export async function getLiveLocationByBitacora(
  bitacoraId: string,
): Promise<{ data: LiveLocationRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('custodio_ubicaciones_live')
    .select('custodio_id, bitacora_id, latitud, longitud, precision_m, heading, updated_at')
    .eq('bitacora_id', bitacoraId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as LiveLocationRow | null, error: null };
}
