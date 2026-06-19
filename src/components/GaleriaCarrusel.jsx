import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const INTERVALO_MS = 4500; // tiempo antes de pasar a las siguientes fotos

const calcPerPage = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < 560) return 1;
  if (window.innerWidth < 900) return 2;
  return 3;
};

// Carrusel de "Nuestros trabajos": muestra varias fotos a la vez (3 en desktop,
// 2 en tablet, 1 en móvil) y auto-avanza a las SIGUIENTES cada INTERVALO_MS.
// Sin clicks ni enlaces. Se oculta si la barbería no tiene fotos.
export function GaleriaCarrusel({ barberiaId, supabase, T }) {
  const [fotos, setFotos] = useState([]);
  const [perPage, setPerPage] = useState(calcPerPage());
  const [page, setPage] = useState(0);
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
        if (activo) setFotos([]);
      }
    })();
    return () => { activo = false; };
  }, [barberiaId]);

  // Responsivo
  useEffect(() => {
    const onResize = () => setPerPage(calcPerPage());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pageCount = Math.max(1, Math.ceil(fotos.length / perPage));

  // Si cambia perPage/fotos y la página actual queda fuera de rango, la ajusto
  useEffect(() => { if (page > pageCount - 1) setPage(0); }, [pageCount, page]);

  // Auto-avance por página
  useEffect(() => {
    if (pageCount <= 1) return;
    timer.current = setInterval(() => setPage((p) => (p + 1) % pageCount), INTERVALO_MS);
    return () => clearInterval(timer.current);
  }, [pageCount]);

  const ir = (n) => {
    setPage(((n % pageCount) + pageCount) % pageCount);
    if (timer.current) clearInterval(timer.current);
    if (pageCount > 1) timer.current = setInterval(() => setPage((p) => (p + 1) % pageCount), INTERVALO_MS);
  };

  if (fotos.length === 0) return null;

  return (
    <div style={{ marginTop: 52, width: "100%" }}>
      <h2 style={{ margin: "0 0 18px 0", color: T.titleColor, fontSize: 20, fontWeight: 700, textAlign: "center", fontFamily: T.titleFont }}>
        Nuestros trabajos
      </h2>

      <div style={{ position: "relative", width: "100%", maxWidth: 680, margin: "0 auto" }}>
        {/* Viewport */}
        <div style={{ overflow: "hidden" }}>
          {/* Track: una "página" por cada grupo; cada foto ocupa 100/perPage % */}
          <div style={{ display: "flex", transform: `translateX(-${page * 100}%)`, transition: "transform 0.55s ease" }}>
            {fotos.map((f) => (
              <div key={f.id} style={{ flex: `0 0 ${100 / perPage}%`, maxWidth: `${100 / perPage}%`, padding: "0 5px", boxSizing: "border-box" }}>
                <img
                  src={f.foto_url}
                  alt="Trabajo"
                  loading="lazy"
                  style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block", borderRadius: 10, border: `0.5px solid ${T.cardBorder}` }}
                />
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <>
            <button onClick={() => ir(page - 1)} aria-label="Anteriores"
              style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => ir(page + 1)} aria-label="Siguientes"
              style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <ChevronRight size={18} />
            </button>

            <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 14 }}>
              {Array.from({ length: pageCount }, (_, i) => (
                <button key={i} onClick={() => ir(i)} aria-label={`Grupo ${i + 1}`}
                  style={{ width: i === page ? 22 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s", background: i === page ? T.iconColor : T.cardBorder }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
