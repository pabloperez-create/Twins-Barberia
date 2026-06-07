import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

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

  if (req.method !== 'OPTIONS' && !verifyToken(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rollback/cleanup: borra la fila `usuarios` y su usuario de Auth. Lo usa el
  // caller si un paso posterior (ej. insertar el barbero) falla.
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta id' });
      const { data: row } = await admin.from('usuarios').select('auth_id').eq('id', id).maybeSingle();
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

    // 2) Insertar fila espejo en `usuarios`. La auth real es Supabase Auth (auth_id);
    // `password_hash` es NOT NULL todavía, así que ponemos un valor aleatorio
    // inutilizable (nunca matchea el fallback `=== password`). Se elimina en el DROP de Fase 1.4.
    const { data: usuario, error: uErr } = await admin
      .from('usuarios')
      .insert({ id, barberia_id, nombre: nombre.trim(), email: emailNorm, rol, auth_id: authId, password_hash: randomUUID() })
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
