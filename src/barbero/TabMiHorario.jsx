import React, { useState } from "react";
import { Save, Check, AlertCircle, Clock } from "lucide-react";
import { SelectorHora } from "../components/SelectorHora";

const DIAS = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const HORARIO_DEFAULT = { activo: true, inicio: "09:00", fin: "19:00" };
const HORARIO_LIBRE = { activo: false, inicio: "09:00", fin: "19:00" };

const initHorariosSemana = (barbero) => {
  if (barbero?.horarios_semana) return barbero.horarios_semana;
  // Si no tiene horarios por día, usar el horario general como base
  const inicio = barbero?.horario_inicio?.slice(0, 5) || "09:00";
  const fin = barbero?.horario_fin?.slice(0, 5) || "19:00";
  return {
    lun: { activo: true, inicio, fin },
    mar: { activo: true, inicio, fin },
    mie: { activo: true, inicio, fin },
    jue: { activo: true, inicio, fin },
    vie: { activo: true, inicio, fin },
    sab: { activo: true, inicio, fin },
    dom: { activo: false, inicio, fin },
  };
};

export function TabMiHorario({ supabase, barbero, onUpdate }) {
  const [horariosSemana, setHorariosSemana] = useState(initHorariosSemana(barbero));
  const [intervalo, setIntervalo] = useState(barbero?.intervalo_minutos || 30);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const toggleDia = (dia) => {
    setHorariosSemana((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo },
    }));
  };

  const updateHorarioDia = (dia, campo, valor) => {
    setHorariosSemana((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const aplicarATodos = (inicio, fin) => {
    const nuevo = {};
    DIAS.forEach(({ key }) => {
      nuevo[key] = { ...horariosSemana[key], inicio, fin };
    });
    setHorariosSemana(nuevo);
  };

  const validar = () => {
    for (const { key, label } of DIAS) {
      const d = horariosSemana[key];
      if (d.activo && d.inicio >= d.fin) {
        mostrarMensaje("error", `${label}: la hora de inicio debe ser menor a la de fin`);
        return false;
      }
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    try {
      // Calcular horario_inicio y horario_fin generales (el rango más amplio de días activos)
      const diasActivos = DIAS.filter(({ key }) => horariosSemana[key].activo);
      const inicioGeneral = diasActivos.reduce((min, { key }) =>
        horariosSemana[key].inicio < min ? horariosSemana[key].inicio : min,
        "23:59"
      );
      const finGeneral = diasActivos.reduce((max, { key }) =>
        horariosSemana[key].fin > max ? horariosSemana[key].fin : max,
        "00:00"
      );

      const { error } = await supabase
        .from("barberos")
        .update({
          horarios_semana: horariosSemana,
          horario_inicio: inicioGeneral,
          horario_fin: finGeneral,
          intervalo_minutos: intervalo,
        })
        .eq("id", barbero.id);

      if (error) throw error;
      mostrarMensaje("success", "✅ Horario actualizado");
      onUpdate();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setGuardando(false);
  };

  const diasActivos = DIAS.filter(({ key }) => horariosSemana[key].activo);
  const primerDiaActivo = diasActivos[0];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Mi Horario</h2>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-6 flex items-center gap-3 ${
          mensaje.tipo === "success"
            ? "bg-green-900 border border-green-700 text-green-200"
            : "bg-red-900 border border-red-700 text-red-200"
        }`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      <div className="bg-stone-900 border border-stone-700 rounded p-6 max-w-2xl">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Clock size={18} /> Horario por día de la semana
        </h3>
        <p className="text-stone-400 text-sm mb-5">
          Activa los días que trabajas y define el horario de cada uno.
        </p>

        {/* Botón aplicar a todos */}
        {primerDiaActivo && (
          <div className="bg-stone-800 rounded p-3 mb-5 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-stone-400">Aplicar mismo horario a todos los días:</span>
            <button
              onClick={() => aplicarATodos(
                horariosSemana[primerDiaActivo.key].inicio,
                horariosSemana[primerDiaActivo.key].fin
              )}
              className="text-xs px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-amber-200 font-semibold"
            >
              Usar horario de {primerDiaActivo.label}
            </button>
          </div>
        )}

        {/* Días */}
        <div className="space-y-3">
          {DIAS.map(({ key, label }) => {
            const d = horariosSemana[key];
            return (
              <div key={key} className={`rounded border transition ${
                d.activo ? "border-stone-600 bg-stone-800" : "border-stone-700 bg-stone-900 opacity-60"
              }`}>
                <div className="flex items-center gap-3 p-3">
                  {/* Toggle día */}
                  <button
                    onClick={() => toggleDia(key)}
                    className={`w-10 h-5 rounded-full transition flex-shrink-0 relative ${
                      d.activo ? "bg-amber-200" : "bg-stone-600"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      d.activo ? "left-5" : "left-0.5"
                    }`} />
                  </button>

                  <span className={`w-24 text-sm font-semibold ${d.activo ? "text-white" : "text-stone-500"}`}>
                    {label}
                  </span>

                  {d.activo ? (
                    <div className="flex items-center gap-2 flex-1">
                      <SelectorHora value={d.inicio} onChange={(v) => updateHorarioDia(key, "inicio", v)} />
                      <span className="text-stone-500 text-xs">a</span>
                      <SelectorHora value={d.fin} onChange={(v) => updateHorarioDia(key, "fin", v)} />
                      <span className="text-stone-500 text-xs w-12 text-right">
                        {(() => {
                          const h1 = new Date(`2000-01-01 ${d.inicio}`);
                          const h2 = new Date(`2000-01-01 ${d.fin}`);
                          const diff = (h2 - h1) / 3600000;
                          return diff > 0 ? `${diff.toFixed(0)}h` : "";
                        })()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-stone-500 text-sm italic">Día libre</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen */}
        <div className="bg-stone-800 rounded p-3 mt-4 text-xs text-stone-400">
          <span className="text-white font-semibold">Días activos:</span>{" "}
          {diasActivos.length === 0
            ? "Ninguno seleccionado"
            : diasActivos.map(({ label }) => label).join(", ")}
        </div>

        {/* Intervalo entre citas */}
        <div className="bg-stone-800 rounded p-4 mt-2">
          <label className="block text-sm font-semibold mb-2">Intervalo entre citas</label>
          <p className="text-stone-400 text-xs mb-3">Define cada cuántos minutos aceptas reservas nuevas</p>
          <div className="flex gap-2 flex-wrap">
            {[15, 20, 30, 45, 60, 90].map((min) => (
              <button
                key={min}
                onClick={() => setIntervalo(min)}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  intervalo === min
                    ? "bg-amber-200 text-stone-950"
                    : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={guardar}
          disabled={guardando || diasActivos.length === 0}
          className="mt-4 flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
        >
          <Save size={16} />
          {guardando ? "Guardando..." : "Guardar horario"}
        </button>
      </div>
    </div>
  );
}
