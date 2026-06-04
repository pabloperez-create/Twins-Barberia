import React, { useState, useEffect } from "react";
import { Calendar, Phone, Mail, X, Edit, Check, AlertCircle, Plus } from "lucide-react";
import { Modal } from "../components/Modal";
import { SelectorHora } from "../components/SelectorHora";
import { ModalNuevaCita } from "../components/ModalNuevaCita";

export function TabMisReservas({ supabase, barbero, barberia, usuario, tema: t }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("proximas");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [modalReagendar, setModalReagendar] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [modalNuevaCita, setModalNuevaCita] = useState(false);

  useEffect(() => { cargarReservas(); }, [filtro]);

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let query = supabase.from("reservas").select("*, servicio:servicio_id(nombre, precio)").eq("barbero_id", barbero.id);
      if (filtro === "hoy") query = query.eq("fecha", hoy);
      else if (filtro === "proximas") query = query.gte("fecha", hoy);
      query = query.order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });
      const { data, error } = await query;
      if (!error) setReservas(data || []);
    } catch (err) { console.error("Error cargando reservas:", err); }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const abrirReagendar = (reserva) => { setModalReagendar(reserva); setNuevaFecha(reserva.fecha); setNuevaHora(reserva.hora_inicio); };

  const confirmarReagendar = async () => {
    if (!nuevaFecha || !nuevaHora) { mostrarMensaje("error", "Completa fecha y hora"); return; }
    setProcesando(true);
    try {
      const { data: existentes } = await supabase.from("reservas").select("id, hora_inicio, duracion_minutos").eq("barbero_id", barbero.id).eq("fecha", nuevaFecha).eq("estado", "confirmada").neq("id", modalReagendar.id);
      const horaTest = new Date(`2000-01-01 ${nuevaHora}`);
      const duracionTotal = modalReagendar.duracion_minutos;
      const choca = (existentes || []).some((r) => {
        const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
        const horaResEnd = new Date(horaRes.getTime() + r.duracion_minutos * 60000);
        return horaTest < horaResEnd && new Date(horaTest.getTime() + duracionTotal * 60000) > horaRes;
      });
      if (choca) { mostrarMensaje("error", "Ese horario choca con otra reserva tuya"); setProcesando(false); return; }
      const { error } = await supabase.from("reservas").update({ fecha: nuevaFecha, hora_inicio: nuevaHora }).eq("id", modalReagendar.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Reserva reagendada");
      setModalReagendar(null);
      cargarReservas();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  const abrirCancelar = (reserva) => { setModalCancelar(reserva); setMotivoCancelacion(""); };

  const marcarAsistencia = async (reserva, valor) => {
    // Toggle: si ya estaba marcado igual, lo desmarca (vuelve a null)
    const nuevo = reserva.asistencia === valor ? null : valor;
    setReservas((prev) => prev.map((x) => (x.id === reserva.id ? { ...x, asistencia: nuevo } : x)));
    const { error } = await supabase.from("reservas").update({ asistencia: nuevo }).eq("id", reserva.id);
    if (error) { mostrarMensaje("error", "No se pudo guardar la asistencia"); cargarReservas(); }
  };

  const confirmarCancelar = async () => {
    setProcesando(true);
    try {
      const { error } = await supabase.from("reservas").update({ estado: "cancelada", motivo_cancelacion: motivoCancelacion.trim() || null }).eq("id", modalCancelar.id);
      if (error) throw error;
      if (modalCancelar.cliente_email) {
        try {
          await fetch("/api/send-cancellation-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clienteEmail: modalCancelar.cliente_email, clienteNombre: modalCancelar.cliente_nombre, barberiaId: barbero.barberia_id, barberiaNombre: barberia?.nombre || "Tu Barbería", barberoNombre: barbero.nombre, servicioNombre: modalCancelar.servicio?.nombre || "tu servicio", fecha: modalCancelar.fecha, hora: modalCancelar.hora_inicio, motivo: motivoCancelacion.trim() || null, whatsappBarberia: barberia?.configuracion?.whatsapp || "56000000000" }) });
        } catch (emailErr) { console.error("Error enviando email:", emailErr); }
      }
      mostrarMensaje("success", modalCancelar.cliente_email ? "✅ Reserva cancelada y cliente notificado por email" : "✅ Reserva cancelada");
      setModalCancelar(null);
      cargarReservas();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Mis Reservas</h2>
          <button onClick={() => setModalNuevaCita(true)} className={`flex items-center gap-2 ${t.boton} px-3 py-2 rounded text-sm`}><Plus size={16} />Nueva cita</button>
        </div>
        <div className="flex gap-2">
          {[{ id: "hoy", label: "Hoy" }, { id: "proximas", label: "Próximas" }, { id: "todas", label: "Todas" }].map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} className={`px-4 py-2 rounded text-sm font-semibold transition ${filtro === f.id ? t.filtroActivo : t.filtroInactivo}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className={t.textoSub}>Cargando tus reservas...</p>
      ) : (
        <div className={`${t.bgCard} rounded border ${t.border} p-4`}>
          <p className={`${t.textoSub} mb-4 text-sm`}>Total: <span className={`${t.texto} font-semibold`}>{reservas.length}</span> reservas</p>
          {reservas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className={`mx-auto mb-3 ${t.textoMuted}`} />
              <p className={t.textoSub}>No tienes reservas en este filtro</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((r) => (
                <div key={r.id} className={`${t.bgMuted} p-4 rounded ${r.estado === "cancelada" ? "opacity-50" : ""}`}>
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">{r.cliente_nombre}</p>
                        {r.estado === "cancelada" && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">Cancelada</span>}
                      </div>
                      <p className={`text-sm ${t.textoSub} mb-2`}>📅 {r.fecha} · ⏰ {r.hora_inicio}</p>
                      <p className={`text-sm ${t.textoSub} mb-2`}>✂️ {r.servicio?.nombre} · {r.duracion_minutos} min</p>
                      <div className={`flex flex-wrap gap-4 text-xs ${t.textoMuted}`}>
                        {r.cliente_telefono && (
                          <a href={`https://wa.me/${r.cliente_telefono}`} target="_blank" rel="noreferrer" className={`flex items-center gap-1 hover:${t.acento}`}>
                            <Phone size={12} />+{r.cliente_telefono}
                          </a>
                        )}
                        {r.cliente_email && <span className="flex items-center gap-1"><Mail size={12} />{r.cliente_email}</span>}
                      </div>
                      {r.motivo_cancelacion && <p className="text-xs text-red-300 mt-2">Motivo cancelación: {r.motivo_cancelacion}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className={`${t.acento} font-bold text-xl`}>${r.precio_final?.toLocaleString("es-CL")}</p>
                      {r.estado === "confirmada" && (
                        <>
                          <div className="flex gap-2">
                            <button onClick={() => abrirReagendar(r)} className={`flex items-center gap-1 text-xs ${t.bgCard} border ${t.border} ${t.bgHover} px-3 py-1.5 rounded`}><Edit size={12} />Reagendar</button>
                            <button onClick={() => abrirCancelar(r)} className="flex items-center gap-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded"><X size={12} />Cancelar</button>
                          </div>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`text-xs ${t.textoMuted}`}>Asistencia:</span>
                            <button onClick={() => marcarAsistencia(r, "asistio")} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border ${r.asistencia === "asistio" ? "bg-green-600 border-green-600 text-white" : `${t.bgCard} ${t.border} ${t.textoSub} ${t.bgHover}`}`}><Check size={12} />Asistió</button>
                            <button onClick={() => marcarAsistencia(r, "no_asistio")} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border ${r.asistencia === "no_asistio" ? "bg-red-600 border-red-600 text-white" : `${t.bgCard} ${t.border} ${t.textoSub} ${t.bgHover}`}`}><X size={12} />No llegó</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              <p className={`${t.textoSub} mb-1`}>Cliente:</p>
              <p className="font-semibold">{modalReagendar.cliente_nombre}</p>
              <p className={`${t.textoSub} mt-2 mb-1`}>Servicio:</p>
              <p className="font-semibold">{modalReagendar.servicio?.nombre}</p>
              <p className={`${t.textoSub} mt-2 mb-1`}>Original:</p>
              <p className="font-semibold">{modalReagendar.fecha} a las {modalReagendar.hora_inicio}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nueva fecha</label>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} min={new Date().toISOString().split("T")[0]} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nueva hora</label>
              <SelectorHora value={nuevaHora || "09:00"} onChange={(v) => setNuevaHora(v)} className="w-full" />
            </div>
            {modalReagendar?.cliente_email && <p className={`${t.acento} text-xs flex items-center gap-2`}>📧 Se enviará un email automático al cliente avisándole</p>}
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
              <p className={t.textoSub}>{modalCancelar.fecha} a las {modalCancelar.hora_inicio} · {modalCancelar.servicio?.nombre}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Motivo (opcional)</label>
              <textarea value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)} placeholder="Ej: Imprevisto familiar..." rows={3} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto} resize-none`} />
            </div>
            {modalCancelar.cliente_email && <p className={`${t.acento} text-xs flex items-center gap-2`}>📧 Se enviará un email automático al cliente avisándole</p>}
          </div>
        )}
      </Modal>

      <ModalNuevaCita
        isOpen={modalNuevaCita}
        onClose={() => setModalNuevaCita(false)}
        onCreated={() => { cargarReservas(); mostrarMensaje("success", "✅ Cita creada exitosamente"); }}
        supabase={supabase}
        barberiaId={barbero.barberia_id}
        barberia={barberia}
        usuario={usuario}
        barberoFijo={barbero.id}
      />
    </div>
  );
}
