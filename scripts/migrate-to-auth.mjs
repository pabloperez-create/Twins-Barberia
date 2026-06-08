// ⚠️ OBSOLETO (2026-06-08) — NO EJECUTAR. La columna `usuarios.password_hash` que
// este script lee ya fue eliminada (Fase 1.4 paso 6). Se conserva solo como registro
// histórico de cómo se migraron los 11 usuarios a Supabase Auth. Correrlo fallará.
//
// Migración Fase 1.2 — crea los usuarios existentes en Supabase Auth y los
// linkea con usuarios.auth_id. NO toca el login actual (sigue funcionando).
//
// Uso:
//   node --env-file=.env.local scripts/migrate-to-auth.mjs           # DRY-RUN (no crea nada)
//   node --env-file=.env.local scripts/migrate-to-auth.mjs --apply   # ejecuta de verdad
//
// Requiere en .env.local: VITE_SUPABASE_URL y SUPABASE_SERVICE_KEY

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('❌ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_KEY en el entorno.');
  process.exit(1);
}

// Cliente admin (service role) — bypassa RLS, puede usar auth.admin.*
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const norm = (e) => (e || '').trim().toLowerCase();

// Trae TODOS los usuarios de Auth (paginado) y los indexa por email normalizado
async function mapAuthUsersByEmail() {
  const map = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) map.set(norm(u.email), u);
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

async function main() {
  console.log(`\n=== Migración a Supabase Auth — modo: ${APPLY ? '🔴 APPLY (real)' : '🟢 DRY-RUN'} ===\n`);

  const { data: usuarios, error } = await admin
    .from('usuarios')
    .select('id, email, rol, password_hash, auth_id');
  if (error) { console.error('❌ Error leyendo usuarios:', error.message); process.exit(1); }

  const authByEmail = await mapAuthUsersByEmail();
  const results = [];

  for (const u of usuarios) {
    const email = norm(u.email);
    const pwd = u.password_hash || '';
    let status, authId = u.auth_id;

    // Validaciones previas
    if (!email) { results.push({ email: u.email, status: '⏭️  SKIP: email vacío' }); continue; }
    if (!pwd || pwd.length < 6) {
      results.push({ email, status: `⚠️  SKIP: password inválida (len=${pwd.length}, mínimo 6)` });
      continue;
    }

    const existing = authByEmail.get(email);

    if (existing) {
      // Ya existe en Auth → solo asegurar el link
      authId = existing.id;
      status = u.auth_id === existing.id ? '✓ ya linkeado' : '🔗 link a Auth existente';
    } else if (!APPLY) {
      status = '➕ se crearía en Auth (dry-run)';
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: pwd,
        email_confirm: true,
        user_metadata: { usuario_id: u.id, rol: u.rol },
      });
      if (cErr) { results.push({ email, status: `❌ error createUser: ${cErr.message}` }); continue; }
      authId = created.user.id;
      status = '➕ creado en Auth';
    }

    // Linkear auth_id en la tabla usuarios
    if (APPLY && authId && u.auth_id !== authId) {
      const { error: uErr } = await admin.from('usuarios').update({ auth_id: authId }).eq('id', u.id);
      if (uErr) { results.push({ email, status: `❌ error linkeando auth_id: ${uErr.message}` }); continue; }
    }

    results.push({ email, status });
  }

  console.log('Resultado por usuario:\n');
  for (const r of results) console.log(`  ${r.email.padEnd(40)} ${r.status}`);
  console.log(`\n${APPLY ? '✅ Migración aplicada.' : 'ℹ️  Dry-run: no se creó nada. Corré con --apply para ejecutar.'}\n`);
}

main().catch((e) => { console.error('❌ Falló:', e); process.exit(1); });
