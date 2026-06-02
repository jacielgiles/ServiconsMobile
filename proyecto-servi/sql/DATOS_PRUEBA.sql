-- =============================================================================
-- SERVICONS — SETUP COMPLETO DE PRUEBA (1 solo RUN en Supabase SQL Editor)
-- =============================================================================
-- Incluye: tabla GPS en vivo + 4 usuarios demo + 3 bitacoras de ejemplo
--
-- CONTRASEÑA DE TODAS LAS CUENTAS: Demo2024!
--
-- | Rol              | Email                      |
-- |------------------|----------------------------|
-- | Super usuario    | super@test.servicons.mx    |
-- | Jefe custodios   | jefe@test.servicons.mx     |
-- | Custodio         | custodio@test.servicons.mx |
-- | Cliente          | cliente@test.servicons.mx  |
--
-- Empresa demo bitacoras: Transportes Demo SA
-- =============================================================================

-- pgcrypto en Supabase vive en schema "extensions" (no en public)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Tabla GPS en vivo (si aun no existe)
-- -----------------------------------------------------------------------------
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
  FOR ALL USING (custodio_id = auth.uid()) WITH CHECK (custodio_id = auth.uid());

DROP POLICY IF EXISTS "admin_jefe_ubicaciones_lectura" ON public.custodio_ubicaciones_live;
CREATE POLICY "admin_jefe_ubicaciones_lectura" ON public.custodio_ubicaciones_live
  FOR SELECT USING (public.is_admin_or_jefe());

DROP POLICY IF EXISTS "cliente_ubicaciones_empresa" ON public.custodio_ubicaciones_live;
CREATE POLICY "cliente_ubicaciones_empresa" ON public.custodio_ubicaciones_live
  FOR SELECT USING (
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

-- -----------------------------------------------------------------------------
-- Limpiar demo anterior (re-ejecutable)
-- -----------------------------------------------------------------------------
DELETE FROM public.custodio_ubicaciones_live
WHERE custodio_id = 'c3333333-3333-3333-3333-333333333333';

DELETE FROM public.evidencias
WHERE bitacora_id IN (
  'b0000001-0000-0000-0000-000000000001',
  'b0000002-0000-0000-0000-000000000002',
  'b0000003-0000-0000-0000-000000000003'
);

DELETE FROM public.bitacoras
WHERE id IN (
  'b0000001-0000-0000-0000-000000000001',
  'b0000002-0000-0000-0000-000000000002',
  'b0000003-0000-0000-0000-000000000003'
);

DELETE FROM auth.identities
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444'
);

DELETE FROM auth.users
WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444'
);

-- -----------------------------------------------------------------------------
-- Crear usuarios auth (crypt via extensions.pgcrypto)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._seed_demo_user(
  p_id UUID,
  p_email TEXT,
  p_nombre TEXT,
  p_role TEXT,
  p_empresa TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  v_password_hash := extensions.crypt('Demo2024!', extensions.gen_salt('bf'::text));

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    v_password_hash,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre, 'role', p_role, 'empresa', COALESCE(p_empresa, '')),
    NOW(),
    NOW(),
    '', '', '', '',
    FALSE, FALSE, FALSE
  );

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_id::text,
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  INSERT INTO public.profiles (id, email, nombre, role, empresa, activo)
  VALUES (p_id, p_email, p_nombre, p_role, p_empresa, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = EXCLUDED.nombre,
    role = EXCLUDED.role,
    empresa = EXCLUDED.empresa,
    activo = TRUE;
END;
$$;

SELECT public._seed_demo_user(
  'a1111111-1111-1111-1111-111111111111',
  'super@test.servicons.mx',
  'Admin Super Demo',
  'super_usuario'
);

SELECT public._seed_demo_user(
  'b2222222-2222-2222-2222-222222222222',
  'jefe@test.servicons.mx',
  'Jefe Custodias Demo',
  'jefe_custodios'
);

SELECT public._seed_demo_user(
  'c3333333-3333-3333-3333-333333333333',
  'custodio@test.servicons.mx',
  'Carlos Custodio Demo',
  'custodio',
  'Servicons Seguridad'
);

SELECT public._seed_demo_user(
  'd4444444-4444-4444-4444-444444444444',
  'cliente@test.servicons.mx',
  'Laura Cliente Demo',
  'cliente',
  'Transportes Demo SA'
);

DROP FUNCTION IF EXISTS public._seed_demo_user(UUID, TEXT, TEXT, TEXT, TEXT);

-- -----------------------------------------------------------------------------
-- Bitacoras demo (pendiente / activo / completado)
-- -----------------------------------------------------------------------------
INSERT INTO public.bitacoras (
  id, custodio_id, nombre, ruta, unidad, empresa_contratante, estado,
  formulario, report_interval_minutes, start_time, completed_at
) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  'c3333333-3333-3333-3333-333333333333',
  'Custodia Unidad 527 — CDMX a Queretaro',
  'CDMX → Querétaro · Carretera 57',
  'Unidad 527',
  'Transportes Demo SA',
  'pendiente',
  '{"operador1":{"nombre":"Juan Operador","celular":"5512345678"},"whatsappGrupo":null}'::jsonb,
  15,
  NULL,
  NULL
),
(
  'b0000002-0000-0000-0000-000000000002',
  'c3333333-3333-3333-3333-333333333333',
  'Custodia Unidad 937 — Monterrey a Laredo',
  'Monterrey → Laredo · Ruta comercial',
  'Unidad 937',
  'Transportes Demo SA',
  'activo',
  '{"operador1":{"nombre":"Pedro Operador","celular":"5587654321"},"whatsappGrupo":null}'::jsonb,
  10,
  NOW() - INTERVAL '45 minutes',
  NULL
),
(
  'b0000003-0000-0000-0000-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  'Custodia Unidad 104 — Guadalajara a Tepic',
  'Guadalajara → Tepic · Entrega cerrada',
  'Unidad 104',
  'Transportes Demo SA',
  'completado',
  '{"operador1":{"nombre":"Miguel Operador","celular":"5599887766"},"whatsappGrupo":null}'::jsonb,
  15,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
);

INSERT INTO public.evidencias (bitacora_id, custodio_id, latitud, longitud, observaciones, timestamp)
VALUES
(
  'b0000003-0000-0000-0000-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  20.6597, -103.3496,
  'Salida de patio — Guadalajara',
  NOW() - INTERVAL '2 days'
),
(
  'b0000003-0000-0000-0000-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  20.7236, -103.3848,
  'Checkpoint carretera',
  NOW() - INTERVAL '47 hours'
),
(
  'b0000003-0000-0000-0000-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  21.5045, -104.8942,
  'Llegada a destino — Tepic',
  NOW() - INTERVAL '1 day'
);

INSERT INTO public.custodio_ubicaciones_live (
  custodio_id, bitacora_id, latitud, longitud, precision_m, updated_at
) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'b0000002-0000-0000-0000-000000000002',
  25.6866, -100.3161,
  12.5,
  NOW()
);

-- -----------------------------------------------------------------------------
-- Verificacion final
-- -----------------------------------------------------------------------------
SELECT 'USUARIOS OK' AS check_name, COUNT(*) AS total
FROM public.profiles
WHERE email LIKE '%@test.servicons.mx';

SELECT email, nombre, role, empresa
FROM public.profiles
WHERE email LIKE '%@test.servicons.mx'
ORDER BY role;

SELECT nombre, estado, unidad, empresa_contratante
FROM public.bitacoras
WHERE custodio_id = 'c3333333-3333-3333-3333-333333333333'
ORDER BY estado;
