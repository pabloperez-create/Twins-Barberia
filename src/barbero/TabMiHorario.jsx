import React, { useState } from "react";
import { Save, Check, AlertCircle, Clock } from "lucide-react";

export function TabMiHorario({ supabase, barbero, onUpdate }) {
  const [horario, setHorario] = useState({
    horario_inicio: barbero?.horario_inicio?.slice(0, 5) || "10:00",
    horario_fin: barbero?.horario_fin?.slice(0, 5) || "20:00",
  });

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const guardar = async () => {
    if (!horario.horario_inicio || !horario.horario_fin) {
      mostrarMensaje("error", "Completa los horarios");
      return;
    }
    if (horario.horario_inicio >= horario.horario_fin) {
      mostrarMensaje("error", "El horario de inicio debe ser menor al de fin");
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase
        .from("barberos")
        .update({
          horario_inicio: horario.horario_inicio,
          horario_fin: horario.horario_fin,
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

  // Calcular horas totales de trabajo
  const calcularHorasTrabajo = () => {
    try {
      const inicio = new Date(`2000-01-01 ${horario.horario_inicio}`);
      const fin = new Date(`2000-01-01 ${horario.horario_fin}`);
      const diff = (fin - inicio) / (1000 * 60 * 60);
      return diff > 0 ? diff.toFixed(1) : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Mi Horario</h2>

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

      <div className="bg-stone-900 border border-stone-700 rounded p-6 max-w-2xl">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Clock size={18} /> Horario de trabajo
        </h3>
        <p className="text-stone-400 text-sm mb-4">
          Define tu horario laboral. Los clientes solo podrán reservar dentro de
          este rango.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Hora de inicio <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={horario.horario_inicio}
              onChange={(e) =>
                setHorario({ ...horario, horario_inicio: e.target.value })
              }
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Hora de fin <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={horario.horario_fin}
              onChange={(e) =>
                setHorario({ ...horario, horario_fin: e.target.value })
              }
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
            />
          </div>
        </div>

        <div className="bg-stone-800 border border-stone-700 rounded p-3 mb-4 text-sm">
          <p className="text-stone-400">
            ⏱️ Total de horas:{" "}
            <span className="text-amber-200 font-bold">
              {calcularHorasTrabajo()}h al día
            </span>
          </p>
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
        >
          <Save size={16} />
          {guardando ? "Guardando..." : "Guardar horario"}
        </button>
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded p-6 max-w-2xl mt-6">
        <p className="text-stone-400 text-sm">
          💡 <strong>Próximamente:</strong> Podrás marcar días libres
          específicos, vacaciones y horarios diferentes por día de la semana.
        </p>
      </div>
    </div>
  );
}
