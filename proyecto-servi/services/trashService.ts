import { TRASH_RETENTION_DAYS } from '../lib/trashConstants';
import { supabase } from '../lib/supabaseClient';

export type TrashBitacoraRow = {
  id: string;
  nombre: string | null;
  ruta: string | null;
  estado: string;
  empresa_contratante: string | null;
  completed_at: string | null;
  created_at: string;
  deleted_at: string;
  deleted_by: string | null;
  custodio_nombre: string | null;
  evidencias_count: number;
};

export type TrashEvidenciaRow = {
  id: string;
  bitacora_id: string;
  bitacora_nombre: string | null;
  url_imagen: string | null;
  storage_path: string | null;
  timestamp: string;
  deleted_at: string;
};

export type CleanupPreview = {
  bitacoras: number;
  evidencias: number;
};

export type CleanupFilter = {
  includeCompletadas: boolean;
  includeCanceladas: boolean;
  includePendientes: boolean;
  olderThanDays: number | null;
};

async function deleteStoragePaths(paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;

  await Promise.all([
    supabase.storage.from('evidencias').remove(unique),
    supabase.storage.from('firmas').remove(unique.filter((p) => p.includes('firma'))),
  ]);
}

export async function listTrashBitacoras(): Promise<{
  data: TrashBitacoraRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('bitacoras')
    .select(
      'id, nombre, ruta, estado, empresa_contratante, completed_at, created_at, deleted_at, deleted_by, custodio_id',
    )
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const ids = (data ?? []).map((b) => b.id);
  const custodioIds = [...new Set((data ?? []).map((b) => b.custodio_id))];

  const [profilesRes, evCountsRes] = await Promise.all([
    supabase.from('profiles').select('id, nombre').in('id', custodioIds),
    ids.length
      ? supabase.from('evidencias').select('bitacora_id').in('bitacora_id', ids)
      : Promise.resolve({ data: [] as { bitacora_id: string }[], error: null }),
  ]);

  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.nombre]));
  const counts = new Map<string, number>();
  for (const row of evCountsRes.data ?? []) {
    counts.set(row.bitacora_id, (counts.get(row.bitacora_id) ?? 0) + 1);
  }

  return {
    data: (data ?? []).map((b) => ({
      id: b.id,
      nombre: b.nombre,
      ruta: b.ruta,
      estado: b.estado,
      empresa_contratante: b.empresa_contratante,
      completed_at: b.completed_at,
      created_at: b.created_at,
      deleted_at: b.deleted_at!,
      deleted_by: b.deleted_by,
      custodio_nombre: names.get(b.custodio_id) ?? null,
      evidencias_count: counts.get(b.id) ?? 0,
    })),
    error: null,
  };
}

export async function listTrashEvidencias(): Promise<{
  data: TrashEvidenciaRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('evidencias')
    .select('id, bitacora_id, url_imagen, storage_path, timestamp, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const bitacoraIds = [...new Set((data ?? []).map((e) => e.bitacora_id))];
  const { data: bitacoras } = bitacoraIds.length
    ? await supabase.from('bitacoras').select('id, nombre').in('id', bitacoraIds)
    : { data: [] as { id: string; nombre: string | null }[] };

  const bitNames = new Map((bitacoras ?? []).map((b) => [b.id, b.nombre]));

  return {
    data: (data ?? []).map((e) => ({
      id: e.id,
      bitacora_id: e.bitacora_id,
      bitacora_nombre: bitNames.get(e.bitacora_id) ?? null,
      url_imagen: e.url_imagen,
      storage_path: e.storage_path,
      timestamp: e.timestamp,
      deleted_at: e.deleted_at!,
    })),
    error: null,
  };
}

export async function previewCleanup(filter: CleanupFilter): Promise<{
  data: CleanupPreview;
  error: string | null;
}> {
  const estados: string[] = [];
  if (filter.includeCompletadas) estados.push('completado');
  if (filter.includeCanceladas) estados.push('cancelado');
  if (filter.includePendientes) estados.push('pendiente');

  if (estados.length === 0) {
    return { data: { bitacoras: 0, evidencias: 0 }, error: null };
  }

  let query = supabase
    .from('bitacoras')
    .select('id, completed_at, created_at', { count: 'exact', head: false })
    .is('deleted_at', null)
    .in('estado', estados)
    .neq('estado', 'activo');

  const { data: bitacoras, error } = await query;
  if (error) return { data: { bitacoras: 0, evidencias: 0 }, error: error.message };

  const filtered = (bitacoras ?? []).filter((b) => {
    if (filter.olderThanDays == null) return true;
    const ref = b.completed_at ?? b.created_at;
    if (!ref) return false;
    const ageDays = (Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000);
    return ageDays >= filter.olderThanDays;
  });

  const ids = filtered.map((b) => b.id);
  let evidencias = 0;
  if (ids.length > 0) {
    const { count } = await supabase
      .from('evidencias')
      .select('id', { count: 'exact', head: true })
      .in('bitacora_id', ids)
      .is('deleted_at', null);
    evidencias = count ?? 0;
  }

  return { data: { bitacoras: filtered.length, evidencias }, error: null };
}

export async function moveBitacorasToTrash(
  bitacoraIds: string[],
  userId: string,
): Promise<{ moved: number; error: string | null }> {
  if (bitacoraIds.length === 0) return { moved: 0, error: null };

  const now = new Date().toISOString();

  const { error: evError } = await supabase
    .from('evidencias')
    .update({ deleted_at: now, deleted_by: userId })
    .in('bitacora_id', bitacoraIds)
    .is('deleted_at', null);

  if (evError) return { moved: 0, error: evError.message };

  const { data, error } = await supabase
    .from('bitacoras')
    .update({ deleted_at: now, deleted_by: userId })
    .in('id', bitacoraIds)
    .is('deleted_at', null)
    .neq('estado', 'activo')
    .select('id');

  if (error) return { moved: 0, error: error.message };
  return { moved: data?.length ?? 0, error: null };
}

export async function runCleanupToTrash(
  filter: CleanupFilter,
  userId: string,
): Promise<{ moved: number; error: string | null }> {
  const estados: string[] = [];
  if (filter.includeCompletadas) estados.push('completado');
  if (filter.includeCanceladas) estados.push('cancelado');
  if (filter.includePendientes) estados.push('pendiente');

  if (estados.length === 0) return { moved: 0, error: 'Selecciona al menos un tipo.' };

  const { data: bitacoras, error } = await supabase
    .from('bitacoras')
    .select('id, completed_at, created_at')
    .is('deleted_at', null)
    .in('estado', estados)
    .neq('estado', 'activo');

  if (error) return { moved: 0, error: error.message };

  const ids = (bitacoras ?? [])
    .filter((b) => {
      if (filter.olderThanDays == null) return true;
      const ref = b.completed_at ?? b.created_at;
      if (!ref) return false;
      const ageDays = (Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000);
      return ageDays >= filter.olderThanDays;
    })
    .map((b) => b.id);

  return moveBitacorasToTrash(ids, userId);
}

export async function restoreBitacoraFromTrash(bitacoraId: string): Promise<{ error: string | null }> {
  const { error: evError } = await supabase
    .from('evidencias')
    .update({ deleted_at: null, deleted_by: null })
    .eq('bitacora_id', bitacoraId);

  if (evError) return { error: evError.message };

  const { error } = await supabase
    .from('bitacoras')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', bitacoraId);

  return { error: error?.message ?? null };
}

export async function restoreEvidenciaFromTrash(evidenciaId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('evidencias')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', evidenciaId);

  return { error: error?.message ?? null };
}

export async function permanentlyDeleteBitacora(bitacoraId: string): Promise<{ error: string | null }> {
  const { data: evs } = await supabase
    .from('evidencias')
    .select('storage_path')
    .eq('bitacora_id', bitacoraId);

  const paths = (evs ?? []).map((e) => e.storage_path).filter(Boolean) as string[];
  await deleteStoragePaths(paths);

  const { error } = await supabase.from('bitacoras').delete().eq('id', bitacoraId);
  return { error: error?.message ?? null };
}

export async function permanentlyDeleteEvidencia(evidenciaId: string): Promise<{ error: string | null }> {
  const { data } = await supabase
    .from('evidencias')
    .select('storage_path')
    .eq('id', evidenciaId)
    .maybeSingle();

  if (data?.storage_path) {
    await deleteStoragePaths([data.storage_path]);
  }

  const { error } = await supabase.from('evidencias').delete().eq('id', evidenciaId);
  return { error: error?.message ?? null };
}

export async function purgeExpiredTrash(): Promise<{
  purgedBitacoras: number;
  purgedEvidencias: number;
  error: string | null;
}> {
  const { data: expiredBitacoras } = await supabase
    .from('bitacoras')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString());

  const { data: expiredEvs } = await supabase
    .from('evidencias')
    .select('storage_path')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString());

  const paths = (expiredEvs ?? []).map((e) => e.storage_path).filter(Boolean) as string[];

  for (const id of expiredBitacoras ?? []) {
    const { data: evs } = await supabase
      .from('evidencias')
      .select('storage_path')
      .eq('bitacora_id', id.id);
    paths.push(...(evs ?? []).map((e) => e.storage_path).filter(Boolean) as string[]);
  }

  await deleteStoragePaths(paths);

  const { data, error } = await supabase.rpc('purge_expired_trash');

  if (error) {
    return { purgedBitacoras: 0, purgedEvidencias: 0, error: error.message };
  }

  const result = data as { purged_bitacoras?: number; purged_evidencias?: number };
  return {
    purgedBitacoras: result?.purged_bitacoras ?? 0,
    purgedEvidencias: result?.purged_evidencias ?? 0,
    error: null,
  };
}

export async function getTrashSummary(): Promise<{
  bitacoras: number;
  evidencias: number;
  error: string | null;
}> {
  const [bRes, eRes] = await Promise.all([
    supabase.from('bitacoras').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    supabase.from('evidencias').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
  ]);

  if (bRes.error) return { bitacoras: 0, evidencias: 0, error: bRes.error.message };
  if (eRes.error) return { bitacoras: 0, evidencias: 0, error: eRes.error.message };

  return {
    bitacoras: bRes.count ?? 0,
    evidencias: eRes.count ?? 0,
    error: null,
  };
}
