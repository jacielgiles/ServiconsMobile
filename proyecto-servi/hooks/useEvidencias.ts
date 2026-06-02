import { useCallback } from 'react';

import { upsertLiveLocation } from '../services/locationService';
import { supabase } from '../lib/supabaseClient';
import type { EvidenceStampMeta } from '../lib/evidenceMeta';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

function svgDataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function useEvidencias() {
  const getSignedUrl = useCallback(async (bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }, []);

  const uploadFoto = useCallback(
    async (uri: string, custodioId: string, bitacoraId: string): Promise<{ url: string; path: string } | null> => {
      const arrayBuffer = await uriToArrayBuffer(uri);
      const path = `${custodioId}/${bitacoraId}/${Date.now()}.jpg`;

      const { error } = await supabase.storage.from('evidencias').upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

      if (error) return null;
      const url = await getSignedUrl('evidencias', path);
      if (!url) return null;
      return { url, path };
    },
    [getSignedUrl],
  );

  const uploadFirma = useCallback(
    async (
      dataUrl: string,
      custodioId: string,
      bitacoraId: string,
      tipo: 'operador' | 'custodio',
    ): Promise<string | null> => {
      const path = `${custodioId}/${bitacoraId}/firma_${tipo}_${Date.now()}.svg`;
      const arrayBuffer = svgDataUrlToArrayBuffer(dataUrl);

      const { error } = await supabase.storage.from('firmas').upload(path, arrayBuffer, {
        contentType: 'image/svg+xml',
        upsert: false,
      });

      if (error) return null;
      return getSignedUrl('firmas', path);
    },
    [getSignedUrl],
  );

  const saveEvidencia = useCallback(
    async (params: {
      bitacora_id: string;
      custodio_id: string;
      url_imagen: string;
      storage_path?: string | null;
      latitud: number;
      longitud: number;
      precision_m?: number | null;
      altitud?: number | null;
      observaciones?: string;
      metadata?: EvidenceStampMeta | Record<string, unknown> | null;
    }) => {
      const timestamp = new Date().toISOString();

      const { error } = await supabase.from('evidencias').insert({
        bitacora_id: params.bitacora_id,
        custodio_id: params.custodio_id,
        url_imagen: params.url_imagen,
        storage_path: params.storage_path ?? null,
        latitud: params.latitud,
        longitud: params.longitud,
        precision_m: params.precision_m ?? null,
        altitud: params.altitud ?? null,
        observaciones: params.observaciones ?? null,
        metadata: params.metadata ?? null,
        timestamp,
      });

      if (error) return false;

      await upsertLiveLocation({
        custodioId: params.custodio_id,
        bitacoraId: params.bitacora_id,
        latitud: params.latitud,
        longitud: params.longitud,
        precision_m: params.precision_m ?? null,
      });

      return true;
    },
    [],
  );

  const getEvidencias = useCallback(async (bitacoraId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) return [];

    const { data, error } = await supabase
      .from('evidencias')
      .select(
        'id, bitacora_id, url_imagen, storage_path, latitud, longitud, precision_m, observaciones, metadata, timestamp',
      )
      .eq('bitacora_id', bitacoraId)
      .eq('custodio_id', session.user.id)
      .order('timestamp', { ascending: false });

    if (error) return [];
    return data ?? [];
  }, []);

  return { uploadFoto, uploadFirma, saveEvidencia, getEvidencias, getSignedUrl };
};
