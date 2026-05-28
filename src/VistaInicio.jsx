import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Clock, MapPin, LogIn } from "lucide-react";

export function VistaInicio({
  barberiaId = "org-twins",
  onNavigate,
  supabase,
}) {
  const [barberia, setBarberia] = useState(null);
  const [encuestas, setEncuestas] = useState([]);
  const [googleReviews, setGoogleReviews] = useState(null);
  const [cargando, setCargando] = useState(true);

  const PLACE_ID = "ChIJGZpoFlLnYpYRQXK09YRxhgk";

  useEffect(() => {
    cargarBarberia();
    cargarEncuestas();
    cargarGoogleReviews();
  }, []);

  const cargarGoogleReviews = async () => {
    try {
      const response = await fetch(`/api/get-google-reviews?barberiaId=${barberiaId}&placeId=${PLACE_ID}`);
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
      const { data } = await supabase.from("barberia").select("*").eq("id", barberiaId).single();
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
  const esSalon = barberia?.tipo_negocio === "salon";

  const T = esSalon ? {
    pageBg: "#fce8f0",
    pageText: "#4a1030",
    heroBg: "#fce8f0",
    iconBg: "rgba(212,99,138,0.12)",
    iconColor: "#d4638a",
    titleColor: "#7a1f42",
    subtitleColor: "#b05070",
    ctaBg: "#d4638a",
    ctaBgHover: "#c45578",
    ctaText: "#fff",
    cardBg: "#fff",
    cardBorder: "#f0c0d4",
    cardIconColor: "#d4638a",
    cardLabelColor: "#b08090",
    cardTextColor: "#4a1030",
    loginColor: "#b05070",
    starColor: "#d4638a",
    reviewDateColor: "#b08090",
    reviewTextColor: "#6d4455",
    footerColor: "#c9889e",
    tagline: "Reserva tu sesión en segundos",
    waColor: "#b08090",
  } : {
    pageBg: "#0c0a09",
    pageText: "#fff",
    heroBg: "#0c0a09",
    iconBg: "rgba(253,230,138,0.10)",
    iconColor: "#fde68a",
    titleColor: "#fff",
    subtitleColor: "#fde68a",
    ctaBg: "#fde68a",
    ctaBgHover: "#fef08a",
    ctaText: "#0c0a09",
    cardBg: "#1c1917",
    cardBorder: "#44403c",
    cardIconColor: "#fde68a",
    cardLabelColor: "#78716c",
    cardTextColor: "#fff",
    loginColor: "#78716c",
    starColor: "#fbbf24",
    reviewDateColor: "#78716c",
    reviewTextColor: "#d6d3d1",
    footerColor: "#44403c",
    tagline: "Reserva tu cita en segundos",
    waColor: "#78716c",
  };

  const renderEstrellas = (n) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < n ? T.starColor : "#555" }}>★</span>
    ));

  if (cargando) {
    return (
      <div style={{ minHeight: "100vh", background: "#0c0a09", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#78716c" }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, color: T.pageText }}>
      {/* Login */}
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <button
          onClick={() => onNavigate("login")}
          style={{ display: "flex", alignItems: "center", gap: 6, color: T.loginColor, fontSize: 14, padding: "8px 12px", background: "none", border: "none", cursor: "pointer" }}
        >
          <LogIn size={16} />
          Iniciar sesión
        </button>
      </div>

      {/* Hero */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>
          {/* Ícono */}
          <div style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, background: T.iconBg, borderRadius: "50%" }}>
            <Scissors size={40} color={T.iconColor} />
          </div>

          {/* Nombre */}
          <h1 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 700, marginBottom: 8, color: T.titleColor }}>
            {barberia?.nombre || "AgendaIA"}
          </h1>
          <p style={{ fontSize: 18, marginBottom: 48, color: T.subtitleColor }}>{T.tagline}</p>

          {/* CTA */}
          <button
            onClick={() => onNavigate("reserva")}
            style={{ display: "inline-flex", alignItems: "center", gap: 12, background: T.ctaBg, color: T.ctaText, fontWeight: 700, fontSize: 20, padding: "20px 40px", borderRadius: 12, border: "none", cursor: "pointer", transition: "background 0.2s" }}
            onMouseOver={e => e.currentTarget.style.background = T.ctaBgHover}
            onMouseOut={e => e.currentTarget.style.background = T.ctaBg}
          >
            <Calendar size={24} />
            Reservar ahora →
          </button>

          {/* Info cards */}
          <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            {config.horario_atencion && (
              <div style={{ background: T.cardBg, border: `0.5px solid ${T.cardBorder}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
                <Clock size={18} color={T.cardIconColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, color: T.cardLabelColor, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Horario</p>
                  <p style={{ margin: 0, color: T.cardTextColor, fontSize: 13 }}>{config.horario_atencion}</p>
                </div>
              </div>
            )}
            {config.direccion && config.direccion !== "Por definir" && (
              <div style={{ background: T.cardBg, border: `0.5px solid ${T.cardBorder}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
                <MapPin size={18} color={T.cardIconColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, color: T.cardLabelColor, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Dirección</p>
                  <p style={{ margin: 0, color: T.cardTextColor, fontSize: 13 }}>{config.direccion}</p>
                </div>
              </div>
            )}
            {config.instagram && (
              <a
                href={`https://instagram.com/${config.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: T.cardBg, border: `0.5px solid ${T.cardBorder}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", textDecoration: "none" }}
              >
                <span style={{ color: T.cardIconColor, fontSize: 18, marginTop: 2 }}>📷</span>
                <div>
                  <p style={{ margin: 0, color: T.cardLabelColor, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Instagram</p>
                  <p style={{ margin: 0, color: T.cardTextColor, fontSize: 13 }}>{config.instagram}</p>
                </div>
              </a>
            )}
          </div>

          {/* WhatsApp */}
          {config.whatsapp && (
            <div style={{ marginTop: 24 }}>
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.waColor, fontSize: 13, textDecoration: "none" }}>
                💬 ¿Dudas? Escríbenos por WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Reseñas Google */}
      {googleReviews && googleReviews.reviews?.length > 0 && (
        <div style={{ padding: "0 24px 48px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.titleColor }}>Lo que dicen nuestros clientes</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ color: T.starColor, fontSize: 18 }}>{"★".repeat(Math.round(googleReviews.rating))}</span>
              <span style={{ color: T.subtitleColor, fontWeight: 700, fontSize: 20 }}>{googleReviews.rating}</span>
              <span style={{ color: T.cardLabelColor, fontSize: 13 }}>· {googleReviews.total} reseñas en Google</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            {googleReviews.reviews.map((r, i) => (
              <div key={i} style={{ background: T.cardBg, border: `0.5px solid ${T.cardBorder}`, borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  {r.foto
                    ? <img src={r.foto} alt={r.autor} style={{ width: 30, height: 30, borderRadius: "50%" }} />
                    : <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.iconColor, fontWeight: 700, fontSize: 12 }}>{r.autor?.charAt(0)}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: T.cardTextColor }}>{r.autor}</p>
                    <p style={{ margin: 0, fontSize: 10, color: T.reviewDateColor }}>{r.fecha}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div style={{ color: T.starColor, marginBottom: 6 }}>{"★".repeat(r.estrellas)}</div>
                {r.texto && <p style={{ margin: 0, color: T.reviewTextColor, fontSize: 12, lineHeight: 1.5 }}>"{r.texto}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encuestas propias */}
      {!googleReviews && features.encuestas_satisfaccion && encuestas.length > 0 && (
        <div style={{ padding: "0 24px 48px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: T.titleColor }}>Lo que dicen nuestros clientes</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.starColor }}>
              {renderEstrellas(5)}
              <span style={{ color: T.cardLabelColor, fontSize: 13, marginLeft: 4 }}>{encuestas.length} reseña{encuestas.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            {encuestas.map((e, i) => (
              <div key={i} style={{ background: T.cardBg, border: `0.5px solid ${T.cardBorder}`, borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.iconColor, fontWeight: 700, fontSize: 12 }}>
                    {e.cliente_nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: T.cardTextColor }}>{e.cliente_nombre}</p>
                    {e.fecha_reserva && <p style={{ margin: 0, fontSize: 10, color: T.reviewDateColor }}>{e.fecha_reserva}</p>}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>{renderEstrellas(e.estrellas)}</div>
                {e.comentario && <p style={{ margin: 0, color: T.reviewTextColor, fontSize: 12, lineHeight: 1.5 }}>"{e.comentario}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingBottom: 24, textAlign: "center" }}>
        <p style={{ color: T.footerColor, fontSize: 11 }}>Powered by AgendaIA</p>
      </div>
    </div>
  );
}
