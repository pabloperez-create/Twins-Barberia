import React from "react";
import { Download, Check } from "lucide-react";
import { usePWA } from "../utils/usePWA";

export function BotonInstalarApp() {
  const { puedeInstalar, instalada, instalar } = usePWA();

  if (instalada) {
    return (
      <div className="flex items-center gap-1.5 text-green-400 text-xs px-3 py-1.5">
        <Check size={13} />
        App instalada
      </div>
    );
  }

  if (!puedeInstalar) return null;

  return (
    <button
      onClick={instalar}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-200 bg-opacity-10 hover:bg-opacity-20 text-amber-200 border border-amber-200 border-opacity-30 rounded transition"
    >
      <Download size={13} />
      Instalar app
    </button>
  );
}
