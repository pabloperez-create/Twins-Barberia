import React, { useState, useEffect } from "react";
import {
  LogOut,
  Building,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  AlertCircle,
  Check,
  Crown,
  Settings,
} from "lucide-react";
import { FEATURES, PLANES, calcularPrecioPlan } from "./utils/features";

export function VistaSuperAdmin({ usuario, onLogout, supabase }) {
  const [barberias, setBarberias] = useState([]);
  const [barberosCount, setBarberosCount] = useState({}); // {barberia_id: count}
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [editandoFeatures, setEditandoFeatures] = useState(null); // barberia_id

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

      // Contar barberos por barbería
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
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  // Toggle de una feature
  const toggleFeature = async (barberia, featureName) => {
    try {
      const features = barberia.configuracion?.features || {};
      const nuevoValor = !features[featureName];

      const nuevaConfig = {
        ...barberia.configuracion,
        features: {
          ...features,
          [featureName]: nuevoValor,
        },
      };

      const { error } = await supabase
        .from("barberia")
        .update({ configuracion: nuevaConfig })
        .eq("id", barberia.id);

      if (error) throw error;

      mostrarMensaje(
        "success",
        `${nuevoValor ? "✅ Activada" : "❌ Desactivada"} - ${FEATURES[featureName]?.nombre}`,
      );
      cargarBarberias();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  // Cambiar plan de la barbería
  const cambiarPlan = async (barberia, nuevoPlan) => {
    if (!confirm(`¿Cambiar plan de "${barberia.nombre}" a ${PLANES[nuevoPlan].nombre}?`))
      return;

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

  // Activar todas las features de un plan
  const activarFeaturesPlan = async (barberia, plan) => {
    if (!confirm(`¿Activar todas las features del ${PLANES[plan].nombre}?`)) return;

    try {
      const features = {};
      // Activar features según jerarquía
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

      const nuevaConfig = {
        ...barberia.configuracion,
        features,
      };

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

  // Calcular ingresos totales estimados de todas las barberías
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
          {mensaje.tipo === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
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
          <p className="text-3xl font-bold">{barberias.length}</p>
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

      {/* Lista de barberías */}
      <h2 className="text-2xl font-bold mb-4">Barberías</h2>

      <div className="space-y-4">
        {barberias.map((b) => {
          const cantBarberos = barberosCount[b.id] || 0;
          const precio = calcularPrecioPlan(b.plan, cantBarberos);
          const features = b.configuracion?.features || {};
          const planActual = PLANES[b.plan] || PLANES.base;
          const estaEditando = editandoFeatures === b.id;

          return (
            <div
              key={b.id}
              className="bg-stone-900 border border-stone-700 rounded-lg p-6"
            >
              {/* Info principal */}
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{b.nombre}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        b.plan === "pro"
                          ? "bg-violet-900 text-violet-200"
                          : b.plan === "plus"
                            ? "bg-amber-900 text-amber-200"
                            : "bg-stone-700 text-stone-300"
                      }`}
                    >
                      {planActual.nombre.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        b.estado === "activo"
                          ? "bg-green-900 text-green-200"
                          : "bg-red-900 text-red-200"
                      }`}
                    >
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

              {/* Botones de plan */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-stone-700">
                <span className="text-sm text-stone-400 mr-2 py-1">
                  Cambiar plan:
                </span>
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
                  title="Reset: activa solo las features del plan actual"
                >
                  Reset features según plan
                </button>
              </div>

              {/* Toggle editar features */}
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

              {/* Grid de features */}
              {estaEditando && (
                <div className="bg-stone-950 border border-stone-700 rounded p-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(FEATURES).map(([key, def]) => {
                      const activa = features[key] === true;
                      const planColor =
                        def.plan_minimo === "pro"
                          ? "text-violet-400"
                          : def.plan_minimo === "plus"
                            ? "text-amber-400"
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
                            <CheckCircle
                              size={16}
                              className="text-green-400 flex-shrink-0 mt-0.5"
                            />
                          ) : (
                            <XCircle
                              size={16}
                              className="text-stone-500 flex-shrink-0 mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold ${
                                activa ? "text-green-200" : "text-stone-300"
                              }`}
                            >
                              {def.nombre}
                            </p>
                            <p className="text-xs text-stone-500 truncate">
                              {def.descripcion}
                            </p>
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
          💡 <strong>Tip:</strong> Los cambios se aplican cuando el usuario hace
          logout y login nuevamente. "Reset features según plan" activa solo las
          features incluidas en el plan actual.
        </p>
      </div>
    </div>
  );
}
