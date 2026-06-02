import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_HEADER = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const DIAS_KEY    = ["dom","lun","mar","mie","jue","vie","sab"];

export function CalendarioPicker({ value, onChange, horariosSemana }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [mesActual, setMesActual] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const año = mesActual.getFullYear();
  const mes = mesActual.getMonth();
  const primerDia   = new Date(año, mes, 1).getDay();
  const diasEnMes   = new Date(año, mes + 1, 0).getDate();
  const mesHoyBase  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const puedeAtras  = mesActual > mesHoyBase;

  const esDiaActivo = (fecha) => {
    if (!horariosSemana) return true;
    const key = DIAS_KEY[fecha.getDay()];
    return horariosSemana[key]?.activo !== false;
  };

  const handleDia = (d) => {
    const fecha = new Date(año, mes, d);
    fecha.setHours(12, 0, 0, 0);
    if (fecha < hoy || !esDiaActivo(fecha)) return;
    onChange(fecha.toISOString().split("T")[0]);
  };

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 w-full">

      {/* ── Header mes ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMesActual(new Date(año, mes - 1, 1))}
          disabled={!puedeAtras}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-amber-200 font-semibold text-sm capitalize">
          {MESES[mes]} {año}
        </span>

        <button
          onClick={() => setMesActual(new Date(año, mes + 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Cabecera días ── */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_HEADER.map((d) => (
          <div key={d} className="text-center text-xs text-stone-500 font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid días ── */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: primerDia }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: diasEnMes }).map((_, i) => {
          const d        = i + 1;
          const fecha    = new Date(año, mes, d);
          fecha.setHours(12, 0, 0, 0);
          const esPasado = fecha < hoy;
          const esActivo = esDiaActivo(fecha);
          const fechaStr = fecha.toISOString().split("T")[0];
          const esSelec  = value === fechaStr;
          const esHoy    = fecha.toDateString() === hoy.toDateString();
          const disabled = esPasado || !esActivo;

          return (
            <button
              key={d}
              onClick={() => handleDia(d)}
              disabled={disabled}
              className={[
                "aspect-square rounded-lg text-sm transition flex items-center justify-center",
                esSelec
                  ? "bg-amber-200 text-stone-950 font-semibold"
                  : "",
                !esSelec && !disabled
                  ? "hover:bg-stone-700 text-white"
                  : "",
                disabled
                  ? "text-stone-600 cursor-not-allowed"
                  : "",
                esHoy && !esSelec
                  ? "ring-1 ring-amber-200 ring-opacity-60 text-amber-200"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
