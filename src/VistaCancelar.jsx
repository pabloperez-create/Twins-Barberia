import React, { useState, useEffect } from "react";
import { Check, AlertCircle, CalendarX, Clock } from "lucide-react";
import { getTema } from "./utils/tema";

export function VistaCancelar({ supabase, reservaId, token }) {
  // estado: cargando | confirmar | cancelando | ok | yaCancelada | tarde | error | noEncontrada
  const [estado, setEstado] = useState("cargando");
  const [reserva, setReserva] = useState(null);
  const [barberia, setBarberia] = useState(null);
  const [limite, setLimite] = useState("");
  const [detalle, setDetalle] = useState({ barbero: "", servicio: "" });

  useEffect(() => {
    cargarReserva();
  }, []);

  const cargarReserva = async () => {
    try {
      // Lectura por endpoint con token (antes era un select directo que exponía
      // PII de cualquier reserva por id adivinable). El endpoint valida el token HMAC.
      const resp = await fetch(
        `/api/cancel-reservation?reservaId=${encodeURIComponent(reservaId)}&token=${encodeURIComponent(token)}`
      );
      if (!resp.ok) {
        setEstado(resp.status === 404 ? "noEncontrada" : "error");
        return;
      }
      const data = await resp.json();

      setReserva({ cliente_nombre: data.cliente_nombre, fecha: data.fecha, hora_inicio: data.hora_inicio, estado: data.estado });
      setDetalle({ barbero: data.barberoNombre || "", servicio: data.servicioNombre || "" });
      setBarberia({ nombre: data.barberiaNombre, tipo_barberia: data.tipo_barberia });

      if (data.estado === "cancelada") setEstado("yaCancelada");
      else setEstado("confirmar");
    } catch (err) {
      setEstado("error");
    }
  };

  const confirmarCancelacion = async () => {
    setEstado("cancelando");
    try {
      const response = await fetch("/api/cancel-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId, token }),
      });
      const data = await response.json();
      if (data.ok) setEstado("ok");
      else if (data.yaCancelada) setEstado("yaCancelada");
      else if (data.tarde) { setLimite(data.limite || ""); setEstado("tarde"); }
      else setEstado("error");
    } catch (err) {
      setEstado("error");
    }
  };

  const t = getTema(barberia);
  const barberiaNombre = barberia?.nombre || "Tu Reserva";

  return (
    <div className={`min-h-screen ${t.bg} ${t.texto} flex items-center justify-center p-6`}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${t.acento} mb-1`}>{barberiaNombre}</h1>
          <p className={t.textoSub}>Cancelación de reserva</p>
        </div>

        {/* Cargando */}
        {estado === "cargando" && (
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-8 text-center`}>
            <p className={t.textoSub}>Cargando tu reserva...</p>
          </div>
        )}

        {/* Confirmar / cancelando */}
        {(estado === "confirmar" || estado === "cancelando") && (
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-8`}>
            <div className="text-center mb-6">
              <CalendarX size={40} className={`${t.acento} mx-auto mb-3`} />
              <h2 className="text-xl font-bold mb-1">¿Cancelar tu reserva?</h2>
              <p className={`${t.textoSub} text-sm`}>
                Hola {reserva?.cliente_nombre} 👋, esta es la reserva que cancelarás:
              </p>
            </div>

            <div className={`${t.bgMuted} rounded-lg p-4 mb-6 space-y-2`}>
              <Fila t={t} label="Servicio" valor={detalle.servicio} />
              <Fila t={t} label="Profesional" valor={detalle.barbero} />
              <Fila t={t} label="Fecha y hora" valor={`${reserva?.fecha} · ${reserva?.hora_inicio}`} />
            </div>

            <button
              onClick={confirmarCancelacion}
              disabled={estado === "cancelando"}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed mb-3"
            >
              {estado === "cancelando" ? "Cancelando..." : "Sí, cancelar mi reserva"}
            </button>
            <p className={`${t.textoMuted} text-xs text-center`}>
              Si fue un error, simplemente cierra esta página.
            </p>
          </div>
        )}

        {/* Cancelada OK */}
        {estado === "ok" && (
          <div className={`${t.bgCard} border border-green-700 rounded-xl p-8 text-center`}>
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Reserva cancelada</h2>
            <p className={`${t.textoSub} mb-1`}>Tu reserva fue cancelada correctamente.</p>
            <p className={`${t.textoMuted} text-sm`}>Te enviamos un email de confirmación. ¡Esperamos verte pronto! 🙌</p>
          </div>
        )}

        {/* Ya estaba cancelada */}
        {estado === "yaCancelada" && (
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-8 text-center`}>
            <CalendarX size={40} className={`${t.textoSub} mx-auto mb-4`} />
            <h2 className="text-xl font-bold mb-2">Esta reserva ya está cancelada</h2>
            <p className={t.textoSub}>No hay nada más que hacer aquí.</p>
          </div>
        )}

        {/* Muy tarde para cancelar online */}
        {estado === "tarde" && (
          <div className={`${t.bgCard} border border-amber-700 rounded-xl p-8 text-center`}>
            <Clock size={40} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ya no se puede cancelar online</h2>
            <p className={t.textoSub}>
              Tu cita es en menos de {limite || "el tiempo permitido"}. Para cancelar a esta altura, por favor contacta directamente a la barbería.
            </p>
          </div>
        )}

        {/* No encontrada */}
        {estado === "noEncontrada" && (
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-8 text-center`}>
            <AlertCircle size={40} className={`${t.textoSub} mx-auto mb-4`} />
            <h2 className="text-xl font-bold mb-2">Reserva no encontrada</h2>
            <p className={t.textoSub}>El enlace no es válido o la reserva ya no existe.</p>
          </div>
        )}

        {/* Error */}
        {estado === "error" && (
          <div className="bg-red-900 border border-red-700 rounded-xl p-8 text-center">
            <AlertCircle size={40} className="text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Hubo un problema</h2>
            <p className="text-red-300 mb-4">No pudimos procesar la cancelación. Intenta de nuevo.</p>
            <button onClick={() => setEstado("confirmar")} className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded font-bold">
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Fila({ t, label, valor }) {
  return (
    <div>
      <p className={`${t.textoMuted} text-xs uppercase tracking-wide`}>{label}</p>
      <p className="font-semibold">{valor || "—"}</p>
    </div>
  );
}
