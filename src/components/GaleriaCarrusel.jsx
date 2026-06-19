import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Carrusel de "Nuestros trabajos" para la página pública. Auto-desliza las fotos
// (sin clicks ni enlaces). Se OCULTA si la barbería no tiene fotos cargadas.
export function GaleriaCarrusel({ barberiaId, supabase, T }) {
  const [fotos, setFotos] = useState([]);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("galeria_trabajos")
          .select("id, foto_url")
          .eq("barberia_id", barberiaId)
          .eq("activo", true)
          .order("orden", { ascending: true });
        if (activo && data) setFotos(data);
      } catch {
        // Si la tabla no existe o falla, simplemente no se muestra la galería.
        if (activo) setFotos([]);
      }
    })();
    return () => { activo = false; };
  }, [barberiaId]);

  // Auto-avance cada 4s
  useEffect(() => {
    if (fotos.length <= 1) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % fotos.length), 4000);
    return () => clearInterval(timer.current);
  }, [fotos.length]);

  const reiniciarTimer = () => {
    if (timer.current) clearInterval(timer.current);
    if (fotos.length > 1) timer.current = setInterval(() => setIdx((i) => (i + 1) % fotos.length), 4000);
  };
  const ir = (n) => { setIdx((n + fotos.length) % fotos.length); reiniciarTimer(); };

  if (fotos.length === 0) return null;

  return (
    <div style={{ marginTop: 56, width: "100%" }}>
      <h2 style={{ margin: "0 0 20px 0", color: T.titleColor, fontSize: 22, fontWeight: 700, textAlign: "center", fontFamily: T.titleFont }}>
        Nuestros trabajos
      </h2>

      <div style={{ position: "relative", width: "100%", maxWidth: 520, margin: "0 auto" }}>
        {/* Viewport */}
        <div style={{ overflow: "hidden", borderRadius: 14, border: `0.5px solid ${T.cardBorder}`, aspectRatio: "4 / 5", background: T.cardBg }}>
          {/* Track */}
          <div style={{ display: "flex", height: "100%", transform: `translateX(-${idx * 100}%)`, transition: "transform 0.55s ease" }}>
            {fotos.map((f) => (
              <img
                key={f.id}
                src={f.foto_url}
                alt="Trabajo"
                loading="lazy"
                style={{ minWidth: "100%", width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ))}
          </div>
        </div>

        {fotos.length > 1 && (
          <>
            {/* Flechas */}
            <button onClick={() => ir(idx - 1)} aria-label="Anterior"
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => ir(idx + 1)} aria-label="Siguiente"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <ChevronRight size={20} />
            </button>

            {/* Puntos */}
            <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 14 }}>
              {fotos.map((_, i) => (
                <button key={i} onClick={() => ir(i)} aria-label={`Foto ${i + 1}`}
                  style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s", background: i === idx ? T.iconColor : T.cardBorder }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
