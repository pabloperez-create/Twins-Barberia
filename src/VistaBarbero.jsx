import React, { useState, useEffect } from "react";
import { LogOut, Scissors } from "lucide-react";
import { TabMisReservas } from "./barbero/TabMisReservas";
import { TabMiPerfil } from "./barbero/TabMiPerfil";
import { TabMiHorario } from "./barbero/TabMiHorario";
import { TabMisDiasLibres } from "./barbero/TabMisDiasLibres";
import { isFeatureEnabled } from "./utils/features";
import { BotonInstalarApp } from "./components/BotonInstalarApp";

export function VistaBarbero({ usuario, onLogout, supabase }) {
  const [tab, setTab] = useState("reservas");
  const [barbero, setBarbero] = useState(null);
  const [barberia, setBarberia] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: barberoData, error: errorBarbero } = await supabase
        .from("barberos")
        .select("*")
        .eq("usuario_id", usuario.id)
        .single();

      if (errorBarbero) throw errorBarbero;

      const { data: barberiaData } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", usuario.barberia_id)
        .single();

      setBarbero(barberoData);
      setBarberia(barberiaData);
    } catch (err) {
      console.error("Error cargando datos del barbero:", err);
    }
    setCargando(false);
  };

  // ⭐ CONSTRUIR TABS SEGÚN FEATURES
  const construirTabs = () => {
    const tabs = [];

    // Siempre disponibles (base del rol barbero)
    tabs.push({ id: "reservas", label: "Mis Reservas" });
    tabs.push({ id: "horario", label: "Mi Horario" });

    // Días Libres - solo si feature bloqueos_horarios está activa
    if (isFeatureEnabled(barberia, "bloqueos_horarios")) {
      tabs.push({ id: "dias_libres", label: "Días Libres" });
    }

    // Mi Perfil - siempre disponible
    tabs.push({ id: "perfil", label: "Mi Perfil" });

    return tabs;
  };

  const tabs = construirTabs();

  // Si el tab actual se desactivó, volver al primero
  useEffect(() => {
    if (barberia && !tabs.find((t) => t.id === tab)) {
      setTab("reservas");
    }
  }, [barberia, tab]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-stone-950 text-white p-6 flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!barbero) {
    return (
      <div className="min-h-screen bg-stone-950 text-white p-6 flex flex-col items-center justify-center gap-4">
        <Scissors size={48} className="text-amber-200" />
        <p className="text-xl font-bold">Perfil no encontrado</p>
        <p className="text-stone-400 text-center max-w-md">
          Tu usuario no está vinculado a ningún perfil de barbero. Contacta al
          administrador.
        </p>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded mt-4"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hola, {barbero.nombre} 👋</h1>
          <p className="text-stone-400 text-sm">
            {barberia?.nombre} · Barbero
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BotonInstalarApp />
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
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
              tab === t.id
                ? "border-b-2 border-amber-200 text-amber-200"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === "reservas" && (
          <TabMisReservas
            supabase={supabase}
            barbero={barbero}
            barberia={barberia}
          />
        )}
        {tab === "horario" && (
          <TabMiHorario
            supabase={supabase}
            barbero={barbero}
            onUpdate={cargarDatos}
          />
        )}
        {tab === "dias_libres" && (
          <TabMisDiasLibres
            supabase={supabase}
            barbero={barbero}
            barberia={barberia}
          />
        )}
        {tab === "perfil" && (
          <TabMiPerfil
            supabase={supabase}
            barbero={barbero}
            usuario={usuario}
            onUpdate={cargarDatos}
          />
        )}
      </div>
    </div>
  );
}
