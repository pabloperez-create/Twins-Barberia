// Seed de la barbería DEMO ("Demo Barber", tenant org-demo-barber) — clon fiel de
// org-twins (barberos, servicios, fotos, horarios) para mostrar el producto sin
// tocar Twins ni los clientes reales. Aislado por RLS. Emails de barberos FALSOS.
//
// Uso:  node --env-file=.env.local scripts/seed-demo-barber.mjs
// Idempotente: borra el tenant demo (datos + usuarios Auth) y lo recrea.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !SVC) { console.error('Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1); }
const svc = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const SRC = 'org-twins';
const DST = 'org-demo-barber';
const PASS = 'DemoBarber2026';           // password de todos los usuarios demo
const slug = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14);

// ───────────────────────── 1) LIMPIAR tenant demo previo ─────────────────────────
console.log('🧹 Limpiando tenant demo previo (si existe)...');
for (const t of ['duraciones_barbero', 'bloqueos_horarios', 'servicios_adicionales', 'servicios_principales', 'barberos']) {
  await svc.from(t).delete().eq('barberia_id', DST);
}
// usuarios demo + sus Auth users
const { data: oldUsers } = await svc.from('usuarios').select('id, auth_id').eq('barberia_id', DST);
for (const u of oldUsers || []) {
  await svc.from('usuarios').delete().eq('id', u.id);
  if (u.auth_id) await svc.auth.admin.deleteUser(u.auth_id).catch(() => {});
}
await svc.from('barberia').delete().eq('id', DST);

// ───────────────────────── 2) BARBERÍA ─────────────────────────
const src = (await svc.from('barberia').select('*').eq('id', SRC).single()).data;
const demoBarberia = {
  ...src,
  id: DST,
  nombre: 'Demo Barber',
  subdominio: 'demo',
  email_admin: 'admin@demobarber.cl',
  plan: 'pro',
  estado: 'activo',
  notas: 'Tenant de DEMO (clon de Twins). No es un cliente real.',
  monto_mensual: null, fecha_ultimo_pago: null, proximo_pago: null,
};
delete demoBarberia.fecha_creacion;
// No clonar el google_place_id de Twins: la demo usa sus propias encuestas como reseñas.
demoBarberia.configuracion = { ...(src.configuracion || {}) };
delete demoBarberia.configuracion.google_place_id;
{ const { error } = await svc.from('barberia').insert(demoBarberia); if (error) throw new Error('barberia: ' + error.message); }
console.log(`✅ Barbería "${demoBarberia.nombre}" creada (${DST}, subdominio "demo", plan pro).`);

// ───────────────────────── 3) BARBEROS + USUARIOS demo ─────────────────────────
const { data: barberos } = await svc.from('barberos').select('*').eq('barberia_id', SRC).order('orden', { ascending: true });
const barberoMap = {};   // oldBarberoId -> newBarberoId
let adminCreds = null;
let i = 0;
for (const b of barberos) {
  i++;
  // rol del usuario original vinculado
  let rol = 'barbero';
  if (b.usuario_id) {
    const { data: u } = await svc.from('usuarios').select('rol').eq('id', b.usuario_id).maybeSingle();
    if (u?.rol) rol = u.rol;
  }
  const email = `${slug(b.nombre) || 'barbero' + i}@demobarber.cl`;
  const newUsuarioId = `u-demo-${slug(b.nombre) || i}`;
  const newBarberoId = `b-demo-${slug(b.nombre) || i}`;

  // Auth user
  const { data: created, error: aerr } = await svc.auth.admin.createUser({
    email, password: PASS, email_confirm: true, user_metadata: { usuario_id: newUsuarioId, rol, demo: true },
  });
  if (aerr) throw new Error('auth ' + email + ': ' + aerr.message);

  // fila usuarios
  { const { error } = await svc.from('usuarios').insert({ id: newUsuarioId, barberia_id: DST, nombre: b.nombre, email, rol, auth_id: created.user.id }); if (error) throw new Error('usuarios ' + email + ': ' + error.message); }

  // fila barberos (clon, sin tokens de google)
  const nb = { ...b, id: newBarberoId, barberia_id: DST, usuario_id: newUsuarioId, google_access_token: null, google_refresh_token: null, google_calendar_conectado: false };
  delete nb.fecha_creacion;
  { const { error } = await svc.from('barberos').insert(nb); if (error) throw new Error('barberos ' + b.nombre + ': ' + error.message); }

  barberoMap[b.id] = newBarberoId;
  if (rol === 'admin' && !adminCreds) adminCreds = { email, pass: PASS, nombre: b.nombre };
  console.log(`  ✅ ${b.nombre.padEnd(20)} rol=${rol.padEnd(11)} login=${email}`);
}

// ───────────────────────── 4) SERVICIOS (principales + adicionales) ─────────────────────────
const servicioMap = {};  // oldServicioId -> newServicioId
const { data: sp } = await svc.from('servicios_principales').select('*').eq('barberia_id', SRC);
for (const s of sp) {
  const newId = `sp-demo-${slug(s.nombre)}`;
  const ns = { ...s, id: newId, barberia_id: DST, barbero_exclusivo_id: s.barbero_exclusivo_id ? (barberoMap[s.barbero_exclusivo_id] || null) : null };
  delete ns.fecha_creacion;
  const { error } = await svc.from('servicios_principales').insert(ns); if (error) throw new Error('servicio ' + s.nombre + ': ' + error.message);
  servicioMap[s.id] = newId;
}
console.log(`✅ ${sp.length} servicios principales.`);

const { data: sa } = await svc.from('servicios_adicionales').select('*').eq('barberia_id', SRC);
for (const s of sa) {
  const newId = `sa-demo-${slug(s.nombre)}`;
  const ns = { ...s, id: newId, barberia_id: DST };
  delete ns.fecha_creacion;
  const { error } = await svc.from('servicios_adicionales').insert(ns); if (error) throw new Error('adicional ' + s.nombre + ': ' + error.message);
  servicioMap[s.id] = newId;
}
console.log(`✅ ${sa.length} servicios adicionales.`);

// ───────────────────────── 5) DURACIONES_BARBERO ─────────────────────────
const { data: dur } = await svc.from('duraciones_barbero').select('*').eq('barberia_id', SRC);
let okDur = 0;
for (const d of dur) {
  const nb = barberoMap[d.barbero_id], ns = servicioMap[d.servicio_id];
  if (!nb || !ns) continue; // skip si la FK no mapeó
  const nd = { ...d, id: `dur-demo-${nb}-${ns}`.slice(0, 60), barberia_id: DST, barbero_id: nb, servicio_id: ns };
  const { error } = await svc.from('duraciones_barbero').insert(nd); if (!error) okDur++;
}
console.log(`✅ ${okDur}/${dur.length} duraciones (las no mapeadas se omiten).`);

// ───────────────────────── RESUMEN ─────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('🎉 DEMO BARBER lista (tenant org-demo-barber).');
console.log(`   Local:     http://localhost:5173/?barberiaId=${DST}`);
console.log(`   Subdominio (cuando se configure): https://demo.reservaia.cl`);
if (adminCreds) {
  console.log(`\n   🔑 LOGIN ADMIN para el cliente:`);
  console.log(`      email:    ${adminCreds.email}`);
  console.log(`      password: ${adminCreds.pass}`);
} else {
  console.log('\n   ⚠️ No se detectó un barbero con rol admin; revisar.');
}
console.log(`   (todos los usuarios demo usan la password: ${PASS})`);
console.log('══════════════════════════════════════════════');
