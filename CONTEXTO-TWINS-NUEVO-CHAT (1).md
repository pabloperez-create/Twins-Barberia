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

**Email testing (Resend):** `pablo.felipee.ps@gmail.com`
**WhatsApp testing:** `56967402940`

---

## 💰 MODELO DE NEGOCIO (3 PLANES)

| Plan | Mensual | Features |
|------|---------|----------|
| BASE | $50 + $10/barbero | Email solo |
| PLUS ⭐ | $80 + $10/barbero | Email + WhatsApp |
| PRO | $120-150 + $10/barbero | + Bot IA + Analytics |

**Margen TWINS (PLUS):** ~73%

---

## 📊 BASE DE DATOS (11 tablas, RLS DESACTIVADO)

1. **barberia** - Organizaciones
2. **usuarios** - Login (admin, barbero, cliente)
3. **barberos** - Estilistas (vinculados a usuarios via `usuario_id`)
4. **servicios_principales** - Cortes (con `activo`)
5. **servicios_adicionales** - Extras (con `activo`)
6. **promociones**
7. **reservas** ⭐ (con `recordatorio_email_enviado_at` + `motivo_cancelacion`)
8. **notificaciones**
9. **configuracion**
10. **estadisticas**
11. **bloqueos_horarios** ⭐ (días libres y vacaciones)

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

### Dependencias npm clave:
- `@supabase/supabase-js`
- `lucide-react`
- `resend`
- `@fullcalendar/react` ⭐
- `@fullcalendar/daygrid`
- `@fullcalendar/timegrid`
- `@fullcalendar/interaction`
- `@fullcalendar/core`

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
- **Agenda:** ⭐ Vista calendario con FullCalendar (Mes/Semana/Día)
  - Color por barbero (automático)
  - Bloqueos en rojo
  - Modal de detalles al click
  - Botones Cancelar + Reagendar
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

### Estrategia ventana 24h WhatsApp
- Botón verde "Confirmar por WhatsApp" en cada email
- Cliente hace click → abre wa.me → ventana 72h gratis
- Ahorro estimado en Twilio: 35-50%

### Reasignación inteligente de reservas
Cuando un barbero crea un bloqueo:
1. Sistema detecta reservas afectadas
2. Para cada una busca barberos disponibles
3. Sugiere reasignar (default) o cancelar
4. Email apropiado al cliente según acción

---

## ⏳ PENDIENTE

### Opción E: Twilio WhatsApp
- Recordatorio 1-2h antes
- Aprovechar ventana 24h
- Template aprobado por Meta (3-5 días)
- Estimado: 3-4 horas + espera Meta

### "+ Nueva cita" desde admin
- Botón ya existe (deshabilitado)
- Permite agregar citas manuales (cliente llamó por teléfono, WhatsApp, etc.)
- Reutilizar VistaReserva-FASE3 o crear modal compacto

### Fase 5: Producción real
- Reactivar RLS con policies
- Self-signup nuevas barberías
- Sistema facturación + Mercado Pago
- Dominio propio
- Configurar Resend con dominio propio

### Mejoras futuras
- Foto de barbero
- Horario por día de la semana
- Bloqueos recurrentes
- Vista calendario admin compartida (recursos por columna)
- Stats avanzadas con gráficos
- Notificación a barbero cuando le reasignan

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
13. Eventos en FullCalendar usan datetime ISO o strings 'YYYY-MM-DD'

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
- **Calendario visual con FullCalendar** ⭐ (Mes/Semana/Día)
- ~20 archivos nuevos creados
- 5 push exitosos

---

## 🎯 PRÓXIMA SESIÓN

**Opciones disponibles para la próxima jornada:**

### **Opción A: Twilio WhatsApp** (~3-4 horas + 3-5 días Meta)
- Recordatorio 1-2h antes
- Aprovecha ventana 24h
- Habilita plan PLUS ($80/mes)
- **Recomendado** porque desbloquea el modelo de negocio

### **Opción B: "+ Nueva cita" funcional** (~1 hora)
- Permite agregar citas manuales desde admin
- Para clientes que llaman/escriben
- Más fácil, más rápido

### **Opción C: Self-signup nuevas barberías** (~3-4 horas)
- Página de signup público
- Onboarding wizard
- Inicio del modelo SaaS real

### **Opción D: Pulir lo existente** (~2 horas)
- Mejoras de UI/UX
- Bug fixes
- Performance
- Testing con TWINS real

---

## 📝 PARA EL NUEVO CHAT

**Empezar diciendo:**

"Estoy continuando con TWINS Barbería. Ya tengo:
- Flujo de reserva completo (6 pasos)
- 5 emails automáticos (confirmación + recordatorio + cancelación + reasignación)
- Panel admin con 7 tabs CRUD (incluye calendario visual)
- Vista barbero con 4 tabs
- Bloqueos con reasignación inteligente
- Calendario FullCalendar Mes/Semana/Día con modal de detalles

Quiero implementar [Opción A / B / C / D]

[Pegar contenido de este documento]"

---

**Última actualización:** 2026-05-15 23:10 (hora Chile)
**Estado:**
- Fase 1 ✅
- Fase 2 ✅
- Fase 3 ✅
- Fase 4 ✅ (100% completa)
- Panel Admin ✅ (100% completo + calendario)
- Vista Barbero ✅ (100% completa)
- Bloqueos ✅
- Calendario ✅ ⭐ NUEVO
- Fase 5 ⏳ (producción real)

**Próximos pasos sugeridos:** Twilio WhatsApp → "+ Nueva cita" → Self-signup
