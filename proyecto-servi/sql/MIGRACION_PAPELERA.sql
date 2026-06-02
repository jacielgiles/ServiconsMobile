-- =============================================================================
-- PAPELERA — soft delete + eliminacion permanente a los 7 dias
-- Ejecutar en Supabase SQL Editor (una vez)
-- =============================================================================

ALTER TABLE public.bitacoras
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.evidencias
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_bitacoras_deleted_at ON public.bitacoras (deleted_at);
CREATE INDEX IF NOT EXISTS idx_evidencias_deleted_at ON public.evidencias (deleted_at);

CREATE OR REPLACE FUNCTION public.is_super_usuario()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_usuario'
  );
$$;

-- Recrear politicas de lectura excluyendo papelera (filas con deleted_at)
DROP POLICY IF EXISTS "dueno_bitacora" ON public.bitacoras;
CREATE POLICY "dueno_bitacora" ON public.bitacoras
  FOR ALL
  USING (custodio_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (custodio_id = auth.uid());

DROP POLICY IF EXISTS "cliente_ve_empresa" ON public.bitacoras;
CREATE POLICY "cliente_ve_empresa" ON public.bitacoras
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cliente'
        AND p.empresa IS NOT NULL
        AND p.empresa = bitacoras.empresa_contratante
    )
  );

DROP POLICY IF EXISTS "admin_jefe_lectura" ON public.bitacoras;
CREATE POLICY "admin_jefe_lectura" ON public.bitacoras
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_usuario', 'jefe_custodios')
    )
  );

DROP POLICY IF EXISTS "super_usuario_papelera_bitacoras" ON public.bitacoras;
CREATE POLICY "super_usuario_papelera_bitacoras" ON public.bitacoras
  FOR ALL
  USING (public.is_super_usuario())
  WITH CHECK (public.is_super_usuario());

DROP POLICY IF EXISTS "dueno_evidencias" ON public.evidencias;
CREATE POLICY "dueno_evidencias" ON public.evidencias
  FOR ALL
  USING (
    custodio_id = auth.uid()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.bitacoras b
      WHERE b.id = evidencias.bitacora_id AND b.deleted_at IS NULL
    )
  )
  WITH CHECK (custodio_id = auth.uid());

DROP POLICY IF EXISTS "cliente_evidencias_lectura" ON public.evidencias;
CREATE POLICY "cliente_evidencias_lectura" ON public.evidencias
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.bitacoras b
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE b.id = evidencias.bitacora_id
        AND b.deleted_at IS NULL
        AND p.role = 'cliente'
        AND p.empresa IS NOT NULL
        AND p.empresa = b.empresa_contratante
    )
  );

DROP POLICY IF EXISTS "admin_jefe_evidencias_lectura" ON public.evidencias;
CREATE POLICY "admin_jefe_evidencias_lectura" ON public.evidencias
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_usuario', 'jefe_custodios')
    )
  );

DROP POLICY IF EXISTS "super_usuario_papelera_evidencias" ON public.evidencias;
CREATE POLICY "super_usuario_papelera_evidencias" ON public.evidencias
  FOR ALL
  USING (public.is_super_usuario())
  WITH CHECK (public.is_super_usuario());

-- Elimina permanentemente lo que lleva mas de 7 dias en papelera
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bitacoras INT := 0;
  v_evidencias INT := 0;
BEGIN
  IF NOT public.is_super_usuario() THEN
    RAISE EXCEPTION 'Solo super usuario puede purgar la papelera';
  END IF;

  DELETE FROM public.evidencias
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_evidencias = ROW_COUNT;

  DELETE FROM public.bitacoras
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_bitacoras = ROW_COUNT;

  RETURN jsonb_build_object(
    'purged_bitacoras', v_bitacoras,
    'purged_evidencias', v_evidencias
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_trash() TO authenticated;
