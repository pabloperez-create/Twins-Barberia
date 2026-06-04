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
3. `barberos` — `foto_url`, `telefono`, `google_access_token`, `google_refresh_token`, `google_calendar_conectado`
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

- **Cancelación por cliente:** el email de confirmación trae un link `…/cancelar/:id?t=<token>`. `VistaCancelar.jsx` muestra detalles + botón confirmar → `POST /api/cancel-reservation`, que valida el token HMAC, aplica política de **2h de antelación**, marca `estado='cancelada'` y dispara el email de cancelación.
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
Email confirmación (dorado + logo WhatsApp + link cancelar) · cancelación por cliente · email cancelación con link self-service · cita manual por barbero · fix cruce Google Calendar · ocultar horas pasadas · marcar asistencia + métricas (no-shows no suman ingresos) · tab "Mis Reservas" para admin-barbero.

## Pendientes

**Features próximas:**
- Orden configurable de barberos (campo `orden` + drag-and-drop en TabBarberos)

**Técnico (deuda de seguridad ⭐):**
- Migrar a Supabase Auth + RLS — hoy las contraseñas se guardan en texto plano en `usuarios.password_hash` y RLS está apagado (anon key hardcodeado en `App.jsx` da acceso total). Repo público.
- Activar WhatsApp (Twilio)
- Conexión de Google Calendar por cada barbero

**Futuro:**
- Sincronización bidireccional Google Calendar ↔ agenda (bloqueos automáticos desde GCal)
