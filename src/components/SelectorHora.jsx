import React from "react";

export function SelectorHora({ value, onChange, className = "" }) {
  const parts = (value || "09:00").split(":");
  const hora = parts[0] || "09";
  const minutos = parts[1] || "00";

  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const mins = ["00", "15", "30", "45"];

  return (
    <div className={`flex items-center bg-stone-800 border border-stone-700 rounded overflow-hidden ${className}`}>
      <select
        value={hora}
        onChange={(e) => onChange(`${e.target.value}:${minutos}`)}
        className="bg-transparent px-3 py-2 text-white text-sm outline-none"
      >
        {horas.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-stone-500 font-bold">:</span>
      <select
        value={mins.includes(minutos) ? minutos : "00"}
        onChange={(e) => onChange(`${hora}:${e.target.value}`)}
        className="bg-transparent px-3 py-2 text-white text-sm outline-none"
      >
        {mins.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
