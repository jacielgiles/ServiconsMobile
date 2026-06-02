import { useCallback, useState } from 'react';

import { useAppToast } from './useAppToast';
import { listSosForBitacora, type AdminBitacoraDetail, type AdminEvidenciaRow } from '../services/adminService';
import { exportBitacoraPdf, shareBitacoraPdf } from '../services/reportPdfService';

type EvidenciaConUrl = AdminEvidenciaRow & { displayUrl?: string | null };

export function useBitacoraPdfExport() {
  const toast = useAppToast();
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(
    async (bitacora: AdminBitacoraDetail, evidencias: EvidenciaConUrl[]) => {
      setExporting(true);
      toast.info('Generando PDF', 'Descargando fotos y armando documento…');

      try {
        const preloadedImageUrls = Object.fromEntries(
          evidencias.map((ev) => [ev.id, ev.displayUrl ?? null]),
        );

        const sosRes = await listSosForBitacora(bitacora.id);
        const result = await exportBitacoraPdf({
          bitacora,
          evidencias,
          sos: sosRes.data,
          preloadedImageUrls,
        });

        setExporting(false);

        if (!result.ok || !result.uri) {
          toast.error('PDF no generado', result.error ?? 'Revisa conexion e intenta de nuevo.');
          return result;
        }

        await shareBitacoraPdf(result.uri);

        const withPhoto = evidencias.filter((e) => e.storage_path || e.url_imagen).length;
        toast.success('PDF listo', `${evidencias.length} reportes · ${withPhoto} con foto.`);
        return result;
      } catch (e) {
        toast.error(
          'PDF no generado',
          e instanceof Error ? e.message : 'Revisa conexion e intenta de nuevo.',
        );
        return { ok: false, error: 'Error al exportar' };
      } finally {
        setExporting(false);
      }
    },
    [toast],
  );

  return { exportPdf, exporting };
}
