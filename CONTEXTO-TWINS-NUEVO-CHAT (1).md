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


---

## 📅 SESIÓN 10 (26 may) - COMPLETADO

### ✅ Features completadas:
1. **Reseñas Google** con caché 24h en Supabase
   - Endpoint `/api/get-google-reviews.js`
   - Place ID TWINS: `ChIJGZpoFlLnYpYRQXK09YRxhgk`
   - Solo muestra reseñas 4-5 estrellas, máximo 6
   - Variable de entorno: `GOOGLE_PLACES_API_KEY` en Vercel y .env.local
   - Tabla `google_reviews_cache` en Supabase
2. **Horario por día de la semana** (TabMiHorario)
   - Toggle por día con horario individual
   - Botón "Aplicar a todos"
   - Guarda en columna `horarios_semana` JSONB en tabla `barberos`
3. **Bloqueo recurrente semanal** (TabMisDiasLibres)
   - Nuevo tipo "Recurrente semanal" además de día completo y bloque de horas
   - Selección de días de semana (Dom-Sáb)
   - 1 solo registro en BD con columna `dias_semana` JSONB
   - Fecha "Hasta" opcional — si no se pone, aplica 1 año
   - Columna `dias_semana` JSONB agregada a tabla `bloqueos_horarios`
4. **SelectorHora** — nuevo componente `src/components/SelectorHora.jsx`
   - Reemplaza todos los `input type="time"` nativos del browser
   - Dropdowns HH:MM limpios y consistentes
   - Aplicado en: TabMisDiasLibres, TabMiHorario, TabMisReservas, TabAgenda, TabBarberos, TabBloqueos
5. **Lógica disponibilidad** actualizada para considerar `dias_semana` en bloqueos

### 🔴 Pendiente:
1. **RLS** — ⚠️ recordar revertir emails @twins.cl antes
2. **Dominio agendaia.cl**
3. **Video demo** con Screen Studio


---

## 📅 SESIÓN 11 (27 may) - COMPLETADO

### ✅ Features completadas:
1. **Email automático al reagendar** — igual que al cancelar, notifica al cliente
2. **Seguridad endpoints API** — verificación por origen del request
   - Archivo `api/_verify-token.js` — verifica origen o token
   - Orígenes válidos: `twins-barberia.vercel.app` + `localhost`
   - Variable `API_SECRET_TOKEN` en Vercel para crons
3. **Emails revertidos** a `@twins.cl` (ficticios por ahora, Alonso los cambiará al onboardear)

### 💡 Decisiones importantes:
- **RLS/Auth:** Postergado hasta antes del segundo cliente. Requiere migrar a Supabase Auth nativo.
- **WhatsApp Twilio:** Add-on +$10.000-15.000 CLP/mes si Alonso lo quiere. El botón wa.me del email es gratis e incluido.
- **Supabase Auth migration:** Antes del segundo cliente — cambia login de tabla `usuarios` a `supabase.auth.signInWithPassword()`

### 🔴 Pendiente próximas sesiones:
1. **Onboardear TWINS** — poner datos reales (servicios, barberos, horarios, emails reales)
2. **Migrar a Supabase Auth + RLS** — antes del segundo cliente
3. **Dominio agendaia.cl** — comprar en NIC Chile + conectar Vercel
4. **Video demo** — grabar con Screen Studio


---

## 📅 SESIÓN 12 (27 may) - COMPLETADO

### ✅ Features completadas:
1. **Tipo de negocio** — campo `tipo_negocio` en tabla `barberia` (barberia | salon)
2. **Tema dinámico por tipo** — VistaInicio usa inline styles según tipo_negocio
   - Barbería: fondo oscuro #0c0a09, ámbar/dorado
   - Salón: fondo rosado claro #fce8f0, rosas/fucsias
3. **Selector tipo negocio en Super Admin** — al crear nueva barbería
4. **Nail Studio demo** creado — ID: `org-nailstudio`, plan Plus, tipo: salon
5. **barberiaId dinámico** — App.jsx lee `?barberiaId=` de la URL
6. **Logs de debug** eliminados de VistaInicio (reescritura limpia)

### 🔴 Pendiente mañana (PRIORITARIO):
1. **Tema rosado en flujo de reserva** — VistaReserva-FASE3 sigue en negro cuando es salón
2. **Panel admin/barbero rosado** — cuando el negocio es salón, el panel también debería usar tema rosado
3. **Terminología dinámica** — "Barbero" → "Estilista", "Barbería" → "Salón" según tipo
4. **Onboardear TWINS** — datos reales
5. **Migrar Supabase Auth + RLS** — antes del segundo cliente
6. **Dominio agendaia.cl**

### 💡 Arquitectura tema:
- El objeto `T` (tema) en VistaInicio.jsx tiene todos los colores como inline styles
- Evitar clases Tailwind dinámicas (no funciona con purge CSS)
- Mismo patrón debe aplicarse a VistaReserva-FASE3.jsx


---

## 📅 SESIÓN 13 (28 may) - COMPLETADO

### ✅ Features completadas:
1. **Tema rosado en flujo reserva** — VistaReserva-FASE3.jsx usa inline styles según tipo_negocio
2. **Sin flash negro** — App.jsx, VistaInicio y VistaReserva detectan tipo antes de cargar datos
3. **Diseño salón completo:**
   - Ícono: `Sparkles` (lucide-react) en vez de tijeras
   - Fuente: `Libre Caslon Display` (Google Fonts) para el título del salón
   - Subtítulo: `Crimson Pro` italic
   - Botón CTA: outline rosado (#d4638a) con fondo transparente
   - Cards info: fondo #fdf2f6 (rosa muy clarito)
   - Cargando: fondo rosa desde el inicio (sin flash negro)

### 🔴 Pendiente próxima sesión:
1. **Fondo salón más dinámico** — gradiente/difuminado con paleta de colores rosados en vez de color plano
2. **Demo Nail Studio completa:**
   - Agregar servicios reales (basados en Anna Nail Artist Peñaflor)
   - Agregar 2 estilistas: Ana y Camila
   - URL referencia servicios: https://www.fresha.com/es/a/anna-nail-artist-penaflor...
3. **Onboardear TWINS** — datos reales
4. **Migrar Supabase Auth + RLS** — antes del segundo cliente
5. **Dominio agendaia.cl**

### 💡 Arquitectura tema salón:
- Objeto `T` con `useSalon: true/false` controla todo
- `bgInicial` en carga usa `barberiaId !== "org-twins"` como heurística temporal
- Fuente cargada con `<style>@import url(...)` dinámico dentro del JSX
- Evitar clases Tailwind dinámicas — usar siempre inline styles


---

## 📅 SESIÓN 14 (28 may) - COMPLETADO

### ✅ Features completadas:
1. **Gradiente rosado** en fondo VistaInicio salón
2. **Servicios con categorías** — columna `categoria` en `servicios_principales`
   - Filtro por categoría con botones en flujo reserva
   - Agrupación por categoría en TabServicios admin
   - Selector de categoría al crear/editar servicio
3. **Descripción de servicios** — campo opcional en formulario y flujo reserva
4. **Nail Studio demo completo:**
   - 12 servicios reales de Anna Nail Artist con categorías y descripciones
   - 2 estilistas: Ana y Camila (IDs: usr-ana-nail, usr-camila-nail)
5. **Terminología dinámica salón:**
   - "¿Con quién deseas tu sesión?" en vez de corte
   - "Cualquier estilista disponible" / "la que tenga mayor disponibilidad"
   - "Estilista:" en confirmación
   - Error: "Selecciona una estilista (o 'Cualquiera')"
6. **Flujo reserva 100% paleta rosada** — inputs, botones, horas, confirmación
7. **Email confirmación con tema rosado** para salones — header #fce8f0, título #7a1f42

### 🔴 Pendiente mañana:
1. **Botón WhatsApp y círculo check verde** en email → cambiar a rosado para salones
2. **Precio en vista previa servicios** — cuando hay adicionales, mostrar desglose de precios
3. **"Cualquier estilista" no se marca como seleccionado** — el highlight rosado no aparece al elegir "cualquiera"
4. **Login page** — muestra "TWINS" y diseño negro para Nail Studio (debería ser rosado con nombre correcto)
5. **Onboardear TWINS** — datos reales
6. **Supabase Auth + RLS** — antes del segundo cliente
7. **Dominio agendaia.cl**


---

## 📅 SESIÓN 15 (28 may noche) - COMPLETADO

### 🎉 HITO: Alonso aceptó ser cliente piloto de AgendaIA!

### ✅ Features completadas:
1. **Foto de barbero/estilista** — upload a Supabase Storage (bucket: barberos), columna `foto_url`
2. **Intervalo entre citas configurable** — columna `intervalo_minutos` en barberos, selector en TabMiHorario (15, 30, 45, 60, 75, 90 min)
3. **Duración personalizada por barbero** — tabla `duraciones_barbero` con columnas: id, barberia_id, barbero_id, servicio_id, duracion_minutos, tipo (servicio|adicional)
   - Barbero configura su duración por servicio Y por adicional en TabMiHorario
   - VistaReserva usa duración personal del barbero al calcular slots disponibles
4. **Categorías en servicios** — filtro por categoría con botones en flujo reserva
5. **Duración oculta** en flujo de reserva (servicios y adicionales) — no compromete al barbero
6. **Terminología dinámica salón** — estilista, sesión, la que tenga mayor disponibilidad

### 🗄️ Tablas nuevas/modificadas:
- `barberos`: + foto_url TEXT, + intervalo_minutos INTEGER DEFAULT 30
- `servicios_principales`: + categoria TEXT DEFAULT 'general', + descripcion TEXT
- `duraciones_barbero`: nueva tabla completa
- `duraciones_barbero`: + tipo TEXT DEFAULT 'servicio'

### 🔴 Pendiente:
1. **Onboardear TWINS** — datos reales de Alonso (servicios, barberos, horarios, emails reales)
2. **Login page** — tema rosado para salón (muestra TWINS y negro)
3. **Botón WhatsApp y círculo check** en email → rosado para salones
4. **"Cualquier estilista" no se marca** como seleccionado (highlight rosado)
5. **Supabase Auth + RLS** — antes del segundo cliente
6. **Dominio agendaia.cl**


---

## 📋 PENDIENTES DETALLADOS PRÓXIMAS SESIONES

### 1. Logo Instagram real en VistaInicio
- Actualmente muestra emoji 📷
- Reemplazar por SVG real del logo de Instagram con los colores correctos

### 2. Bug bloqueos recurrentes en panel barbero
- Alonso no puede crear bloqueos recurrentes para ningún barbero ni para él mismo
- Investigar y corregir el bug

### 3. Comprar dominio agendaia.cl
- Comprar en NIC Chile (~$15 USD/año)
- Conectar a Vercel
- Configurar subdominios: twins.agendaia.cl, nailstudio.agendaia.cl

### 4. Tab Encuestas + Google Reviews
- Actualmente Tab Encuestas solo muestra encuestas post-cita por email
- Evaluar mostrar reseñas de Google también en el tab (para que admin pueda monitorear y decidir cuáles mostrar en landing)
- O mantener separado: Google Reviews solo en landing, encuestas propias en el tab

### 5. Marketing recurrente "Te echamos de menos"
- Envío automático cada X días (configurable, ej: 15-20 días) a clientes que no han reservado
- Texto configurable: "Hace X días que no nos visitas, ¡te esperamos!"
- Periodicidad configurable desde el panel admin
- Requiere: cron job + lógica para detectar clientes inactivos

### 6. WhatsApp recordatorios para Alonso (Twilio)
- Alonso quiere activar WhatsApp
- Costo Twilio: ~$3-5 USD/mes (sandbox) o ~$10-15 USD/mes (número propio)
- Lo que falta: activar feature flag, configurar número Twilio, probar sandbox
- Cobrar a Alonso: +$10.000-15.000 CLP/mes como add-on
- Pendiente: decidir si usar sandbox (+14155238886) o número propio



---

## 📅 SESIÓN 16 (29 may) - COMPLETADO

### ✅ Features completadas:
1. **Google Calendar integrado** — OAuth completo, eventos se crean automáticamente al confirmar reserva
   - Endpoint `/api/google-calendar-callback.js` — flujo OAuth con Google
   - Endpoint `/api/google-calendar.js` — crea eventos en calendario del barbero
   - Botón "Conectar Google Calendar" en TabMiHorario (panel barbero)
   - Columnas nuevas en `barberos`: `google_access_token`, `google_refresh_token`, `google_calendar_conectado`
   - Fix timezone Chile (America/Santiago) — strings directos sin conversión UTC
   - Token refresh automático cuando expira
   - Si barbero no tiene calendario conectado, simplemente no falla
2. **Dominio reservaia.cl** — comprado en NIC Chile (agendaia.cl estaba tomado), nameservers Vercel configurados (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`), agregado en Vercel apuntando a Production ⏳ propagando DNS
3. **Logo Instagram SVG real** — degradado naranja/rosa reemplaza emoji 📷 en VistaInicio
4. **Logo de la barbería** — columna `logo_url` en tabla `barberia`, upload desde TabConfiguracion (bucket Barberos), se muestra en VistaInicio reemplazando ícono de tijeras/sparkles
5. **Bloqueos recurrentes en panel admin** (TabBloqueos):
   - Botón 🔁 Recurrente agregado al modal
   - Selector días L/M/X/J/V/S/D
   - Campos de fecha se ocultan en modo recurrente
   - `fecha_fin = 2099-12-31` para bloqueo indefinido
   - Validación: requiere al menos 1 día seleccionado
6. **Fix query bloqueos** — eliminado join `barbero:barbero_id(nombre)` que fallaba con `barbero_id NULL`, nombre del barbero se busca en array local de barberos

### 🗄️ Tablas nuevas/modificadas:
- `barberos`: + `google_access_token` TEXT, + `google_refresh_token` TEXT, + `google_calendar_conectado` BOOLEAN DEFAULT FALSE
- `barberia`: + `logo_url` TEXT
- Storage bucket `Barberos`: policies INSERT/SELECT/UPDATE para public agregadas

### 🔑 Variables de entorno agregadas (Vercel + .env.local):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` = `https://twins-barberia.vercel.app/api/google-calendar-callback`
- `SUPABASE_SERVICE_KEY`

### 💡 Decisiones importantes:
- **Dominio:** `agendaia.cl` estaba tomado → se eligió `reservaia.cl`
- **Google Calendar:** callback en `/api/google-calendar-callback` (no `/api/google-auth`) para coincidir con URIs ya configuradas en Google Cloud Console
- **Bloqueos recurrentes:** fecha indefinida = `2099-12-31` (más simple que NULL)
- **Google Cloud:** app en modo "Prueba" con `Pablo.Felipee.Ps@gmail.com` como usuario de prueba

### 🔴 Pendientes próximas sesiones:
1. **Onboardear TWINS** — datos reales de Alonso (servicios, barberos, horarios, emails reales)
2. **Migrar Supabase Auth + RLS** — antes del segundo cliente
3. **Dominio reservaia.cl** — verificar propagación DNS
4. **Login page tema rosado** para salón (muestra TWINS y negro para Nail Studio)
5. **"Cualquier estilista" no se marca** como seleccionado (highlight rosado)
6. **Botón WhatsApp y círculo check** en email → rosado para salones
7. **Tab Encuestas + Google Reviews** — mejoras pendientes
8. **Marketing "Te echamos de menos"** — cron automático para clientes inactivos
9. **WhatsApp Twilio** para Alonso (add-on +$10.000-15.000 CLP/mes)


---

## 📅 SESIÓN 17 (31 may) - COMPLETADO

### ✅ Features completadas:
1. **Google Reviews en TabEncuestas** — sección separada con logo Google SVG, stats combinadas (encuestas propias + Google Reviews)
   - `google_place_id` guardado en `barberia.configuracion` para org-twins: `ChIJGZpoFlLnYpYRQXK09YRxhgk`
   - Endpoint `get-google-reviews` sin verifyToken (era público, no necesitaba protección)
   - Stats de promedio y distribución incluyen reseñas de Google
   - Limitación: Google Places API gratuita solo devuelve 5 reseñas → se mantiene filtro 4-5 estrellas
2. **Marketing "Te echamos de menos"** — sección en TabMarketing
   - Config guardada en `barberia.configuracion.marketing_inactivos`
   - Campos: activo (toggle), días_inactividad (5/10/15/20/25/30), frecuencia_reenvio (7/14/21/30/60 días), asunto, mensaje con {nombre} y {dias}
   - Textos explicativos bajo cada selector
   - Endpoint `/api/send-inactive-clients.js` — revisa clientes inactivos y envía email personalizado
   - Cron: `0 13 * * *` (10am Chile, mismo que recordatorios)
3. **Login page tema dinámico** — rosado para salón, negro/dorado para barbería
   - `barberiaData` cargado en App.jsx con useEffect
   - Muestra logo de la barbería si existe, sino ícono según tipo
   - Nombre dinámico de la barbería en vez de "TWINS" hardcodeado
4. **"Cualquier estilista" se marca correctamente** — fix comparación `barberoSeleccionado === CUALQUIERA` (antes comparaba `.id` que no existía)
5. **Email confirmación colores dinámicos** — círculo check y botón WhatsApp rosados para salones
   - `checkColor`: rosado para salón, verde para barbería
   - `whatsappBg`: rosado para salón, verde para barbería
   - `whatsappEmoji`: 💗 para salón, 💚 para barbería

### 👤 Usuario Nail Studio:
- **Email:** `admin@nailstudio.cl`
- **Password:** `nailstudio2026`
- **Rol:** admin
- **Panel actualmente:** negro/amarillo (pendiente cambiar a rosado)

### 🔴 Pendientes próximas sesiones:
1. **Tema rosado panel admin/barbero completo** — VistaAdmin, VistaBarbero y todos los tabs cuando es salón (trabajo grande, sesión dedicada)
2. **Onboardear TWINS** — datos reales de Alonso
3. **Migrar Supabase Auth + RLS** — antes del segundo cliente
4. **Dominio reservaia.cl** — verificar propagación DNS
5. **WhatsApp Twilio** para Alonso (add-on)
