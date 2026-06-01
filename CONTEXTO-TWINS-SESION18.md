# 📋 TWINS BARBERÍA - CONTEXTO COMPLETO

## 🎯 PROYECTO
SaaS multi-tenant de reservas para barberías. TWINS = cliente piloto.

## 🔗 URLs
- **Live:** https://twins-barberia.vercel.app
- **GitHub:** https://github.com/pabloperez-create/Twins-Barberia
- **Supabase:** https://supabase.com/dashboard/project/fgtbhkeqzcqpjhziyijt
- **Local:** `~/Desktop/twins-barberia`

## 💳 Supabase
```
URL: https://fgtbhkeqzcqpjhziyijt.supabase.co
KEY: sb_publishable_8E23tN1s3wbAIqjhX-1icg_VBCYqsMO
```

## 👥 USUARIOS

| Email | Password | Rol |
|-------|----------|-----|
| `pablo@twinsapp.cl` | `pablo2026` | **super_admin** ⭐ |
| `alonso@twins.cl` | `hash_alonso123` | admin |
| `vicente@twins.cl` | `twins123` | barbero |
| `johans@twins.cl` | `twins123` | barbero |
| `jose@twins.cl` | `twins123` | barbero |
| `cliente@twins.cl` | `cliente123` | cliente |
| `admin@nailstudio.cl` | `nailstudio2026` | admin (Nail Studio) |

**Email testing (Resend):** `pablo.felipee.ps@gmail.com`
**WhatsApp testing:** `56967402940`

---

## 💰 MODELO DE NEGOCIO

### Planes (precio fijo mensual en USD):

| Plan | Precio | CLP (~$950) | Incluye |
|---|---|---|---|
| **BASE** | $60 USD | ~$57.000 | Reservas + email + calendario + bloqueos |
| **PLUS** | $80 USD | ~$76.000 | + Stats avanzadas + Reasignación + WhatsApp* |
| **PRO** | $120 USD | ~$114.000 | + Bot IA + Multi-sucursal + Marketing |

*WhatsApp automático = +$10.000 CLP si lo activan (incluido en PLUS)

### Add-ons (sobre plan BASE):

| Add-on | Costo real/mes | Cobro cliente | Tu margen |
|---|---|---|---|
| **WhatsApp recordatorios** | ~$3-5 USD (Twilio) | $15 USD | ~$10-12 USD |
| **Stats avanzadas** | $0 (ya construido) | $10 USD | $10 USD |
| **Reasignación barberos** | $0 (ya construido) | $10 USD | $10 USD |
| **Bot IA WhatsApp** | ~$10-15 USD (Claude API + Twilio) | $40 USD | ~$25-30 USD |
| **Multi-sucursal** | $0 (ya construido) | $25 USD | $25 USD |
| **Marketing automatizado** | ~$5-8 USD (Resend extra) | $20 USD | ~$12-15 USD |

**Regla:** PLUS siempre más barato que BASE + sus add-ons por separado → empuja upsell natural.

### Costos fijos plataforma:

| Servicio | Hoy | Con 10+ clientes |
|---|---|---|
| Vercel | $0 (Hobby) | $20 USD (Pro) |
| Supabase | $0 (Free) | $0 (Free por largo tiempo) |
| Resend | $0 (hasta 3.000 emails) | $20 USD (Pro, +3.000 emails) |
| Twilio | $0 (desactivado) | Variable según uso |
| **Total** | **$0** | **~$40-65 USD** |

---

## 📊 BASE DE DATOS (11 tablas, RLS DESACTIVADO)

1. **barberia** (con `configuracion.features` jsonb, `tipo_barberia` TEXT — 'barberia' | 'salon')
2. **usuarios** (admin, barbero, cliente, super_admin)
3. **barberos**
4. **servicios_principales**
5. **servicios_adicionales**
6. **promociones**
7. **reservas** ⭐
8. **notificaciones**
9. **configuracion**
10. **estadisticas**
11. **bloqueos_horarios**
12. **duraciones_barbero** (barbero_id, servicio_id, duracion_minutos, tipo: 'servicio'|'adicional')

### Columnas clave de `barberia`:
```
id, nombre, plan, tipo_barberia ('barberia'|'salon'), logo_url,
email_admin, configuracion (jsonb con features, whatsapp, instagram,
horario_atencion, google_place_id, marketing_inactivos)
```

### Columnas de `reservas`:
```
id, barberia_id, barbero_id, servicio_id, adicionales_ids (ARRAY),
cliente_nombre, cliente_telefono, cliente_email,
fecha, hora_inicio, duracion_minutos,
precio_original, precio_final, abono_requerido, abono_pagado,
promocion_id, estado,
recordatorio_24h_enviado, recordatorio_1h_enviado,
notas, fecha_creacion, fecha_actualizacion,
recordatorio_email_enviado_at, motivo_cancelacion,
creada_manualmente (boolean), creada_por_usuario_id
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
~/Desktop/twins-barberia/
├── api/
│   ├── send-confirmation-email.js
│   ├── send-reminder-emails.js
│   ├── send-cancellation-email.js
│   ├── send-reassignment-email.js
│   ├── send-whatsapp.js               ⭐ Twilio WhatsApp (4 tipos)
│   ├── send-inactive-clients.js       ⭐ Marketing "Te echamos de menos"
│   ├── google-calendar.js             ⭐ Crea eventos en Google Calendar
│   └── google-calendar-callback.js    ⭐ OAuth Google
├── src/
│   ├── App.jsx
│   ├── VistaInicio.jsx
│   ├── VistaReserva-FASE3.jsx
│   ├── VistaAdmin.jsx                 ⭐ ACTUALIZADO — pasa tema a todos los tabs
│   ├── VistaBarbero.jsx               ⭐ ACTUALIZADO — pasa tema a todos los tabs
│   ├── VistaSuperAdmin.jsx
│   ├── admin/
│   │   ├── TabAgenda.jsx              ⭐ TEMATIZADO
│   │   ├── TabConfiguracion.jsx       ⭐ TEMATIZADO
│   │   ├── TabServicios.jsx           ⭐ TEMATIZADO + botón reactivar servicio
│   │   ├── TabAdicionales.jsx         ⭐ TEMATIZADO + botón reactivar adicional
│   │   ├── TabBarberos.jsx            ⭐ TEMATIZADO
│   │   ├── TabBloqueos.jsx            ⭐ TEMATIZADO
│   │   ├── TabEstadisticas.jsx        ⭐ TEMATIZADO
│   │   ├── TabEncuestas.jsx           ⭐ TEMATIZADO
│   │   └── TabMarketing.jsx           ⭐ TEMATIZADO
│   ├── barbero/
│   │   ├── TabMisReservas.jsx         ⭐ TEMATIZADO
│   │   ├── TabMiPerfil.jsx            ⭐ TEMATIZADO
│   │   ├── TabMiHorario.jsx           ⭐ TEMATIZADO
│   │   └── TabMisDiasLibres.jsx       ⭐ TEMATIZADO
│   ├── components/
│   │   ├── Modal.jsx
│   │   ├── FeatureBloqueada.jsx
│   │   └── ModalNuevaCita.jsx
│   └── utils/
│       ├── features.js
│       └── tema.js                    ⭐ NUEVO — paleta centralizada barbería vs salón
├── vercel.json (cron 0 13 * * * = 10am Chile)
└── package.json
```

---

## 🎨 SISTEMA DE THEMING (SESIÓN 18)

### `src/utils/tema.js`
Paleta centralizada con dos temas:
- **barberia**: negro/dorado (`bg-stone-950`, `text-amber-200`, etc.)
- **salon**: rosado (`bg-pink-50`, `text-pink-600`, etc.)

### `getTema(barberia)`
Lee `barberia.tipo_barberia` ('salon' | 'barberia') y retorna el objeto de tema.

### Propiedades del tema:
```js
{
  bg, bgCard, bgInput, bgHover, bgMuted,
  border, borderInput,
  texto, textoSub, textoMuted,
  acento, acentoBg, acentoBgHover, acentoText, acentoBgOpacity,
  tabActivo, tabInactivo,
  boton,
  filtroActivo, filtroInactivo,
  badgePro, badgePlus, badgeBase,
  calendarCSS,        // CSS inyectado en TabAgenda para FullCalendar
  tooltipStyle,       // Para Recharts
  chartColor,         // Color principal de gráficos
  chartColors,        // Array de colores para pie charts
  tipo,               // 'barberia' | 'salon'
}
```

### Columna BD requerida:
```sql
-- Ya ejecutado en producción:
ALTER TABLE barberia ADD COLUMN tipo_barberia TEXT DEFAULT 'barberia';
UPDATE barberia SET tipo_barberia = 'salon' WHERE nombre ILIKE '%nail%';
UPDATE barberia SET tipo_barberia = 'barberia' WHERE nombre ILIKE '%twins%';
```

### Labels dinámicos por tipo:
- `salon`: "Estilistas", "estilista", "salón", "sesión"
- `barberia`: "Barberos", "barbero", "barbería", "corte"

---

## ✅ FEATURES COMPLETADAS

### Flujo cliente (público)
- Landing pública sin login (VistaInicio.jsx)
- 6 pasos para reservar
- +569 fijo en campo teléfono ✅
- "Cualquier barbero/estilista" balanceado ✅
- Excluye horarios bloqueados
- Email con desglose de adicionales
- WhatsApp de confirmación vía Twilio (desactivado por ahora)
- Terminología dinámica según tipo (salón vs barbería) ✅

### Email automation (5 emails con feature flags)
- ✉️ Confirmación (colores dinámicos según tipo)
- ✉️ Recordatorio día N-1 (cron 10am Chile)
- ✉️ Recordatorio HOY
- ✉️ Cancelación con motivo
- ✉️ Reasignación entre barberos

### WhatsApp (Twilio)
- Endpoint `/api/send-whatsapp.js` listo
- 4 tipos: confirmacion, recordatorio_24h, recordatorio_hoy, cancelacion
- **Estado actual: DESACTIVADO**
- Sandbox Twilio: `whatsapp:+14155238886`

### Panel Admin/Barbero
- Feature flags + badge plan ✅
- Theming completo barbería vs salón ✅
- Google Calendar integrado (OAuth) ✅
- Bloqueos recurrentes ✅
- Estadísticas con Recharts ✅
- Marketing automatizado + "Te echamos de menos" ✅
- Encuestas + Google Reviews ✅
- Foto de barbero/estilista ✅
- Intervalo entre citas configurable ✅
- Duración personalizada por barbero ✅
- Categorías en servicios ✅
- Botón reactivar servicios/adicionales desactivados ✅
- Login page tema dinámico (rosado/negro según tipo) ✅
- Logo de la barbería en VistaInicio ✅
- Logo Instagram SVG real ✅
- QR de reservas descargable ✅

### Dominio
- **reservaia.cl** comprado en NIC Chile
- Nameservers Vercel configurados (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`)
- ⏳ Propagación DNS pendiente de verificar

---

## 🔑 VARIABLES DE ENTORNO (Vercel + .env.local)
```
SUPABASE_URL
SUPABASE_KEY (publishable)
SUPABASE_SERVICE_KEY
RESEND_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = https://twins-barberia.vercel.app/api/google-calendar-callback
```

---

## 🧩 CLIENTES ACTUALES

### TWINS Barbería (org-twins)
- **Tipo:** barberia
- **Plan:** PRO
- **Admin:** alonso@twins.cl / hash_alonso123
- **Barberos:** Vicente, Johans, José
- **Estado:** piloto, datos de prueba — pendiente onboarding con datos reales de Alonso

### Nail Studio (org-nailstudio)
- **Tipo:** salon
- **Plan:** PLUS
- **Admin:** admin@nailstudio.cl / nailstudio2026
- **Estilistas:** Ana, Camila
- **Estado:** demo funcional con tema rosado

---

## 📅 SESIÓN 18 (31 may noche) - COMPLETADO

### ✅ Features completadas:
1. **Sistema de theming centralizado** — `src/utils/tema.js` con paletas barbería (negro/dorado) y salón (rosado)
2. **VistaAdmin + VistaBarbero tematizados** — pasan prop `tema` a todos los tabs
3. **Todos los tabs tematizados** (9 admin + 4 barbero) — colores, inputs, botones, calendario FullCalendar, gráficos Recharts, labels dinámicos
4. **Columna `tipo_barberia`** en tabla `barberia` — 'barberia' | 'salon'
5. **Botón reactivar** servicios y adicionales desactivados (bug pre-existente corregido)
6. **Deploy en producción** — verificado: Nail Studio rosado 🌸, TWINS negro/dorado 🖤

### 🗄️ Tablas modificadas:
- `barberia`: + `tipo_barberia` TEXT DEFAULT 'barberia'

### 🔴 Pendientes próximas sesiones:
1. **Onboardear TWINS** — datos reales de Alonso (servicios, barberos, horarios, emails reales)
2. **Migrar Supabase Auth + RLS** — antes del segundo cliente
3. **Dominio reservaia.cl** — verificar propagación DNS
4. **WhatsApp Twilio** para Alonso (add-on +$10.000-15.000 CLP/mes)
