import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import {
  Plus,
  Phone,
  Mail,
  X,
  Edit,
  Check,
  AlertCircle,
  Clock,
  User,
  Scissors,
  DollarSign,
} from "lucide-react";
import { Modal } from "../components/Modal";

// Paleta de colores para asignar a barberos automáticamente
const COLORES_BARBEROS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function TabAgenda({ supabase, barberiaId }) {
  const calendarRef = useRef(null);
  const [vista, setVista] = useState("dayGridMonth");
  const [reservas, setReservas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [modalDetalles, setModalDetalles] = useState(null);
  const [modalReagendar, setModalReagendar] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: brbs } = await supabase
        .from("barberos")
        .select("*")
        .eq("barberia_id", barberiaId)
        .order("nombre");

      const { data: rsvs } = await supabase
        .from("reservas")
        .select(
          "*, barbero:barbero_id(nombre), servicio:servicio_id(nombre, precio)",
        )
        .eq("barberia_id", barberiaId)
        .order("fecha", { ascending: true });

      const hoy = new Date().toISOString().split("T")[0];
      const { data: blqs } = await supabase
        .from("bloqueos_horarios")
        .select("*, barbero:barbero_id(nombre)")
        .eq("barberia_id", barberiaId)
        .gte("fecha_fin", hoy);

      setBarberos(brbs || []);
      setReservas(rsvs || []);
      setBloqueos(blqs || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
    setCargando(false);
  };

  const getColorBarbero = (barberoId) => {
    const index = barberos.findIndex((b) => b.id === barberoId);
    return COLORES_BARBEROS[index % COLORES_BARBEROS.length] || "#10b981";
  };

  // Eventos para FullCalendar - todos como BLOQUES de color
  const eventosCalendario = [
    ...reservas.map((r) => {
      const color = getColorBarbero(r.barbero_id);
      const fechaHoraInicio = `${r.fecha}T${r.hora_inicio}`;
      const fechaInicio = new Date(`${r.fecha}T${r.hora_inicio}`);
      const fechaFin = new Date(
        fechaInicio.getTime() + (r.duracion_minutos || 30) * 60000,
      );

      const esCancelada = r.estado === "cancelada";

      return {
        id: r.id,
        title: r.cliente_nombre,
        start: fechaHoraInicio,
        end: fechaFin.toISOString(),
        backgroundColor: esCancelada ? "#44403c" : color,
        borderColor: esCancelada ? "#44403c" : color,
        textColor: "#ffffff",
        display: "block", // ⭐ FUERZA modo bloque en TODAS las vistas (incluido mes)
        classNames: esCancelada ? ["reserva-cancelada"] : ["reserva"],
        extendedProps: {
          tipo: "reserva",
          reserva: r,
        },
      };
    }),
    ...bloqueos.flatMap((b) => {
      const eventos = [];
      const inicio = new Date(b.fecha_inicio);
      const fin = new Date(b.fecha_fin);

      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split("T")[0];
        const titulo = b.barbero ? `🚫 ${b.barbero.nombre}` : `🏪 Cerrado`;
        const subtitulo = b.motivo ? ` - ${b.motivo}` : "";

        if (b.hora_inicio && b.hora_fin) {
          eventos.push({
            id: `bloqueo-${b.id}-${fechaStr}`,
            title: titulo + subtitulo,
            start: `${fechaStr}T${b.hora_inicio}`,
            end: `${fechaStr}T${b.hora_fin}`,
            backgroundColor: "#7f1d1d",
            borderColor: "#dc2626",
            textColor: "#fecaca",
            display: "block",
            classNames: ["bloqueo"],
            extendedProps: { tipo: "bloqueo", bloqueo: b },
          });
        } else {
          eventos.push({
            id: `bloqueo-${b.id}-${fechaStr}`,
            title: titulo + subtitulo,
            start: fechaStr,
            allDay: true,
            backgroundColor: "#7f1d1d",
            borderColor: "#dc2626",
            textColor: "#fecaca",
            display: "block",
            classNames: ["bloqueo"],
            extendedProps: { tipo: "bloqueo", bloqueo: b },
          });
        }
      }
      return eventos;
    }),
  ];

  const handleEventClick = (info) => {
    const props = info.event.extendedProps;
    if (props.tipo === "reserva") {
      setModalDetalles(props.reserva);
    } else if (props.tipo === "bloqueo") {
      const b = props.bloqueo;
      const texto = b.barbero?.nombre
        ? `Bloqueo de ${b.barbero.nombre}: ${b.motivo || "Sin motivo"}`
        : `Barbería cerrada: ${b.motivo || "Sin motivo"}`;
      alert(texto);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(nuevaVista);
    }
  };

  const abrirReagendar = (reserva) => {
    setModalDetalles(null);
    setModalReagendar(reserva);
    setNuevaFecha(reserva.fecha);
    setNuevaHora(reserva.hora_inicio);
  };

  const confirmarReagendar = async () => {
    if (!nuevaFecha || !nuevaHora) {
      mostrarMensaje("error", "Completa fecha y hora");
      return;
    }

    setProcesando(true);
    try {
      const { error } = await supabase
        .from("reservas")
        .update({ fecha: nuevaFecha, hora_inicio: nuevaHora })
        .eq("id", modalReagendar.id);

      if (error) throw error;

      mostrarMensaje("success", "✅ Reserva reagendada");
      setModalReagendar(null);
      cargarDatos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
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
      const { error } = await supabase
        .from("reservas")
        .update({
          estado: "cancelada",
          motivo_cancelacion: motivoCancelacion.trim() || null,
        })
        .eq("id", modalCancelar.id);

      if (error) throw error;

      const { data: barberia } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", barberiaId)
        .single();

      if (modalCancelar.cliente_email) {
        try {
          await fetch("/api/send-cancellation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteEmail: modalCancelar.cliente_email,
              clienteNombre: modalCancelar.cliente_nombre,
              barberiaId: barberiaId,
              barberiaNombre: barberia?.nombre || "Tu Barbería",
              barberoNombre: modalCancelar.barbero?.nombre || "el profesional",
              servicioNombre: modalCancelar.servicio?.nombre || "tu servicio",
              fecha: modalCancelar.fecha,
              hora: modalCancelar.hora_inicio,
              motivo: motivoCancelacion.trim() || null,
              whatsappBarberia: barberia?.configuracion?.whatsapp || "",
            }),
          });
        } catch (e) {
          console.error("Error email cancelación:", e);
        }
      }

      mostrarMensaje(
        "success",
        modalCancelar.cliente_email
          ? "✅ Reserva cancelada y cliente notificado por email"
          : "✅ Reserva cancelada",
      );
      setModalCancelar(null);
      cargarDatos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setProcesando(false);
  };

  return (
    <div>
      <style>{`
        .fc {
          background-color: #1c1917;
          color: #e7e5e4;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #44403c;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #44403c;
        }
        .fc-col-header-cell {
          background-color: #292524;
          color: #a8a29e;
          font-weight: 600;
          padding: 10px 0;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
        }
        .fc-daygrid-day-number {
          color: #a8a29e;
          padding: 8px;
        }
        .fc-day-today {
          background-color: rgba(253, 230, 138, 0.08) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          color: #fde68a;
          font-weight: 700;
        }
        .fc-timegrid-slot-label {
          color: #78716c;
          font-size: 11px;
        }
        .fc-timegrid-axis {
          background-color: #1c1917;
        }
        
        /* ⭐ EVENTOS COMO BLOQUES DE COLOR (clave del fix) */
        .fc-event {
          border: none !important;
          padding: 3px 6px !important;
          font-size: 11px !important;
          cursor: pointer;
          border-radius: 4px !important;
          margin-bottom: 2px !important;
          font-weight: 600;
        }
        .fc-event:hover {
          opacity: 0.85;
          transform: scale(1.02);
          transition: transform 0.1s;
        }
        
        /* Forzar texto blanco en bloques */
        .fc-event-title, .fc-event-time {
          color: white !important;
        }
        
        /* Reservas canceladas */
        .reserva-cancelada {
          text-decoration: line-through;
          opacity: 0.4 !important;
        }
        
        /* Bloqueos en cursiva */
        .bloqueo .fc-event-title {
          font-style: italic;
        }
        
        /* Título del calendario */
        .fc-toolbar-title {
          color: #fde68a !important;
        }
        
        /* Botones del toolbar */
        .fc-button {
          background-color: #44403c !important;
          border: 1px solid #57534e !important;
          color: #e7e5e4 !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
        }
        .fc-button:hover {
          background-color: #57534e !important;
        }
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #fde68a !important;
          color: #1c1917 !important;
          border-color: #fde68a !important;
        }
        
        /* "+X más" link */
        .fc-more-link {
          color: #a8a29e !important;
          font-weight: 600;
          font-size: 11px;
        }
        .fc-more-link:hover {
          color: #fde68a !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Agenda</h2>
          <div className="flex gap-1 bg-stone-900 border border-stone-700 rounded p-1">
            <button
              onClick={() => cambiarVista("dayGridMonth")}
              className={`px-3 py-1 rounded text-sm font-semibold transition ${
                vista === "dayGridMonth"
                  ? "bg-amber-200 text-stone-950"
                  : "text-stone-300 hover:bg-stone-800"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => cambiarVista("timeGridWeek")}
              className={`px-3 py-1 rounded text-sm font-semibold transition ${
                vista === "timeGridWeek"
                  ? "bg-amber-200 text-stone-950"
                  : "text-stone-300 hover:bg-stone-800"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => cambiarVista("timeGridDay")}
              className={`px-3 py-1 rounded text-sm font-semibold transition ${
                vista === "timeGridDay"
                  ? "bg-amber-200 text-stone-950"
                  : "text-stone-300 hover:bg-stone-800"
              }`}
            >
              Día
            </button>
          </div>
        </div>

        <button
          disabled
          title="Próximamente: agregar citas manuales"
          className="flex items-center gap-2 bg-stone-700 text-stone-400 font-bold px-4 py-2 rounded cursor-not-allowed opacity-60"
        >
          <Plus size={18} />
          Nueva cita
        </button>
      </div>

      {/* Leyenda */}
      {barberos.length > 0 && (
        <div className="bg-stone-900 border border-stone-700 rounded p-3 mb-4 flex flex-wrap gap-3 items-center">
          <span className="text-xs text-stone-400 font-semibold">
            Barberos:
          </span>
          {barberos.map((b, i) => (
            <div key={b.id} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor:
                    COLORES_BARBEROS[i % COLORES_BARBEROS.length],
                }}
              />
              <span className="text-stone-300">{b.nombre}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs ml-2 pl-2 border-l border-stone-700">
            <div className="w-3 h-3 rounded-sm bg-red-900 border border-red-600" />
            <span className="text-stone-300">Bloqueos</span>
          </div>
        </div>
      )}

      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-4 flex items-center gap-3 ${
            mensaje.tipo === "success"
              ? "bg-green-900 border border-green-700 text-green-200"
              : "bg-red-900 border border-red-700 text-red-200"
          }`}
        >
          {mensaje.tipo === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {/* Calendario */}
      <div className="bg-stone-900 border border-stone-700 rounded p-4">
        {cargando ? (
          <p className="text-stone-400 text-center py-12">
            Cargando calendario...
          </p>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={vista}
            locale={esLocale}
            events={eventosCalendario}
            eventClick={handleEventClick}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            buttonText={{ today: "Hoy" }}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            allDayText="Día"
            nowIndicator={true}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            displayEventTime={true}
            dayMaxEvents={3}
            moreLinkText={(num) => `+${num} más`}
            firstDay={1}
            weekends={true}
            eventDisplay="block"
          />
        )}
      </div>

      {/* Modal DETALLES */}
      <Modal
        isOpen={!!modalDetalles}
        onClose={() => setModalDetalles(null)}
        title="Detalles de la reserva"
        footer={
          modalDetalles && modalDetalles.estado === "confirmada" ? (
            <>
              <button
                onClick={() => abrirCancelar(modalDetalles)}
                className="flex items-center gap-1 px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded text-sm font-semibold"
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                onClick={() => abrirReagendar(modalDetalles)}
                className="flex items-center gap-1 px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm"
              >
                <Edit size={14} />
                Reagendar
              </button>
            </>
          ) : (
            <button
              onClick={() => setModalDetalles(null)}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
            >
              Cerrar
            </button>
          )
        }
      >
        {modalDetalles && (
          <div className="space-y-3">
            {modalDetalles.estado === "cancelada" && (
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-2 text-xs text-red-200">
                ⚠️ Esta reserva fue cancelada
                {modalDetalles.motivo_cancelacion &&
                  ` - Motivo: ${modalDetalles.motivo_cancelacion}`}
              </div>
            )}

            <div className="bg-stone-800 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-amber-200" />
                <p className="font-bold text-lg">
                  {modalDetalles.cliente_nombre}
                </p>
              </div>
              <div className="space-y-1.5 text-sm text-stone-300">
                {modalDetalles.cliente_telefono && (
                  <a
                    href={`https://wa.me/${modalDetalles.cliente_telefono}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 hover:text-amber-200"
                  >
                    <Phone size={14} />+{modalDetalles.cliente_telefono}
                  </a>
                )}
                {modalDetalles.cliente_email && (
                  <p className="flex items-center gap-2">
                    <Mail size={14} />
                    {modalDetalles.cliente_email}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-stone-800 rounded p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-200" />
                <span className="text-stone-400">Fecha:</span>
                <span className="font-semibold">
                  {modalDetalles.fecha} ·{" "}
                  {modalDetalles.hora_inicio?.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Scissors size={14} className="text-amber-200" />
                <span className="text-stone-400">Servicio:</span>
                <span className="font-semibold">
                  {modalDetalles.servicio?.nombre} (
                  {modalDetalles.duracion_minutos} min)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="text-amber-200" />
                <span className="text-stone-400">Barbero:</span>
                <span className="font-semibold">
                  {modalDetalles.barbero?.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-amber-200" />
                <span className="text-stone-400">Precio:</span>
                <span className="font-bold text-amber-200 text-lg">
                  ${modalDetalles.precio_final?.toLocaleString("es-CL")}
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-500 text-center">
              ID: {modalDetalles.id}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal REAGENDAR */}
      <Modal
        isOpen={!!modalReagendar}
        onClose={() => setModalReagendar(null)}
        title="Reagendar reserva"
        footer={
          <>
            <button
              onClick={() => setModalReagendar(null)}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarReagendar}
              disabled={procesando}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
            >
              {procesando ? "Guardando..." : "Reagendar"}
            </button>
          </>
        }
      >
        {modalReagendar && (
          <div className="space-y-4">
            <div className="bg-stone-800 p-3 rounded text-sm">
              <p className="text-stone-400 mb-1">Reserva original:</p>
              <p className="font-semibold">
                {modalReagendar.cliente_nombre} · {modalReagendar.fecha}{" "}
                {modalReagendar.hora_inicio?.slice(0, 5)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Nueva fecha
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Nueva hora
              </label>
              <input
                type="time"
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal CANCELAR */}
      <Modal
        isOpen={!!modalCancelar}
        onClose={() => setModalCancelar(null)}
        title="Cancelar reserva"
        footer={
          <>
            <button
              onClick={() => setModalCancelar(null)}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
            >
              No cancelar
            </button>
            <button
              onClick={confirmarCancelar}
              disabled={procesando}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded text-sm disabled:opacity-50"
            >
              {procesando ? "Cancelando..." : "Sí, cancelar"}
            </button>
          </>
        }
      >
        {modalCancelar && (
          <div className="space-y-4">
            <div className="bg-stone-800 p-3 rounded text-sm">
              <p className="font-semibold">{modalCancelar.cliente_nombre}</p>
              <p className="text-stone-400">
                {modalCancelar.fecha} · {modalCancelar.hora_inicio?.slice(0, 5)}{" "}
                · {modalCancelar.servicio?.nombre}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Cliente lo solicitó, imprevisto..."
                rows={3}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white resize-none"
              />
            </div>
            {modalCancelar.cliente_email && (
              <p className="text-amber-200 text-xs flex items-center gap-2">
                📧 Se enviará un email al cliente
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
