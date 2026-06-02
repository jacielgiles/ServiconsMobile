import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UpdateUserBody = {
  userId: string;
  role?: 'custodio' | 'jefe_custodios' | 'cliente';
  activo?: boolean;
  empresa?: string | null;
  nombre?: string;
  celular?: string | null;
  email?: string;
  newPassword?: string;
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

  if (!['super_usuario', 'jefe_custodios'].includes(actorProfile.role)) {
    return json({ error: 'Sin permisos de administracion' }, 403);
  }

  let body: UpdateUserBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON invalido' }, 400);
  }

  const { userId, role, activo, empresa, nombre, celular, email, newPassword } = body;

  if (!userId) {
    return json({ error: 'Falta userId' }, 400);
  }

  if (userId === caller.id && role) {
    return json({ error: 'No puedes cambiar tu propio rol' }, 400);
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('role, empresa, email')
    .eq('id', userId)
    .single();

  if (targetError || !targetProfile) {
    return json({ error: 'Usuario no encontrado' }, 404);
  }

  if (targetProfile.role === 'super_usuario') {
    return json({ error: 'No se puede modificar un super usuario' }, 403);
  }

  const profileUpdates: Record<string, unknown> = {};

  if (nombre?.trim()) {
    profileUpdates.nombre = nombre.trim();
  }

  if (celular !== undefined) {
    profileUpdates.celular = celular?.trim() || null;
  }

  if (role) {
    const { data: canAssign, error: rpcError } = await supabaseAdmin.rpc('can_assign_role', {
      actor_role: actorProfile.role,
      target_role: role,
    });

    if (rpcError || !canAssign) {
      return json({ error: 'No tienes permiso para asignar ese rol' }, 403);
    }

    profileUpdates.role = role;

    if (role === 'cliente') {
      const empresaValue = empresa?.trim() || targetProfile.empresa;
      if (!empresaValue) {
        return json({ error: 'Los clientes requieren empresa' }, 400);
      }
      profileUpdates.empresa = empresaValue;
    } else if (empresa !== undefined) {
      profileUpdates.empresa = empresa?.trim() || null;
    }
  } else if (empresa !== undefined) {
    profileUpdates.empresa = empresa?.trim() || null;
  }

  if (typeof activo === 'boolean') {
    if (userId === caller.id) {
      return json({ error: 'No puedes desactivar tu propia cuenta' }, 400);
    }
    profileUpdates.activo = activo;
  }

  if (email?.trim() && email.trim() !== targetProfile.email) {
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: email.trim(),
      email_confirm: true,
    });
    if (emailError) {
      return json({ error: emailError.message }, 400);
    }
    profileUpdates.email = email.trim();
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return json({ error: 'La contrasena debe tener al menos 6 caracteres' }, 400);
    }
    const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (passError) {
      return json({ error: passError.message }, 400);
    }
  }

  if (Object.keys(profileUpdates).length === 0 && !newPassword && !email?.trim()) {
    return json({ error: 'Nada que actualizar' }, 400);
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }
  }

  return json({ ok: true, userId, ...profileUpdates });
});
