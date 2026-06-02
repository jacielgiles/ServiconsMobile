import {
  cacheDirectory,
  deleteAsync,
  downloadAsync,
  readAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';

import { supabase } from './supabaseClient';

const FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/** URL fresca para mostrar en pantalla (prioriza storage_path) */
export async function resolveEvidenceImageUrl(
  url: string | null | undefined,
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from('evidencias')
      .createSignedUrl(storagePath, 60 * 60 * 24);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  if (url) return url;
  return null;
}

async function downloadToCache(imageUrl: string): Promise<string | null> {
  if (!cacheDirectory) return null;
  const dest = `${cacheDirectory}pdf-ev-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  try {
    const download = await withTimeout(downloadAsync(imageUrl, dest), FETCH_TIMEOUT_MS);
    if (!download || download.status !== 200) {
      await deleteAsync(dest, { idempotent: true });
      return null;
    }
    return download.uri;
  } catch {
    try {
      await deleteAsync(dest, { idempotent: true });
    } catch {
      // ignorar
    }
    return null;
  }
}

async function resolveRemoteImageFile(
  url: string | null | undefined,
  storagePath: string | null | undefined,
  preloadedUrl?: string | null,
): Promise<string | null> {
  if (preloadedUrl) {
    const local = await downloadToCache(preloadedUrl);
    if (local) return local;
  }

  if (storagePath) {
    const { data } = await supabase.storage
      .from('evidencias')
      .createSignedUrl(storagePath, 60 * 60);
    if (data?.signedUrl) {
      const local = await downloadToCache(data.signedUrl);
      if (local) return local;
    }
  }

  if (url) {
    const local = await downloadToCache(url);
    if (local) return local;
  }

  return null;
}

/** Base64 para PDF: descarga a cache y luego lee (compatible expo-print) */
export async function resolveEvidenceImageDataUri(
  url: string | null | undefined,
  storagePath: string | null | undefined,
  preloadedUrl?: string | null,
  tempFiles?: string[],
): Promise<string | null> {
  const fileUri = await resolveRemoteImageFile(url, storagePath, preloadedUrl);
  if (!fileUri) return null;
  if (tempFiles) tempFiles.push(fileUri);

  try {
    const base64 = await readAsStringAsync(fileUri, {
      encoding: EncodingType.Base64,
    });
    if (!base64) return null;
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

export async function resolveEvidenceImageUrls<
  T extends { url_imagen: string | null; storage_path: string | null },
>(rows: T[]): Promise<Array<T & { displayUrl: string | null }>> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      displayUrl: await resolveEvidenceImageUrl(row.url_imagen, row.storage_path),
    })),
  );
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      try {
        await deleteAsync(path, { idempotent: true });
      } catch {
        // ignorar
      }
    }),
  );
}
