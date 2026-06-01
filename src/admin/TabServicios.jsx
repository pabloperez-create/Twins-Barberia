import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Check, AlertCircle, Scissors } from "lucide-react";
import { Modal } from "../components/Modal";

const CATEGORIAS_DEFAULT = ["General", "Destacados", "Manicura", "Pedicura", "Sistemas de uñas", "Diseños", "Rostro"];

export function TabServicios({ supabase, barberiaId, tema: t }) {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [form, setForm] = useState({ nombre: "", precio: "", duracion_minutos: "", descripcion: "", categoria: "General" });

  useEffect(() => { cargarServicios(); }, []);

  const cargarServicios = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase.from("servicios_principales").select("*").eq("barberia_id", barberiaId).order("categoria", { ascending: true }).order("precio", { ascending: true });
      if (!error) setServicios(data || []);
    } catch (err) { console.error("Error:", err); }
    setCargando(false);
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({ nombre: "", precio: "", duracion_minutos: "", descripcion: "", categoria: "General" });
    setModalAbierto(true);
  };

  const abrirEditar = (s) => {
    setEditando(s);
    setForm({ nombre: s.nombre, precio: s.precio.toString(), duracion_minutos: s.duracion_minutos.toString(), descripcion: s.descripcion || "", categoria: s.categoria || "General" });
    setModalAbierto(true);
  };

  const cerrarModal = () => { setModalAbierto(false); setEditando(null); };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { mostrarMensaje("error", "El nombre es obligatorio"); return; }
    if (!form.precio || Number(form.precio) <= 0) { mostrarMensaje("error", "El precio debe ser mayor a 0"); return; }
    if (!form.duracion_minutos || Number(form.duracion_minutos) <= 0) { mostrarMensaje("error", "La duración debe ser mayor a 0"); return; }
    try {
      const payload = { nombre: form.nombre.trim(), precio: Number(form.precio), duracion_minutos: Number(form.duracion_minutos), descripcion: form.descripcion.trim() || null, categoria: form.categoria || "General" };
      if (editando) {
        const { error } = await supabase.from("servicios_principales").update(payload).eq("id", editando.id);
        if (error) throw error;
        mostrarMensaje("success", "✅ Servicio actualizado");
      } else {
        const { error } = await supabase.from("servicios_principales").insert({ id: `s-${Date.now()}`, barberia_id: barberiaId, activo: true, ...payload });
        if (error) throw error;
        mostrarMensaje("success", "✅ Servicio creado");
      }
      cerrarModal();
      cargarServicios();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const eliminar = async (s) => {
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return;
    try {
      const { error } = await supabase.from("servicios_principales").update({ activo: false }).eq("id", s.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Servicio desactivado");
      cargarServicios();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const reactivar = async (s) => {
    try {
      const { error } = await supabase.from("servicios_principales").update({ activo: true }).eq("id", s.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Servicio reactivado");
      cargarServicios();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const porCategoria = servicios.reduce((acc, s) => {
    const cat = s.categoria || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categoriasExistentes = [...new Set(servicios.map(s => s.categoria || "General"))];
  const todasCategorias = [...new Set([...CATEGORIAS_DEFAULT, ...categoriasExistentes])];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Servicios Principales</h2>
        <button onClick={abrirCrear} className={`flex items-center gap-2 ${t.boton} px-4 py-2 rounded`}>
          <Plus size={18} />Nuevo servicio
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? <p className={t.textoSub}>Cargando servicios...</p> : (
        <div className="space-y-6">
          {servicios.length === 0 ? (
            <div className={`${t.bgCard} border ${t.border} rounded p-8 text-center`}>
              <Scissors size={48} className={`mx-auto mb-3 ${t.textoMuted}`} />
              <p className={`${t.textoSub} mb-4`}>No hay servicios aún</p>
              <button onClick={abrirCrear} className={`${t.boton} px-4 py-2 rounded`}>Crear primer servicio</button>
            </div>
          ) : Object.entries(porCategoria).map(([categoria, items]) => (
            <div key={categoria}>
              <h3 className={`text-sm font-bold ${t.acento} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                <span className={`flex-1 h-px ${t.border.replace("border-", "bg-")}`}></span>
                {categoria}
                <span className={`flex-1 h-px ${t.border.replace("border-", "bg-")}`}></span>
              </h3>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className={`${t.bgCard} border ${t.border} rounded p-4 flex flex-wrap justify-between items-start gap-3 ${!s.activo && "opacity-50"}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{s.nombre}</h3>
                        {!s.activo && <span className={`text-xs ${t.bgMuted} ${t.textoSub} px-2 py-0.5 rounded`}>Desactivado</span>}
                      </div>
                      <p className={`${t.textoSub} text-sm`}>⏱️ {s.duracion_minutos} min · 💰 ${s.precio.toLocaleString("es-CL")}</p>
                      {s.descripcion && <p className={`${t.textoMuted} text-xs mt-1 italic`}>{s.descripcion}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(s)} className={`p-2 ${t.bgMuted} ${t.bgHover} rounded`} title="Editar"><Edit size={16} /></button>
                      {s.activo
                        ? <button onClick={() => eliminar(s)} className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded" title="Desactivar"><Trash2 size={16} /></button>
                        : <button onClick={() => reactivar(s)} className="p-2 bg-green-900 hover:bg-green-800 text-green-200 rounded" title="Reactivar"><Check size={16} /></button>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalAbierto} onClose={cerrarModal} title={editando ? "Editar servicio" : "Nuevo servicio"}
        footer={
          <>
            <button onClick={cerrarModal} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cancelar</button>
            <button onClick={guardar} className={`px-4 py-2 ${t.boton} rounded text-sm`}>{editando ? "Actualizar" : "Crear"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nombre del servicio <span className="text-red-400">*</span></label>
            <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Esmaltado permanente" className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`}>
              {todasCategorias.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">+ Nueva categoría...</option>
            </select>
            {form.categoria === "__custom" && (
              <input type="text" placeholder="Nombre de la nueva categoría" onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto} mt-2`} />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Precio (CLP) <span className="text-red-400">*</span></label>
            <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="20000" className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Duración (minutos) <span className="text-red-400">*</span></label>
            <input type="number" value={form.duracion_minutos} onChange={(e) => setForm({ ...form, duracion_minutos: e.target.value })} placeholder="75" className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Descripción <span className={`${t.textoMuted} font-normal text-xs`}>(opcional)</span></label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Incluye manicura combinada..." rows={3} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto} resize-none text-sm`} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
