import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, AlertCircle, CalendarOff } from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";
import { Modal } from "../components/Modal";

export function TabMisDiasLibres({ supabase, barbero, barberia, tema: t }) {
  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "" });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => { cargarBloqueos(); }, []);

  const cargarBloqueos = async () => {
    setCargando(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("bloqueos_horarios").select("*").eq("barbero_id", barbero.id).gte("fecha_fin", hoy).order("fecha_inicio", { ascending: true });
      setBloqueos(data || []);
    } catch (err) { console.error("Error:", err); }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const guardar = async () => {
    if (!form.fecha_inicio || !form.fecha_fin) { mostrarMensaje("error", "Selecciona las fechas"); return; }
    if (form.fecha_inicio > form.fecha_fin) { mostrarMensaje("error", "La fecha de inicio debe ser anterior a la de fin"); return; }
    if (form.tipo === "bloque_horas") {
      if (!form.hora_inicio || !form.hora_fin) { mostrarMensaje("error", "Especifica las horas"); return; }
      if (form.hora_inicio >= form.hora_fin) { mostrarMensaje("error", "La hora de inicio debe ser menor a la de fin"); return; }
    }
    setProcesando(true);
    try {
      const { error } = await supabase.from("bloqueos_horarios").insert({ id: `bl-${Date.now()}`, barberia_id: barbero.barberia_id, barbero_id: barbero.id, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin, hora_inicio: form.tipo === "bloque_horas" ? form.hora_inicio : null, hora_fin: form.tipo === "bloque_horas" ? form.hora_fin : null, motivo: form.motivo.trim() || null });
      if (error) throw error;
      mostrarMensaje("success", "✅ Bloqueo creado");
      setModalAbierto(false);
      cargarBloqueos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  const eliminar = async (bloqueo) => {
    if (!confirm("¿Eliminar este bloqueo?")) return;
    try {
      const { error } = await supabase.from("bloqueos_horarios").delete().eq("id", bloqueo.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Bloqueo eliminado");
      cargarBloqueos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const tipoActivo = (tipo) => form.tipo === tipo
    ? `border-2 ${t.acentoBgOpacity} ${t.acento} border-transparent`
    : `border-2 border-transparent ${t.bgMuted} ${t.textoSub}`;

  const inputClass = `w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mis Días Libres</h2>
        <button
          onClick={() => { setForm({ tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "" }); setModalAbierto(true); }}
          className={`flex items-center gap-2 ${t.boton} px-4 py-2 rounded`}
        >
          <Plus size={18} />Agregar bloqueo
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className={t.textoSub}>Cargando...</p>
      ) : bloqueos.length === 0 ? (
        <div className={`${t.bgCard} border ${t.border} rounded p-8 text-center`}>
          <CalendarOff size={48} className={`mx-auto mb-3 ${t.textoMuted}`} />
          <p className={t.textoSub}>No tienes bloqueos próximos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bloqueos.map((b) => (
            <div key={b.id} className={`${t.bgCard} border ${t.border} rounded p-4 flex justify-between items-center`}>
              <div>
                <p className="font-semibold">
                  {b.fecha_inicio === b.fecha_fin ? b.fecha_inicio : `${b.fecha_inicio} al ${b.fecha_fin}`}
                  {b.hora_inicio && b.hora_fin && ` · ${b.hora_inicio.slice(0, 5)} - ${b.hora_fin.slice(0, 5)}`}
                </p>
                <p className={`${t.textoSub} text-sm`}>{b.motivo || "Sin motivo"}</p>
              </div>
              <button onClick={() => eliminar(b)} className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} title="Agregar bloqueo"
        footer={
          <>
            <button onClick={() => setModalAbierto(false)} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cancelar</button>
            <button onClick={guardar} disabled={procesando} className={`px-4 py-2 ${t.boton} rounded text-sm disabled:opacity-50`}>{procesando ? "Guardando..." : "Crear bloqueo"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, tipo: "dia_completo" })} className={`p-3 rounded text-sm ${tipoActivo("dia_completo")}`}>🏖️ Día completo</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: "bloque_horas" })} className={`p-3 rounded text-sm ${tipoActivo("bloque_horas")}`}>⏰ Horas específicas</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Desde <span className="text-red-400">*</span></label>
              <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value, fecha_fin: form.fecha_fin || e.target.value })} min={new Date().toISOString().split("T")[0]} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-16">Hasta <span className="text-red-400">*</span></label>
              <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} min={form.fecha_inicio} className={inputClass} />
            </div>
          </div>
          {form.tipo === "bloque_horas" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Hora inicio <span className="text-red-400">*</span></label>
                <SelectorHora value={form.hora_inicio || "09:00"} onChange={(v) => setForm({ ...form, hora_inicio: v })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hora fin <span className="text-red-400">*</span></label>
                <SelectorHora value={form.hora_fin || "10:00"} onChange={(v) => setForm({ ...form, hora_fin: v })} className="w-full" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-2">Motivo (opcional)</label>
            <input type="text" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej: Vacaciones, médico..." className={inputClass} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
