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
├── send-confirmation-email.js      # confirmación (fondo oscuro TWINS)
├── send-reminder-emails.js         # recordatorios
├── send-cancellation-email.js
├── send-reassignment-email.js
├── send-inactive-clients.js        # reactivación clientes inactivos
├── send-marketing.js               # campañas
├── send-whatsapp.js                # DESACTIVADO
├── google-calendar.js              # crea evento al confirmar reserva
└── google-calendar-callback.js     # OAuth Google
src/
├── App.jsx                         # detección subdominio → barberiaId
├── VistaInicio.jsx
├── VistaReserva-FASE3.jsx          # flujo de reserva (filtros, foto, exclusividad, GCal, intervalo dinámico)
├── VistaAdmin.jsx
├── VistaBarbero.jsx
├── VistaSuperAdmin.jsx
├── admin/                          # TabAgenda, TabServicios, TabAdicionales, TabBarberos,
│                                   #   TabBloqueos, TabEstadisticas, TabEncuestas,
│                                   #   TabMarketing, TabConfiguracion
├── barbero/                        # TabMisReservas, TabMiPerfil, TabMiHorario, TabMisDiasLibres
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
6. `reservas`
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

## Pendientes

**Features próximas:**
- Cancelación de reserva por cliente (link en email de confirmación)
- Orden configurable de barberos (campo `orden` + drag-and-drop en TabBarberos)
- Revisar email oscuro TWINS en modo día (posible revert a `#f5f5f5`)

**Técnico:**
- Migrar a Supabase Auth + RLS
- Activar WhatsApp (Twilio)
- Conexión de Google Calendar por cada barbero

**Futuro:**
- Sincronización bidireccional Google Calendar ↔ agenda (bloqueos automáticos desde GCal)
