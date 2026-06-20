# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Proyecto

**Twins Barbería** es un SaaS **multi-tenant** de reservas para barberías y salones de belleza. TWINS es el cliente piloto. El mismo código sirve a múltiples negocios, diferenciados por **subdominio**.

- **Live:** https://twins-barberia.vercel.app
- **TWINS:** https://twins.reservaia.cl
- **Nail Studio:** https://nailstudio.reservaia.cl
- **GitHub:** https://github.com/pabloperez-create/Twins-Barberia
- **Supabase:** https://supabase.com/dashboard/project/fgtbhkeqzcqpjhziyijt

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS 3
- **Backend:** Funciones serverless en `api/` (desplegadas en Vercel)
- **DB / Auth / Storage:** Supabase
- **Email:** Resend (dominio verificado `reservaia.cl`, from `no-reply@reservaia.cl`)
- **Calendario:** Google Calendar API (OAuth, `googleapis`)
- **WhatsApp:** Twilio (actualmente desactivado)
- **Otros:** FullCalendar (agenda), Recharts (stats), lucide-react (iconos), qrcode

## Comandos

```bash
npm run dev      # servidor de desarrollo (Vite)
npm run build    # build de producción
npm run preview  # previsualizar el build
npm run lint     # ESLint
```

## Arquitectura

### Multi-tenant por subdominio
`src/App.jsx` detecta el subdominio, lo busca en la tabla `barberia` por el campo `subdominio` y resuelve el `barberiaId` que se propaga por toda la app.

### Sistema de theming (`src/utils/tema.js`)
`getTema(barberia)` lee `barberia.tipo_barberia`:
- **barberia**: negro/dorado (`bg-stone-950`, `text-amber-200`)
- **salon**: rosado (`bg-pink-50`, `text-pink-600`)

### Feature flags (`src/utils/features.js`)
Gestiona las capacidades según el plan contratado (BASE / PLUS / PRO).

### Roles de usuario
`super_admin`, `admin`, `barbero`, `cliente`. Un usuario puede ser admin **y** barbero a la vez (ej. Alonso Flores), en cuyo caso `VistaAdmin.jsx` muestra tabs adicionales (Mi Horario / Días Libres / Mi Perfil).

## Estructura de archivos

```
api/                                # funciones serverless (Vercel)
├── send-confirmation-email.js      # confirmación (tema oscuro/dorado TWINS, logo WhatsApp, link cancelar)
├── send-reminder-emails.js         # recordatorios
├── send-cancellation-email.js      # cancelación (botón "Reservar nueva hora" → link self-service)
├── send-reassignment-email.js
├── send-inactive-clients.js        # reactivación clientes inactivos
├── send-marketing.js               # campañas
├── send-whatsapp.js                # DESACTIVADO
├── cancel-reservation.js           # cancela reserva (token HMAC + política 2h) y notifica
├── _cancel-token.js                # HMAC(reservaId, API_SECRET_TOKEN) — link de cancelación
├── google-calendar.js              # crea evento al confirmar (cliente OAuth POR-REQUEST, ver nota)
└── google-calendar-callback.js     # OAuth Google
src/
├── App.jsx                         # subdominio → barberiaId; rutas /encuesta/:id y /cancelar/:id
├── VistaInicio.jsx
├── VistaReserva-FASE3.jsx          # flujo de reserva (oculta horas pasadas si es hoy, hora de Chile)
├── VistaCancelar.jsx               # página de cancelación por cliente (/cancelar/:id?t=token)
├── VistaAdmin.jsx                  # admin; si es admin-barbero suma tabs personales (incl. Mis Reservas)
├── VistaBarbero.jsx
├── VistaSuperAdmin.jsx
├── admin/                          # TabAgenda, TabServicios, TabAdicionales, TabBarberos,
│                                   #   TabBloqueos, TabEstadisticas, TabEncuestas,
│                                   #   TabMarketing, TabConfiguracion
├── barbero/                        # TabMisReservas (asistencia + nueva cita), TabMiPerfil,
│                                   #   TabMiHorario, TabMisDiasLibres
├── components/                     # ModalNuevaCita (prop barberoFijo), Modal, SelectorHora, ...
└── utils/
    ├── features.js                 # capacidades por plan
    └── tema.js                     # theming barberia/salon
```

## Base de datos (Supabase)

Tablas principales:
1. `barberia` — `tipo_barberia`, `subdominio`, `configuracion` (jsonb)
2. `usuarios`
3. `barberos` — `foto_url`, `telefono`, `google_access_token`, `google_refresh_token`, `google_calendar_conectado`, `usuario_id` (FK → `usuarios`). **Ojo:** el barbero NO tiene email propio; su email vive en `usuarios` y se obtiene vía el join `usuario:usuario_id(email)`. (La antigua columna `barberos.email` con datos dummy fue eliminada en jun 2026.)
4. `servicios_principales` — `barbero_exclusivo_id`
5. `servicios_adicionales`
6. `reservas` — `estado` (`confirmada`/`cancelada`), `motivo_cancelacion`, `asistencia` (`asistio`/`no_asistio`/null), `creada_manualmente`. **Ojo:** la asistencia es un campo aparte de `estado` (no romper los filtros `estado === 'confirmada'`). IDs tipo `r-<timestamp>`.
7. `encuestas`
8. `bloqueos_horarios`
9. `duraciones_barbero`
10. `campanas_marketing`

**Storage buckets:** `barberos` (público, RLS activo), `Barberos` (logos).

## Email (Resend)

- Dominio verificado: `reservaia.cl`. From: `no-reply@reservaia.cl`. Puede enviar a cualquier email.
- **Flujo de confirmación:** el cliente recibe confirmación con detalles; el barbero asignado recibe "✂️ Nueva cita asignada"; el admin recibe "🆕 Nueva reserva". Si el admin es el barbero asignado → solo 1 email.

## Google Calendar

- OAuth configurado. El evento se crea automáticamente al confirmar la reserva.
- Cada barbero conecta su propio calendario desde **Mi Horario**.
- Los test users deben estar agregados en Google Cloud Console.
- ⚠️ **El `oauth2Client` se crea POR-REQUEST** dentro del handler (`api/google-calendar.js`). NO usar un cliente a nivel de módulo: se comparte entre requests concurrentes y cruza credenciales → eventos en el calendario equivocado (bug ya corregido).

## Reservas: cancelación y asistencia

- **Cancelación por cliente:** el email de confirmación trae un link `…/cancelar/:id?t=<token>`. `VistaCancelar.jsx` muestra detalles + botón confirmar → `POST /api/cancel-reservation`, que valida el token HMAC, aplica la **antelación mínima configurable por barbero** (`barberos.min_cancelacion` en minutos, default 120 = 2h; se setea en "Mi Horario"), marca `estado='cancelada'` y dispara el email de cancelación.
- **Asistencia:** en `TabMisReservas` (barbero, y admin-barbero) cada reserva confirmada tiene botones **Asistió / No llegó** que setean `reservas.asistencia`. En Estadísticas hay desglose por barbero (asistidos · inasistencias · canceladas) y los **no-shows no suman a los ingresos**.
- **Cita manual:** `ModalNuevaCita` con prop `barberoFijo` permite que cada barbero agende sus propias citas.

## Modelo de negocio (planes)

| Plan | Precio | Incluye |
|---|---|---|
| BASE | $60 USD | Reservas + email + calendario + bloqueos |
| PLUS | $80 USD | + Stats + Reasignación + WhatsApp* |
| PRO  | $120 USD | + Bot IA + Multi-sucursal + Marketing |

## Clientes activos

- **TWINS Barbería** — tipo `barberia`, plan PRO, `twins.reservaia.cl`. Lanzado. Servicio especial: Texturizado Químico solo con Alonso Flores.
- **Nail Studio** — tipo `salon`, plan PLUS, `nailstudio.reservaia.cl`. Demo funcional.

## Variables de entorno

```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_KEY
RESEND_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI   # https://twins-barberia.vercel.app/api/google-calendar-callback
```

## Hecho recientemente (jun 2026)

**Demo Barber + Galería + reseñas en la home pública (jun 2026):**
- **Demo Barber** (`demo.reservaia.cl`, tenant `org-demo-barber`): clon de Twins para mostrar el producto sin tocar clientes reales. Seed idempotente en `scripts/seed-demo-barber.mjs`. Login admin: `demo@demobarber.cl`.
- **Galería "Nuestros trabajos"**: tabla `galeria_trabajos` (RLS sel_publico anon `activo=true` + rw_staff scopeado). Carrusel `src/components/GaleriaCarrusel.jsx` (paginado: 3 desktop / 2 tablet / 1 móvil, auto 4.5s, oculto si vacío) en `VistaInicio` bajo el CTA. Admin sube/ordena/borra en tab "🖼️ Galería" (`src/admin/TabGaleria.jsx`, Storage bucket `barberos`, path `galeria/<barberiaId>/`).
- **Home reordenada**: hero top-aligned (sin `minHeight:100vh`) → CTA → galería → reseñas → `InfoContacto` (cards horario/dirección/IG movidas al final, `src/components/InfoContacto.jsx`) + línea separadora.
- **Reseñas de Google**: `api/_verify-token.js` ahora acepta `*.reservaia.cl` (antes 401 en el dominio real). `place_id` por barbería en `configuracion.google_place_id` (ya no hardcodeado en VistaInicio); si no hay, usa encuestas propias. Reseñas limitadas a 3 en una fila, texto recortado a 4 líneas, tarjetas de altura pareja.
- Marca **reservaIA** (footer/title/fallbacks; antes "AgendaIA").

Email confirmación (dorado + logo WhatsApp + link cancelar) · cancelación por cliente · email cancelación con link self-service · cita manual por barbero · fix cruce Google Calendar · ocultar horas pasadas · marcar asistencia + métricas (no-shows no suman ingresos) · tab "Mis Reservas" para admin-barbero · orden configurable de barberos (columna `barberos.orden` + flechas ↑/↓ en TabBarberos; reserva y admin ordenan por `orden`) · botón para desconectar Google Calendar · antelación mínima de cancelación configurable por barbero (`barberos.min_cancelacion`) · **fix notificación de nueva reserva a barberos no-admin**: el email del barbero vive en `usuarios` (no en `barberos`), así que la notificación interna ahora lo busca con `.select('usuario:usuario_id(email)').eq('id', barberoId)` y matchea por **id** (no por nombre, que fallaba con dos "Alonso"). Los call sites (`VistaReserva-FASE3.jsx`, `ModalNuevaCita.jsx`) ahora envían `barberoId`. Verificado en producción (mail entregado a `wolfbarbercl@gmail.com`). Se eliminó la columna huérfana `barberos.email` (tenía emails dummy tipo `alonso@twins.cl` que nadie revisaba — esa era la causa real del "no me llega").

**"Mi Agenda" para barberos + fix de zona horaria (jun 2026):** los barberos ahora tienen un tab "Mi Agenda" (calendario) además de "Mis Reservas" (lista). Se logra reutilizando `admin/TabAgenda.jsx` con un prop opcional `barberoFijo`: cuando viene, scopea reservas/bloqueos a ese barbero, oculta el filtro de barberos y fija la "nueva cita" a él (la vista admin de Alonso queda idéntica sin el prop). Además se corrigió un bug de zona horaria: `new Date().toISOString().split("T")[0]` daba la fecha en **UTC** (en la tarde chilena ya marcaba el día siguiente, rompiendo filtros "hoy"/"próximas" y los `min` de date inputs). Nuevo helper `src/utils/fecha.js` con `hoyChile()` y `ahoraChileHM()` (zona `America/Santiago`), aplicado en los ~8 lugares afectados. El filtro "Próximas" de un barbero ahora es por hora real (citas de hoy aún no pasadas + días futuros). En "Mis Reservas" hay además un **filtro por rango de fechas (Desde/Hasta)** que aparece solo al seleccionar "Todas" (acota la búsqueda; los filtros rápidos y "Limpiar" lo resetean).

**Migración de seguridad a Supabase Auth + RLS (en curso, jun 2026):**
- **Fase 1 (Auth) ✅** — los 11 usuarios existen en Supabase Auth con su password actual, linkeados vía `usuarios.auth_id`. Login **híbrido** en `App.jsx`: `handleLogin` intenta `signInWithPassword` y cae al fallback viejo (`password_hash`) como red de seguridad; `verificarSesion` usa la sesión de Auth + fallback localStorage; `handleLogout` cierra ambas. El login matchea la fila `usuarios` por `auth_id`. Script de migración one-off: `scripts/migrate-to-auth.mjs` (dry-run por defecto, `--apply`, idempotente).
- **Fase 2 (cliente centralizado) ✅** — el cliente supabase del frontend se crea en `src/lib/supabase.js` leyendo `VITE_SUPABASE_URL/KEY` de env (ya no hardcodeado en `App.jsx`). Los componentes lo reciben por prop `supabase`. Bonus: guard en las 3 funciones del flujo de reserva para no correr queries con `fecha`/`barbero` undefined (eliminaba un 400 de PostgREST).
- **Fase 1.4 (pasos 1–5) ✅ (2026-06-07)** — creación de usuarios y cambio de password migrados a Supabase Auth, y fallback `password_hash` retirado del login:
  - `api/admin-create-user.js` (nuevo, service_role): POST crea usuario en Auth + fila `usuarios` con `auth_id`; DELETE = rollback (fila + Auth). `TabBarberos.jsx` y `VistaSuperAdmin.jsx` crean usuarios vía este endpoint. `TabMiPerfil.jsx` cambia password con `signInWithPassword` + `auth.updateUser`.
  - `password_hash` es NOT NULL → el endpoint inserta un `randomUUID()` placeholder inutilizable (se elimina en el paso 6).
  - `App.jsx` `handleLogin`/`verificarSesion` ya solo usan Supabase Auth (sin fallback). Verificado: 11/11 usuarios entran por Auth.
  - ⚠️ `api/send-whatsapp.js` → renombrado a `api/_send-whatsapp.js` (estaba desactivado) para no superar el límite de 12 funciones serverless del plan Hobby. Reactivar WhatsApp = renombrar de vuelta (ojo al límite).
- **Fase 3 (RLS) — 15/15 tablas ✅ (2026-06-08)** — patrón: helpers `public.mi_barberia_id()` y `public.es_super_admin()` (SQL SECURITY DEFINER, evitan recursión en policies que leen `usuarios`), policy `sel_publico`/`sel_anon` (SELECT al público donde hace falta) y `rw_staff` (FOR ALL to authenticated, scope `barberia_id = mi_barberia_id() or es_super_admin()`).
  - Solo-backend (sin policy de cliente): `configuracion`, `estadisticas`, `google_reviews_cache`, `notificaciones`, `promociones`.
  - Solo-staff scopeado: `campanas_marketing`, `duraciones_barbero`.
  - Lectura pública + escritura aislada: `barberos`, `servicios_principales`, `servicios_adicionales`, `bloqueos_horarios`, `encuestas`, `barberia` (esta por `id`, INSERT solo super_admin).
  - `reservas`: anón SELECT+INSERT, staff aislado, anón NO update/delete; `usuarios`: anón sin acceso, self-read + staff de su barbería.
  - **Etapa B (anti-PII) ✅** — anón ya no lee PII por id adivinable:
    - `reservas`: `cancel-reservation` modo GET "detalle" (valida token HMAC) + `VistaCancelar` lee por ahí + column-GRANT que limita el SELECT anónimo a columnas de agenda.
    - `encuestas`: `save-survey` modo GET "detalle" (verifyToken) + `VistaEncuesta` lee por ahí + policy anón `sel_publico_reviews` (solo `visible_publico=true`).
  - **Endpoints `api/*` usan service_role** (no anon key): obligatorio con RLS activo. La anon key solo en el frontend.

## Pendientes

**Técnico (deuda de seguridad ⭐ — migración en curso):**
- **Fase 3 (RLS)** — completar las 4 tablas restantes: `barberia`, `encuestas`, `reservas` (cuidado PII en el SELECT anónimo), `usuarios` (la sensible). Método: SQL en el SQL Editor (CREATE POLICY explícito; el `do $$ ... format()` falla ahí), verificar con la anon key.
- **Fase 1.4 paso 6** — `DROP COLUMN usuarios.password_hash` (irreversible; backup antes; elimina los placeholders randomUUID).
- **Fase 4** rotar la publishable key y sacar credenciales del repo (es público; las `VITE_*` igual quedan embebidas en el bundle, así que rotar solo sirve con RLS activo).
- Activar WhatsApp (Twilio) — recordar des-renombrar `api/_send-whatsapp.js` y el límite de 12 funciones.

**Futuro:**
- Sincronización bidireccional Google Calendar ↔ agenda (bloqueos automáticos desde GCal)
