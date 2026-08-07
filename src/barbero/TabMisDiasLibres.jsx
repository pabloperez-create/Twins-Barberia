import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, AlertCircle, CalendarOff } from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";
import { Modal } from "../components/Modal";
import { hoyChile } from "../utils/fecha";

export function TabMisDiasLibres({ supabase, barbero, barberia, tema: t }) {
  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "", dias_semana: [] });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => { cargarBloqueos(); }, []);

  const cargarBloqueos = async () => {
    setCargando(true);
    try {
      const hoy = hoyChile();
      const { data } = await supabase.from("bloqueos_horarios").select("*").eq("barbero_id", barbero.id).gte("fecha_fin", hoy).order("fecha_inicio", { ascending: true });
      setBloqueos(data || []);
    } catch (err) { console.error("Error:", err); }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const guardar = async () => {
    const recurrente = form.tipo === "recurrente";
    const conHoras = form.tipo === "bloque_horas" || recurrente;
    if (!recurrente && (!form.fecha_inicio || !form.fecha_fin)) { mostrarMensaje("error", "Selecciona las fechas"); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) { mostrarMensaje("error", "La fecha de inicio debe ser anterior a la de fin"); return; }
    if (conHoras) {
      if (!form.hora_inicio || !form.hora_fin) { mostrarMensaje("error", "Especifica las horas"); return; }
      if (form.hora_inicio >= form.hora_fin) { mostrarMensaje("error", "La hora de inicio debe ser menor a la de fin"); return; }
    }
    if (recurrente && form.dias_semana.length === 0) { mostrarMensaje("error", "Selecciona al menos un día de la semana"); return; }
    setProcesando(true);
    try {
      const { error } = await supabase.from("bloqueos_horarios").insert({
        id: `bl-${Date.now()}`,
        barberia_id: barbero.barberia_id,
        barbero_id: barbero.id,
        fecha_inicio: form.fecha_inicio || hoyChile(),
        fecha_fin: form.fecha_fin || (recurrente ? "2099-12-31" : null),
        hora_inicio: conHoras ? form.hora_inicio : null,
        hora_fin: conHoras ? form.hora_fin : null,
        motivo: form.motivo.trim() || null,
        dias_semana: recurrente ? form.dias_semana : null,
      });
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

  const DIAS_LBL = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };
  const etiquetaFecha = (b) =>
    Array.isArray(b.dias_semana) && b.dias_semana.length
      ? "🔁 " + [...b.dias_semana].sort((a, z) => (a === 0 ? 7 : a) - (z === 0 ? 7 : z)).map((d) => DIAS_LBL[d]).join(", ")
      : b.fecha_inicio === b.fecha_fin ? b.fecha_inicio : `${b.fecha_inicio} al ${b.fecha_fin}`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mis Días Libres</h2>
        <button
          onClick={() => { setForm({ tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "", dias_semana: [] }); setModalAbierto(true); }}
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
                  {etiquetaFecha(b)}
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
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setForm({ ...form, tipo: "dia_completo" })} className={`p-3 rounded text-sm ${tipoActivo("dia_completo")}`}>🏖️ Día completo</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: "bloque_horas", hora_inicio: form.hora_inicio || "09:00", hora_fin: form.hora_fin || "10:00" })} className={`p-3 rounded text-sm ${tipoActivo("bloque_horas")}`}>⏰ Horas</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: "recurrente", hora_inicio: form.hora_inicio || "09:00", hora_fin: form.hora_fin || "10:00" })} className={`p-3 rounded text-sm ${tipoActivo("recurrente")}`}>🔁 Recurrente</button>
            </div>
          </div>
          {form.tipo === "recurrente" ? (
            <div>
              <label className="block text-sm font-semibold mb-2">Días de la semana <span className="text-red-400">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[["L", 1], ["M", 2], ["X", 3], ["J", 4], ["V", 5], ["S", 6], ["D", 0]].map(([label, val]) => (
                  <button key={val} type="button"
                    onClick={() => setForm({ ...form, dias_semana: form.dias_semana.includes(val) ? form.dias_semana.filter((d) => d !== val) : [...form.dias_semana, val] })}
                    className={`w-9 h-9 rounded-full text-sm font-bold ${form.dias_semana.includes(val) ? `${t.acentoBg} ${t.acentoText}` : `border ${t.border} ${t.textoSub}`}`}
                  >{label}</button>
                ))}
              </div>
              <p className={`${t.textoMuted} text-xs mt-2`}>Se bloqueará todos esos días, indefinidamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Desde <span className="text-red-400">*</span></label>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value, fecha_fin: form.fecha_fin || e.target.value })} min={hoyChile()} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hasta <span className="text-red-400">*</span></label>
                <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} min={form.fecha_inicio} className={inputClass} />
              </div>
            </div>
          )}
          {(form.tipo === "bloque_horas" || form.tipo === "recurrente") && (
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
