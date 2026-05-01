import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Scissors, Calendar, Clock, User, Plus, Trash2, Check, ChevronLeft, ChevronRight, Settings, X, Edit3, DollarSign, Users, Briefcase, BookOpen, ArrowLeft, Bell, Mail, MessageSquare, Send, ExternalLink, BarChart3, TrendingUp, Award } from 'lucide-react';

// ============== DATOS POR DEFECTO ==============
const DEFAULT_BARBEROS = [
  { id: 'b1', nombre: 'Alonso', especialidad: 'Cortes clásicos & barba', activo: true, horario: { inicio: '09:00', fin: '19:00' }, diasLibres: [0], duracionesPersonalizadas: {}, bloqueos: [
    { id: 'bl1', tipo: 'recurrente', motivo: 'Almuerzo', dias: [1,2,3,4,5,6], horaInicio: '13:00', horaFin: '14:00' }
  ], usuario: 'alonso', password: 'alonso123', rol: 'admin' },
  { id: 'b2', nombre: 'Vicente', especialidad: 'Fades & diseños modernos', activo: true, horario: { inicio: '10:00', fin: '20:00' }, diasLibres: [0, 1], duracionesPersonalizadas: {}, bloqueos: [
    { id: 'bl2', tipo: 'recurrente', motivo: 'Almuerzo', dias: [2,3,4,5,6], horaInicio: '14:00', horaFin: '15:00' }
  ], usuario: 'vicente', password: 'vicente123', rol: 'barbero' },
  { id: 'b3', nombre: 'Johans', especialidad: 'Tinturas & color', activo: true, horario: { inicio: '11:00', fin: '20:00' }, diasLibres: [0], duracionesPersonalizadas: {}, bloqueos: [], usuario: 'johans', password: 'johans123', rol: 'barbero' },
  { id: 'b4', nombre: 'José', especialidad: 'Barbería tradicional', activo: true, horario: { inicio: '09:00', fin: '18:00' }, diasLibres: [0, 3], duracionesPersonalizadas: {}, bloqueos: [], usuario: 'jose', password: 'jose123', rol: 'barbero' },
];

const DEFAULT_SERVICIOS_PRINCIPALES = [
  { id: 's1', nombre: 'Corte clásico', duracion: 30, precio: 12000, descripcion: 'Corte tradicional con tijera y máquina' },
  { id: 's2', nombre: 'Corte premium', duracion: 45, precio: 18000, descripcion: 'Corte detallado con lavado y peinado' },
  { id: 's3', nombre: 'Fade / Degradado', duracion: 45, precio: 16000, descripcion: 'Degradado preciso a navaja' },
  { id: 's4', nombre: 'Corte ejecutivo', duracion: 60, precio: 22000, descripcion: 'Servicio completo con ritual de toalla caliente' },
];

const DEFAULT_ADICIONALES = [
  { id: 'a1', nombre: 'Arreglo de barba', duracion: 20, precio: 7000 },
  { id: 'a2', nombre: 'Diseño de cejas', duracion: 10, precio: 4000 },
  { id: 'a3', nombre: 'Tintura cabello', duracion: 45, precio: 15000 },
  { id: 'a4', nombre: 'Tintura barba', duracion: 30, precio: 10000 },
  { id: 'a5', nombre: 'Mascarilla facial', duracion: 20, precio: 8000 },
  { id: 'a6', nombre: 'Lavado premium', duracion: 15, precio: 5000 },
];

// Configuración global del local (la edita el admin)
const DEFAULT_CONFIG = {
  cancelacionAntelacionMin: 120, // minutos antes de la cita en que se puede cancelar (0 = siempre, 120 = 2h)
};

// Promociones por defecto. Una promo es un combo (servicios + adicionales)
// con un precio especial. Vigencia opcional por fecha/día/hora.
const DEFAULT_PROMOCIONES = [
  {
    id: 'p1',
    nombre: 'Aniversario TWINS',
    descripcion: 'Corte clásico + barba a precio especial',
    servicioIds: ['s1'],          // IDs de servicios principales que componen la promo
    adicionalIds: ['a1'],         // IDs de adicionales que componen la promo
    precioEspecial: 15000,        // precio total del combo en oferta
    activa: true,
    // Vigencia (todos los campos son opcionales, vacío = sin restricción)
    fechaDesde: '',               // formato YYYY-MM-DD; vacío = sin límite inicial
    fechaHasta: '',               // formato YYYY-MM-DD; vacío = sin límite final
    diasSemana: [],               // array de 0-6; vacío = todos los días
    horaDesde: '',                // formato HH:MM; vacío = todo el día
    horaHasta: '',                // formato HH:MM; vacío = todo el día
  },
];

const SLOT_MIN = 15; // granularidad del calendario (15 min)
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ============== HELPERS ==============
const formatearPrecio = (n) => '$' + n.toLocaleString('es-CL');
const pad = (n) => String(n).padStart(2, '0');
const fechaKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutosAHora = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const horaAMinutos = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };

// Devuelve la duración real de un servicio/adicional para un barbero específico.
// Si el barbero tiene un override, lo usa; si no, usa la duración default del ítem.
const duracionPara = (item, barbero) => {
  if (!item) return 0;
  if (barbero && barbero.duracionesPersonalizadas && barbero.duracionesPersonalizadas[item.id] != null) {
    return barbero.duracionesPersonalizadas[item.id];
  }
  return item.duracion;
};

// Devuelve el rango {min, max} de duración del ítem entre los barberos activos.
// Útil para mostrar al cliente antes de que elija barbero.
const rangoDuracion = (item, barberos) => {
  if (!item) return { min: 0, max: 0 };
  const activos = barberos.filter(b => b.activo);
  if (activos.length === 0) return { min: item.duracion, max: item.duracion };
  const duraciones = activos.map(b => duracionPara(item, b));
  return { min: Math.min(...duraciones), max: Math.max(...duraciones) };
};

// Devuelve los bloqueos del barbero que aplican a una fecha dada.
// Cada bloqueo se normaliza a { motivo, inicioMin, finMin } en minutos del día.
const bloqueosEnFecha = (barbero, fecha) => {
  if (!barbero || !barbero.bloqueos) return [];
  const fechaStr = fechaKey(fecha);
  const diaSemana = fecha.getDay();
  const resultado = [];
  for (const bl of barbero.bloqueos) {
    if (bl.tipo === 'puntual') {
      if (bl.fecha === fechaStr) {
        resultado.push({ motivo: bl.motivo, inicioMin: horaAMinutos(bl.horaInicio), finMin: horaAMinutos(bl.horaFin), id: bl.id });
      }
    } else if (bl.tipo === 'recurrente') {
      if (bl.dias && bl.dias.includes(diaSemana)) {
        resultado.push({ motivo: bl.motivo, inicioMin: horaAMinutos(bl.horaInicio), finMin: horaAMinutos(bl.horaFin), id: bl.id });
      }
    }
  }
  return resultado;
};

// Convierte una reserva a un Date de su inicio.
const fechaInicioReserva = (reserva) => {
  const [y, mo, d] = reserva.fecha.split('-').map(Number);
  const [h, mi] = reserva.horaInicio.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
};

// Política de cancelación: ¿el cliente puede cancelar esta reserva ahora?
// Devuelve { puede: bool, motivo: string }
const puedeCancelarCliente = (reserva, config, ahora = new Date()) => {
  if (reserva.estado === 'cancelada') return { puede: false, motivo: 'Esta reserva ya fue cancelada.' };
  const inicio = fechaInicioReserva(reserva);
  const minutosFaltantes = (inicio - ahora) / 60000;
  if (minutosFaltantes < 0) return { puede: false, motivo: 'Esta reserva ya pasó.' };
  const limite = config?.cancelacionAntelacionMin ?? 0;
  if (minutosFaltantes < limite) {
    const horas = Math.floor(limite / 60);
    const mins = limite % 60;
    const txt = horas > 0 ? `${horas}h${mins ? ' ' + mins + 'min' : ''}` : `${mins} min`;
    return { puede: false, motivo: `Las cancelaciones deben hacerse al menos ${txt} antes de la cita. Por favor llámanos al local.` };
  }
  return { puede: true, motivo: '' };
};

// ============================================================================
// PROMOCIONES
// ============================================================================
// Verifica si una promo está vigente en una fecha+hora dadas, según sus reglas.
const promoVigente = (promo, fecha, horaInicio) => {
  if (!promo || !promo.activa) return false;

  if (fecha) {
    const fechaStr = fechaKey(fecha);
    if (promo.fechaDesde && fechaStr < promo.fechaDesde) return false;
    if (promo.fechaHasta && fechaStr > promo.fechaHasta) return false;
    if (promo.diasSemana && promo.diasSemana.length > 0 && !promo.diasSemana.includes(fecha.getDay())) return false;
  }

  if (horaInicio && (promo.horaDesde || promo.horaHasta)) {
    const m = horaAMinutos(horaInicio);
    if (promo.horaDesde && m < horaAMinutos(promo.horaDesde)) return false;
    if (promo.horaHasta && m >= horaAMinutos(promo.horaHasta)) return false;
  }

  return true;
};

// Verifica si una selección (servicio + adicionales) coincide EXACTAMENTE con la
// composición de una promo. Es decir, los items de la promo deben ser los mismos
// que el cliente eligió.
const promoCoincide = (promo, servicio, adicionales) => {
  if (!promo) return false;
  const servicioIds = (promo.servicioIds || []).slice().sort();
  const adicionalIds = (promo.adicionalIds || []).slice().sort();
  const seleccionServicio = servicio ? [servicio.id] : [];
  const seleccionAdic = (adicionales || []).map(a => a.id).sort();

  if (servicioIds.join(',') !== seleccionServicio.join(',')) return false;
  if (adicionalIds.join(',') !== seleccionAdic.join(',')) return false;
  return true;
};

// Busca la mejor promo aplicable a la selección actual.
// Retorna la promo o null si no hay ninguna aplicable.
// "Mejor" = la que ofrezca el precio más bajo (más conveniente para el cliente).
const buscarPromoAplicable = (promociones, servicio, adicionales, fecha, horaInicio) => {
  if (!promociones || promociones.length === 0) return null;
  if (!servicio) return null;

  const candidatas = promociones.filter(p =>
    promoVigente(p, fecha, horaInicio) &&
    promoCoincide(p, servicio, adicionales)
  );

  if (candidatas.length === 0) return null;
  // De haber varias, elegimos la del precio especial más bajo
  return candidatas.reduce((mejor, p) => p.precioEspecial < mejor.precioEspecial ? p : mejor);
};

// Calcula el precio total considerando si hay promo aplicable.
// Devuelve { precioOriginal, precioFinal, promo, ahorro }
const calcularPrecio = (servicio, adicionales, promociones, fecha, horaInicio) => {
  const precioOriginal = (servicio?.precio || 0) + (adicionales || []).reduce((s, a) => s + (a.precio || 0), 0);
  const promo = buscarPromoAplicable(promociones, servicio, adicionales, fecha, horaInicio);
  if (!promo) return { precioOriginal, precioFinal: precioOriginal, promo: null, ahorro: 0 };
  return {
    precioOriginal,
    precioFinal: promo.precioEspecial,
    promo,
    ahorro: Math.max(0, precioOriginal - promo.precioEspecial),
  };
};

// Storage helpers
const storage = {
  async get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('storage error', e);
    }
  }
};

// ============== NOTIFICACIONES ==============
// ============================================================================
// PUNTO DE INTEGRACIÓN PARA EMAIL/WHATSAPP/SMS
// ============================================================================
// Cuando decidas el canal real, solo modifica la función `enviarNotificacionReal`
// más abajo. Toda la app llama a `crearNotificacion` que internamente despacha al
// canal correcto. Mientras tanto, las notificaciones quedan en la bandeja del admin.
// ============================================================================

const TIPOS_NOTIFICACION = {
  RESERVA_CREADA: 'reserva_creada',
  RESERVA_CANCELADA_POR_CLIENTE: 'reserva_cancelada_cliente',
  RESERVA_CANCELADA_POR_LOCAL: 'reserva_cancelada_local',
  RECORDATORIO_24H: 'recordatorio_24h',
  RECORDATORIO_1H: 'recordatorio_1h',
};

// Plantillas de mensaje. Para customizar lo que se envía al cliente, editar aquí.
const plantillaMensaje = (tipo, datos) => {
  const { cliente, barberoNombre, fechaTexto, horaInicio, servicioNombre } = datos;
  const nombre = cliente.nombre.split(' ')[0];

  switch (tipo) {
    case TIPOS_NOTIFICACION.RESERVA_CREADA:
      return {
        asunto: `Reserva confirmada en TWINS — ${fechaTexto} a las ${horaInicio}`,
        cuerpo:
`Hola ${nombre}, tu reserva está confirmada ✂

📅 ${fechaTexto} a las ${horaInicio}
✂ ${servicioNombre}
👤 Con ${barberoNombre}

Si necesitas cancelar o cambiar de hora, responde a este mensaje o llámanos.

¡Te esperamos!
TWINS Barbería`
      };

    case TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_CLIENTE:
      return {
        asunto: `Reserva cancelada — TWINS`,
        cuerpo:
`Hola ${nombre}, hemos recibido la cancelación de tu reserva.

Reserva cancelada:
📅 ${fechaTexto} a las ${horaInicio}
✂ ${servicioNombre}
👤 Con ${barberoNombre}

Cuando quieras reservar de nuevo, estamos a tu disposición.

TWINS Barbería`
      };

    case TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_LOCAL:
      return {
        asunto: `Tu reserva en TWINS fue cancelada`,
        cuerpo:
`Hola ${nombre}, lamentamos informarte que tu reserva fue cancelada por el local:

📅 ${fechaTexto} a las ${horaInicio}
✂ ${servicioNombre}
👤 Con ${barberoNombre}

Por favor llámanos para reagendar o aclarar el motivo. Pedimos disculpas por las molestias.

TWINS Barbería`
      };

    case TIPOS_NOTIFICACION.RECORDATORIO_24H:
      return {
        asunto: `Recordatorio: tu cita en TWINS es mañana`,
        cuerpo:
`Hola ${nombre}, te recordamos que tienes una cita reservada para mañana ⏰

📅 ${fechaTexto} a las ${horaInicio}
✂ ${servicioNombre}
👤 Con ${barberoNombre}

Si no puedes asistir, por favor avísanos con anticipación para que otro cliente pueda tomar tu hora.

¡Te esperamos!
TWINS Barbería`
      };

    case TIPOS_NOTIFICACION.RECORDATORIO_1H:
      return {
        asunto: `Tu cita en TWINS es en 1 hora`,
        cuerpo:
`Hola ${nombre}, tu cita es en aproximadamente 1 hora ⏰

📅 Hoy a las ${horaInicio}
✂ ${servicioNombre}
👤 Con ${barberoNombre}

¡Nos vemos pronto!
TWINS Barbería`
      };

    default:
      return { asunto: 'Notificación TWINS', cuerpo: 'Mensaje del local.' };
  }
};

// Crea el objeto de notificación. Se guarda en el storage para auditoría
// y se intenta despachar por el canal real.
const crearNotificacion = (tipo, reserva, barberoNombre) => {
  const fecha = (() => {
    const [y, mo, d] = reserva.fecha.split('-').map(Number);
    return new Date(y, mo - 1, d);
  })();
  const fechaTexto = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;

  const datos = {
    cliente: reserva.cliente,
    barberoNombre,
    fechaTexto,
    horaInicio: reserva.horaInicio,
    servicioNombre: reserva.servicioNombre,
  };

  const { asunto, cuerpo } = plantillaMensaje(tipo, datos);

  const notif = {
    id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
    tipo,
    reservaId: reserva.id,
    cliente: { nombre: reserva.cliente.nombre, telefono: reserva.cliente.telefono, email: reserva.cliente.email },
    asunto,
    cuerpo,
    canalSugerido: reserva.cliente.email ? 'ambos' : 'whatsapp', // si hay email, ambos; si no, solo wsp
    estado: 'pendiente', // pendiente | enviada | error
    creadaEn: new Date().toISOString(),
  };

  // Disparar el envío real (en producción) — sin esperar para no bloquear el flujo
  enviarNotificacionReal(notif).catch(err => console.error('Error enviando notificación:', err));

  return notif;
};

// ============================================================================
// 🔌 PUNTO DE CONEXIÓN A API REAL
// ============================================================================
// Esta función es la ÚNICA que hay que modificar cuando se integre el envío real.
// Hoy solo registra en consola — mañana se conecta a:
//   - WhatsApp Business API (Meta) o Twilio para WhatsApp/SMS
//   - SendGrid / Resend / Mailgun / SES para email
//
// Ejemplo de implementación futura:
// async function enviarNotificacionReal(notif) {
//   if (notif.cliente.telefono) {
//     await fetch('https://tu-backend.com/api/whatsapp', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ to: notif.cliente.telefono, message: notif.cuerpo })
//     });
//   }
//   if (notif.cliente.email) {
//     await fetch('https://tu-backend.com/api/email', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ to: notif.cliente.email, subject: notif.asunto, body: notif.cuerpo })
//     });
//   }
// }
// ============================================================================
async function enviarNotificacionReal(notif) {
  // Por ahora solo loguea. La notificación queda en la bandeja del admin
  // para que se pueda enviar manualmente con un click.
  console.log('[Notificación pendiente]', notif.tipo, '→', notif.cliente.nombre, notif);
  return { ok: true, simulado: true };
}

// Genera link de WhatsApp listo para abrir el chat con el mensaje pre-cargado.
// El admin puede usar esto desde la bandeja con un solo click.
const linkWhatsApp = (telefono, mensaje) => {
  if (!telefono) return null;
  const tel = telefono.replace(/\D/g, ''); // solo dígitos, así funciona en wa.me
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
};

// Genera link mailto: con asunto y cuerpo listos
const linkMailto = (email, asunto, cuerpo) => {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
};

// ============================================================================
// MOTOR DE RECORDATORIOS AUTOMÁTICOS
// ============================================================================
// Recorre las reservas activas y crea recordatorios cuando corresponde.
// Marca cada reserva con `recordatorio24hCreado` y `recordatorio1hCreado`
// para no duplicar.
//
// Devuelve { reservasActualizadas, nuevasNotificaciones } o null si nada cambió.
//
// EN PRODUCCIÓN: este proceso debería correr en el backend con un cron job
// (cada minuto o cada 5 min). Aquí lo ejecutamos en el frontend mientras
// alguien tenga la app abierta — es suficiente para demo.
// ============================================================================
const procesarRecordatorios = (reservas, barberos, ahora = new Date()) => {
  const nuevasNotificaciones = [];
  let huboCambios = false;

  const reservasActualizadas = reservas.map(r => {
    if (r.estado === 'cancelada') return r;

    const inicio = (() => {
      const [y, mo, d] = r.fecha.split('-').map(Number);
      const [h, mi] = r.horaInicio.split(':').map(Number);
      return new Date(y, mo - 1, d, h, mi);
    })();
    const minutosFaltantes = (inicio - ahora) / 60000;

    // Si la cita ya pasó, no hacer nada
    if (minutosFaltantes < 0) return r;

    let actualizada = r;

    // Recordatorio 24h: se dispara cuando faltan entre 23h y 24h
    // (rango amplio para que aunque el motor se atrase, el recordatorio salga)
    if (!r.recordatorio24hCreado && minutosFaltantes <= 24 * 60 && minutosFaltantes > 60) {
      const barbero = barberos.find(b => b.id === r.barberoId);
      if (barbero) {
        const notif = crearNotificacion(TIPOS_NOTIFICACION.RECORDATORIO_24H, r, barbero.nombre);
        nuevasNotificaciones.push(notif);
        actualizada = { ...actualizada, recordatorio24hCreado: true };
        huboCambios = true;
      }
    }

    // Recordatorio 1h: se dispara cuando falta menos de 1h pero más de 0
    if (!r.recordatorio1hCreado && minutosFaltantes <= 60 && minutosFaltantes > 0) {
      const barbero = barberos.find(b => b.id === r.barberoId);
      if (barbero) {
        const notif = crearNotificacion(TIPOS_NOTIFICACION.RECORDATORIO_1H, r, barbero.nombre);
        nuevasNotificaciones.push(notif);
        actualizada = { ...actualizada, recordatorio1hCreado: true };
        huboCambios = true;
      }
    }

    return actualizada;
  });

  if (!huboCambios) return null;
  return { reservasActualizadas, nuevasNotificaciones };
};

// ============== APP ==============

// Context para usar confirm() personalizado en cualquier componente
// (window.confirm a veces se bloquea en iframes sandbox)
const ConfirmContext = createContext(null);
const useConfirmar = () => useContext(ConfirmContext);

export default function App() {
  const [vista, setVista] = useState('inicio'); // inicio | cliente | admin
  const [barberos, setBarberos] = useState(DEFAULT_BARBEROS);
  const [servicios, setServicios] = useState(DEFAULT_SERVICIOS_PRINCIPALES);
  const [adicionales, setAdicionales] = useState(DEFAULT_ADICIONALES);
  const [reservas, setReservas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [promociones, setPromociones] = useState(DEFAULT_PROMOCIONES);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [cargando, setCargando] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null); // { id, nombre, rol }

  // Estado del modal de confirmación
  const [confirmState, setConfirmState] = useState(null); // { mensaje, titulo, onConfirmar, onCancelar, peligroso }
  const confirmar = (mensaje, opciones = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        mensaje,
        titulo: opciones.titulo || 'Confirmar',
        textoBotonConfirmar: opciones.textoBotonConfirmar || 'Confirmar',
        peligroso: opciones.peligroso || false,
        onResultado: (ok) => { setConfirmState(null); resolve(ok); }
      });
    });
  };

  // Cargar desde storage
  useEffect(() => {
    (async () => {
      let b = await storage.get('barberos', DEFAULT_BARBEROS);
      const s = await storage.get('servicios', DEFAULT_SERVICIOS_PRINCIPALES);
      const a = await storage.get('adicionales', DEFAULT_ADICIONALES);
      const r = await storage.get('reservas', []);
      const n = await storage.get('notificaciones', []);
      const p = await storage.get('promociones', DEFAULT_PROMOCIONES);
      const cfg = await storage.get('config', DEFAULT_CONFIG);

      // Migración: si los barberos guardados no tienen los nuevos campos (usuario, password, rol),
      // significa que vienen de una versión anterior. Los reemplazamos con los defaults nuevos.
      const necesitaMigracion = !Array.isArray(b) || b.length === 0 || b.some(x => !x.usuario || !x.password || !x.rol);
      if (necesitaMigracion) {
        b = DEFAULT_BARBEROS;
        await storage.set('barberos', b);
      }

      setBarberos(b); setServicios(s); setAdicionales(a); setReservas(r);
      setNotificaciones(Array.isArray(n) ? n : []);
      setPromociones(Array.isArray(p) ? p : DEFAULT_PROMOCIONES);
      setConfig({ ...DEFAULT_CONFIG, ...cfg });
      setCargando(false);
    })();
  }, []);

  // Persistir
  useEffect(() => { if (!cargando) storage.set('barberos', barberos); }, [barberos, cargando]);
  useEffect(() => { if (!cargando) storage.set('servicios', servicios); }, [servicios, cargando]);
  useEffect(() => { if (!cargando) storage.set('adicionales', adicionales); }, [adicionales, cargando]);
  useEffect(() => { if (!cargando) storage.set('reservas', reservas); }, [reservas, cargando]);
  useEffect(() => { if (!cargando) storage.set('notificaciones', notificaciones); }, [notificaciones, cargando]);
  useEffect(() => { if (!cargando) storage.set('promociones', promociones); }, [promociones, cargando]);
  useEffect(() => { if (!cargando) storage.set('config', config); }, [config, cargando]);

  // Motor de recordatorios: revisa cada minuto si hay que disparar recordatorios
  // de 24h o 1h antes de las citas. En producción esto sería un cron en backend.
  useEffect(() => {
    if (cargando) return;

    const tick = () => {
      const resultado = procesarRecordatorios(reservas, barberos);
      if (resultado) {
        setReservas(resultado.reservasActualizadas);
        setNotificaciones(prev => [...resultado.nuevasNotificaciones, ...prev]);
      }
    };

    // Ejecutar inmediatamente al cargar (por si la app estuvo cerrada y hay
    // recordatorios atrasados que disparar) y luego cada 60 segundos.
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [cargando, reservas, barberos]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-amber-100 font-serif text-2xl tracking-widest animate-pulse">CARGANDO…</div>
      </div>
    );
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
          .font-serif-c { font-family: 'Cormorant Garamond', Georgia, serif; }
          .font-sans-c { font-family: 'Inter', system-ui, sans-serif; }
          .barber-stripe {
            background: repeating-linear-gradient(45deg, #b91c1c 0 8px, #fef3c7 8px 16px, #1e3a8a 16px 24px, #fef3c7 24px 32px);
          }
          .grain { position: relative; }
          .grain::before {
            content: ''; position: absolute; inset: 0; pointer-events: none;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.85 0 0 0 0 0.7 0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
            mix-blend-mode: overlay; opacity: 0.4;
          }
        `}</style>

        {vista === 'inicio' && <Inicio onElegir={(v) => { if (v === 'admin') { setUsuarioActual(null); } setVista(v); }} />}
        {vista === 'cliente' && <VistaCliente {...{ barberos, servicios, adicionales, reservas, setReservas, notificaciones, setNotificaciones, promociones, config, volver: () => setVista('inicio') }} />}
        {vista === 'admin' && !usuarioActual && (
          <PantallaLogin barberos={barberos} onLogin={setUsuarioActual} volver={() => setVista('inicio')}
            onResetDemo={async () => {
              const ok = await confirmar(
                'Esto restablecerá TODOS los datos (barberos, servicios, adicionales, reservas, configuración) a los valores iniciales.',
                { titulo: 'Restablecer datos', textoBotonConfirmar: 'Sí, restablecer todo', peligroso: true }
              );
              if (ok) {
                await storage.set('barberos', DEFAULT_BARBEROS);
                await storage.set('servicios', DEFAULT_SERVICIOS_PRINCIPALES);
                await storage.set('adicionales', DEFAULT_ADICIONALES);
                await storage.set('reservas', []);
                await storage.set('notificaciones', []);
                await storage.set('promociones', DEFAULT_PROMOCIONES);
                await storage.set('config', DEFAULT_CONFIG);
                setBarberos(DEFAULT_BARBEROS);
                setServicios(DEFAULT_SERVICIOS_PRINCIPALES);
                setAdicionales(DEFAULT_ADICIONALES);
                setReservas([]);
                setNotificaciones([]);
                setPromociones(DEFAULT_PROMOCIONES);
                setConfig(DEFAULT_CONFIG);
                await confirmar('Datos restablecidos. Ya puedes entrar con las credenciales demo.', { titulo: 'Listo', textoBotonConfirmar: 'OK' });
              }
            }}
          />
        )}
        {vista === 'admin' && usuarioActual && (
          <PanelAdmin {...{ barberos, setBarberos, servicios, setServicios, adicionales, setAdicionales, reservas, setReservas, notificaciones, setNotificaciones, promociones, setPromociones, config, setConfig, usuarioActual, cerrarSesion: () => { setUsuarioActual(null); setVista('inicio'); } }} />
        )}

        {/* Modal global de confirmación */}
        {confirmState && <ModalConfirmacion {...confirmState} />}
      </div>
    </ConfirmContext.Provider>
  );
}

// ============== MODAL DE CONFIRMACIÓN ==============
function ModalConfirmacion({ titulo, mensaje, textoBotonConfirmar, peligroso, onResultado }) {
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-stone-950 border border-stone-700 w-full max-w-md p-6">
        <h3 className="font-display text-2xl text-amber-50 mb-3">{titulo.toUpperCase()}</h3>
        <p className="font-serif-c text-stone-300 text-base mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => onResultado(false)}
            className="px-5 py-2 border border-stone-700 text-stone-300 font-sans-c text-sm uppercase tracking-wider hover:border-stone-500 transition">
            Cancelar
          </button>
          <button onClick={() => onResultado(true)}
            className={`px-5 py-2 font-sans-c text-sm uppercase tracking-wider transition
              ${peligroso ? 'bg-red-500 text-stone-50 hover:bg-red-600' : 'bg-amber-200 text-stone-950 hover:bg-amber-100'}`}>
            {textoBotonConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== PANTALLA INICIO ==============
function Inicio({ onElegir }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 grain relative overflow-hidden">
      <div className="barber-stripe absolute top-0 left-0 right-0 h-2"></div>
      <div className="barber-stripe absolute bottom-0 left-0 right-0 h-2"></div>

      <div className="text-center mb-12 relative z-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px w-16 bg-amber-200/40"></div>
          <Scissors className="text-amber-200" size={32} strokeWidth={1} />
          <div className="h-px w-16 bg-amber-200/40"></div>
        </div>
        <h1 className="font-display text-7xl md:text-8xl text-amber-50 mb-2">TWINS</h1>
        <p className="font-serif-c italic text-amber-200/70 text-xl">— desde 2022 —</p>
        <p className="font-sans-c text-stone-400 text-sm mt-6 tracking-widest uppercase">Sistema de Reservas</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl relative z-10">
        <button onClick={() => onElegir('cliente')}
          className="group bg-stone-900/60 border border-amber-200/20 p-10 hover:border-amber-200/60 transition-all hover:bg-stone-900/90 text-left">
          <Calendar className="text-amber-200 mb-4 group-hover:scale-110 transition" size={40} strokeWidth={1} />
          <h2 className="font-display text-3xl text-amber-50 mb-2">RESERVAR HORA</h2>
          <p className="font-serif-c text-stone-400 text-lg">Elige tu barbero, servicio y adicionales</p>
          <div className="mt-6 font-sans-c text-xs uppercase tracking-widest text-amber-200/60 group-hover:text-amber-200">Para clientes →</div>
        </button>

        <button onClick={() => onElegir('admin')}
          className="group bg-stone-900/60 border border-stone-700 p-10 hover:border-stone-500 transition-all hover:bg-stone-900/90 text-left">
          <Settings className="text-stone-300 mb-4 group-hover:rotate-45 transition-transform duration-500" size={40} strokeWidth={1} />
          <h2 className="font-display text-3xl text-stone-100 mb-2">PANEL ADMIN</h2>
          <p className="font-serif-c text-stone-400 text-lg">Gestiona barberos, servicios y reservas</p>
          <div className="mt-6 font-sans-c text-xs uppercase tracking-widest text-stone-400 group-hover:text-stone-200">Para el local →</div>
        </button>
      </div>
    </div>
  );
}

// ============== PANTALLA LOGIN ==============
function PantallaLogin({ barberos, onLogin, volver, onResetDemo }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verCredenciales, setVerCredenciales] = useState(false);

  const intentarLogin = () => {
    setError('');
    const u = usuario.trim().toLowerCase();
    const encontrado = barberos.find(b => (b.usuario || '').toLowerCase() === u && b.password === password);
    if (!encontrado) { setError('Usuario o contraseña incorrectos.'); return; }
    if (!encontrado.activo) { setError('Este usuario está desactivado. Contacta al administrador.'); return; }
    onLogin({ id: encontrado.id, nombre: encontrado.nombre, rol: encontrado.rol || 'barbero' });
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') intentarLogin(); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 grain relative overflow-hidden">
      <div className="barber-stripe absolute top-0 left-0 right-0 h-2"></div>
      <div className="barber-stripe absolute bottom-0 left-0 right-0 h-2"></div>

      <button onClick={volver} className="absolute top-8 left-8 flex items-center gap-2 text-stone-400 hover:text-amber-200 transition z-10">
        <ArrowLeft size={18} /> <span className="font-sans-c text-sm uppercase tracking-wider">Volver</span>
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-px w-10 bg-amber-200/40"></div>
            <Settings className="text-amber-200" size={24} strokeWidth={1} />
            <div className="h-px w-10 bg-amber-200/40"></div>
          </div>
          <h1 className="font-display text-5xl text-amber-50 mb-1">PANEL TWINS</h1>
          <p className="font-serif-c italic text-amber-200/70">Acceso para barberos</p>
        </div>

        <div className="bg-stone-900/60 border border-amber-200/20 p-8">
          <div className="space-y-4">
            <div>
              <label className="font-sans-c text-xs uppercase tracking-widest text-stone-400 block mb-2">Usuario</label>
              <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} onKeyDown={onKeyDown}
                autoFocus
                className="w-full bg-stone-950 border border-stone-700 px-4 py-3 font-serif-c text-lg text-amber-50 focus:border-amber-200 outline-none transition" />
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-widest text-stone-400 block mb-2">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown}
                className="w-full bg-stone-950 border border-stone-700 px-4 py-3 font-serif-c text-lg text-amber-50 focus:border-amber-200 outline-none transition" />
            </div>

            {error && <p className="font-serif-c italic text-red-400 text-sm">{error}</p>}

            <button onClick={intentarLogin}
              className="w-full py-3 bg-amber-200 text-stone-950 font-display text-lg tracking-wider hover:bg-amber-100 transition mt-2">
              ENTRAR
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800">
            <button onClick={() => setVerCredenciales(!verCredenciales)}
              className="font-sans-c text-xs uppercase tracking-wider text-stone-500 hover:text-amber-200 transition">
              {verCredenciales ? '— Ocultar credenciales de demo' : '+ Ver credenciales de demo'}
            </button>
            {verCredenciales && (
              <div className="mt-3 font-sans-c text-xs text-stone-400 space-y-1">
                <p className="text-amber-200/70 mb-2 italic">Solo en demo. Cámbialas en producción.</p>
                <p><span className="text-amber-200">alonso</span> / alonso123 <span className="text-stone-500">(admin)</span></p>
                <p><span className="text-amber-200">vicente</span> / vicente123</p>
                <p><span className="text-amber-200">johans</span> / johans123</p>
                <p><span className="text-amber-200">jose</span> / jose123</p>

                {onResetDemo && (
                  <button onClick={onResetDemo}
                    className="mt-3 w-full py-2 border border-stone-700 hover:border-red-400/60 text-stone-500 hover:text-red-400 font-sans-c text-[10px] uppercase tracking-widest transition">
                    ↻ Restablecer datos demo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== VISTA CLIENTE ==============
function VistaCliente({ barberos, servicios, adicionales, reservas, setReservas, notificaciones, setNotificaciones, promociones, config, volver }) {
  const [paso, setPaso] = useState(1); // 1: servicio, 2: adicionales, 3: barbero+fecha, 4: hora, 5: datos, 6: confirmación
  const [seleccion, setSeleccion] = useState({
    servicio: null,
    adicionales: [],
    barbero: null,
    fecha: null,
    hora: null,
    cliente: { nombre: '', telefono: '', email: '' }
  });
  const [reservaCreadaId, setReservaCreadaId] = useState(null);

  const duracionTotal = useMemo(() => {
    const dServicio = duracionPara(seleccion.servicio, seleccion.barbero);
    const dAdic = seleccion.adicionales.reduce((s, a) => s + duracionPara(a, seleccion.barbero), 0);
    return dServicio + dAdic;
  }, [seleccion.servicio, seleccion.adicionales, seleccion.barbero]);

  // Calcular precio considerando promociones aplicables
  // (la promo depende de la fecha y hora seleccionadas)
  const precioInfo = useMemo(() => {
    return calcularPrecio(seleccion.servicio, seleccion.adicionales, promociones, seleccion.fecha, seleccion.hora);
  }, [seleccion.servicio, seleccion.adicionales, promociones, seleccion.fecha, seleccion.hora]);

  const precioTotal = precioInfo.precioFinal;
  const precioOriginal = precioInfo.precioOriginal;
  const promoActiva = precioInfo.promo;

  const confirmarReserva = () => {
    const id = 'r' + Date.now();
    // Guardamos el teléfono completo con prefijo internacional para que esté listo
    // para WhatsApp/SMS sin necesidad de procesar después
    const telLimpio = (seleccion.cliente.telefono || '').replace(/\D/g, '');
    const telCompleto = telLimpio ? `+569${telLimpio}` : '';
    const emailLimpio = (seleccion.cliente.email || '').trim().toLowerCase();

    const nuevaReserva = {
      id,
      barberoId: seleccion.barbero.id,
      servicioId: seleccion.servicio.id,
      servicioNombre: seleccion.servicio.nombre,
      adicionales: seleccion.adicionales.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, duracion: duracionPara(a, seleccion.barbero) })),
      fecha: fechaKey(seleccion.fecha),
      horaInicio: seleccion.hora,
      duracion: duracionTotal,
      precio: precioTotal,
      cliente: {
        nombre: seleccion.cliente.nombre.trim(),
        telefono: telCompleto,
        email: emailLimpio
      },
      promo: promoActiva ? {
        id: promoActiva.id,
        nombre: promoActiva.nombre,
        precioOriginal,
        precioEspecial: promoActiva.precioEspecial,
        ahorro: precioOriginal - promoActiva.precioEspecial,
      } : null,
      estado: 'activa',
      creadaEn: new Date().toISOString()
    };
    setReservas([...reservas, nuevaReserva]);

    // Disparar notificación al cliente: reserva confirmada
    const notif = crearNotificacion(TIPOS_NOTIFICACION.RESERVA_CREADA, nuevaReserva, seleccion.barbero.nombre);
    setNotificaciones(prev => [notif, ...prev]);

    setReservaCreadaId(id);
    setPaso(6);
  };

  // Cancelar la reserva recién creada (desde el botón en confirmación)
  const confirmar = useConfirmar();
  const cancelarReservaCreada = async () => {
    if (!reservaCreadaId) return false;
    const reserva = reservas.find(r => r.id === reservaCreadaId) || {
      id: reservaCreadaId, fecha: fechaKey(seleccion.fecha), horaInicio: seleccion.hora, estado: 'activa'
    };
    const check = puedeCancelarCliente(reserva, config);
    if (!check.puede) {
      await confirmar(check.motivo, { titulo: 'No se puede cancelar', textoBotonConfirmar: 'Entendido' });
      return false;
    }
    const ok = await confirmar('¿Seguro que quieres cancelar tu reserva? Esta acción no se puede deshacer.',
      { titulo: 'Cancelar reserva', textoBotonConfirmar: 'Sí, cancelar', peligroso: true });
    if (!ok) return false;
    setReservas(prev => prev.filter(r => r.id !== reservaCreadaId));

    // Disparar notificación: cancelada por cliente
    const notif = crearNotificacion(TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_CLIENTE, reserva, seleccion.barbero.nombre);
    setNotificaciones(prev => [notif, ...prev]);

    return true;
  };

  return (
    <div className="min-h-screen grain">
      <div className="barber-stripe h-2"></div>
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={volver} className="flex items-center gap-2 text-stone-400 hover:text-amber-200 transition">
            <ArrowLeft size={18} /> <span className="font-sans-c text-sm uppercase tracking-wider">Volver</span>
          </button>
          <div className="flex items-center gap-3">
            <Scissors className="text-amber-200" size={20} strokeWidth={1.5} />
            <span className="font-display text-xl text-amber-50">TWINS</span>
          </div>
          <div className="w-20"></div>
        </div>

        {paso < 6 && (
          <div className="max-w-5xl mx-auto px-6 pb-4">
            <ProgresoPasos pasoActual={paso} />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {paso === 1 && <PasoServicio servicios={servicios} adicionales={adicionales} barberos={barberos} promociones={promociones} seleccionado={seleccion.servicio}
          onSeleccionar={(s) => { setSeleccion({ ...seleccion, servicio: s }); setPaso(2); }}
          onElegirPromo={(promo) => {
            // Autocompletar selección con los items del combo de la promo
            const servicioPromo = servicios.find(s => s.id === promo.servicioIds?.[0]);
            const adicionalesPromo = (promo.adicionalIds || [])
              .map(id => adicionales.find(a => a.id === id))
              .filter(Boolean);
            if (!servicioPromo && adicionalesPromo.length === 0) return;
            setSeleccion({
              ...seleccion,
              servicio: servicioPromo || seleccion.servicio,
              adicionales: adicionalesPromo,
            });
            // Saltar al paso 3 (elegir barbero) — los pasos 1 y 2 ya están resueltos por la promo
            setPaso(3);
          }}
        />}

        {paso === 2 && <PasoAdicionales adicionales={adicionales} barberos={barberos} seleccionados={seleccion.adicionales}
          onToggle={(a) => {
            const yaEsta = seleccion.adicionales.find(x => x.id === a.id);
            setSeleccion({ ...seleccion, adicionales: yaEsta ? seleccion.adicionales.filter(x => x.id !== a.id) : [...seleccion.adicionales, a] });
          }}
          duracionTotal={duracionTotal} precioTotal={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva}
          servicio={seleccion.servicio}
          onContinuar={() => setPaso(3)} onAtras={() => setPaso(1)} />}

        {paso === 3 && <PasoBarberoFecha barberos={barberos} reservas={reservas} duracionTotal={duracionTotal}
          servicio={seleccion.servicio} adicionalesSel={seleccion.adicionales}
          barberoSel={seleccion.barbero} fechaSel={seleccion.fecha}
          onSeleccionar={(b, f) => setSeleccion({ ...seleccion, barbero: b, fecha: f })}
          onContinuar={() => setPaso(4)} onAtras={() => setPaso(2)} />}

        {paso === 4 && <PasoHora barbero={seleccion.barbero} fecha={seleccion.fecha} duracion={duracionTotal} reservas={reservas}
          horaSel={seleccion.hora}
          onSeleccionar={(h) => setSeleccion({ ...seleccion, hora: h })}
          onContinuar={() => setPaso(5)} onAtras={() => setPaso(3)} />}

        {paso === 5 && <PasoDatos seleccion={seleccion} duracionTotal={duracionTotal} precioTotal={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva}
          onCambio={(c) => setSeleccion({ ...seleccion, cliente: c })}
          onConfirmar={confirmarReserva} onAtras={() => setPaso(4)} />}

        {paso === 6 && <PasoConfirmacion seleccion={seleccion} duracionTotal={duracionTotal} precioTotal={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva} volver={volver} config={config} onCancelar={cancelarReservaCreada} />}
      </main>
    </div>
  );
}

function ProgresoPasos({ pasoActual }) {
  const pasos = ['Servicio', 'Adicionales', 'Barbero', 'Hora', 'Datos'];
  return (
    <div className="flex items-center gap-2">
      {pasos.map((p, i) => (
        <React.Fragment key={p}>
          <div className={`flex items-center gap-2 ${i + 1 <= pasoActual ? 'text-amber-200' : 'text-stone-600'}`}>
            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-sans-c
              ${i + 1 < pasoActual ? 'bg-amber-200 text-stone-950 border-amber-200'
                : i + 1 === pasoActual ? 'border-amber-200 text-amber-200'
                  : 'border-stone-700'}`}>
              {i + 1 < pasoActual ? <Check size={14} /> : i + 1}
            </div>
            <span className="hidden sm:block font-sans-c text-xs uppercase tracking-wider">{p}</span>
          </div>
          {i < pasos.length - 1 && <div className={`flex-1 h-px ${i + 1 < pasoActual ? 'bg-amber-200' : 'bg-stone-700'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function PasoServicio({ servicios, adicionales, barberos, promociones, seleccionado, onSeleccionar, onElegirPromo }) {
  // Filtrar promos: activas y con items reales del catálogo.
  // Las separamos en dos listas: vigentes hoy vs próximas (comienzan en los próximos 7 días)
  const { promosVigentes, promosProximas } = useMemo(() => {
    if (!promociones) return { promosVigentes: [], promosProximas: [] };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = fechaKey(hoy);
    const en7Dias = new Date(hoy); en7Dias.setDate(en7Dias.getDate() + 7);
    const en7DiasStr = fechaKey(en7Dias);

    const vigentes = [];
    const proximas = [];

    promociones.forEach(p => {
      if (!p.activa) return;
      // Validar que tenga items reales
      const itemsValidos =
        (p.servicioIds || []).some(id => servicios.find(s => s.id === id)) ||
        (p.adicionalIds || []).some(id => adicionales.find(a => a.id === id));
      if (!itemsValidos) return;

      // Si la promo ya terminó (fechaHasta < hoy), descartarla
      if (p.fechaHasta && p.fechaHasta < hoyStr) return;

      // Si la promo aún no comienza
      if (p.fechaDesde && p.fechaDesde > hoyStr) {
        // Mostrarla como "próxima" si comienza en los próximos 7 días
        if (p.fechaDesde <= en7DiasStr) {
          proximas.push(p);
        }
        return;
      }

      // Vigente hoy: validar día de la semana si aplica
      if (p.diasSemana && p.diasSemana.length > 0 && !p.diasSemana.includes(hoy.getDay())) {
        // Es vigente en general pero no aplica HOY — la mostramos igual con info de cuándo aplica
        // (si tiene días específicos que NO incluyen hoy, todavía es interesante mostrarla
        // porque puede aplicar en otro día dentro del rango de fecha)
        vigentes.push({ ...p, _noAplicaHoy: true });
      } else {
        vigentes.push(p);
      }
    });

    return { promosVigentes: vigentes, promosProximas: proximas };
  }, [promociones, servicios, adicionales]);

  const totalPromos = promosVigentes.length + promosProximas.length;

  return (
    <div>
      {/* Banner de promociones */}
      {totalPromos > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Award size={18} className="text-amber-300" strokeWidth={1.5} />
            <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-300">
              {promosVigentes.length > 0 && promosProximas.length > 0
                ? 'Ofertas vigentes y próximas'
                : promosVigentes.length > 0
                  ? (promosVigentes.length === 1 ? 'Oferta vigente' : 'Ofertas vigentes')
                  : (promosProximas.length === 1 ? 'Próxima oferta' : 'Próximas ofertas')}
            </p>
            <div className="flex-1 h-px bg-amber-300/20"></div>
          </div>
          <div className={`grid gap-3 ${totalPromos === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {promosVigentes.map(p => (
              <BannerPromo key={p.id} promo={p} servicios={servicios} adicionales={adicionales}
                onClick={() => onElegirPromo(p)} variante="vigente" />
            ))}
            {promosProximas.map(p => (
              <BannerPromo key={p.id} promo={p} servicios={servicios} adicionales={adicionales}
                onClick={null} variante="proxima" />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Paso 1</p>
        <h2 className="font-display text-5xl text-amber-50">Elige tu corte</h2>
        <p className="font-serif-c italic text-stone-400 text-lg mt-2">
          {promosVigentes.length > 0 ? 'O elige tu corte y arma tu combinación' : 'El servicio principal de tu visita'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {servicios.map(s => {
          const r = rangoDuracion(s, barberos);
          const varia = r.min !== r.max;
          return (
            <button key={s.id} onClick={() => onSeleccionar(s)}
              className={`text-left p-6 border transition-all
                ${seleccionado?.id === s.id ? 'bg-amber-200/5 border-amber-200' : 'border-stone-800 hover:border-stone-600 bg-stone-900/40'}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-display text-2xl text-amber-50">{s.nombre.toUpperCase()}</h3>
                <span className="font-serif-c text-2xl text-amber-200">{formatearPrecio(s.precio)}</span>
              </div>
              <p className="font-serif-c text-stone-400 italic mb-4">{s.descripcion}</p>
              <div className="flex items-center gap-2 text-stone-500 font-sans-c text-xs uppercase tracking-wider">
                <Clock size={14} /> {varia ? `${r.min} – ${r.max} min · varía por barbero` : `${r.min} minutos`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Banner clickeable de una promoción — diseñado para enganchar al cliente
// variante: 'vigente' (clickeable, llamativa) | 'proxima' (informativa, no clickeable)
function BannerPromo({ promo, servicios, adicionales, onClick, variante = 'vigente' }) {
  // Calcular precio normal y armar lista de items legible
  const { precioNormal, itemsTexto } = useMemo(() => {
    let total = 0;
    const items = [];
    (promo.servicioIds || []).forEach(id => {
      const s = servicios.find(x => x.id === id);
      if (s) { total += s.precio; items.push(s.nombre); }
    });
    (promo.adicionalIds || []).forEach(id => {
      const a = adicionales.find(x => x.id === id);
      if (a) { total += a.precio; items.push(a.nombre); }
    });
    return { precioNormal: total, itemsTexto: items.join(' + ') };
  }, [promo, servicios, adicionales]);

  const ahorro = Math.max(0, precioNormal - promo.precioEspecial);
  const porcentaje = precioNormal > 0 ? Math.round((ahorro / precioNormal) * 100) : 0;

  // === Construir mensajes inteligentes de disponibilidad ===
  const { mensajeUrgencia, urgenciaNivel } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = fechaKey(hoy);

    // Caso 1: aún no comienza
    if (promo.fechaDesde && promo.fechaDesde > hoyStr) {
      const [y, mo, d] = promo.fechaDesde.split('-').map(Number);
      const fechaInicio = new Date(y, mo - 1, d);
      const diasFaltantes = Math.ceil((fechaInicio - hoy) / 86400000);
      if (diasFaltantes === 1) return { mensajeUrgencia: 'Comienza mañana', urgenciaNivel: 'info' };
      if (diasFaltantes <= 7) return { mensajeUrgencia: `Comienza en ${diasFaltantes} días`, urgenciaNivel: 'info' };
      return { mensajeUrgencia: `Disponible desde el ${fechaInicio.getDate()} de ${MESES[fechaInicio.getMonth()].toLowerCase()}`, urgenciaNivel: 'info' };
    }

    // Caso 2: la promo no aplica HOY pero está en el rango (días específicos)
    if (promo._noAplicaHoy) {
      const proximosDias = (promo.diasSemana || []).map(d => DIAS_SEMANA[d]).join(', ');
      return { mensajeUrgencia: `Solo ${proximosDias}`, urgenciaNivel: 'info' };
    }

    // Caso 3: la promo termina pronto — ¡urgencia!
    if (promo.fechaHasta) {
      const [y, mo, d] = promo.fechaHasta.split('-').map(Number);
      const fechaFin = new Date(y, mo - 1, d);
      const diasRestantes = Math.ceil((fechaFin - hoy) / 86400000);

      if (diasRestantes === 0) return { mensajeUrgencia: '⏰ Termina hoy', urgenciaNivel: 'critica' };
      if (diasRestantes === 1) return { mensajeUrgencia: '⏰ Último día mañana', urgenciaNivel: 'critica' };
      if (diasRestantes <= 3) return { mensajeUrgencia: `⏰ Solo quedan ${diasRestantes} días`, urgenciaNivel: 'alta' };
      if (diasRestantes <= 7) return { mensajeUrgencia: `Termina el ${fechaFin.getDate()} de ${MESES[fechaFin.getMonth()].slice(0, 3).toLowerCase()}`, urgenciaNivel: 'media' };
      return { mensajeUrgencia: `Vigente hasta el ${fechaFin.getDate()} de ${MESES[fechaFin.getMonth()].toLowerCase()}`, urgenciaNivel: 'baja' };
    }

    // Caso 4: días específicos sin fecha límite
    if (promo.diasSemana && promo.diasSemana.length > 0 && promo.diasSemana.length < 7) {
      const dias = promo.diasSemana.map(d => DIAS_SEMANA[d]).join(', ');
      return { mensajeUrgencia: `Solo ${dias}`, urgenciaNivel: 'baja' };
    }

    return { mensajeUrgencia: 'Vigente ahora', urgenciaNivel: 'baja' };
  }, [promo]);

  // Hora si está restringida
  const horaTexto = (promo.horaDesde && promo.horaHasta) ? `de ${promo.horaDesde} a ${promo.horaHasta}` : null;

  // Estilos según urgencia
  const estilosUrgencia = {
    critica: 'bg-red-500 text-white animate-pulse',
    alta: 'bg-amber-300 text-stone-950',
    media: 'bg-amber-200/20 text-amber-200 border border-amber-200/40',
    info: 'bg-blue-500/20 text-blue-200 border border-blue-400/40',
    baja: 'bg-stone-800 text-amber-200/80 border border-amber-200/20',
  };
  const estiloChip = estilosUrgencia[urgenciaNivel] || estilosUrgencia.baja;

  // Si es próxima, banner deshabilitado (no clickeable, más sobrio)
  const esVigente = variante === 'vigente';
  const claseFondo = esVigente
    ? 'bg-gradient-to-br from-amber-300/10 via-stone-900 to-stone-900 border-amber-300/50 hover:border-amber-300 hover:from-amber-300/20'
    : 'bg-stone-900/60 border-stone-700 opacity-90';

  const Element = esVigente ? 'button' : 'div';

  return (
    <Element
      onClick={esVigente ? onClick : undefined}
      className={`group relative overflow-hidden text-left border p-5 transition-all ${claseFondo}`}>

      {/* Cinta diagonal de descuento */}
      <div className={`absolute -right-12 top-5 px-12 py-1 rotate-45 font-display text-xs tracking-widest shadow-lg
        ${esVigente ? 'bg-amber-300 text-stone-950' : 'bg-stone-700 text-stone-300'}`}>
        −{porcentaje}%
      </div>

      {/* Brillo decorativo en hover (solo si es vigente) */}
      {esVigente && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`font-sans-c text-[10px] uppercase tracking-widest px-2 py-0.5
            ${esVigente ? 'bg-amber-300 text-stone-950' : 'bg-stone-700 text-stone-300'}`}>
            {esVigente ? 'Oferta' : 'Próximamente'}
          </span>
          {/* Chip de urgencia/disponibilidad — el corazón de tu pedido */}
          <span className={`font-sans-c text-[10px] uppercase tracking-widest px-2 py-0.5 ${estiloChip}`}>
            {mensajeUrgencia}
          </span>
          {horaTexto && (
            <span className="font-sans-c text-[10px] uppercase tracking-wider text-amber-200/70">
              {horaTexto}
            </span>
          )}
        </div>

        <h3 className="font-display text-2xl text-amber-50 mb-1 pr-12">{promo.nombre.toUpperCase()}</h3>
        {promo.descripcion && <p className="font-serif-c italic text-amber-100/70 text-sm mb-3">{promo.descripcion}</p>}

        <p className="font-serif-c text-stone-300 mb-4">{itemsTexto}</p>

        <div className="flex items-baseline gap-3 pb-2 border-b border-amber-300/20">
          <span className="font-serif-c text-base text-stone-500 line-through">{formatearPrecio(precioNormal)}</span>
          <span className={`font-display text-3xl ${esVigente ? 'text-amber-300' : 'text-stone-300'}`}>
            {formatearPrecio(promo.precioEspecial)}
          </span>
          {ahorro > 0 && <span className="font-sans-c text-[11px] uppercase tracking-wider text-amber-300/80">ahorras {formatearPrecio(ahorro)}</span>}
        </div>

        {esVigente ? (
          <p className="font-sans-c text-xs uppercase tracking-widest text-amber-200 mt-3 group-hover:text-amber-100 transition flex items-center gap-1">
            Tomar esta oferta <span className="group-hover:translate-x-1 transition-transform">→</span>
          </p>
        ) : (
          <p className="font-sans-c text-xs uppercase tracking-widest text-stone-500 mt-3 italic">
            Aún no disponible
          </p>
        )}
      </div>
    </Element>
  );
}

function PasoAdicionales({ adicionales, barberos, seleccionados, onToggle, duracionTotal, precioTotal, precioOriginal, promoActiva, servicio, onContinuar, onAtras }) {
  return (
    <div>
      <div className="mb-8">
        <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Paso 2 — Opcional</p>
        <h2 className="font-display text-5xl text-amber-50">Adicionales</h2>
        <p className="font-serif-c italic text-stone-400 text-lg mt-2">Mejora tu experiencia · el tiempo final se ajusta según tu barbero</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {adicionales.map(a => {
          const activo = seleccionados.find(x => x.id === a.id);
          const r = rangoDuracion(a, barberos);
          const varia = r.min !== r.max;
          return (
            <button key={a.id} onClick={() => onToggle(a)}
              className={`flex items-center justify-between p-5 border transition-all text-left
                ${activo ? 'bg-amber-200/5 border-amber-200' : 'border-stone-800 hover:border-stone-600 bg-stone-900/40'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-6 h-6 border flex items-center justify-center
                  ${activo ? 'bg-amber-200 border-amber-200 text-stone-950' : 'border-stone-600'}`}>
                  {activo && <Check size={14} strokeWidth={3} />}
                </div>
                <div>
                  <h4 className="font-display text-xl text-amber-50">{a.nombre.toUpperCase()}</h4>
                  <p className="font-sans-c text-xs text-stone-500 uppercase tracking-wider mt-1">+{varia ? `${r.min}–${r.max}` : r.min} min</p>
                </div>
              </div>
              <span className="font-serif-c text-xl text-amber-200">+{formatearPrecio(a.precio)}</span>
            </button>
          );
        })}
      </div>

      <ResumenFlotante servicio={servicio} adicionales={seleccionados} duracion={duracionTotal} precio={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva} barberos={barberos} mostrarAviso={true} />

      <BotonesNav onAtras={onAtras} onContinuar={onContinuar} continuarLabel="Continuar →" />
    </div>
  );
}

function PasoBarberoFecha({ barberos, reservas, duracionTotal, servicio, adicionalesSel, barberoSel, fechaSel, onSeleccionar, onContinuar, onAtras }) {
  const [mes, setMes] = useState(new Date());
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const cambiarMes = (delta) => {
    const n = new Date(mes); n.setMonth(n.getMonth() + delta); setMes(n);
  };

  const dias = useMemo(() => {
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    const arr = [];
    for (let i = 0; i < primerDia.getDay(); i++) arr.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) arr.push(new Date(mes.getFullYear(), mes.getMonth(), d));
    return arr;
  }, [mes]);

  const barberosActivos = barberos.filter(b => b.activo);
  const puedeContinuar = barberoSel && fechaSel;

  // Duración total que tomará cada barbero con la selección actual
  const duracionPorBarbero = (b) =>
    duracionPara(servicio, b) + adicionalesSel.reduce((s, a) => s + duracionPara(a, b), 0);

  return (
    <div>
      <div className="mb-8">
        <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Paso 3</p>
        <h2 className="font-display text-5xl text-amber-50">Barbero & Fecha</h2>
      </div>

      <div className="mb-6">
        <h3 className="font-sans-c text-xs uppercase tracking-widest text-stone-400 mb-3">Elige tu barbero</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {barberosActivos.map(b => {
            const dur = duracionPorBarbero(b);
            return (
              <button key={b.id} onClick={() => onSeleccionar(b, fechaSel)}
                className={`p-4 border text-left transition-all
                  ${barberoSel?.id === b.id ? 'bg-amber-200/5 border-amber-200' : 'border-stone-800 hover:border-stone-600'}`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200/30 to-amber-200/5 border border-amber-200/30 flex items-center justify-center mb-3">
                  <span className="font-display text-lg text-amber-200">{b.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <h4 className="font-display text-lg text-amber-50 leading-tight">{b.nombre.toUpperCase()}</h4>
                <p className="font-serif-c italic text-stone-400 text-sm mt-1 mb-3">{b.especialidad}</p>
                <div className="flex items-center gap-1.5 pt-2 border-t border-stone-800">
                  <Clock size={12} className="text-amber-200/60" />
                  <span className="font-sans-c text-[11px] uppercase tracking-wider text-amber-200/80">{dur} min</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {barberoSel && (
        <div>
          <h3 className="font-sans-c text-xs uppercase tracking-widest text-stone-400 mb-3">Elige el día</h3>
          <div className="bg-stone-900/40 border border-stone-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-200">
                <ChevronLeft size={20} />
              </button>
              <h4 className="font-display text-2xl text-amber-50">{MESES[mes.getMonth()]} {mes.getFullYear()}</h4>
              <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-200">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center font-sans-c text-xs uppercase tracking-wider text-stone-500 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {dias.map((d, i) => {
                if (!d) return <div key={i}></div>;
                const esPasado = d < hoy;
                const esLibre = barberoSel.diasLibres.includes(d.getDay());
                const disponible = !esPasado && !esLibre;
                const seleccionado = fechaSel && fechaKey(fechaSel) === fechaKey(d);
                return (
                  <button key={i} disabled={!disponible}
                    onClick={() => onSeleccionar(barberoSel, d)}
                    className={`aspect-square flex items-center justify-center font-serif-c text-lg transition
                      ${seleccionado ? 'bg-amber-200 text-stone-950 font-semibold' :
                        disponible ? 'text-amber-50 hover:bg-stone-800' :
                          'text-stone-700 cursor-not-allowed line-through'}`}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <p className="font-sans-c text-xs text-stone-500 mt-4 italic">Los días tachados son días libres del barbero o pasados.</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <BotonesNav onAtras={onAtras} onContinuar={onContinuar} continuarLabel="Ver horarios →" deshabilitado={!puedeContinuar} />
      </div>
    </div>
  );
}

function PasoHora({ barbero, fecha, duracion, reservas, horaSel, onSeleccionar, onContinuar, onAtras }) {
  const slots = useMemo(() => {
    const inicio = horaAMinutos(barbero.horario.inicio);
    const fin = horaAMinutos(barbero.horario.fin);
    const ocupados = reservas.filter(r => r.barberoId === barbero.id && r.fecha === fechaKey(fecha));
    const bloqueos = bloqueosEnFecha(barbero, fecha);
    const arr = [];
    for (let m = inicio; m + duracion <= fin; m += SLOT_MIN) {
      // verificar si todo el bloque [m, m+duracion) está libre de reservas
      const ocupado = ocupados.some(r => {
        const rIni = horaAMinutos(r.horaInicio);
        const rFin = rIni + r.duracion;
        return m < rFin && (m + duracion) > rIni;
      });
      // verificar si todo el bloque [m, m+duracion) está libre de bloqueos
      const bloqueado = bloqueos.some(bl => m < bl.finMin && (m + duracion) > bl.inicioMin);
      arr.push({ minutos: m, hora: minutosAHora(m), ocupado: ocupado || bloqueado, motivoBloqueo: bloqueado ? bloqueos.find(bl => m < bl.finMin && (m + duracion) > bl.inicioMin).motivo : null });
    }
    return arr;
  }, [barbero, fecha, duracion, reservas]);

  // agrupar por mañana / tarde
  const manana = slots.filter(s => s.minutos < 12 * 60);
  const tarde = slots.filter(s => s.minutos >= 12 * 60 && s.minutos < 17 * 60);
  const noche = slots.filter(s => s.minutos >= 17 * 60);

  return (
    <div>
      <div className="mb-8">
        <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Paso 4</p>
        <h2 className="font-display text-5xl text-amber-50">Elige tu hora</h2>
        <p className="font-serif-c italic text-stone-400 text-lg mt-2">
          {barbero.nombre} — {fecha.getDate()} de {MESES[fecha.getMonth()]} — duración {duracion} min
        </p>
      </div>

      {[['Mañana', manana], ['Tarde', tarde], ['Noche', noche]].map(([titulo, lista]) => (
        lista.length > 0 && (
          <div key={titulo} className="mb-6">
            <h3 className="font-sans-c text-xs uppercase tracking-widest text-stone-400 mb-3">{titulo}</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {lista.map(s => (
                <button key={s.minutos} disabled={s.ocupado}
                  onClick={() => onSeleccionar(s.hora)}
                  className={`py-3 border font-serif-c text-lg transition-all
                    ${horaSel === s.hora ? 'bg-amber-200 text-stone-950 border-amber-200 font-semibold' :
                      s.ocupado ? 'border-stone-800 text-stone-700 line-through bg-stone-900/40 cursor-not-allowed' :
                        'border-stone-700 text-amber-50 hover:border-amber-200 hover:bg-stone-900'}`}>
                  {s.hora}
                </button>
              ))}
            </div>
          </div>
        )
      ))}

      {slots.length === 0 && (
        <div className="text-center py-12 border border-stone-800 bg-stone-900/40">
          <p className="font-serif-c italic text-stone-400 text-lg">No hay horarios disponibles para esta combinación.</p>
        </div>
      )}

      <div className="mt-8">
        <BotonesNav onAtras={onAtras} onContinuar={onContinuar} continuarLabel="Continuar →" deshabilitado={!horaSel} />
      </div>
    </div>
  );
}

function PasoDatos({ seleccion, duracionTotal, precioTotal, precioOriginal, promoActiva, onCambio, onConfirmar, onAtras }) {
  // Validación de teléfono: deben ser exactamente 8 dígitos (después del +569)
  const telLimpio = (seleccion.cliente.telefono || '').replace(/\D/g, '');
  const telValido = telLimpio.length === 8;

  // Email es OPCIONAL pero si se ingresa debe tener formato válido
  const email = (seleccion.cliente.email || '').trim();
  const emailValido = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const valido = seleccion.cliente.nombre.trim().length > 1 && telValido && emailValido;

  // Solo permite dígitos al tipear el teléfono, máximo 8
  const onTelefonoChange = (e) => {
    const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 8);
    onCambio({ ...seleccion.cliente, telefono: soloDigitos });
  };

  // Formatear visualmente: 1234 5678 (separa al medio para legibilidad)
  const telFormateado = telLimpio.length > 4 ? `${telLimpio.slice(0, 4)} ${telLimpio.slice(4)}` : telLimpio;

  return (
    <div>
      <div className="mb-8">
        <p className="font-sans-c text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Paso 5</p>
        <h2 className="font-display text-5xl text-amber-50">Tus datos</h2>
        <p className="font-serif-c italic text-stone-400 text-lg mt-2">Para confirmar tu reserva y avisarte si hay cambios</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="font-sans-c text-xs uppercase tracking-widest text-stone-400 block mb-2">Nombre completo</label>
            <input type="text" value={seleccion.cliente.nombre}
              onChange={e => onCambio({ ...seleccion.cliente, nombre: e.target.value })}
              placeholder="Juan Pérez"
              className="w-full bg-stone-900/60 border border-stone-700 px-4 py-3 font-serif-c text-lg text-amber-50 focus:border-amber-200 outline-none transition" />
          </div>

          <div>
            <label className="font-sans-c text-xs uppercase tracking-widest text-stone-400 block mb-2">Teléfono</label>
            <div className="flex">
              <span className="bg-stone-900/90 border border-stone-700 border-r-0 px-4 py-3 font-serif-c text-lg text-amber-200 select-none flex items-center">
                +56&nbsp;9
              </span>
              <input type="tel" inputMode="numeric" value={telFormateado}
                onChange={onTelefonoChange}
                placeholder="1234 5678"
                maxLength={9}
                className="flex-1 bg-stone-900/60 border border-stone-700 px-4 py-3 font-serif-c text-lg text-amber-50 focus:border-amber-200 outline-none transition tracking-wider" />
            </div>
            <p className="font-sans-c text-[11px] text-stone-500 italic mt-1">8 dígitos sin espacios ni guiones</p>
          </div>

          <div>
            <label className="font-sans-c text-xs uppercase tracking-widest text-stone-400 block mb-2">
              Email <span className="text-stone-600 normal-case lowercase tracking-normal">— opcional</span>
            </label>
            <input type="email" value={seleccion.cliente.email || ''}
              onChange={e => onCambio({ ...seleccion.cliente, email: e.target.value })}
              placeholder="tu@correo.cl"
              className={`w-full bg-stone-900/60 border px-4 py-3 font-serif-c text-lg text-amber-50 focus:border-amber-200 outline-none transition
                ${email && !emailValido ? 'border-red-400/60' : 'border-stone-700'}`} />
            {email && !emailValido && (
              <p className="font-sans-c text-[11px] text-red-400 italic mt-1">Revisa el formato del correo.</p>
            )}
            <p className="font-sans-c text-[11px] text-stone-500 italic mt-1">Si lo dejas, te enviaremos la confirmación al mail.</p>
          </div>
        </div>

        <ResumenCompleto seleccion={seleccion} duracion={duracionTotal} precio={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva} />
      </div>

      <div className="mt-8">
        <BotonesNav onAtras={onAtras} onContinuar={onConfirmar} continuarLabel="Confirmar reserva ✓" deshabilitado={!valido} />
      </div>
    </div>
  );
}

function PasoConfirmacion({ seleccion, duracionTotal, precioTotal, precioOriginal, promoActiva, volver, config, onCancelar }) {
  const [cancelada, setCancelada] = useState(false);
  const limite = config?.cancelacionAntelacionMin ?? 0;
  const horas = Math.floor(limite / 60);
  const mins = limite % 60;
  const txtLimite = limite === 0 ? null : (horas > 0 ? `${horas}h${mins ? ' ' + mins + 'min' : ''}` : `${mins} min`);

  const handleCancelar = async () => {
    const ok = onCancelar && (await onCancelar());
    if (ok) setCancelada(true);
  };

  if (cancelada) {
    return (
      <div className="text-center py-10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-stone-800 border-2 border-stone-600 flex items-center justify-center">
          <X className="text-stone-400" size={48} strokeWidth={1.5} />
        </div>
        <p className="font-sans-c text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Reserva cancelada</p>
        <h2 className="font-display text-4xl text-stone-200 mb-4">Tu reserva fue cancelada</h2>
        <p className="font-serif-c italic text-stone-400 text-lg mb-8 max-w-xl mx-auto">
          Esperamos verte pronto, {seleccion.cliente.nombre.split(' ')[0]}. Puedes hacer una nueva reserva cuando quieras.
        </p>
        <button onClick={volver} className="px-8 py-3 bg-amber-200 text-stone-950 font-display text-lg tracking-wider hover:bg-amber-100 transition">
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-200/10 border-2 border-amber-200 flex items-center justify-center">
        <Check className="text-amber-200" size={48} strokeWidth={1.5} />
      </div>
      <p className="font-sans-c text-xs uppercase tracking-[0.3em] text-amber-200/70 mb-3">Reserva confirmada</p>
      <h2 className="font-display text-5xl text-amber-50 mb-4">¡Te esperamos, {seleccion.cliente.nombre.split(' ')[0]}!</h2>
      <p className="font-serif-c italic text-stone-400 text-lg mb-8 max-w-xl mx-auto">
        Hemos guardado tu reserva con {seleccion.barbero.nombre} para el {seleccion.fecha.getDate()} de {MESES[seleccion.fecha.getMonth()]} a las {seleccion.hora}.
      </p>

      <div className="max-w-md mx-auto">
        <ResumenCompleto seleccion={seleccion} duracion={duracionTotal} precio={precioTotal} precioOriginal={precioOriginal} promoActiva={promoActiva} />
      </div>

      {txtLimite && (
        <p className="font-serif-c italic text-stone-500 text-sm mt-6 max-w-md mx-auto">
          ¿Necesitas cambiar de planes? Puedes cancelar hasta {txtLimite} antes de la cita.
        </p>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
        <button onClick={volver} className="w-full sm:w-auto px-8 py-3 bg-amber-200 text-stone-950 font-display text-lg tracking-wider hover:bg-amber-100 transition">
          VOLVER AL INICIO
        </button>
        <button onClick={handleCancelar}
          className="w-full sm:w-auto px-6 py-3 border border-stone-700 text-stone-400 hover:border-red-400/60 hover:text-red-400 font-sans-c text-sm uppercase tracking-wider transition">
          Cancelar reserva
        </button>
      </div>
    </div>
  );
}

function ResumenFlotante({ servicio, adicionales, duracion, precio, precioOriginal, promoActiva, barberos, mostrarAviso }) {
  // Calcular rango de duración total entre barberos (cuando aún no hay uno elegido)
  const rangoTotal = useMemo(() => {
    if (!barberos || !servicio) return null;
    const activos = barberos.filter(b => b.activo);
    if (activos.length === 0) return null;
    const totales = activos.map(b => duracionPara(servicio, b) + adicionales.reduce((s, a) => s + duracionPara(a, b), 0));
    return { min: Math.min(...totales), max: Math.max(...totales) };
  }, [servicio, adicionales, barberos]);

  const varia = rangoTotal && rangoTotal.min !== rangoTotal.max;
  const hayPromo = promoActiva && precioOriginal && precioOriginal > precio;

  return (
    <div className={`bg-gradient-to-br from-stone-900 to-stone-950 border p-6 mb-6 relative overflow-hidden
      ${hayPromo ? 'border-amber-300' : 'border-amber-200/20'}`}>

      {/* Cinta diagonal de oferta */}
      {hayPromo && (
        <div className="absolute -right-12 top-4 bg-amber-300 text-stone-950 px-12 py-1 rotate-45 font-display text-xs tracking-widest shadow-lg">
          OFERTA
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="font-sans-c text-xs uppercase tracking-widest text-amber-200/70 mb-1">Tu selección</p>
          <h4 className="font-display text-2xl text-amber-50 truncate">{servicio?.nombre.toUpperCase()}</h4>
          {hayPromo && (
            <p className="font-serif-c italic text-amber-300 text-sm mt-1">✨ {promoActiva.nombre}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans-c text-xs uppercase tracking-widest text-stone-500">Total</p>
          {hayPromo ? (
            <div>
              <p className="font-serif-c text-base text-stone-500 line-through leading-tight">{formatearPrecio(precioOriginal)}</p>
              <p className="font-display text-3xl text-amber-300 leading-tight">{formatearPrecio(precio)}</p>
            </div>
          ) : (
            <p className="font-display text-3xl text-amber-200">{formatearPrecio(precio)}</p>
          )}
        </div>
      </div>

      {adicionales.length > 0 && (
        <div className="border-t border-stone-800 pt-3 space-y-1">
          {adicionales.map(a => (
            <div key={a.id} className="flex justify-between font-serif-c text-stone-400">
              <span>+ {a.nombre}</span>
              <span>{formatearPrecio(a.precio)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-stone-800 flex justify-between items-center">
        <span className="font-sans-c text-xs uppercase tracking-wider text-stone-500">Duración estimada</span>
        <span className="font-serif-c text-amber-200">
          {varia ? `${rangoTotal.min} – ${rangoTotal.max} min` : `${duracion} minutos`}
        </span>
      </div>
      {hayPromo && (
        <p className="font-serif-c italic text-amber-300/80 text-xs mt-2 text-center">
          Ahorras {formatearPrecio(precioOriginal - precio)} con esta promoción
        </p>
      )}
      {mostrarAviso && varia && (
        <p className="font-serif-c italic text-stone-500 text-xs mt-2">Cada barbero tiene sus propios tiempos. El total exacto se confirma al elegir tu barbero.</p>
      )}
    </div>
  );
}

function ResumenCompleto({ seleccion, duracion, precio, precioOriginal, promoActiva }) {
  const hayPromo = promoActiva && precioOriginal && precioOriginal > precio;
  return (
    <div className={`bg-stone-900/60 border p-6 text-left ${hayPromo ? 'border-amber-300' : 'border-amber-200/20'}`}>
      <h3 className="font-display text-2xl text-amber-50 mb-4 pb-3 border-b border-stone-800">RESUMEN</h3>
      <dl className="space-y-3 font-serif-c">
        <div className="flex justify-between">
          <dt className="text-stone-400">Barbero</dt>
          <dd className="text-amber-50">{seleccion.barbero?.nombre}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-400">Fecha</dt>
          <dd className="text-amber-50">{seleccion.fecha?.getDate()} {MESES[seleccion.fecha?.getMonth()]}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-400">Hora</dt>
          <dd className="text-amber-50">{seleccion.hora}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-400">Servicio</dt>
          <dd className="text-amber-50">{seleccion.servicio?.nombre} — {formatearPrecio(seleccion.servicio?.precio)}</dd>
        </div>
        {seleccion.adicionales.length > 0 && (
          <div>
            <dt className="text-stone-400 mb-1">Adicionales</dt>
            {seleccion.adicionales.map(a => (
              <dd key={a.id} className="flex justify-between text-amber-50 pl-4">
                <span>+ {a.nombre}</span>
                <span>{formatearPrecio(a.precio)}</span>
              </dd>
            ))}
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-stone-800">
          <dt className="text-stone-400">Duración</dt>
          <dd className="text-amber-50">{duracion} min</dd>
        </div>

        {hayPromo && (
          <div className="bg-amber-300/5 border border-amber-300/30 p-3 -mx-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-sans-c text-[10px] uppercase tracking-widest bg-amber-300 text-stone-950 px-2 py-0.5">Oferta</span>
              <span className="font-serif-c italic text-amber-300 text-sm">{promoActiva.nombre}</span>
            </div>
            <div className="flex justify-between text-stone-500 font-serif-c text-sm">
              <span>Precio normal</span>
              <span className="line-through">{formatearPrecio(precioOriginal)}</span>
            </div>
            <div className="flex justify-between text-amber-300 font-serif-c text-sm">
              <span>Te ahorras</span>
              <span>−{formatearPrecio(precioOriginal - precio)}</span>
            </div>
          </div>
        )}

        <div className={`flex justify-between pt-3 border-t ${hayPromo ? 'border-amber-300/40' : 'border-amber-200/30'}`}>
          <dt className="font-display text-amber-50 text-xl">TOTAL</dt>
          <dd className={`font-display text-2xl ${hayPromo ? 'text-amber-300' : 'text-amber-200'}`}>{formatearPrecio(precio)}</dd>
        </div>
      </dl>
    </div>
  );
}

function BotonesNav({ onAtras, onContinuar, continuarLabel, deshabilitado }) {
  return (
    <div className="flex justify-between items-center">
      <button onClick={onAtras} className="px-6 py-3 border border-stone-700 text-stone-300 font-sans-c text-sm uppercase tracking-wider hover:border-stone-500 transition">
        ← Atrás
      </button>
      <button onClick={onContinuar} disabled={deshabilitado}
        className={`px-8 py-3 font-display text-lg tracking-wider transition
          ${deshabilitado ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-amber-200 text-stone-950 hover:bg-amber-100'}`}>
        {continuarLabel}
      </button>
    </div>
  );
}

// ============== PANEL ADMIN ==============
function PanelAdmin({ barberos, setBarberos, servicios, setServicios, adicionales, setAdicionales, reservas, setReservas, notificaciones, setNotificaciones, promociones, setPromociones, config, setConfig, usuarioActual, cerrarSesion }) {
  const esAdmin = usuarioActual.rol === 'admin';
  const [tab, setTab] = useState('agenda');

  // Pestañas según rol
  const pendientes = (notificaciones || []).filter(n => n.estado === 'pendiente').length;
  const tabsAdmin = [
    { id: 'agenda', label: 'Agenda', icon: BookOpen },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell, badge: pendientes },
    { id: 'promociones', label: 'Promociones', icon: Award },
    { id: 'barberos', label: 'Barberos', icon: Users },
    { id: 'servicios', label: 'Servicios', icon: Scissors },
    { id: 'adicionales', label: 'Adicionales', icon: Plus },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];
  const tabsBarbero = [
    { id: 'agenda', label: 'Agenda', icon: BookOpen },
    { id: 'mi-perfil', label: 'Mi perfil', icon: User },
  ];
  const tabs = esAdmin ? tabsAdmin : tabsBarbero;

  // Acción protegida: solo el admin (o el dueño) puede modificar un barbero
  const puedeEditarBarbero = (barberoId) => esAdmin || barberoId === usuarioActual.id;

  return (
    <div className="min-h-screen">
      <div className="barber-stripe h-2"></div>
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={cerrarSesion} className="flex items-center gap-2 text-stone-400 hover:text-amber-200 transition">
            <ArrowLeft size={18} /> <span className="font-sans-c text-sm uppercase tracking-wider">Cerrar sesión</span>
          </button>
          <div className="flex items-center gap-3">
            <Settings className="text-amber-200" size={20} strokeWidth={1.5} />
            <span className="font-display text-xl text-amber-50">PANEL TWINS</span>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="font-serif-c text-sm text-amber-50 leading-tight">{usuarioActual.nombre}</p>
              <p className="font-sans-c text-[10px] uppercase tracking-widest text-amber-200/70 leading-tight">
                {esAdmin ? 'Administrador' : 'Barbero'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-200/30 to-amber-200/5 border border-amber-200/40 flex items-center justify-center">
              <span className="font-display text-sm text-amber-200">{usuarioActual.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 font-sans-c text-sm uppercase tracking-wider border-b-2 transition relative
                    ${tab === t.id ? 'border-amber-200 text-amber-200' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>
                  <Icon size={16} /> {t.label}
                  {t.badge > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-amber-200 text-stone-950 font-display text-[11px] rounded-full">
                      {t.badge > 99 ? '99+' : t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'agenda' && <TabAgenda barberos={barberos} reservas={reservas} setReservas={setReservas} notificaciones={notificaciones} setNotificaciones={setNotificaciones} usuarioActual={usuarioActual} />}
        {tab === 'estadisticas' && esAdmin && <TabEstadisticas barberos={barberos} reservas={reservas} servicios={servicios} adicionales={adicionales} />}
        {tab === 'promociones' && esAdmin && <TabPromociones promociones={promociones} setPromociones={setPromociones} servicios={servicios} adicionales={adicionales} />}
        {tab === 'notificaciones' && esAdmin && <TabNotificaciones notificaciones={notificaciones} setNotificaciones={setNotificaciones} />}
        {tab === 'barberos' && esAdmin && <TabBarberos barberos={barberos} setBarberos={setBarberos} servicios={servicios} adicionales={adicionales} usuarioActual={usuarioActual} />}
        {tab === 'mi-perfil' && !esAdmin && <TabMiPerfil barberos={barberos} setBarberos={setBarberos} servicios={servicios} adicionales={adicionales} usuarioActual={usuarioActual} />}
        {tab === 'servicios' && esAdmin && <TabServicios servicios={servicios} setServicios={setServicios} />}
        {tab === 'adicionales' && esAdmin && <TabAdicionales adicionales={adicionales} setAdicionales={setAdicionales} />}
        {tab === 'configuracion' && esAdmin && <TabConfiguracion config={config} setConfig={setConfig} />}
      </main>
    </div>
  );
}

// Vista personal para barbero no-admin: edita su propio registro reusando el mismo modal
function TabMiPerfil({ barberos, setBarberos, servicios, adicionales, usuarioActual }) {
  const yo = barberos.find(b => b.id === usuarioActual.id);
  if (!yo) return <p className="font-serif-c italic text-stone-400">No se encontró tu perfil. Contacta al administrador.</p>;

  const guardar = (b) => {
    // Un barbero normal no puede cambiar su rol, usuario, ni el flag activo (eso es del admin)
    const seguro = { ...b, rol: yo.rol, usuario: yo.usuario, activo: yo.activo };
    setBarberos(barberos.map(x => x.id === yo.id ? seguro : x));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-3xl text-amber-50">MI PERFIL</h2>
        <p className="font-serif-c italic text-stone-400 mt-1">Edita tu horario, días libres, tiempos por servicio y bloqueos personales.</p>
      </div>

      <div className="bg-stone-900/40 border border-stone-800 p-2">
        <PerfilBarberoEditor barbero={yo} servicios={servicios} adicionales={adicionales} onGuardar={guardar} permitirCampoActivo={false} permitirCampoUsuario={false} />
      </div>
    </div>
  );
}

function TabAgenda({ barberos, reservas, setReservas, notificaciones, setNotificaciones, usuarioActual }) {
  const [fecha, setFecha] = useState(new Date());
  const esAdmin = usuarioActual?.rol === 'admin';
  const confirmar = useConfirmar();
  // Barbero normal entra filtrado a su propia agenda por defecto, pero puede ver a los demás
  const [barberoFiltro, setBarberoFiltro] = useState('todos');

  const cambiarDia = (delta) => {
    const n = new Date(fecha); n.setDate(n.getDate() + delta); setFecha(n);
  };

  const reservasDelDia = reservas
    .filter(r => r.fecha === fechaKey(fecha))
    .filter(r => barberoFiltro === 'todos' || r.barberoId === barberoFiltro)
    .sort((a, b) => horaAMinutos(a.horaInicio) - horaAMinutos(b.horaInicio));

  // Solo el admin o el dueño de la reserva puede cancelar
  const puedeCancelar = (reserva) => esAdmin || reserva.barberoId === usuarioActual?.id;

  const cancelar = async (id) => {
    const r = reservas.find(x => x.id === id);
    if (!r || !puedeCancelar(r)) return;
    const ok = await confirmar(
      `Reserva de ${r.cliente.nombre} a las ${r.horaInicio}. Esta acción no se puede deshacer y se notificará al cliente.`,
      { titulo: 'Cancelar reserva', textoBotonConfirmar: 'Sí, cancelar', peligroso: true }
    );
    if (!ok) return;

    setReservas(reservas.filter(x => x.id !== id));

    // Disparar notificación: cancelada por el local
    const barbero = barberos.find(b => b.id === r.barberoId);
    if (setNotificaciones && barbero) {
      const notif = crearNotificacion(TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_LOCAL, r, barbero.nombre);
      setNotificaciones(prev => [notif, ...prev]);
    }
  };

  // Vista de timeline por barbero
  const barberosActivos = barberoFiltro === 'todos' ? barberos.filter(b => b.activo) : barberos.filter(b => b.id === barberoFiltro);

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => cambiarDia(-1)} className="p-2 border border-stone-700 hover:border-amber-200 text-stone-300">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-48">
            <p className="font-sans-c text-xs uppercase tracking-widest text-stone-500">{DIAS_SEMANA[fecha.getDay()] === 'Dom' ? 'Domingo' : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fecha.getDay()]}</p>
            <p className="font-display text-3xl text-amber-50">{fecha.getDate()} {MESES[fecha.getMonth()]}</p>
          </div>
          <button onClick={() => cambiarDia(1)} className="p-2 border border-stone-700 hover:border-amber-200 text-stone-300">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setFecha(new Date())} className="ml-2 px-3 py-2 font-sans-c text-xs uppercase tracking-wider border border-stone-700 hover:border-amber-200 text-stone-300">Hoy</button>
        </div>

        <select value={barberoFiltro} onChange={e => setBarberoFiltro(e.target.value)}
          className="bg-stone-900 border border-stone-700 px-4 py-2 font-sans-c text-sm text-amber-50">
          <option value="todos">Todos los barberos</option>
          {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(barberosActivos.length, 4)}, minmax(0, 1fr))` }}>
        {barberosActivos.map(b => {
          const resBarbero = reservasDelDia.filter(r => r.barberoId === b.id);
          const esMia = !esAdmin && usuarioActual?.id === b.id;
          return (
            <div key={b.id} className={`bg-stone-900/40 border ${esMia ? 'border-amber-200/50' : 'border-stone-800'}`}>
              <div className={`p-4 border-b ${esMia ? 'border-amber-200/30 bg-amber-200/5' : 'border-stone-800 bg-stone-900/60'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-amber-50">{b.nombre.toUpperCase()}</h3>
                  {esMia && <span className="font-sans-c text-[10px] uppercase tracking-widest text-amber-200 bg-amber-200/10 px-2 py-0.5 border border-amber-200/40">Tú</span>}
                </div>
                <p className="font-serif-c italic text-xs text-stone-500">{b.especialidad}</p>
                <p className="font-sans-c text-xs uppercase tracking-wider text-amber-200/70 mt-2">{resBarbero.length} reserva{resBarbero.length !== 1 ? 's' : ''}</p>
              </div>
              <TimelineBarbero barbero={b} reservas={resBarbero} fecha={fecha} onCancelar={cancelar} usuarioActual={usuarioActual} />
            </div>
          );
        })}
      </div>

      {barberosActivos.length === 0 && (
        <div className="text-center py-12 border border-stone-800 bg-stone-900/40">
          <p className="font-serif-c italic text-stone-400">No hay barberos activos.</p>
        </div>
      )}
    </div>
  );
}

function TimelineBarbero({ barbero, reservas, fecha, onCancelar, usuarioActual }) {
  const inicio = horaAMinutos(barbero.horario.inicio);
  const fin = horaAMinutos(barbero.horario.fin);
  const totalMin = fin - inicio;
  const PX_POR_MIN = 1.5;
  const bloqueos = bloqueosEnFecha(barbero, fecha);
  const esAdmin = usuarioActual?.rol === 'admin';
  const esMiAgenda = usuarioActual?.id === barbero.id;
  const puedoCancelar = esAdmin || esMiAgenda;

  return (
    <div className="relative" style={{ height: totalMin * PX_POR_MIN + 20 }}>
      {/* Líneas de hora */}
      {Array.from({ length: Math.ceil(totalMin / 60) + 1 }, (_, i) => {
        const min = inicio + i * 60;
        if (min > fin) return null;
        return (
          <div key={i} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * 60 * PX_POR_MIN + 10 }}>
            <span className="font-sans-c text-[10px] text-stone-600 w-10 text-right pt-px">{minutosAHora(min)}</span>
            <div className="flex-1 border-t border-stone-800/50"></div>
          </div>
        );
      })}

      {/* Bloqueos (capa de fondo, sobre las líneas de hora pero detrás de las reservas) */}
      {bloqueos.map((bl, idx) => {
        // Recortar al rango visible del horario del barbero
        const ini = Math.max(bl.inicioMin, inicio);
        const fn = Math.min(bl.finMin, fin);
        if (fn <= ini) return null;
        const top = (ini - inicio) * PX_POR_MIN + 10;
        const height = (fn - ini) * PX_POR_MIN;
        return (
          <div key={`bl-${bl.id || idx}`}
            className="absolute left-12 right-2 border-l-2 border-stone-500 p-2"
            style={{
              top, height,
              background: 'repeating-linear-gradient(45deg, rgba(120,113,108,0.18) 0 6px, rgba(60,60,60,0.08) 6px 12px)'
            }}>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-stone-400" />
              <p className="font-sans-c text-[11px] uppercase tracking-wider text-stone-300 truncate">{bl.motivo}</p>
            </div>
            <p className="font-sans-c text-[10px] text-stone-500">{minutosAHora(bl.inicioMin)} – {minutosAHora(bl.finMin)}</p>
          </div>
        );
      })}

      {/* Reservas */}
      {reservas.map(r => {
        const top = (horaAMinutos(r.horaInicio) - inicio) * PX_POR_MIN + 10;
        const height = r.duracion * PX_POR_MIN;
        return (
          <div key={r.id}
            className="absolute left-12 right-2 bg-amber-200/10 border-l-2 border-amber-200 p-2 hover:bg-amber-200/20 transition group"
            style={{ top, height }}
            title={`${r.cliente.nombre}${r.cliente.telefono ? '\n☎ ' + r.cliente.telefono : ''}${r.cliente.email ? '\n✉ ' + r.cliente.email : ''}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-display text-sm text-amber-50 truncate">{r.cliente.nombre.toUpperCase()}</p>
                <p className="font-serif-c text-xs text-stone-400 truncate">{r.servicioNombre}{r.adicionales.length > 0 && ` + ${r.adicionales.length}`}</p>
                <p className="font-sans-c text-[10px] text-amber-200/70">{r.horaInicio} · {r.duracion}min · {formatearPrecio(r.precio)}</p>
                {r.cliente.telefono && <p className="font-sans-c text-[10px] text-stone-500 truncate mt-0.5">{r.cliente.telefono}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onCancelar(r.id); }}
                disabled={!puedoCancelar}
                title={puedoCancelar ? 'Cancelar reserva' : 'Solo el dueño o el admin puede cancelar'}
                className={`shrink-0 p-1 border transition
                  ${puedoCancelar
                    ? 'border-stone-700 text-stone-400 hover:border-red-400 hover:text-red-400 hover:bg-red-400/10'
                    : 'border-stone-800 text-stone-700 cursor-not-allowed opacity-50'}`}>
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabBarberos({ barberos, setBarberos, servicios, adicionales, usuarioActual }) {
  const [editando, setEditando] = useState(null); // null | 'nuevo' | id
  const [aviso, setAviso] = useState(null); // mensaje informativo (no destructivo)
  const confirmar = useConfirmar();

  const guardar = (b) => {
    if (b.id) setBarberos(barberos.map(x => x.id === b.id ? b : x));
    else setBarberos([...barberos, { ...b, id: 'b' + Date.now() }]);
    setEditando(null);
  };

  const eliminar = async (id) => {
    if (id === usuarioActual?.id) {
      await confirmar('No puedes eliminarte a ti mismo. Pide a otro admin que lo haga.', { titulo: 'Acción no permitida', textoBotonConfirmar: 'Entendido' });
      return;
    }
    const target = barberos.find(b => b.id === id);
    const adminsRestantes = barberos.filter(b => b.rol === 'admin' && b.id !== id).length;
    if (target?.rol === 'admin' && adminsRestantes === 0) {
      await confirmar('No puedes eliminar al único administrador. Asigna primero el rol admin a otro barbero.', { titulo: 'Acción no permitida', textoBotonConfirmar: 'Entendido' });
      return;
    }
    const ok = await confirmar(`¿Eliminar al barbero "${target?.nombre}"? Esta acción no se puede deshacer.`,
      { titulo: 'Eliminar barbero', textoBotonConfirmar: 'Sí, eliminar', peligroso: true });
    if (ok) setBarberos(barberos.filter(x => x.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-amber-50">BARBEROS</h2>
        <button onClick={() => setEditando('nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider hover:bg-amber-100">
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barberos.map(b => {
          const cantPersonalizadas = Object.keys(b.duracionesPersonalizadas || {}).length;
          const cantBloqueos = (b.bloqueos || []).length;
          const esAdminBarbero = b.rol === 'admin';
          return (
            <div key={b.id} className="bg-stone-900/40 border border-stone-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl text-amber-50">{b.nombre.toUpperCase()}</h3>
                    {esAdminBarbero && <span className="font-sans-c text-[9px] uppercase tracking-widest text-amber-200 bg-amber-200/10 px-1.5 py-0.5 border border-amber-200/40">Admin</span>}
                  </div>
                  <p className="font-serif-c italic text-stone-400 text-sm">{b.especialidad}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-sans-c ${b.activo ? 'bg-amber-200/10 text-amber-200' : 'bg-stone-800 text-stone-500'}`}>
                  {b.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="font-serif-c text-stone-400 text-sm">Horario: {b.horario.inicio} – {b.horario.fin}</p>
              <p className="font-serif-c text-stone-400 text-sm">Días libres: {b.diasLibres.length === 0 ? 'Ninguno' : b.diasLibres.map(d => DIAS_SEMANA[d]).join(', ')}</p>
              <p className="font-serif-c text-amber-200/70 text-sm mt-1">
                <Clock size={12} className="inline mr-1 -mt-0.5" />
                {cantPersonalizadas === 0 ? 'Tiempos por defecto' : `${cantPersonalizadas} tiempo${cantPersonalizadas !== 1 ? 's' : ''} personalizado${cantPersonalizadas !== 1 ? 's' : ''}`}
                {cantBloqueos > 0 && <span className="ml-2 text-stone-500">· {cantBloqueos} bloqueo{cantBloqueos !== 1 ? 's' : ''}</span>}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditando(b.id)} className="flex-1 flex items-center justify-center gap-1 py-2 border border-stone-700 hover:border-amber-200 text-stone-300 font-sans-c text-xs uppercase">
                  <Edit3 size={14} /> Editar
                </button>
                <button onClick={() => eliminar(b.id)} className="px-3 py-2 border border-stone-700 hover:border-red-500 text-stone-400 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editando && <ModalBarbero barbero={editando === 'nuevo' ? null : barberos.find(b => b.id === editando)} servicios={servicios} adicionales={adicionales} onGuardar={guardar} onCerrar={() => setEditando(null)} />}
    </div>
  );
}

function ModalBarbero({ barbero, servicios, adicionales, onGuardar, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-950 border border-stone-700 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center p-6 border-b border-stone-800">
          <h3 className="font-display text-2xl text-amber-50">{barbero ? 'EDITAR BARBERO' : 'NUEVO BARBERO'}</h3>
          <button onClick={onCerrar} className="text-stone-400 hover:text-amber-200"><X size={20} /></button>
        </div>
        <PerfilBarberoEditor
          barbero={barbero}
          servicios={servicios}
          adicionales={adicionales}
          onGuardar={(d) => { onGuardar(d); onCerrar(); }}
          onCerrar={onCerrar}
          permitirCampoActivo={true}
          permitirCampoUsuario={true}
          mostrarBotonCancelar={true}
        />
      </div>
    </div>
  );
}

// Editor reutilizable. permitirCampoActivo y permitirCampoUsuario controlan
// si el usuario logeado puede ver/cambiar el flag activo y los datos de cuenta.
function PerfilBarberoEditor({ barbero, servicios, adicionales, onGuardar, onCerrar, permitirCampoActivo, permitirCampoUsuario, mostrarBotonCancelar }) {
  const [datos, setDatos] = useState(barbero || {
    nombre: '', especialidad: '', activo: true, horario: { inicio: '09:00', fin: '19:00' }, diasLibres: [0], duracionesPersonalizadas: {}, bloqueos: [],
    usuario: '', password: '', rol: 'barbero'
  });
  const [seccion, setSeccion] = useState('general'); // general | tiempos | bloqueos | cuenta
  const [guardado, setGuardado] = useState(false);

  const toggleDiaLibre = (d) => {
    setDatos({ ...datos, diasLibres: datos.diasLibres.includes(d) ? datos.diasLibres.filter(x => x !== d) : [...datos.diasLibres, d] });
  };

  const setDuracionItem = (itemId, valor) => {
    const nuevas = { ...(datos.duracionesPersonalizadas || {}) };
    if (valor === '' || valor === null || valor === undefined) {
      delete nuevas[itemId];
    } else {
      const n = parseInt(valor);
      if (!isNaN(n) && n > 0) nuevas[itemId] = n;
      else delete nuevas[itemId];
    }
    setDatos({ ...datos, duracionesPersonalizadas: nuevas });
  };

  const resetItem = (itemId) => {
    const nuevas = { ...(datos.duracionesPersonalizadas || {}) };
    delete nuevas[itemId];
    setDatos({ ...datos, duracionesPersonalizadas: nuevas });
  };

  const agregarBloqueo = (bl) => {
    setDatos({ ...datos, bloqueos: [...(datos.bloqueos || []), { ...bl, id: 'bl' + Date.now() }] });
  };
  const eliminarBloqueo = (id) => {
    setDatos({ ...datos, bloqueos: (datos.bloqueos || []).filter(b => b.id !== id) });
  };

  const guardar = () => {
    onGuardar(datos);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <div>
      <div className="flex border-b border-stone-800 overflow-x-auto">
        <button onClick={() => setSeccion('general')}
          className={`flex-1 min-w-max py-3 px-4 font-sans-c text-xs uppercase tracking-widest transition
            ${seccion === 'general' ? 'text-amber-200 border-b-2 border-amber-200' : 'text-stone-500 hover:text-stone-300'}`}>
          General
        </button>
        <button onClick={() => setSeccion('tiempos')}
          className={`flex-1 min-w-max py-3 px-4 font-sans-c text-xs uppercase tracking-widest transition
            ${seccion === 'tiempos' ? 'text-amber-200 border-b-2 border-amber-200' : 'text-stone-500 hover:text-stone-300'}`}>
          Tiempos por servicio
        </button>
        <button onClick={() => setSeccion('bloqueos')}
          className={`flex-1 min-w-max py-3 px-4 font-sans-c text-xs uppercase tracking-widest transition
            ${seccion === 'bloqueos' ? 'text-amber-200 border-b-2 border-amber-200' : 'text-stone-500 hover:text-stone-300'}`}>
          Bloqueos {(datos.bloqueos || []).length > 0 && <span className="ml-1 text-[10px] opacity-70">({datos.bloqueos.length})</span>}
        </button>
        <button onClick={() => setSeccion('cuenta')}
          className={`flex-1 min-w-max py-3 px-4 font-sans-c text-xs uppercase tracking-widest transition
            ${seccion === 'cuenta' ? 'text-amber-200 border-b-2 border-amber-200' : 'text-stone-500 hover:text-stone-300'}`}>
          Cuenta
        </button>
      </div>

      <div className="p-6">
        {seccion === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Nombre</label>
              <input type="text" value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Especialidad</label>
              <input type="text" value={datos.especialidad} onChange={e => setDatos({ ...datos, especialidad: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Hora inicio</label>
                <input type="time" value={datos.horario.inicio} onChange={e => setDatos({ ...datos, horario: { ...datos.horario, inicio: e.target.value } })}
                  className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
              </div>
              <div>
                <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Hora fin</label>
                <input type="time" value={datos.horario.fin} onChange={e => setDatos({ ...datos, horario: { ...datos.horario, fin: e.target.value } })}
                  className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
              </div>
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-2">Días libres</label>
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} onClick={() => toggleDiaLibre(i)}
                    className={`py-2 font-sans-c text-xs uppercase tracking-wider border transition
                      ${datos.diasLibres.includes(i) ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {permitirCampoActivo && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={datos.activo} onChange={e => setDatos({ ...datos, activo: e.target.checked })}
                  className="w-4 h-4 accent-amber-200" />
                <span className="font-serif-c text-stone-300">Barbero activo</span>
              </label>
            )}
          </div>
        )}

        {seccion === 'tiempos' && (
          <div>
            <p className="font-serif-c italic text-stone-400 text-sm mb-4">
              Cada barbero tiene su ritmo. Define aquí los minutos que tomarás para cada servicio. Si dejas un campo vacío, se usará el tiempo por defecto.
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-sans-c text-xs uppercase tracking-widest text-amber-200/70 mb-2 pb-2 border-b border-stone-800">Servicios principales</h4>
                <div className="space-y-2">
                  {servicios.map(s => {
                    const personalizado = datos.duracionesPersonalizadas?.[s.id];
                    return (
                      <div key={s.id} className="flex items-center gap-3 py-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm text-amber-50 truncate">{s.nombre.toUpperCase()}</p>
                          <p className="font-sans-c text-[11px] text-stone-500">Default: {s.duracion} min</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" min="5" step="5" value={personalizado || ''}
                            onChange={e => setDuracionItem(s.id, e.target.value)}
                            placeholder={`${s.duracion}`}
                            className={`w-20 bg-stone-900 border px-2 py-1.5 font-serif-c text-sm text-right focus:outline-none
                              ${personalizado ? 'border-amber-200/60 text-amber-200' : 'border-stone-700 text-amber-50 focus:border-amber-200'}`} />
                          <span className="font-sans-c text-xs text-stone-500">min</span>
                          {personalizado && (
                            <button onClick={() => resetItem(s.id)} title="Volver al default"
                              className="ml-1 text-stone-500 hover:text-amber-200 p-1">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-sans-c text-xs uppercase tracking-widest text-amber-200/70 mb-2 pb-2 border-b border-stone-800 mt-5">Adicionales</h4>
                <div className="space-y-2">
                  {adicionales.map(a => {
                    const personalizado = datos.duracionesPersonalizadas?.[a.id];
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm text-amber-50 truncate">{a.nombre.toUpperCase()}</p>
                          <p className="font-sans-c text-[11px] text-stone-500">Default: {a.duracion} min</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" min="5" step="5" value={personalizado || ''}
                            onChange={e => setDuracionItem(a.id, e.target.value)}
                            placeholder={`${a.duracion}`}
                            className={`w-20 bg-stone-900 border px-2 py-1.5 font-serif-c text-sm text-right focus:outline-none
                              ${personalizado ? 'border-amber-200/60 text-amber-200' : 'border-stone-700 text-amber-50 focus:border-amber-200'}`} />
                          <span className="font-sans-c text-xs text-stone-500">min</span>
                          {personalizado && (
                            <button onClick={() => resetItem(a.id)} title="Volver al default"
                              className="ml-1 text-stone-500 hover:text-amber-200 p-1">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'bloqueos' && (
          <SeccionBloqueos bloqueos={datos.bloqueos || []} onAgregar={agregarBloqueo} onEliminar={eliminarBloqueo} />
        )}

        {seccion === 'cuenta' && (
          <div className="space-y-4">
            <p className="font-serif-c italic text-stone-400 text-sm">
              {permitirCampoUsuario
                ? 'Datos para iniciar sesión en el panel.'
                : 'Tu usuario lo asigna el administrador. Aquí puedes cambiar tu contraseña.'}
            </p>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Usuario</label>
              <input type="text" value={datos.usuario || ''}
                onChange={e => permitirCampoUsuario && setDatos({ ...datos, usuario: e.target.value.toLowerCase().trim() })}
                disabled={!permitirCampoUsuario}
                className={`w-full border px-3 py-2 font-serif-c outline-none
                  ${permitirCampoUsuario ? 'bg-stone-900 border-stone-700 text-amber-50 focus:border-amber-200' : 'bg-stone-900/40 border-stone-800 text-stone-500 cursor-not-allowed'}`} />
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Contraseña</label>
              <input type="text" value={datos.password || ''}
                onChange={e => setDatos({ ...datos, password: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
              <p className="font-sans-c text-[11px] text-stone-500 mt-1 italic">En producción, esta debe ir hasheada en el backend.</p>
            </div>
            {permitirCampoUsuario && (
              <div>
                <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Rol</label>
                <select value={datos.rol || 'barbero'} onChange={e => setDatos({ ...datos, rol: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none">
                  <option value="barbero">Barbero (solo edita lo suyo)</option>
                  <option value="admin">Admin (acceso total)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 p-6 border-t border-stone-800 items-center">
        {guardado && <span className="font-sans-c text-xs uppercase tracking-wider text-amber-200 flex items-center gap-1"><Check size={14} /> Guardado</span>}
        <div className="flex-1"></div>
        {mostrarBotonCancelar && (
          <button onClick={onCerrar} className="px-6 py-2 border border-stone-700 text-stone-300 font-sans-c text-sm uppercase tracking-wider">Cancelar</button>
        )}
        <button onClick={guardar} disabled={!datos.nombre.trim()}
          className="px-8 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider disabled:bg-stone-700 disabled:text-stone-500 hover:bg-amber-100">
          Guardar
        </button>
      </div>
    </div>
  );
}

function SeccionBloqueos({ bloqueos, onAgregar, onEliminar }) {
  const [creando, setCreando] = useState(false);
  const [tipo, setTipo] = useState('recurrente');
  const [motivo, setMotivo] = useState('Almuerzo');
  const [horaInicio, setHoraInicio] = useState('13:00');
  const [horaFin, setHoraFin] = useState('14:00');
  const [dias, setDias] = useState([1, 2, 3, 4, 5]); // L-V por defecto
  const [fecha, setFecha] = useState(fechaKey(new Date()));
  const [error, setError] = useState('');

  const toggleDia = (d) => setDias(dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d]);

  const guardar = () => {
    setError('');
    if (!motivo.trim()) { setError('Pon un motivo (ej: Almuerzo, Cita médica, Capacitación).'); return; }
    if (horaAMinutos(horaInicio) >= horaAMinutos(horaFin)) { setError('La hora de fin debe ser posterior al inicio.'); return; }
    if (tipo === 'recurrente' && dias.length === 0) { setError('Elige al menos un día para el bloqueo recurrente.'); return; }

    const nuevo = tipo === 'recurrente'
      ? { tipo, motivo: motivo.trim(), dias, horaInicio, horaFin }
      : { tipo, motivo: motivo.trim(), fecha, horaInicio, horaFin };

    onAgregar(nuevo);
    setCreando(false);
    setMotivo('Almuerzo'); setHoraInicio('13:00'); setHoraFin('14:00');
  };

  // Ordenar para mostrar: recurrentes primero, luego puntuales
  const ordenados = [...bloqueos].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'recurrente' ? -1 : 1;
    return horaAMinutos(a.horaInicio) - horaAMinutos(b.horaInicio);
  });

  return (
    <div>
      <p className="font-serif-c italic text-stone-400 text-sm mb-4">
        Define horarios en los que el barbero no recibe reservas: pausas para almuerzo, capacitaciones, citas personales, etc.
      </p>

      <div className="space-y-2 mb-4">
        {ordenados.map(bl => (
          <div key={bl.id} className="flex items-center justify-between bg-stone-900/60 border border-stone-800 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center border border-stone-700"
                style={{ background: 'repeating-linear-gradient(45deg, rgba(120,113,108,0.2) 0 4px, transparent 4px 8px)' }}>
                <Clock size={14} className="text-stone-400" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm text-amber-50 truncate">{bl.motivo.toUpperCase()}</p>
                <p className="font-sans-c text-[11px] text-stone-400">
                  {bl.horaInicio} – {bl.horaFin}
                  <span className="mx-1.5 text-stone-600">·</span>
                  {bl.tipo === 'recurrente'
                    ? `${bl.dias.map(d => DIAS_SEMANA[d]).join(', ')}`
                    : `${bl.fecha}`}
                </p>
              </div>
            </div>
            <button onClick={() => onEliminar(bl.id)} className="text-stone-500 hover:text-red-400 p-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {bloqueos.length === 0 && !creando && (
          <p className="font-serif-c italic text-stone-500 text-center py-6 text-sm">No hay bloqueos. Agrega uno para reservar tiempo en la agenda.</p>
        )}
      </div>

      {!creando ? (
        <button onClick={() => setCreando(true)}
          className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-stone-700 hover:border-amber-200 text-stone-400 hover:text-amber-200 font-sans-c text-xs uppercase tracking-wider transition">
          <Plus size={14} /> Agregar bloqueo
        </button>
      ) : (
        <div className="border border-amber-200/30 bg-stone-900/60 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTipo('recurrente')}
              className={`py-2 font-sans-c text-xs uppercase tracking-wider border transition
                ${tipo === 'recurrente' ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
              Recurrente
            </button>
            <button onClick={() => setTipo('puntual')}
              className={`py-2 font-sans-c text-xs uppercase tracking-wider border transition
                ${tipo === 'puntual' ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
              Fecha específica
            </button>
          </div>

          <div>
            <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Motivo</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Almuerzo, cita, etc."
              className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Desde</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Hasta</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
          </div>

          {tipo === 'recurrente' ? (
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-2">Días que se repite</label>
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} onClick={() => toggleDia(i)}
                    className={`py-2 font-sans-c text-xs uppercase tracking-wider border transition
                      ${dias.includes(i) ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
          )}

          {error && <p className="font-serif-c italic text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setCreando(false); setError(''); }}
              className="flex-1 py-2 border border-stone-700 text-stone-300 font-sans-c text-xs uppercase tracking-wider">Cancelar</button>
            <button onClick={guardar}
              className="flex-1 py-2 bg-amber-200 text-stone-950 font-sans-c text-xs uppercase tracking-wider hover:bg-amber-100">
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabServicios({ servicios, setServicios }) {
  return <TabItems items={servicios} setItems={setServicios} titulo="SERVICIOS PRINCIPALES" subtitulo="Cortes de cabello — la base de la reserva" prefijoId="s" conDescripcion={true} />;
}

function TabAdicionales({ adicionales, setAdicionales }) {
  return <TabItems items={adicionales} setItems={setAdicionales} titulo="ADICIONALES" subtitulo="Servicios extras que se suman al corte (barba, cejas, tinturas, etc.)" prefijoId="a" conDescripcion={false} />;
}

function TabItems({ items, setItems, titulo, subtitulo, prefijoId, conDescripcion }) {
  const [editando, setEditando] = useState(null);
  const confirmar = useConfirmar();

  const guardar = (item) => {
    if (item.id) setItems(items.map(x => x.id === item.id ? item : x));
    else setItems([...items, { ...item, id: prefijoId + Date.now() }]);
    setEditando(null);
  };

  const eliminar = async (id) => {
    const item = items.find(x => x.id === id);
    const ok = await confirmar(`¿Eliminar "${item?.nombre}"? Esta acción no se puede deshacer.`,
      { titulo: 'Eliminar', textoBotonConfirmar: 'Sí, eliminar', peligroso: true });
    if (ok) setItems(items.filter(x => x.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-display text-3xl text-amber-50">{titulo}</h2>
          <p className="font-serif-c italic text-stone-400 mt-1">{subtitulo}</p>
        </div>
        <button onClick={() => setEditando('nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider hover:bg-amber-100">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="bg-stone-900/40 border border-stone-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-800 font-sans-c text-xs uppercase tracking-wider text-stone-500">
              <th className="text-left p-4">Nombre</th>
              {conDescripcion && <th className="text-left p-4 hidden md:table-cell">Descripción</th>}
              <th className="text-right p-4">Duración</th>
              <th className="text-right p-4">Precio</th>
              <th className="text-right p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-b border-stone-800/50 hover:bg-stone-900/40">
                <td className="p-4 font-display text-lg text-amber-50">{it.nombre.toUpperCase()}</td>
                {conDescripcion && <td className="p-4 font-serif-c italic text-stone-400 text-sm hidden md:table-cell">{it.descripcion}</td>}
                <td className="p-4 text-right font-serif-c text-amber-100">{it.duracion} min</td>
                <td className="p-4 text-right font-serif-c text-amber-200 text-lg">{formatearPrecio(it.precio)}</td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditando(it.id)} className="p-2 border border-stone-700 hover:border-amber-200 text-stone-300"><Edit3 size={14} /></button>
                    <button onClick={() => eliminar(it.id)} className="p-2 border border-stone-700 hover:border-red-500 text-stone-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={conDescripcion ? 5 : 4} className="p-8 text-center font-serif-c italic text-stone-500">No hay ítems. Crea uno nuevo para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && <ModalItem item={editando === 'nuevo' ? null : items.find(x => x.id === editando)} onGuardar={guardar} onCerrar={() => setEditando(null)} conDescripcion={conDescripcion} />}
    </div>
  );
}

function ModalItem({ item, onGuardar, onCerrar, conDescripcion }) {
  const [datos, setDatos] = useState(item || { nombre: '', descripcion: '', duracion: 30, precio: 10000 });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-stone-950 border border-stone-700 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-2xl text-amber-50">{item ? 'EDITAR' : 'NUEVO ÍTEM'}</h3>
          <button onClick={onCerrar} className="text-stone-400 hover:text-amber-200"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Nombre</label>
            <input type="text" value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })}
              className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
          </div>
          {conDescripcion && (
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Descripción</label>
              <input type="text" value={datos.descripcion || ''} onChange={e => setDatos({ ...datos, descripcion: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Duración (min)</label>
              <input type="number" min="5" step="5" value={datos.duracion} onChange={e => setDatos({ ...datos, duracion: parseInt(e.target.value) || 0 })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Precio ($)</label>
              <input type="number" min="0" step="500" value={datos.precio} onChange={e => setDatos({ ...datos, precio: parseInt(e.target.value) || 0 })}
                className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCerrar} className="flex-1 py-2 border border-stone-700 text-stone-300 font-sans-c text-sm uppercase tracking-wider">Cancelar</button>
          <button onClick={() => onGuardar(datos)} disabled={!datos.nombre.trim() || datos.duracion <= 0}
            className="flex-1 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider disabled:bg-stone-700 disabled:text-stone-500">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== BANDEJA DE NOTIFICACIONES ==============
function TabNotificaciones({ notificaciones, setNotificaciones }) {
  const confirmar = useConfirmar();
  const [filtro, setFiltro] = useState('todas'); // todas | pendientes | enviadas
  const [expandida, setExpandida] = useState(null); // id de notificación expandida

  const lista = (notificaciones || []).filter(n => {
    if (filtro === 'todas') return true;
    if (filtro === 'pendientes') return n.estado === 'pendiente';
    if (filtro === 'enviadas') return n.estado === 'enviada';
    return true;
  });

  const marcarEnviada = (id) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, estado: 'enviada', enviadaEn: new Date().toISOString() } : n));
  };

  const marcarPendiente = (id) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, estado: 'pendiente', enviadaEn: undefined } : n));
  };

  const eliminarNotificacion = async (id) => {
    const ok = await confirmar('¿Eliminar esta notificación del historial?',
      { titulo: 'Eliminar notificación', textoBotonConfirmar: 'Sí, eliminar', peligroso: true });
    if (ok) setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const limpiarEnviadas = async () => {
    const enviadas = (notificaciones || []).filter(n => n.estado === 'enviada').length;
    if (enviadas === 0) return;
    const ok = await confirmar(`¿Eliminar ${enviadas} notificación${enviadas !== 1 ? 'es' : ''} ya enviada${enviadas !== 1 ? 's' : ''} del historial?`,
      { titulo: 'Limpiar enviadas', textoBotonConfirmar: 'Sí, limpiar', peligroso: true });
    if (ok) setNotificaciones(prev => prev.filter(n => n.estado !== 'enviada'));
  };

  // Etiquetas amigables para los tipos
  const etiquetaTipo = (tipo) => {
    if (tipo === TIPOS_NOTIFICACION.RESERVA_CREADA) return { label: 'Confirmación de reserva', color: 'text-emerald-300', bg: 'bg-emerald-500/10', borde: 'border-emerald-500/30' };
    if (tipo === TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_CLIENTE) return { label: 'Cancelación por cliente', color: 'text-stone-300', bg: 'bg-stone-700/30', borde: 'border-stone-600/40' };
    if (tipo === TIPOS_NOTIFICACION.RESERVA_CANCELADA_POR_LOCAL) return { label: 'Cancelación por local', color: 'text-red-300', bg: 'bg-red-500/10', borde: 'border-red-500/30' };
    if (tipo === TIPOS_NOTIFICACION.RECORDATORIO_24H) return { label: 'Recordatorio 24h', color: 'text-blue-300', bg: 'bg-blue-500/10', borde: 'border-blue-500/30' };
    if (tipo === TIPOS_NOTIFICACION.RECORDATORIO_1H) return { label: 'Recordatorio 1h', color: 'text-amber-300', bg: 'bg-amber-500/10', borde: 'border-amber-500/30' };
    return { label: tipo, color: 'text-stone-300', bg: 'bg-stone-800', borde: 'border-stone-700' };
  };

  const formatearFecha = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl text-amber-50">NOTIFICACIONES</h2>
          <p className="font-serif-c italic text-stone-400 mt-1 max-w-2xl">
            Mensajes que se enviarán a los clientes. Cuando integres email/WhatsApp automáticos, todo se enviará solo. Mientras tanto, puedes enviar manualmente desde aquí con un click.
          </p>
        </div>
        {(notificaciones || []).some(n => n.estado === 'enviada') && (
          <button onClick={limpiarEnviadas}
            className="font-sans-c text-xs uppercase tracking-wider text-stone-500 hover:text-red-400 border border-stone-700 hover:border-red-400/50 px-3 py-2 transition">
            Limpiar enviadas
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-stone-800">
        {[
          { id: 'todas', label: 'Todas', count: notificaciones?.length || 0 },
          { id: 'pendientes', label: 'Pendientes', count: notificaciones?.filter(n => n.estado === 'pendiente').length || 0 },
          { id: 'enviadas', label: 'Enviadas', count: notificaciones?.filter(n => n.estado === 'enviada').length || 0 },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 font-sans-c text-xs uppercase tracking-wider border-b-2 transition
              ${filtro === f.id ? 'border-amber-200 text-amber-200' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 border border-stone-800 bg-stone-900/40">
          <Bell size={32} className="mx-auto text-stone-700 mb-3" strokeWidth={1} />
          <p className="font-serif-c italic text-stone-500">
            {filtro === 'todas' ? 'No hay notificaciones todavía.' : filtro === 'pendientes' ? 'No hay notificaciones pendientes.' : 'Aún no se ha enviado ninguna.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(n => {
            const tag = etiquetaTipo(n.tipo);
            const exp = expandida === n.id;
            const wsp = linkWhatsApp(n.cliente.telefono, n.cuerpo);
            const mail = linkMailto(n.cliente.email, n.asunto, n.cuerpo);
            return (
              <div key={n.id} className={`border ${exp ? 'border-amber-200/40' : 'border-stone-800'} bg-stone-900/40 transition`}>
                <div className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-stone-900/70"
                  onClick={() => setExpandida(exp ? null : n.id)}>
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${n.estado === 'pendiente' ? 'bg-amber-200 animate-pulse' : 'bg-stone-700'}`}></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-sans-c text-[10px] uppercase tracking-widest px-2 py-0.5 border ${tag.borde} ${tag.bg} ${tag.color}`}>
                          {tag.label}
                        </span>
                        <span className={`font-sans-c text-[10px] uppercase tracking-widest ${n.estado === 'pendiente' ? 'text-amber-200' : 'text-stone-500'}`}>
                          {n.estado === 'pendiente' ? '● Pendiente' : '✓ Enviada'}
                        </span>
                      </div>
                      <p className="font-display text-base text-amber-50 truncate">{n.cliente.nombre.toUpperCase()}</p>
                      <div className="flex items-center gap-3 font-sans-c text-[11px] text-stone-500 mt-0.5 flex-wrap">
                        {n.cliente.telefono && <span className="flex items-center gap-1"><MessageSquare size={11} /> {n.cliente.telefono}</span>}
                        {n.cliente.email && <span className="flex items-center gap-1"><Mail size={11} /> {n.cliente.email}</span>}
                        <span>· creada {formatearFecha(n.creadaEn)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-stone-500 shrink-0 mt-1 transition-transform ${exp ? 'rotate-90' : ''}`} />
                </div>

                {exp && (
                  <div className="px-4 pb-4 border-t border-stone-800 bg-stone-950/40">
                    <div className="my-3">
                      <p className="font-sans-c text-[10px] uppercase tracking-widest text-stone-500 mb-1">Asunto</p>
                      <p className="font-serif-c text-amber-50">{n.asunto}</p>
                    </div>
                    <div className="mb-4">
                      <p className="font-sans-c text-[10px] uppercase tracking-widest text-stone-500 mb-1">Mensaje</p>
                      <pre className="font-serif-c text-stone-300 whitespace-pre-wrap text-sm bg-stone-900 border border-stone-800 p-3 leading-relaxed">{n.cuerpo}</pre>
                    </div>

                    {n.estado === 'pendiente' ? (
                      <div className="flex gap-2 flex-wrap">
                        {wsp && (
                          <a href={wsp} target="_blank" rel="noopener noreferrer"
                            onClick={() => marcarEnviada(n.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-sans-c text-xs uppercase tracking-wider hover:bg-emerald-700 transition">
                            <MessageSquare size={14} /> Enviar por WhatsApp <ExternalLink size={12} />
                          </a>
                        )}
                        {mail && (
                          <a href={mail}
                            onClick={() => marcarEnviada(n.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-sans-c text-xs uppercase tracking-wider hover:bg-blue-700 transition">
                            <Mail size={14} /> Enviar por Email <ExternalLink size={12} />
                          </a>
                        )}
                        <button onClick={() => marcarEnviada(n.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-stone-700 text-stone-300 hover:border-amber-200 hover:text-amber-200 font-sans-c text-xs uppercase tracking-wider transition">
                          <Check size={14} /> Marcar enviada
                        </button>
                        <div className="flex-1"></div>
                        <button onClick={() => eliminarNotificacion(n.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-stone-800 text-stone-500 hover:border-red-400 hover:text-red-400 font-sans-c text-xs uppercase tracking-wider transition">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <span className="font-sans-c text-xs text-stone-500 px-3 py-2 italic">
                          Enviada el {formatearFecha(n.enviadaEn || n.creadaEn)}
                        </span>
                        <div className="flex-1"></div>
                        <button onClick={() => marcarPendiente(n.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-400 hover:border-amber-200 hover:text-amber-200 font-sans-c text-xs uppercase tracking-wider transition">
                          ↻ Marcar como pendiente
                        </button>
                        <button onClick={() => eliminarNotificacion(n.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-stone-800 text-stone-500 hover:border-red-400 hover:text-red-400 font-sans-c text-xs uppercase tracking-wider transition">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============== PROMOCIONES ==============
function TabPromociones({ promociones, setPromociones, servicios, adicionales }) {
  const [editando, setEditando] = useState(null); // null | 'nueva' | id
  const confirmar = useConfirmar();

  const guardar = (p) => {
    if (p.id && promociones.find(x => x.id === p.id)) {
      setPromociones(promociones.map(x => x.id === p.id ? p : x));
    } else {
      setPromociones([...promociones, { ...p, id: 'p' + Date.now() }]);
    }
    setEditando(null);
  };

  const eliminar = async (id) => {
    const p = promociones.find(x => x.id === id);
    const ok = await confirmar(`¿Eliminar la promoción "${p?.nombre}"? Esta acción no se puede deshacer.`,
      { titulo: 'Eliminar promoción', textoBotonConfirmar: 'Sí, eliminar', peligroso: true });
    if (ok) setPromociones(promociones.filter(x => x.id !== id));
  };

  const togglearActiva = (id) => {
    setPromociones(promociones.map(p => p.id === id ? { ...p, activa: !p.activa } : p));
  };

  // Helper: descripción legible de la vigencia
  const descripcionVigencia = (p) => {
    const partes = [];
    if (p.fechaDesde && p.fechaHasta) partes.push(`${p.fechaDesde} → ${p.fechaHasta}`);
    else if (p.fechaDesde) partes.push(`desde ${p.fechaDesde}`);
    else if (p.fechaHasta) partes.push(`hasta ${p.fechaHasta}`);

    if (p.diasSemana && p.diasSemana.length > 0 && p.diasSemana.length < 7) {
      partes.push(p.diasSemana.map(d => DIAS_SEMANA[d]).join(', '));
    }
    if (p.horaDesde && p.horaHasta) partes.push(`${p.horaDesde} – ${p.horaHasta}`);
    return partes.length === 0 ? 'Siempre vigente' : partes.join(' · ');
  };

  // Helper: descripción del combo
  const descripcionCombo = (p) => {
    const items = [];
    (p.servicioIds || []).forEach(id => {
      const s = servicios.find(x => x.id === id);
      if (s) items.push(s.nombre);
    });
    (p.adicionalIds || []).forEach(id => {
      const a = adicionales.find(x => x.id === id);
      if (a) items.push(a.nombre);
    });
    return items.length === 0 ? 'Sin items configurados' : items.join(' + ');
  };

  // Helper: precio normal de la promo
  const precioNormal = (p) => {
    let total = 0;
    (p.servicioIds || []).forEach(id => {
      const s = servicios.find(x => x.id === id);
      if (s) total += s.precio;
    });
    (p.adicionalIds || []).forEach(id => {
      const a = adicionales.find(x => x.id === id);
      if (a) total += a.precio;
    });
    return total;
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl text-amber-50">PROMOCIONES</h2>
          <p className="font-serif-c italic text-stone-400 mt-1">Combos y ofertas con precio especial. Se detectan automáticamente cuando el cliente arma una selección que coincide.</p>
        </div>
        <button onClick={() => setEditando('nueva')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider hover:bg-amber-100">
          <Plus size={16} /> Nueva promoción
        </button>
      </div>

      {promociones.length === 0 ? (
        <div className="text-center py-16 border border-stone-800 bg-stone-900/40">
          <Award size={32} className="mx-auto text-stone-700 mb-3" strokeWidth={1} />
          <p className="font-serif-c italic text-stone-500">Aún no hay promociones. Crea una para mostrar ofertas a tus clientes.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {promociones.map(p => {
            const normal = precioNormal(p);
            const ahorro = Math.max(0, normal - p.precioEspecial);
            const porcentaje = normal > 0 ? Math.round((ahorro / normal) * 100) : 0;
            return (
              <div key={p.id} className={`relative overflow-hidden border p-5 transition
                ${p.activa ? 'border-amber-300/50 bg-stone-900/40' : 'border-stone-800 bg-stone-900/20 opacity-60'}`}>
                {p.activa && (
                  <div className="absolute -right-12 top-4 bg-amber-300 text-stone-950 px-12 py-1 rotate-45 font-display text-[10px] tracking-widest">
                    -{porcentaje}%
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl text-amber-50 truncate">{p.nombre.toUpperCase()}</h3>
                    {p.descripcion && <p className="font-serif-c italic text-stone-400 text-sm mt-0.5">{p.descripcion}</p>}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="font-sans-c text-[11px] uppercase tracking-widest text-stone-500">Combo incluye</p>
                  <p className="font-serif-c text-amber-50 text-sm">{descripcionCombo(p)}</p>
                </div>

                <div className="flex items-baseline gap-3 py-3 border-t border-stone-800">
                  <span className="font-serif-c text-stone-500 text-sm line-through">{formatearPrecio(normal)}</span>
                  <span className="font-display text-2xl text-amber-300">{formatearPrecio(p.precioEspecial)}</span>
                  {ahorro > 0 && <span className="font-sans-c text-[11px] uppercase tracking-wider text-amber-300/80">Ahorro {formatearPrecio(ahorro)}</span>}
                </div>

                <p className="font-sans-c text-[11px] text-stone-500 mb-4">
                  <Clock size={11} className="inline mr-1 -mt-0.5" /> {descripcionVigencia(p)}
                </p>

                <div className="flex gap-2 pt-3 border-t border-stone-800">
                  <button onClick={() => togglearActiva(p.id)}
                    className={`flex-1 py-2 font-sans-c text-xs uppercase tracking-wider border transition
                      ${p.activa ? 'border-amber-300 text-amber-300 hover:bg-amber-300/10' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                    {p.activa ? '● Activa' : '○ Pausada'}
                  </button>
                  <button onClick={() => setEditando(p.id)}
                    className="flex items-center justify-center gap-1 px-4 py-2 border border-stone-700 hover:border-amber-200 text-stone-300 font-sans-c text-xs uppercase">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => eliminar(p.id)}
                    className="px-3 py-2 border border-stone-700 hover:border-red-500 text-stone-400 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <ModalPromocion
          promo={editando === 'nueva' ? null : promociones.find(p => p.id === editando)}
          servicios={servicios}
          adicionales={adicionales}
          onGuardar={guardar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function ModalPromocion({ promo, servicios, adicionales, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState(promo || {
    nombre: '',
    descripcion: '',
    servicioIds: [],
    adicionalIds: [],
    precioEspecial: 0,
    activa: true,
    fechaDesde: '',
    fechaHasta: '',
    diasSemana: [],
    horaDesde: '',
    horaHasta: '',
  });
  const [error, setError] = useState('');

  const toggleServicio = (id) => {
    setDatos({ ...datos, servicioIds: datos.servicioIds.includes(id) ? datos.servicioIds.filter(x => x !== id) : [...datos.servicioIds, id] });
  };
  const toggleAdicional = (id) => {
    setDatos({ ...datos, adicionalIds: datos.adicionalIds.includes(id) ? datos.adicionalIds.filter(x => x !== id) : [...datos.adicionalIds, id] });
  };
  const toggleDia = (d) => {
    setDatos({ ...datos, diasSemana: datos.diasSemana.includes(d) ? datos.diasSemana.filter(x => x !== d) : [...datos.diasSemana, d] });
  };

  // Cálculo del precio normal (suma de items del combo)
  const precioNormal = useMemo(() => {
    let total = 0;
    datos.servicioIds.forEach(id => {
      const s = servicios.find(x => x.id === id);
      if (s) total += s.precio;
    });
    datos.adicionalIds.forEach(id => {
      const a = adicionales.find(x => x.id === id);
      if (a) total += a.precio;
    });
    return total;
  }, [datos.servicioIds, datos.adicionalIds, servicios, adicionales]);

  const ahorro = Math.max(0, precioNormal - (datos.precioEspecial || 0));
  const porcentaje = precioNormal > 0 ? Math.round((ahorro / precioNormal) * 100) : 0;

  const guardar = () => {
    setError('');
    if (!datos.nombre.trim()) { setError('Pon un nombre a la promoción.'); return; }
    if (datos.servicioIds.length === 0 && datos.adicionalIds.length === 0) {
      setError('Selecciona al menos un servicio o un adicional.'); return;
    }
    if (!datos.precioEspecial || datos.precioEspecial <= 0) {
      setError('El precio especial debe ser mayor a cero.'); return;
    }
    if (datos.precioEspecial >= precioNormal && precioNormal > 0) {
      setError('El precio especial debe ser menor que el precio normal del combo.'); return;
    }
    if (datos.fechaDesde && datos.fechaHasta && datos.fechaDesde > datos.fechaHasta) {
      setError('La fecha "desde" debe ser anterior a la fecha "hasta".'); return;
    }
    if (datos.horaDesde && datos.horaHasta && horaAMinutos(datos.horaDesde) >= horaAMinutos(datos.horaHasta)) {
      setError('La hora "desde" debe ser anterior a la hora "hasta".'); return;
    }
    onGuardar(datos);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-950 border border-stone-700 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center p-6 border-b border-stone-800">
          <h3 className="font-display text-2xl text-amber-50">{promo ? 'EDITAR PROMOCIÓN' : 'NUEVA PROMOCIÓN'}</h3>
          <button onClick={onCerrar} className="text-stone-400 hover:text-amber-200"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Datos básicos */}
          <div>
            <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Nombre</label>
            <input type="text" value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })}
              placeholder="Ej: Aniversario TWINS, Día del Padre, Hora valle..."
              className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
          </div>

          <div>
            <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Descripción <span className="text-stone-600 normal-case lowercase tracking-normal">— opcional</span></label>
            <input type="text" value={datos.descripcion} onChange={e => setDatos({ ...datos, descripcion: e.target.value })}
              placeholder="Texto corto que verá el cliente"
              className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
          </div>

          {/* Combo */}
          <div className="bg-stone-900/40 border border-stone-800 p-4">
            <h4 className="font-sans-c text-xs uppercase tracking-widest text-amber-200/70 mb-3">¿Qué incluye este combo?</h4>

            <div className="mb-3">
              <p className="font-sans-c text-[11px] uppercase tracking-wider text-stone-500 mb-2">Servicios principales</p>
              <div className="flex flex-wrap gap-2">
                {servicios.map(s => (
                  <button key={s.id} onClick={() => toggleServicio(s.id)}
                    className={`px-3 py-1.5 font-sans-c text-xs border transition
                      ${datos.servicioIds.includes(s.id) ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-300 hover:border-stone-500'}`}>
                    {s.nombre} <span className="opacity-60">· {formatearPrecio(s.precio)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-sans-c text-[11px] uppercase tracking-wider text-stone-500 mb-2">Adicionales</p>
              <div className="flex flex-wrap gap-2">
                {adicionales.map(a => (
                  <button key={a.id} onClick={() => toggleAdicional(a.id)}
                    className={`px-3 py-1.5 font-sans-c text-xs border transition
                      ${datos.adicionalIds.includes(a.id) ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-300 hover:border-stone-500'}`}>
                    {a.nombre} <span className="opacity-60">· {formatearPrecio(a.precio)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Precio normal del combo</label>
              <div className="bg-stone-900/40 border border-stone-800 px-3 py-2 font-serif-c text-stone-400 line-through">
                {formatearPrecio(precioNormal)}
              </div>
            </div>
            <div>
              <label className="font-sans-c text-xs uppercase tracking-wider text-amber-300 block mb-1">Precio especial</label>
              <input type="number" min="0" step="500" value={datos.precioEspecial || ''}
                onChange={e => setDatos({ ...datos, precioEspecial: parseInt(e.target.value) || 0 })}
                className="w-full bg-stone-900 border border-amber-300/40 px-3 py-2 font-serif-c text-amber-300 focus:border-amber-300 outline-none text-lg" />
            </div>
          </div>

          {ahorro > 0 && (
            <div className="bg-amber-300/5 border border-amber-300/30 p-3 text-center">
              <p className="font-display text-xl text-amber-300">El cliente ahorra {formatearPrecio(ahorro)} ({porcentaje}% off)</p>
            </div>
          )}

          {/* Vigencia */}
          <div className="bg-stone-900/40 border border-stone-800 p-4">
            <h4 className="font-sans-c text-xs uppercase tracking-widest text-amber-200/70 mb-1">Vigencia</h4>
            <p className="font-serif-c italic text-stone-500 text-xs mb-3">Todos los campos son opcionales — vacíos significa "sin restricción"</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-sans-c text-[11px] uppercase tracking-wider text-stone-400 block mb-1">Fecha desde</label>
                <input type="date" value={datos.fechaDesde} onChange={e => setDatos({ ...datos, fechaDesde: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 px-2 py-1.5 font-serif-c text-sm text-amber-50 focus:border-amber-200 outline-none" />
              </div>
              <div>
                <label className="font-sans-c text-[11px] uppercase tracking-wider text-stone-400 block mb-1">Fecha hasta</label>
                <input type="date" value={datos.fechaHasta} onChange={e => setDatos({ ...datos, fechaHasta: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 px-2 py-1.5 font-serif-c text-sm text-amber-50 focus:border-amber-200 outline-none" />
              </div>
            </div>

            <div className="mb-3">
              <label className="font-sans-c text-[11px] uppercase tracking-wider text-stone-400 block mb-1">Días de la semana</label>
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} onClick={() => toggleDia(i)}
                    className={`py-1.5 font-sans-c text-xs uppercase tracking-wider border transition
                      ${datos.diasSemana.includes(i) ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="font-sans-c text-[10px] text-stone-500 italic mt-1">Vacío = todos los días</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-sans-c text-[11px] uppercase tracking-wider text-stone-400 block mb-1">Hora desde</label>
                <input type="time" value={datos.horaDesde} onChange={e => setDatos({ ...datos, horaDesde: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 px-2 py-1.5 font-serif-c text-sm text-amber-50 focus:border-amber-200 outline-none" />
              </div>
              <div>
                <label className="font-sans-c text-[11px] uppercase tracking-wider text-stone-400 block mb-1">Hora hasta</label>
                <input type="time" value={datos.horaHasta} onChange={e => setDatos({ ...datos, horaHasta: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 px-2 py-1.5 font-serif-c text-sm text-amber-50 focus:border-amber-200 outline-none" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={datos.activa} onChange={e => setDatos({ ...datos, activa: e.target.checked })}
              className="w-4 h-4 accent-amber-200" />
            <span className="font-serif-c text-stone-300">Promoción activa</span>
          </label>

          {error && <p className="font-serif-c italic text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 p-6 border-t border-stone-800">
          <button onClick={onCerrar} className="flex-1 py-2 border border-stone-700 text-stone-300 font-sans-c text-sm uppercase tracking-wider">Cancelar</button>
          <button onClick={guardar}
            className="flex-1 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider hover:bg-amber-100">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== ESTADÍSTICAS ==============
function TabEstadisticas({ barberos, reservas, servicios, adicionales }) {
  const [periodo, setPeriodo] = useState('mes'); // hoy | semana | mes | año | todo

  // Calcula el rango de fechas según el período seleccionado
  const rango = useMemo(() => {
    const ahora = new Date();
    const desde = new Date(ahora);
    desde.setHours(0, 0, 0, 0);
    if (periodo === 'hoy') {
      // desde ya está en el inicio del día
    } else if (periodo === 'semana') {
      const dia = desde.getDay();
      const lunesOffset = dia === 0 ? -6 : 1 - dia; // semana lunes-domingo
      desde.setDate(desde.getDate() + lunesOffset);
    } else if (periodo === 'mes') {
      desde.setDate(1);
    } else if (periodo === 'año') {
      desde.setMonth(0, 1);
    } else {
      desde.setFullYear(2000); // "todo": fecha muy antigua
    }
    return { desde, hasta: new Date() };
  }, [periodo]);

  // Solo reservas dentro del rango (basado en la fecha de la cita, no de creación)
  const reservasRango = useMemo(() => {
    return reservas.filter(r => {
      const [y, mo, d] = r.fecha.split('-').map(Number);
      const fechaR = new Date(y, mo - 1, d);
      return fechaR >= rango.desde && fechaR <= rango.hasta;
    });
  }, [reservas, rango]);

  // === Métricas globales ===
  const totalReservas = reservasRango.length;
  const ingresosTotales = reservasRango.reduce((s, r) => s + (r.precio || 0), 0);
  const ticketPromedio = totalReservas > 0 ? Math.round(ingresosTotales / totalReservas) : 0;
  const minutosTotales = reservasRango.reduce((s, r) => s + (r.duracion || 0), 0);
  const horasTotales = (minutosTotales / 60).toFixed(1);

  // === Por barbero ===
  const porBarbero = useMemo(() => {
    return barberos.map(b => {
      const suyas = reservasRango.filter(r => r.barberoId === b.id);
      const ingresos = suyas.reduce((s, r) => s + (r.precio || 0), 0);
      const minutos = suyas.reduce((s, r) => s + (r.duracion || 0), 0);
      return {
        id: b.id,
        nombre: b.nombre,
        especialidad: b.especialidad,
        reservas: suyas.length,
        ingresos,
        minutos,
        ticketPromedio: suyas.length > 0 ? Math.round(ingresos / suyas.length) : 0,
      };
    }).sort((a, b) => b.ingresos - a.ingresos);
  }, [barberos, reservasRango]);

  const maxIngresoBarbero = Math.max(...porBarbero.map(b => b.ingresos), 1);

  // === Servicios principales más populares ===
  const porServicio = useMemo(() => {
    const map = new Map();
    reservasRango.forEach(r => {
      const key = r.servicioId || r.servicioNombre;
      const item = map.get(key) || { id: key, nombre: r.servicioNombre, cantidad: 0, ingresos: 0 };
      item.cantidad += 1;
      // El precio de la reserva incluye adicionales — para "ingresos por servicio principal"
      // sumamos precio del servicio si lo encontramos en el catálogo, si no, prorrateamos
      const servicio = servicios.find(s => s.id === r.servicioId);
      item.ingresos += servicio?.precio || 0;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [reservasRango, servicios]);

  const maxCantServicio = Math.max(...porServicio.map(s => s.cantidad), 1);

  // === Adicionales más vendidos ===
  const porAdicional = useMemo(() => {
    const map = new Map();
    reservasRango.forEach(r => {
      (r.adicionales || []).forEach(a => {
        const item = map.get(a.id) || { id: a.id, nombre: a.nombre, cantidad: 0, ingresos: 0 };
        item.cantidad += 1;
        item.ingresos += a.precio || 0;
        map.set(a.id, item);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [reservasRango]);

  const maxCantAdic = Math.max(...porAdicional.map(a => a.cantidad), 1);

  // === Reservas por día (últimos 14 días) para gráfico de tendencia ===
  const tendencia = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const key = fechaKey(d);
      const reservasDelDia = reservas.filter(r => r.fecha === key);
      dias.push({
        fecha: d,
        key,
        cantidad: reservasDelDia.length,
        ingresos: reservasDelDia.reduce((s, r) => s + (r.precio || 0), 0),
      });
    }
    return dias;
  }, [reservas]);

  const maxTendencia = Math.max(...tendencia.map(d => d.cantidad), 1);

  // === Hora pico (qué horas se llenan más) ===
  const porHora = useMemo(() => {
    const conteo = {};
    reservasRango.forEach(r => {
      const h = r.horaInicio.split(':')[0];
      conteo[h] = (conteo[h] || 0) + 1;
    });
    return Object.entries(conteo).sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([h, c]) => ({ hora: h, cantidad: c }));
  }, [reservasRango]);

  const maxPorHora = Math.max(...porHora.map(h => h.cantidad), 1);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl text-amber-50">ESTADÍSTICAS</h2>
          <p className="font-serif-c italic text-stone-400 mt-1">Resumen de actividad del local</p>
        </div>

        <div className="flex gap-1 border border-stone-800">
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mes' },
            { id: 'año', label: 'Año' },
            { id: 'todo', label: 'Todo' },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`px-3 py-2 font-sans-c text-xs uppercase tracking-wider transition
                ${periodo === p.id ? 'bg-amber-200 text-stone-950' : 'text-stone-400 hover:text-amber-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas KPI principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          icono={<Calendar size={20} className="text-amber-200" strokeWidth={1.5} />}
          label="Reservas"
          valor={totalReservas}
          subtitulo={`${horasTotales} horas trabajadas`}
        />
        <KpiCard
          icono={<DollarSign size={20} className="text-emerald-300" strokeWidth={1.5} />}
          label="Ingresos"
          valor={formatearPrecio(ingresosTotales)}
          subtitulo="Total facturado"
          destacado={true}
        />
        <KpiCard
          icono={<TrendingUp size={20} className="text-blue-300" strokeWidth={1.5} />}
          label="Ticket promedio"
          valor={totalReservas > 0 ? formatearPrecio(ticketPromedio) : '—'}
          subtitulo="Por reserva"
        />
        <KpiCard
          icono={<Award size={20} className="text-amber-300" strokeWidth={1.5} />}
          label="Top barbero"
          valor={porBarbero[0]?.reservas > 0 ? porBarbero[0].nombre : '—'}
          subtitulo={porBarbero[0]?.reservas > 0 ? `${porBarbero[0].reservas} reservas · ${formatearPrecio(porBarbero[0].ingresos)}` : 'Sin datos'}
        />
      </div>

      {totalReservas === 0 ? (
        <div className="text-center py-16 border border-stone-800 bg-stone-900/40">
          <BarChart3 size={32} className="mx-auto text-stone-700 mb-3" strokeWidth={1} />
          <p className="font-serif-c italic text-stone-500">No hay reservas en este período.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Por barbero */}
          <div className="bg-stone-900/40 border border-stone-800 p-5">
            <h3 className="font-display text-xl text-amber-50 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
              <Users size={18} className="text-amber-200" strokeWidth={1.5} />
              POR BARBERO
            </h3>
            <div className="space-y-3">
              {porBarbero.map((b, i) => (
                <div key={b.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-display text-xs text-stone-500 w-5">#{i + 1}</span>
                      <span className="font-display text-base text-amber-50 truncate">{b.nombre.toUpperCase()}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-serif-c text-amber-200">{formatearPrecio(b.ingresos)}</span>
                      <span className="font-sans-c text-[11px] text-stone-500 ml-2">· {b.reservas} reserva{b.reservas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-stone-800 overflow-hidden">
                    <div className="h-full bg-amber-200 transition-all"
                      style={{ width: `${(b.ingresos / maxIngresoBarbero) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Servicios populares */}
          <div className="bg-stone-900/40 border border-stone-800 p-5">
            <h3 className="font-display text-xl text-amber-50 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
              <Scissors size={18} className="text-amber-200" strokeWidth={1.5} />
              CORTES MÁS PEDIDOS
            </h3>
            <div className="space-y-3">
              {porServicio.length === 0 && <p className="font-serif-c italic text-stone-500 text-sm">Sin datos</p>}
              {porServicio.map(s => (
                <div key={s.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display text-base text-amber-50 truncate">{s.nombre.toUpperCase()}</span>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-serif-c text-amber-200">{s.cantidad}</span>
                      <span className="font-sans-c text-[11px] text-stone-500 ml-2">· {formatearPrecio(s.ingresos)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-stone-800 overflow-hidden">
                    <div className="h-full bg-amber-200/70 transition-all"
                      style={{ width: `${(s.cantidad / maxCantServicio) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adicionales */}
          <div className="bg-stone-900/40 border border-stone-800 p-5">
            <h3 className="font-display text-xl text-amber-50 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
              <Plus size={18} className="text-amber-200" strokeWidth={1.5} />
              ADICIONALES VENDIDOS
            </h3>
            <div className="space-y-3">
              {porAdicional.length === 0 && <p className="font-serif-c italic text-stone-500 text-sm">Aún no se han vendido adicionales en este período.</p>}
              {porAdicional.map(a => (
                <div key={a.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display text-base text-amber-50 truncate">{a.nombre.toUpperCase()}</span>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-serif-c text-amber-200">{a.cantidad}</span>
                      <span className="font-sans-c text-[11px] text-stone-500 ml-2">· {formatearPrecio(a.ingresos)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-stone-800 overflow-hidden">
                    <div className="h-full bg-emerald-400/70 transition-all"
                      style={{ width: `${(a.cantidad / maxCantAdic) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hora pico */}
          <div className="bg-stone-900/40 border border-stone-800 p-5">
            <h3 className="font-display text-xl text-amber-50 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
              <Clock size={18} className="text-amber-200" strokeWidth={1.5} />
              HORARIOS MÁS POPULARES
            </h3>
            <div className="flex items-end gap-1 h-32">
              {porHora.length === 0 && <p className="font-serif-c italic text-stone-500 text-sm self-center w-full text-center">Sin datos</p>}
              {porHora.map(h => (
                <div key={h.hora} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                  <span className="font-sans-c text-[10px] text-amber-200">{h.cantidad}</span>
                  <div className="w-full bg-amber-200/60 hover:bg-amber-200 transition-all"
                    style={{ height: `${(h.cantidad / maxPorHora) * 100}%`, minHeight: '4px' }}
                    title={`${h.hora}:00 — ${h.cantidad} reservas`}></div>
                  <span className="font-sans-c text-[9px] text-stone-500">{h.hora}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tendencia últimos 14 días — siempre visible */}
      <div className="bg-stone-900/40 border border-stone-800 p-5 mt-4">
        <h3 className="font-display text-xl text-amber-50 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-amber-200" strokeWidth={1.5} />
          ÚLTIMOS 14 DÍAS
        </h3>
        <div className="flex items-end gap-1 h-32">
          {tendencia.map(d => (
            <div key={d.key} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <span className="font-sans-c text-[10px] text-amber-200/80">{d.cantidad || ''}</span>
              <div className={`w-full transition-all ${d.cantidad > 0 ? 'bg-amber-200' : 'bg-stone-800'}`}
                style={{ height: d.cantidad > 0 ? `${(d.cantidad / maxTendencia) * 100}%` : '4px', minHeight: '4px' }}
                title={`${fechaKey(d.fecha)} — ${d.cantidad} reservas · ${formatearPrecio(d.ingresos)}`}></div>
              <span className="font-sans-c text-[9px] text-stone-500">{d.fecha.getDate()}/{d.fecha.getMonth() + 1}</span>
            </div>
          ))}
        </div>
        <p className="font-sans-c text-[11px] text-stone-500 italic mt-3 text-center">
          Total 14 días: {tendencia.reduce((s, d) => s + d.cantidad, 0)} reservas · {formatearPrecio(tendencia.reduce((s, d) => s + d.ingresos, 0))}
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icono, label, valor, subtitulo, destacado }) {
  return (
    <div className={`p-4 border ${destacado ? 'border-amber-200/40 bg-amber-200/5' : 'border-stone-800 bg-stone-900/40'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icono}
        <p className="font-sans-c text-[10px] uppercase tracking-widest text-stone-400">{label}</p>
      </div>
      <p className="font-display text-2xl text-amber-50 truncate">{valor}</p>
      <p className="font-sans-c text-[11px] text-stone-500 italic mt-0.5 truncate">{subtitulo}</p>
    </div>
  );
}

// ============== CONFIGURACIÓN GENERAL ==============
function TabConfiguracion({ config, setConfig }) {
  const [valor, setValor] = useState(config.cancelacionAntelacionMin);
  const [guardado, setGuardado] = useState(false);

  // Opciones rápidas para que sea fácil elegir, pero también permite valor personalizado
  const opcionesRapidas = [
    { min: 0, label: 'Sin restricción' },
    { min: 60, label: '1 hora' },
    { min: 120, label: '2 horas' },
    { min: 240, label: '4 horas' },
    { min: 1440, label: '24 horas' },
  ];

  const guardar = () => {
    const n = parseInt(valor);
    if (isNaN(n) || n < 0) return;
    setConfig({ ...config, cancelacionAntelacionMin: n });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const horas = Math.floor(valor / 60);
  const mins = valor % 60;
  const txtActual = valor === 0
    ? 'el cliente puede cancelar en cualquier momento'
    : (horas > 0 ? `${horas}h${mins ? ' ' + mins + 'min' : ''}` : `${mins} min`);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-3xl text-amber-50">CONFIGURACIÓN</h2>
        <p className="font-serif-c italic text-stone-400 mt-1">Reglas generales del local que aplican a todos los barberos.</p>
      </div>

      <div className="bg-stone-900/40 border border-stone-800 p-6 max-w-2xl">
        <div className="mb-5">
          <h3 className="font-display text-xl text-amber-50 mb-1">POLÍTICA DE CANCELACIÓN</h3>
          <p className="font-serif-c italic text-stone-400 text-sm">
            Tiempo mínimo de antelación con el que un cliente puede cancelar su reserva. Pasado ese límite, deberá llamar al local.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {opcionesRapidas.map(o => (
            <button key={o.min} onClick={() => setValor(o.min)}
              className={`py-2 px-3 font-sans-c text-xs uppercase tracking-wider border transition
                ${valor === o.min ? 'bg-amber-200 text-stone-950 border-amber-200' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 pt-4 border-t border-stone-800">
          <div className="flex-1">
            <label className="font-sans-c text-xs uppercase tracking-wider text-stone-400 block mb-1">Valor personalizado (en minutos)</label>
            <input type="number" min="0" step="15" value={valor}
              onChange={e => setValor(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-900 border border-stone-700 px-3 py-2 font-serif-c text-amber-50 focus:border-amber-200 outline-none" />
          </div>
          <p className="font-serif-c italic text-stone-500 text-sm pb-2">
            Equivale a: <span className="text-amber-200">{txtActual}</span>
          </p>
        </div>

        <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-stone-800">
          {guardado && <span className="font-sans-c text-xs uppercase tracking-wider text-amber-200 flex items-center gap-1"><Check size={14} /> Guardado</span>}
          <button onClick={guardar}
            className="px-6 py-2 bg-amber-200 text-stone-950 font-sans-c text-sm uppercase tracking-wider hover:bg-amber-100">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
