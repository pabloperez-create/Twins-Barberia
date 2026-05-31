import React, { useState, useEffect } from "react";
import { Send, Plus, X, Check, AlertCircle, Mail, Users, Calendar, Tag } from "lucide-react";
import { FeatureBloqueada } from "../components/FeatureBloqueada";
import { isFeatureEnabled } from "../utils/features";

export function TabMarketing({ supabase, barberiaId, barberia }) {
  const [campanas, setCampanas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [configInactivos, setConfigInactivos] = useState({
    activo: false,
    dias_inactividad: 15,
    frecuencia_reenvio: 30,
    asunto: "¡Te echamos de menos!",
    mensaje: "Hola {nombre}, hace {dias} días que no nos visitas. ¡Te esperamos con los brazos abiertos!",
  });
  const [guardandoInactivos, setGuardandoInactivos] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const [form, setForm] = useState({
    asunto: "",
    mensaje: "",
    tipo_promo: "",
    valor_promo: "",
    codigo_promo: "",
    fecha_envio: "",
    hora_envio: "10:00",
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Config inactivos
      const configGuardada = barberia?.configuracion?.marketing_inactivos;
      if (configGuardada) setConfigInactivos(prev => ({ ...prev, ...configGuardada }));
      // Campañas
      const { data: camps } = await supabase
        .from("campanas_marketing")
        .select("*")
        .eq("barberia_id", barberiaId)
        .order("fecha_envio", { ascending: false });

      // Clientes únicos
      const { data: reservas } = await supabase
        .from("reservas")
        .select("cliente_email, cliente_nombre")
        .eq("barberia_id", barberiaId)
        .eq("estado", "confirmada")
        .not("cliente_email", "is", null);

      const clientesMap = {};
      (reservas || []).forEach((r) => {
        if (r.cliente_email && !clientesMap[r.cliente_email]) {
          clientesMap[r.cliente_email] = r.cliente_nombre;
        }
      });

      setCampanas(camps || []);
      setClientes(Object.entries(clientesMap));
    } catch (err) {
      console.error("Error:", err);
    }
    setCargando(false);
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const crearCampana = async () => {
    if (!form.asunto || !form.mensaje || !form.fecha_envio) {
      mostrarMensaje("error", "Completa asunto, mensaje y fecha de envío");
      return;
    }

    setGuardando(true);
    try {
      const fechaEnvio = `${form.fecha_envio}T${form.hora_envio}:00`;
      const id = `camp-${Date.now()}`;

      const { error } = await supabase.from("campanas_marketing").insert({
        id,
        barberia_id: barberiaId,
        asunto: form.asunto,
        mensaje: form.mensaje,
        tipo_promo: form.tipo_promo || null,
        valor_promo: form.valor_promo ? parseInt(form.valor_promo) : null,
        codigo_promo: form.codigo_promo || null,
        fecha_envio: fechaEnvio,
        estado: "programada",
        creada_por: barberiaId,
      });

      if (error) throw error;

      mostrarMensaje("success", `✅ Campaña programada para ${form.fecha_envio} a las ${form.hora_envio}`);
      setModalAbierto(false);
      setForm({ asunto: "", mensaje: "", tipo_promo: "", valor_promo: "", codigo_promo: "", fecha_envio: "", hora_envio: "10:00" });
      cargarDatos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
    setGuardando(false);
  };

  const cancelarCampana = async (id) => {
    if (!confirm("¿Cancelar esta campaña?")) return;
    try {
      await supabase.from("campanas_marketing").update({ estado: "cancelada" }).eq("id", id);
      mostrarMensaje("success", "Campaña cancelada");
      cargarDatos();
    } catch (err) {
      mostrarMensaje("error", "Error: " + err.message);
    }
  };

  const guardarConfigInactivos = async () => {
    setGuardandoInactivos(true);
    try {
      await supabase.from("barberia").update({
        configuracion: { ...barberia.configuracion, marketing_inactivos: configInactivos }
      }).eq("id", barberiaId);
      setMensaje({ tipo: "success", texto: "✅ Configuración guardada" });
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error: " + err.message });
    }
    setGuardandoInactivos(false);
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };
  if (!isFeatureEnabled(barberia, "marketing_automatizado")) {
    return <FeatureBloqueada nombre="Marketing automatizado" planRequerido="plus" />;
  }

  if (cargando) return <div><h2 className="text-2xl font-bold mb-6">📣 Marketing</h2><p className="text-stone-400">Cargando...</p></div>;

  const estadoColor = { programada: "text-amber-400", enviada: "text-green-400", cancelada: "text-stone-500" };
  const estadoLabel = { programada: "Programada", enviada: "Enviada", cancelada: "Cancelada" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📣 Marketing</h2>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-4 py-2 rounded"
        >
          <Plus size={18} />
          Nueva campaña
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-6 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-stone-900 border border-stone-700 rounded p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users size={16} className="text-amber-200" />
          </div>
          <p className="text-3xl font-bold text-amber-200">{clientes.length}</p>
          <p className="text-stone-400 text-xs mt-1">Clientes en lista</p>
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded p-4 text-center">
          <p className="text-3xl font-bold text-white">{campanas.filter(c => c.estado === "programada").length}</p>
          <p className="text-stone-400 text-xs mt-1">Programadas</p>
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{campanas.filter(c => c.estado === "enviada").reduce((s, c) => s + (c.total_enviados || 0), 0)}</p>
          <p className="text-stone-400 text-xs mt-1">Emails enviados</p>
        </div>
      </div>

      {/* Lista campañas */}
      {campanas.length === 0 ? (
        <div className="bg-stone-900 border border-stone-700 rounded p-8 text-center">
          <Mail size={40} className="text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400">No hay campañas aún.</p>
          <p className="text-stone-500 text-sm mt-1">Crea tu primera campaña para llegar a tus clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanas.map((c) => (
            <div key={c.id} className="bg-stone-900 border border-stone-700 rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${estadoColor[c.estado]}`}>● {estadoLabel[c.estado]}</span>
                    {c.tipo_promo && <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded">🎁 Promo</span>}
                  </div>
                  <p className="font-semibold">{c.asunto}</p>
                  <p className="text-stone-400 text-sm mt-1 line-clamp-2">{c.mensaje}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(c.fecha_envio).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {c.estado === "enviada" && (
                      <span className="flex items-center gap-1 text-green-400">
                        <Send size={11} />
                        {c.total_enviados} enviados
                      </span>
                    )}
                    {c.codigo_promo && (
                      <span className="flex items-center gap-1">
                        <Tag size={11} />
                        {c.codigo_promo}
                      </span>
                    )}
                  </div>
                </div>
                {c.estado === "programada" && (
                  <button onClick={() => cancelarCampana(c.id)} className="p-2 text-stone-500 hover:text-red-400 transition flex-shrink-0">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva campaña */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-700">
              <h3 className="text-lg font-bold">Nueva campaña</h3>
              <button onClick={() => setModalAbierto(false)} className="p-2 hover:bg-stone-800 rounded"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Destinatarios */}
              <div className="bg-stone-800 rounded p-3 flex items-center gap-2 text-sm">
                <Users size={16} className="text-amber-200" />
                <span className="text-stone-300">Se enviará a <strong className="text-white">{clientes.length} clientes</strong> de tu base de datos</span>
              </div>

              {/* Asunto */}
              <div>
                <label className="block text-sm font-semibold mb-1">Asunto <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.asunto}
                  onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                  placeholder="Ej: ¡Oferta especial este fin de semana! 🔥"
                  className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Mensaje <span className="text-red-400">*</span>
                  <span className="text-stone-400 font-normal ml-2 text-xs">Usa {"{nombre}"} para personalizar</span>
                </label>
                <textarea
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  placeholder={"Hola {nombre}! 👋\n\nTe tenemos una oferta especial..."}
                  rows={5}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm resize-none"
                />
              </div>

              {/* Promo */}
              <div className="border border-stone-700 rounded p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-300">🎁 Promoción (opcional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {["", "porcentaje", "monto"].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setForm({ ...form, tipo_promo: tipo, valor_promo: "", codigo_promo: "" })}
                      className={`px-3 py-2 rounded text-sm border transition ${form.tipo_promo === tipo ? "border-amber-200 bg-amber-200 bg-opacity-10 text-amber-200" : "border-stone-700 text-stone-400 hover:border-stone-500"}`}
                    >
                      {tipo === "" ? "Sin promo" : tipo === "porcentaje" ? "% Descuento" : "$ Monto fijo"}
                    </button>
                  ))}
                </div>

                {form.tipo_promo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        {form.tipo_promo === "porcentaje" ? "Porcentaje (%)" : "Monto ($)"}
                      </label>
                      <input
                        type="number"
                        value={form.valor_promo}
                        onChange={(e) => setForm({ ...form, valor_promo: e.target.value })}
                        placeholder={form.tipo_promo === "porcentaje" ? "20" : "5000"}
                        className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Código (opcional)</label>
                      <input
                        type="text"
                        value={form.codigo_promo}
                        onChange={(e) => setForm({ ...form, codigo_promo: e.target.value.toUpperCase() })}
                        placeholder="TWINS20"
                        className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Fecha de envío <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={form.fecha_envio}
                    onChange={(e) => setForm({ ...form, fecha_envio: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Hora</label>
                  <select
                    value={form.hora_envio}
                    onChange={(e) => setForm({ ...form, hora_envio: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
                  >
                    {["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-stone-500 text-xs">⏰ El cron revisa cada hora — el envío puede demorar hasta 60 min después de la hora programada.</p>
            </div>

            <div className="flex gap-3 p-6 border-t border-stone-700">
              <button onClick={() => setModalAbierto(false)} className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm">Cancelar</button>
              <button
                onClick={crearCampana}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold rounded text-sm disabled:opacity-50"
              >
                <Send size={16} />
                {guardando ? "Guardando..." : "Programar campaña"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Te echamos de menos */}
      <div className="bg-stone-900 border border-stone-700 rounded p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">💌 Te echamos de menos</h3>
            <p className="text-stone-400 text-sm mt-1">Envía un email automático a clientes inactivos</p>
          </div>
          <button
            onClick={() => setConfigInactivos({ ...configInactivos, activo: !configInactivos.activo })}
            className={`px-4 py-2 rounded font-bold text-sm ${configInactivos.activo ? "bg-green-700 text-white" : "bg-stone-700 text-stone-300"}`}
          >
            {configInactivos.activo ? "✅ Activo" : "⏸ Inactivo"}
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Días sin reservar</label>
              <select
                value={configInactivos.dias_inactividad}
                onChange={(e) => setConfigInactivos({ ...configInactivos, dias_inactividad: Number(e.target.value) })}
                className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
              >
                {[5,10,15,20,25,30].map(d => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Reenviar cada</label>
              <select
                value={configInactivos.frecuencia_reenvio}
                onChange={(e) => setConfigInactivos({ ...configInactivos, frecuencia_reenvio: Number(e.target.value) })}
                className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
              >
                {[7,14,21,30,60].map(d => <option key={d} value={d}>Cada {d} días</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Asunto del email</label>
            <input
              type="text"
              value={configInactivos.asunto}
              onChange={(e) => setConfigInactivos({ ...configInactivos, asunto: e.target.value })}
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Mensaje <span className="text-stone-500 font-normal">(usa {"{nombre}"} y {"{dias}"})</span></label>
            <textarea
              value={configInactivos.mensaje}
              onChange={(e) => setConfigInactivos({ ...configInactivos, mensaje: e.target.value })}
              rows={3}
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <button
            onClick={guardarConfigInactivos}
            disabled={guardandoInactivos}
            className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
          >
            <Send size={16} />
            {guardandoInactivos ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}
