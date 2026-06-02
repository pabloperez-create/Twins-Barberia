import React, { useState, useEffect } from "react";
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

const initHorariosSemana = (barbero) => {
  if (barbero?.horarios_semana) return barbero.horarios_semana;
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

export function TabMiHorario({ supabase, barbero, onUpdate, tema: t }) {
  const [horariosSemana, setHorariosSemana] = useState(initHorariosSemana(barbero));
  const [intervalo, setIntervalo] = useState(barbero?.intervalo_minutos || 30);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [servicios, setServicios] = useState([]);
  const [adicionales, setAdicionales] = useState([]);
  const [duraciones, setDuraciones] = useState({});
  const [duracionesAdicionales, setDuracionesAdicionales] = useState({});
  const [guardandoDuraciones, setGuardandoDuraciones] = useState(false);

  useEffect(() => { cargarServiciosYDuraciones(); }, []);

  const cargarServiciosYDuraciones = async () => {
    try {
      const { data: svcs } = await supabase.from("servicios_principales").select("id, nombre, duracion_minutos").eq("barberia_id", barbero.barberia_id).eq("activo", true).order("nombre");
      setServicios(svcs || []);
      const { data: adds } = await supabase.from("servicios_adicionales").select("id, nombre, duracion_minutos").eq("barberia_id", barbero.barberia_id).eq("activo", true).order("nombre");
      setAdicionales(adds || []);
      const { data: durs } = await supabase.from("duraciones_barbero").select("servicio_id, duracion_minutos, tipo").eq("barbero_id", barbero.id);
      const durMap = {}; const durAddMap = {};
      (durs || []).forEach((d) => { if (d.tipo === "adicional") durAddMap[d.servicio_id] = d.duracion_minutos; else durMap[d.servicio_id] = d.duracion_minutos; });
      setDuraciones(durMap);
      setDuracionesAdicionales(durAddMap);
    } catch (err) { console.error("Error cargando servicios:", err); }
  };

  const guardarDuraciones = async () => {
    setGuardandoDuraciones(true);
    try {
      for (const [servicioId, mins] of Object.entries(duraciones)) {
        if (!mins) continue;
        await supabase.from("duraciones_barbero").upsert({ id: `dur-${barbero.id}-${servicioId}`, barberia_id: barbero.barberia_id, barbero_id: barbero.id, servicio_id: servicioId, duracion_minutos: Number(mins), tipo: "servicio" });
      }
      for (const [adicionalId, mins] of Object.entries(duracionesAdicionales)) {
        if (!mins) continue;
        await supabase.from("duraciones_barbero").upsert({ id: `dur-add-${barbero.id}-${adicionalId}`, barberia_id: barbero.barberia_id, barbero_id: barbero.id, servicio_id: adicionalId, duracion_minutos: Number(mins), tipo: "adicional" });
      }
      mostrarMensaje("success", "✅ Duraciones guardadas");
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setGuardandoDuraciones(false);
  };

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  const toggleDia = (dia) => setHorariosSemana((prev) => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }));
  const updateHorarioDia = (dia, campo, valor) => setHorariosSemana((prev) => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }));
  const aplicarATodos = (inicio, fin) => {
    const nuevo = {};
    DIAS.forEach(({ key }) => { nuevo[key] = { ...horariosSemana[key], inicio, fin }; });
    setHorariosSemana(nuevo);
  };

  const validar = () => {
    for (const { key, label } of DIAS) {
      const d = horariosSemana[key];
      if (d.activo && d.inicio >= d.fin) { mostrarMensaje("error", `${label}: la hora de inicio debe ser menor a la de fin`); return false; }
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const diasActivos = DIAS.filter(({ key }) => horariosSemana[key].activo);
      const inicioGeneral = diasActivos.reduce((min, { key }) => horariosSemana[key].inicio < min ? horariosSemana[key].inicio : min, "23:59");
      const finGeneral = diasActivos.reduce((max, { key }) => horariosSemana[key].fin > max ? horariosSemana[key].fin : max, "00:00");
      const { error } = await supabase.from("barberos").update({ horarios_semana: horariosSemana, horario_inicio: inicioGeneral, horario_fin: finGeneral, intervalo_minutos: intervalo }).eq("id", barbero.id);
      if (error) throw error;
      mostrarMensaje("success", "✅ Horario actualizado");
      onUpdate();
    } catch (err) { mostrarMensaje("error", "Error: " + err.message); }
    setGuardando(false);
  };

  const diasActivos = DIAS.filter(({ key }) => horariosSemana[key].activo);
  const primerDiaActivo = diasActivos[0];

  // Toggle color según tema
  const toggleActivo = t.tipo === "salon" ? "bg-pink-500" : "bg-amber-200";
  const toggleInactivo = t.tipo === "salon" ? "bg-pink-200" : "bg-stone-600";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Mi Horario</h2>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-6 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {/* Horario por día */}
      <div className={`${t.bgCard} border ${t.border} rounded p-6 max-w-2xl`}>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Clock size={18} className={t.acento} /> Horario por día de la semana
        </h3>
        <p className={`${t.textoSub} text-sm mb-5`}>Activa los días que trabajas y define el horario de cada uno.</p>

        {primerDiaActivo && (
          <div className={`${t.bgMuted} rounded p-3 mb-5 flex items-center gap-3 flex-wrap`}>
            <span className={`text-sm ${t.textoSub}`}>Aplicar mismo horario a todos los días:</span>
            <button onClick={() => aplicarATodos(horariosSemana[primerDiaActivo.key].inicio, horariosSemana[primerDiaActivo.key].fin)} className={`text-xs px-3 py-1.5 ${t.bgInput} ${t.bgHover} border ${t.border} rounded ${t.acento} font-semibold`}>
              Usar horario de {primerDiaActivo.label}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {DIAS.map(({ key, label }) => {
            const d = horariosSemana[key];
            return (
              <div key={key} className={`rounded border transition ${d.activo ? `border ${t.border} ${t.bgMuted}` : `border ${t.border} ${t.bgCard} opacity-60`}`}>
                <div className="flex items-center gap-3 p-3">
                  <button onClick={() => toggleDia(key)} className={`w-10 h-5 rounded-full transition flex-shrink-0 relative ${d.activo ? toggleActivo : toggleInactivo}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${d.activo ? "left-5" : "left-0.5"}`} />
                  </button>
                  <span className={`w-24 text-sm font-semibold ${d.activo ? t.texto : t.textoMuted}`}>{label}</span>
                  {d.activo ? (
                    <div className="flex items-center gap-2 flex-1">
                      <SelectorHora value={d.inicio} onChange={(v) => updateHorarioDia(key, "inicio", v)} />
                      <span className={`${t.textoMuted} text-xs`}>a</span>
                      <SelectorHora value={d.fin} onChange={(v) => updateHorarioDia(key, "fin", v)} />
                      <span className={`${t.textoMuted} text-xs w-12 text-right`}>
                        {(() => { const h1 = new Date(`2000-01-01 ${d.inicio}`); const h2 = new Date(`2000-01-01 ${d.fin}`); const diff = (h2 - h1) / 3600000; return diff > 0 ? `${diff.toFixed(0)}h` : ""; })()}
                      </span>
                    </div>
                  ) : (
                    <span className={`${t.textoMuted} text-sm italic`}>Día libre</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${t.bgMuted} rounded p-3 mt-4 text-xs ${t.textoSub}`}>
          <span className={`${t.texto} font-semibold`}>Días activos:</span>{" "}
          {diasActivos.length === 0 ? "Ninguno seleccionado" : diasActivos.map(({ label }) => label).join(", ")}
        </div>

        {/* Intervalo */}
        <div className={`${t.bgMuted} rounded p-4 mt-2`}>
          <label className="block text-sm font-semibold mb-2">Intervalo entre citas</label>
          <p className={`${t.textoSub} text-xs mb-3`}>Define cada cuántos minutos aceptas reservas nuevas</p>
          <div className="flex gap-2 flex-wrap">
            {[15, 30, 40, 45, 60, 75, 90].map((min) => (
              <button key={min} onClick={() => setIntervalo(min)} className={`px-4 py-2 rounded text-sm font-semibold transition ${intervalo === min ? t.filtroActivo : t.filtroInactivo}`}>
                {min} min
              </button>
            ))}
          </div>
        </div>

        <button onClick={guardar} disabled={guardando || diasActivos.length === 0} className={`mt-4 flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`}>
          <Save size={16} />{guardando ? "Guardando..." : "Guardar horario"}
        </button>
      </div>

      {/* Duraciones por servicio */}
      {servicios.length > 0 && (
        <div className={`${t.bgCard} border ${t.border} rounded p-6 max-w-2xl mt-6`}>
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Clock size={18} className={t.acento} /> Mi duración por servicio
          </h3>
          <p className={`${t.textoSub} text-sm mb-5`}>Define cuánto tardas en cada servicio. Si lo dejas en blanco se usa la duración general.</p>
          <div className="space-y-3">
            {servicios.map((s) => (
              <div key={s.id} className={`flex items-center gap-4 ${t.bgMuted} rounded p-3`}>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{s.nombre}</p>
                  <p className={`${t.textoMuted} text-xs`}>Duración general: {s.duracion_minutos} min</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={duraciones[s.id] || ""} onChange={(e) => setDuraciones({ ...duraciones, [s.id]: e.target.value })} placeholder={s.duracion_minutos} className={`w-20 ${t.bgInput} border ${t.borderInput} rounded px-3 py-1.5 ${t.texto} text-sm text-center`} min="5" max="480" />
                  <span className={`${t.textoSub} text-sm`}>min</span>
                </div>
              </div>
            ))}
          </div>

          {adicionales.length > 0 && (
            <>
              <p className={`${t.acento} text-xs font-bold uppercase tracking-wider mt-4 mb-2`}>Servicios adicionales</p>
              {adicionales.map((a) => (
                <div key={a.id} className={`flex items-center gap-4 ${t.bgMuted} rounded p-3 mt-2`}>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{a.nombre}</p>
                    <p className={`${t.textoMuted} text-xs`}>Duración general: {a.duracion_minutos} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={duracionesAdicionales[a.id] || ""} onChange={(e) => setDuracionesAdicionales({ ...duracionesAdicionales, [a.id]: e.target.value })} placeholder={a.duracion_minutos} className={`w-20 ${t.bgInput} border ${t.borderInput} rounded px-3 py-1.5 ${t.texto} text-sm text-center`} min="5" max="480" />
                    <span className={`${t.textoSub} text-sm`}>min</span>
                  </div>
                </div>
              ))}
            </>
          )}

          <button onClick={guardarDuraciones} disabled={guardandoDuraciones} className={`mt-4 flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`}>
            <Save size={16} />{guardandoDuraciones ? "Guardando..." : "Guardar duraciones"}
          </button>
        </div>
      )}

      {/* Google Calendar */}
      <div className={`${t.bgCard} border ${t.border} rounded p-6 max-w-2xl mt-6`}>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">📅 Google Calendar</h3>
        <p className={`${t.textoSub} text-sm mb-4`}>Conecta tu Google Calendar para que cada reserva aparezca automáticamente.</p>
        {barbero?.google_calendar_conectado ? (
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <Check size={18} /> Calendario conectado
          </div>
        ) : (
          <a href={`/api/google-calendar-callback?action=authorize&barbero_id=${barbero?.id}`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded">
            Conectar Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
