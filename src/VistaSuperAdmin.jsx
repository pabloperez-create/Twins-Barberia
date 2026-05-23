import React, { useState, useEffect } from "react";
import {
  LogOut,
  Building,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Save,
  AlertCircle,
  Check,
  Crown,
  Settings,
  Plus,
  X,
  PowerOff,
} from "lucide-react";
import { FEATURES, PLANES, calcularPrecioPlan } from "./utils/features";

const FEATURES_POR_PLAN = {
  base: ["email_confirmacion", "email_recordatorio", "multi_barberos", "calendario_admin", "bloqueos_horarios"],
  plus: ["email_confirmacion", "email_recordatorio", "multi_barberos", "calendario_admin", "bloqueos_horarios", "whatsapp_recordatorios", "stats_avanzadas", "reasignacion_barberos"],
  pro:  Object.keys(FEATURES),
};

const FORM_INICIAL = {
  nombre: "",
  email_admin: "",
  password: "",
  telefono: "",
  whatsapp: "",
  direccion: "",
  instagram: "",
  plan: "base",
};

const InputField = ({ label, campo, type = "text", placeholder, requerido, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-semibold mb-1">
      {label} {requerido && <span className="text-red-400">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-stone-800 border rounded px-3 py-2 text-white text-sm ${
        error ? "border-red-500" : "border-stone-700"
      }`}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export function VistaSuperAdmin({ usuario, onLogout, supabase }) {
  const [barberias, setBarberias] = useState([]);
  const [barberosCount, setBarberosCount] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [editandoFeatures, setEditandoFeatures] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("activo"); // activo | inactivo | todos
  const [busqueda, setBusqueda] = useState("");

  // Modal nueva barbería
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [erroresForm, setErroresForm] = useState({});

  useEffect(() => {
    cargarBarberias();
  }, []);

  const cargarBarberias = async () => {
    setCargando(true);
    try {
      const { data: brbs } = await supabase
        .from("barberia")
        .select("*")
        .order("nombre");

      const { data: barberos } = await supabase
        .from("barberos")
        .select("barberia_id")
        .eq("activo", true);

      const counts = {};
      (barberos || []).forEach((b) => {
        counts[b.barberia_id] = (counts[b.barberia_id] || 0) + 1;
      });

      setBarberias(brbs || []);
      setBarberosCount(counts);
    } catch (err) {
      console.error("Error cargando barberías:", err);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
  };

  const validarForm = () => {
    const errores = {};
    if (!form.nombre.trim()) errores.nombre = "Requerido";
    if (!form.email_admin.trim()) errores.email_admin = "Requerido";
    if (!/\S+@\S+\.\S+/.test(form.email_admin)) errores.email_admin = "Email inválido";
    if (!form.password.trim()) errores.password = "Requerido";
    if (form.password.length < 6) errores.password = "Mínimo 6 caracteres";
    if (!form.telefono.trim()) errores.telefono = "Requerido";
    setErroresForm(errores);
    return Object.keys(errores).length === 0;
  };

  const crearBarberia = async () => {
    if (!validarForm()) return;
    setCreando(true);

    try {
      // 1. Generar ID para la barbería
      const barberiaId = `b-${Date.now()}`;

      // 2. Construir features según plan
      const featuresActivas = {};
      Object.keys(FEATURES).forEach((key) => {
        featuresActivas[key] = (FEATURES_POR_PLAN[form.plan] || []).includes(key);
      });

      // 3. Insertar barbería
      const { error: errorBarberia } = await supabase.from("barberia").insert({
        id: barberiaId,
        nombre: form.nombre.trim(),
        email_admin: form.email_admin.trim().toLowerCase(),
        plan: form.plan,
        estado: "activo",
        configuracion: {
          telefono: form.telefono.trim(),
          whatsapp: form.whatsapp.trim() || null,
          direccion: form.direccion.trim() || null,
          instagram: form.instagram.trim() || null,
          features: featuresActivas,
        },
      });

      if (errorBarberia) throw new Error("Error creando barbería: " + errorBarberia.message);

      // 4. Insertar usuario admin
      const usuarioId = `u-${Date.now()}`;
      const { error: errorUsuario } = await supabase.from("usuarios").insert({
        id: usuarioId,
        barberia_id: barberiaId,
        nombre: form.nombre.trim() + " Admin",
        email: form.email_admin.trim().toLowerCase(),
        password_hash: form.password.trim(),
        rol: "admin",
      });

      if (errorUsuario) throw new Error("Barbería creada pero error en usuario: " + errorUsuario.message);

      // Éxito
      mostrarMensaje("success", `✅ Barbería "${form.nombre}" creada con plan ${PLANES[form.plan].nombre}`);
      setModalAbierto(false);
      setForm(FORM_INICIAL);
      setErroresForm({});
      cargarBarberias();

    } catch (err) {
      mostrarMensaje("error", err.message);
    }
    setCreando(false);
  };


  const handleFormChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (erroresForm[campo]) setErroresForm((prev) => ({ ...prev, [campo]: "" }));
  };
  const toggleFeature = async (barberia, featureName) => {
    try {
      const features = barberia.configuracion?.features || {};
      const nuevoValor = !features[featureName];
      const nuevaConfig = {
        ...barberia.configuracion,
        features: { ...features, [featureName]: nuevoValor },
      };
      const { error } = await supabase
        .from("barberia")
        .update({ configuracion: nuevaConfig })
        .eq("id", barberia.id);
      if (error) throw error;
      mostrarMensaje("success", `${nuevoValor ? "✅ Activada" : "❌ Desactivada"} - ${FEATURES[featureName]?.nombre}`);
      cargarBarberias();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const cambiarPlan = async (barberia, nuevoPlan) => {
    if (!confirm(`¿Cambiar plan de "${barberia.nombre}" a ${PLANES[nuevoPlan].nombre}?`)) return;
    try {
      const { error } = await supabase
        .from("barberia")
        .update({ plan: nuevoPlan })
        .eq("id", barberia.id);
      if (error) throw error;
      mostrarMensaje("success", `✅ Plan cambiado a ${PLANES[nuevoPlan].nombre}`);
      cargarBarberias();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const activarFeaturesPlan = async (barberia, plan) => {
    if (!confirm(`¿Activar todas las features del ${PLANES[plan].nombre}?`)) return;
    try {
      const features = {};
      Object.entries(FEATURES).forEach(([key, def]) => {
        const planMinimo = def.plan_minimo;
        if (
          plan === "pro" ||
          (plan === "plus" && (planMinimo === "base" || planMinimo === "plus")) ||
          (plan === "base" && planMinimo === "base")
        ) {
          features[key] = true;
        } else {
          features[key] = false;
        }
      });
      const nuevaConfig = { ...barberia.configuracion, features };
      const { error } = await supabase
        .from("barberia")
        .update({ configuracion: nuevaConfig, plan })
        .eq("id", barberia.id);
      if (error) throw error;
      mostrarMensaje("success", `✅ Features del ${PLANES[plan].nombre} activadas`);
      cargarBarberias();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const toggleEstado = async (barberia) => {
    const nuevoEstado = barberia.estado === "activo" ? "inactivo" : "activo";
    const accion = nuevoEstado === "inactivo" ? "dar de baja" : "reactivar";
    if (!confirm(`¿Deseas ${accion} "${barberia.nombre}"?`)) return;
    try {
      const { error } = await supabase
        .from("barberia")
        .update({ estado: nuevoEstado })
        .eq("id", barberia.id);
      if (error) throw error;
      mostrarMensaje("success", `${nuevoEstado === "activo" ? "✅ Reactivada" : "⏸ Dada de baja"}: ${barberia.nombre}`);
      cargarBarberias();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const calcularIngresosTotales = () => {
    return barberias.reduce((total, b) => {
      const cantBarberos = barberosCount[b.id] || 0;
      return total + calcularPrecioPlan(b.plan, cantBarberos);
    }, 0);
  };


  if (cargando) {
    return (
      <div className="min-h-screen bg-stone-950 text-white p-6 flex items-center justify-center">
        <p>Cargando panel super-admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-200 bg-opacity-20 rounded">
            <Crown size={28} className="text-amber-200" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Super Admin</h1>
            <p className="text-stone-400 text-sm">
              {usuario?.nombre} · Gestión SaaS global
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-6 flex items-center gap-3 ${
            mensaje.tipo === "success"
              ? "bg-green-900 border border-green-700 text-green-200"
              : "bg-red-900 border border-red-700 text-red-200"
          }`}
        >
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <div className="flex items-center gap-3 mb-2">
            <Building size={20} className="text-blue-400" />
            <p className="text-stone-400 text-sm">Barberías totales</p>
          </div>
          <p className="text-3xl font-bold">{barberias.filter(b => b.estado === "activo").length}</p>
          <p className="text-stone-400 text-xs">{barberias.filter(b => b.estado === "inactivo").length} inactivas</p>
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-violet-400" />
            <p className="text-stone-400 text-sm">Barberos totales</p>
          </div>
          <p className="text-3xl font-bold">
            {Object.values(barberosCount).reduce((sum, c) => sum + c, 0)}
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-green-400" />
            <p className="text-stone-400 text-sm">Ingresos mensuales estimados</p>
          </div>
          <p className="text-3xl font-bold text-green-400">
            ${calcularIngresosTotales().toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* Header barberías + botón nueva */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Barberías</h2>
        <button
          onClick={() => { setModalAbierto(true); setForm(FORM_INICIAL); setErroresForm({}); }}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
        >
          <Plus size={18} />
          Nueva barbería
        </button>
      </div>

      {/* Buscador + filtro estado */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 min-w-48 bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
        />
        <div className="flex bg-stone-900 border border-stone-700 rounded overflow-hidden">
          {[
            { key: "activo", label: "Activas" },
            { key: "inactivo", label: "Inactivas" },
            { key: "todos", label: "Todas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={`px-4 py-2 text-sm transition ${
                filtroEstado === f.key
                  ? "bg-amber-200 text-stone-950 font-bold"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de barberías */}
      <div className="space-y-4">
        {barberias
          .filter((b) => {
            const coincideEstado = filtroEstado === "todos" || b.estado === filtroEstado;
            const texto = busqueda.toLowerCase();
            const coincideBusqueda =
              !texto ||
              b.nombre?.toLowerCase().includes(texto) ||
              b.email_admin?.toLowerCase().includes(texto);
            return coincideEstado && coincideBusqueda;
          })
          .map((b) => {
          const cantBarberos = barberosCount[b.id] || 0;
          const precio = calcularPrecioPlan(b.plan, cantBarberos);
          const features = b.configuracion?.features || {};
          const planActual = PLANES[b.plan] || PLANES.base;
          const estaEditando = editandoFeatures === b.id;

          return (
            <div key={b.id} className="bg-stone-900 border border-stone-700 rounded-lg p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{b.nombre}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      b.plan === "pro" ? "bg-violet-900 text-violet-200"
                      : b.plan === "plus" ? "bg-amber-900 text-amber-200"
                      : "bg-stone-700 text-stone-300"
                    }`}>
                      {planActual.nombre.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      b.estado === "activo" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
                    }`}>
                      {b.estado}
                    </span>
                  </div>
                  <p className="text-stone-400 text-sm">
                    {b.email_admin} · {cantBarberos} barberos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-stone-400 text-xs">Ingresos/mes</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${precio.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>

              {/* Botones plan */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-stone-700">
                <span className="text-sm text-stone-400 mr-2 py-1">Cambiar plan:</span>
                {Object.entries(PLANES).map(([planKey, planInfo]) => (
                  <button
                    key={planKey}
                    onClick={() => cambiarPlan(b, planKey)}
                    disabled={b.plan === planKey}
                    className={`text-xs font-semibold px-3 py-1 rounded transition ${
                      b.plan === planKey
                        ? "bg-amber-200 text-stone-950 cursor-default"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                    }`}
                  >
                    {planInfo.nombre}
                  </button>
                ))}
                <button
                  onClick={() => activarFeaturesPlan(b, b.plan)}
                  className="text-xs font-semibold px-3 py-1 rounded bg-blue-900 hover:bg-blue-800 text-blue-200 ml-auto"
                >
                  Reset features según plan
                </button>
                <button
                  onClick={() => toggleEstado(b)}
                  className={`text-xs font-semibold px-3 py-1 rounded flex items-center gap-1 transition ${
                    b.estado === "activo"
                      ? "bg-red-900 hover:bg-red-800 text-red-200"
                      : "bg-green-900 hover:bg-green-800 text-green-200"
                  }`}
                >
                  <PowerOff size={12} />
                  {b.estado === "activo" ? "Dar de baja" : "Reactivar"}
                </button>
              </div>

              {/* Toggle features */}
              <button
                onClick={() => setEditandoFeatures(estaEditando ? null : b.id)}
                className="flex items-center gap-2 text-sm bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded mb-3"
              >
                <Settings size={14} />
                {estaEditando ? "Cerrar features" : "Gestionar features"}
                <span className="text-xs text-stone-400">
                  ({Object.values(features).filter(Boolean).length} activas)
                </span>
              </button>

              {estaEditando && (
                <div className="bg-stone-950 border border-stone-700 rounded p-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(FEATURES).map(([key, def]) => {
                      const activa = features[key] === true;
                      const planColor =
                        def.plan_minimo === "pro" ? "text-violet-400"
                        : def.plan_minimo === "plus" ? "text-amber-400"
                        : "text-stone-400";
                      return (
                        <button
                          key={key}
                          onClick={() => toggleFeature(b, key)}
                          className={`flex items-start gap-2 text-left p-3 rounded transition ${
                            activa
                              ? "bg-green-900 bg-opacity-30 border border-green-700"
                              : "bg-stone-800 border border-stone-700 hover:bg-stone-700"
                          }`}
                        >
                          {activa ? (
                            <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle size={16} className="text-stone-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${activa ? "text-green-200" : "text-stone-300"}`}>
                              {def.nombre}
                            </p>
                            <p className="text-xs text-stone-500 truncate">{def.descripcion}</p>
                            <p className={`text-xs mt-1 ${planColor}`}>
                              Plan mínimo: {def.plan_minimo.toUpperCase()}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-stone-900 border border-stone-700 rounded p-4">
        <p className="text-stone-400 text-sm">
          💡 <strong>Tip:</strong> Los cambios se aplican cuando el usuario hace logout y login nuevamente.
          "Reset features según plan" activa solo las features incluidas en el plan actual.
        </p>
      </div>

      {/* ── MODAL NUEVA BARBERÍA ── */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-stone-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200 bg-opacity-20 rounded">
                  <Building size={20} className="text-amber-200" />
                </div>
                <h3 className="text-lg font-bold">Nueva Barbería</h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-2 hover:bg-stone-800 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body modal */}
            <div className="p-6 space-y-4">

              {/* Plan primero — afecta features */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Plan <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLANES).map(([planKey, planInfo]) => (
                    <button
                      key={planKey}
                      onClick={() => setForm({ ...form, plan: planKey })}
                      className={`p-3 rounded border-2 text-center transition ${
                        form.plan === planKey
                          ? "border-amber-200 bg-amber-200 bg-opacity-10"
                          : "border-stone-700 hover:border-stone-600"
                      }`}
                    >
                      <p className="font-bold text-sm">{planInfo.nombre}</p>
                      <p className="text-xs text-stone-400">${planInfo.precio_base}/mes</p>
                    </button>
                  ))}
                </div>
                <p className="text-stone-500 text-xs mt-2">
                  Features se activan automáticamente según el plan elegido
                </p>
              </div>

              <div className="border-t border-stone-700 pt-4 space-y-4">
                <InputField label="Nombre de la barbería" campo="nombre" placeholder="Ej: Twins Barbería" requerido value={form.nombre} onChange={(e) => handleFormChange("nombre", e.target.value)} error={erroresForm.nombre} />
                <InputField label="Email del admin" campo="email_admin" type="email" placeholder="admin@barberia.cl" requerido value={form.email_admin} onChange={(e) => handleFormChange("email_admin", e.target.value)} error={erroresForm.email_admin} />
                <InputField label="Contraseña inicial" campo="password" type="password" placeholder="Mínimo 6 caracteres" requerido value={form.password} onChange={(e) => handleFormChange("password", e.target.value)} error={erroresForm.password} />
                <InputField label="Teléfono" campo="telefono" placeholder="56912345678" requerido value={form.telefono} onChange={(e) => handleFormChange("telefono", e.target.value)} error={erroresForm.telefono} />
              </div>

              <div className="border-t border-stone-700 pt-4 space-y-4">
                <p className="text-stone-400 text-xs uppercase tracking-wider">Opcionales</p>
                <InputField label="WhatsApp" campo="whatsapp" placeholder="56912345678" value={form.whatsapp} onChange={(e) => handleFormChange("whatsapp", e.target.value)} />
                <InputField label="Dirección" campo="direccion" placeholder="Av. Providencia 123, Santiago" value={form.direccion} onChange={(e) => handleFormChange("direccion", e.target.value)} />
                <InputField label="Instagram" campo="instagram" placeholder="@twinsbarberiacl" value={form.instagram} onChange={(e) => handleFormChange("instagram", e.target.value)} />
              </div>

              {/* Resumen features */}
              <div className="bg-stone-950 border border-stone-700 rounded p-3">
                <p className="text-xs text-stone-400 mb-2 uppercase tracking-wider">
                  Features que se activarán ({(FEATURES_POR_PLAN[form.plan] || []).length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {(FEATURES_POR_PLAN[form.plan] || []).map((key) => (
                    <span key={key} className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded">
                      {FEATURES[key]?.nombre || key}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex gap-3 p-6 border-t border-stone-700">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={crearBarberia}
                disabled={creando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
              >
                <Save size={16} />
                {creando ? "Creando..." : "Crear barbería"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
