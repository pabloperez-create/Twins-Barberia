import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  User,
  Users,
  Info,
} from "lucide-react";
import { CalendarioPicker } from "./components/CalendarioPicker";

// ⭐ ¿La hora ya pasó? Solo aplica si la fecha es hoy (hora de Chile).
// Evita que aparezcan horas pasadas (ej: son las 18h y muestra las 13h) al reservar.
function horaYaPaso(fecha, horaStr) {
  const ahoraCL = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }),
  );
  const hoyCL = `${ahoraCL.getFullYear()}-${String(ahoraCL.getMonth() + 1).padStart(2, "0")}-${String(ahoraCL.getDate()).padStart(2, "0")}`;
  if (fecha !== hoyCL) return false;
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m <= ahoraCL.getHours() * 60 + ahoraCL.getMinutes();
}

export function VistaReserva({ supabase, barberiaId }) {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState([]);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null);
  const [barberoAsignado, setBarberoAsignado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");

  const [servicios, setServicios] = useState([]);
  const [adicionales, setAdicionales] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [horariosBarbero, setHorariosBarbero] = useState([]);
  const [barberiaData, setBarberiaData] = useState(null);

  const CUALQUIERA = "cualquiera";
  // ⭐ FIX: mapeo de índice JS (0=dom) a keys de horarios_semana
  const DIAS_KEY = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

  useEffect(() => {
    cargarDatos();
    cargarBarberia();
  }, []);

  const cargarBarberia = async () => {
    try {
      const { data, error } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", barberiaId)
        .single();

      if (error) throw error;
      console.log("Barbería cargada:", data);
      setBarberiaData(data);
    } catch (err) {
      console.error("Error cargando barbería:", err);
    }
  };

  const cargarDatos = async () => {
    try {
      const { data: srvs } = await supabase
        .from("servicios_principales")
        .select("*")
        .eq("barberia_id", barberiaId)
        .eq("activo", true);

      const { data: ads } = await supabase
        .from("servicios_adicionales")
        .select("*")
        .eq("barberia_id", barberiaId)
        .eq("activo", true);

      const { data: brbs } = await supabase
        .from("barberos")
        .select("*")
        .eq("barberia_id", barberiaId)
        .eq("activo", true)
        .order("orden", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });

      console.log("Servicios cargados:", srvs);
      console.log("Adicionales cargados:", ads);
      console.log("Barberos cargados:", brbs);

      setServicios(srvs || []);
      setAdicionales(ads || []);
      setBarberos(brbs || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error cargando datos");
    }
  };

  const calcularDuracionTotal = () => {
    const duracionServicio = servicioSeleccionado?.duracion_minutos || 30;
    const duracionAdicionales = adicionalesSeleccionados.reduce(
      (sum, id) =>
        sum + (adicionales.find((a) => a.id === id)?.duracion_minutos || 0),
      0,
    );
    return duracionServicio + duracionAdicionales;
  };

  // ⭐ FIX: acepta overrides de horario para respetar el día específico
  const barberoDisponibleEnHora = (
    barbero,
    hora,
    reservasDelBarbero,
    bloqueosDelBarbero = [],
    horarioInicioOverride = null,
    horarioFinOverride = null,
  ) => {
    const duracionTotal = calcularDuracionTotal();
    const horaInicio = new Date(`2000-01-01 ${horarioInicioOverride || barbero.horario_inicio}`);
    const horaFin    = new Date(`2000-01-01 ${horarioFinOverride    || barbero.horario_fin}`);
    const horaTest   = new Date(`2000-01-01 ${hora}`);

    if (horaTest < horaInicio) return false;
    if (horaTest.getTime() + duracionTotal * 60000 > horaFin.getTime())
      return false;

    const choca = reservasDelBarbero.some((r) => {
      const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
      const horaResEnd = new Date(
        horaRes.getTime() + r.duracion_minutos * 60000,
      );
      return (
        horaTest < horaResEnd &&
        new Date(horaTest.getTime() + duracionTotal * 60000) > horaRes
      );
    });

    if (choca) return false;

    const horaTestEnd = new Date(horaTest.getTime() + duracionTotal * 60000);
    const chocaConBloqueo = bloqueosDelBarbero.some((b) => {
      if (!b.hora_inicio) return true;
      const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
      const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
      return horaTest < bFin && horaTestEnd > bInicio;
    });

    return !chocaConBloqueo;
  };

  const obtenerBloqueosDelBarbero = (barberoId, fecha, todosLosBloqueos) => {
    return todosLosBloqueos.filter((b) => {
      const aplicaABarbero =
        b.barbero_id === barberoId || b.barbero_id === null;
      const enRango = fecha >= b.fecha_inicio && fecha <= b.fecha_fin;
      return aplicaABarbero && enRango;
    });
  };

  const cargarHorariosBarbero = async (barberoId, fecha) => {
    try {
      const { data: reservasExistentes } = await supabase
        .from("reservas")
        .select("hora_inicio, duracion_minutos")
        .eq("barbero_id", barberoId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const bloqueosDelBarbero = (bloqueosExistentes || []).filter(
        (b) => b.barbero_id === barberoId || b.barbero_id === null,
      );

      const tieneBloqueoCompleto = bloqueosDelBarbero.some(
        (b) => !b.hora_inicio,
      );
      if (tieneBloqueoCompleto) {
        setHorariosBarbero([]);
        return;
      }

      const barbero = barberos.find((b) => b.id === barberoId);

      // ⭐ FIX: leer horario del día específico de la semana
      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];
      const horarioDia = barbero?.horarios_semana?.[diaSemana];

      if (horarioDia && !horarioDia.activo) {
        setHorariosBarbero([]);
        return;
      }

      const horaInicio = new Date(`2000-01-01 ${horarioDia?.inicio || barbero.horario_inicio}`);
      const horaFin    = new Date(`2000-01-01 ${horarioDia?.fin    || barbero.horario_fin}`);

      const duracionTotal = calcularDuracionTotal();
      const horariosDisponibles = [];
      let hora = new Date(horaInicio);

      while (hora.getTime() + duracionTotal * 60000 <= horaFin.getTime()) {
        const horaStr = hora.toTimeString().slice(0, 5);

        const chocaReserva = reservasExistentes.some((r) => {
          const horaRes = new Date(`2000-01-01 ${r.hora_inicio}`);
          const horaResEnd = new Date(
            horaRes.getTime() + r.duracion_minutos * 60000,
          );
          return (
            hora < horaResEnd &&
            new Date(hora.getTime() + duracionTotal * 60000) > horaRes
          );
        });

        const chocaBloqueo = bloqueosDelBarbero.some((b) => {
          if (!b.hora_inicio) return false;
          const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
          const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
          return (
            hora < bFin &&
            new Date(hora.getTime() + duracionTotal * 60000) > bInicio
          );
        });

        if (!chocaReserva && !chocaBloqueo && !horaYaPaso(fecha, horaStr)) {
          horariosDisponibles.push(horaStr);
        }

        hora.setMinutes(hora.getMinutes() + (barbero?.intervalo_minutos || 15));
      }

      setHorariosBarbero(horariosDisponibles);
    } catch (err) {
      console.error("Error cargando horarios:", err);
    }
  };

  const cargarHorariosCualquierBarbero = async (fecha) => {
    try {
      const { data: reservasExistentes } = await supabase
        .from("reservas")
        .select("barbero_id, hora_inicio, duracion_minutos")
        .eq("barberia_id", barberiaId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosExistentes || [];

      const barberiaCerrada = todosLosBloqueos.some(
        (b) => b.barbero_id === null && !b.hora_inicio,
      );
      if (barberiaCerrada) {
        setHorariosBarbero([]);
        return;
      }

      // ⭐ FIX: calcular día de la semana una sola vez
      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];

      let horaMinima = null;
      let horaMaxima = null;

      barberos.forEach((b) => {
        // ⭐ FIX: usar horario del día específico
        const horarioDia = b?.horarios_semana?.[diaSemana];
        if (horarioDia && !horarioDia.activo) return; // día libre para este barbero
        const inicioStr = horarioDia?.inicio || b.horario_inicio;
        const finStr    = horarioDia?.fin    || b.horario_fin;
        const inicio = new Date(`2000-01-01 ${inicioStr}`);
        const fin    = new Date(`2000-01-01 ${finStr}`);
        if (!horaMinima || inicio < horaMinima) horaMinima = inicio;
        if (!horaMaxima || fin    > horaMaxima) horaMaxima = fin;
      });

      if (!horaMinima || !horaMaxima) {
        setHorariosBarbero([]);
        return;
      }

      const horariosDisponibles = [];
      let hora = new Date(horaMinima);
      const duracionTotal = calcularDuracionTotal();

      while (hora.getTime() + duracionTotal * 60000 <= horaMaxima.getTime()) {
        const horaStr = hora.toTimeString().slice(0, 5);

        const hayAlguienDisponible = barberos.some((barbero) => {
          // ⭐ FIX: pasar horario del día a barberoDisponibleEnHora
          const horarioDia = barbero?.horarios_semana?.[diaSemana];
          if (horarioDia && !horarioDia.activo) return false;
          const reservasDelBarbero = reservasExistentes.filter(
            (r) => r.barbero_id === barbero.id,
          );
          const bloqueosDelBarbero = obtenerBloqueosDelBarbero(
            barbero.id,
            fecha,
            todosLosBloqueos,
          );
          return barberoDisponibleEnHora(
            barbero,
            horaStr,
            reservasDelBarbero,
            bloqueosDelBarbero,
            horarioDia?.inicio || null,
            horarioDia?.fin    || null,
          );
        });

        if (hayAlguienDisponible && !horaYaPaso(fecha, horaStr)) {
          horariosDisponibles.push(horaStr);
        }

        hora.setMinutes(hora.getMinutes() + (barberos[0]?.intervalo_minutos || 15));
      }

      setHorariosBarbero(horariosDisponibles);
    } catch (err) {
      console.error("Error cargando horarios (cualquier barbero):", err);
    }
  };

  const asignarBarberoBalanceado = async (fecha, hora) => {
    try {
      const { data: reservasDelDia } = await supabase
        .from("reservas")
        .select("barbero_id, hora_inicio, duracion_minutos")
        .eq("barberia_id", barberiaId)
        .eq("fecha", fecha)
        .eq("estado", "confirmada");

      const { data: bloqueosDelDia } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosDelDia || [];
      // ⭐ FIX: usar horario del día también en asignación
      const diaSemana = DIAS_KEY[new Date(fecha + "T12:00:00").getDay()];

      const barberosDisponibles = barberos.filter((barbero) => {
        const horarioDia = barbero?.horarios_semana?.[diaSemana];
        if (horarioDia && !horarioDia.activo) return false;
        const reservasDelBarbero = reservasDelDia.filter(
          (r) => r.barbero_id === barbero.id,
        );
        const bloqueosDelBarbero = obtenerBloqueosDelBarbero(
          barbero.id,
          fecha,
          todosLosBloqueos,
        );
        return barberoDisponibleEnHora(
          barbero,
          hora,
          reservasDelBarbero,
          bloqueosDelBarbero,
          horarioDia?.inicio || null,
          horarioDia?.fin    || null,
        );
      });

      if (barberosDisponibles.length === 0) {
        return null;
      }

      const barberosConCarga = barberosDisponibles.map((barbero) => {
        const cantidadReservas = reservasDelDia.filter(
          (r) => r.barbero_id === barbero.id,
        ).length;
        return { ...barbero, cantidadReservas };
      });

      barberosConCarga.sort((a, b) => a.cantidadReservas - b.cantidadReservas);

      return barberosConCarga[0];
    } catch (err) {
      console.error("Error asignando barbero:", err);
      return null;
    }
  };

  const calcularPrecioTotal = () => {
    let total = servicioSeleccionado?.precio || 0;
    adicionalesSeleccionados.forEach((id) => {
      const adicional = adicionales.find((a) => a.id === id);
      if (adicional) total += adicional.precio;
    });
    return total;
  };

  const irAlSiguiente = () => {
    if (paso < 6) {
      if (validarPaso()) {
        setPaso(paso + 1);
        setError("");
      }
    }
  };

  const irAlAnterior = () => {
    if (paso > 1) setPaso(paso - 1);
  };

  const validarPaso = () => {
    if (paso === 1 && !servicioSeleccionado) {
      setError("Selecciona un servicio");
      return false;
    }
    if (paso === 3 && !barberoSeleccionado) {
      setError("Selecciona un barbero (o 'Cualquiera')");
      return false;
    }
    if (paso === 4 && (!fechaSeleccionada || !horaSeleccionada)) {
      setError("Selecciona fecha y hora");
      return false;
    }
    if (paso === 5 && (!clienteNombre || !clienteTelefono || !clienteEmail)) {
      setError("Completa nombre, teléfono y email");
      return false;
    }
    if (paso === 5 && clienteEmail && !/\S+@\S+\.\S+/.test(clienteEmail)) {
      setError("El email no es válido");
      return false;
    }
    return true;
  };

  const confirmarReserva = async () => {
    if (!validarPaso()) {
      return;
    }

    setCargando(true);
    setError("");
    try {
      const precioTotal = calcularPrecioTotal();
      const reservaId = `r-${Date.now()}`;

      let barberoFinalId = barberoSeleccionado;
      let barberoFinalData = null;

      if (barberoSeleccionado === CUALQUIERA) {
        const asignado = await asignarBarberoBalanceado(
          fechaSeleccionada,
          horaSeleccionada,
        );

        if (!asignado) {
          setError("No hay barberos disponibles a esa hora. Selecciona otra.");
          setCargando(false);
          return;
        }

        barberoFinalId = asignado.id;
        barberoFinalData = asignado;
        setBarberoAsignado(asignado);
      } else {
        barberoFinalData = barberos.find((b) => b.id === barberoFinalId);
        setBarberoAsignado(barberoFinalData);
      }

      const { error: errorSupabase } = await supabase.from("reservas").insert({
        id: reservaId,
        barberia_id: barberiaId,
        barbero_id: barberoFinalId,
        servicio_id: servicioSeleccionado.id,
        adicionales_ids: adicionalesSeleccionados,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        cliente_email: clienteEmail || null,
        fecha: fechaSeleccionada,
        hora_inicio: horaSeleccionada,
        duracion_minutos: calcularDuracionTotal(),
        precio_original: precioTotal,
        precio_final: precioTotal,
        estado: "confirmada",
      });

      if (errorSupabase) throw errorSupabase;

      if (clienteEmail) {
        try {
          const emailResponse = await fetch("/api/send-confirmation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteEmail: clienteEmail,
              clienteNombre: clienteNombre,
              barberiaId: barberiaId,
              barberiaNombre: barberiaData?.nombre || "Tu Barbería",
              barberoNombre: barberoFinalData?.nombre || "el profesional",
              servicioNombre: servicioSeleccionado.nombre,
              precioServicio: servicioSeleccionado.precio,
              adicionales: adicionalesSeleccionados
                .map((adId) => {
                  const ad = adicionales.find((a) => a.id === adId);
                  return ad ? { nombre: ad.nombre, precio: ad.precio } : null;
                })
                .filter(Boolean),
              fecha: fechaSeleccionada,
              hora: horaSeleccionada,
              precio: precioTotal,
              whatsappBarberia:
                barberiaData?.configuracion?.whatsapp || "56000000000",
              direccionBarberia: barberiaData?.configuracion?.direccion || null,
              reservaId: reservaId,
            }),
          });

          const emailResult = await emailResponse.json();

          if (!emailResponse.ok) {
            console.error("⚠️ Reserva guardada pero email falló:", emailResult);
          } else {
            console.log("✅ Email enviado:", emailResult);
          }
        } catch (emailError) {
          console.error("⚠️ Error enviando email:", emailError);
        }
      }

      try {
        await fetch("/api/google-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barbero_id: barberoFinalId,
            reserva: {
              fecha: fechaSeleccionada,
              hora_inicio: horaSeleccionada,
              duracion_minutos: calcularDuracionTotal(),
              cliente_nombre: clienteNombre,
              cliente_telefono: clienteTelefono,
              cliente_email: clienteEmail || "",
              servicio: servicioSeleccionado.nombre,
              precio_final: precioTotal,
            }
          })
        });
      } catch (gcErr) {
        console.error("Error Google Calendar:", gcErr);
      }
      setPaso(6);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {barberiaData?.nombre || "Reservar Hora"}
        </h1>
        <p className="text-stone-400">Paso {paso} de 6</p>
      </div>

      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((p) => (
            <div
              key={p}
              className={`h-1 flex-1 rounded ${p <= paso ? "bg-amber-200" : "bg-stone-700"}`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {paso === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              ¿Qué servicio necesitas?
            </h2>
            <div className="grid gap-4">
              {servicios.map((servicio) => (
                <button
                  key={servicio.id}
                  onClick={() => setServicioSeleccionado(servicio)}
                  className={`p-6 rounded border-2 text-left transition ${
                    servicioSeleccionado?.id === servicio.id
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700 hover:border-stone-600"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{servicio.nombre}</h3>
                      <p className="text-stone-400 text-sm mt-1"></p>
                    </div>
                    <p className="text-amber-200 font-bold">
                      ${servicio.precio.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">¿Servicios adicionales?</h2>
            <p className="text-stone-400 mb-6">
              Selecciona los que desees (opcional)
            </p>
            <div className="grid gap-3">
              {adicionales.map((adicional) => (
                <button
                  key={adicional.id}
                  onClick={() => {
                    if (adicionalesSeleccionados.includes(adicional.id)) {
                      setAdicionalesSeleccionados(
                        adicionalesSeleccionados.filter(
                          (id) => id !== adicional.id,
                        ),
                      );
                    } else {
                      setAdicionalesSeleccionados([
                        ...adicionalesSeleccionados,
                        adicional.id,
                      ]);
                    }
                  }}
                  className={`p-4 rounded border-2 text-left transition flex justify-between items-center ${
                    adicionalesSeleccionados.includes(adicional.id)
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700 hover:border-stone-600"
                  }`}
                >
                  <div>
                    <h3 className="font-bold">{adicional.nombre}</h3>
                    <p className="text-stone-400 text-sm"></p>
                  </div>
                  <p className="text-amber-200">
                    +${adicional.precio.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              ¿Con quién deseas tu corte?
            </h2>
            <div className="grid gap-4">
              {!servicioSeleccionado?.barbero_exclusivo_id && (
                <button
                  onClick={() => {
                    setBarberoSeleccionado(CUALQUIERA);
                    setHoraSeleccionada("");
                  }}
                  className={`p-6 rounded border-2 text-left transition ${
                    barberoSeleccionado === CUALQUIERA
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700 hover:border-stone-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-amber-200 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users size={32} className="text-amber-200" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        Cualquier barbero disponible
                      </h3>
                      <p className="text-stone-400 text-sm">
                        Te asignamos el que tenga mayor disponibilidad
                      </p>
                    </div>
                  </div>
                </button>
              )}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-stone-700"></div>
                <p className="text-stone-500 text-xs">O ELIGE UN ESPECÍFICO</p>
                <div className="flex-1 h-px bg-stone-700"></div>
              </div>

              {(servicioSeleccionado?.barbero_exclusivo_id
                ? barberos.filter(
                    (b) => b.id === servicioSeleccionado.barbero_exclusivo_id,
                  )
                : barberos
              ).map((barbero) => (
                <button
                  key={barbero.id}
                  onClick={() => {
                    setBarberoSeleccionado(barbero.id);
                    setHoraSeleccionada("");
                  }}
                  className={`p-6 rounded border-2 text-left transition ${
                    barberoSeleccionado === barbero.id
                      ? "border-amber-200 bg-amber-200 bg-opacity-10"
                      : "border-stone-700 hover:border-stone-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {barbero.foto_url ? (
                        <img
                          src={barbero.foto_url}
                          alt={barbero.nombre}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "top",
                          }}
                        />
                      ) : (
                        <User size={32} className="text-amber-200" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{barbero.nombre}</h3>
                      <p className="text-stone-400 text-sm">
                        {barbero.especialidad || "Barbero"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">¿Cuándo prefieres?</h2>

            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3">Fecha</label>
              <CalendarioPicker
                value={fechaSeleccionada}
                onChange={(fecha) => {
                  setFechaSeleccionada(fecha);
                  setHoraSeleccionada("");
                  if (fecha && barberoSeleccionado) {
                    if (barberoSeleccionado === CUALQUIERA) {
                      cargarHorariosCualquierBarbero(fecha);
                    } else {
                      cargarHorariosBarbero(barberoSeleccionado, fecha);
                    }
                  }
                }}
                horariosSemana={
                  barberoSeleccionado === CUALQUIERA
                    ? null
                    : barberos.find((b) => b.id === barberoSeleccionado)?.horarios_semana
                }
              />
            </div>

            {fechaSeleccionada && (
              <div>
                <label className="block text-sm font-semibold mb-3">Hora</label>
                <div className="grid grid-cols-3 gap-2">
                  {horariosBarbero.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setHoraSeleccionada(hora)}
                      className={`p-3 rounded border-2 transition ${
                        horaSeleccionada === hora
                          ? "border-amber-200 bg-amber-200 text-stone-950"
                          : "border-stone-700 hover:border-stone-600"
                      }`}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
                {horariosBarbero.length === 0 && (
                  <p className="text-red-400 text-sm mt-3">
                    No hay horarios disponibles
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {paso === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Tus datos</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Teléfono <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="+56912345678"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <p className="text-stone-400 text-xs mb-2">
                  Te enviaremos la confirmación y recordatorios de tu cita
                </p>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {paso === 6 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">¡Reserva Confirmada!</h2>
            </div>

            <div className="bg-stone-900 p-6 rounded border border-stone-700 space-y-4">
              <div className="flex justify-between">
                <span className="text-stone-400">Barbero:</span>
                <span className="font-semibold">
                  {barberoAsignado?.nombre || "Asignado"}
                </span>
              </div>
              {barberoSeleccionado === CUALQUIERA && barberoAsignado && (
                <div className="bg-amber-200 bg-opacity-10 border border-amber-200 border-opacity-30 rounded p-3 flex items-start gap-2">
                  <Info
                    size={16}
                    className="text-amber-200 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-amber-200 text-sm">
                    Te asignamos a {barberoAsignado.nombre} por disponibilidad
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-400">Servicio:</span>
                <span className="font-semibold">
                  {servicioSeleccionado?.nombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Fecha:</span>
                <span className="font-semibold">{fechaSeleccionada}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Hora:</span>
                <span className="font-semibold">{horaSeleccionada}</span>
              </div>
              <div className="border-t border-stone-700 pt-4 flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-amber-200 font-bold text-xl">
                  ${calcularPrecioTotal().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {paso !== 6 && (
          <div className="flex gap-4 mt-8">
            {paso > 1 && (
              <button
                onClick={irAlAnterior}
                className="flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded border border-stone-700"
              >
                <ChevronLeft size={20} />
                Anterior
              </button>
            )}

            {paso < 5 && (
              <button
                onClick={irAlSiguiente}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded"
              >
                Siguiente
                <ChevronRight size={20} />
              </button>
            )}

            {paso === 5 && (
              <button
                onClick={confirmarReserva}
                disabled={cargando}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 font-bold rounded disabled:opacity-50"
              >
                {cargando ? "Confirmando..." : "Confirmar"}
              </button>
            )}
          </div>
        )}

        {paso === 6 && (
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded mt-8"
          >
            Hacer otra reserva
          </button>
        )}
      </div>
    </div>
  );
}
