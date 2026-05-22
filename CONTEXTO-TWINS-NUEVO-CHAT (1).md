# 📋 CONTEXTO PROYECTO TWINS BARBERÍA - SaaS Multi-tenant

## 🎯 RESUMEN DEL PROYECTO

**Nombre:** TWINS Barbería - Sistema de reservas SaaS multi-tenant
**Cliente piloto:** TWINS Barbería (Alonso)
**Visión:** Escalar a otras barberías como SaaS con planes mensuales

---

## 🔗 URLs IMPORTANTES

- **Live:** https://twins-barberia.vercel.app
- **GitHub:** https://github.com/pabloperez-create/Twins-Barberia
- **Supabase:** https://supabase.com/dashboard/project/fgtbhkeqzcqpjhziyijt
- **Vercel:** https://vercel.com/dashboard
- **Local:** `~/Desktop/twins-barberia`

---

## 💳 CREDENCIALES

### Supabase
```
URL: https://fgtbhkeqzcqpjhziyijt.supabase.co
KEY (anon): sb_publishable_8E23tN1s3wbAIqjhX-1icg_VBCYqsMO
```

### Variables Vercel (Production)
- `RESEND_API_KEY` (Sensitive)
- `VITE_SUPABASE_URL` (Sensitive)
- `VITE_SUPABASE_KEY` (Sensitive)

---

## 👥 USUARIOS DE PRUEBA

| Email | Password | Rol | Detalle |
|-------|----------|-----|---------|
| `alonso@twins.cl` | `hash_alonso123` | admin | Dueño + barbero |
| `vicente@twins.cl` | `twins123` | barbero | |
| `johans@twins.cl` | `twins123` | barbero | |
| `jose@twins.cl` | `twins123` | barbero | |
| `cliente@twins.cl` | `cliente123` | cliente | Para probar reserva |
| `pablo@twinsapp.cl` | (a crear) | super_admin | ⭐ Gestión SaaS (pendiente) |

**Email testing (Resend):** `pablo.felipee.ps@gmail.com`
**WhatsApp testing:** `56967402940`

---

## 💰 MODELO DE NEGOCIO (3 PLANES + FEATURE FLAGS)

| Plan | Mensual | Features |
|------|---------|----------|
| BASE | $50 + $10/barbero | Email solo |
| PLUS ⭐ | $80 + $10/barbero | Email + WhatsApp + Stats |
| PRO | $120-150 + $10/barbero | + Bot IA + Multi-sucursal |

**Margen TWINS (PLUS):** ~73%

### Catálogo de features (a implementar):

**Plan BASE:**
- email_confirmacion
- email_recordatorio
- multi_barberos (hasta 3)
- flujo_reserva_publico

**Plan PLUS (todo BASE + ):**
- whatsapp_recordatorios
- whatsapp_confirmacion
- estadisticas_barberia
- exportar_datos
- personalizar_emails (logo, colores)

**Plan PRO (todo PLUS + ):**
- multi_sucursal
- bot_whatsapp_ia
- analytics_avanzados
- estadisticas_barberos (cada barbero ve sus stats)
- marketing_automatizado
- integraciones (Google Calendar)

---

## 📊 BASE DE DATOS (11 tablas, RLS DESACTIVADO)

1. **barberia** - Organizaciones (con `configuracion.features` jsonb)
2. **usuarios** - Login (admin, barbero, cliente, super_admin)
3. **barberos** - Estilistas (vinculados a usuarios via `usuario_id`)
4. **servicios_principales** - Cortes (con `activo`)
5. **servicios_adicionales** - Extras (con `activo`)
6. **promociones**
7. **reservas** ⭐ (con `recordatorio_email_enviado_at` + `motivo_cancelacion`)
8. **notificaciones**
9. **configuracion**
10. **estadisticas**
11. **bloqueos_horarios** (días libres y vacaciones)

### Estructura `bloqueos_horarios`:
```sql
id TEXT PRIMARY KEY
barberia_id TEXT NOT NULL
barbero_id TEXT DEFAULT NULL  -- NULL = aplica a toda la barbería
fecha_inicio DATE NOT NULL
fecha_fin DATE NOT NULL
hora_inicio TIME DEFAULT NULL  -- NULL = día completo
hora_fin TIME DEFAULT NULL
motivo TEXT DEFAULT NULL
creado_por_usuario_id TEXT
fecha_creacion TIMESTAMP DEFAULT NOW()
```

### Estructura propuesta para `barberia.configuracion.features`:
```json
{
  "whatsapp": "56967402940",
  "direccion": "...",
  "instagram": "...",
  "horario_atencion": "...",
  "features": {
    "whatsapp_recordatorios": false,
    "whatsapp_confirmacion": false,
    "estadisticas_barberia": true,
    "estadisticas_barberos": false,
    "exportar_datos": false,
    "multi_sucursal": false,
    "personalizar_emails": false,
    "logo_propio": false,
    "bot_whatsapp": false
  }
}
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
~/Desktop/twins-barberia/
├── api/
│   ├── send-confirmation-email.js     (al reservar)
│   ├── send-reminder-emails.js        (cron diario)
│   ├── send-cancellation-email.js     (al cancelar)
│   └── send-reassignment-email.js     (al reasignar)
├── src/
│   ├── App.jsx                        (login + router)
│   ├── VistaInicio.jsx                (cliente)
│   ├── VistaReserva-FASE3.jsx         (6 pasos, 870 líneas, con bloqueos)
│   ├── VistaAdmin.jsx                 (admin shell con 7 tabs)
│   ├── VistaBarbero.jsx               (barbero shell con 4 tabs)
│   ├── admin/
│   │   ├── TabAgenda.jsx              ⭐ CALENDARIO con FullCalendar
│   │   ├── TabConfiguracion.jsx       (3 secciones)
│   │   ├── TabServicios.jsx           (CRUD)
│   │   ├── TabAdicionales.jsx         (CRUD)
│   │   ├── TabBarberos.jsx            (CRUD + crea usuario)
│   │   ├── TabBloqueos.jsx            (gestión global)
│   │   └── TabEstadisticas.jsx
│   ├── barbero/
│   │   ├── TabMisReservas.jsx         (lista + cancelar + reagendar)
│   │   ├── TabMiPerfil.jsx            (nombre, especialidad, password)
│   │   ├── TabMiHorario.jsx           (horario laboral)
│   │   └── TabMisDiasLibres.jsx       (bloqueos con reasignación)
│   └── components/
│       └── Modal.jsx                  (reutilizable)
├── .env.local
├── vercel.json                        (cron diario 10am)
└── package.json
```

### Dependencias npm:
- `@supabase/supabase-js`
- `lucide-react`
- `resend`
- `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`, `core`

---

## ✅ FEATURES COMPLETADAS

### Flujo cliente (sin login)
- 6 pasos para reservar
- Validaciones en cada paso
- Email obligatorio con formato
- Teléfono +569 fijo con auto-formato
- "Cualquier barbero disponible" con asignación balanceada
- Excluye horarios bloqueados automáticamente

### Email automation
- ✉️ Confirmación al reservar
- ✉️ Recordatorio día N-1 (cron 10am Chile)
- ✉️ Recordatorio inmediato si reserva es HOY
- ✉️ Email de cancelación
- ✉️ Email de reasignación (tono empático)
- Cada email tiene botón WhatsApp (estrategia ventana 24h)

### Panel Admin (Alonso) - 7 tabs
- **Agenda:** ⭐ Calendario FullCalendar (Mes/Semana/Día)
  - Color por barbero
  - Bloqueos en rojo
  - Modal de detalles
  - Cancelar + Reagendar
  - "+ Nueva cita" deshabilitado (próximamente)
- **Servicios:** CRUD principales
- **Adicionales:** CRUD extras
- **Barberos:** CRUD + crea login automáticamente
- **Bloqueos:** Gestión global (por barbero o barbería completa)
- **Estadísticas:** Métricas básicas
- **Configuración:** 3 secciones (General / Contacto / Horario)

### Vista Barbero (Vicente, Johans, José, Alonso) - 4 tabs
- **Mis Reservas:** Solo las suyas, con cancelar (+email) y reagendar
- **Mi Horario:** Editar horario_inicio y horario_fin
- **Días Libres:** Crear bloqueos con reasignación inteligente
- **Mi Perfil:** Editar nombre, especialidad, contraseña

### Reasignación inteligente de reservas
Cuando un barbero crea un bloqueo:
1. Sistema detecta reservas afectadas
2. Para cada una busca barberos disponibles
3. Sugiere reasignar (default) o cancelar
4. Email apropiado al cliente según acción

### Estrategia ventana 24h WhatsApp
- Botón verde "Confirmar por WhatsApp" en cada email
- Cliente hace click → abre wa.me → ventana 72h gratis
- Ahorro estimado en Twilio: 35-50%

---

## ⏳ PENDIENTE (POR PRIORIDAD)

### 🥇 PRIORIDAD 1: Feature Flags / Plan Gating ⭐ ESTRATÉGICO

**Objetivo:** Activar/desactivar funcionalidades según el plan contratado, sin tocar código.

**Decisiones tomadas:**
- ✅ Acceso super-admin: login con `pablo@twinsapp.cl` rol `super_admin`
- ✅ Aplicación de features: requiere logout/login
- ✅ UX: mostrar feature bloqueada con CTA "Upgrade tu plan"
- ✅ Arquitectura: campo `configuracion.features` jsonb en tabla barberia
- ✅ Catálogo: BASE / PLUS / PRO definidos

**Plan técnico (~2 horas):**
1. SQL: agregar `features` jsonb al campo configuracion de TWINS
2. Crear usuario `pablo@twinsapp.cl` con rol `super_admin`
3. Crear helper `utils/features.js` con función `isFeatureEnabled(barberia, feature)`
4. Crear `VistaSuperAdmin.jsx` con:
   - Lista todas las barberías
   - Editar features (toggle on/off)
   - Cambiar plan contratado
   - Ver estadísticas globales
5. Modificar componentes para usar feature flags:
   - VistaAdmin: ocultar tabs según features
   - Emails: con/sin botón WhatsApp
   - VistaBarbero: ocultar stats personales si OFF
6. Modificar App.jsx routing: si rol = super_admin → VistaSuperAdmin
7. Crear componente `FeatureBloqueada` con CTA "Upgrade tu plan"

**Beneficios estratégicos:**
- Vender más caro planes superiores
- Hacer demos diferenciados sin tocar código
- Promociones temporales
- Upsell automático ("¿quieres analytics? Sube a PRO")
- Diferenciar barberías

---

### 🥈 PRIORIDAD 2: Twilio WhatsApp (~3-4h + 3-5 días Meta)
- Cuenta Twilio + verificación Meta
- Template "recordatorio_cita" aprobado
- Endpoint `/api/send-reminder-whatsapp`
- Cron 1-2h antes de cada cita
- Detección de ventana 24h activa
- **Esta es la feature que justifica el plan PLUS ($80/mes)**

---

### 🥉 PRIORIDAD 3: "+ Nueva cita" funcional (~1h)
- Botón ya existe (deshabilitado)
- Para clientes que llaman/escriben por WhatsApp directo
- Modal compacto: cliente + servicio + barbero + fecha/hora
- Crear reserva manualmente desde admin

---

### Otras pendientes:
- Self-signup nuevas barberías
- Sistema facturación + Mercado Pago
- Reactivar RLS con policies
- Dominio propio + Resend con dominio
- Foto de barbero
- Horario por día de la semana
- Bloqueos recurrentes
- Notificación a barbero cuando le reasignan reservas

---

## 🤖 CRON CONFIGURADO

```json
// vercel.json
{
  "crons": [{
    "path": "/api/send-reminder-emails",
    "schedule": "0 13 * * *"
  }]
}
```

**Hora:** 13:00 UTC = 10:00 AM Chile (verano)
**Forzar manual:** Vercel → Settings → Cron Jobs → Run

---

## 🐛 BUGS RESUELTOS

1. ✅ Error 406 / Array(0) → desactivar RLS
2. ✅ Validaciones desplazadas en validarPaso()
3. ✅ Botón Confirmar saltaba validación
4. ✅ Reservas viejas sin email recibieron recordatorio
5. ✅ App.jsx contaminado con código de proyecto fútbol (Firebase)
6. ✅ Múltiples versiones de archivos en Downloads causaban confusión
7. ✅ Calendario mostraba todo en blanco (faltaba `eventDisplay="block"`)

---

## 💻 COMANDOS ÚTILES

```bash
# Trabajar local
cd ~/Desktop/twins-barberia
npm run dev

# Vite zombie
pkill -9 -f vite

# Limpiar caché Vite
rm -rf node_modules/.vite

# Deploy
git add . && git commit -m "msg" && git push

# Verificar archivo crítico
head -10 ~/Desktop/twins-barberia/src/App.jsx
wc -l ~/Desktop/twins-barberia/src/VistaReserva-FASE3.jsx  # Debe dar 870

# Forzar cron manual
curl https://twins-barberia.vercel.app/api/send-reminder-emails

# Reinstalar FullCalendar si falla
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/core
```

---

## 🚨 LECCIONES APRENDIDAS

1. RLS de Supabase activo por defecto → desactivar para apps 100% cliente
2. Error 406 casi siempre = RLS sin policies
3. Botones críticos deben validar ANTES de ejecutar
4. Vite: `pkill -9 -f vite` para instancias zombie
5. Verificar archivos con `head -3` antes de mover (Downloads acumula versiones)
6. Mac es case-insensitive (puede haber duplicados ocultos)
7. Resend sandbox solo permite enviar al email registrado
8. Vercel Cron Hobby tiene flexible window de 1 hora
9. Multi-tenant con jsonb (`configuracion`) es escalable
10. Estrategia ventana 24h reduce costos Twilio 35-50%
11. zsh interpreta `!` → usar comillas simples en greps
12. FullCalendar dark mode = sobreescribir CSS con custom (`<style>` tag)
13. Eventos en FullCalendar vista mes → usar `eventDisplay="block"` para colores
14. Feature flags con jsonb permiten escalar SaaS sin tocar código

---

## 📅 HISTORIAL DE SESIONES

### **Sesión 1 (10 may, ~22:30):**
- Bug RLS resuelto
- Bug validaciones resuelto
- Fase 3 (flujo de reserva) completada

### **Sesión 2 (11 may, 18:00-23:45):**
- Email confirmación + cron + recordatorios
- "Cualquier barbero" balanceado
- Multi-tenant del email
- Teléfono +569 fijo
- 3 push exitosos

### **Sesión 3 (15 may, todo el día) - LA MÁS GRANDE:**
- Refactor completo de arquitectura
- Panel admin completo (7 tabs CRUD)
- Vista barbero filtrada (4 tabs)
- Modal reutilizable
- CRUD: Servicios, Adicionales, Barberos, Configuración
- Alonso como dueño + barbero
- Rol cliente separado de barbero
- Vicente/Johans/José con login propio
- Tabla `bloqueos_horarios`
- Bloqueos con reasignación inteligente
- Email de cancelación + reasignación
- Calendario visual con FullCalendar (Mes/Semana/Día)
- Bug calendario colores blancos resuelto
- ~20 archivos nuevos creados
- 6 push exitosos

---

## 🎯 PRÓXIMA SESIÓN (RECOMENDADO)

**Implementar Feature Flags / Plan Gating** (~2 horas)

Esta es la **base estratégica** para escalar el SaaS. Sin esto, todos los planes tendrían las mismas features y no podrías cobrar diferenciado.

Una vez listo:
1. Twilio WhatsApp (habilita plan PLUS)
2. "+ Nueva cita" funcional
3. Self-signup nuevas barberías

---

## 📝 PARA EL NUEVO CHAT

**Empezar diciendo:**

"Estoy continuando con TWINS Barbería. Ya tengo:
- Flujo de reserva completo (6 pasos)
- 5 emails automáticos
- Panel admin con 7 tabs CRUD (incluye calendario visual)
- Vista barbero con 4 tabs
- Bloqueos con reasignación inteligente
- Calendario FullCalendar funcionando

Quiero implementar Feature Flags / Plan Gating para diferenciar planes (BASE/PLUS/PRO).

Decisiones tomadas:
- Super-admin: usuario pablo@twinsapp.cl con rol super_admin
- Features se aplican al hacer logout/login
- Mostrar features bloqueadas con CTA 'Upgrade tu plan'
- Arquitectura: configuracion.features jsonb en tabla barberia

[Pegar contenido de este documento]"

---

**Última actualización:** 2026-05-15 23:30 (hora Chile)
**Estado:**
- Fase 1 ✅
- Fase 2 ✅
- Fase 3 ✅
- Fase 4 ✅ (100%)
- Panel Admin ✅ (100%)
- Vista Barbero ✅ (100%)
- Bloqueos ✅
- Calendario ✅
- **Feature Flags ⏳ (PRÓXIMA PRIORIDAD)**
- Twilio ⏳
- Producción real ⏳

**Próximo paso:** Feature Flags / Plan Gating con super-admin
