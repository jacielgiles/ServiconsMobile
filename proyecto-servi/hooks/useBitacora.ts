import { useCallback, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import { formatUbicacionShort } from '../lib/ubicacionAddress';
import type { BitacoraFormulario, BitacoraResumen } from '../types/models';

export type BitacoraDetalle = BitacoraResumen & {
  formulario?: BitacoraFormulario | null;
  start_time?: string | null;
};

/** Regla de oro del master: custodio_id = auth.uid() */
async function assertSessionCustodio(custodioId: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return 'No hay sesion activa.';
  }

  if (session.user.id !== custodioId) {
    return 'custodio_id debe ser el usuario de la sesion activa.';
  }

  return null;
}

export function useBitacora() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBitacoras = useCallback(async (): Promise<BitacoraResumen[]> => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      setLoading(false);
      return [];
    }

    const { data, error: fetchError } = await supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id, report_interval_minutes',
      )
      .eq('custodio_id', session.user.id)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return [];
    }

    return (data ?? []) as BitacoraResumen[];
  }, []);

  /** Portal cliente — RLS filtra por empresa_contratante = profile.empresa */
  const getClienteBitacoras = useCallback(async (): Promise<BitacoraResumen[]> => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      setLoading(false);
      return [];
    }

    const { data, error: fetchError } = await supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id, report_interval_minutes',
      )
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return [];
    }

    return (data ?? []) as BitacoraResumen[];
  }, []);

  const getBitacoraEvidencias = useCallback(async (bitacoraId: string) => {
    const { data, error: fetchError } = await supabase
      .from('evidencias')
      .select(
        'id, bitacora_id, url_imagen, storage_path, latitud, longitud, precision_m, observaciones, metadata, timestamp',
      )
      .eq('bitacora_id', bitacoraId)
      .order('timestamp', { ascending: false });

    if (fetchError) return [];
    return data ?? [];
  }, []);

  const getBitacoraById = useCallback(async (id: string): Promise<BitacoraResumen | null> => {
    const { data, error: fetchError } = await supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id, report_interval_minutes',
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return null;
    }

    return data as BitacoraResumen;
  }, []);

  const getBitacoraDetalle = useCallback(async (id: string): Promise<BitacoraDetalle | null> => {
    const { data, error: fetchError } = await supabase
      .from('bitacoras')
      .select(
        'id, nombre, ruta, unidad, empresa_contratante, estado, created_at, completed_at, custodio_id, report_interval_minutes, formulario, start_time',
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return null;
    }

    return data as BitacoraDetalle;
  }, []);

  const createBitacora = useCallback(
    async (formulario: BitacoraFormulario, custodioId: string) => {
      setLoading(true);
      setError(null);

      const guardError = await assertSessionCustodio(custodioId);
      if (guardError) {
        setError(guardError);
        setLoading(false);
        return false;
      }

      const ruta = `${formatUbicacionShort(formulario.origen)} → ${formatUbicacionShort(formulario.destino)}`;
      const unidad = formulario.operador1?.vehiculo?.placas || formulario.vehiculoCustodia?.placas || '';

      const { error: insertError } = await supabase.from('bitacoras').insert({
        id: formulario.id,
        custodio_id: custodioId,
        nombre: formulario.nombre,
        ruta,
        unidad,
        empresa_contratante: formulario.empresaContratante,
        estado: 'pendiente',
        formulario,
        report_interval_minutes: formulario.reportIntervalMinutes ?? 15,
      });

      setLoading(false);

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      return true;
    },
    [],
  );

  const iniciarCustodia = useCallback(async (bitacoraId: string, custodioId: string) => {
    const guardError = await assertSessionCustodio(custodioId);
    if (guardError) {
      setError(guardError);
      return false;
    }

    const { error: updateError } = await supabase
      .from('bitacoras')
      .update({ estado: 'activo', start_time: new Date().toISOString() })
      .eq('id', bitacoraId)
      .eq('custodio_id', custodioId);

    return !updateError;
  }, []);

  const cerrarCustodia = useCallback(
    async (
      bitacoraId: string,
      custodioId: string,
      firmaOperador: string,
      firmaCustodio: string,
    ) => {
      const guardError = await assertSessionCustodio(custodioId);
      if (guardError) {
        setError(guardError);
        return false;
      }

      const { error: updateError } = await supabase
        .from('bitacoras')
        .update({
          estado: 'completado',
          completed_at: new Date().toISOString(),
          firma_operador: firmaOperador,
          firma_custodio: firmaCustodio,
        })
        .eq('id', bitacoraId)
        .eq('custodio_id', custodioId);

      return !updateError;
    },
    [],
  );

  return {
    loading,
    error,
    getBitacoras,
    getClienteBitacoras,
    getBitacoraById,
    getBitacoraDetalle,
    getBitacoraEvidencias,
    createBitacora,
    iniciarCustodia,
    cerrarCustodia,
  };
}
