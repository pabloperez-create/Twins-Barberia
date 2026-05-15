import React, { useState } from "react";
import { Save, Check, AlertCircle, Lock } from "lucide-react";

export function TabMiPerfil({ supabase, barbero, usuario, onUpdate }) {
  const [perfil, setPerfil] = useState({
    nombre: barbero?.nombre || "",
    especialidad: barbero?.especialidad || "",
  });

  const [passwords, setPasswords] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  });

  const [guardando, setGuardando] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  // Guardar perfil (nombre + especialidad)
  const guardarPerfil = async () => {
    if (!perfil.nombre.trim()) {
      mostrarMensaje("error", "El nombre es obligatorio");
      return;
    }

    setGuardando("perfil");
    try {
      // 1. Actualizar tabla barberos
      const { error: errorBarbero } = await supabase
        .from("barberos")
        .update({
          nombre: perfil.nombre.trim(),
          especialidad: perfil.especialidad.trim() || null,
        })
        .eq("id", barbero.id);

      if (errorBarbero) throw errorBarbero;

      // 2. Actualizar también el nombre en usuarios
      const { error: errorUsuario } = await supabase
        .from("usuarios")
        .update({ nombre: perfil.nombre.trim() })
        .eq("id", usuario.id);

      if (errorUsuario) throw errorUsuario;

      mostrarMensaje("success", "✅ Perfil actualizado");
      onUpdate();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setGuardando("");
  };

  // Cambiar contraseña
  const cambiarPassword = async () => {
    if (!passwords.actual) {
      mostrarMensaje("error", "Ingresa tu contraseña actual");
      return;
    }
    if (passwords.actual !== usuario.password_hash) {
      mostrarMensaje("error", "Contraseña actual incorrecta");
      return;
    }
    if (!passwords.nueva || passwords.nueva.length < 6) {
      mostrarMensaje("error", "La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (passwords.nueva !== passwords.confirmar) {
      mostrarMensaje("error", "Las contraseñas no coinciden");
      return;
    }

    setGuardando("password");
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ password_hash: passwords.nueva })
        .eq("id", usuario.id);

      if (error) throw error;

      mostrarMensaje("success", "✅ Contraseña actualizada");
      setPasswords({ actual: "", nueva: "", confirmar: "" });
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setGuardando("");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Mi Perfil</h2>

      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-6 flex items-center gap-3 ${
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

      <div className="space-y-6 max-w-2xl">
        {/* ============ SECCIÓN: DATOS PERSONALES ============ */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1">👤 Datos personales</h3>
          <p className="text-stone-400 text-sm mb-4">
            Esta información se muestra a los clientes al reservar
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={perfil.nombre}
                onChange={(e) =>
                  setPerfil({ ...perfil, nombre: e.target.value })
                }
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Especialidad
              </label>
              <input
                type="text"
                value={perfil.especialidad}
                onChange={(e) =>
                  setPerfil({ ...perfil, especialidad: e.target.value })
                }
                placeholder="Ej: Cortes clásicos, fades, barbas..."
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-stone-500">
                Email (no editable)
              </label>
              <input
                type="email"
                value={usuario?.email || ""}
                disabled
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-stone-500 cursor-not-allowed"
              />
              <p className="text-stone-500 text-xs mt-1">
                El email no se puede cambiar. Contacta al administrador si lo
                necesitas.
              </p>
            </div>

            <button
              onClick={guardarPerfil}
              disabled={guardando === "perfil"}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
            >
              <Save size={16} />
              {guardando === "perfil" ? "Guardando..." : "Guardar perfil"}
            </button>
          </div>
        </div>

        {/* ============ SECCIÓN: CAMBIAR CONTRASEÑA ============ */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Lock size={18} /> Cambiar contraseña
          </h3>
          <p className="text-stone-400 text-sm mb-4">
            Si olvidas tu contraseña, contacta al administrador
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Contraseña actual <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={passwords.actual}
                onChange={(e) =>
                  setPasswords({ ...passwords, actual: e.target.value })
                }
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Nueva contraseña <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={passwords.nueva}
                onChange={(e) =>
                  setPasswords({ ...passwords, nueva: e.target.value })
                }
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Confirmar nueva contraseña <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={passwords.confirmar}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmar: e.target.value })
                }
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>

            <button
              onClick={cambiarPassword}
              disabled={guardando === "password"}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
            >
              <Lock size={16} />
              {guardando === "password" ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
