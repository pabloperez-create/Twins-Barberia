import React, { useState, useEffect } from "react";
import {
  Calendar,
  Phone,
  Mail,
  X,
  Edit,
  Check,
  AlertCircle,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { SelectorHora } from "../components/SelectorHora";

export function TabMisReservas({ supabase, barbero, barberia }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("proximas");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Modal Reagendar
  const [modalReagendar, setModalReagendar] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [procesando, setProcesando] = useState(false);

  // Modal Cancelar
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  useEffect(() => {
    cargarReservas();
  }, [filtro]);

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("reservas")
        .select("*, servicio:servicio_id(nombre, precio)")
        .eq("barbero_id", barbero.id); // ⭐ SOLO las reservas de ESTE barbero

      if (filtro === "hoy") {
        query = query.eq("fecha", hoy);
      } else if (filtro === "proximas") {
        query = query.gte("fecha", hoy);
      }

      query = query
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const { data, error } = await query;
      if (!error) setReservas(data || []);
    } catch (err) {
      console.error("Error cargando reservas:", err);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  // ========== REAGENDAR ==========
  const abrirReagendar = (reserva) => {
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
      // Verificar que el nuevo horario no choque con otra reserva del barbero
      const { data: existentes } = await supabase
        .from("reservas")
        .select("id, hora_inicio, duracion_minutos")
        .eq("barbero_id", barbero.id)
        .eq("fecha", nuevaFecha)
        .eq("estado", "confirmada")
        .neq("id", modalReagendar.id);

      const horaTest = new Date(`2000-01-01 ${nuevaHora}`);
      const duracionTotal = modalReagendar.duracion_minutos;

      const choca = (existentes || []).some((r) => {
        const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
        const horaResEnd = new Date(
          horaRes.getTime() + r.duracion_minutos * 60000,
        );
        return (
          horaTest < horaResEnd &&
          new Date(horaTest.getTime() + duracionTotal * 60000) > horaRes
        );
      });

      if (choca) {
        mostrarMensaje("error", "Ese horario choca con otra reserva tuya");
        setProcesando(false);
        return;
      }

      // Actualizar
      const { error } = await supabase
        .from("reservas")
        .update({
          fecha: nuevaFecha,
          hora_inicio: nuevaHora,
        })
        .eq("id", modalReagendar.id);

      if (error) throw error;

      mostrarMensaje("success", "✅ Reserva reagendada");
      setModalReagendar(null);
      cargarReservas();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setProcesando(false);
  };

  // ========== CANCELAR ==========
  const abrirCancelar = (reserva) => {
    setModalCancelar(reserva);
    setMotivoCancelacion("");
  };

  const confirmarCancelar = async () => {
    setProcesando(true);
    try {
      // 1. Cancelar en BD
      const { error } = await supabase
        .from("reservas")
        .update({
          estado: "cancelada",
          motivo_cancelacion: motivoCancelacion.trim() || null,
        })
        .eq("id", modalCancelar.id);

      if (error) throw error;

      // 2. Mandar email al cliente (si tiene email)
      if (modalCancelar.cliente_email) {
        try {
          await fetch("/api/send-cancellation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteEmail: modalCancelar.cliente_email,
              clienteNombre: modalCancelar.cliente_nombre,
              barberiaId: barbero.barberia_id,
              barberiaNombre: barberia?.nombre || "Tu Barbería",
              barberoNombre: barbero.nombre,
              servicioNombre: modalCancelar.servicio?.nombre || "tu servicio",
              fecha: modalCancelar.fecha,
              hora: modalCancelar.hora_inicio,
              motivo: motivoCancelacion.trim() || null,
              whatsappBarberia:
                barberia?.configuracion?.whatsapp || "56000000000",
            }),
          });
        } catch (emailErr) {
          console.error("Error enviando email:", emailErr);
          // No bloqueamos, la cancelación ya está hecha
        }
      }

      mostrarMensaje(
        "success",
        modalCancelar.cliente_email
          ? "✅ Reserva cancelada y cliente notificado por email"
          : "✅ Reserva cancelada",
      );
      setModalCancelar(null);
      cargarReservas();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setProcesando(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Mis Reservas</h2>
        <div className="flex gap-2">
          {[
            { id: "hoy", label: "Hoy" },
            { id: "proximas", label: "Próximas" },
            { id: "todas", label: "Todas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded text-sm font-semibold transition ${
                filtro === f.id
                  ? "bg-amber-200 text-stone-950"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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

      {cargando ? (
        <p className="text-stone-400">Cargando tus reservas...</p>
      ) : (
        <div className="bg-stone-900 rounded border border-stone-700 p-4">
          <p className="text-stone-400 mb-4 text-sm">
            Total:{" "}
            <span className="text-white font-semibold">{reservas.length}</span>{" "}
            reservas
          </p>

          {reservas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto mb-3 text-stone-600" />
              <p className="text-stone-400">
                No tienes reservas en este filtro
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((r) => (
                <div
                  key={r.id}
                  className={`bg-stone-800 p-4 rounded ${
                    r.estado === "cancelada" ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">
                          {r.cliente_nombre}
                        </p>
                        {r.estado === "cancelada" && (
                          <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">
                            Cancelada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-400 mb-2">
                        📅 {r.fecha} · ⏰ {r.hora_inicio}
                      </p>
                      <p className="text-sm text-stone-400 mb-2">
                        ✂️ {r.servicio?.nombre} · {r.duracion_minutos} min
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                        {r.cliente_telefono && (
                          <a
                            href={`https://wa.me/${r.cliente_telefono}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-amber-200"
                          >
                            <Phone size={12} />+{r.cliente_telefono}
                          </a>
                        )}
                        {r.cliente_email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {r.cliente_email}
                          </span>
                        )}
                      </div>
                      {r.motivo_cancelacion && (
                        <p className="text-xs text-red-300 mt-2">
                          Motivo cancelación: {r.motivo_cancelacion}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-amber-200 font-bold text-xl">
                        ${r.precio_final?.toLocaleString("es-CL")}
                      </p>
                      {r.estado === "confirmada" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirReagendar(r)}
                            className="flex items-center gap-1 text-xs bg-stone-700 hover:bg-stone-600 px-3 py-1.5 rounded"
                            title="Reagendar"
                          >
                            <Edit size={12} />
                            Reagendar
                          </button>
                          <button
                            onClick={() => abrirCancelar(r)}
                            className="flex items-center gap-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded"
                            title="Cancelar"
                          >
                            <X size={12} />
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL REAGENDAR */}
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
              <p className="text-stone-400 mb-1">Cliente:</p>
              <p className="font-semibold">{modalReagendar.cliente_nombre}</p>
              <p className="text-stone-400 mt-2 mb-1">Servicio:</p>
              <p className="font-semibold">{modalReagendar.servicio?.nombre}</p>
              <p className="text-stone-400 mt-2 mb-1">Original:</p>
              <p className="font-semibold">
                {modalReagendar.fecha} a las {modalReagendar.hora_inicio}
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
              <SelectorHora value={nuevaHora || "09:00"} onChange={(v) => setNuevaHora(v)} className="w-full" />
            </div>

            {modalReagendar?.cliente_email && (
              <p className="text-amber-200 text-xs flex items-center gap-2">
                📧 Se enviará un email automático al cliente avisándole
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL CANCELAR */}
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
              <p className="text-stone-400 mb-1">Cliente:</p>
              <p className="font-semibold">{modalCancelar.cliente_nombre}</p>
              <p className="text-stone-400 mt-2 mb-1">Reserva:</p>
              <p className="font-semibold">
                {modalCancelar.fecha} a las {modalCancelar.hora_inicio} ·{" "}
                {modalCancelar.servicio?.nombre}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Imprevisto familiar, equipo fuera de servicio..."
                rows={3}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white resize-none"
              />
            </div>

            {modalCancelar.cliente_email && (
              <p className="text-amber-200 text-xs flex items-center gap-2">
                📧 Se enviará un email automático al cliente avisándole
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
