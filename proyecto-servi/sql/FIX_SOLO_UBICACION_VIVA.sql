-- =============================================================================
-- FIX RAPIDO — Crear tabla custodio_ubicaciones_live (NO borra datos)
-- =============================================================================
-- Usa ESTE script si:
--   - Ya corriste el SQL viejo (sin ubicacion en vivo) y la app dice que falta la tabla
--   - NO quieres borrar usuarios, bitacoras ni evidencias
--
-- Para usuarios + bitacoras demo usa: DATOS_PRUEBA.sql (todo en uno)
-- Supabase → SQL Editor → pega TODO → RUN
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.custodio_ubicaciones_live (
  custodio_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bitacora_id   UUID REFERENCES public.bitacoras(id) ON DELETE SET NULL,
  latitud       DOUBLE PRECISION NOT NULL,
  longitud      DOUBLE PRECISION NOT NULL,
  precision_m   DOUBLE PRECISION,
  heading       DOUBLE PRECISION,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.custodio_ubicaciones_live ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custodio_actualiza_ubicacion" ON public.custodio_ubicaciones_live;
CREATE POLICY "custodio_actualiza_ubicacion" ON public.custodio_ubicaciones_live
  FOR ALL
  USING (custodio_id = auth.uid())
  WITH CHECK (custodio_id = auth.uid());

DROP POLICY IF EXISTS "admin_jefe_ubicaciones_lectura" ON public.custodio_ubicaciones_live;
CREATE POLICY "admin_jefe_ubicaciones_lectura" ON public.custodio_ubicaciones_live
  FOR SELECT
  USING (public.is_admin_or_jefe());

DROP POLICY IF EXISTS "cliente_ubicaciones_empresa" ON public.custodio_ubicaciones_live;
CREATE POLICY "cliente_ubicaciones_empresa" ON public.custodio_ubicaciones_live
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bitacoras b
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE b.id = custodio_ubicaciones_live.bitacora_id
        AND p.role = 'cliente'
        AND p.empresa IS NOT NULL
        AND p.empresa = b.empresa_contratante
    )
  );

CREATE INDEX IF NOT EXISTS idx_ubicaciones_live_bitacora
  ON public.custodio_ubicaciones_live (bitacora_id);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_live_updated
  ON public.custodio_ubicaciones_live (updated_at DESC);

ALTER TABLE public.custodio_ubicaciones_live REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.custodio_ubicaciones_live;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

SELECT 'custodio_ubicaciones_live OK' AS resultado
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'custodio_ubicaciones_live'
);
