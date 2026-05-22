import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  CalendarOff,
  ArrowRight,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Modal } from "../components/Modal";

export function TabMisDiasLibres({ supabase, barbero, barberia }) {
  const [bloqueos, setBloqueos] = useState([]);
  const [barberos, setBarberos] = useState([]); // Todos los barberos de la barbería
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Modal multi-paso
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasoModal, setPasoModal] = useState(1); // 1: form, 2: reservas afectadas

  // Form bloqueo
  const [form, setForm] = useState({
    tipo: "dia_completo", // 'dia_completo' | 'bloque_horas'
    fecha_inicio: "",
    fecha_fin: "",
    hora_inicio: "",
    hora_fin: "",
    motivo: "",
  });

  // Reservas afectadas
  const [reservasAfectadas, setReservasAfectadas] = useState([]);
  const [decisiones, setDecisiones] = useState({}); // { reserva_id: { action: 'cancel'|'reassign', barbero_id?: '' } }
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar bloqueos del barbero
      const hoy = new Date().toISOString().split("T")[0];
      const { data: bloqs } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barbero_id", barbero.id)
        .gte("fecha_fin", hoy)
        .order("fecha_inicio", { ascending: true });

      // Cargar otros barberos (para reasignación)
      const { data: brbs } = await supabase
        .from("barberos")
        .select("*")
        .eq("barberia_id", barbero.barberia_id)
        .eq("activo", true)
        .neq("id", barbero.id);

      setBloqueos(bloqs || []);
      setBarberos(brbs || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
  };

  const abrirModal = () => {
    setPasoModal(1);
    setForm({
      tipo: "dia_completo",
      fecha_inicio: "",
      fecha_fin: "",
      hora_inicio: "",
      hora_fin: "",
      motivo: "",
    });
    setReservasAfectadas([]);
    setDecisiones({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPasoModal(1);
  };

  // Validar paso 1 y buscar reservas afectadas
  const continuarAPaso2 = async () => {
    if (!form.fecha_inicio || !form.fecha_fin) {
      mostrarMensaje("error", "Selecciona las fechas");
      return;
    }
    if (form.fecha_inicio > form.fecha_fin) {
      mostrarMensaje(
        "error",
        "La fecha de inicio debe ser anterior a la de fin",
      );
      return;
    }
    if (form.tipo === "bloque_horas") {
      if (!form.hora_inicio || !form.hora_fin) {
        mostrarMensaje("error", "Especifica las horas del bloque");
        return;
      }
      if (form.hora_inicio >= form.hora_fin) {
        mostrarMensaje("error", "La hora de inicio debe ser menor a la de fin");
        return;
      }
    }

    setProcesando(true);
    try {
      // Buscar reservas afectadas
      let query = supabase
        .from("reservas")
        .select("*, servicio:servicio_id(nombre, precio)")
        .eq("barbero_id", barbero.id)
        .eq("estado", "confirmada")
        .gte("fecha", form.fecha_inicio)
        .lte("fecha", form.fecha_fin);

      const { data: reservas } = await query;

      let afectadas = reservas || [];

      // Si es bloque de horas, filtrar las que choquen
      if (form.tipo === "bloque_horas") {
        afectadas = afectadas.filter((r) => {
          const horaRes = r.hora_inicio.slice(0, 5);
          const horaResEnd = sumarMinutos(horaRes, r.duracion_minutos);
          return horaRes < form.hora_fin && horaResEnd > form.hora_inicio;
        });
      }

      // Para cada reserva, buscar barberos disponibles para reasignación
      const conSugerencias = await Promise.all(
        afectadas.map(async (r) => {
          const disponibles = await buscarBarberosDisponibles(r);
          return { ...r, barberosDisponibles: disponibles };
        }),
      );

      setReservasAfectadas(conSugerencias);

      // Pre-llenar decisiones con sugerencias automáticas
      const decisionesIniciales = {};
      conSugerencias.forEach((r) => {
        if (r.barberosDisponibles.length > 0) {
          decisionesIniciales[r.id] = {
            action: "reassign",
            barbero_id: r.barberosDisponibles[0].id,
          };
        } else {
          decisionesIniciales[r.id] = { action: "cancel" };
        }
      });
      setDecisiones(decisionesIniciales);

      // Si no hay reservas afectadas, ir directo a crear el bloqueo
      if (afectadas.length === 0) {
        await crearBloqueoFinal();
      } else {
        setPasoModal(2);
      }
    } catch (err) {
      console.error("Error buscando reservas afectadas:", err);
      mostrarMensaje("error", "Error: " + err.message);
    }
    setProcesando(false);
  };

  // Helper: sumar minutos a una hora "HH:MM"
  const sumarMinutos = (horaStr, minutos) => {
    const [h, m] = horaStr.split(":").map(Number);
    const fecha = new Date();
    fecha.setHours(h, m + minutos, 0, 0);
    return fecha.toTimeString().slice(0, 5);
  };

  // Buscar qué barberos están disponibles para tomar una reserva
  const buscarBarberosDisponibles = async (reserva) => {
    const disponibles = [];
    for (const otroBarbero of barberos) {
      // 1. Verificar horario laboral
      const horaInicioBarbero =
        otroBarbero.horario_inicio?.slice(0, 5) || "00:00";
      const horaFinBarbero = otroBarbero.horario_fin?.slice(0, 5) || "23:59";
      const horaRes = reserva.hora_inicio.slice(0, 5);
      const horaResEnd = sumarMinutos(horaRes, reserva.duracion_minutos);

      if (horaRes < horaInicioBarbero || horaResEnd > horaFinBarbero) {
        continue; // Fuera del horario laboral del otro barbero
      }

      // 2. Verificar si tiene reservas que choquen
      const { data: otrasReservas } = await supabase
        .from("reservas")
        .select("hora_inicio, duracion_minutos")
        .eq("barbero_id", otroBarbero.id)
        .eq("fecha", reserva.fecha)
        .eq("estado", "confirmada");

      const choca = (otrasReservas || []).some((or) => {
        const otraHora = or.hora_inicio.slice(0, 5);
        const otraHoraEnd = sumarMinutos(otraHora, or.duracion_minutos);
        return horaRes < otraHoraEnd && horaResEnd > otraHora;
      });

      if (choca) continue;

      // 3. Verificar si tiene bloqueo en esa fecha/hora
      const { data: bloqueos } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barbero_id", otroBarbero.id)
        .lte("fecha_inicio", reserva.fecha)
        .gte("fecha_fin", reserva.fecha);

      const tieneBloqueo = (bloqueos || []).some((b) => {
        // Día completo
        if (!b.hora_inicio) return true;
        // Bloque de horas
        const bInicio = b.hora_inicio.slice(0, 5);
        const bFin = b.hora_fin.slice(0, 5);
        return horaRes < bFin && horaResEnd > bInicio;
      });

      if (tieneBloqueo) continue;

      // ¡Está disponible!
      disponibles.push(otroBarbero);
    }
    return disponibles;
  };

  // Crear bloqueo final + ejecutar decisiones
  const crearBloqueoFinal = async () => {
    setProcesando(true);
    try {
      // 1. Crear el bloqueo
      const bloqueoId = `bl-${Date.now()}`;
      const { error: errorBloqueo } = await supabase
        .from("bloqueos_horarios")
        .insert({
          id: bloqueoId,
          barberia_id: barbero.barberia_id,
          barbero_id: barbero.id,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          hora_inicio: form.tipo === "bloque_horas" ? form.hora_inicio : null,
          hora_fin: form.tipo === "bloque_horas" ? form.hora_fin : null,
          motivo: form.motivo.trim() || null,
        });

      if (errorBloqueo) throw errorBloqueo;

      // 2. Ejecutar decisiones (cancelar o reasignar reservas)
      for (const reserva of reservasAfectadas) {
        const decision = decisiones[reserva.id];
        if (!decision) continue;

        if (decision.action === "cancel") {
          // Cancelar
          await supabase
            .from("reservas")
            .update({
              estado: "cancelada",
              motivo_cancelacion: `Bloqueo: ${form.motivo || "Sin motivo"}`,
            })
            .eq("id", reserva.id);

          // Email al cliente
          if (reserva.cliente_email) {
            try {
              await fetch("/api/send-cancellation-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clienteEmail: reserva.cliente_email,
                  clienteNombre: reserva.cliente_nombre,
                  barberiaId: barbero.barberia_id,
                  barberiaNombre: barberia?.nombre || "Tu Barbería",
                  barberoNombre: barbero.nombre,
                  servicioNombre: reserva.servicio?.nombre || "tu servicio",
                  fecha: reserva.fecha,
                  hora: reserva.hora_inicio,
                  motivo: form.motivo || null,
                  whatsappBarberia: barberia?.configuracion?.whatsapp || "",
                }),
              });
            } catch (e) {
              console.error("Error email cancelación:", e);
            }
          }
        } else if (decision.action === "reassign") {
          // Reasignar
          const nuevoBarbero = barberos.find(
            (b) => b.id === decision.barbero_id,
          );
          await supabase
            .from("reservas")
            .update({ barbero_id: decision.barbero_id })
            .eq("id", reserva.id);

          // Email al cliente
          if (reserva.cliente_email && nuevoBarbero) {
            try {
              await fetch("/api/send-reassignment-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clienteEmail: reserva.cliente_email,
                  clienteNombre: reserva.cliente_nombre,
                  barberiaId: barbero.barberia_id,
                  barberiaNombre: barberia?.nombre || "Tu Barbería",
                  barberoAnterior: barbero.nombre,
                  barberoNuevo: nuevoBarbero.nombre,
                  servicioNombre: reserva.servicio?.nombre || "tu servicio",
                  fecha: reserva.fecha,
                  hora: reserva.hora_inicio,
                  whatsappBarberia: barberia?.configuracion?.whatsapp || "",
                }),
              });
            } catch (e) {
              console.error("Error email reasignación:", e);
            }
          }
        }
      }

      const totalReasignadas = Object.values(decisiones).filter(
        (d) => d.action === "reassign",
      ).length;
      const totalCanceladas = Object.values(decisiones).filter(
        (d) => d.action === "cancel",
      ).length;

      let msg = "✅ Bloqueo creado";
      if (totalReasignadas > 0) msg += ` · ${totalReasignadas} reasignada(s)`;
      if (totalCanceladas > 0) msg += ` · ${totalCanceladas} cancelada(s)`;

      mostrarMensaje("success", msg);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      console.error("Error creando bloqueo:", err);
      mostrarMensaje("error", "Error: " + err.message);
    }
    setProcesando(false);
  };

  const eliminarBloqueo = async (bloqueo) => {
    if (!confirm(`¿Eliminar este bloqueo (${bloqueo.motivo || "sin motivo"})?`))
      return;

    try {
      const { error } = await supabase
        .from("bloqueos_horarios")
        .delete()
        .eq("id", bloqueo.id);

      if (error) throw error;
      mostrarMensaje("success", "✅ Bloqueo eliminado");
      cargarDatos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const formatearBloqueo = (b) => {
    const inicio = b.fecha_inicio;
    const fin = b.fecha_fin;
    let texto = inicio === fin ? inicio : `${inicio} al ${fin}`;
    if (b.hora_inicio && b.hora_fin) {
      texto += ` · ${b.hora_inicio.slice(0, 5)} - ${b.hora_fin.slice(0, 5)}`;
    } else {
      texto += " · Día completo";
    }
    return texto;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mis Días Libres</h2>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
        >
          <Plus size={18} />
          Nuevo bloqueo
        </button>
      </div>

      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-4 flex items-center gap-3 ${
            mensaje.tipo === "success"
              ? "bg-green-900 border border-green-700 text-green-200"
              : "bg-red-900 border border-red-700 text-red-200"
          }`}
        >
          {mensaje.tipo === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {cargando ? (
        <p className="text-stone-400">Cargando...</p>
      ) : bloqueos.length === 0 ? (
        <div className="bg-stone-900 border border-stone-700 rounded p-8 text-center">
          <CalendarOff size={48} className="mx-auto mb-3 text-stone-600" />
          <p className="text-stone-400 mb-2">
            No tienes días libres programados
          </p>
          <p className="text-stone-500 text-sm">
            Crea bloqueos para vacaciones, días personales o citas médicas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bloqueos.map((b) => (
            <div
              key={b.id}
              className="bg-stone-900 border border-stone-700 rounded p-4 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-900 bg-opacity-30 rounded">
                  <CalendarOff size={20} className="text-red-300" />
                </div>
                <div>
                  <p className="font-semibold">
                    {b.motivo || "Sin motivo especificado"}
                  </p>
                  <p className="text-sm text-stone-400">
                    {formatearBloqueo(b)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => eliminarBloqueo(b)}
                className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL Multi-paso */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={pasoModal === 1 ? "Nuevo bloqueo" : "⚠️ Reservas afectadas"}
        footer={
          pasoModal === 1 ? (
            <>
              <button
                onClick={cerrarModal}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={continuarAPaso2}
                disabled={procesando}
                className="flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
              >
                {procesando ? "Verificando..." : "Continuar"}
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPasoModal(1)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
              >
                <ArrowLeft size={14} />
                Atrás
              </button>
              <button
                onClick={crearBloqueoFinal}
                disabled={procesando}
                className="px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
              >
                {procesando ? "Procesando..." : "Confirmar y crear bloqueo"}
              </button>
            </>
          )
        }
      >
        {pasoModal === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Tipo de bloqueo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, tipo: "dia_completo" })}
                  className={`p-3 rounded border-2 text-sm ${
                    form.tipo === "dia_completo"
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700"
                  }`}
                >
                  🏖️ Día(s) completo(s)
                </button>
                <button
                  onClick={() => setForm({ ...form, tipo: "bloque_horas" })}
                  className={`p-3 rounded border-2 text-sm ${
                    form.tipo === "bloque_horas"
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700"
                  }`}
                >
                  ⏰ Bloque de horas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Desde <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha_inicio: e.target.value,
                      fecha_fin: form.fecha_fin || e.target.value,
                    })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Hasta <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) =>
                    setForm({ ...form, fecha_fin: e.target.value })
                  }
                  min={form.fecha_inicio}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            {form.tipo === "bloque_horas" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Hora inicio <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) =>
                      setForm({ ...form, hora_inicio: e.target.value })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Hora fin <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) =>
                      setForm({ ...form, hora_fin: e.target.value })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">
                Motivo (opcional)
              </label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Vacaciones, médico, día personal"
                className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        )}

        {pasoModal === 2 && (
          <div className="space-y-4">
            <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded p-3 text-sm">
              <p className="text-amber-200">
                Encontramos <strong>{reservasAfectadas.length}</strong>{" "}
                reserva(s) que se cruzan con tu bloqueo. Para cada una, elige
                qué hacer:
              </p>
            </div>

            {reservasAfectadas.map((r) => {
              const decision = decisiones[r.id] || { action: "cancel" };
              const hayDisponibles = r.barberosDisponibles.length > 0;
              return (
                <div
                  key={r.id}
                  className="bg-stone-800 border border-stone-700 rounded p-3"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-sm">
                      {r.cliente_nombre} · {r.fecha} {r.hora_inicio.slice(0, 5)}
                    </p>
                    <p className="text-xs text-stone-400">
                      {r.servicio?.nombre} · {r.duracion_minutos} min
                    </p>
                  </div>

                  {hayDisponibles ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={decision.action === "reassign"}
                          onChange={() =>
                            setDecisiones({
                              ...decisiones,
                              [r.id]: {
                                action: "reassign",
                                barbero_id:
                                  decision.barbero_id ||
                                  r.barberosDisponibles[0].id,
                              },
                            })
                          }
                        />
                        <Users size={14} className="text-green-400" />
                        <span className="text-sm">Reasignar a:</span>
                        <select
                          value={
                            decision.barbero_id || r.barberosDisponibles[0].id
                          }
                          onChange={(e) =>
                            setDecisiones({
                              ...decisiones,
                              [r.id]: {
                                action: "reassign",
                                barbero_id: e.target.value,
                              },
                            })
                          }
                          disabled={decision.action !== "reassign"}
                          className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs"
                        >
                          {r.barberosDisponibles.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={decision.action === "cancel"}
                          onChange={() =>
                            setDecisiones({
                              ...decisiones,
                              [r.id]: { action: "cancel" },
                            })
                          }
                        />
                        <span className="text-sm text-red-300">
                          Cancelar reserva
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-red-900 bg-opacity-30 border border-red-800 rounded p-2 text-xs">
                      <p className="text-red-200">
                        ⚠️ Ningún otro barbero está disponible. Se cancelará
                        automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
