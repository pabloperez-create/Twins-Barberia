import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Clock, MapPin, LogIn } from "lucide-react";

/**
 * Vista Inicio - LANDING PÚBLICA (sin login)
 * Props:
 *   - barberiaId: string (por defecto "org-twins")
 *   - onNavigate: function (para ir a "reserva" o "login")
 *   - supabase: cliente supabase
 */
export function VistaInicio({
  barberiaId = "org-twins",
  onNavigate,
  supabase,
}) {
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
        .eq("id", barberiaId)
        .single();
      setBarberia(data);
    } catch (err) {
      console.error("Error cargando barbería:", err);
    }
    setCargando(false);
  };

  const config = barberia?.configuracion || {};

  if (cargando) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header con login pequeño */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => onNavigate("login")}
          className="flex items-center gap-2 text-stone-400 hover:text-amber-200 text-sm px-3 py-2 rounded transition"
          title="Acceso para administradores y barberos"
        >
          <LogIn size={16} />
          Iniciar sesión
        </button>
      </div>

      {/* Hero principal */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          {/* Logo */}
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-amber-200 bg-opacity-10 rounded-full">
            <Scissors size={40} className="text-amber-200" />
          </div>

          {/* Nombre + Tagline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-3">
            {barberia?.nombre || "TWINS Barbería"}
          </h1>
          <p className="text-amber-200 text-lg mb-12">
            Reserva tu cita en segundos
          </p>

          {/* CTA principal */}
          <button
            onClick={() => onNavigate("reserva")}
            className="group inline-flex items-center gap-3 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold text-xl px-10 py-5 rounded-lg shadow-2xl transition-all hover:scale-105"
          >
            <Calendar size={24} />
            Reservar ahora
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>

          {/* Info de la barbería */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {config.horario_atencion && (
              <div className="bg-stone-900 border border-stone-700 rounded p-4 flex items-start gap-3">
                <Clock
                  size={18}
                  className="text-amber-200 flex-shrink-0 mt-0.5"
                />
                <div className="text-left">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    Horario
                  </p>
                  <p className="text-white">{config.horario_atencion}</p>
                </div>
              </div>
            )}

            {config.direccion && config.direccion !== "Por definir" && (
              <div className="bg-stone-900 border border-stone-700 rounded p-4 flex items-start gap-3">
                <MapPin
                  size={18}
                  className="text-amber-200 flex-shrink-0 mt-0.5"
                />
                <div className="text-left">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    Dirección
                  </p>
                  <p className="text-white">{config.direccion}</p>
                </div>
              </div>
            )}

            {config.instagram && (
              <a
                href={`https://instagram.com/${config.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="bg-stone-900 border border-stone-700 rounded p-4 flex items-start gap-3 hover:border-amber-200 transition"
              >
                <span className="text-amber-200 flex-shrink-0 mt-0.5 text-lg">📷</span>
                <div className="text-left">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    Instagram
                  </p>
                  <p className="text-white">{config.instagram}</p>
                </div>
              </a>
            )}
          </div>

          {/* WhatsApp directo */}
          {config.whatsapp && (
            <div className="mt-6">
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-stone-400 hover:text-green-400 text-sm transition"
              >
                💬 ¿Dudas? Escríbenos por WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-stone-600 text-xs">Powered by TWINS App</p>
      </div>
    </div>
  );
}
