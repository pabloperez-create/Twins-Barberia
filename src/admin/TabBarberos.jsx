import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Check, AlertCircle, User, Clock, Upload, ChevronUp, ChevronDown } from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";
import { Modal } from "../components/Modal";

export function TabBarberos({ supabase, barberiaId, tema: t }) {
  const esSalon = t.tipo === "salon";
  const labelPro = esSalon ? "Estilista" : "Barbero";
  const labelPros = esSalon ? "Estilistas del equipo" : "Barberos del equipo";

  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [form, setForm] = useState({ nombre: "", especialidad: "", horario_inicio: "10:00", horario_fin: "20:00", email: "", password: "", fotoPreview: "" });
  const fotoFileRef = useRef(null); // ⭐ useRef para no perder el File object

  useEffect(() => { cargarBarberos(); }, []);

  const subirFoto = async (file, barberoId) => {
    try {
      const ext = file.name.split(".").pop();
      const path = `${barberiaId}/${barberoId || "nuevo"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("barberos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("barberos").getPublicUrl(path);
      return data.publicUrl;
    } catch (err) { console.error("Error subiendo foto:", err); return null; }
  };

  const cargarBarberos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase.from("barberos").select("*, usuario:usuario_id(email, nombre)").eq("barberia_id", barberiaId).order("orden", { ascending: true, nullsFirst: false }).order("nombre", { ascending: true });
      if (!error) setBarberos(data || []);
    } catch (err) { console.error("Error cargando barberos:", err); }
    setCargando(false);
  };

  const abrirCrear = () => {
    setEditando(null);
    fotoFileRef.current = null;
    setForm({ nombre: "", especialidad: "", horario_inicio: "10:00", horario_fin: "20:00", email: "", password: "", fotoPreview: "" });
    setModalAbierto(true);
  };

  const abrirEditar = (b) => {
    setEditando(b);
    fotoFileRef.current = null;
    setForm({ nombre: b.nombre, especialidad: b.especialidad || "", horario_inicio: b.horario_inicio || "10:00", horario_fin: b.horario_fin || "20:00", email: b.usuario?.email || "", password: "", fotoPreview: "" });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    fotoFileRef.current = null;
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { mostrarMensaje("error", "El nombre es obligatorio"); return; }
    if (!form.horario_inicio || !form.horario_fin) { mostrarMensaje("error", "Los horarios son obligatorios"); return; }
    if (form.horario_inicio >= form.horario_fin) { mostrarMensaje("error", "El horario de inicio debe ser menor al de fin"); return; }
    if (!editando) {
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { mostrarMensaje("error", "Email inválido"); return; }
      if (!form.password || form.password.length < 6) { mostrarMensaje("error", "La contraseña debe tener al menos 6 caracteres"); return; }
    }
    try {
      if (editando) {
        let foto_url = editando.foto_url || null;
        if (fotoFileRef.current) {
          const url = await subirFoto(fotoFileRef.current, editando.id);
          if (url) foto_url = url;
        }
        const { error } = await supabase.from("barberos").update({ nombre: form.nombre.trim(), especialidad: form.especialidad.trim() || null, horario_inicio: form.horario_inicio, horario_fin: form.horario_fin, foto_url }).eq("id", editando.id);
        if (error) throw error;
        if (editando.usuario_id) await supabase.from("usuarios").update({ nombre: form.nombre.trim() }).eq("id", editando.usuario_id);
        mostrarMensaje("success", `✅ ${labelPro} actualizado`);
      } else {
        const baseId = form.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const timestamp = Date.now().toString().slice(-4);
        const usuarioId = `u-${baseId}-${timestamp}`;
        const barberoId = `b-${baseId}-${timestamp}`;
        // Token de la sesión del admin (el endpoint valida JWT + rol)
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
        // Crea el usuario en Supabase Auth + fila `usuarios` (vía endpoint con service role)
        const respUsuario = await fetch("/api/admin-create-user", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ id: usuarioId, barberia_id: barberiaId, nombre: form.nombre.trim(), email: form.email.trim().toLowerCase(), password: form.password, rol: "barbero" }),
        });
        const dataUsuario = await respUsuario.json();
        if (!respUsuario.ok) { mostrarMensaje("error", dataUsuario.error || "No se pudo crear el usuario"); return; }
        let foto_url = null;
        if (fotoFileRef.current) {
          const url = await subirFoto(fotoFileRef.current, barberoId);
          if (url) foto_url = url;
        }
        const { error: errorBarbero } = await supabase.from("barberos").insert({ id: barberoId, barberia_id: barberiaId, usuario_id: usuarioId, nombre: form.nombre.trim(), especialidad: form.especialidad.trim() || null, horario_inicio: form.horario_inicio, horario_fin: form.horario_fin, foto_url, activo: true });
        if (errorBarbero) {
          // Rollback: borra usuario (fila + Auth) para no dejar huérfanos
          await fetch("/api/admin-create-user", { method: "DELETE", headers: authHeaders, body: JSON.stringify({ id: usuarioId }) });
          throw errorBarbero;
        }
        mostrarMensaje("success", `✅ ${labelPro} "${form.nombre}" creado. Login: ${form.email}`);
      }
      cerrarModal();
      cargarBarberos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  const moverBarbero = async (index, dir) => {
    const nuevoIndex = index + dir;
    if (nuevoIndex < 0 || nuevoIndex >= barberos.length) return;
    const arr = [...barberos];
    [arr[index], arr[nuevoIndex]] = [arr[nuevoIndex], arr[index]];
    const reordenados = arr.map((b, i) => ({ ...b, orden: i }));
    setBarberos(reordenados); // optimista
    try {
      await Promise.all(
        reordenados.map((b) => supabase.from("barberos").update({ orden: b.orden }).eq("id", b.id)),
      );
    } catch (err) {
      mostrarMensaje("error", "No se pudo guardar el orden");
      cargarBarberos();
    }
  };

  const eliminar = async (b) => {
    if (!confirm(`¿Desactivar a "${b.nombre}"?`)) return;
    try {
      const { error } = await supabase.from("barberos").update({ activo: false }).eq("id", b.id);
      if (error) throw error;
      mostrarMensaje("success", `✅ ${labelPro} desactivado`);
      cargarBarberos();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{labelPros}</h2>
        <button onClick={abrirCrear} className={`flex items-center gap-2 ${t.boton} px-4 py-2 rounded`}>
          <Plus size={18} />Nuevo {labelPro.toLowerCase()}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-4 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className={t.textoSub}>Cargando {labelPros.toLowerCase()}...</p>
      ) : (
        <div className="space-y-3">
          {barberos.length === 0 ? (
            <div className={`${t.bgCard} border ${t.border} rounded p-8 text-center`}>
              <User size={48} className={`mx-auto mb-3 ${t.textoMuted}`} />
              <p className={`${t.textoSub} mb-4`}>No hay {labelPros.toLowerCase()} aún</p>
              <button onClick={abrirCrear} className={`${t.boton} px-4 py-2 rounded`}>Agregar primer {labelPro.toLowerCase()}</button>
            </div>
          ) : barberos.map((b, index) => (
            <div key={b.id} className={`${t.bgCard} border ${t.border} rounded p-4 flex flex-wrap justify-between items-center gap-3 ${!b.activo && "opacity-50"}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 ${t.bgMuted} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  {b.foto_url ? <img src={b.foto_url} alt={b.nombre} className="w-full h-full object-cover object-top" /> : <User size={24} className={t.acento} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{b.nombre}</h3>
                    {!b.activo && <span className={`text-xs ${t.bgMuted} ${t.textoSub} px-2 py-0.5 rounded`}>Inactivo</span>}
                  </div>
                  <p className={`${t.textoSub} text-sm`}>{b.especialidad || labelPro}</p>
                  <div className={`flex flex-wrap gap-4 text-xs ${t.textoMuted} mt-1`}>
                    <span className="flex items-center gap-1"><Clock size={12} />{b.horario_inicio?.slice(0, 5) || "--"} - {b.horario_fin?.slice(0, 5) || "--"}</span>
                    {b.usuario?.email && <span>📧 {b.usuario.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moverBarbero(index, -1)} disabled={index === 0} className={`p-1 ${t.bgMuted} ${t.bgHover} rounded disabled:opacity-30 disabled:cursor-not-allowed`} title="Subir"><ChevronUp size={16} /></button>
                  <button onClick={() => moverBarbero(index, 1)} disabled={index === barberos.length - 1} className={`p-1 ${t.bgMuted} ${t.bgHover} rounded disabled:opacity-30 disabled:cursor-not-allowed`} title="Bajar"><ChevronDown size={16} /></button>
                </div>
                <button onClick={() => abrirEditar(b)} className={`p-2 ${t.bgMuted} ${t.bgHover} rounded`} title="Editar"><Edit size={16} /></button>
                {b.activo && <button onClick={() => eliminar(b)} className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded" title="Desactivar"><Trash2 size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalAbierto} onClose={cerrarModal} title={editando ? `Editar ${labelPro.toLowerCase()}` : `Nuevo ${labelPro.toLowerCase()}`}
        footer={
          <>
            <button onClick={cerrarModal} className={`px-4 py-2 ${t.bgMuted} ${t.bgHover} rounded text-sm`}>Cancelar</button>
            <button onClick={guardar} className={`px-4 py-2 ${t.boton} rounded text-sm`}>{editando ? "Actualizar" : `Crear ${labelPro.toLowerCase()}`}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Foto <span className={`${t.textoMuted} text-xs font-normal`}>(opcional)</span></label>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full overflow-hidden ${t.bgMuted} flex items-center justify-center flex-shrink-0`}>
                {(form.fotoPreview || editando?.foto_url) ? <img src={form.fotoPreview || editando?.foto_url} alt="foto" className="w-full h-full object-cover object-top" /> : <User size={28} className={t.textoSub} />}
              </div>
              <label className={`flex items-center gap-2 px-4 py-2 ${t.bgMuted} ${t.bgHover} border ${t.border} rounded cursor-pointer text-sm`}>
                <Upload size={16} />
                {form.fotoPreview ? "Cambiar foto" : "Subir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    fotoFileRef.current = file;
                    setForm(prev => ({ ...prev, fotoPreview: URL.createObjectURL(file) }));
                  }
                }} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.nombre} onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))} placeholder={esSalon ? "Ej: Ana" : "Ej: Vicente"} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Especialidad <span className={`${t.textoMuted} text-xs font-normal`}>(opcional)</span></label>
            <input type="text" value={form.especialidad} onChange={(e) => setForm(prev => ({ ...prev, especialidad: e.target.value }))} placeholder={esSalon ? "Ej: Esmaltado permanente" : "Ej: Cortes clásicos"} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Inicio jornada <span className="text-red-400">*</span></label>
              <SelectorHora value={form.horario_inicio || "09:00"} onChange={(v) => setForm(prev => ({ ...prev, horario_inicio: v }))} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Fin jornada <span className="text-red-400">*</span></label>
              <SelectorHora value={form.horario_fin || "19:00"} onChange={(v) => setForm(prev => ({ ...prev, horario_fin: v }))} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
            </div>
          </div>
          {!editando && (
            <div className={`border-t ${t.border} pt-4 mt-4`}>
              <h4 className={`font-bold mb-3 ${t.acento}`}>🔐 Credenciales de acceso</h4>
              <p className={`${t.textoSub} text-xs mb-3`}>El/la {labelPro.toLowerCase()} usará estos datos para hacer login</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email para login <span className="text-red-400">*</span></label>
                  <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder={esSalon ? "ana@salon.cl" : "vicente@twins.cl"} className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Contraseña <span className="text-red-400">*</span></label>
                  <input type="text" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className={`w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`} />
                  <p className={`${t.textoMuted} text-xs mt-1`}>💡 Comunícale su contraseña por privado</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
