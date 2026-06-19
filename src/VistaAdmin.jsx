import React, { useState, useEffect } from "react";
import { LogOut, Crown } from "lucide-react";
import { TabAgenda } from "./admin/TabAgenda";
import { TabConfiguracion } from "./admin/TabConfiguracion";
import { TabServicios } from "./admin/TabServicios";
import { TabAdicionales } from "./admin/TabAdicionales";
import { TabBarberos } from "./admin/TabBarberos";
import { TabGaleria } from "./admin/TabGaleria";
import { TabEstadisticas } from "./admin/TabEstadisticas";
import { TabBloqueos } from "./admin/TabBloqueos";
import { TabEncuestas } from "./admin/TabEncuestas";
import { TabMarketing } from "./admin/TabMarketing";
import { TabMisReservas } from "./barbero/TabMisReservas";
import { TabMiHorario } from "./barbero/TabMiHorario";
import { TabMiPerfil } from "./barbero/TabMiPerfil";
import { TabMisDiasLibres } from "./barbero/TabMisDiasLibres";
import { isFeatureEnabled, PLANES } from "./utils/features";
import { getTema } from "./utils/tema";
import { BotonInstalarApp } from "./components/BotonInstalarApp";

export function VistaAdmin({ usuario, onLogout, supabase }) {
  const [tab, setTab] = useState("agenda");
  const [barberia, setBarberia] = useState(null);
  const [barberoAdmin, setBarberoAdmin] = useState(null); // ⭐ perfil barbero del admin
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: barberiaData } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", usuario?.barberia_id)
        .single();
      setBarberia(barberiaData);

      // ⭐ Cargar perfil de barbero vinculado al admin (si existe)
      const { data: barberoData } = await supabase
        .from("barberos")
        .select("*")
        .eq("usuario_id", usuario?.id)
        .maybeSingle();
      setBarberoAdmin(barberoData || null);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
    setCargando(false);
  };

  const construirTabs = () => {
    const tabs = [];
    tabs.push({ id: "agenda", label: "Agenda" });
    tabs.push({ id: "servicios", label: "Servicios" });
    tabs.push({ id: "adicionales", label: "Adicionales" });
    tabs.push({ id: "barberos", label: t.tipo === "salon" ? "Estilistas" : "Barberos" });
    tabs.push({ id: "galeria", label: "🖼️ Galería" });
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

    // ⭐ Tabs personales si el admin también es barbero
    if (barberoAdmin) {
      tabs.push({ id: "mis_reservas", label: "✂️ Mis Reservas" });
      tabs.push({ id: "mi_horario", label: "✂️ Mi Horario" });
      if (isFeatureEnabled(barberia, "bloqueos_horarios")) {
        tabs.push({ id: "mis_dias_libres", label: "✂️ Mis Días Libres" });
      }
      tabs.push({ id: "mi_perfil", label: "✂️ Mi Perfil" });
    }

    return tabs;
  };

  const t = getTema(barberia);
  const tabs = construirTabs();
  const planActual = PLANES[barberia?.plan] || PLANES.base;

  useEffect(() => {
    if (barberia && !tabs.find((tab_) => tab_.id === tab)) {
      setTab("agenda");
    }
  }, [barberia, tab]);

  if (cargando) {
    return (
      <div className={`min-h-screen ${t.bg} ${t.texto} p-6 flex items-center justify-center`}>
        <p>Cargando panel admin...</p>
      </div>
    );
  }

  const badgeClass =
    barberia?.plan === "pro" ? t.badgePro
    : barberia?.plan === "plus" ? t.badgePlus
    : t.badgeBase;

  return (
    <div className={`min-h-screen ${t.bg} ${t.texto} p-6`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{barberia?.nombre || "Admin"}</h1>
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${badgeClass}`}>
              {barberia?.plan === "pro" && <Crown size={10} />}
              {planActual.nombre.toUpperCase()}
            </span>
          </div>
          <p className={`${t.textoSub} text-sm`}>{usuario?.nombre} · {usuario?.rol}</p>
        </div>
        <div className="flex items-center gap-3">
          <BotonInstalarApp />
          <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </div>

      <div className={`flex gap-2 mb-8 border-b ${t.border} overflow-x-auto`}>
        {tabs.map((tab_) => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`pb-2 px-4 font-semibold transition whitespace-nowrap ${
              tab === tab_.id ? t.tabActivo : t.tabInactivo
            }`}
          >
            {tab_.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === "agenda" && <TabAgenda supabase={supabase} barberiaId={usuario?.barberia_id} usuario={usuario} barberia={barberia} tema={t} />}
        {tab === "servicios" && <TabServicios supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "adicionales" && <TabAdicionales supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "barberos" && <TabBarberos supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "galeria" && <TabGaleria supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "bloqueos" && <TabBloqueos supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "estadisticas" && <TabEstadisticas supabase={supabase} barberiaId={usuario?.barberia_id} tema={t} />}
        {tab === "encuestas" && <TabEncuestas supabase={supabase} barberiaId={usuario?.barberia_id} barberia={barberia} tema={t} />}
        {tab === "marketing" && <TabMarketing supabase={supabase} barberiaId={usuario?.barberia_id} barberia={barberia} tema={t} />}
        {tab === "configuracion" && <TabConfiguracion supabase={supabase} barberia={barberia} onUpdate={cargarDatos} tema={t} />}

        {/* ⭐ Tabs personales del admin-barbero */}
        {tab === "mis_reservas" && barberoAdmin && <TabMisReservas supabase={supabase} barbero={barberoAdmin} barberia={barberia} usuario={usuario} tema={t} />}
        {tab === "mi_horario" && barberoAdmin && <TabMiHorario supabase={supabase} barbero={barberoAdmin} onUpdate={cargarDatos} tema={t} />}
        {tab === "mis_dias_libres" && barberoAdmin && <TabMisDiasLibres supabase={supabase} barbero={barberoAdmin} barberia={barberia} tema={t} />}
        {tab === "mi_perfil" && barberoAdmin && <TabMiPerfil supabase={supabase} barbero={barberoAdmin} usuario={usuario} onUpdate={cargarDatos} tema={t} />}
      </div>
    </div>
  );
}
