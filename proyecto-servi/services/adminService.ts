import { getGpsFreshness, type GpsFreshness } from '../lib/liveGpsStatus';
import { supabase } from '../lib/supabaseClient';
import type { UserRole } from '../types/models';

export type AdminDashboardStats = {
  users: {
    total: number;
    custodios: number;
    clientes: number;
    jefes: number;
  };
  bitacoras: {
    activas: number;
    pendientes: number;
    completadas: number;
    total: number;
  };
  sos: {
    activas: number;
  };
};

type CreateUserParams = {
  email: string;
  password: string;
  nombre: string;
  role: UserRole;
  empresa?: string;
};

export async function getAdminDashboardStats(): Promise<{
  data: AdminDashboardStats | null;
  error: string | null;
}> {
  const [profilesRes, bitacorasRes, sosRes] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('bitacoras').select('estado'),
    supabase.from('sos_alerts').select('id').eq('estado', 'activa'),
  ]);

  if (profilesRes.error) return { data: null, error: profilesRes.error.message };
  if (bitacorasRes.error) return { data: null, error: bitacorasRes.error.message };
  if (sosRes.error) return { data: null, error: sosRes.error.message };

  const roles = profilesRes.data ?? [];
  const bitacoras = bitacorasRes.data ?? [];

  const stats: AdminDashboardStats = {
    users: {
      total: roles.length,
      custodios: roles.filter((r) => r.role === 'custodio').length,
      clientes: roles.filter((r) => r.role === 'cliente').length,
      jefes: roles.filter((r) => r.role === 'jefe_custodios').length,
    },
    bitacoras: {
      activas: bitacoras.filter((b) => b.estado === 'activo').length,
      pendientes: bitacoras.filter((b) => b.estado === 'pendiente').length,
      completadas: bitacoras.filter((b) => b.estado === 'completado').length,
      total: bitacoras.length,
    },
    sos: {
      activas: sosRes.data?.length ?? 0,
    },
  };

  return { data: stats, error: null };
}

export async function createUserAsAdmin(params: CreateUserParams): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: 'Sesion expirada. Vuelve a iniciar sesion.' };
  }

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-user`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    let payload: { error?: string } = {};
    let rawBody = '';
    try {
      rawBody = await response.text();
      payload = rawBody ? (JSON.parse(rawBody) as { error?: string }) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      return {
        error:
          payload.error ??
          (rawBody ? `No se pudo crear el usuario: ${rawBody}` : 'No se pudo crear el usuario'),
      };
    }

    return { error: null };
  } catch {
    return { error: 'Error de red al crear usuario. Verifica la Edge Function.' };
  }
}

export async function updateUserAsAdmin(params: {
  userId: string;
  role?: UserRole;
  activo?: boolean;
  empresa?: string | null;
  nombre?: string;
  celular?: string | null;
  email?: string;
  newPassword?: string;
}): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: 'Sesion expirada. Vuelve a iniciar sesion.' };
  }

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-user`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    let payload: { error?: string } = {};
    let rawBody = '';
    try {
      rawBody = await response.text();
      payload = rawBody ? (JSON.parse(rawBody) as { error?: string }) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const remoteError =
        payload.error ??
        (rawBody
          ? `No se pudo actualizar el usuario: ${rawBody}`
          : 'No se pudo actualizar el usuario');

      const canFallbackToProfilesOnly =
        (remoteError.includes('NOT_FOUND') || remoteError.toLowerCase().includes('function was not found')) &&
        !params.email &&
        !params.newPassword;

      if (canFallbackToProfilesOnly) {
        const updates: Record<string, unknown> = {};
        if (params.role) updates.role = params.role;
        if (typeof params.activo === 'boolean') updates.activo = params.activo;
        if (params.empresa !== undefined) updates.empresa = params.empresa;
        if (params.nombre !== undefined) updates.nombre = params.nombre;
        if (params.celular !== undefined) updates.celular = params.celular;

        if (Object.keys(updates).length === 0) {
          return { error: 'No hay cambios compatibles para fallback local.' };
        }

        const { error: fallbackError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', params.userId);

        if (fallbackError) {
          return { error: `Fallback local fallo: ${fallbackError.message}` };
        }

        return { error: null };
      }

      return { error: remoteError };
    }

    return { error: null };
  } catch {
    return { error: 'Error de red al actualizar usuario. Verifica la Edge Function update-user.' };
  }
}

export type AdminBitacoraRow = {
  id: string;
  nombre: string | null;
  ruta: string | null;
  unidad: string | null;
  empresa_contratante: string | null;
  estado: string;
  created_at: string;
  completed_at: string | null;
  custodio_id: string;
};

export type AdminReportRow = AdminBitacoraRow & {
  evidencias_count: number;
  custodio_nombre: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_report_at: string | null;
};

export type AdminActiveServiceRow = AdminBitacoraRow & {
  custodio_nombre: string | null;
  evidencias_count: number;
  last_lat: number | null;
  last_lng: number | null;
  last_report_at: string | null;
  location_source?: 'live' | 'evidencia' | null;
  gps_freshness: GpsFreshness;
};

function mergeLocationForService(
  bitacoraId: string,
  custodioId: string,
  evidenceLast: { lat: number; lng: number; at: string } | undefined,
  liveRows: Array<{
    custodio_id: string;
    bitacora_id: string | null;
    latitud: number;
    longitud: number;
    updated_at: string;
  }>,
): {
  last_lat: number | null;
  last_lng: number | null;
  last_report_at: string | null;
  location_source: 'live' | 'evidencia' | null;
  gps_freshness: GpsFreshness;
} {
  const live =
    liveRows.find((r) => r.bitacora_id === bitacoraId) ??
    liveRows.find((r) => r.custodio_id === custodioId && r.bitacora_id === bitacoraId) ??
    liveRows.find((r) => r.custodio_id === custodioId);

  let result: {
    last_lat: number | null;
    last_lng: number | null;
    last_report_at: string | null;
    location_source: 'live' | 'evidencia' | null;
  };

  if (live) {
    const liveFreshness = getGpsFreshness(live.updated_at);
    const liveIsFresh = liveFreshness === 'live';

    if (liveIsFresh) {
      result = {
        last_lat: live.latitud,
        last_lng: live.longitud,
        last_report_at: live.updated_at,
        location_source: 'live',
      };
    } else if (evidenceLast) {
      result = {
        last_lat: evidenceLast.lat,
        last_lng: evidenceLast.lng,
        last_report_at: evidenceLast.at,
        location_source: 'evidencia',
      };
    } else if (liveFreshness === 'stale') {
      result = {
        last_lat: live.latitud,
        last_lng: live.longitud,
        last_report_at: live.updated_at,
        location_source: 'evidencia',
      };
    } else {
      return {
        last_lat: null,
        last_lng: null,
        last_report_at: null,
        location_source: null,
        gps_freshness: 'offline',
      };
    }
  } else if (evidenceLast) {
    result = {
      last_lat: evidenceLast.lat,
      last_lng: evidenceLast.lng,
      last_report_at: evidenceLast.at,
      location_source: 'evidencia',
    };
  } else {
    return {
      last_lat: null,
      last_lng: null,
      last_report_at: null,
      location_source: null,
      gps_freshness: 'offline',
    };
  }

  return {
    ...result,
    gps_freshness:
      result.location_source === 'live'
        ? 'live'
        : getGpsFreshness(result.last_report_at),
  };
}

function indexEvidencias(
  rows: Array<{
    bitacora_id: string;
    latitud: number;
    longitud: number;
    timestamp: string;
  }>,
) {
  const counts = new Map<string, number>();
  const last = new Map<string, { lat: number; lng: number; at: string }>();

  for (const row of rows) {
    counts.set(row.bitacora_id, (counts.get(row.bitacora_id) ?? 0) + 1);
    const prev = last.get(row.bitacora_id);
    if (!prev || row.timestamp > prev.at) {
      last.set(row.bitacora_id, { lat: row.latitud, lng: row.longitud, at: row.timestamp });
    }
  }

  return { counts, last };
}

export type AdminEvidenciaRow = {
  id: string;
  bitacora_id: string;
  url_imagen: string | null;
  storage_path: string | null;
  latitud: number;
  longitud: number;
  precision_m: number | null;
  observaciones: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
};

export async function listAdminReports(): Promise<{
  data: AdminReportRow[];
  error: string | null;
}> {
  const [bitacorasRes, evidenciasRes, profilesRes] = await Promise.all([
    supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id',
      )
      .eq('estado', 'completado')
      .order('completed_at', { ascending: false }),
    supabase.from('evidencias').select('bitacora_id, latitud, longitud, timestamp'),
    supabase.from('profiles').select('id, nombre'),
  ]);

  if (bitacorasRes.error) return { data: [], error: bitacorasRes.error.message };
  if (evidenciasRes.error) return { data: [], error: evidenciasRes.error.message };
  if (profilesRes.error) return { data: [], error: profilesRes.error.message };

  const { counts, last } = indexEvidencias(evidenciasRes.data ?? []);
  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.nombre]));

  const data: AdminReportRow[] = (bitacorasRes.data ?? []).map((item) => {
    const latest = last.get(item.id);
    return {
      ...(item as AdminBitacoraRow),
      evidencias_count: counts.get(item.id) ?? 0,
      custodio_nombre: names.get(item.custodio_id) ?? null,
      last_lat: latest?.lat ?? null,
      last_lng: latest?.lng ?? null,
      last_report_at: latest?.at ?? null,
    };
  });

  return { data, error: null };
}

export async function listAdminActiveServices(): Promise<{
  data: AdminActiveServiceRow[];
  error: string | null;
}> {
  const [bitacorasRes, evidenciasRes, profilesRes, liveRes] = await Promise.all([
    supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id',
      )
      .eq('estado', 'activo')
      .order('created_at', { ascending: false }),
    supabase.from('evidencias').select('bitacora_id, latitud, longitud, timestamp'),
    supabase.from('profiles').select('id, nombre'),
    supabase
      .from('custodio_ubicaciones_live')
      .select('custodio_id, bitacora_id, latitud, longitud, updated_at'),
  ]);

  if (bitacorasRes.error) return { data: [], error: bitacorasRes.error.message };
  if (evidenciasRes.error) return { data: [], error: evidenciasRes.error.message };
  if (profilesRes.error) return { data: [], error: profilesRes.error.message };
  if (liveRes.error) return { data: [], error: liveRes.error.message };

  const { counts, last } = indexEvidencias(evidenciasRes.data ?? []);
  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.nombre]));
  const liveRows = liveRes.data ?? [];

  const data: AdminActiveServiceRow[] = (bitacorasRes.data ?? []).map((item) => {
    const loc = mergeLocationForService(item.id, item.custodio_id, last.get(item.id), liveRows);
    return {
      ...(item as AdminBitacoraRow),
      custodio_nombre: names.get(item.custodio_id) ?? null,
      evidencias_count: counts.get(item.id) ?? 0,
      ...loc,
    };
  });

  return { data, error: null };
}

export type LiveCustodioMapRow = {
  custodio_id: string;
  custodio_nombre: string | null;
  bitacora_id: string | null;
  bitacora_nombre: string | null;
  latitud: number;
  longitud: number;
  updated_at: string;
};

export async function listLiveCustodioLocations(): Promise<{
  data: LiveCustodioMapRow[];
  error: string | null;
}> {
  const [liveRes, profilesRes, bitacorasRes] = await Promise.all([
    supabase
      .from('custodio_ubicaciones_live')
      .select('custodio_id, bitacora_id, latitud, longitud, updated_at')
      .order('updated_at', { ascending: false }),
    supabase.from('profiles').select('id, nombre').eq('role', 'custodio'),
    supabase.from('bitacoras').select('id, nombre, estado').eq('estado', 'activo'),
  ]);

  if (liveRes.error) return { data: [], error: liveRes.error.message };

  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.nombre]));
  const bitacoraNames = new Map((bitacorasRes.data ?? []).map((b) => [b.id, b.nombre]));

  const data: LiveCustodioMapRow[] = (liveRes.data ?? [])
    .filter((row) => getGpsFreshness(row.updated_at) === 'live')
    .map((row) => ({
    custodio_id: row.custodio_id,
    custodio_nombre: names.get(row.custodio_id) ?? null,
    bitacora_id: row.bitacora_id,
    bitacora_nombre: row.bitacora_id ? (bitacoraNames.get(row.bitacora_id) ?? null) : null,
    latitud: row.latitud,
    longitud: row.longitud,
    updated_at: row.updated_at,
  }));

  return { data, error: null };
}

export async function getAdminBitacoraDetail(bitacoraId: string): Promise<{
  data: (AdminBitacoraRow & { custodio_nombre: string | null }) | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('bitacoras')
    .select(
      'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id',
    )
    .eq('id', bitacoraId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Bitacora no encontrada' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', data.custodio_id)
    .maybeSingle();

  return {
    data: {
      ...(data as AdminBitacoraRow),
      custodio_nombre: profile?.nombre ?? null,
    },
    error: null,
  };
}

export async function listAdminBitacoraEvidencias(bitacoraId: string): Promise<{
  data: AdminEvidenciaRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('evidencias')
    .select(
      'id, bitacora_id, url_imagen, storage_path, latitud, longitud, precision_m, observaciones, metadata, timestamp',
    )
    .eq('bitacora_id', bitacoraId)
    .order('timestamp', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AdminEvidenciaRow[], error: null };
}

export async function listManagedProfiles(): Promise<{
  data: Array<{
    id: string;
    nombre: string;
    email: string | null;
    role: UserRole;
    empresa: string | null;
    created_at: string;
    activo: boolean | null;
  }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, role, empresa, created_at, activo, celular')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getManagedProfile(userId: string): Promise<{
  data: {
    id: string;
    nombre: string;
    email: string | null;
    celular: string | null;
    role: UserRole;
    empresa: string | null;
    activo: boolean | null;
    created_at: string;
  } | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, celular, role, empresa, activo, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Usuario no encontrado' };
  return { data: data as NonNullable<typeof data>, error: null };
}

export async function updateProfileFieldsAsAdmin(
  userId: string,
  fields: { nombre?: string; celular?: string | null; empresa?: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) return { error: error.message };
  return { error: null };
}

export type AdminBitacoraDetail = AdminBitacoraRow & {
  custodio_nombre: string | null;
  formulario: Record<string, unknown> | null;
  report_interval_minutes: number | null;
  start_time: string | null;
  updated_at: string | null;
  firma_operador: string | null;
  firma_custodio: string | null;
};

export async function getAdminBitacoraFull(bitacoraId: string): Promise<{
  data: AdminBitacoraDetail | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('bitacoras')
    .select(
      'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id, formulario, report_interval_minutes, start_time, updated_at, firma_operador, firma_custodio',
    )
    .eq('id', bitacoraId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Bitacora no encontrada' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', data.custodio_id)
    .maybeSingle();

  return {
    data: {
      ...(data as AdminBitacoraRow),
      custodio_nombre: profile?.nombre ?? null,
      formulario: (data.formulario as Record<string, unknown> | null) ?? null,
      report_interval_minutes: data.report_interval_minutes ?? null,
      start_time: data.start_time ?? null,
      updated_at: data.updated_at ?? null,
      firma_operador: data.firma_operador ?? null,
      firma_custodio: data.firma_custodio ?? null,
    },
    error: null,
  };
}

export async function updateAdminBitacora(
  bitacoraId: string,
  updates: {
    nombre?: string;
    ruta?: string;
    unidad?: string;
    empresa_contratante?: string;
    estado?: string;
    report_interval_minutes?: number;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bitacoras').update(updates).eq('id', bitacoraId);
  if (error) return { error: error.message };
  return { error: null };
}

export type AdminSosRow = {
  id: string;
  bitacora_id: string | null;
  custodio_id: string;
  latitud: number;
  longitud: number;
  estado: 'activa' | 'atendida' | 'falsa_alarma';
  created_at: string;
};

export async function listAdminBitacoras(): Promise<{
  data: AdminBitacoraRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('bitacoras')
    .select(
      'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id',
    )
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AdminBitacoraRow[], error: null };
}

export async function listSosForBitacora(bitacoraId: string): Promise<{
  data: AdminSosRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('sos_alerts')
    .select('id, bitacora_id, custodio_id, latitud, longitud, estado, created_at')
    .eq('bitacora_id', bitacoraId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AdminSosRow[], error: null };
}

export async function listAdminSosAlerts(): Promise<{
  data: AdminSosRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('sos_alerts')
    .select('id, bitacora_id, custodio_id, latitud, longitud, estado, created_at')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AdminSosRow[], error: null };
}

export async function updateSosEstado(
  alertId: string,
  estado: AdminSosRow['estado'],
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('sos_alerts').update({ estado }).eq('id', alertId);
  if (error) return { error: error.message };
  return { error: null };
}

export type RoleRequestRow = {
  id: string;
  user_id: string;
  requested_role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  empresa: string | null;
};

export async function listRoleRequests(): Promise<{ data: RoleRequestRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('role_change_requests')
    .select(
      'id, user_id, requested_role, status, requested_at, reviewed_at, requested_by_name, requested_by_email, empresa',
    )
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RoleRequestRow[], error: null };
}

export async function resolveRoleRequest(params: {
  requestId: string;
  userId: string;
  requestedRole: UserRole;
  approve: boolean;
}): Promise<{ error: string | null }> {
  const { requestId, userId, requestedRole, approve } = params;

  if (approve) {
    const { error: roleError } = await updateUserAsAdmin({
      userId,
      role: requestedRole,
    });
    if (roleError) return { error: roleError };
  }

  const { error } = await supabase
    .from('role_change_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .eq('id', requestId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getMyPendingRoleRequest(): Promise<{
  data: RoleRequestRow | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: 'Sesion no valida.' };
  }

  const { data, error } = await supabase
    .from('role_change_requests')
    .select(
      'id, user_id, requested_role, status, requested_at, reviewed_at, requested_by_name, requested_by_email, empresa',
    )
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as RoleRequestRow | null) ?? null, error: null };
}

export async function createRoleRequest(params: {
  requestedRole: UserRole;
  empresa?: string | null;
}): Promise<{ error: string | null }> {
  if (params.requestedRole === 'cliente') {
    return { error: 'No necesitas solicitar el rol cliente.' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sesion no valida. Vuelve a iniciar sesion.' };
  }

  const { data: pending, error: pendingError } = await getMyPendingRoleRequest();
  if (pendingError) {
    return { error: pendingError };
  }
  if (pending) {
    return {
      error: `Ya tienes una solicitud pendiente para ${pending.requested_role}. Espera a que un super usuario la revise.`,
    };
  }

  const { data: myProfile, error: profileError } = await supabase
    .from('profiles')
    .select('nombre, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }

  const { error } = await supabase.from('role_change_requests').insert({
    user_id: user.id,
    requested_role: params.requestedRole,
    status: 'pending',
    requested_by_name: myProfile?.nombre ?? user.email ?? 'Usuario',
    requested_by_email: myProfile?.email ?? user.email ?? null,
    empresa: params.empresa?.trim() || null,
  });

  if (error) return { error: error.message };
  return { error: null };
}
