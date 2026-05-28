import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Clock, MapPin, LogIn, Star } from "lucide-react";

export function VistaInicio({
  barberiaId = "org-twins",
  onNavigate,
  supabase,
}) {
  const [barberia, setBarberia] = useState(null);
  const [encuestas, setEncuestas] = useState([]);
  const [googleReviews, setGoogleReviews] = useState(null);
  const [cargando, setCargando] = useState(true);

  const PLACE_ID = "ChIJGZpoFlLnYpYRQXK09YRxhgk"; // TWINS Barbería Peñaflor

  useEffect(() => {
    cargarBarberia();
    cargarEncuestas();
    cargarGoogleReviews();
  }, []);

  const cargarGoogleReviews = async () => {
    try {
      const response = await fetch(
        `/api/get-google-reviews?barberiaId=${barberiaId}&placeId=${PLACE_ID}`
      );
      if (response.ok) {
        const data = await response.json();
        setGoogleReviews(data.reseñas);
      }
    } catch (err) {
      console.error("Error cargando reseñas Google:", err);
    }
  };

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
  const esSalon = barberia?.tipo_negocio === 'salon';
  const tema = esSalon ? {
    bg: 'bg-pink-50',
    heroBg: 'bg-pink-100',
    heroBorder: 'border border-pink-200',
    titulo: 'text-rose-900',
    subtitulo: 'text-rose-500',
    icono: 'text-rose-400',
    iconoBg: 'bg-rose-100',
    cta: 'bg-rose-500 hover:bg-rose-400 text-white',
    cardBg: 'bg-white border border-pink-200',
    cardIcon: 'text-rose-400',
    cardLabel: 'text-rose-300',
    tagline: 'Reserva tu sesión en segundos',
    loginColor: 'text-rose-300 hover:text-rose-500',
    footerBg: 'bg-pink-50',
  } : {
    bg: 'bg-stone-950',
    heroBg: '',
    heroBorder: '',
    titulo: 'text-white',
    subtitulo: 'text-amber-200',
    icono: 'text-amber-200',
    iconoBg: 'bg-amber-200 bg-opacity-10',
    cta: 'bg-amber-200 hover:bg-amber-100 text-stone-950',
    cardBg: 'bg-stone-900 border border-stone-700',
    cardIcon: 'text-amber-200',
    cardLabel: 'text-stone-400',
    tagline: 'Reserva tu cita en segundos',
    loginColor: 'text-stone-400 hover:text-amber-200',
    footerBg: 'bg-stone-900',
  };

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
    <div className={`min-h-screen ${esSalon ? "bg-pink-50 text-rose-950" : "bg-stone-950 text-white"}`}>
      {/* Header con login pequeño */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => onNavigate("login")}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded transition ${tema.loginColor}`}
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
          <div className={`mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full ${tema.iconoBg}`}>
            <Scissors size={40} className={tema.icono} />
          </div>

          {/* Nombre + Tagline */}
          <h1 className={`text-5xl md:text-6xl font-bold mb-3 ${tema.titulo}`}>
            {barberia?.nombre || "TWINS Barbería"}
          </h1>
          <p className={`text-lg mb-12 ${tema.subtitulo}`}>{tema.tagline}</p>

          {/* CTA principal */}
          <button
            onClick={() => onNavigate("reserva")}
            className={`group inline-flex items-center gap-3 font-bold text-xl px-10 py-5 rounded-lg shadow-2xl transition-all hover:scale-105 ${tema.cta}`}
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

      {/* ⭐ SECCIÓN RESEÑAS GOOGLE */}
      {googleReviews && googleReviews.reviews?.length > 0 && (
        <div className="px-6 pb-12 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Lo que dicen nuestros clientes</h2>
            <div className="flex items-center justify-center gap-2">
              <div className="flex text-amber-400 text-lg">{"★".repeat(Math.round(googleReviews.rating))}</div>
              <span className="text-amber-200 font-bold text-xl">{googleReviews.rating}</span>
              <span className="text-stone-400 text-sm">· {googleReviews.total} reseñas en Google</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {googleReviews.reviews.map((r, i) => (
              <div key={i} className="bg-stone-900 border border-stone-700 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  {r.foto ? (
                    <img src={r.foto} alt={r.autor} className="w-8 h-8 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-amber-200 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-200 font-bold text-sm">{r.autor?.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{r.autor}</p>
                    <p className="text-stone-500 text-xs">{r.fecha}</p>
                  </div>
                  <div className="ml-auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                </div>
                <div className="flex mb-2 text-amber-400">{"★".repeat(r.estrellas)}</div>
                {r.texto && (
                  <p className="text-stone-300 text-sm leading-relaxed line-clamp-3">"{r.texto}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ SECCIÓN ENCUESTAS PROPIAS (si no hay Google reviews) */}
      {!googleReviews && features.encuestas_satisfaccion && encuestas.length > 0 && (
        <div className="px-6 pb-12 max-w-4xl mx-auto">
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
                    <span className="text-amber-200 font-bold text-sm">{e.cliente_nombre?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{e.cliente_nombre}</p>
                    {e.fecha_reserva && <p className="text-stone-500 text-xs">{e.fecha_reserva}</p>}
                  </div>
                </div>
                <div className="flex mb-3">{renderEstrellas(e.estrellas)}</div>
                {e.comentario && <p className="text-stone-300 text-sm leading-relaxed">"{e.comentario}"</p>}
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
