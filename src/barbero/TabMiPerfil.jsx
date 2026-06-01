import React, { useState } from "react";
import { Save, Check, AlertCircle, User, Lock } from "lucide-react";

export function TabMiPerfil({ supabase, barbero, usuario, onUpdate, tema: t }) {
  const [nombre, setNombre] = useState(barbero?.nombre || "");
  const [especialidad, setEspecialidad] = useState(barbero?.especialidad || "");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const guardarPerfil = async () => {
    if (!nombre.trim()) { mostrarMensaje("error", "El nombre no puede estar vacío"); return; }
    setGuardando(true);
    try {
      const { error: errorBarbero } = await supabase.from("barberos").update({ nombre: nombre.trim(), especialidad: especialidad.trim() || null }).eq("id", barbero.id);
      if (errorBarbero) throw errorBarbero;
      const { error: errorUsuario } = await supabase.from("usuarios").update({ nombre: nombre.trim() }).eq("id", usuario.id);
      if (errorUsuario) throw errorUsuario;
      mostrarMensaje("success", "✅ Perfil actualizado");
      onUpdate();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setGuardando(false);
  };

  const cambiarPassword = async () => {
    if (!passwordActual || !passwordNuevo) { mostrarMensaje("error", "Completa ambos campos"); return; }
    if (passwordNuevo.length < 6) { mostrarMensaje("error", "La nueva contraseña debe tener al menos 6 caracteres"); return; }
    setGuardando(true);
    try {
      const { data: user } = await supabase.from("usuarios").select("password_hash").eq("id", usuario.id).single();
      if (user?.password_hash !== passwordActual) { mostrarMensaje("error", "La contraseña actual no es correcta"); setGuardando(false); return; }
      const { error } = await supabase.from("usuarios").update({ password_hash: passwordNuevo }).eq("id", usuario.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Contraseña actualizada");
      setPasswordActual(""); setPasswordNuevo("");
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setGuardando(false);
  };

  const inputClass = `w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`;
  const cardClass = `${t.bgCard} border ${t.border} rounded p-6`;

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold mb-6">Mi Perfil</h2>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-6 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {/* Perfil */}
      <div className={`${cardClass} mb-6`}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <User size={18} className={t.acento} />Información personal
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Especialidad</label>
            <input type="text" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} placeholder={t.tipo === "salon" ? "Ej: Esmaltado permanente, diseños..." : "Ej: Cortes clásicos, fade..."} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input type="text" value={usuario?.email || ""} disabled className={`w-full ${t.bgMuted} border ${t.border} rounded px-4 py-2 ${t.textoMuted} cursor-not-allowed`} />
            <p className={`${t.textoMuted} text-xs mt-1`}>El email no se puede cambiar</p>
          </div>
          <button onClick={guardarPerfil} disabled={guardando} className={`flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`}>
            <Save size={16} />{guardando ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className={cardClass}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock size={18} className={t.acento} />Cambiar contraseña
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Contraseña actual</label>
            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Nueva contraseña</label>
            <input type="password" value={passwordNuevo} onChange={(e) => setPasswordNuevo(e.target.value)} className={inputClass} />
          </div>
          <button onClick={cambiarPassword} disabled={guardando} className={`flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`}>
            <Lock size={16} />{guardando ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
