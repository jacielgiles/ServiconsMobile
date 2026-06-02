-- =============================================================================
-- MIGRACION — Ubicacion en vivo de custodios (sin borrar datos existentes)
-- Ejecutar en Supabase SQL Editor si YA tienes la base instalada
-- (Mismo contenido que FIX_SOLO_UBICACION_VIVA.sql + politicas admin extra)
-- =============================================================================

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

-- Realtime para mapa admin (opcional pero recomendado)
ALTER TABLE public.custodio_ubicaciones_live REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.custodio_ubicaciones_live;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Politicas admin update bitacoras/sos (por si faltan)
DROP POLICY IF EXISTS "admin_jefe_bitacoras_update" ON public.bitacoras;
CREATE POLICY "admin_jefe_bitacoras_update" ON public.bitacoras
  FOR UPDATE
  USING (public.is_admin_or_jefe())
  WITH CHECK (public.is_admin_or_jefe());

DROP POLICY IF EXISTS "admin_jefe_sos_update" ON public.sos_alerts;
CREATE POLICY "admin_jefe_sos_update" ON public.sos_alerts
  FOR UPDATE
  USING (public.is_admin_or_jefe())
  WITH CHECK (public.is_admin_or_jefe());
