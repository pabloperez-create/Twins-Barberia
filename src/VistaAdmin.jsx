import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { TabAgenda } from "./admin/TabAgenda";
import { TabConfiguracion } from "./admin/TabConfiguracion";
import { TabServicios } from "./admin/TabServicios";
import { TabAdicionales } from "./admin/TabAdicionales";
import { TabBarberos } from "./admin/TabBarberos";
import { TabEstadisticas } from "./admin/TabEstadisticas";

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

  const tabs = [
    { id: "agenda", label: "Agenda" },
    { id: "servicios", label: "Servicios" },
    { id: "adicionales", label: "Adicionales" },
    { id: "barberos", label: "Barberos" },
    { id: "estadisticas", label: "Estadísticas" },
    { id: "configuracion", label: "Configuración" },
  ];

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
          <h1 className="text-3xl font-bold">{barberia?.nombre || "Admin"}</h1>
          <p className="text-stone-400 text-sm">
            {usuario?.nombre} · {usuario?.rol}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-stone-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2 px-4 font-semibold transition whitespace-nowrap ${
              tab === t.id
                ? "border-b-2 border-amber-200 text-amber-200"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      <div className="max-w-6xl">
        {tab === "agenda" && (
          <TabAgenda supabase={supabase} barberiaId={usuario?.barberia_id} />
        )}
        {tab === "servicios" && (
          <TabServicios supabase={supabase} barberiaId={usuario?.barberia_id} />
        )}
        {tab === "adicionales" && (
          <TabAdicionales
            supabase={supabase}
            barberiaId={usuario?.barberia_id}
          />
        )}
        {tab === "barberos" && (
          <TabBarberos supabase={supabase} barberiaId={usuario?.barberia_id} />
        )}
        {tab === "estadisticas" && (
          <TabEstadisticas
            supabase={supabase}
            barberiaId={usuario?.barberia_id}
          />
        )}
        {tab === "configuracion" && (
          <TabConfiguracion
            supabase={supabase}
            barberia={barberia}
            onUpdate={cargarBarberia}
          />
        )}
      </div>
    </div>
  );
}
