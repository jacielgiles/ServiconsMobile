-- =============================================================================
-- MIGRACION — Evidencias enriquecidas + ultima ubicacion reportada
-- Ejecutar en Supabase SQL Editor (NO borra datos)
-- =============================================================================

ALTER TABLE public.evidencias
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS precision_m DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_evidencias_timestamp
  ON public.evidencias (bitacora_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_custodio_time
  ON public.evidencias (custodio_id, timestamp DESC);

-- Admin/jefe ya tienen lectura en evidencias; cliente por empresa tambien

COMMENT ON COLUMN public.evidencias.metadata IS 'Datos de marca: custodio, empresa, unidad, reporte #, etc.';
COMMENT ON COLUMN public.evidencias.storage_path IS 'Ruta en bucket evidencias/{custodio}/{bitacora}/archivo.jpg';

SELECT 'evidencias ampliadas OK' AS resultado;
