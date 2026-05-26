import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  AlertCircle,
  User,
  Clock,
} from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";
import { Modal } from "../components/Modal";

export function TabBarberos({ supabase, barberiaId }) {
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [form, setForm] = useState({
    nombre: "",
    especialidad: "",
    horario_inicio: "10:00",
    horario_fin: "20:00",
    // Solo para crear nuevo
    email: "",
    password: "",
  });

  useEffect(() => {
    cargarBarberos();
  }, []);

  const cargarBarberos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("barberos")
        .select("*, usuario:usuario_id(email, nombre)")
        .eq("barberia_id", barberiaId)
        .order("nombre", { ascending: true });

      if (!error) setBarberos(data || []);
    } catch (err) {
      console.error("Error cargando barberos:", err);
    }
    setCargando(false);
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({
      nombre: "",
      especialidad: "",
      horario_inicio: "10:00",
      horario_fin: "20:00",
      email: "",
      password: "",
    });
    setModalAbierto(true);
  };

  const abrirEditar = (barbero) => {
    setEditando(barbero);
    setForm({
      nombre: barbero.nombre,
      especialidad: barbero.especialidad || "",
      horario_inicio: barbero.horario_inicio || "10:00",
      horario_fin: barbero.horario_fin || "20:00",
      email: barbero.usuario?.email || "",
      password: "",
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const guardar = async () => {
    // Validaciones
    if (!form.nombre.trim()) {
      mostrarMensaje("error", "El nombre es obligatorio");
      return;
    }
    if (!form.horario_inicio || !form.horario_fin) {
      mostrarMensaje("error", "Los horarios son obligatorios");
      return;
    }
    if (form.horario_inicio >= form.horario_fin) {
      mostrarMensaje("error", "El horario de inicio debe ser menor al de fin");
      return;
    }

    // Validaciones solo para crear
    if (!editando) {
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
        mostrarMensaje("error", "Email inválido");
        return;
      }
      if (!form.password || form.password.length < 6) {
        mostrarMensaje("error", "La contraseña debe tener al menos 6 caracteres");
        return;
      }
    }

    try {
      if (editando) {
        // ===== ACTUALIZAR BARBERO =====
        const { error } = await supabase
          .from("barberos")
          .update({
            nombre: form.nombre.trim(),
            especialidad: form.especialidad.trim() || null,
            horario_inicio: form.horario_inicio,
            horario_fin: form.horario_fin,
          })
          .eq("id", editando.id);

        if (error) throw error;

        // Actualizar también el nombre en usuarios (si tiene usuario vinculado)
        if (editando.usuario_id) {
          await supabase
            .from("usuarios")
            .update({ nombre: form.nombre.trim() })
            .eq("id", editando.usuario_id);
        }

        mostrarMensaje("success", "✅ Barbero actualizado");
      } else {
        // ===== CREAR BARBERO + USUARIO =====
        const baseId = form.nombre
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const timestamp = Date.now().toString().slice(-4);
        const usuarioId = `u-${baseId}-${timestamp}`;
        const barberoId = `b-${baseId}-${timestamp}`;

        // 1. Verificar que el email no exista
        const { data: existente } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", form.email.trim().toLowerCase())
          .maybeSingle();

        if (existente) {
          mostrarMensaje("error", "Este email ya está registrado");
          return;
        }

        // 2. Crear usuario
        const { error: errorUsuario } = await supabase.from("usuarios").insert({
          id: usuarioId,
          barberia_id: barberiaId,
          nombre: form.nombre.trim(),
          email: form.email.trim().toLowerCase(),
          password_hash: form.password,
          rol: "barbero",
        });

        if (errorUsuario) throw errorUsuario;

        // 3. Crear barbero vinculado al usuario
        const { error: errorBarbero } = await supabase.from("barberos").insert({
          id: barberoId,
          barberia_id: barberiaId,
          usuario_id: usuarioId,
          nombre: form.nombre.trim(),
          especialidad: form.especialidad.trim() || null,
          horario_inicio: form.horario_inicio,
          horario_fin: form.horario_fin,
          activo: true,
        });

        if (errorBarbero) {
          // Rollback: borrar el usuario que creamos
          await supabase.from("usuarios").delete().eq("id", usuarioId);
          throw errorBarbero;
        }

        mostrarMensaje(
          "success",
          `✅ Barbero "${form.nombre}" creado. Login: ${form.email}`,
        );
      }

      cerrarModal();
      cargarBarberos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const eliminar = async (barbero) => {
    if (
      !confirm(
        `¿Desactivar a "${barbero.nombre}"? Las reservas históricas se mantienen pero no podrá recibir nuevas reservas.`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("barberos")
        .update({ activo: false })
        .eq("id", barbero.id);

      if (error) throw error;
      mostrarMensaje("success", "✅ Barbero desactivado");
      cargarBarberos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Barberos del equipo</h2>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
        >
          <Plus size={18} />
          Nuevo barbero
        </button>
      </div>

      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-4 flex items-center gap-3 ${
            mensaje.tipo === "success"
              ? "bg-green-900 border border-green-700 text-green-200"
              : "bg-red-900 border border-red-700 text-red-200"
          }`}
        >
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className="text-stone-400">Cargando barberos...</p>
      ) : (
        <div className="space-y-3">
          {barberos.length === 0 ? (
            <div className="bg-stone-900 border border-stone-700 rounded p-8 text-center">
              <User size={48} className="mx-auto mb-3 text-stone-600" />
              <p className="text-stone-400 mb-4">No hay barberos aún</p>
              <button
                onClick={abrirCrear}
                className="bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
              >
                Agregar primer barbero
              </button>
            </div>
          ) : (
            barberos.map((b) => (
              <div
                key={b.id}
                className={`bg-stone-900 border border-stone-700 rounded p-4 flex flex-wrap justify-between items-center gap-3 ${
                  !b.activo && "opacity-50"
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={24} className="text-amber-200" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{b.nombre}</h3>
                      {!b.activo && (
                        <span className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-stone-400 text-sm">
                      {b.especialidad || "Barbero"}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {b.horario_inicio?.slice(0, 5) || "--"} -{" "}
                        {b.horario_fin?.slice(0, 5) || "--"}
                      </span>
                      {b.usuario?.email && <span>📧 {b.usuario.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEditar(b)}
                    className="p-2 bg-stone-800 hover:bg-stone-700 rounded"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  {b.activo && (
                    <button
                      onClick={() => eliminar(b)}
                      className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded"
                      title="Desactivar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={editando ? "Editar barbero" : "Nuevo barbero"}
        footer={
          <>
            <button
              onClick={cerrarModal}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm"
            >
              {editando ? "Actualizar" : "Crear barbero"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Datos del barbero */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Vicente"
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Especialidad{" "}
              <span className="text-stone-400 text-xs font-normal">
                (opcional)
              </span>
            </label>
            <input
              type="text"
              value={form.especialidad}
              onChange={(e) =>
                setForm({ ...form, especialidad: e.target.value })
              }
              placeholder="Ej: Cortes clásicos"
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Inicio jornada <span className="text-red-400">*</span>
              </label>
              <SelectorHora value={form.horario_inicio || "09:00"} onChange={(v) => setForm({ ...form, horario_inicio: v })}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Fin jornada <span className="text-red-400">*</span>
              </label>
              <SelectorHora value={form.horario_fin || "19:00"} onChange={(v) => setForm({ ...form, horario_fin: v })}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
          </div>

          {/* Credenciales (solo al crear) */}
          {!editando && (
            <div className="border-t border-stone-700 pt-4 mt-4">
              <h4 className="font-bold mb-3 text-amber-200">
                🔐 Credenciales de acceso
              </h4>
              <p className="text-stone-400 text-xs mb-3">
                El barbero usará estos datos para hacer login en el sistema
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Email para login <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="vicente@twins.cl"
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
                  />
                  <p className="text-stone-400 text-xs mt-1">
                    💡 Comunícale al barbero su contraseña por privado
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
