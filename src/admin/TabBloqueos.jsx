import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, AlertCircle, CalendarOff, Building, User } from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";
import { Modal } from "../components/Modal";

export function TabBloqueos({ supabase, barberiaId, tema: t }) {
  const esSalon = t.tipo === "salon";
  const labelPro = esSalon ? "estilista" : "barbero";
  const labelLocal = esSalon ? "salón" : "barbería";

  const [bloqueos, setBloqueos] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [filtroBarbero, setFiltroBarbero] = useState("todos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ barbero_id: "", tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "", dias_semana: [] });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const { data: bloqs } = await supabase.from("bloqueos_horarios").select("*").eq("barberia_id", barberiaId).gte("fecha_fin", hoy).order("fecha_inicio", { ascending: true });
      const { data: brbs } = await supabase.from("barberos").select("*").eq("barberia_id", barberiaId).eq("activo", true).order("nombre");
      setBloqueos(bloqs || []);
      setBarberos(brbs || []);
    } catch (err) { console.error("Error cargando datos:", err); }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const abrirCrear = () => { setForm({ barbero_id: "", tipo: "dia_completo", fecha_inicio: "", fecha_fin: "", hora_inicio: "", hora_fin: "", motivo: "", dias_semana: [] }); setModalAbierto(true); };

  const guardar = async () => {
    if (form.tipo !== "recurrente" && (!form.fecha_inicio || !form.fecha_fin)) { mostrarMensaje("error", "Selecciona las fechas"); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) { mostrarMensaje("error", "La fecha de inicio debe ser anterior a la de fin"); return; }
    if (form.tipo === "bloque_horas") {
      if (!form.hora_inicio || !form.hora_fin) { mostrarMensaje("error", "Especifica las horas"); return; }
      if (form.hora_inicio >= form.hora_fin) { mostrarMensaje("error", "La hora de inicio debe ser menor a la de fin"); return; }
    }
    if (form.tipo === "recurrente" && form.dias_semana.length === 0) { mostrarMensaje("error", "Selecciona al menos un día de la semana"); return; }
    setProcesando(true);
    try {
      const { error } = await supabase.from("bloqueos_horarios").insert({
        id: `bl-${Date.now()}`,
        barberia_id: barberiaId,
        barbero_id: form.barbero_id || null,
        fecha_inicio: form.fecha_inicio || new Date().toISOString().split("T")[0],
        fecha_fin: form.fecha_fin || (form.tipo === "recurrente" ? "2099-12-31" : null),
        hora_inicio: form.tipo === "bloque_horas" ? form.hora_inicio : null,
        hora_fin: form.tipo === "bloque_horas" ? form.hora_fin : null,
        motivo: form.motivo.trim() || null,
        dias_semana: form.tipo === "recurrente" ? form.dias_semana : null,
      });
      if (error) throw error;
      mostrarMensaje("success", form.barbero_id ? `✅ Bloqueo creado para el ${labelPro}` : `🏪 Bloqueo creado para todo el ${labelLocal}`);
      setModalAbierto(false);
      cargarDatos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setProcesando(false);
  };

  const eliminar = async (bloqueo) => {
    if (!confirm("¿Eliminar este bloqueo?")) return;
    try {
      const { error } = await supabase.from("bloqueos_horarios").delete().eq("id", bloqueo.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Bloqueo eliminado");
      cargarDatos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const bloqueosFiltrados = filtroBarbero === "todos" ? bloqueos : filtroBarbero === "barberia" ? bloqueos.filter(b => !b.barbero_id) : bloqueos.filter(b => b.barbero_id === filtroBarbero);

  const formatearBloqueo = (b) => {
    const inicio = b.fecha_inicio;
    const fin = b.fecha_fin;
    let texto = inicio === fin ? inicio : `${inicio} al ${fin}`;
    if (b.hora_inicio && b.hora_fin) texto += ` · ${b.hora_inicio.slice(0, 5)} - ${b.hora_fin.slice(0, 5)}`;
    else texto += " · Día completo";
    return texto;
  };

  // Clase del botón de tipo seleccionado
  const tipoActivo = (tipo) => form.tipo === tipo
    ? `border-2 ${t.border.replace("border-", "border-")} ${t.acentoBgOpacity} ${t.acento}`
    : `border-2 border-transparent ${t.bgMuted} ${t.textoSub}`;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Bloqueos de horarios</h2>
        <button onClick={abrirCrear} className={`flex items-center gap-2 ${t.boton} px-4 py-2 rounded`}>
          <Plus size={18} />Nuevo bloqueo
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFiltroBarbero("todos")} className={`px-3 py-1.5 rounded text-sm font-semibold ${filtroBarbero === "todos" ? t.filtroActivo : t.filtroInactivo}`}>Todos</button>
        <button onClick={() => setFiltroBarbero("barberia")} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold ${filtroBarbero === "barberia" ? t.filtroActivo : t.filtroInactivo}`}>
          <Building size={14} />{esSalon ? "Salón" : "Barbería"}
        </button>
        {barberos.map((b) => (
          <button key={b.id} onClick={() => setFiltroBarbero(b.id)} className={`px-3 py-1.5 rounded text-sm font-semibold ${filtroBarbero === b.id ? t.filtroActivo : t.filtroInactivo}`}>{b.nombre}</button>
        ))}
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className={t.textoSub}>Cargando...</p>
      ) : bloqueosFiltrados.length === 0 ? (
        <div className={`${t.bgCard} border ${t.border} rounded p-8 text-center`}>
          <CalendarOff size={48} className={`mx-auto mb-3 ${t.textoMuted}`} />
          <p className={t.textoSub}>No hay bloqueos en este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bloqueosFiltrados.map((b) => (
            <div key={b.id} className={`${t.bgCard} border ${t.border} rounded p-4 flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${b.barbero_id ? "bg-red-900 bg-opacity-30" : `${t.acentoBgOpacity}`}`}>
                  {b.barbero_id ? <User size={20} className="text-red-300" /> : <Building size={20} className={t.acento} />}
                </div>
                <div>
                  <p className="font-semibold">
                    {b.barbero_id ? (barberos.find(br => br.id === b.barbero_id)?.nombre || b.barbero_id) : `🏪 Todo el ${labelLocal}`}
                    <span className={`${t.textoSub} font-normal ml-2`}>· {b.motivo || "Sin motivo"}</span>
                  </p>
                  <p className={`text-sm ${t.textoSub}`}>{formatearBloqueo(b)}</p>
                </div>
              </div>
              <button onClick={() => eliminar(b)} className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded" title="Eliminar"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} title="Nuevo bloqueo"
        footer={
          <>
            <button onClick={() => setModalAbierto(false)} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cancelar</button>
            <button onClick={guardar} disabled={procesando} className={`px-4 py-2 ${t.boton} rounded text-sm disabled:opacity-50`}>{procesando ? "Creando..." : "Crear bloqueo"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Aplicar a</label>
            <select value={form.barbero_id} onChange={(e) => setForm({ ...form, barbero_id: e.target.value })} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`}>
              <option value="">🏪 Todo el {labelLocal}</option>
              {barberos.map((b) => <option key={b.id} value={b.id}>👤 {b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setForm({ ...form, tipo: "dia_completo" })} className={`p-3 rounded text-sm ${tipoActivo("dia_completo")}`}>🏖️ Día completo</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: "bloque_horas" })} className={`p-3 rounded text-sm ${tipoActivo("bloque_horas")}`}>⏰ Horas</button>
              <button type="button" onClick={() => setForm({ ...form, tipo: "recurrente" })} className={`p-3 rounded text-sm ${tipoActivo("recurrente")}`}>🔁 Recurrente</button>
            </div>
          </div>
          {form.tipo === "recurrente" && (
            <div>
              <label className="block text-sm font-semibold mb-2">Días de la semana</label>
              <div className="flex gap-2 flex-wrap">
                {[["L",1],["M",2],["X",3],["J",4],["V",5],["S",6],["D",0]].map(([label, val]) => (
                  <button key={val} type="button"
                    onClick={() => setForm({ ...form, dias_semana: form.dias_semana.includes(val) ? form.dias_semana.filter(d => d !== val) : [...form.dias_semana, val] })}
                    className={`w-9 h-9 rounded-full text-sm font-bold border-2 ${form.dias_semana.includes(val) ? `${t.acentoBg} ${t.acentoText} border-transparent` : `border ${t.border} ${t.textoSub}`}`}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}
          {form.tipo !== "recurrente" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Desde <span className="text-red-400">*</span></label>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value, fecha_fin: form.fecha_fin || e.target.value })} min={new Date().toISOString().split("T")[0]} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hasta <span className="text-red-400">*</span></label>
                <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} min={form.fecha_inicio} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`} />
              </div>
            </div>
          )}
          {form.tipo === "bloque_horas" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Hora inicio <span className="text-red-400">*</span></label>
                <SelectorHora value={form.hora_inicio || "09:00"} onChange={(v) => setForm({ ...form, hora_inicio: v })} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hora fin <span className="text-red-400">*</span></label>
                <SelectorHora value={form.hora_fin || "10:00"} onChange={(v) => setForm({ ...form, hora_fin: v })} className="w-full" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-2">Motivo (opcional)</label>
            <input type="text" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej: Vacaciones, feriado, evento" className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-3 py-2 ${t.texto} text-sm`} />
          </div>
          <p className={`${t.textoMuted} text-xs`}>💡 Las reservas existentes en este rango no se cancelan automáticamente.</p>
        </div>
      </Modal>
    </div>
  );
}
