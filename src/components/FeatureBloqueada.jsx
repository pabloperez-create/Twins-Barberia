import React from "react";
import { Lock, ArrowUp } from "lucide-react";
import {
  getFeatureNombre,
  getFeatureDescripcion,
  getPlanMinimoFeature,
  PLANES,
} from "../utils/features";

/**
 * Componente que se muestra cuando una feature está bloqueada por el plan actual
 * Props:
 *   - featureName: nombre de la feature (ej: "whatsapp_recordatorios")
 *   - planActual: plan que tiene la barbería (ej: "base")
 *   - compacto: boolean - versión más pequeña (default: false)
 */
export function FeatureBloqueada({ featureName, planActual = "base", compacto = false }) {
  const nombre = getFeatureNombre(featureName);
  const descripcion = getFeatureDescripcion(featureName);
  const planMinimo = getPlanMinimoFeature(featureName);
  const planRequerido = PLANES[planMinimo];

  if (compacto) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded p-4 text-center">
        <Lock size={24} className="mx-auto mb-2 text-stone-500" />
        <p className="text-sm text-stone-300 font-semibold mb-1">{nombre}</p>
        <p className="text-xs text-stone-500 mb-3">
          Disponible en {planRequerido?.nombre || "plan superior"}
        </p>
        <button
          onClick={() =>
            alert(
              `Para activar "${nombre}" contacta a tu administrador o sube al ${planRequerido?.nombre}`,
            )
          }
          className="inline-flex items-center gap-1 text-xs bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-3 py-1.5 rounded"
        >
          <ArrowUp size={12} />
          Actualizar plan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-950 border-2 border-dashed border-stone-700 rounded-lg p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-800 rounded-full mb-4">
        <Lock size={28} className="text-amber-200" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{nombre}</h3>
      <p className="text-stone-400 text-sm mb-4 max-w-md mx-auto">
        {descripcion}
      </p>

      <div className="inline-block bg-stone-800 border border-stone-700 rounded-full px-4 py-2 mb-6">
        <p className="text-sm text-amber-200">
          🔒 Disponible en <strong>{planRequerido?.nombre || "plan superior"}</strong>
        </p>
      </div>

      <div>
        <button
          onClick={() =>
            alert(
              `Para activar "${nombre}" contacta a tu administrador o sube al ${planRequerido?.nombre}`,
            )
          }
          className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-6 py-3 rounded-lg transition"
        >
          <ArrowUp size={16} />
          Actualizar a {planRequerido?.nombre}
        </button>
      </div>

      <p className="text-stone-500 text-xs mt-4">
        Tu plan actual: <span className="text-stone-300 capitalize">{planActual}</span>
      </p>
    </div>
  );
}
