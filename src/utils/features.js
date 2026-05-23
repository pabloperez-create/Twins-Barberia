// Catálogo completo de features disponibles en el sistema
export const FEATURES = {
  // Features BASE (incluidas en todos los planes)
  flujo_reserva_publico: {
    nombre: "Flujo de reserva pública",
    descripcion: "Los clientes pueden reservar online",
    plan_minimo: "base",
  },
  email_confirmacion: {
    nombre: "Email de confirmación",
    descripcion: "Email automático al crear reserva",
    plan_minimo: "base",
  },
  email_recordatorio: {
    nombre: "Email recordatorio diario",
    descripcion: "Email automático 1 día antes de la cita",
    plan_minimo: "base",
  },
  multi_barberos: {
    nombre: "Múltiples barberos",
    descripcion: "Gestionar varios barberos en el equipo",
    plan_minimo: "base",
  },
  panel_admin: {
    nombre: "Panel de administración",
    descripcion: "Panel completo para gestionar la barbería",
    plan_minimo: "base",
  },
  vista_barbero: {
    nombre: "Vista para barberos",
    descripcion: "Cada barbero ve sus propias reservas",
    plan_minimo: "base",
  },
  bloqueos_horarios: {
    nombre: "Bloqueos de horarios",
    descripcion: "Marcar días libres, vacaciones, citas médicas",
    plan_minimo: "base",
  },
  calendario_visual: {
    nombre: "Calendario visual",
    descripcion: "Vista calendario con Mes/Semana/Día",
    plan_minimo: "base",
  },

  // Features PLUS
  whatsapp_recordatorios: {
    nombre: "WhatsApp recordatorios",
    descripcion: "Recordatorios automáticos por WhatsApp",
    plan_minimo: "plus",
  },
  whatsapp_confirmacion: {
    nombre: "WhatsApp confirmación",
    descripcion: "Confirmación por WhatsApp al reservar",
    plan_minimo: "plus",
  },
  estadisticas_barberia: {
    nombre: "Estadísticas barbería",
    descripcion: "Métricas y estadísticas del negocio",
    plan_minimo: "plus",
  },
  estadisticas_barberos: {
    nombre: "Estadísticas por barbero",
    descripcion: "Cada barbero ve sus propias métricas",
    plan_minimo: "plus",
  },
  estadisticas_avanzadas: {
    nombre: "Estadísticas avanzadas",
    descripcion: "Gráficos, comparaciones, filtros por fecha",
    plan_minimo: "plus",
  },
  reasignacion_inteligente: {
    nombre: "Reasignación inteligente",
    descripcion: "Sugiere reasignar reservas al crear bloqueos",
    plan_minimo: "plus",
  },
  exportar_datos: {
    nombre: "Exportar datos",
    descripcion: "Descargar reservas y clientes en CSV/Excel",
    plan_minimo: "plus",
  },
  personalizar_emails: {
    nombre: "Personalizar emails",
    descripcion: "Logo propio y colores en emails",
    plan_minimo: "plus",
  },
  encuestas_satisfaccion: {
    nombre: "Encuestas de satisfacción",
    descripcion: "Email post-cita con calificación 1-5 estrellas",
    plan_minimo: "plus",
  },

  // Features PRO
  multi_sucursal: {
    nombre: "Multi-sucursal",
    descripcion: "Gestionar varias ubicaciones",
    plan_minimo: "pro",
  },
  bot_whatsapp_ia: {
    nombre: "Bot WhatsApp con IA",
    descripcion: "Responde mensajes automáticamente con IA",
    plan_minimo: "pro",
  },
  analytics_avanzados: {
    nombre: "Analytics avanzados",
    descripcion: "Predicciones, insights con IA, alertas",
    plan_minimo: "pro",
  },
  integraciones: {
    nombre: "Integraciones",
    descripcion: "Google Calendar, contabilidad, etc.",
    plan_minimo: "pro",
  },
  marketing_automatizado: {
    nombre: "Marketing automatizado",
    descripcion: "Campañas, promociones, programa de fidelidad",
    plan_minimo: "pro",
  },
};

// Configuración de planes con precios
export const PLANES = {
  base: {
    nombre: "Plan Base",
    precio_base: 60,
    precio_barbero: 10,
    color: "stone",
  },
  plus: {
    nombre: "Plan Plus",
    precio_base: 80,
    precio_barbero: 10,
    color: "amber",
    destacado: true,
  },
  pro: {
    nombre: "Plan Pro",
    precio_base: 120,
    precio_barbero: 10,
    color: "violet",
  },
};

// Add-ons individuales (sobre plan BASE)
export const ADDONS = {
  whatsapp_recordatorios: { precio: 15, nombre: "WhatsApp recordatorios" },
  estadisticas_avanzadas: { precio: 10, nombre: "Stats avanzadas" },
  encuestas_satisfaccion: { precio: 10, nombre: "Encuestas satisfacción" },
  bot_whatsapp_ia: { precio: 40, nombre: "Bot WhatsApp IA" },
  marketing_automatizado: { precio: 20, nombre: "Marketing" },
  multi_sucursal: { precio: 25, nombre: "Multi-sucursal" },
};

export function isFeatureEnabled(barberia, featureName) {
  if (!barberia || !barberia.configuracion) return false;
  const features = barberia.configuracion.features || {};
  return features[featureName] === true;
}

export function getPlanMinimoFeature(featureName) {
  return FEATURES[featureName]?.plan_minimo || "pro";
}

export function getFeatureNombre(featureName) {
  return FEATURES[featureName]?.nombre || featureName;
}

export function getFeatureDescripcion(featureName) {
  return FEATURES[featureName]?.descripcion || "";
}

export function calcularPrecioPlan(plan, cantidadBarberos) {
  const p = PLANES[plan] || PLANES.base;
  return p.precio_base + p.precio_barbero * cantidadBarberos;
}
