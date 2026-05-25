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

### Margen estimado con 10 clientes BASE:
- Ingresos: $600 USD
- Costos: ~$55 USD
- **Margen neto: ~$545 USD (~$520.000 CLP)**

---

## 📊 BASE DE DATOS (11 tablas, RLS DESACTIVADO)

1. **barberia** (con `configuracion.features` jsonb)
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
│   ├── send-confirmation-email.js     (auto-lee features + desglose adicionales)
│   ├── send-reminder-emails.js        (cron diario, auto-lee features)
│   ├── send-cancellation-email.js     (auto-lee features)
│   ├── send-reassignment-email.js     (auto-lee features)
│   └── send-whatsapp.js               ⭐ NUEVO - Twilio WhatsApp (4 tipos de mensaje)
├── src/
│   ├── App.jsx                        (arranca en "inicio" no "login")
│   ├── VistaInicio.jsx                (landing pública sin login)
│   ├── VistaReserva-FASE3.jsx         (con +569 fijo + llamada WhatsApp)
│   ├── VistaAdmin.jsx                 (feature flags + badge plan)
│   ├── VistaBarbero.jsx               (feature flags)
│   ├── VistaSuperAdmin.jsx            ⭐ ACTUALIZADO (crear barbería + dar de baja + buscador)
│   ├── admin/
│   │   ├── TabAgenda.jsx              (FullCalendar + "+ Nueva cita")
│   │   ├── TabConfiguracion.jsx
│   │   ├── TabServicios.jsx
│   │   ├── TabAdicionales.jsx
│   │   ├── TabBarberos.jsx
│   │   ├── TabBloqueos.jsx
│   │   └── TabEstadisticas.jsx        ⭐ ACTUALIZADO (Recharts completo)
│   ├── barbero/
│   │   ├── TabMisReservas.jsx
│   │   ├── TabMiPerfil.jsx
│   │   ├── TabMiHorario.jsx
│   │   └── TabMisDiasLibres.jsx
│   ├── components/
│   │   ├── Modal.jsx
│   │   ├── FeatureBloqueada.jsx
│   │   └── ModalNuevaCita.jsx         (hora 24h + adicionales)
│   └── utils/
│       └── features.js
├── vercel.json (cron 0 13 * * * = 10am Chile)
└── package.json
```

### Dependencias:
- `@supabase/supabase-js`, `lucide-react`, `resend`
- `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`, `core`
- `recharts` ✅ instalado
- `twilio` ✅ instalado

---

## ✅ FEATURES COMPLETADAS

### Flujo cliente (público)
- Landing pública sin login (VistaInicio.jsx)
- 6 pasos para reservar
- +569 fijo en campo teléfono ✅
- "Cualquier barbero" balanceado
- Excluye horarios bloqueados
- Email con desglose de adicionales
- WhatsApp de confirmación vía Twilio (desactivado por ahora)

### Email automation (5 emails con feature flags)
- ✉️ Confirmación (con/sin botón WhatsApp según feature)
- ✉️ Recordatorio día N-1 (cron 10am Chile)
- ✉️ Recordatorio HOY
- ✉️ Cancelación con motivo
- ✉️ Reasignación entre barberos

### WhatsApp (Twilio) ⭐ NUEVO
- Endpoint `/api/send-whatsapp.js` listo
- 4 tipos: confirmacion, recordatorio_24h, recordatorio_hoy, cancelacion
- Auto-lee feature flag antes de enviar
- Credenciales en Vercel env vars
- **Estado actual: DESACTIVADO** (features `whatsapp_recordatorios` y `whatsapp_confirmacion` OFF)
- Sandbox Twilio: `whatsapp:+14155238886`
- Modelo elegido: Twilio solo para notificaciones automáticas. Botón wa.me en email para conversación directa cliente↔barbería (gratis)

### Stats avanzadas (Recharts) ⭐ NUEVO
- KPIs con % vs mes anterior
- Gráfico reservas por día (30 días)
- Gráfico ingresos por mes (6 meses)
- Barras por barbero
- Pie chart servicios
- Top 5 clientes recurrentes
- Insights mejor día/hora
- Filtros: Este mes / Trimestre / Este año
- Exportar CSV

### Panel Admin Alonso (7 tabs con feature flags)
- **Agenda:** Calendario FullCalendar (Mes/Semana/Día) + "+ Nueva cita"
- Servicios, Adicionales, Barberos
- Bloqueos, Estadísticas avanzadas ✅
- Configuración

### Vista Barbero (4 tabs con feature flags)
- Mis Reservas, Mi Horario, Días Libres, Mi Perfil

### Super Admin ⭐ ACTUALIZADO
- Lista barberías con buscador + filtro activas/inactivas/todas
- Por defecto muestra solo activas
- **Crear nueva barbería** desde formulario (nombre, email, password, teléfono, plan, opcionales)
  - Features se activan automáticamente según plan
  - Crea registro en `barberia` + usuario admin en `usuarios`
- **Dar de baja / Reactivar** barberías (baja lógica, no elimina datos)
- Toggle features individuales
- Cambiar plan
- Reset features según plan
- Stats globales (barberías activas/inactivas, barberos, ingresos estimados)

### "+ Nueva cita" funcional
- Modal compacto desde Agenda
- Hora en formato 24h
- Warning de conflictos
- Admin puede forzar creación
- Email con desglose de adicionales

---

## 🔑 VARIABLES DE ENTORNO

### `.env.local` (local):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Vercel (producción):
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_KEY` ✅
- `RESEND_API_KEY` ✅
- `TWILIO_ACCOUNT_SID` ✅
- `TWILIO_AUTH_TOKEN` ✅
- `TWILIO_WHATSAPP_FROM` ✅

---

## 🤖 CRON
```json
{ "crons": [{ "path": "/api/send-reminder-emails", "schedule": "0 13 * * *" }] }
```
13:00 UTC = 10am Chile.

---

## 📱 ESTRATEGIA WHATSAPP - DECISIONES TOMADAS

### Modelo elegido: UN número tuyo (Opción A)
- Tú tienes UN número WhatsApp Business propio
- Todos los mensajes automáticos salen desde ese número
- Ejemplo: *"Recordatorio de tu cita en Twins Barbería — [tu número]"*
- Twins NO necesita número propio para notificaciones ni bot

### 3 canales independientes:
1. **Consultas cliente↔barbería** → WhatsApp Business de Alonso (gratis, su teléfono, wa.me en email)
2. **Notificaciones automáticas** → tu número Twilio (de pago, cuando actives feature)
3. **Bot IA** → tu número Twilio responde con personalidad de cada barbería (Plan PLUS/PRO)

### Pricing add-on WhatsApp para barberías:
| Reservas/mes | Costo Twilio (CLP) | Lo que cobras | Tu margen |
|---|---|---|---|
| 50 | ~$800 | $5.000 | $4.200 |
| 100 | ~$1.600 | $8.000 | $6.400 |
| 200 | ~$3.200 | $12.000 | $8.800 |
| 300 | ~$4.800 | $15.000 | $10.200 |
| 500 | ~$8.000 | $20.000 | $12.000 |

**Propuesta simple:** $10.000 CLP/mes fijo hasta 200 reservas. Ajuste si pasa de 200.

### Bot IA por plan:
- **PLUS** → bot desde TU número Twilio (más barato, menos "branded")
- **PRO** → bot desde número PROPIO de la barbería (premium, requiere trámite Meta ~2-5 días)

### Para activar número real en producción:
1. SIM nueva dedicada (~$2.000 CLP)
2. Registrar en Twilio como WhatsApp Business
3. Crear plantillas aprobadas por Meta
4. Reemplazar sandbox `+14155238886` por número real en Vercel env vars

---

## ⏳ PRÓXIMOS PASOS (en orden de prioridad)

### 🥇 PRIORIDAD 1: Mercado Pago
- Cobro de abono al reservar
- El cliente paga % del servicio al reservar
- Admin configura % de abono requerido
- Integración con API de Mercado Pago Chile

### 🥈 PRIORIDAD 2: Reactivar RLS
- Configurar policies en Supabase
- Cada usuario solo ve datos de su barbería
- Crítico antes de tener clientes reales pagando

### 🥉 PRIORIDAD 3: Activar WhatsApp Twilio cuando sea necesario
- Integrar recordatorio 24h y mismo día en cron
- Tramitar número WhatsApp Business real (cuando escale)
- Activar feature flags en Super Admin

### 4: Self-signup (cuando escale)
- Por ahora Pablo crea barberías desde Super Admin (Opción B)
- Self-signup cuando haya 10+ clientes

### 5: Mejoras UX pendientes
- Modificaciones Feature Flags (vista lista, modal simple)
- Vista de reservas para cliente logueado

---

## 🚨 LECCIONES APRENDIDAS

1. RLS Supabase activo por defecto → desactivar para apps 100% cliente
2. Error 406 = RLS o policies
3. Botones críticos validar ANTES de ejecutar
4. Vite zombies: `pkill -9 -f vite`
5. Verificar archivos con `head -3` antes de mover
6. Mac case-insensitive
7. FullCalendar dark mode = CSS custom
8. Eventos FullCalendar vista mes → `eventDisplay="block"`
9. Feature flags con jsonb permiten escalar SaaS sin tocar código
10. Plan + Add-ons modular = flexibilidad para negociaciones
11. Endpoints auto-leen features de Supabase
12. Localhost NO ejecuta /api endpoints (solo Vercel)
13. `<input type="time">` muestra formato del OS - usar 2 selects para forzar 24h
14. Columnas reales pueden tener nombres distintos a lo asumido
15. **Pantalla blanca en localhost = error JS en consola (Cmd+Option+J)** ⭐
16. **lucide-react no tiene todos los íconos - verificar versión antes de importar** ⭐
17. **Por defecto la app DEBE arrancar pública (sin login)** ⭐
18. **Componentes definidos DENTRO de otro componente = pierden foco en cada tecla** ⭐
19. **Variables de entorno Twilio = credenciales principales, no API Keys secundarias** ⭐
20. **Twilio sandbox requiere que el número destino se una primero enviando el código** ⭐

---

## 💻 COMANDOS ÚTILES
```bash
cd ~/Desktop/twins-barberia
npm run dev
pkill -9 -f vite
git add . && git commit -m "msg" && git push

# Limpiar descargas
rm ~/Downloads/*.jsx && rm ~/Downloads/*.js

# Logs Vercel
vercel logs
vercel logs | grep "send-whatsapp"

# Variables de entorno
vercel env ls
vercel env add NOMBRE production
vercel env rm NOMBRE production

# Redeploy forzado
git commit --allow-empty -m "redeploy" && git push

# Si vite no detecta cambios
rm -rf node_modules/.vite
```

---

## 📅 HISTORIAL

### Sesión 1 (10 may): Bug RLS + validaciones + Fase 3
### Sesión 2 (11 may): Email cron + balanceado + multi-tenant
### Sesión 3 (15 may): Refactor + Admin 7 tabs + Bloqueos + Calendario
### Sesión 4 (21 may): Feature Flags + Super Admin
### Sesión 5 (22 may AM): "+ Nueva cita" + email desglose adicionales
### Sesión 6 (22 may PM): Frontend pasar barberiaId + Refactor landing pública
### Sesión 7 (23 may): Fix Instagram + +569 fijo + Stats Recharts + Super Admin mejorado + Twilio WhatsApp

---

**Última actualización:** 2026-05-23 00:30 (hora Chile)

**Estado:**
- Landing pública ✅
- +569 fijo en reserva ✅
- Stats avanzadas ✅
- Super Admin crear/dar de baja/buscador ✅
- Twilio WhatsApp ✅ (instalado, desactivado)
- Mercado Pago ⏳
- RLS ⏳

---

## 🏷️ NOMBRE DEL SAAS: AgendaIA

**Dominio elegido:** `agendaia.cl`
**Estado:** Disponible en INAPI ✅

### Pendiente (en orden):
1. **Comprar dominio** `agendaia.cl` en NIC Chile (~$15 USD/año) → [nic.cl](https://www.nic.cl)
2. **Registrar marca** en INAPI (~$50.000 CLP) — protege el nombre comercialmente
3. **Conectar dominio a Vercel** — apuntar agendaia.cl al proyecto
4. **Estructura subdominios por cliente:**
   - `twins.agendaia.cl`
   - `cliente2.agendaia.cl`
   - `cliente3.agendaia.cl`

### Decisiones tomadas:
- Nombre genérico — sirve para cualquier rubro con reservas (barberías, salones, dentistas, veterinarias, etc.)
- El "IA" en el nombre posiciona el diferencial del bot para cuando se implemente
- `agendapp.cl` descartada — ya registrada en INAPI
- `agendaia.com.ar` existe pero no afecta — mercado distinto


---

## 📅 SESIÓN 8 (23 may) - COMPLETADO

### ✅ Features completadas:
1. **Filtro por barbero en agenda** — botones clickeables con contador de reservas
2. **Popup agenda con scroll** — altura limitada a ~5-7 items
3. **QR de reservas** — en TabConfiguracion, descargable como PNG
4. **Fix botón WhatsApp en emails** — siempre visible, independiente de Twilio
5. **Encuestas de satisfacción completas:**
   - Email post-cita con caritas 1-5 (cron diario)
   - Página pública `/encuesta/:id` para responder
   - Tab admin ⭐ Encuestas con stats + distribución + toggle público/oculto
   - Reseñas visibles en landing (configurable por admin)
6. **Marketing email:**
   - Tab 📣 Marketing en admin
   - Composer con asunto, mensaje personalizable ({nombre}), promo % o monto fijo, código promo
   - Campañas programadas por día (cron diario 11am Chile)
   - Lista de campañas con estado programada/enviada/cancelada
   - Stats: clientes en lista, programadas, emails enviados

### ⚠️ Limitación Vercel Hobby:
- Crons solo pueden correr 1 vez al día (no por hora)
- Marketing corre a las 14:00 UTC (11am Chile)
- Para crons por hora necesita Vercel Pro ($20 USD/mes)

### 🔴 Pendiente mañana:
1. **RLS** — seguridad antes de clientes reales (sesión dedicada)
2. **Dominio agendaia.cl** — comprar en NIC Chile + conectar Vercel
3. **Pitch comercial** — video demo + mensaje WSP


---

## 📅 SESIÓN 9 (24-25 may) - COMPLETADO

### ✅ Features completadas:
1. **PDF planes AgendaIA** — 3 planes en CLP + add-ons con márgenes
2. **Análisis competencia** — AgendaPro + Setmore
3. **Mensaje pitch** — WhatsApp/Instagram con +56967402940
4. **Agenda móvil** — Día por defecto, Semana disponible, Mes oculto en móvil
5. **PWA** — instala como app nativa, botón solo en panel admin/barbero
6. **Notificación email a admin y barbero** en cada reserva nueva:
   - 🆕 Nueva reserva → admin (barberia.email_admin)
   - ✂️ Nueva cita asignada → barbero (barberos.email, si distinto al admin)
   - Nueva columna `email` agregada a tabla `barberos`

### ⚠️ IMPORTANTE antes de RLS:
- Emails en Supabase están en `pablo.felipee.ps@gmail.com` para demo
- Revertir a @twins.cl antes de activar RLS:
  - `barberia.email_admin` → `alonso@twins.cl`
  - `barberos.email` Alonso → `alonso@twins.cl`
  - `barberos.email` Vicente → `vicente@twins.cl`

### 🔴 Pendiente próxima sesión:
1. **RLS** — seguridad antes de clientes reales (recordar revertir emails primero)
2. **Dominio agendaia.cl** — comprar en NIC Chile + conectar Vercel
3. **Video demo** — grabar con Screen Studio

