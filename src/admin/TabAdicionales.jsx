import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Check, AlertCircle, Sparkles } from "lucide-react";
import { Modal } from "../components/Modal";

export function TabAdicionales({ supabase, barberiaId }) {
  const [adicionales, setAdicionales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    duracion_minutos: "",
  });

  useEffect(() => {
    cargarAdicionales();
  }, []);

  const cargarAdicionales = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("servicios_adicionales")
        .select("*")
        .eq("barberia_id", barberiaId)
        .order("precio", { ascending: true });

      if (!error) setAdicionales(data || []);
    } catch (err) {
      console.error("Error cargando adicionales:", err);
    }
    setCargando(false);
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({ nombre: "", precio: "", duracion_minutos: "" });
    setModalAbierto(true);
  };

  const abrirEditar = (adicional) => {
    setEditando(adicional);
    setForm({
      nombre: adicional.nombre,
      precio: adicional.precio.toString(),
      duracion_minutos: adicional.duracion_minutos.toString(),
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      mostrarMensaje("error", "El nombre es obligatorio");
      return;
    }
    if (!form.precio || Number(form.precio) <= 0) {
      mostrarMensaje("error", "El precio debe ser mayor a 0");
      return;
    }
    if (!form.duracion_minutos || Number(form.duracion_minutos) <= 0) {
      mostrarMensaje("error", "La duración debe ser mayor a 0");
      return;
    }

    try {
      if (editando) {
        const { error } = await supabase
          .from("servicios_adicionales")
          .update({
            nombre: form.nombre.trim(),
            precio: Number(form.precio),
            duracion_minutos: Number(form.duracion_minutos),
          })
          .eq("id", editando.id);

        if (error) throw error;
        mostrarMensaje("success", "✅ Adicional actualizado");
      } else {
        const nuevoId = `a-${Date.now()}`;
        const { error } = await supabase.from("servicios_adicionales").insert({
          id: nuevoId,
          barberia_id: barberiaId,
          nombre: form.nombre.trim(),
          precio: Number(form.precio),
          duracion_minutos: Number(form.duracion_minutos),
          activo: true,
        });

        if (error) throw error;
        mostrarMensaje("success", "✅ Adicional creado");
      }

      cerrarModal();
      cargarAdicionales();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const eliminar = async (adicional) => {
    if (
      !confirm(
        `¿Desactivar "${adicional.nombre}"? Las reservas históricas se mantienen.`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("servicios_adicionales")
        .update({ activo: false })
        .eq("id", adicional.id);

      if (error) throw error;
      mostrarMensaje("success", "✅ Adicional desactivado");
      cargarAdicionales();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Servicios Adicionales</h2>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
        >
          <Plus size={18} />
          Nuevo adicional
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
        <p className="text-stone-400">Cargando adicionales...</p>
      ) : (
        <div className="space-y-3">
          {adicionales.length === 0 ? (
            <div className="bg-stone-900 border border-stone-700 rounded p-8 text-center">
              <Sparkles size={48} className="mx-auto mb-3 text-stone-600" />
              <p className="text-stone-400 mb-4">No hay adicionales aún</p>
              <button
                onClick={abrirCrear}
                className="bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
              >
                Crear primero
              </button>
            </div>
          ) : (
            adicionales.map((a) => (
              <div
                key={a.id}
                className={`bg-stone-900 border border-stone-700 rounded p-4 flex flex-wrap justify-between items-center gap-3 ${
                  !a.activo && "opacity-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{a.nombre}</h3>
                    {!a.activo && (
                      <span className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 text-sm">
                    ⏱️ {a.duracion_minutos} min · 💰 $
                    {a.precio.toLocaleString("es-CL")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEditar(a)}
                    className="p-2 bg-stone-800 hover:bg-stone-700 rounded"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  {a.activo && (
                    <button
                      onClick={() => eliminar(a)}
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
        title={editando ? "Editar adicional" : "Nuevo adicional"}
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
              {editando ? "Actualizar" : "Crear"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Nombre del adicional <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Arreglo de barba"
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Precio (CLP) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="5000"
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Duración (minutos) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={form.duracion_minutos}
              onChange={(e) =>
                setForm({ ...form, duracion_minutos: e.target.value })
              }
              placeholder="15"
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
