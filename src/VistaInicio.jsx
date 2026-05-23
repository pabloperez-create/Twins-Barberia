import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Clock, MapPin, LogIn, Star } from "lucide-react";

export function VistaInicio({
  barberiaId = "org-twins",
  onNavigate,
  supabase,
}) {
  const [barberia, setBarberia] = useState(null);
  const [encuestas, setEncuestas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarBarberia();
    cargarEncuestas();
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

  const cargarEncuestas = async () => {
    try {
      const { data } = await supabase
        .from("encuestas")
        .select("cliente_nombre, estrellas, comentario, fecha_reserva")
        .eq("barberia_id", barberiaId)
        .eq("visible_publico", true)
        .not("estrellas", "is", null)
        .order("fecha_respuesta", { ascending: false })
        .limit(6);
      setEncuestas(data || []);
    } catch (err) {
      console.error("Error cargando encuestas:", err);
    }
  };

  const config = barberia?.configuracion || {};
  const features = config.features || {};

  const renderEstrellas = (n) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < n ? "text-amber-400" : "text-stone-600"}>★</span>
    ));

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
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Info de la barbería */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {config.horario_atencion && (
              <div className="bg-stone-900 border border-stone-700 rounded p-4 flex items-start gap-3">
                <Clock size={18} className="text-amber-200 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Horario</p>
                  <p className="text-white">{config.horario_atencion}</p>
                </div>
              </div>
            )}
            {config.direccion && config.direccion !== "Por definir" && (
              <div className="bg-stone-900 border border-stone-700 rounded p-4 flex items-start gap-3">
                <MapPin size={18} className="text-amber-200 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Dirección</p>
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
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Instagram</p>
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

      {/* ⭐ SECCIÓN COMENTARIOS PÚBLICOS */}
      {features.encuestas_satisfaccion && encuestas.length > 0 && (
        <div className="px-6 pb-20 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Lo que dicen nuestros clientes</h2>
            <div className="flex items-center justify-center gap-2 text-amber-400">
              {renderEstrellas(5)}
              <span className="text-stone-400 text-sm ml-1">
                {encuestas.length} reseña{encuestas.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {encuestas.map((e, i) => (
              <div key={i} className="bg-stone-900 border border-stone-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-200 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-200 font-bold text-sm">
                      {e.cliente_nombre?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{e.cliente_nombre}</p>
                    {e.fecha_reserva && (
                      <p className="text-stone-500 text-xs">{e.fecha_reserva}</p>
                    )}
                  </div>
                </div>
                <div className="flex mb-3">{renderEstrellas(e.estrellas)}</div>
                {e.comentario && (
                  <p className="text-stone-300 text-sm leading-relaxed">"{e.comentario}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-stone-600 text-xs">Powered by AgendaIA</p>
      </div>
    </div>
  );
}
