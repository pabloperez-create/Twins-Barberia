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
api/                                # funciones serverless (Vercel) — LÍMITE 12 en plan Hobby (los `_*` no cuentan)
├── send-confirmation-email.js      # confirmación (cliente + barbero). Envíos con reintento (2x) e INDEPENDIENTES
│                                   #   (si falla el del cliente igual se avisa al barbero). Marca reservas.barbero_notificado_at al OK.
├── send-reminder-emails.js         # cron diario 13:00 UTC: recordatorios (mañana) + encuestas (ayer) +
│                                   #   "Agenda de hoy" al email_admin (flag resumen_diario_admin) + BARRIDO de avisos al
│                                   #   barbero pendientes (barbero_notificado_at IS NULL) como red de seguridad
├── send-cancellation-email.js      # cancelación (botón "Reservar nueva hora" → link self-service)
├── send-reassignment-email.js
├── send-inactive-clients.js        # reactivación clientes inactivos (cron)
├── send-marketing.js               # campañas (cron)
├── _send-whatsapp.js               # DESACTIVADO (renombrado con _ para no contar en el límite de 12)
├── admin-create-user.js            # crea usuario Auth + fila usuarios (service_role, exige JWT + rol)
├── cancel-reservation.js           # cancela reserva (token HMAC + antelación por barbero) y notifica
├── get-google-reviews.js           # reseñas de Google por place_id
├── save-survey.js                  # guarda encuesta de satisfacción
├── _verify-token.js / _cancel-token.js  # helpers HMAC / Origin (no son funciones desplegadas)
├── google-calendar.js              # crea evento al confirmar (cliente OAuth POR-REQUEST, ver nota)
└── google-calendar-callback.js     # OAuth Google
src/
├── App.jsx                         # subdominio → barberiaId; rutas /encuesta/:id y /cancelar/:id
├── VistaInicio.jsx
├── VistaReservaNueva.jsx           # ⭐ FLUJO DE RESERVA OFICIAL (rediseño shadcn jul 2026): sidebar 2 col + stepper +
│                                   #   grid de servicios (íconos dorados) + resumen sticky; mobile = filas horizontales +
│                                   #   encabezado compacto colapsable. (Reemplazó a VistaReserva-FASE3.jsx, eliminado.)
├── VistaCancelar.jsx               # página de cancelación por cliente (/cancelar/:id?t=token)
├── VistaAdmin.jsx / VistaBarbero.jsx / VistaSuperAdmin.jsx / VistaEncuesta.jsx
├── admin/                          # TabAgenda, TabServicios, TabAdicionales, TabBarberos, TabBloqueos,
│                                   #   TabEstadisticas, TabEncuestas, TabMarketing, TabConfiguracion, TabGaleria
├── barbero/                        # TabMisReservas, TabMiPerfil, TabMiHorario, TabMisDiasLibres
├── components/                     # ModalNuevaCita (barberoFijo), GaleriaCarrusel, InfoContacto, ui/ (shadcn), ...
├── components/ui/                  # shadcn/ui (button, card, input, label, separator, badge, radio-group)
├── lib/
│   ├── supabase.js                 # cliente frontend (anon key)
│   └── utils.js                    # cn() de shadcn
└── utils/
    ├── features.js                 # capacidades por plan
    ├── fecha.js                    # hoyChile() / ahoraChileHM() (America/Santiago)
    ├── barberiaCols.js             # COLS_PUBLICAS_BARBERIA
    └── tema.js                     # theming barberia/salon (clases). Puente a tokens shadcn en src/index.css
```

**Stack UI (jul 2026):** shadcn/ui sobre Tailwind v3 (alias `@/` en `vite.config.js`, `components.json` con `tsx:false`). Puente de theming en `src/index.css`: tokens shadcn como variables CSS — `:root` = barbería (negro/dorado), `.theme-salon` = salón (rosado); `tailwind.config.js` mapea los tokens. Así shadcn se adapta por tenant sin tocar `getTema()`.

## Base de datos (Supabase)

Tablas principales:
1. `barberia` — `tipo_barberia`, `subdominio`, `configuracion` (jsonb)
2. `usuarios`
3. `barberos` — `foto_url`, `telefono`, `google_access_token`, `google_refresh_token`, `google_calendar_conectado`, `usuario_id` (FK → `usuarios`). **Ojo:** el barbero NO tiene email propio; su email vive en `usuarios` y se obtiene vía el join `usuario:usuario_id(email)`. (La antigua columna `barberos.email` con datos dummy fue eliminada en jun 2026.)
4. `servicios_principales` — `barbero_exclusivo_id`
5. `servicios_adicionales`
6. `reservas` — `estado` (`confirmada`/`cancelada`), `motivo_cancelacion`, `asistencia` (`asistio`/`no_asistio`/null), `creada_manualmente`, `recordatorio_email_enviado_at`, `barbero_notificado_at` (ago 2026: marca que al barbero ya se le avisó; el barrido diario reenvía las que quedan NULL). **Ojo:** la asistencia es un campo aparte de `estado` (no romper los filtros `estado === 'confirmada'`). IDs tipo `r-<timestamp>`.
7. `encuestas`
8. `bloqueos_horarios` — `barbero_id` (null = toda la barbería), `fecha_inicio`/`fecha_fin`, `hora_inicio`/`hora_fin` (null = día completo), `dias_semana` (int[] JS Dom=0..Sáb=6; si tiene valores = bloqueo RECURRENTE que solo aplica esos días, con `fecha_fin` lejana tipo 2099).
9. `duraciones_barbero`
10. `campanas_marketing`
11. `galeria_trabajos` — fotos "Nuestros trabajos" (`foto_url`, `orden`, `activo`)
12. `audit_log` — auditoría de cambios (trigger `fn_audit`)

**`barberia.configuracion` (jsonb) — claves usadas:** `direccion`, `whatsapp`, `horario_atencion`, `google_place_id`, `instagram`, `features` (flags por plan/feature, ej. `resumen_diario_admin`, `whatsapp_recordatorios`). `barberia.email_admin` (columna, no en configuracion) = destino del resumen diario.

**Storage buckets:** `barberos` (público, RLS activo), `Barberos` (logos).

## Email (Resend)

- Dominio verificado: `reservaia.cl`. From: `no-reply@reservaia.cl`. Plan **free** (100/día — techo diario es el limitante; ~65-72/día real).
- **Confirmación (`send-confirmation-email`):** 2 emails por reserva — cliente ("Reserva confirmada") + barbero asignado ("✂️ Nueva cita asignada"). El admin YA NO recibe copia por reserva (se quitó para bajar volumen). Ambos envíos con **reintento (2x)** e **INDEPENDIENTES** (si falla el del cliente, igual se avisa al barbero). El email del barbero se resuelve por `barberos.usuario_id → usuarios.email`.
- **Resumen diario "Agenda de hoy" al admin** (idea implementada ago 2026, piggyback en `send-reminder-emails`): 1 email/día al `barberia.email_admin` con las citas confirmadas de hoy agrupadas por barbero. Opt-in por flag `configuracion.features.resumen_diario_admin`.
- **Barrido anti-fallo (red de seguridad):** el mismo cron reenvía el aviso al barbero de reservas confirmadas de hoy/futuras con `barbero_notificado_at IS NULL`. Cubre fallos del envío del momento. Hueco residual (Hobby, cron 1x/día): reserva del mismo día hecha después del barrido para una cita ese mismo día cuyo envío del momento también falle → recién al día siguiente.
- **Recordatorios/encuestas:** `send-reminder-emails` (cron 13:00 UTC ≈ 09:00 Chile) manda recordatorio a citas de mañana y encuesta de satisfacción a citas de ayer.

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

**Migración de seguridad a Supabase Auth + RLS (✅ completada, jun 2026):**
- **Fase 1 (Auth) ✅** — los 11 usuarios existen en Supabase Auth con su password actual, linkeados vía `usuarios.auth_id`. Login **híbrido** en `App.jsx`: `handleLogin` intenta `signInWithPassword` y cae al fallback viejo (`password_hash`) como red de seguridad; `verificarSesion` usa la sesión de Auth + fallback localStorage; `handleLogout` cierra ambas. El login matchea la fila `usuarios` por `auth_id`. Script de migración one-off: `scripts/migrate-to-auth.mjs` (dry-run por defecto, `--apply`, idempotente).
- **Fase 2 (cliente centralizado) ✅** — el cliente supabase del frontend se crea en `src/lib/supabase.js` leyendo `VITE_SUPABASE_URL/KEY` de env (ya no hardcodeado en `App.jsx`). Los componentes lo reciben por prop `supabase`. Bonus: guard en las 3 funciones del flujo de reserva para no correr queries con `fecha`/`barbero` undefined (eliminaba un 400 de PostgREST).
- **Fase 1.4 (pasos 1–5) ✅ (2026-06-07)** — creación de usuarios y cambio de password migrados a Supabase Auth, y fallback `password_hash` retirado del login:
  - `api/admin-create-user.js` (nuevo, service_role): POST crea usuario en Auth + fila `usuarios` con `auth_id`; DELETE = rollback (fila + Auth). `TabBarberos.jsx` y `VistaSuperAdmin.jsx` crean usuarios vía este endpoint. `TabMiPerfil.jsx` cambia password con `signInWithPassword` + `auth.updateUser`.
  - **Paso 6 ✅ (2026-06-08)** — `DROP COLUMN usuarios.password_hash` ejecutado (backup en `~/twins-password_hash-backup-20260608.json`; los placeholders `randomUUID()` se fueron con la columna). Verificado: la columna no existe, crear usuario y login siguen OK. `scripts/migrate-to-auth.mjs` quedó obsoleto (referencia `password_hash`, era one-off ya ejecutado — no volver a correr).
  - **Endurecimiento de endpoints ✅ (2026-06-08)** — `admin-create-user` exige JWT de Supabase Auth + rol (super_admin todo; admin solo barberos de su barbería); antes era spoofeable por Origin. Los 3 crons exigen `Authorization: Bearer $CRON_SECRET`. Verificado e2e (401 sin token, 403 cross-barbería, crons OK).
  - **Fix leak `barberia` ✅ (2026-06-29)** — anón ya no lee `email_admin`/`notas`/`monto_mensual`/fechas de pago: los selects anónimos usan `COLS_PUBLICAS_BARBERIA` (`src/utils/barberiaCols.js`) + `revoke/grant` de columnas + policies `sel_publico` (anon) / `sel_auth` (authenticated scopeado). Cerró también el cross-tenant de authenticated.
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

## Hecho recientemente (jul 2026)

**Fixes de reserva y auditoría (jun–jul 2026):**
- **Duración por barbero ✅** (`9857d4e`/`f430308`, 2026-06-26; re-fix RLS 2026-07-04): el flujo público ahora respeta `duraciones_barbero` (duración custom por barbero+servicio) en vez de la global del servicio. El re-fix del 04-jul fue por RLS: `duraciones_barbero` estaba "solo staff" → el visitante anónimo veía 0 filas y caía a la global; policy `sel_publico` (anon) agregada. **Lección: al arreglar flujos públicos, verificar SIEMPRE con el rol anon real.**
- **Teléfono +56 fijo ✅** (`32e33a3`/`5b19531`, 2026-06-26): `VistaReserva` y `ModalNuevaCita` fuerzan prefijo `+56` + 9 dígitos → formato `+56XXXXXXXXX` consistente para WhatsApp/Twilio.
- **Reagendar desde cancelación ✅** (`a6dcf06`, 2026-06-26): email de confirmación dice "Cancela o reagenda"; `VistaCancelar` muestra botón "Reservar nueva hora". Reagendar = cancelar + reservar de nuevo (no hay cambio de fecha/hora en 1 paso).
- **Bajar volumen de email ✅** (`8559f4c`, 2026-07-02): `send-confirmation-email` ya NO manda copia "nueva reserva" al admin (redundante, la ve en su panel) → 2 emails/reserva (cliente + barbero) en vez de 3. Se optó por quedarse en Resend free optimizando (subir a Pro cuando entre un 2º cliente pagando).
- **Fix doble-booking ✅** (`dd960ea`/`407aa06`, 2026-07-04): 3 capas — (1) slots ocupados no aparecen al cargar; (2) `confirmarReserva` re-valida solape antes del insert; (3) trigger BD `fn_no_solape_reserva`. Distingue por `creada_manualmente`: público (false) bloquea, admin (true) pasa (conserva override).
- **Auditoría de cambios ✅** (2026-06-26, SQL): tabla `audit_log` + `public.fn_audit()` (SECURITY DEFINER, captura `auth.uid()`→email, diff de columnas). Triggers AFTER en `barberos`, `servicios_principales`, `servicios_adicionales`, `duraciones_barbero`, `barberia` y `reservas` (solo UPDATE/DELETE). No es retroactivo. RLS activa, se consulta vía service_role/dashboard (no hay UI aún).

## Hecho recientemente (jul–ago 2026)

**Rediseño del flujo de reserva con shadcn/ui ✅ DESPLEGADO (2026-07-28):** `VistaReservaNueva.jsx` es el flujo oficial (se eliminó `VistaReserva-FASE3.jsx` y el flag `?ui=nuevo`). Reutiliza toda la lógica de reserva anterior (slots, anti-doble-booking, duración por barbero, emails, GCal). Desktop: sidebar 2 columnas (logo, dirección, teléfono, horario, reseñas de Google en vivo, carrusel "Nuestros trabajos") + stepper horizontal + grid de servicios con **íconos dorados auto-generados por nombre** (`IconoServicio`: tijera/máquina/bigote/navaja/gota/ondas/pincel/secador) + barra de resumen sticky. Mobile: encabezado compacto con "Información y horarios" colapsable (sin galería) + servicios en **filas horizontales**. Modelo: 1 servicio principal + adicionales (sin mostrar duración, porque varía por barbero).

**Resumen diario "Agenda de hoy" al admin ✅ DESPLEGADO (2026-07-30):** ver sección Email. Piggyback en `send-reminder-emails` (sin función nueva → respeta límite 12 Hobby). Flag `resumen_diario_admin` (activo en Twins).

**Robustez de avisos al barbero ✅ DESPLEGADO (2026-07-30):** Capa 1 (endpoint: reintento + barbero independiente del cliente + marca `barbero_notificado_at`) + Capa 2 (barrido diario en el cron). Diagnóstico del bug original: un aviso puntual falló transitoriamente y dejó al barbero (Alonso González) sin email; se notaba porque recibe muy pocas reservas. NO era dato malo ni regresión. (Tip: `GET https://api.resend.com/emails?limit=100` con RESEND_API_KEY audita qué se envió/entregó.)

**Bloqueos de horario recurrentes ✅ DESPLEGADO (2026-08-07, commit `dc0f009`):** estaban a medias — la UI admin (`TabBloqueos` "🔁 Recurrente") y la columna `bloqueos_horarios.dias_semana` existían, pero el flujo de reserva IGNORABA `dias_semana` (bloqueaba todos los días del rango) y `TabAgenda` se colgaba iterando hasta 2099. Fix: helper `bloqueoAplicaPorDia(b, fecha)` en `VistaReservaNueva` (aplicado en `obtenerBloqueosDelBarbero`, `cargarHorariosBarbero` y el check de barbería cerrada) + `TabAgenda` topa a 120 días y respeta `dias_semana`. Sin SQL (la columna ya existía). Verificado en `org-demo-barber`.

**⚠️ Deploy:** el auto-deploy por `git push` a `main` funciona pero **ocasionalmente el webhook no dispara** (hipo transitorio, no desconexión). Si un push no despliega en ~5 min: re-disparar con `git commit --allow-empty` + push, o `vercel deploy --prod --yes` (manual). El CLI local está desactualizado (v54 vs v58).

## Pendientes

**Técnico:**
- **Activar WhatsApp (Twilio)** — 🔴 bloqueante externo: WhatsApp Sender + templates aprobados por Meta. Luego: liberar 1 slot de función (límite Hobby 12) + des-renombrar `api/_send-whatsapp.js` → `send-whatsapp.js` + activar flag por barbería. El re-cableado de las 3 llamadas (confirmación/recordatorio/cancelación) ya está hecho e inerte.
- **Fase 4 (baja prioridad)** — rotar la publishable key y sacar credenciales del repo (es público). Poco útil hoy: las `VITE_*` quedan embebidas en el bundle igual; con RLS activo el riesgo ya está acotado.
- **Menor** — los `send-*-email` llamados desde el browser aún usan `verifyToken` (Origin); riesgo de spam acotado, follow-up de baja prioridad.

**Futuro:**
- Sincronización bidireccional Google Calendar ↔ agenda (bloqueos automáticos desde GCal)
- Cerrar el hueco residual del aviso al barbero (reserva mismo-día post-barrido con envío fallido) requeriría crons frecuentes (plan Pro) o webhook al insertar reserva.
