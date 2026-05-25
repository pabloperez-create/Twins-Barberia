import React, { useState, useEffect } from "react";
import { LogOut, Crown } from "lucide-react";
import { TabAgenda } from "./admin/TabAgenda";
import { TabConfiguracion } from "./admin/TabConfiguracion";
import { TabServicios } from "./admin/TabServicios";
import { TabAdicionales } from "./admin/TabAdicionales";
import { TabBarberos } from "./admin/TabBarberos";
import { TabEstadisticas } from "./admin/TabEstadisticas";
import { TabBloqueos } from "./admin/TabBloqueos";
import { TabEncuestas } from "./admin/TabEncuestas";
import { TabMarketing } from "./admin/TabMarketing";
import { isFeatureEnabled, PLANES } from "./utils/features";
import { BotonInstalarApp } from "./components/BotonInstalarApp";

export function VistaAdmin({ usuario, onLogout, supabase }) {
  const [tab, setTab] = useState("agenda");
  const [barberia, setBarberia] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarBarberia();
  }, []);

  const cargarBarberia = async () => {
    try {
      const { data } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", usuario?.barberia_id)
        .single();
      setBarberia(data);
    } catch (err) {
      console.error("Error cargando barbería:", err);
    }
    setCargando(false);
  };

  const construirTabs = () => {
    const tabs = [];
    tabs.push({ id: "agenda", label: "Agenda" });
    tabs.push({ id: "servicios", label: "Servicios" });
    tabs.push({ id: "adicionales", label: "Adicionales" });
    tabs.push({ id: "barberos", label: "Barberos" });
    if (isFeatureEnabled(barberia, "bloqueos_horarios")) {
      tabs.push({ id: "bloqueos", label: "Bloqueos" });
    }
    if (isFeatureEnabled(barberia, "estadisticas_barberia")) {
      tabs.push({ id: "estadisticas", label: "Estadísticas" });
    }
    if (isFeatureEnabled(barberia, "marketing_automatizado")) {
      tabs.push({ id: "marketing", label: "📣 Marketing" });
    }
    if (isFeatureEnabled(barberia, "encuestas_satisfaccion")) {
      tabs.push({ id: "encuestas", label: "⭐ Encuestas" });
    }
    tabs.push({ id: "configuracion", label: "Configuración" });
    return tabs;
  };

  const tabs = construirTabs();
  const planActual = PLANES[barberia?.plan] || PLANES.base;

  useEffect(() => {
    if (barberia && !tabs.find((t) => t.id === tab)) {
      setTab("agenda");
    }
  }, [barberia, tab]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-stone-950 text-white p-6 flex items-center justify-center">
        <p>Cargando panel admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{barberia?.nombre || "Admin"}</h1>
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
              barberia?.plan === "pro" ? "bg-violet-900 text-violet-200"
              : barberia?.plan === "plus" ? "bg-amber-900 text-amber-200"
              : "bg-stone-700 text-stone-300"
            }`}>
              {barberia?.plan === "pro" && <Crown size={10} />}
              {planActual.nombre.toUpperCase()}
            </span>
          </div>
          <p className="text-stone-400 text-sm">{usuario?.nombre} · {usuario?.rol}</p>
        </div>
        <div className="flex items-center gap-3">
        <BotonInstalarApp />
        <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
          <LogOut size={18} />
          Salir
        </button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 border-b border-stone-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2 px-4 font-semibold transition whitespace-nowrap ${
              tab === t.id ? "border-b-2 border-amber-200 text-amber-200" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === "agenda" && <TabAgenda supabase={supabase} barberiaId={usuario?.barberia_id} usuario={usuario} barberia={barberia} />}
        {tab === "servicios" && <TabServicios supabase={supabase} barberiaId={usuario?.barberia_id} />}
        {tab === "adicionales" && <TabAdicionales supabase={supabase} barberiaId={usuario?.barberia_id} />}
        {tab === "barberos" && <TabBarberos supabase={supabase} barberiaId={usuario?.barberia_id} />}
        {tab === "bloqueos" && <TabBloqueos supabase={supabase} barberiaId={usuario?.barberia_id} />}
        {tab === "estadisticas" && <TabEstadisticas supabase={supabase} barberiaId={usuario?.barberia_id} />}
        {tab === "encuestas" && <TabEncuestas supabase={supabase} barberiaId={usuario?.barberia_id} barberia={barberia} />}
        {tab === "marketing" && <TabMarketing supabase={supabase} barberiaId={usuario?.barberia_id} barberia={barberia} />}
        {tab === "configuracion" && <TabConfiguracion supabase={supabase} barberia={barberia} onUpdate={cargarBarberia} />}
      </div>
    </div>
  );
}
