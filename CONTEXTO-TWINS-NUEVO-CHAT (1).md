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

```
PLANES (precio base + $10/barbero):
- BASE: $60  → email + multi-barberos + calendario + bloqueos
- PLUS: $80  → + WhatsApp + Stats avanzadas + Reasignación ⭐
- PRO:  $130 → + Bot IA + Multi-sucursal + Marketing

ADD-ONS (sobre BASE):
+ WhatsApp recordatorios: $20/mes
+ Stats avanzadas: $15/mes
+ Bot WhatsApp IA: $40/mes
+ Marketing automatizado: $25/mes
+ Multi-sucursal: $30/mes
```

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
│   └── send-reassignment-email.js     (auto-lee features)
├── src/
│   ├── App.jsx                        ⭐ MODIFICADO HOY (arranca en "inicio" no "login")
│   ├── VistaInicio.jsx                ⭐ MODIFICADO HOY (landing pública sin login)
│   ├── VistaReserva-FASE3.jsx         (con desglose adicionales en email)
│   ├── VistaAdmin.jsx                 (feature flags + badge plan)
│   ├── VistaBarbero.jsx               (feature flags)
│   ├── VistaSuperAdmin.jsx            (gestión SaaS)
│   ├── admin/
│   │   ├── TabAgenda.jsx              (FullCalendar + "+ Nueva cita")
│   │   ├── TabConfiguracion.jsx
│   │   ├── TabServicios.jsx
│   │   ├── TabAdicionales.jsx
│   │   ├── TabBarberos.jsx
│   │   ├── TabBloqueos.jsx
│   │   └── TabEstadisticas.jsx        (versión básica - pendiente upgrade)
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
- ⏳ **A instalar:** `recharts` (para Stats avanzadas)

---

## ✅ FEATURES COMPLETADAS

### Flujo cliente (público)
- 6 pasos para reservar
- Validaciones por paso
- Teléfono +569 fijo (a verificar si está en modal nuevo)
- "Cualquier barbero" balanceado
- Excluye horarios bloqueados
- Email con desglose de adicionales

### Email automation (5 emails con feature flags)
- ✉️ Confirmación (con/sin botón WhatsApp según feature)
- ✉️ Recordatorio día N-1 (cron 10am Chile)
- ✉️ Recordatorio HOY
- ✉️ Cancelación con motivo
- ✉️ Reasignación entre barberos
- TODOS auto-leen features de Supabase
- Confirmation muestra desglose de adicionales

### Panel Admin Alonso (7 tabs con feature flags)
- **Agenda:** Calendario FullCalendar (Mes/Semana/Día)
  - "+ Nueva cita" funcional ⭐
- Servicios, Adicionales, Barberos
- Bloqueos, Estadísticas (versión básica)
- Configuración

### Vista Barbero (4 tabs con feature flags)
- Mis Reservas, Mi Horario, Días Libres, Mi Perfil

### Super Admin
- pablo@twinsapp.cl
- Lista de barberías + stats globales
- Toggle on/off de cada feature
- Cambiar plan contratado

### "+ Nueva cita" funcional
- Modal compacto desde Agenda
- Hora en formato 24h (selects HH:MM con 00/15/30/45)
- Email obligatorio si checkbox marcado
- Warning de conflictos (reservas + bloqueos)
- Admin puede forzar creación
- Guarda creada_manualmente=true + creada_por_usuario_id
- Email con desglose de adicionales

### Bloqueos + Reasignación inteligente
- Admin: gestión global
- Barbero: días libres con modal 2 pasos
- Detecta reservas afectadas, sugiere reasignar o cancelar

---

## 🚨 SESIÓN ACTUAL (22 may PM) - EN PROGRESO

### ✅ Completado en esta sesión:
1. Frontend pasa `barberiaId` a emails (4 archivos)
2. Endpoints email auto-leen features de Supabase
3. "+ Nueva cita" funcional completo (modal + columnas BD)
4. Hora 24h con selects (no más AM/PM)
5. Email con desglose de adicionales (admin + público)
6. Refactor `App.jsx` para que arranque en "inicio" sin login
7. Nuevo `VistaInicio.jsx` como landing pública

### 🔴 BUG ACTIVO al cerrar el chat:
**Error en localhost:** `lucide-react no exporta 'Instagram'`

**Causa:** El ícono `Instagram` no existe en la versión instalada de lucide-react.

**Fix pendiente (1 minuto):**
1. Abrir `~/Desktop/twins-barberia/src/VistaInicio.jsx`
2. Línea 2 - quitar `Instagram` del import:
   ```javascript
   // DE:
   import { Scissors, Calendar, Clock, MapPin, Instagram, LogIn } from "lucide-react";
   // A:
   import { Scissors, Calendar, Clock, MapPin, LogIn } from "lucide-react";
   ```
3. Buscar `<Instagram size={18}` y reemplazar por:
   ```javascript
   <span className="text-amber-200 flex-shrink-0 mt-0.5 text-lg">📷</span>
   ```
4. Guardar + hard refresh

---

## ⏳ PENDIENTE INMEDIATO (próximo chat)

### 🥇 PRIORIDAD 1: Arreglar bug Instagram + testear refactor login
1. Aplicar el fix de arriba (1 min)
2. Verificar tests:
   - Landing pública aparece sin login
   - "Reservar ahora" abre flujo de 6 pasos sin pedir login
   - Login sigue funcionando para admin/barbero
   - Sesión persistente si hay localStorage
   - Logout vuelve al inicio público
3. Push a producción

### 🥈 PRIORIDAD 2: Bug del teléfono +569 en reserva pública
Pablo reportó que el modal de la reserva pública NO tiene `+569` fijo.

Verificar con:
```bash
grep -n "569\|cliente_telefono\|handleTelefono" ~/Desktop/twins-barberia/src/VistaReserva-FASE3.jsx | head -10
```

Si no tiene, agregar lo mismo que está en `ModalNuevaCita.jsx`:
```javascript
const handleTelefonoChange = (e) => {
  const valor = e.target.value.replace(/\D/g, "").slice(0, 8);
  setClienteTelefono(valor);
};

// En el input:
<span>+569</span>
<input type="tel" value={clienteTelefono} maxLength={8} ... />

// Al guardar reserva:
cliente_telefono: "569" + clienteTelefono
```

### 🥉 PRIORIDAD 3: Stats avanzadas con Recharts (~3h)
**Esto justifica vender Plan PLUS ($80/mes)**

Plan técnico:
1. `npm install recharts`
2. KPIs cards con % vs mes anterior
3. Gráfico reservas por día (30 días)
4. Gráfico ingresos por mes (6 meses)
5. Análisis por barbero (gráfico barras)
6. Pie chart servicios más solicitados
7. Top 5 clientes recurrentes
8. Mejor día/hora insights
9. Filtros temporales (default: este mes)
10. Exportar CSV

Decisiones tomadas:
- Solo Admin (no barberos por ahora)
- Librería: Recharts

### Después de Stats:
- Modificaciones 2 y 3 Feature Flags (vista lista, modal simple)
- Twilio WhatsApp
- Self-signup
- Mercado Pago
- Reactivar RLS

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

# Verificar archivos críticos
head -5 ~/Desktop/twins-barberia/api/send-confirmation-email.js
# Debe tener: import { createClient } from '@supabase/supabase-js';

head -10 ~/Desktop/twins-barberia/src/App.jsx
# Debe arrancar con useState("inicio") no useState("login")

# Si vite no detecta cambios
rm -rf node_modules/.vite

# Si queremos revertir cambios no commiteados
git checkout src/App.jsx src/VistaInicio.jsx

# Próxima sesión - instalar recharts
npm install recharts
```

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
11. Endpoints auto-leen features de Supabase (no necesitan frontend modificar)
12. Localhost NO ejecuta /api endpoints (solo Vercel)
13. `<input type="time">` muestra formato del OS - usar 2 selects para forzar 24h
14. Columnas reales pueden tener nombres distintos a lo asumido (adicionales_ids vs adicionales)
15. **Pantalla blanca en localhost = error JS en consola (Cmd+Option+J)** ⭐
16. **lucide-react no tiene todos los íconos - verificar versión antes de importar** ⭐
17. **Por defecto la app DEBE arrancar pública (sin login) - el login es para admin/barbero** ⭐

---

## 📅 HISTORIAL

### Sesión 1 (10 may): Bug RLS + validaciones + Fase 3
### Sesión 2 (11 may): Email cron + balanceado + multi-tenant
### Sesión 3 (15 may): Refactor + Admin 7 tabs + Bloqueos + Calendario
### Sesión 4 (21 may): Feature Flags + Super Admin
### Sesión 5 (22 may AM): "+ Nueva cita" + email desglose adicionales
### Sesión 6 (22 may PM, hoy): Frontend pasar barberiaId + Refactor landing pública

---

## 📝 PARA EL NUEVO CHAT

**Empezar diciendo:**

"Estoy continuando con TWINS Barbería. Hoy refactoricé App.jsx y VistaInicio.jsx para que la app arranque en una landing pública (sin login) en vez de pedir login.

Pero quedó un bug pendiente: `lucide-react` no tiene el ícono `Instagram` y eso rompe localhost.

PRIMERO: necesito aplicar el fix:
1. En VistaInicio.jsx línea 2: quitar `Instagram` del import de lucide-react
2. Reemplazar `<Instagram size={18} ... />` por `<span className=\"text-amber-200 flex-shrink-0 mt-0.5 text-lg\">📷</span>`

DESPUÉS:
1. Testear que el refactor funciona (landing aparece, reserva sin login OK)
2. Push a producción
3. Verificar bug del +569 en VistaReserva-FASE3.jsx
4. Empezar Stats avanzadas con Recharts (Plan PLUS)

[Pegar contenido de este documento]"

---

**Última actualización:** 2026-05-22 15:30 (hora Chile)
**Estado:**
- Feature Flags ✅
- Super Admin ✅
- "+ Nueva cita" funcional ✅
- Email con adicionales ✅
- Landing pública ⏳ (bug ícono Instagram pendiente)
- Stats avanzadas ⏳ (próxima prioridad)

**Próximo paso inmediato:** Fix bug Instagram + testear refactor login + push
