-- =============================================================================
-- SERVICONS — SOLO USUARIOS DEMO (4 roles)
-- =============================================================================
-- Supabase → SQL Editor → pegar TODO → RUN
--
-- CONTRASEÑA DE TODOS: Demo2024!
--
--   super@test.servicons.mx     → super_usuario
--   jefe@test.servicons.mx      → jefe_custodios
--   custodio@test.servicons.mx  → custodio
--   cliente@test.servicons.mx   → cliente
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Borrar demo anterior (re-ejecutable)
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
  v_hash TEXT;
BEGIN
  v_hash := extensions.crypt('Demo2024!', extensions.gen_salt('bf'::text));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id, 'authenticated', 'authenticated', p_email, v_hash,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre, 'role', p_role, 'empresa', COALESCE(p_empresa, '')),
    NOW(), NOW(), '', '', '', '',
    FALSE, FALSE, FALSE
  );

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_id::text, p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', NOW(), NOW(), NOW()
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

SELECT public._seed_demo_user('a1111111-1111-1111-1111-111111111111', 'super@test.servicons.mx',    'Admin Super Demo',    'super_usuario',  NULL);
SELECT public._seed_demo_user('b2222222-2222-2222-2222-222222222222', 'jefe@test.servicons.mx',     'Jefe Custodias Demo', 'jefe_custodios', NULL);
SELECT public._seed_demo_user('c3333333-3333-3333-3333-333333333333', 'custodio@test.servicons.mx', 'Carlos Custodio Demo','custodio',       'Servicons Seguridad');
SELECT public._seed_demo_user('d4444444-4444-4444-4444-444444444444', 'cliente@test.servicons.mx',  'Laura Cliente Demo',  'cliente',        'Transportes Demo SA');

DROP FUNCTION IF EXISTS public._seed_demo_user(UUID, TEXT, TEXT, TEXT, TEXT);

-- Resultado
SELECT email, nombre, role, empresa, activo
FROM public.profiles
WHERE email LIKE '%@test.servicons.mx'
ORDER BY role;
