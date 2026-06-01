import React, { useState, useEffect } from "react";
import { Star, MessageSquare, TrendingUp, Eye, EyeOff } from "lucide-react";

export function TabEncuestas({ supabase, barberiaId, barberia, tema: t }) {
  const [encuestas, setEncuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [googleReviews, setGoogleReviews] = useState([]);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [stats, setStats] = useState({});

  useEffect(() => { cargarEncuestas(); }, []);

  const cargarGoogleReviews = async (encuestasData) => {
    setCargandoGoogle(true);
    try {
      const placeId = barberia?.configuracion?.google_place_id;
      if (!placeId) { setCargandoGoogle(false); return; }
      const res = await fetch(`/api/get-google-reviews?barberiaId=${barberiaId}&placeId=${placeId}`);
      const data = await res.json();
      const reviews = data.reseñas?.reviews || [];
      setGoogleReviews(reviews);
      if (reviews.length > 0 && encuestasData) {
        const respondidas = encuestasData.filter((e) => e.estrellas);
        const todasEstrellas = [...respondidas.map(e => e.estrellas), ...reviews.map(r => r.estrellas)];
        const promedioCombinado = todasEstrellas.length > 0 ? (todasEstrellas.reduce((s, n) => s + n, 0) / todasEstrellas.length).toFixed(1) : 0;
        const distribucionCombinada = [1, 2, 3, 4, 5].map((n) => ({ estrellas: n, count: todasEstrellas.filter((e) => e === n).length }));
        setStats(prev => ({ ...prev, promedio: promedioCombinado, distribucion: distribucionCombinada, respondidas: respondidas.length + reviews.length, googleCount: reviews.length }));
      }
    } catch (err) { console.error("Error cargando Google Reviews:", err); }
    setCargandoGoogle(false);
  };

  const cargarEncuestas = async () => {
    setCargando(true);
    try {
      const { data } = await supabase.from("encuestas").select("*").eq("barberia_id", barberiaId).order("fecha_envio", { ascending: false });
      const enc = data || [];
      setEncuestas(enc);
      const respondidas = enc.filter((e) => e.estrellas);
      const promedio = respondidas.length > 0 ? (respondidas.reduce((s, e) => s + e.estrellas, 0) / respondidas.length).toFixed(1) : 0;
      const distribucion = [1, 2, 3, 4, 5].map((n) => ({ estrellas: n, count: respondidas.filter((e) => e.estrellas === n).length }));
      cargarGoogleReviews(enc);
      setStats({ total: enc.length, respondidas: respondidas.length, pendientes: enc.filter((e) => !e.estrellas).length, promedio, distribucion, tasaRespuesta: enc.length > 0 ? Math.round((respondidas.length / enc.length) * 100) : 0 });
    } catch (err) { console.error("Error cargando encuestas:", err); }
    setCargando(false);
  };

  const toggleVisiblePublico = async (encuesta) => {
    try {
      await supabase.from("encuestas").update({ visible_publico: !encuesta.visible_publico }).eq("id", encuesta.id);
      cargarEncuestas();
    } catch (err) { console.error("Error:", err); }
  };

  const encuestasFiltradas = encuestas.filter((e) => {
    if (filtro === "respondidas") return !!e.estrellas;
    if (filtro === "pendientes") return !e.estrellas;
    return true;
  });

  const renderEstrellas = (n) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < n ? "text-amber-400" : t.textoMuted}>★</span>
  ));

  if (cargando) return (
    <div>
      <h2 className="text-2xl font-bold mb-6">⭐ Encuestas</h2>
      <p className={t.textoSub}>Cargando encuestas...</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">⭐ Encuestas de satisfacción</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { valor: stats.promedio, label: "Promedio ★", color: t.acento },
          { valor: stats.respondidas, label: "Respondidas", color: t.texto },
          { valor: stats.pendientes, label: "Pendientes", color: t.textoSub },
          { valor: `${stats.tasaRespuesta}%`, label: "Tasa respuesta", color: "text-green-400" },
        ].map(({ valor, label, color }) => (
          <div key={label} className={`${t.bgCard} border ${t.border} rounded p-4 text-center`}>
            <p className={`text-3xl font-bold ${color}`}>{valor}</p>
            <p className={`${t.textoSub} text-xs mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Distribución de estrellas */}
      {stats.respondidas > 0 && (
        <div className={`${t.bgCard} border ${t.border} rounded p-6 mb-6`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className={t.acento} />Distribución de calificaciones
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = stats.distribucion?.find((d) => d.estrellas === n)?.count || 0;
              const pct = stats.respondidas > 0 ? Math.round((count / stats.respondidas) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-right">{n}</span>
                  <span className="text-amber-400">★</span>
                  <div className={`flex-1 ${t.bgMuted} rounded-full h-3`}>
                    <div className={`${t.acentoBg} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs ${t.textoSub} w-12 text-right`}>{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "todas", label: `Todas (${stats.total})` },
          { key: "respondidas", label: `Respondidas (${stats.respondidas})` },
          { key: "pendientes", label: `Pendientes (${stats.pendientes})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFiltro(f.key)} className={`px-3 py-1.5 rounded text-sm transition ${filtro === f.key ? t.filtroActivo : t.filtroInactivo}`}>{f.label}</button>
        ))}
      </div>

      {/* Lista encuestas */}
      {encuestasFiltradas.length === 0 ? (
        <div className={`${t.bgCard} border ${t.border} rounded p-8 text-center`}>
          <p className={t.textoSub}>No hay encuestas aún.</p>
          <p className={`${t.textoMuted} text-sm mt-2`}>Se envían automáticamente 24h después de cada cita.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encuestasFiltradas.map((e) => (
            <div key={e.id} className={`${t.bgCard} border rounded p-4 ${e.estrellas ? t.border : `${t.border} opacity-60`}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{e.cliente_nombre}</span>
                    {e.fecha_reserva && <span className={`${t.textoMuted} text-xs`}>· {e.fecha_reserva}</span>}
                  </div>
                  {e.estrellas ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{renderEstrellas(e.estrellas)}</span>
                      </div>
                      {e.comentario && (
                        <p className={`${t.textoSub} text-sm flex items-start gap-1 mt-1`}>
                          <MessageSquare size={13} className={`${t.textoMuted} flex-shrink-0 mt-0.5`} />
                          {e.comentario}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={`${t.textoMuted} text-xs italic`}>Sin respuesta aún</p>
                  )}
                </div>
                {e.estrellas && (
                  <button onClick={() => toggleVisiblePublico(e)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition flex-shrink-0 ${e.visible_publico ? "bg-green-900 text-green-200 hover:bg-green-800" : `${t.bgMuted} ${t.textoSub} ${t.bgHover}`}`} title={e.visible_publico ? "Visible en landing" : "Oculto en landing"}>
                    {e.visible_publico ? <Eye size={12} /> : <EyeOff size={12} />}
                    {e.visible_publico ? "Público" : "Oculto"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Reviews */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Reseñas de Google
        </h3>
        {cargandoGoogle ? (
          <p className={`${t.textoSub} text-sm`}>Cargando reseñas...</p>
        ) : googleReviews.length === 0 ? (
          <p className={`${t.textoSub} text-sm`}>No hay reseñas de Google disponibles.</p>
        ) : (
          <div className="space-y-3">
            {googleReviews.map((r, i) => (
              <div key={i} className={`${t.bgCard} border ${t.border} rounded p-4 flex gap-3`}>
                {r.foto ? (
                  <img src={r.foto} alt={r.autor} className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className={`w-9 h-9 rounded-full ${t.bgMuted} flex items-center justify-center flex-shrink-0 text-sm font-bold`}>{r.autor?.[0] || "?"}</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{r.autor}</span>
                    <span className={`${t.textoMuted} text-xs`}>· {r.fecha}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1 text-amber-400">
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </div>
                  {r.texto && <p className={`${t.textoSub} text-sm`}>{r.texto}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
