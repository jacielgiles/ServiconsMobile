import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreateUserBody = {
  email: string;
  password: string;
  nombre: string;
  role: 'custodio' | 'jefe_custodios' | 'cliente';
  empresa?: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Metodo no permitido' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'No autorizado' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseCaller.auth.getUser();

  if (callerError || !caller) {
    return json({ error: 'Sesion invalida' }, 401);
  }

  const { data: actorProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profileError || !actorProfile) {
    return json({ error: 'Perfil no encontrado' }, 403);
  }

  let body: CreateUserBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON invalido' }, 400);
  }

  const { email, password, nombre, role, empresa } = body;

  if (!email?.trim() || !password || password.length < 6 || !nombre?.trim() || !role) {
    return json({ error: 'Faltan campos obligatorios' }, 400);
  }

  if (role === 'cliente' && !empresa?.trim()) {
    return json({ error: 'Los clientes requieren empresa' }, 400);
  }

  if (role === 'custodio' && !empresa?.trim()) {
    return json({ error: 'Los custodios requieren empresa asignada' }, 400);
  }

  const { data: canAssign, error: rpcError } = await supabaseAdmin.rpc('can_assign_role', {
    actor_role: actorProfile.role,
    target_role: role,
  });

  if (rpcError || !canAssign) {
    return json({ error: 'No tienes permiso para crear ese rol' }, 403);
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      nombre: nombre.trim(),
      role,
      empresa: empresa?.trim() ?? '',
    },
  });

  if (createError) {
    return json({ error: createError.message }, 400);
  }

  return json({
    user: {
      id: created.user?.id,
      email: created.user?.email,
      role,
    },
  });
});
