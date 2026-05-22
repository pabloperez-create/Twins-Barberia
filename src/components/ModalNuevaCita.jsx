import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Scissors,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Check,
  Plus,
  Mail,
} from "lucide-react";
import { isFeatureEnabled } from "../utils/features";

export function ModalNuevaCita({
  isOpen,
  onClose,
  onCreated,
  supabase,
  barberiaId,
  barberia,
  usuario,
}) {
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [servicios, setServicios] = useState([]);
  const [adicionales, setAdicionales] = useState([]);
  const [barberos, setBarberos] = useState([]);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState([]);
  const [barberoId, setBarberoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [enviarEmail, setEnviarEmail] = useState(true);

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      setClienteNombre("");
      setClienteTelefono("");
      setClienteEmail("");
      setServicioId("");
      setAdicionalesSeleccionados([]);
      setBarberoId("");
      setFecha(new Date().toISOString().split("T")[0]);
      setHora("");
      setEnviarEmail(true);
      setError("");
      setWarning("");
    }
  }, [isOpen]);

  const cargarCatalogos = async () => {
    setCargando(true);
    try {
      const [serv, adic, brbs] = await Promise.all([
        supabase
          .from("servicios_principales")
          .select("*")
          .eq("barberia_id", barberiaId)
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("servicios_adicionales")
          .select("*")
          .eq("barberia_id", barberiaId)
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("barberos")
          .select("*")
          .eq("barberia_id", barberiaId)
          .eq("activo", true)
          .order("nombre"),
      ]);

      setServicios(serv.data || []);
      setAdicionales(adic.data || []);
      setBarberos(brbs.data || []);
    } catch (err) {
      console.error("Error cargando catálogos:", err);
    }
    setCargando(false);
  };

  const servicioActual = servicios.find((s) => s.id === servicioId);

  const calcularDuracion = () => {
    let total = servicioActual?.duracion_minutos || 0;
    adicionalesSeleccionados.forEach((adId) => {
      const ad = adicionales.find((a) => a.id === adId);
      if (ad) total += ad.duracion_minutos || 0;
    });
    return total;
  };

  const calcularPrecio = () => {
    let total = servicioActual?.precio || 0;
    adicionalesSeleccionados.forEach((adId) => {
      const ad = adicionales.find((a) => a.id === adId);
      if (ad) total += ad.precio || 0;
    });
    return total;
  };

  const toggleAdicional = (adId) => {
    if (adicionalesSeleccionados.includes(adId)) {
      setAdicionalesSeleccionados(
        adicionalesSeleccionados.filter((id) => id !== adId),
      );
    } else {
      setAdicionalesSeleccionados([...adicionalesSeleccionados, adId]);
    }
  };

  const handleTelefonoChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "").slice(0, 8);
    setClienteTelefono(valor);
  };

  const verificarConflictos = async () => {
    if (!barberoId || !fecha || !hora || !servicioActual) return "";

    const duracion = calcularDuracion();

    try {
      const { data: reservas } = await supabase
        .from("reservas")
        .select("hora_inicio, duracion_minutos, cliente_nombre")
        .eq("barbero_id", barberoId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const horaInicio = new Date(`2000-01-01 ${hora}`);
      const horaFin = new Date(horaInicio.getTime() + duracion * 60000);

      const choca = (reservas || []).find((r) => {
        const rInicio = new Date(`2000-01-01 ${r.hora_inicio}`);
        const rFin = new Date(rInicio.getTime() + (r.duracion_minutos || 0) * 60000);
        return horaInicio < rFin && horaFin > rInicio;
      });

      if (choca) {
        return `⚠️ Esta hora choca con la reserva de ${choca.cliente_nombre} (${choca.hora_inicio.slice(0, 5)})`;
      }

      const { data: bloqueos } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const bloqueoAplica = (bloqueos || []).find((b) => {
        const aplicaABarbero = b.barbero_id === barberoId || b.barbero_id === null;
        if (!aplicaABarbero) return false;
        if (!b.hora_inicio) return true;
        const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
        const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
        return horaInicio < bFin && horaFin > bInicio;
      });

      if (bloqueoAplica) {
        const tipo = bloqueoAplica.barbero_id ? "del barbero" : "de la barbería";
        return `⚠️ Hay un bloqueo ${tipo}: "${bloqueoAplica.motivo || "Sin motivo"}"`;
      }

      return "";
    } catch (err) {
      console.error("Error verificando conflictos:", err);
      return "";
    }
  };

  useEffect(() => {
    if (barberoId && fecha && hora && servicioActual) {
      verificarConflictos().then((w) => setWarning(w));
    } else {
      setWarning("");
    }
    // eslint-disable-next-line
  }, [barberoId, fecha, hora, servicioId, adicionalesSeleccionados]);

  const crearCita = async () => {
    setError("");

    if (!clienteNombre.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }
    if (clienteTelefono.length !== 8) {
      setError("El teléfono debe tener 8 dígitos");
      return;
    }

    // ⭐ NUEVO: si el checkbox de email está marcado, el email es obligatorio
    if (enviarEmail && !clienteEmail.trim()) {
      setError("Email obligatorio si quieres enviar confirmación. Desmarca el checkbox o ingresa un email.");
      return;
    }

    if (clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail)) {
      setError("El formato del email no es válido");
      return;
    }
    if (!servicioId) {
      setError("Selecciona un servicio");
      return;
    }
    if (!barberoId) {
      setError("Selecciona un barbero");
      return;
    }
    if (!fecha || !hora) {
      setError("Selecciona fecha y hora");
      return;
    }

    if (warning) {
      if (!confirm(`${warning}\n\n¿Crear la cita de todos modos?`)) {
        return;
      }
    }

    setProcesando(true);
    try {
      const duracion = calcularDuracion();
      const precio = calcularPrecio();
      const telefonoCompleto = "569" + clienteTelefono;
      const reservaId = `r-${Date.now()}`;

      // ⭐ La columna correcta se llama "adicionales_ids" (tipo ARRAY)
      const { error: errorReserva } = await supabase.from("reservas").insert({
        id: reservaId,
        barberia_id: barberiaId,
        barbero_id: barberoId,
        servicio_id: servicioId,
        adicionales_ids: adicionalesSeleccionados.length > 0 ? adicionalesSeleccionados : null,
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: telefonoCompleto,
        cliente_email: clienteEmail.trim() || null,
        fecha,
        hora_inicio: hora,
        duracion_minutos: duracion,
        precio_original: servicioActual?.precio || 0,
        precio_final: precio,
        estado: "confirmada",
        creada_manualmente: true,
        creada_por_usuario_id: usuario?.id || null,
      });

      if (errorReserva) throw errorReserva;

      if (enviarEmail && clienteEmail.trim()) {
        try {
          const barberoNombre = barberos.find((b) => b.id === barberoId)?.nombre || "el profesional";
          
          // ⭐ Construir lista de adicionales con nombre y precio
          const adicionalesDetalle = adicionalesSeleccionados.map((adId) => {
            const ad = adicionales.find((a) => a.id === adId);
            return ad ? { nombre: ad.nombre, precio: ad.precio } : null;
          }).filter(Boolean);

          await fetch("/api/send-confirmation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barberiaId: barberiaId,
              clienteEmail: clienteEmail.trim(),
              clienteNombre: clienteNombre.trim(),
              barberiaNombre: barberia?.nombre || "Tu Barbería",
              barberoNombre,
              servicioNombre: servicioActual?.nombre || "tu servicio",
              precioServicio: servicioActual?.precio || 0,
              adicionales: adicionalesDetalle,
              fecha,
              hora,
              precio,
              whatsappBarberia: barberia?.configuracion?.whatsapp || "",
              direccionBarberia: barberia?.configuracion?.direccion || "",
              reservaId,
            }),
          });
        } catch (e) {
          console.error("Error email:", e);
        }
      }

      onCreated && onCreated();
      onClose();
    } catch (err) {
      console.error("Error creando cita:", err);
      setError("Error: " + err.message);
    }
    setProcesando(false);
  };

  if (!isOpen) return null;

  const puedeUsarFeatureEmail = isFeatureEnabled(barberia, "email_confirmacion");

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* ⭐ Forzar formato 24h en input time */}
      <style>{`
        input[type="time"]::-webkit-datetime-edit-ampm-field {
          display: none;
        }
        input[type="time"]::-webkit-clear-button,
        input[type="time"]::-webkit-inner-spin-button {
          display: none;
        }
        input[type="time"] {
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <div
        className="bg-stone-900 border border-stone-700 rounded-lg w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <Plus size={20} className="text-amber-200" />
            <h2 className="text-xl font-bold text-white">Nueva cita manual</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-800 rounded text-stone-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {cargando ? (
            <p className="text-stone-400 text-center py-8">Cargando datos...</p>
          ) : (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="bg-stone-800 rounded p-3">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-amber-200" />
                  <h3 className="font-semibold text-white">Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Nombre <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Pedro Sánchez"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Teléfono <span className="text-red-400">*</span>
                    </label>
                    <div className="flex">
                      <span className="bg-stone-700 border border-stone-700 border-r-0 rounded-l px-2 py-2 text-stone-300 text-sm">
                        +569
                      </span>
                      <input
                        type="tel"
                        value={clienteTelefono}
                        onChange={handleTelefonoChange}
                        placeholder="12345678"
                        maxLength={8}
                        className="flex-1 bg-stone-900 border border-stone-700 rounded-r px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-stone-400 mb-1">
                      Email {enviarEmail && <span className="text-red-400">*</span>}
                      {!enviarEmail && <span className="text-stone-500">(opcional)</span>}
                    </label>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Servicio */}
              <div className="bg-stone-800 rounded p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Scissors size={16} className="text-amber-200" />
                  <h3 className="font-semibold text-white">Servicio</h3>
                </div>
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="">Selecciona un servicio</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.duracion_minutos} min · ${s.precio.toLocaleString("es-CL")})
                    </option>
                  ))}
                </select>

                {adicionales.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-stone-400 mb-2">
                      Adicionales (opcional)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {adicionales.map((ad) => {
                        const seleccionado = adicionalesSeleccionados.includes(ad.id);
                        return (
                          <button
                            key={ad.id}
                            type="button"
                            onClick={() => toggleAdicional(ad.id)}
                            className={`text-left p-2 rounded text-xs border transition ${
                              seleccionado
                                ? "bg-amber-200 bg-opacity-10 border-amber-200 text-white"
                                : "bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800"
                            }`}
                          >
                            <p className="font-semibold">{ad.nombre}</p>
                            <p className="text-stone-400">
                              +${ad.precio.toLocaleString("es-CL")} · {ad.duracion_minutos}min
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Barbero + Fecha + Hora */}
              <div className="bg-stone-800 rounded p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-amber-200" />
                  <h3 className="font-semibold text-white">Cuándo y con quién</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Barbero <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={barberoId}
                      onChange={(e) => setBarberoId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                    >
                      <option value="">Elegir...</option>
                      {barberos.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Fecha <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Hora <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={hora ? hora.split(":")[0] : ""}
                        onChange={(e) => {
                          const h = e.target.value;
                          const m = hora ? hora.split(":")[1] || "00" : "00";
                          setHora(h ? `${h}:${m}` : "");
                        }}
                        className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-2 text-white text-sm"
                      >
                        <option value="">HH</option>
                        {Array.from({ length: 24 }, (_, i) => {
                          const val = String(i).padStart(2, "0");
                          return (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          );
                        })}
                      </select>
                      <span className="text-white py-2 text-sm">:</span>
                      <select
                        value={hora ? hora.split(":")[1] || "" : ""}
                        onChange={(e) => {
                          const m = e.target.value;
                          const h = hora ? hora.split(":")[0] : "";
                          if (h) setHora(`${h}:${m}`);
                        }}
                        disabled={!hora}
                        className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-2 text-white text-sm disabled:opacity-50"
                      >
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {servicioActual && (
                <div className="bg-stone-800 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-stone-400 text-sm">
                      <Clock size={14} className="inline mr-1" />
                      Duración: {calcularDuracion()} min
                    </span>
                    <span className="text-amber-200 font-bold text-lg">
                      <DollarSign size={16} className="inline" />
                      ${calcularPrecio().toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              )}

              {warning && (
                <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded p-3 flex items-start gap-2 text-amber-200 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{warning}</p>
                </div>
              )}

              {puedeUsarFeatureEmail && (
                <label className="flex items-center gap-2 cursor-pointer text-sm bg-stone-800 rounded p-3">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="accent-amber-200"
                  />
                  <Mail size={14} className="text-amber-200" />
                  <span className="text-stone-300">
                    Enviar email de confirmación al cliente
                  </span>
                </label>
              )}

              {error && (
                <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3 flex items-center gap-2 text-red-200 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-stone-700">
          <button
            onClick={onClose}
            disabled={procesando}
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm font-semibold text-stone-300"
          >
            Cancelar
          </button>
          <button
            onClick={crearCita}
            disabled={procesando || cargando}
            className="flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
          >
            {procesando ? (
              "Creando..."
            ) : (
              <>
                <Check size={14} />
                Crear cita
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
