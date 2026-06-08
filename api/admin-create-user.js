import { createClient } from '@supabase/supabase-js';

// Cliente admin (service role) — vive SOLO en el servidor. Bypassa RLS y
// habilita auth.admin.* para crear usuarios en Supabase Auth.
const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const norm = (e) => (e || '').trim().toLowerCase();

// Crea un usuario en Supabase Auth y su fila espejo en `usuarios` (linkeada por
// auth_id). Reemplaza el viejo insert con password_hash. Lo usan TabBarberos
// (crear barbero) y VistaSuperAdmin (crear admin de una barbería nueva).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticación: requiere el JWT de Supabase Auth del llamador (admin/super_admin).
  // Antes bastaba verifyToken (Origin, spoofeable) → cualquiera con curl podía crear
  // un super_admin. Ahora validamos la sesión real y el rol.
  const authHeader = req.headers['authorization'] || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) return res.status(401).json({ error: 'No autenticado' });
  const { data: getUserData, error: authErr } = await admin.auth.getUser(jwt);
  const authUser = getUserData?.user;
  if (authErr || !authUser) return res.status(401).json({ error: 'Sesión inválida' });
  const { data: caller } = await admin
    .from('usuarios').select('rol, barberia_id').eq('auth_id', authUser.id).maybeSingle();
  if (!caller || !['admin', 'super_admin'].includes(caller.rol)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const esSuper = caller.rol === 'super_admin';

  // Rollback/cleanup: borra la fila `usuarios` y su usuario de Auth. Lo usa el
  // caller si un paso posterior (ej. insertar el barbero) falla.
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta id' });
      const { data: row } = await admin.from('usuarios').select('auth_id, barberia_id').eq('id', id).maybeSingle();
      if (row && !esSuper && row.barberia_id !== caller.barberia_id) {
        return res.status(403).json({ error: 'Fuera de tu barbería' });
      }
      await admin.from('usuarios').delete().eq('id', id);
      if (row?.auth_id) await admin.auth.admin.deleteUser(row.auth_id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error en rollback de usuario:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, barberia_id, nombre, email, password, rol } = req.body || {};

    if (!id || !barberia_id || !nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Autorización: super_admin crea cualquier rol/barbería; admin solo crea
    // barberos en SU propia barbería.
    if (!esSuper) {
      if (barberia_id !== caller.barberia_id) return res.status(403).json({ error: 'Fuera de tu barbería' });
      if (rol !== 'barbero') return res.status(403).json({ error: 'No puedes crear ese rol' });
    }

    const emailNorm = norm(email);

    // Email único en `usuarios`
    const { data: existente } = await admin
      .from('usuarios').select('id').eq('email', emailNorm).maybeSingle();
    if (existente) return res.status(409).json({ error: 'Este email ya está registrado' });

    // 1) Crear en Auth
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { usuario_id: id, rol },
    });
    if (cErr) {
      // El email puede existir en Auth aunque no en `usuarios`
      const dup = /already.*registered|exists/i.test(cErr.message || '');
      return res.status(dup ? 409 : 500).json({ error: cErr.message });
    }

    const authId = created.user.id;

    // 2) Insertar fila espejo en `usuarios`. La auth real es Supabase Auth (auth_id).
    const { data: usuario, error: uErr } = await admin
      .from('usuarios')
      .insert({ id, barberia_id, nombre: nombre.trim(), email: emailNorm, rol, auth_id: authId })
      .select()
      .single();

    if (uErr) {
      // Rollback del usuario de Auth para no dejar huérfanos
      await admin.auth.admin.deleteUser(authId);
      return res.status(500).json({ error: uErr.message });
    }

    return res.status(200).json({ ok: true, usuario });
  } catch (err) {
    console.error('Error creando usuario:', err);
    return res.status(500).json({ error: err.message });
  }
}
