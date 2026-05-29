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

function CategoriasFiltro({ servicios, categoriaActiva, setCategoriaActiva, T }) {
  const categorias = [...new Set(servicios.map(s => s.categoria || "General"))];
  if (categorias.length <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      <button
        onClick={() => setCategoriaActiva("todas")}
        style={{ padding: "6px 16px", borderRadius: 40, fontSize: 13, fontWeight: 500, border: "1.5px solid " + (categoriaActiva === "todas" ? T.accent : T.cardBorder), background: categoriaActiva === "todas" ? T.accent : "transparent", color: categoriaActiva === "todas" ? "#fff" : T.pageText, cursor: "pointer" }}
      >
        Todos
      </button>
      {categorias.map(cat => (
        <button
          key={cat}
          onClick={() => setCategoriaActiva(cat)}
          style={{ padding: "6px 16px", borderRadius: 40, fontSize: 13, fontWeight: 500, border: "1.5px solid " + (categoriaActiva === cat ? T.accent : T.cardBorder), background: categoriaActiva === cat ? T.accent : "transparent", color: categoriaActiva === cat ? "#fff" : T.pageText, cursor: "pointer" }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export function VistaReserva({ supabase, barberiaId }) {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [duracionesBarbero, setDuracionesBarbero] = useState({});
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
  const [barberiaData, setBarberiaData] = useState(null); // NUEVO: datos de la barbería

  const CUALQUIERA = "cualquiera";

  useEffect(() => {
    cargarDatos();
    cargarBarberia();
  }, []);

  // NUEVO: Carga datos de la barbería (nombre, whatsapp, dirección, etc.)
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
        .eq("barberia_id", barberiaId);

      const { data: ads } = await supabase
        .from("servicios_adicionales")
        .select("*")
        .eq("barberia_id", barberiaId);

      const { data: brbs } = await supabase
        .from("barberos")
        .select("*")
        .eq("barberia_id", barberiaId);

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

  const cargarDuracionesBarbero = async (barberoId) => {
    if (!barberoId || barberoId === "cualquiera") { setDuracionesBarbero({}); return; }
    try {
      const { data } = await supabase
        .from("duraciones_barbero")
        .select("servicio_id, duracion_minutos, tipo")
        .eq("barbero_id", barberoId);
      const map = {};
      (data || []).forEach(d => { map[d.servicio_id] = d.duracion_minutos; });
      setDuracionesBarbero(map);
    } catch (err) { console.error("Error cargando duraciones:", err); }
  };

  const calcularDuracionTotal = () => {
    const servicioId = servicioSeleccionado?.id;
    const duracionServicio = (servicioId && duracionesBarbero[servicioId])
      ? duracionesBarbero[servicioId]
      : (servicioSeleccionado?.duracion_minutos || 30);
    const duracionAdicionales = adicionalesSeleccionados.reduce(
      (sum, id) => {
        const durPersonal = duracionesBarbero[id];
        const durGeneral = adicionales.find((a) => a.id === id)?.duracion_minutos || 0;
        return sum + (durPersonal || durGeneral);
      },
      0,
    );
    return duracionServicio + duracionAdicionales;
  };

  const barberoDisponibleEnHora = (
    barbero,
    hora,
    reservasDelBarbero,
    bloqueosDelBarbero = [],
  ) => {
    const duracionTotal = calcularDuracionTotal();
    const horaInicio = new Date(`2000-01-01 ${barbero.horario_inicio}`);
    const horaFin = new Date(`2000-01-01 ${barbero.horario_fin}`);
    const horaTest = new Date(`2000-01-01 ${hora}`);

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

    // Verificar bloqueos
    const horaTestEnd = new Date(horaTest.getTime() + duracionTotal * 60000);
    const chocaConBloqueo = bloqueosDelBarbero.some((b) => {
      // Día completo
      if (!b.hora_inicio) return true;
      // Bloque de horas
      const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
      const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
      return horaTest < bFin && horaTestEnd > bInicio;
    });

    return !chocaConBloqueo;
  };

  // Helper: obtener bloqueos aplicables a un barbero en una fecha
  const obtenerBloqueosDelBarbero = (barberoId, fecha, todosLosBloqueos) => {
    return todosLosBloqueos.filter((b) => {
      const aplicaABarbero =
        b.barbero_id === barberoId || b.barbero_id === null;
      const enRango = fecha >= b.fecha_inicio && fecha <= b.fecha_fin;
      // Si tiene dias_semana, verificar que el día de la semana aplique
      if (b.dias_semana && Array.isArray(b.dias_semana) && b.dias_semana.length > 0) {
        const diaSemana = new Date(fecha + "T12:00:00").getDay();
        if (!b.dias_semana.includes(diaSemana)) return false;
      }
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

      // Cargar bloqueos del barbero + de la barbería
      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const bloqueosDelBarbero = (bloqueosExistentes || []).filter(
        (b) => b.barbero_id === barberoId || b.barbero_id === null,
      );

      // Si hay bloqueo de día completo, no hay horarios
      const tieneBloqueoCompleto = bloqueosDelBarbero.some(
        (b) => !b.hora_inicio,
      );
      if (tieneBloqueoCompleto) {
        setHorariosBarbero([]);
        return;
      }

      const barbero = barberos.find((b) => b.id === barberoId);
      const horaInicio = new Date(`2000-01-01 ${barbero.horario_inicio}`);
      const horaFin = new Date(`2000-01-01 ${barbero.horario_fin}`);

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

        // Verificar bloqueos de horas
        const chocaBloqueo = bloqueosDelBarbero.some((b) => {
          if (!b.hora_inicio) return false; // ya descartado arriba
          const bInicio = new Date(`2000-01-01 ${b.hora_inicio}`);
          const bFin = new Date(`2000-01-01 ${b.hora_fin}`);
          return (
            hora < bFin &&
            new Date(hora.getTime() + duracionTotal * 60000) > bInicio
          );
        });

        if (!chocaReserva && !chocaBloqueo) {
          horariosDisponibles.push(horaStr);
        }

        hora.setMinutes(hora.getMinutes() + (barbero.intervalo_minutos || 30));
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

      // Cargar todos los bloqueos relevantes
      const { data: bloqueosExistentes } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosExistentes || [];

      // Si hay un bloqueo a nivel de barbería (barbero_id = null) de día completo, no hay horarios
      const barberiaCerrada = todosLosBloqueos.some(
        (b) => b.barbero_id === null && !b.hora_inicio,
      );
      if (barberiaCerrada) {
        setHorariosBarbero([]);
        return;
      }

      let horaMinima = null;
      let horaMaxima = null;

      barberos.forEach((b) => {
        const inicio = new Date(`2000-01-01 ${b.horario_inicio}`);
        const fin = new Date(`2000-01-01 ${b.horario_fin}`);
        if (!horaMinima || inicio < horaMinima) horaMinima = inicio;
        if (!horaMaxima || fin > horaMaxima) horaMaxima = fin;
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
          );
        });

        if (hayAlguienDisponible) {
          horariosDisponibles.push(horaStr);
        }

        hora.setMinutes(hora.getMinutes() + 30);
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

      // Cargar bloqueos del día
      const { data: bloqueosDelDia } = await supabase
        .from("bloqueos_horarios")
        .select("*")
        .eq("barberia_id", barberiaId)
        .lte("fecha_inicio", fecha)
        .gte("fecha_fin", fecha);

      const todosLosBloqueos = bloqueosDelDia || [];

      const barberosDisponibles = barberos.filter((barbero) => {
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
      setError(esSalon ? "Selecciona una estilista (o 'Cualquiera')" : "Selecciona un barbero (o 'Cualquiera')");
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
    if (paso === 5 && clienteTelefono.length < 8) {
      setError("El teléfono debe tener 8 dígitos");
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
        cliente_telefono: "569" + clienteTelefono,
        cliente_email: clienteEmail || null,
        fecha: fechaSeleccionada,
        hora_inicio: horaSeleccionada,
        duracion_minutos: calcularDuracionTotal(),
        precio_original: precioTotal,
        precio_final: precioTotal,
        estado: "confirmada",
      });

      if (errorSupabase) throw errorSupabase;

      // Email con datos DINÁMICOS de la barbería (multi-tenant ✅)
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
              tipoNegocio: barberiaData?.tipo_negocio || "barberia",
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

      // WhatsApp de confirmación (si tiene teléfono y feature activa)
      if (clienteTelefono) {
        try {
          await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteTelefono: "569" + clienteTelefono,
              clienteNombre: clienteNombre,
              barberiaId: barberiaId,
              barberiaNombre: barberiaData?.nombre || "Tu Barbería",
              barberoNombre: barberoFinalData?.nombre || "el profesional",
              servicioNombre: servicioSeleccionado.nombre,
              fecha: fechaSeleccionada,
              hora: horaSeleccionada,
              precio: precioTotal,
              tipo: "confirmacion",
            }),
          });
        } catch (waError) {
          console.error("⚠️ Error enviando WhatsApp:", waError);
        }
      }

      // Google Calendar
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
              cliente_telefono: "569" + clienteTelefono,
              cliente_email: clienteEmail || "",
              servicio: servicioSeleccionado.nombre,
              precio_final: precioTotal
            }
          })
        });
      } catch (calError) {
        console.error("⚠️ Error Google Calendar:", calError);
      }
      setPaso(6);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setCargando(false);
  };

  const esSalon = barberiaData?.tipo_negocio === "salon" || (barberiaData === null && barberiaId !== "org-twins");
  const T = esSalon ? {
    pageBg: "#fce8f0", pageText: "#4a1030",
    cardBg: "#fff", cardBorder: "#f0c0d4",
    inputBg: "#fdf0f5", inputBorder: "#f0c0d4",
    accent: "#d4638a", accentText: "#fff",
    stepActive: "#d4638a", stepInactive: "#f0c0d4",
    labelColor: "#b05070", mutedColor: "#b08090",
    btnPrimary: "#d4638a", btnPrimaryText: "#fff",
    btnSecondary: "#fdf0f5", btnSecondaryText: "#b05070",
    btnSecondaryBorder: "#f0c0d4",
    successBg: "#fdf0f5", successBorder: "#f0c0d4", successText: "#7a1f42",
    errorBg: "#fff0f3", errorBorder: "#fca5a5", errorText: "#991b1b",
    tagBg: "#fce8f0", tagBorder: "#f0c0d4", tagText: "#7a1f42",
    tagActiveBg: "#d4638a", tagActiveBorder: "#d4638a", tagActiveText: "#fff",
  } : {
    pageBg: "#0c0a09", pageText: "#fff",
    cardBg: "#1c1917", cardBorder: "#44403c",
    inputBg: "#1c1917", inputBorder: "#44403c",
    accent: "#fde68a", accentText: "#0c0a09",
    stepActive: "#fde68a", stepInactive: "#44403c",
    labelColor: "#a8a29e", mutedColor: "#78716c",
    btnPrimary: "#fde68a", btnPrimaryText: "#0c0a09",
    btnSecondary: "#292524", btnSecondaryText: "#d6d3d1",
    btnSecondaryBorder: "#44403c",
    successBg: "#14532d", successBorder: "#166534", successText: "#bbf7d0",
    errorBg: "#450a0a", errorBorder: "#991b1b", errorText: "#fca5a5",
    tagBg: "#292524", tagBorder: "#44403c", tagText: "#d6d3d1",
    tagActiveBg: "#fde68a", tagActiveBorder: "#fde68a", tagActiveText: "#0c0a09",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, color: T.pageText, padding: 24 }}>
      <div className="max-w-4xl mx-auto mb-8" style={{ color: T.pageText }}>
        <h1 className="text-4xl font-bold mb-2">
          {barberiaData?.nombre || "Reservar Hora"}
        </h1>
        <p style={{ color: T.mutedColor }}>Paso {paso} de 6</p>
      </div>

      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((p) => (
            <div
              key={p}
              style={{ height: 4, flex: 1, borderRadius: 4, background: p <= paso ? T.stepActive : T.stepInactive }}
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
            {/* Botones de categoría */}
            <CategoriasFiltro
              servicios={servicios}
              categoriaActiva={categoriaActiva}
              setCategoriaActiva={setCategoriaActiva}
              T={T}
            />
            <div className="grid gap-3">
              {(categoriaActiva === "todas" ? servicios : servicios.filter(s => (s.categoria || "General") === categoriaActiva)).map((servicio) => {
                const seleccionado = servicioSeleccionado?.id === servicio.id;
                return (
                  <button
                    key={servicio.id}
                    onClick={() => setServicioSeleccionado(servicio)}
                    style={{ border: "2px solid " + (seleccionado ? T.tagActiveBg : T.cardBorder), background: seleccionado ? T.tagActiveBg + "22" : T.cardBg, borderRadius: 8, cursor: "pointer", padding: 16, textAlign: "left", width: "100%" }}
                  >
                    <div className="flex justify-between items-start">
                      <div style={{ flex: 1, marginRight: 12 }}>
                        <h3 className="font-bold text-lg">{servicio.nombre}</h3>
                        {servicio.descripcion && (
                          <p style={{ color: T.mutedColor, fontSize: 12, marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                            {servicio.descripcion}
                          </p>
                        )}
                      </div>
                      <p style={{ color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                        ${servicio.precio.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">¿Servicios adicionales?</h2>
            <p style={{ color: T.mutedColor, marginBottom: 24 }}>
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
                  style={{ border: "2px solid " + adicionalesSeleccionados.includes(adicional.id) ? T.tagActiveBg : T.cardBorder, background: adicionalesSeleccionados.includes(adicional.id) ? T.tagActiveBg + "22" : T.cardBg, borderRadius: 8, cursor: "pointer" }}
                >
                  <div>
                    <h3 className="font-bold">{adicional.nombre}</h3>
                  </div>
                  <p style={{ color: T.accent, fontWeight: 700 }}>
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
              {esSalon ? "¿Con quién deseas tu sesión?" : "¿Con quién deseas tu corte?"}
            </h2>
            <div className="grid gap-4">
              <button
                onClick={() => {
                  setBarberoSeleccionado(CUALQUIERA); cargarDuracionesBarbero(null);
                  setHoraSeleccionada("");
                }}
                style={{ border: "2px solid " + (barberoSeleccionado?.id === "cualquiera") ? T.tagActiveBg : T.cardBorder, background: (barberoSeleccionado?.id === "cualquiera") ? T.tagActiveBg + "22" : T.cardBg, borderRadius: 8, cursor: "pointer" }}
              >
                <div className="flex items-start gap-4">
                  <div style={{ width: 64, height: 64, background: `${T.accent}22`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users size={32} color={T.accent} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">
                      {esSalon ? "Cualquier estilista disponible" : "Cualquier barbero disponible"}
                    </h3>
                    <p style={{ color: T.mutedColor, fontSize: 13 }}>
                      {esSalon ? "Te asignamos la que tenga mayor disponibilidad" : "Te asignamos el que tenga mayor disponibilidad"}
                    </p>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div style={{ flex: 1, height: 1, background: T.cardBorder }}></div>
                <p className="text-stone-500 text-xs">O ELIGE UN ESPECÍFICO</p>
                <div style={{ flex: 1, height: 1, background: T.cardBorder }}></div>
              </div>

              {barberos.map((barbero) => (
                <button
                  key={barbero.id}
                  onClick={() => {
                    setBarberoSeleccionado(barbero.id); cargarDuracionesBarbero(barbero.id);
                    setHoraSeleccionada("");
                  }}
                  style={{ border: "2px solid " + (barberoSeleccionado === barbero.id) ? T.tagActiveBg : T.cardBorder, background: (barberoSeleccionado === barbero.id) ? T.tagActiveBg + "22" : T.cardBg, borderRadius: 8, cursor: "pointer" }}
                >
                  <div className="flex items-start gap-4">
                    <div style={{ width: 64, height: 64, background: T.inputBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {barbero.foto_url
                        ? <img src={barbero.foto_url} alt={barbero.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <User size={32} color={T.accent} />
                      }
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{barbero.nombre}</h3>
                      <p style={{ color: T.mutedColor, fontSize: 13 }}>
                        {barbero.especialidad || (esSalon ? "Estilista" : "Barbero")}
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
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => {
                  setFechaSeleccionada(e.target.value);
                  setHoraSeleccionada("");
                  if (e.target.value && barberoSeleccionado) {
                    if (barberoSeleccionado === CUALQUIERA) {
                      cargarHorariosCualquierBarbero(e.target.value);
                    } else {
                      cargarHorariosBarbero(
                        barberoSeleccionado,
                        e.target.value,
                      );
                    }
                  }
                }}
                min={new Date().toISOString().split("T")[0]}
                style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "12px 16px", color: T.pageText, outline: "none", boxSizing: "border-box" }}
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
                      style={{ padding: 12, borderRadius: 8, border: "2px solid " + (horaSeleccionada === hora ? T.accent : T.cardBorder), background: horaSeleccionada === hora ? T.accent + "22" : T.cardBg, cursor: "pointer", color: T.pageText }}
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
                  style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "12px 16px", color: T.pageText, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Teléfono <span className="text-red-400">*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", background: T.inputBg, border: "1px solid " + T.inputBorder, borderRadius: 8, overflow: "hidden" }}>
                  <span style={{ padding: "12px", color: T.labelColor, borderRight: "1px solid " + T.inputBorder, userSelect: "none", fontFamily: "monospace" }}>
                    +569
                  </span>
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) =>
                      setClienteTelefono(
                        e.target.value.replace(/\D/g, "").slice(0, 8),
                      )
                    }
                    placeholder="12345678"
                    maxLength={8}
                    style={{ flex: 1, background: "transparent", padding: "12px 16px", color: T.pageText, outline: "none" }}
                  />
                </div>
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
                  style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "12px 16px", color: T.pageText, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>
        )}

        {paso === 6 && (
          <div>
            <div className="text-center mb-8">
              <div style={{ width: 80, height: 80, background: T.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">¡Reserva Confirmada!</h2>
            </div>

            <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: 24 }} className="space-y-4">
              <div className="flex justify-between">
                <span style={{ color: T.labelColor }}>{esSalon ? "Estilista:" : "Barbero:"}</span>
                <span className="font-semibold">
                  {barberoAsignado?.nombre || "Asignado"}
                </span>
              </div>
              {barberoSeleccionado === CUALQUIERA && barberoAsignado && (
                <div style={{ background: T.tagBg, border: "1px solid " + T.tagBorder, borderRadius: 8, padding: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Info
                    size={16}
                    style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}
                  />
                  <p style={{ color: T.accent, fontSize: 13 }}>
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
              <div style={{ borderTop: "1px solid " + T.cardBorder, paddingTop: 16, display: "flex", justifyContent: "space-between" }}>
                <span className="font-semibold">Total:</span>
                <span style={{ color: T.accent, fontWeight: 700, fontSize: 20 }}>
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
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: T.btnSecondary, color: T.btnSecondaryText, border: "1px solid " + T.btnSecondaryBorder, borderRadius: 8, cursor: "pointer" }}
              >
                <ChevronLeft size={20} />
                Anterior
              </button>
            )}

            {paso < 5 && (
              <button
                onClick={irAlSiguiente}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", background: T.btnPrimary, color: T.btnPrimaryText, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer" }}
              >
                Siguiente
                <ChevronRight size={20} />
              </button>
            )}

            {paso === 5 && (
              <button
                onClick={confirmarReserva}
                disabled={cargando}
                style={{ flex: 1, padding: "12px 24px", background: T.btnPrimary, color: T.btnPrimaryText, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer" }}
              >
                {cargando ? "Confirmando..." : "Confirmar"}
              </button>
            )}
          </div>
        )}

        {paso === 6 && (
          <button
            onClick={() => window.location.reload()}
            style={{ width: "100%", padding: "12px 24px", background: T.btnPrimary, color: T.btnPrimaryText, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", marginTop: 32 }}
          >
            Hacer otra reserva
          </button>
        )}
      </div>
    </div>
  );
}
