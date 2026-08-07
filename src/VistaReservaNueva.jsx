import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  User,
  Users,
  Info,
  Star,
  MapPin,
  Phone,
  Image as ImageIcon,
  Clock,
} from "lucide-react";
import { CalendarioPicker } from "./components/CalendarioPicker";
import { COLS_PUBLICAS_BARBERIA } from "./utils/barberiaCols";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ¿La hora ya pasó? Solo aplica si la fecha es hoy (hora de Chile).
function horaYaPaso(fecha, horaStr) {
  const ahoraCL = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }),
  );
  const hoyCL = `${ahoraCL.getFullYear()}-${String(ahoraCL.getMonth() + 1).padStart(2, "0")}-${String(ahoraCL.getDate()).padStart(2, "0")}`;
  if (fecha !== hoyCL) return false;
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m <= ahoraCL.getHours() * 60 + ahoraCL.getMinutes();
}

// ¿El bloqueo aplica en esta fecha por día de la semana?
// Los bloqueos recurrentes guardan dias_semana como números JS (Dom=0..Sáb=6).
// Si no tiene dias_semana (bloqueo por rango normal), aplica siempre (el rango de
// fechas ya se filtra aparte). Si es recurrente, solo aplica en los días elegidos.
function bloqueoAplicaPorDia(b, fecha) {
  if (!Array.isArray(b?.dias_semana) || b.dias_semana.length === 0) return true;
  return b.dias_semana.includes(new Date(fecha + "T12:00:00").getDay());
}

// Ícono temático RELLENO (dorado, con brillo) por servicio, deducido del nombre.
// Usa currentColor → se adapta al tema (dorado en barbería, rosado en salón). Sin pedir fotos al admin.
function IconoServicio({ nombre = "", className = "h-8 w-8" }) {
  const n = nombre.toLowerCase();
  const svg = { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" };
  const gloss = <path d="M8.5 9.5c.6-1 1.4-1.8 2.4-2.3" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />;

  // Orden por prioridad (más específico primero) para que servicios que comparten
  // palabra (ej. "Corte+barba" vs "Perfilado Barba") reciban íconos distintos.
  if (/(rulo|permanent|ondula|textur|rizo|alisad)/.test(n)) {
    // Ondas
    return (
      <svg {...svg}>
        <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M3.5 7.5c1.8-2.4 3.6-2.4 5.4 0s3.6 2.4 5.4 0 3.6-2.4 5.4 0" />
          <path d="M3.5 13c1.8-2.4 3.6-2.4 5.4 0s3.6 2.4 5.4 0 3.6-2.4 5.4 0" />
          <path d="M3.5 18.5c1.8-2.4 3.6-2.4 5.4 0s3.6 2.4 5.4 0 3.6-2.4 5.4 0" />
        </g>
      </svg>
    );
  }
  if (/ceja/.test(n)) {
    // Ceja
    return (
      <svg {...svg}>
        <path d="M3.5 13.2c3.6-4.6 9.8-5.6 15.2-2.9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16.6" cy="14.9" r="1.9" fill="currentColor" />
      </svg>
    );
  }
  if (/(perfilad|afeit|navaja|diseñ|línea|linea|delineado)/.test(n)) {
    // Navaja (perfilado de barba, afeitado, diseño de líneas)
    return (
      <svg {...svg}>
        <path fill="currentColor" d="M3 15.9 14.5 4.4a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1L6.7 18.4c-.3.3-.7.45-1.15.4l-2.4-.25c-1.05-.1-1.4-1.4-.65-2z" />
        <path d="M4.6 16 15.6 5" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  if (/(color|tinte|mecha|rubio|camufl|canas)/.test(n)) {
    // Pincel
    return (
      <svg {...svg}>
        <g fill="currentColor">
          <path d="M20.7 4.5a1.9 1.9 0 0 0-2.7 0l-6.15 6.15 2.7 2.7L20.7 7.2a1.9 1.9 0 0 0 0-2.7z" />
          <path d="M10.85 11.6l1.7 1.7c-.5.9-1.3 1.35-2.2 1.65-.9.3-1.35.95-1.95 1.65-.85.95-2.25 1.25-3.35.6.72-.42 1.02-1.02 1.2-1.85.22-1.02.72-1.95 1.55-2.55.83-.6 1.9-.9 3-.85z" />
        </g>
        {gloss}
      </svg>
    );
  }
  if (/(secad|secar|blower|brushing|peinad)/.test(n) || n.trim() === "lavado") {
    // Secador de pelo (secado/peinado, o el adicional "Lavado")
    return (
      <svg {...svg}>
        <g fill="currentColor">
          <rect x="1.5" y="8.3" width="3" height="4.4" rx="0.8" />
          <rect x="4" y="6.5" width="13" height="8" rx="4" />
          <path d="M8 14.2h4l-.6 5.2a1.5 1.5 0 0 1-2.98 0z" />
        </g>
        <circle cx="13.3" cy="10.5" r="1.3" fill="#000" fillOpacity="0.2" />
        <rect x="6" y="8.2" width="6.5" height="1.6" rx="0.8" fill="#fff" fillOpacity="0.22" />
      </svg>
    );
  }
  if (/barba/.test(n) && /lavado/.test(n)) {
    // Máquina de cortar (combos tipo "Corte+barba+lavado")
    return (
      <svg {...svg}>
        <g fill="currentColor">
          <rect x="6.5" y="3.3" width="1.35" height="3.3" rx="0.55" />
          <rect x="8.85" y="2.8" width="1.35" height="3.8" rx="0.55" />
          <rect x="11.32" y="2.6" width="1.35" height="4.0" rx="0.55" />
          <rect x="13.8" y="2.8" width="1.35" height="3.8" rx="0.55" />
          <rect x="16.15" y="3.3" width="1.35" height="3.3" rx="0.55" />
          <rect x="5.8" y="6.2" width="12.4" height="14.6" rx="3.2" />
        </g>
        <rect x="9.3" y="10.2" width="5.4" height="1.7" rx="0.85" fill="#000" fillOpacity="0.22" />
        <rect x="7.4" y="8.2" width="2.1" height="8.4" rx="1.05" fill="#fff" fillOpacity="0.22" />
      </svg>
    );
  }
  if (/(lavado|shampoo|hidrat|mascar|facial)/.test(n)) {
    // Gota
    return (
      <svg {...svg}>
        <path fill="currentColor" d="M12 3.3c-.28 0-.53.13-.72.37C9.98 5.4 6.2 10.3 6.2 14.1a5.8 5.8 0 0 0 11.6 0c0-3.8-3.78-8.7-5.08-10.43a.9.9 0 0 0-.72-.37z" />
        <ellipse cx="9.7" cy="13.4" rx="1.05" ry="2" fill="#fff" fillOpacity="0.35" />
      </svg>
    );
  }
  if (/(barba|bigote)/.test(n)) {
    // Bigote
    return (
      <svg {...svg}>
        <path fill="currentColor" d="M12 10.9c-1.2.98-2.5 1.9-4.45 2.15-2.65.34-5-.78-6.5-2.95-.3-.42-.95-.16-.86.35C.83 14.1 3.9 17.3 7.7 17.3c1.78 0 3.32-.88 4.3-1.98.98 1.1 2.52 1.98 4.3 1.98 3.8 0 6.87-3.2 7.51-6.85.09-.51-.56-.77-.86-.35-1.5 2.17-3.85 3.29-6.5 2.95C14.5 12.8 13.2 11.88 12 10.9z" />
        <path fill="#fff" fillOpacity="0.25" d="M5 11.4c1.35.9 2.85 1.35 4.5 1.2-.5.62-1.25 1-2.35.95-1.1-.05-1.9-.95-2.15-2.15z" />
      </svg>
    );
  }
  // Corte / default — tijera
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6.5" r="2.6" />
      <circle cx="6" cy="17.5" r="2.6" />
      <path d="M8.4 8.1 20 18.5" />
      <path d="M8.4 15.9 20 5.5" />
    </svg>
  );
}

export function VistaReservaNueva({ supabase, barberiaId }) {
  // paso: 0 Servicios · 1 Profesional · 2 Fecha · 3 Confirmar · 4 Listo
  const [paso, setPaso] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState([]);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null);
  const [barberoAsignado, setBarberoAsignado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");

  const [servicios, setServicios] = useState([]);
  const [adicionales, setAdicionales] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [duracionesPorBarbero, setDuracionesPorBarbero] = useState({});
  const [horariosBarbero, setHorariosBarbero] = useState([]);
  const [barberiaData, setBarberiaData] = useState(null);
  const [googleReviews, setGoogleReviews] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [galeriaIdx, setGaleriaIdx] = useState(0); // carrusel sidebar "Nuestros trabajos"

  const CUALQUIERA = "cualquiera";
  const DIAS_KEY = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const PASOS = ["Servicios", "Profesional", "Fecha", "Confirmar"];

  const esSalon = barberiaData?.tipo_barberia === "salon";
  const config = barberiaData?.configuracion || {};

  useEffect(() => {
    cargarDatos();
    cargarBarberia();
    cargarGaleria();
  }, []);

  // Auto-avance del carrusel "Nuestros trabajos" (1 foto a la vez, cada 4.5s)
  useEffect(() => {
    if (galeria.length <= 1) return;
    const t = setInterval(() => setGaleriaIdx((i) => (i + 1) % galeria.length), 4500);
    return () => clearInterval(t);
  }, [galeria.length]);

  const cargarBarberia = async () => {
    try {
      const { data, error } = await supabase
        .from("barberia")
        .select(COLS_PUBLICAS_BARBERIA)
        .eq("id", barberiaId)
        .single();
      if (error) throw error;
      setBarberiaData(data);
      cargarGoogleReviews(data?.configuracion?.google_place_id);
    } catch (err) {
      console.error("Error cargando barbería:", err);
    }
  };

  // Reseñas de Google — mismo endpoint que usa la home (VistaInicio).
  const cargarGoogleReviews = async (placeId) => {
    if (!placeId) return;
    try {
      const res = await fetch(`/api/get-google-reviews?barberiaId=${barberiaId}&placeId=${placeId}`);
      if (res.ok) {
        const data = await res.json();
        setGoogleReviews(data.reseñas);
      }
    } catch (err) {
      console.error("Error cargando reseñas Google:", err);
    }
  };

  const cargarGaleria = async () => {
    try {
      const { data } = await supabase
        .from("galeria_trabajos")
        .select("id, foto_url")
        .eq("barberia_id", barberiaId)
        .eq("activo", true)
        .order("orden", { ascending: true });
      setGaleria(data || []);
    } catch (err) {
      console.error("Error cargando galería:", err);
    }
  };

  const cargarDatos = async () => {
    try {
      const { data: srvs } = await supabase
        .from("servicios_principales")
        .select("*")
        .eq("barberia_id", barberiaId)
        .eq("activo", true);

      const { data: ads } = await supabase
        .from("servicios_adicionales")
        .select("*")
        .eq("barberia_id", barberiaId)
        .eq("activo", true);

      const { data: brbs } = await supabase
        .from("barberos")
        .select("id, barberia_id, usuario_id, nombre, especialidad, dias_libres, horario_inicio, horario_fin, duracion_promedio_minutos, estado, fecha_creacion, activo, horarios_semana, foto_url, intervalo_minutos, google_calendar_conectado, orden")
        .eq("barberia_id", barberiaId)
        .eq("activo", true)
        .order("orden", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });

      const { data: durs } = await supabase
        .from("duraciones_barbero")
        .select("barbero_id, servicio_id, duracion_minutos")
        .eq("barberia_id", barberiaId);
      const mapaDur = {};
      (durs || []).forEach((d) => {
        if (!mapaDur[d.barbero_id]) mapaDur[d.barbero_id] = {};
        mapaDur[d.barbero_id][d.servicio_id] = d.duracion_minutos;
      });

      setServicios(srvs || []);
      setAdicionales(ads || []);
      setBarberos(brbs || []);
      setDuracionesPorBarbero(mapaDur);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error cargando datos");
    }
  };

  const calcularDuracionTotal = (barberoId = null) => {
    const dur = barberoId ? duracionesPorBarbero[barberoId] : null;
    const duracionServicio =
      dur?.[servicioSeleccionado?.id] ??
      servicioSeleccionado?.duracion_minutos ??
      30;
    const duracionAdicionales = adicionalesSeleccionados.reduce((sum, id) => {
      const global = adicionales.find((a) => a.id === id)?.duracion_minutos || 0;
      return sum + (dur?.[id] ?? global);
    }, 0);
    return duracionServicio + duracionAdicionales;
  };

  const barberoDisponibleEnHora = (
    barbero,
    hora,
    reservasDelBarbero,
    bloqueosDelBarbero = [],
    horarioInicioOverride = null,
    horarioFinOverride = null,
  ) => {
    const duracionTotal = calcularDuracionTotal(barbero?.id);
    const horaInicio = new Date(`2000-01-01 ${horarioInicioOverride || barbero.horario_inicio}`);
    const horaFin    = new Date(`2000-01-01 ${horarioFinOverride    || barbero.horario_fin}`);
    const horaTest   = new Date(`2000-01-01 ${hora}`);

    if (horaTest < horaInicio) return false;
    if (horaTest.getTime() + duracionTotal * 60000 > horaFin.getTime()) return false;

    const choca = reservasDelBarbero.some((r) => {
      const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
      const horaResEnd = new Date(horaRes.getTime() + r.duracion_minutos * 60000);
      return horaTest < horaResEnd && new Date(horaTest.getTime() + duracionTotal * 60000) > horaRes;
    });
    if (choca) return false;

    const horaTestEnd = new Date(horaTest.getTime() + duracionTotal * 60000);
    const chocaConBloqueo = bloqueosDelBarbero.some((b) => {
      if (!b.hora_inicio) return true;
      const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
      const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
      return horaTest < bFin && horaTestEnd > bInicio;
    });
    return !chocaConBloqueo;
  };

  const obtenerBloqueosDelBarbero = (barberoId, fecha, todosLosBloqueos) => {
    return todosLosBloqueos.filter((b) => {
      const aplicaABarbero = b.barbero_id === barberoId || b.barbero_id === null;
      const enRango = fecha >= b.fecha_inicio && fecha <= b.fecha_fin;
      return aplicaABarbero && enRango && bloqueoAplicaPorDia(b, fecha);
    });
  };

  const cargarHorariosBarbero = async (barberoId, fecha) => {
    if (!barberoId || !fecha) { setHorariosBarbero([]); return; }
    try {
      const { data: reservasExistentes } = await supabase
        .from("reservas")
        .select("hora_inicio, duracion_minutos")
        .eq("barbero_id", barberoId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const bloqueosDelBarbero = (bloqueosExistentes || []).filter(
        (b) => (b.barbero_id === barberoId || b.barbero_id === null) && bloqueoAplicaPorDia(b, fecha),
      );

      const tieneBloqueoCompleto = bloqueosDelBarbero.some((b) => !b.hora_inicio);
      if (tieneBloqueoCompleto) { setHorariosBarbero([]); return; }

      const barbero = barberos.find((b) => b.id === barberoId);
      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];
      const horarioDia = barbero?.horarios_semana?.[diaSemana];
      if (horarioDia && !horarioDia.activo) { setHorariosBarbero([]); return; }

      const horaInicio = new Date(`2000-01-01 ${horarioDia?.inicio || barbero.horario_inicio}`);
      const horaFin    = new Date(`2000-01-01 ${horarioDia?.fin    || barbero.horario_fin}`);

      const duracionTotal = calcularDuracionTotal(barberoId);
      const horariosDisponibles = [];
      let hora = new Date(horaInicio);

      while (hora.getTime() + duracionTotal * 60000 <= horaFin.getTime()) {
        const horaStr = hora.toTimeString().slice(0, 5);
        const chocaReserva = reservasExistentes.some((r) => {
          const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
          const horaResEnd = new Date(horaRes.getTime() + r.duracion_minutos * 60000);
          return hora < horaResEnd && new Date(hora.getTime() + duracionTotal * 60000) > horaRes;
        });
        const chocaBloqueo = bloqueosDelBarbero.some((b) => {
          if (!b.hora_inicio) return false;
          const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
          const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
          return hora < bFin && new Date(hora.getTime() + duracionTotal * 60000) > bInicio;
        });
        if (!chocaReserva && !chocaBloqueo && !horaYaPaso(fecha, horaStr)) {
          horariosDisponibles.push(horaStr);
        }
        hora.setMinutes(hora.getMinutes() + (barbero?.intervalo_minutos || 15));
      }
      setHorariosBarbero(horariosDisponibles);
    } catch (err) {
      console.error("Error cargando horarios:", err);
    }
  };

  const cargarHorariosCualquierBarbero = async (fecha) => {
    if (!fecha) { setHorariosBarbero([]); return; }
    try {
      const { data: reservasExistentes } = await supabase
        .from("reservas")
        .select("barbero_id, hora_inicio, duracion_minutos")
        .eq("barberia_id", barberiaId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosExistentes || [];
      const barberiaCerrada = todosLosBloqueos.some((b) => b.barbero_id === null && !b.hora_inicio && bloqueoAplicaPorDia(b, fecha));
      if (barberiaCerrada) { setHorariosBarbero([]); return; }

      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];
      let horaMinima = null, horaMaxima = null;
      barberos.forEach((b) => {
        const horarioDia = b?.horarios_semana?.[diaSemana];
        if (horarioDia && !horarioDia.activo) return;
        const inicio = new Date(`2000-01-01 ${horarioDia?.inicio || b.horario_inicio}`);
        const fin    = new Date(`2000-01-01 ${horarioDia?.fin    || b.horario_fin}`);
        if (!horaMinima || inicio < horaMinima) horaMinima = inicio;
        if (!horaMaxima || fin > horaMaxima) horaMaxima = fin;
      });
      if (!horaMinima || !horaMaxima) { setHorariosBarbero([]); return; }

      const horariosDisponibles = [];
      let hora = new Date(horaMinima);
      const duracionTotal = calcularDuracionTotal();
      while (hora.getTime() + duracionTotal * 60000 <= horaMaxima.getTime()) {
        const horaStr = hora.toTimeString().slice(0, 5);
        const hayAlguienDisponible = barberos.some((barbero) => {
          const horarioDia = barbero?.horarios_semana?.[diaSemana];
          if (horarioDia && !horarioDia.activo) return false;
          const reservasDelBarbero = reservasExistentes.filter((r) => r.barbero_id === barbero.id);
          const bloqueosDelBarbero = obtenerBloqueosDelBarbero(barbero.id, fecha, todosLosBloqueos);
          return barberoDisponibleEnHora(barbero, horaStr, reservasDelBarbero, bloqueosDelBarbero, horarioDia?.inicio || null, horarioDia?.fin || null);
        });
        if (hayAlguienDisponible && !horaYaPaso(fecha, horaStr)) horariosDisponibles.push(horaStr);
        hora.setMinutes(hora.getMinutes() + (barberos[0]?.intervalo_minutos || 15));
      }
      setHorariosBarbero(horariosDisponibles);
    } catch (err) {
      console.error("Error cargando horarios (cualquier barbero):", err);
    }
  };

  const asignarBarberoBalanceado = async (fecha, hora) => {
    if (!fecha || !hora) return null;
    try {
      const { data: reservasDelDia } = await supabase
        .from("reservas")
        .select("barbero_id, hora_inicio, duracion_minutos")
        .eq("barberia_id", barberiaId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosDelDia } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosDelDia || [];
      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];

      const barberosDisponibles = barberos.filter((barbero) => {
        const horarioDia = barbero?.horarios_semana?.[diaSemana];
        if (horarioDia && !horarioDia.activo) return false;
        const reservasDelBarbero = reservasDelDia.filter((r) => r.barbero_id === barbero.id);
        const bloqueosDelBarbero = obtenerBloqueosDelBarbero(barbero.id, fecha, todosLosBloqueos);
        return barberoDisponibleEnHora(barbero, hora, reservasDelBarbero, bloqueosDelBarbero, horarioDia?.inicio || null, horarioDia?.fin || null);
      });
      if (barberosDisponibles.length === 0) return null;

      const barberosConCarga = barberosDisponibles.map((barbero) => ({
        ...barbero,
        cantidadReservas: reservasDelDia.filter((r) => r.barbero_id === barbero.id).length,
      }));
      barberosConCarga.sort((a, b) => a.cantidadReservas - b.cantidadReservas);
      return barberosConCarga[0];
    } catch (err) {
      console.error("Error asignando barbero:", err);
      return null;
    }
  };

  const calcularPrecioTotal = () => {
    let total = servicioSeleccionado?.precio || 0;
    adicionalesSeleccionados.forEach((id) => {
      const adicional = adicionales.find((a) => a.id === id);
      if (adicional) total += adicional.precio;
    });
    return total;
  };

  const validarPaso = () => {
    if (paso === 0 && !servicioSeleccionado) { setError("Selecciona un servicio"); return false; }
    if (paso === 1 && !barberoSeleccionado) { setError("Selecciona un profesional (o 'Cualquiera')"); return false; }
    if (paso === 2 && (!fechaSeleccionada || !horaSeleccionada)) { setError("Selecciona fecha y hora"); return false; }
    if (paso === 3) {
      if (!clienteNombre || !clienteTelefono || !clienteEmail) { setError("Completa nombre, teléfono y email"); return false; }
      if (clienteTelefono.replace(/\D/g, "").length !== 11) { setError("El teléfono debe tener 9 dígitos (ej: 9 1234 5678)"); return false; }
      if (clienteEmail && !/\S+@\S+\.\S+/.test(clienteEmail)) { setError("El email no es válido"); return false; }
    }
    return true;
  };

  const irAlSiguiente = () => {
    if (!validarPaso()) return;
    setError("");
    if (paso === 3) { confirmarReserva(); return; }
    if (paso < 3) setPaso(paso + 1);
  };

  const irAlAnterior = () => { if (paso > 0) { setPaso(paso - 1); setError(""); } };

  const irAPaso = (destino) => { if (destino <= paso) { setPaso(destino); setError(""); } };

  const seleccionarFecha = (fecha) => {
    setFechaSeleccionada(fecha);
    setHoraSeleccionada("");
    if (fecha && barberoSeleccionado) {
      if (barberoSeleccionado === CUALQUIERA) cargarHorariosCualquierBarbero(fecha);
      else cargarHorariosBarbero(barberoSeleccionado, fecha);
    }
  };

  const confirmarReserva = async () => {
    if (!validarPaso()) return;
    setCargando(true);
    setError("");
    try {
      const precioTotal = calcularPrecioTotal();
      const reservaId = `r-${Date.now()}`;
      let barberoFinalId = barberoSeleccionado;
      let barberoFinalData = null;

      if (barberoSeleccionado === CUALQUIERA) {
        const asignado = await asignarBarberoBalanceado(fechaSeleccionada, horaSeleccionada);
        if (!asignado) { setError("No hay profesionales disponibles a esa hora. Selecciona otra."); setCargando(false); return; }
        barberoFinalId = asignado.id;
        barberoFinalData = asignado;
        setBarberoAsignado(asignado);
      } else {
        barberoFinalData = barberos.find((b) => b.id === barberoFinalId);
        setBarberoAsignado(barberoFinalData);
      }

      // Re-validación anti doble-booking (el slot pudo ocuparse tras cargar la página).
      const durNueva = calcularDuracionTotal(barberoFinalId);
      const { data: yaReservado } = await supabase
        .from("reservas")
        .select("hora_inicio, duracion_minutos")
        .eq("barbero_id", barberoFinalId)
        .eq("fecha", fechaSeleccionada)
        .eq("estado", "confirmada");
      const [hSel, mSel] = horaSeleccionada.split(":").map(Number);
      const iniNueva = hSel * 60 + mSel;
      const finNueva = iniNueva + durNueva;
      const haySolape = (yaReservado || []).some((r) => {
        const [rh, rm] = r.hora_inicio.split(":").map(Number);
        const iniR = rh * 60 + rm;
        const finR = iniR + (r.duracion_minutos || 0);
        return iniNueva < finR && iniR < finNueva;
      });
      if (haySolape) {
        setError("Uy, esa hora acaba de ser reservada. Por favor elige otro horario.");
        setCargando(false);
        if (barberoSeleccionado === CUALQUIERA) cargarHorariosCualquierBarbero(fechaSeleccionada);
        else cargarHorariosBarbero(barberoFinalId, fechaSeleccionada);
        setPaso(2);
        return;
      }

      const { error: errorSupabase } = await supabase.from("reservas").insert({
        id: reservaId,
        barberia_id: barberiaId,
        barbero_id: barberoFinalId,
        servicio_id: servicioSeleccionado.id,
        adicionales_ids: adicionalesSeleccionados,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        cliente_email: clienteEmail || null,
        fecha: fechaSeleccionada,
        hora_inicio: horaSeleccionada,
        duracion_minutos: calcularDuracionTotal(barberoFinalId),
        precio_original: precioTotal,
        precio_final: precioTotal,
        estado: "confirmada",
      });

      if (errorSupabase) {
        if (/SOLAPE_RESERVA|exclusion/i.test(errorSupabase.message || "")) {
          setError("Uy, esa hora acaba de ser reservada. Por favor elige otro horario.");
          setCargando(false);
          if (barberoSeleccionado === CUALQUIERA) cargarHorariosCualquierBarbero(fechaSeleccionada);
          else cargarHorariosBarbero(barberoFinalId, fechaSeleccionada);
          setPaso(2);
          return;
        }
        throw errorSupabase;
      }

      if (clienteEmail) {
        try {
          const emailResponse = await fetch("/api/send-confirmation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteEmail, clienteNombre, barberiaId,
              barberiaNombre: barberiaData?.nombre || "Tu Barbería",
              barberoNombre: barberoFinalData?.nombre || "el profesional",
              barberoId: barberoFinalData?.id,
              servicioNombre: servicioSeleccionado.nombre,
              precioServicio: servicioSeleccionado.precio,
              adicionales: adicionalesSeleccionados
                .map((adId) => { const ad = adicionales.find((a) => a.id === adId); return ad ? { nombre: ad.nombre, precio: ad.precio } : null; })
                .filter(Boolean),
              fecha: fechaSeleccionada, hora: horaSeleccionada, precio: precioTotal,
              whatsappBarberia: barberiaData?.configuracion?.whatsapp || "56000000000",
              direccionBarberia: barberiaData?.configuracion?.direccion || null,
              reservaId,
            }),
          });
          const emailResult = await emailResponse.json();
          if (!emailResponse.ok) console.error("⚠️ Reserva guardada pero email falló:", emailResult);
        } catch (emailError) {
          console.error("⚠️ Error enviando email:", emailError);
        }
      }

      if (clienteTelefono && barberiaData?.configuracion?.features?.whatsapp_confirmacion) {
        try {
          await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteTelefono, clienteNombre,
              barberiaNombre: barberiaData?.nombre || "Tu Barbería",
              barberoNombre: barberoFinalData?.nombre || "el profesional",
              servicioNombre: servicioSeleccionado.nombre,
              fecha: fechaSeleccionada, hora: horaSeleccionada, precio: precioTotal,
              barberiaId, tipo: "confirmacion",
            }),
          });
        } catch (waError) {
          console.error("⚠️ WhatsApp confirmación falló (best-effort):", waError);
        }
      }

      try {
        await fetch("/api/google-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barbero_id: barberoFinalId,
            reserva: {
              fecha: fechaSeleccionada, hora_inicio: horaSeleccionada,
              duracion_minutos: calcularDuracionTotal(barberoFinalId),
              cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono,
              cliente_email: clienteEmail || "", servicio: servicioSeleccionado.nombre,
              precio_final: precioTotal,
            },
          }),
        });
      } catch (gcErr) {
        console.error("Error Google Calendar:", gcErr);
      }
      setPaso(4);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setCargando(false);
  };

  const fmtPrecio = (n) => "$" + (n || 0).toLocaleString("es-CL");
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "m" : ""}` : `${m} min`);
  const duracionTotalUI = servicioSeleccionado ? calcularDuracionTotal(barberoSeleccionado === CUALQUIERA ? null : barberoSeleccionado) : 0;

  const barberosVisibles = servicioSeleccionado?.barbero_exclusivo_id
    ? barberos.filter((b) => b.id === servicioSeleccionado.barbero_exclusivo_id)
    : barberos;

  return (
    <div className={cn("min-h-screen bg-background text-foreground", esSalon && "theme-salon")}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[300px_1fr]">
        {/* ───────────── SIDEBAR (solo desktop) ───────────── */}
        <aside className="hidden space-y-5 border-border p-6 md:flex md:flex-col md:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-1 ring-border">
              {barberiaData?.logo_url ? (
                <img src={barberiaData.logo_url} alt={barberiaData?.nombre || ""} className="h-full w-full object-cover" />
              ) : (
                <IconoServicio nombre="corte" className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                {barberiaData?.nombre || "Reservar"}
              </h1>
              {config.direccion && <p className="text-xs text-muted-foreground">{esSalon ? "Salón de belleza" : "Barbería"}</p>}
            </div>
          </div>

          {config.direccion && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3 w-3" /> Dirección
              </p>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium">{config.direccion}</div>
            </div>
          )}

          {(config.whatsapp || config.telefono) && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Phone className="h-3 w-3" /> Teléfono
              </p>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium tabular-nums">
                +{(config.whatsapp || config.telefono).replace(/^\+/, "")}
              </div>
            </div>
          )}

          {config.horario_atencion && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3 w-3" /> Horario de atención
              </p>
              <div className="whitespace-pre-line rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium leading-relaxed">
                {config.horario_atencion}
              </div>
            </div>
          )}

          {googleReviews?.rating > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Star className="h-3 w-3 fill-current" /> Reseñas
              </p>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-extrabold leading-none text-primary">
                    {Number(googleReviews.rating).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <div>
                    <div className="flex gap-0.5 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i < Math.round(googleReviews.rating) ? "fill-current" : "opacity-30")} />
                      ))}
                    </div>
                    {googleReviews.total ? (
                      <div className="text-xs text-muted-foreground">{googleReviews.total} reseñas en Google</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {galeria.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <ImageIcon className="h-3 w-3" /> Nuestros trabajos
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  key={galeria[galeriaIdx]?.id}
                  src={galeria[galeriaIdx]?.foto_url}
                  alt=""
                  className="aspect-[4/3] w-full animate-in fade-in object-cover duration-700"
                />
              </div>
              {galeria.length > 1 && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {galeria.map((_, i) => (
                    <span
                      key={i}
                      className={cn("h-1.5 rounded-full transition-all", i === galeriaIdx ? "w-4 bg-primary" : "w-1.5 bg-border")}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ───────────── MAIN ───────────── */}
        <div className="flex min-w-0 flex-col">
          {/* Encabezado compacto (solo móvil): reemplaza al sidebar */}
          <div className="border-b border-border p-4 md:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-1 ring-border">
                {barberiaData?.logo_url ? (
                  <img src={barberiaData.logo_url} alt={barberiaData?.nombre || ""} className="h-full w-full object-cover" />
                ) : (
                  <IconoServicio nombre="corte" className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight">{barberiaData?.nombre || "Reservar"}</h1>
                {googleReviews?.rating > 0 && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="flex gap-0.5 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < Math.round(googleReviews.rating) ? "fill-current" : "opacity-30")} />
                      ))}
                    </span>
                    <span className="font-bold text-primary">{Number(googleReviews.rating).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    {googleReviews.total ? <span>· {googleReviews.total} reseñas</span> : null}
                  </div>
                )}
              </div>
            </div>

            {(config.direccion || config.horario_atencion || config.whatsapp || config.telefono) && (
              <details className="group mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  Información y horarios
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-3 px-4 pb-3.5">
                  {config.direccion && (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><MapPin className="h-3 w-3" /> Dirección</p>
                      <p className="text-sm">{config.direccion}</p>
                    </div>
                  )}
                  {config.horario_atencion && (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Clock className="h-3 w-3" /> Horario</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{config.horario_atencion}</p>
                    </div>
                  )}
                  {(config.whatsapp || config.telefono) && (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Phone className="h-3 w-3" /> Teléfono</p>
                      <p className="text-sm tabular-nums">+{(config.whatsapp || config.telefono).replace(/^\+/, "")}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <div className="flex-1 p-6 pb-28 sm:p-8 sm:pb-28">
            {/* Stepper */}
            {paso < 4 && (
              <nav className="mb-7 flex items-center" aria-label="Pasos">
                {PASOS.map((label, i) => (
                  <React.Fragment key={label}>
                    <button
                      type="button"
                      onClick={() => irAPaso(i)}
                      disabled={i > paso}
                      className={cn("flex items-center gap-2.5", i <= paso ? "cursor-pointer" : "cursor-default")}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] text-sm font-bold transition-colors",
                          i === paso && "border-primary bg-primary text-primary-foreground",
                          i < paso && "border-primary/40 bg-primary/10 text-primary",
                          i > paso && "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {i < paso ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className={cn("text-sm font-semibold", i === paso ? "inline text-foreground" : "hidden text-muted-foreground sm:inline")}>
                        {label}
                      </span>
                    </button>
                    {i < PASOS.length - 1 && (
                      <span className={cn("mx-3 h-[1.5px] min-w-3 flex-1", i < paso ? "bg-primary/40" : "bg-border")} />
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Paso 0 — Servicios + adicionales */}
            {paso === 0 && (
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">¿Qué servicio necesitas?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Elige tu servicio principal</p>

                <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {servicios.map((s) => {
                    const sel = servicioSeleccionado?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setServicioSeleccionado(sel ? null : s)}
                        className={cn(
                          // Mobile: fila horizontal compacta (ícono izq · nombre · precio · radio der)
                          // sm+: tarjeta vertical centrada dentro del grid
                          "relative flex items-center gap-4 rounded-2xl border-[1.5px] bg-card p-4 text-left transition-colors sm:flex-col sm:gap-1.5 sm:pt-5 sm:text-center",
                          sel ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-card-hover",
                        )}
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary sm:h-[70px] sm:w-[70px]">
                          <IconoServicio nombre={s.nombre} />
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] font-bold sm:mt-1 sm:flex-none">{s.nombre}</span>
                        <span className="shrink-0 text-lg font-extrabold tabular-nums text-primary">{fmtPrecio(s.precio)}</span>
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:absolute sm:right-3 sm:top-3", sel ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}>
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {adicionales.length > 0 && (
                  <>
                    <div className="mt-7 flex items-center justify-between">
                      <h3 className="text-[15px] font-bold">Adicionales</h3>
                      <span className="text-xs font-semibold text-muted-foreground">Opcional · puedes elegir varios</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {adicionales.map((a) => {
                        const sel = adicionalesSeleccionados.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => setAdicionalesSeleccionados(sel ? adicionalesSeleccionados.filter((id) => id !== a.id) : [...adicionalesSeleccionados, a.id])}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border-[1.5px] bg-card px-4 py-3 text-left transition-colors",
                              sel ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-card-hover",
                            )}
                          >
                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors", sel ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}>
                              <Check className="h-3 w-3" />
                            </span>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                              <IconoServicio nombre={a.nombre} className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block text-sm font-semibold">{a.nombre}</span>
                            </span>
                            <span className="font-bold tabular-nums text-primary">+{fmtPrecio(a.precio)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Paso 1 — Profesional */}
            {paso === 1 && (
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Elige tu profesional</h2>
                <p className="mt-1 text-sm text-muted-foreground">O deja que te asignemos el de mayor disponibilidad</p>
                <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                  {!servicioSeleccionado?.barbero_exclusivo_id && (
                    <button
                      onClick={() => { setBarberoSeleccionado(CUALQUIERA); setHoraSeleccionada(""); }}
                      className={cn("flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-card p-5 text-center transition-colors", barberoSeleccionado === CUALQUIERA ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-card-hover")}
                    >
                      <span className="mb-1.5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"><Users className="h-7 w-7" /></span>
                      <span className="text-[15px] font-bold">Cualquiera</span>
                      <span className="text-xs text-muted-foreground">Mayor disponibilidad</span>
                    </button>
                  )}
                  {barberosVisibles.map((b) => {
                    const sel = barberoSeleccionado === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => { setBarberoSeleccionado(b.id); setHoraSeleccionada(""); }}
                        className={cn("flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-card p-5 text-center transition-colors", sel ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-card-hover")}
                      >
                        <span className="mb-1.5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-primary">
                          {b.foto_url ? <img src={b.foto_url} alt={b.nombre} className="h-full w-full object-cover object-top" /> : <User className="h-7 w-7" />}
                        </span>
                        <span className="text-[15px] font-bold leading-tight">{b.nombre}</span>
                        <span className="text-xs text-muted-foreground">{b.especialidad || "Profesional"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 2 — Fecha y hora */}
            {paso === 2 && (
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">¿Cuándo prefieres?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Elige un día y una hora disponible</p>
                <div className="mt-5 max-w-md">
                  <Label className="mb-2 block">Fecha</Label>
                  <CalendarioPicker
                    value={fechaSeleccionada}
                    onChange={seleccionarFecha}
                    horariosSemana={barberoSeleccionado === CUALQUIERA ? null : barberos.find((b) => b.id === barberoSeleccionado)?.horarios_semana}
                  />
                </div>
                {fechaSeleccionada && (
                  <div className="mt-6">
                    <Label className="mb-2 block">Hora</Label>
                    <div className="flex max-w-xl flex-wrap gap-2">
                      {horariosBarbero.map((hora) => {
                        const sel = horaSeleccionada === hora;
                        return (
                          <button
                            key={hora}
                            onClick={() => setHoraSeleccionada(hora)}
                            className={cn("rounded-lg border-[1.5px] px-4 py-2 text-sm font-semibold tabular-nums transition-colors", sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-border-strong")}
                          >
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                    {horariosBarbero.length === 0 && (
                      <p className="mt-3 text-sm font-medium text-red-500">No hay horarios disponibles para esta fecha</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Paso 3 — Datos + resumen */}
            {paso === 3 && (
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Confirma tu reserva</h2>
                <p className="mt-1 text-sm text-muted-foreground">Completa tus datos y revisa el detalle</p>
                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
                      <Input id="nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Tu nombre" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono <span className="text-red-500">*</span></Label>
                      <div className="flex overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                        <span className="select-none border-r border-input bg-muted px-3 py-2 text-sm text-muted-foreground">+56</span>
                        <input
                          id="telefono" type="tel" inputMode="numeric"
                          value={clienteTelefono.replace(/^\+56/, "")}
                          onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 9); setClienteTelefono(d ? "+56" + d : ""); }}
                          placeholder="9 1234 5678"
                          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input id="email" type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="tu@email.com" />
                      <p className="text-xs text-muted-foreground">Te enviaremos la confirmación y los recordatorios de tu cita.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumen</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Servicio</span><span className="text-right font-semibold">{servicioSeleccionado?.nombre || "—"}</span></div>
                      {adicionalesSeleccionados.length > 0 && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Adicionales</span><span className="text-right font-semibold">{adicionalesSeleccionados.map((id) => adicionales.find((a) => a.id === id)?.nombre).filter(Boolean).join(", ")}</span></div>
                      )}
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Profesional</span><span className="text-right font-semibold">{barberoSeleccionado === CUALQUIERA ? "Cualquiera (por disponibilidad)" : barberos.find((b) => b.id === barberoSeleccionado)?.nombre || "—"}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Fecha</span><span className="text-right font-semibold tabular-nums">{fechaSeleccionada || "—"}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Hora</span><span className="text-right font-semibold tabular-nums">{horaSeleccionada || "—"}</span></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t-2 border-border pt-4">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-extrabold tabular-nums text-primary">{fmtPrecio(calcularPrecioTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 4 — Listo */}
            {paso === 4 && (
              <div className="mx-auto max-w-md py-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-600">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">¡Reserva confirmada!</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Te enviamos los detalles a tu email</p>
                </div>
                <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                  {barberoSeleccionado === CUALQUIERA && barberoAsignado && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm">Te asignamos a {barberoAsignado.nombre} por disponibilidad</p>
                    </div>
                  )}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Profesional</span><span className="font-semibold">{barberoAsignado?.nombre || "Asignado"}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Servicio</span><span className="font-semibold">{servicioSeleccionado?.nombre}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Fecha</span><span className="font-semibold tabular-nums">{fechaSeleccionada}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Hora</span><span className="font-semibold tabular-nums">{horaSeleccionada}</span></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t-2 border-border pt-4">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-extrabold tabular-nums text-primary">{fmtPrecio(calcularPrecioTotal())}</span>
                  </div>
                </div>
                <Button className="mt-6 w-full" onClick={() => window.location.reload()}>Hacer otra reserva</Button>
              </div>
            )}
          </div>

          {/* Barra de resumen sticky */}
          {paso < 4 && (
            <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-border bg-background/90 px-6 py-3.5 backdrop-blur sm:px-8">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumen</div>
                <div className="truncate text-sm font-semibold">
                  {servicioSeleccionado
                    ? `${servicioSeleccionado.nombre}${adicionalesSeleccionados.length ? " + " + adicionalesSeleccionados.length + " adicional" + (adicionalesSeleccionados.length > 1 ? "es" : "") : ""}`
                    : "Selecciona un servicio"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {paso > 0 && (
                  <Button variant="outline" onClick={irAlAnterior}>
                    <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Atrás</span>
                  </Button>
                )}
                <Button onClick={irAlSiguiente} disabled={cargando || (paso === 0 && !servicioSeleccionado)}>
                  {paso === 3 ? (cargando ? "Confirmando..." : "Confirmar reserva") : (
                    <>
                      <span>Continuar · <span className="tabular-nums">{fmtPrecio(calcularPrecioTotal())}</span></span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
