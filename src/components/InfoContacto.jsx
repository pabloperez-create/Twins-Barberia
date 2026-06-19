import React from "react";
import { Clock, MapPin } from "lucide-react";

// Tarjetas de contacto (Horario / Dirección / Instagram) + link de WhatsApp.
// Se muestran al final de la página pública (debajo de la galería y reseñas).
export function InfoContacto({ config = {}, T }) {
  const hayAlgo = config.horario_atencion || (config.direccion && config.direccion !== "Por definir") || config.instagram || config.whatsapp;
  if (!hayAlgo) return null;

  return (
    <div style={{ maxWidth: 600, width: "100%", margin: "0 auto", textAlign: "center", padding: "8px 0 8px" }}>
      {/* Info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: 2 }}>
              <defs>
                <linearGradient id="ig" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#f09433" />
                  <stop offset="0.25" stopColor="#e6683c" />
                  <stop offset="0.5" stopColor="#dc2743" />
                  <stop offset="0.75" stopColor="#cc2366" />
                  <stop offset="1" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig)" />
              <rect x="7" y="7" width="10" height="10" rx="3" ry="3" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="17" cy="7" r="1" fill="white" />
            </svg>
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
          <a
            href={`https://wa.me/${config.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.waColor, fontSize: 13, textDecoration: "none" }}
          >
            💬 ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
