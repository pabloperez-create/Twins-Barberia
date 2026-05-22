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

## 💰 MODELO DE NEGOCIO (Plan + Add-ons modular)

```
PLANES (precio base + $10/barbero):
- BASE: $60  → email + multi-barberos + calendario + bloqueos
- PLUS: $80  → + WhatsApp + Stats + Reasignación inteligente ⭐
- PRO:  $130 → + Bot IA + Multi-sucursal + Marketing + Integraciones

ADD-ONS (sobre plan BASE):
+ WhatsApp recordatorios: $20/mes
+ Stats avanzadas: $15/mes
+ Bot WhatsApp IA: $40/mes
+ Marketing automatizado: $25/mes
+ Multi-sucursal: $30/mes
```

**Decisión clave:** Twilio NO es necesario para vender. Plan BASE ya es vendible con emails.

---

## 📊 BASE DE DATOS (11 tablas, RLS DESACTIVADO)

1. **barberia** (con `configuracion.features` jsonb ⭐)
2. **usuarios** (admin, barbero, cliente, super_admin)
3. **barberos** (vinculados via `usuario_id`)
4. **servicios_principales**
5. **servicios_adicionales**
6. **promociones**
7. **reservas** (con `motivo_cancelacion`)
8. **notificaciones**
9. **configuracion**
10. **estadisticas**
11. **bloqueos_horarios**

### Estructura `barberia.configuracion.features` (jsonb):
```json
{
  "whatsapp": "56967402940",
  "direccion": "...",
  "instagram": "...",
  "features": {
    "flujo_reserva_publico": true,
    "email_confirmacion": true,
    "email_recordatorio": true,
    "multi_barberos": true,
    "panel_admin": true,
    "vista_barbero": true,
    "bloqueos_horarios": true,
    "calendario_visual": true,
    "whatsapp_recordatorios": true,
    "whatsapp_confirmacion": true,
    "estadisticas_barberia": true,
    "estadisticas_barberos": true,
    "estadisticas_avanzadas": true,
    "reasignacion_inteligente": true,
    "exportar_datos": true,
    "personalizar_emails": true,
    "multi_sucursal": true,
    "bot_whatsapp_ia": true,
    "analytics_avanzados": true,
    "integraciones": true,
    "marketing_automatizado": true
  }
}
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
~/Desktop/twins-barberia/
├── api/
│   ├── send-confirmation-email.js     (auto-lee feature whatsapp_confirmacion)
│   ├── send-reminder-emails.js        (cron diario, auto-lee feature)
│   ├── send-cancellation-email.js     (auto-lee feature)
│   └── send-reassignment-email.js     (auto-lee feature)
├── src/
│   ├── App.jsx                        (routing: super_admin → VistaSuperAdmin)
│   ├── VistaInicio.jsx
│   ├── VistaReserva-FASE3.jsx         (870 líneas, con bloqueos)
│   ├── VistaAdmin.jsx                 (con feature flags, badge plan)
│   ├── VistaBarbero.jsx               (con feature flags)
│   ├── VistaSuperAdmin.jsx            ⭐ NUEVO
│   ├── admin/
│   │   ├── TabAgenda.jsx              (FullCalendar)
│   │   ├── TabConfiguracion.jsx
│   │   ├── TabServicios.jsx
│   │   ├── TabAdicionales.jsx
│   │   ├── TabBarberos.jsx
│   │   ├── TabBloqueos.jsx
│   │   └── TabEstadisticas.jsx
│   ├── barbero/
│   │   ├── TabMisReservas.jsx
│   │   ├── TabMiPerfil.jsx
│   │   ├── TabMiHorario.jsx
│   │   └── TabMisDiasLibres.jsx
│   ├── components/
│   │   ├── Modal.jsx
│   │   └── FeatureBloqueada.jsx       ⭐ NUEVO
│   └── utils/
│       └── features.js                ⭐ NUEVO (helper + catálogo)
├── vercel.json (cron 0 13 * * * = 10am Chile)
└── package.json
```

### Dependencias clave:
- `@supabase/supabase-js`, `lucide-react`, `resend`
- `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`, `core`

---

## ✅ FEATURES COMPLETADAS

### Flujo cliente
- 6 pasos para reservar
- Validaciones por paso
- Teléfono +569 fijo
- "Cualquier barbero" balanceado
- Excluye horarios bloqueados

### Email automation (5 emails)
- ✉️ Confirmación al reservar (con/sin botón WhatsApp según feature)
- ✉️ Recordatorio día N-1 (cron 10am Chile)
- ✉️ Recordatorio HOY
- ✉️ Cancelación con motivo
- ✉️ Reasignación entre barberos
- Estrategia ventana 24h WhatsApp

### Panel Admin Alonso (7 tabs con feature flags)
- Agenda (Calendario FullCalendar Mes/Semana/Día)
- Servicios, Adicionales, Barberos
- Bloqueos, Estadísticas, Configuración
- **Tabs se esconden si feature está OFF**

### Vista Barbero (4 tabs con feature flags)
- Mis Reservas, Mi Horario, Días Libres, Mi Perfil

### Super Admin ⭐
- Vista exclusiva pablo@twinsapp.cl
- Lista de barberías con stats globales
- Toggle on/off de cada feature
- Cambiar plan contratado
- Reset features según plan

### Bloqueos + Reasignación inteligente
- Admin: gestión global
- Barbero: días libres con modal 2 pasos
- Detecta reservas afectadas
- Sugiere reasignar o cancelar

---

## ⏳ PENDIENTE PRIORITIZADO

### 🥇 Próxima sesión - Frontend pasar `barberiaId` a emails (~10 min)
Los emails auto-leen features pero necesitan el ID:
- `VistaReserva-FASE3.jsx` → al confirmar reserva, agregar `barberiaId`
- `TabAgenda.jsx` admin → al cancelar reserva
- `TabMisReservas.jsx` barbero → al cancelar
- `TabMisDiasLibres.jsx` → en 2 fetch (cancelación + reasignación)

**Patrón:** En cada body JSON.stringify agregar `barberiaId: barberiaId,` (o `barbero.barberia_id`)

### 🥈 Modificaciones pendientes feature flags (~30 min)
- TabAgenda con vista lista si `calendario_visual = false`
- TabMisDiasLibres modal simple si `reasignacion_inteligente = false`

### 🥉 Stats avanzadas con recharts (~3h) - Plan PLUS
- Instalar recharts
- Gráficos por día/semana/mes
- Comparativa mes anterior
- Análisis por barbero
- Exportar CSV
- Tasa cancelación, mejor día/hora

### Otros pendientes
- "+ Nueva cita" funcional (~1h)
- Twilio WhatsApp + Bot IA (~3-4h + Meta)
- Self-signup nuevas barberías
- Sistema facturación Mercado Pago
- Reactivar RLS con policies
- Dominio propio

---

## 🤖 CRON
```json
// vercel.json
{
  "crons": [{ "path": "/api/send-reminder-emails", "schedule": "0 13 * * *" }]
}
```
13:00 UTC = 10am Chile. Forzar manual: Vercel → Settings → Cron Jobs → Run

---

## 💻 COMANDOS ÚTILES
```bash
cd ~/Desktop/twins-barberia
npm run dev
pkill -9 -f vite
git add . && git commit -m "msg" && git push
head -10 ~/Desktop/twins-barberia/src/App.jsx
curl https://twins-barberia.vercel.app/api/send-reminder-emails
```

---

## 🚨 LECCIONES APRENDIDAS

1. RLS Supabase activo por defecto → desactivar para apps 100% cliente
2. Error 406 = RLS o policies
3. Botones críticos deben validar ANTES de ejecutar
4. Vite caché: `pkill -9 -f vite` + `rm -rf node_modules/.vite`
5. Verificar archivos con `head -3` antes de mover (Downloads acumula versiones)
6. Mac es case-insensitive
7. FullCalendar dark mode = sobrescribir CSS con custom `<style>`
8. Eventos FullCalendar vista mes → `eventDisplay="block"` para colores
9. **Feature flags con jsonb permiten escalar SaaS sin tocar código**
10. **Modelo Plan + Add-ons modular = flexibilidad para negociaciones**

---

## 📅 HISTORIAL

### Sesión 1 (10 may): Bug RLS + validaciones + Fase 3
### Sesión 2 (11 may): Email cron + balanceado + multi-tenant
### Sesión 3 (15 may): Refactor + Admin 7 tabs + Vista Barbero + Bloqueos + Calendario
### Sesión 4 (21 may, hoy): **Feature Flags + Super Admin** ⭐

---

## 📝 PARA EL NUEVO CHAT

**Empezar diciendo:**

"Estoy continuando con TWINS Barbería. Ya tengo:
- Flujo de reserva completo
- 5 emails automáticos
- Panel admin 7 tabs + Vista barbero 4 tabs
- Calendario visual + Bloqueos con reasignación
- Feature Flags / Plan Gating funcionando ⭐
- Super Admin (pablo@twinsapp.cl)

Modelo de negocio: Plan + Add-ons modular
- BASE $60, PLUS $80, PRO $130 (+ $10/barbero)
- Features se activan/desactivan por super-admin

Próximo paso: [elegir]
- Pasar barberiaId a llamadas de email (10 min)
- Stats avanzadas con recharts (3h)
- Twilio WhatsApp
- Self-signup

[Pegar contenido de este documento]"

---

**Última actualización:** 2026-05-21 14:30 (hora Chile)
**Estado:** Feature Flags ✅ funcionando · Twilio ⏳ · Self-signup ⏳ · RLS ⏳
