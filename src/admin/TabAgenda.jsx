import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import {
  Plus, Phone, Mail, X, Edit, Check, AlertCircle, Clock, User, Scissors, DollarSign,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { ModalNuevaCita } from "../components/ModalNuevaCita";
import { SelectorHora } from "../components/SelectorHora";
import { hoyChile } from "../utils/fecha";

const COLORES_BARBEROS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16",
];

export function TabAgenda({ supabase, barberiaId, usuario, barberia, tema: t, barberoFijo = null }) {
  // Cuando viene barberoFijo, la agenda se scopea a ese barbero (vista de barbero).
  const esVistaBarbero = !!barberoFijo;
  const calendarRef = useRef(null);
  const [esMobil, setEsMobil] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [vista, setVista] = useState(typeof window !== "undefined" && window.innerWidth < 768 ? "timeGridDay" : "dayGridMonth");

  useEffect(() => {
    const handleResize = () => setEsMobil(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [reservas, setReservas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [filtroBarbero, setFiltroBarbero] = useState("todos");

  const [modalDetalles, setModalDetalles] = useState(null);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [modalReagendar, setModalReagendar] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  // En móvil el calendario suele montar antes de que el contenedor tenga su ancho
  // final; cuando los eventos llegan (async) FullCalendar puede dejar algunos SIN
  // pintar aunque los datos estén correctos (síntoma: reservas que existen y bloquean
  // la hora, pero no se ven en la agenda). Forzar un recálculo de tamaño cuando
  // terminan de cargar los datos vuelve a pintar todos los eventos.
  useEffect(() => {
    if (cargando || !calendarRef.current) return;
    const api = calendarRef.current.getApi();
    const t = setTimeout(() => api.updateSize(), 60);
    return () => clearTimeout(t);
  }, [cargando, reservas, bloqueos, vista]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: brbs } = await supabase.from("barberos").select("*").eq("barberia_id", barberiaId).order("nombre");
      let rsvQuery = supabase.from("reservas").select("*, barbero:barbero_id(nombre), servicio:servicio_id(nombre, precio)").eq("barberia_id", barberiaId);
      if (barberoFijo) rsvQuery = rsvQuery.eq("barbero_id", barberoFijo);
      const { data: rsvs } = await rsvQuery.order("fecha", { ascending: true });
      const hoy = hoyChile();
      const { data: blqs } = await supabase.from("bloqueos_horarios").select("*, barbero:barbero_id(nombre)").eq("barberia_id", barberiaId).gte("fecha_fin", hoy);
      setBarberos(brbs || []);
      setReservas(rsvs || []);
      setBloqueos(blqs || []);
    } catch (err) { console.error("Error cargando datos:", err); }
    setCargando(false);
  };

  const getColorBarbero = (barberoId) => {
    const index = barberos.findIndex((b) => b.id === barberoId);
    return COLORES_BARBEROS[index % COLORES_BARBEROS.length] || "#10b981";
  };

  const reservasFiltradas = reservas.filter((r) =>
    filtroBarbero === "todos" ? true : r.barbero_id === filtroBarbero
  );

  // Formatea un Date a string local naive "YYYY-MM-DDTHH:mm:ss" (sin zona horaria).
  // Clave: start y end DEBEN estar en el mismo marco temporal. Antes el end usaba
  // .toISOString() (UTC) mientras el start era naive-local → si el dispositivo del
  // barbero tenía otra TZ, el evento quedaba con duración cero/negativa y FullCalendar
  // lo descartaba (no se pintaba aunque la reserva existía y bloqueaba la hora).
  const fmtLocal = (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const eventosCalendario = [
    ...reservasFiltradas.map((r) => {
      const color = getColorBarbero(r.barbero_id);
      const fechaHoraInicio = `${r.fecha}T${r.hora_inicio}`;
      const fechaInicio = new Date(`${r.fecha}T${r.hora_inicio}`);
      const fechaFin = new Date(fechaInicio.getTime() + (r.duracion_minutos || 30) * 60000);
      const esCancelada = r.estado === "cancelada";
      return {
        id: r.id,
        title: r.cliente_nombre,
        start: fechaHoraInicio,
        end: fmtLocal(fechaFin),
        backgroundColor: esCancelada ? "#44403c" : color,
        borderColor: esCancelada ? "#44403c" : color,
        textColor: "#ffffff",
        display: "block",
        classNames: esCancelada ? ["reserva-cancelada"] : ["reserva"],
        extendedProps: { tipo: "reserva", reserva: r },
      };
    }),
    ...bloqueos.filter((b) => !esVistaBarbero || b.barbero_id === barberoFijo || b.barbero_id === null).flatMap((b) => {
      const eventos = [];
      const inicio = new Date(b.fecha_inicio);
      const finReal = new Date(b.fecha_fin);
      // Los bloqueos recurrentes usan fecha_fin lejana (ej. 2099). Topamos la pintura
      // a ~120 días desde hoy para no generar decenas de miles de eventos.
      const tope = new Date(); tope.setHours(0, 0, 0, 0); tope.setDate(tope.getDate() + 120);
      const fin = finReal < tope ? finReal : tope;
      const recurrente = Array.isArray(b.dias_semana) && b.dias_semana.length > 0;
      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split("T")[0];
        // Recurrente: solo pintar los días de la semana elegidos (Dom=0..Sáb=6).
        if (recurrente && !b.dias_semana.includes(new Date(fechaStr + "T12:00:00").getDay())) continue;
        const titulo = b.barbero ? `🚫 ${b.barbero.nombre}` : `🏪 Cerrado`;
        const subtitulo = b.motivo ? ` - ${b.motivo}` : "";
        if (b.hora_inicio && b.hora_fin) {
          eventos.push({ id: `bloqueo-${b.id}-${fechaStr}`, title: titulo + subtitulo, start: `${fechaStr}T${b.hora_inicio}`, end: `${fechaStr}T${b.hora_fin}`, backgroundColor: "#7f1d1d", borderColor: "#dc2626", textColor: "#fecaca", display: "block", classNames: ["bloqueo"], extendedProps: { tipo: "bloqueo", bloqueo: b } });
        } else {
          eventos.push({ id: `bloqueo-${b.id}-${fechaStr}`, title: titulo + subtitulo, start: fechaStr, allDay: true, backgroundColor: "#7f1d1d", borderColor: "#dc2626", textColor: "#fecaca", display: "block", classNames: ["bloqueo"], extendedProps: { tipo: "bloqueo", bloqueo: b } });
        }
      }
      return eventos;
    }),
  ];

  const handleEventClick = (info) => {
    const props = info.event.extendedProps;
    if (props.tipo === "reserva") setModalDetalles(props.reserva);
    else if (props.tipo === "bloqueo") {
      const b = props.bloqueo;
      alert(b.barbero?.nombre ? `Bloqueo de ${b.barbero.nombre}: ${b.motivo || "Sin motivo"}` : `Barbería cerrada: ${b.motivo || "Sin motivo"}`);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    if (calendarRef.current) calendarRef.current.getApi().changeView(nuevaVista);
  };

  const abrirReagendar = (reserva) => {
    setModalDetalles(null);
    setModalReagendar(reserva);
    setNuevaFecha(reserva.fecha);
    setNuevaHora(reserva.hora_inicio);
  };

  const confirmarReagendar = async () => {
    if (!nuevaFecha || !nuevaHora) { mostrarMensaje("error", "Completa fecha y hora"); return; }
    setProcesando(true);
    try {
      const { error } = await supabase.from("reservas").update({ fecha: nuevaFecha, hora_inicio: nuevaHora }).eq("id", modalReagendar.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Reserva reagendada");
      setModalReagendar(null);
      cargarDatos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  const abrirCancelar = (reserva) => {
    setModalDetalles(null);
    setModalCancelar(reserva);
    setMotivoCancelacion("");
  };

  const confirmarCancelar = async () => {
    setProcesando(true);
    try {
      const { error } = await supabase.from("reservas").update({ estado: "cancelada", motivo_cancelacion: motivoCancelacion.trim() || null }).eq("id", modalCancelar.id);
      if (error) throw error;
      if (modalCancelar.cliente_email) {
        try {
          await fetch("/api/send-cancellation-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barberiaId, clienteEmail: modalCancelar.cliente_email, clienteNombre: modalCancelar.cliente_nombre, barberiaNombre: barberia?.nombre || "Tu Barbería", barberoNombre: modalCancelar.barbero?.nombre || "el profesional", servicioNombre: modalCancelar.servicio?.nombre || "tu servicio", fecha: modalCancelar.fecha, hora: modalCancelar.hora_inicio, motivo: motivoCancelacion.trim() || null, whatsappBarberia: barberia?.configuracion?.whatsapp || "" }) });
        } catch (e) { console.error("Error email cancelación:", e); }
      }
      mostrarMensaje("success", modalCancelar.cliente_email ? "✅ Reserva cancelada y cliente notificado por email" : "✅ Reserva cancelada");
      setModalCancelar(null);
      cargarDatos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  // Label dinámico según tipo
  const labelProfesional = t.tipo === "salon" ? "Estilista" : "Barbero";

  return (
    <div>
      <style>{t.calendarCSS}</style>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{esVistaBarbero ? "Mi Agenda" : "Agenda"}</h2>
          <div className={`flex gap-1 ${t.bgCard} border ${t.border} rounded p-1`}>
            {!esMobil && (
              <button onClick={() => cambiarVista("dayGridMonth")} className={`px-3 py-1 rounded text-sm font-semibold transition ${vista === "dayGridMonth" ? `${t.acentoBg} ${t.acentoText}` : `${t.textoSub} ${t.bgHover}`}`}>Mes</button>
            )}
            <button onClick={() => cambiarVista("timeGridWeek")} className={`px-3 py-1 rounded text-sm font-semibold transition ${vista === "timeGridWeek" ? `${t.acentoBg} ${t.acentoText}` : `${t.textoSub} ${t.bgHover}`}`}>Semana</button>
            <button onClick={() => cambiarVista("timeGridDay")} className={`px-3 py-1 rounded text-sm font-semibold transition ${vista === "timeGridDay" ? `${t.acentoBg} ${t.acentoText}` : `${t.textoSub} ${t.bgHover}`}`}>Día</button>
          </div>
        </div>
        <button onClick={() => setModalNuevaCita(true)} className={`flex items-center gap-2 ${t.boton} px-4 py-2 rounded`}>
          <Plus size={18} />Nueva cita
        </button>
      </div>

      {!esVistaBarbero && barberos.length > 0 && (
        <div className={`${t.bgCard} border ${t.border} rounded p-3 mb-4 flex flex-wrap gap-2 items-center`}>
          <span className={`text-xs ${t.textoSub} font-semibold mr-1`}>Filtrar:</span>
          <button onClick={() => setFiltroBarbero("todos")} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition ${filtroBarbero === "todos" ? `${t.filtroActivo} border-transparent font-bold` : `border ${t.border} ${t.textoSub} ${t.bgHover}`}`}>Todos</button>
          {barberos.map((b, i) => {
            const color = COLORES_BARBEROS[i % COLORES_BARBEROS.length];
            const activo = filtroBarbero === b.id;
            const reservasDelBarbero = reservas.filter(r => r.barbero_id === b.id && r.estado === "confirmada").length;
            return (
              <button key={b.id} onClick={() => setFiltroBarbero(activo ? "todos" : b.id)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition ${activo ? "text-white font-bold" : `border ${t.border} ${t.textoSub} ${t.bgHover}`}`} style={activo ? { backgroundColor: color, borderColor: color } : {}}>
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                {b.nombre}
                <span className={`ml-0.5 ${activo ? "text-white opacity-80" : t.textoMuted}`}>({reservasDelBarbero})</span>
              </button>
            );
          })}
          <div className={`flex items-center gap-1.5 text-xs ml-2 pl-2 border-l ${t.border}`}>
            <div className="w-2.5 h-2.5 rounded-sm bg-red-900 border border-red-600" />
            <span className={t.textoSub}>Bloqueos</span>
          </div>
          {filtroBarbero !== "todos" && (
            <span className={`text-xs ${t.acento} ml-auto`}>
              Mostrando {reservasFiltradas.filter(r => r.estado === "confirmada").length} reservas de {barberos.find(b => b.id === filtroBarbero)?.nombre}
            </span>
          )}
        </div>
      )}

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      <div className={`${t.bgCard} border ${t.border} rounded p-4`}>
        {cargando ? (
          <p className={`${t.textoSub} text-center py-12`}>Cargando calendario...</p>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={vista}
            locale={esLocale}
            events={eventosCalendario}
            eventClick={handleEventClick}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            buttonText={{ today: "Hoy" }}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            allDayText="Día"
            nowIndicator={true}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            displayEventTime={true}
            dayMaxEvents={3}
            moreLinkText={(num) => `+${num} más`}
            firstDay={1}
            weekends={true}
            eventDisplay="block"
          />
        )}
      </div>

      <ModalNuevaCita isOpen={modalNuevaCita} onClose={() => setModalNuevaCita(false)} onCreated={() => { cargarDatos(); mostrarMensaje("success", "✅ Cita creada exitosamente"); }} supabase={supabase} barberiaId={barberiaId} barberia={barberia} usuario={usuario} barberoFijo={barberoFijo} />

      <Modal isOpen={!!modalDetalles} onClose={() => setModalDetalles(null)} title="Detalles de la reserva"
        footer={
          modalDetalles && modalDetalles.estado === "confirmada" ? (
            <>
              <button onClick={() => abrirCancelar(modalDetalles)} className="flex items-center gap-1 px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded text-sm font-semibold"><X size={14} />Cancelar</button>
              <button onClick={() => abrirReagendar(modalDetalles)} className={`flex items-center gap-1 px-4 py-2 ${t.boton} rounded text-sm`}><Edit size={14} />Reagendar</button>
            </>
          ) : (
            <button onClick={() => setModalDetalles(null)} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cerrar</button>
          )
        }
      >
        {modalDetalles && (
          <div className="space-y-3">
            {modalDetalles.estado === "cancelada" && (
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-2 text-xs text-red-200">
                ⚠️ Esta reserva fue cancelada{modalDetalles.motivo_cancelacion && ` - Motivo: ${modalDetalles.motivo_cancelacion}`}
              </div>
            )}
            {modalDetalles.creada_manualmente && (
              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-2 text-xs text-blue-200">
                ✋ Cita creada manualmente desde admin
              </div>
            )}
            <div className={`${t.bgMuted} rounded p-3`}>
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className={t.acento} />
                <p className="font-bold text-lg">{modalDetalles.cliente_nombre}</p>
              </div>
              <div className={`space-y-1.5 text-sm ${t.textoSub}`}>
                {modalDetalles.cliente_telefono && (
                  <a href={`https://wa.me/${modalDetalles.cliente_telefono}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 hover:${t.acento}`}>
                    <Phone size={14} />+{modalDetalles.cliente_telefono}
                  </a>
                )}
                {modalDetalles.cliente_email && <p className="flex items-center gap-2"><Mail size={14} />{modalDetalles.cliente_email}</p>}
              </div>
            </div>
            <div className={`${t.bgMuted} rounded p-3 space-y-2 text-sm`}>
              <div className="flex items-center gap-2">
                <Clock size={14} className={t.acento} />
                <span className={t.textoSub}>Fecha:</span>
                <span className="font-semibold">{modalDetalles.fecha} · {modalDetalles.hora_inicio?.slice(0, 5)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Scissors size={14} className={t.acento} />
                <span className={t.textoSub}>Servicio:</span>
                <span className="font-semibold">{modalDetalles.servicio?.nombre} ({modalDetalles.duracion_minutos} min)</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className={t.acento} />
                <span className={t.textoSub}>{labelProfesional}:</span>
                <span className="font-semibold">{modalDetalles.barbero?.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className={t.acento} />
                <span className={t.textoSub}>Precio:</span>
                <span className={`font-bold ${t.acento} text-lg`}>${modalDetalles.precio_final?.toLocaleString("es-CL")}</span>
              </div>
            </div>
            <div className={`text-xs ${t.textoMuted} text-center`}>ID: {modalDetalles.id}</div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!modalReagendar} onClose={() => setModalReagendar(null)} title="Reagendar reserva"
        footer={
          <>
            <button onClick={() => setModalReagendar(null)} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cancelar</button>
            <button onClick={confirmarReagendar} disabled={procesando} className={`px-4 py-2 ${t.boton} rounded text-sm disabled:opacity-50`}>{procesando ? "Guardando..." : "Reagendar"}</button>
          </>
        }
      >
        {modalReagendar && (
          <div className="space-y-4">
            <div className={`${t.bgMuted} p-3 rounded text-sm`}>
              <p className={`${t.textoSub} mb-1`}>Reserva original:</p>
              <p className="font-semibold">{modalReagendar.cliente_nombre} · {modalReagendar.fecha} {modalReagendar.hora_inicio?.slice(0, 5)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nueva fecha</label>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} min={hoyChile()} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nueva hora</label>
              <SelectorHora value={nuevaHora || "09:00"} onChange={(v) => setNuevaHora(v)} className="w-full" />
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!modalCancelar} onClose={() => setModalCancelar(null)} title="Cancelar reserva"
        footer={
          <>
            <button onClick={() => setModalCancelar(null)} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>No cancelar</button>
            <button onClick={confirmarCancelar} disabled={procesando} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded text-sm disabled:opacity-50">{procesando ? "Cancelando..." : "Sí, cancelar"}</button>
          </>
        }
      >
        {modalCancelar && (
          <div className="space-y-4">
            <div className={`${t.bgMuted} p-3 rounded text-sm`}>
              <p className="font-semibold">{modalCancelar.cliente_nombre}</p>
              <p className={t.textoSub}>{modalCancelar.fecha} · {modalCancelar.hora_inicio?.slice(0, 5)} · {modalCancelar.servicio?.nombre}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Motivo (opcional)</label>
              <textarea value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)} placeholder="Ej: Cliente lo solicitó, imprevisto..." rows={3} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto} resize-none`} />
            </div>
            {modalCancelar.cliente_email && <p className={`${t.acento} text-xs flex items-center gap-2`}>📧 Se enviará un email al cliente</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
