import React, { useState, useEffect } from "react";
import { Star, Check, AlertCircle } from "lucide-react";

export function VistaEncuesta({ supabase, encuestaId, estrellasInicial }) {
  const [estrellas, setEstrellas] = useState(estrellasInicial ? parseInt(estrellasInicial) : 0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState("pendiente"); // pendiente | enviando | ok | yaRespondida | error
  const [encuesta, setEncuesta] = useState(null);

  useEffect(() => {
    cargarEncuesta();
  }, []);

  // Si viene con estrellas desde el link del email, enviar automáticamente
  useEffect(() => {
    if (estrellasInicial && encuesta && estado === "pendiente") {
      setEstrellas(parseInt(estrellasInicial));
    }
  }, [encuesta]);

  const cargarEncuesta = async () => {
    try {
      // Lectura por endpoint (antes select directo que exponía encuestas por id
      // adivinable). save-survey en modo GET valida origen y devuelve lo justo.
      const resp = await fetch(`/api/save-survey?encuestaId=${encodeURIComponent(encuestaId)}`);
      if (!resp.ok) {
        setEstado("error");
        return;
      }
      const data = await resp.json();

      if (data?.estrellas) {
        setEstado("yaRespondida");
        setEstrellas(data.estrellas);
      }
      setEncuesta({
        estrellas: data.estrellas,
        cliente_nombre: data.cliente_nombre,
        barbero_id: data.barbero_id,
        barberia: { nombre: data.barberiaNombre },
      });
    } catch (err) {
      setEstado("error");
    }
  };

  const enviarEncuesta = async () => {
    if (!estrellas) return;
    setEstado("enviando");
    try {
      const response = await fetch("/api/save-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encuestaId, estrellas, comentario }),
      });
      const data = await response.json();
      if (data.yaRespondida) {
        setEstado("yaRespondida");
      } else if (data.ok) {
        setEstado("ok");
      } else {
        setEstado("error");
      }
    } catch (err) {
      setEstado("error");
    }
  };

  const emojis = ["😞", "😕", "😐", "😊", "🤩"];
  const etiquetas = ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"];
  const colores = ["text-red-400", "text-orange-400", "text-yellow-400", "text-green-400", "text-emerald-400"];

  const barberiaNombre = encuesta?.barberia?.nombre || "Tu Barbería";

  return (
    <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-200 mb-1">{barberiaNombre}</h1>
          <p className="text-stone-400">Encuesta de satisfacción</p>
        </div>

        {/* Estado: ya respondida */}
        {estado === "yaRespondida" && (
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">{emojis[estrellas - 1] || "⭐"}</div>
            <h2 className="text-xl font-bold mb-2">¡Ya respondiste esta encuesta!</h2>
            <p className="text-stone-400">Tu calificación de {estrellas} estrella{estrellas !== 1 ? "s" : ""} fue registrada. ¡Gracias!</p>
          </div>
        )}

        {/* Estado: enviado OK */}
        {estado === "ok" && (
          <div className="bg-stone-900 border border-green-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Gracias por tu opinión!</h2>
            <p className="text-stone-400 mb-4">Tu calificación de <strong className="text-amber-200">{estrellas} estrella{estrellas !== 1 ? "s" : ""}</strong> fue registrada.</p>
            <p className="text-stone-500 text-sm">Nos ayuda a mejorar el servicio 🙏</p>
          </div>
        )}

        {/* Estado: error */}
        {estado === "error" && (
          <div className="bg-red-900 border border-red-700 rounded-xl p-8 text-center">
            <AlertCircle size={40} className="text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Hubo un problema</h2>
            <p className="text-red-300">No pudimos registrar tu respuesta. Por favor intenta de nuevo.</p>
            <button onClick={() => setEstado("pendiente")} className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-600 rounded font-bold">
              Reintentar
            </button>
          </div>
        )}

        {/* Estado: pendiente / enviando */}
        {(estado === "pendiente" || estado === "enviando") && (
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-8">
            <div className="text-center mb-6">
              <p className="text-lg font-semibold mb-1">
                Hola {encuesta?.cliente_nombre} 👋
              </p>
              <p className="text-stone-400 text-sm">
                ¿Cómo estuvo tu visita con <strong className="text-white">{encuesta?.barbero_id ? "nuestro equipo" : "nosotros"}</strong>?
              </p>
            </div>

            {/* Estrellas */}
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setEstrellas(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="text-4xl transition-transform hover:scale-125"
                >
                  {n <= (hover || estrellas) ? "⭐" : "☆"}
                </button>
              ))}
            </div>

            {/* Etiqueta */}
            {(hover || estrellas) > 0 && (
              <p className={`text-center text-sm font-bold mb-6 ${colores[(hover || estrellas) - 1]}`}>
                {emojis[(hover || estrellas) - 1]} {etiquetas[(hover || estrellas) - 1]}
              </p>
            )}

            {/* Comentario */}
            {estrellas > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-stone-300">
                  Comentario <span className="text-stone-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Cuéntanos más sobre tu experiencia..."
                  rows={3}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white resize-none text-sm"
                />
              </div>
            )}

            <button
              onClick={enviarEncuesta}
              disabled={!estrellas || estado === "enviando"}
              className="w-full py-3 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {estado === "enviando" ? "Enviando..." : estrellas ? "Enviar calificación" : "Selecciona una calificación"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
