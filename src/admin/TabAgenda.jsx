import React, { useState, useEffect } from "react";
import { Calendar, Phone, Mail } from "lucide-react";

export function TabAgenda({ supabase, barberiaId }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("proximas"); // 'proximas' | 'hoy' | 'todas'

  useEffect(() => {
    cargarReservas();
  }, [filtro]);

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("reservas")
        .select(
          "*, barbero:barbero_id(nombre), servicio:servicio_id(nombre, precio)",
        )
        .eq("barberia_id", barberiaId);

      if (filtro === "hoy") {
        query = query.eq("fecha", hoy);
      } else if (filtro === "proximas") {
        query = query.gte("fecha", hoy);
      }

      query = query.order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });

      const { data, error } = await query;
      if (!error) setReservas(data || []);
    } catch (err) {
      console.error("Error cargando reservas:", err);
    }
    setCargando(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Agenda</h2>
        <div className="flex gap-2">
          {[
            { id: "hoy", label: "Hoy" },
            { id: "proximas", label: "Próximas" },
            { id: "todas", label: "Todas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded text-sm font-semibold transition ${
                filtro === f.id
                  ? "bg-amber-200 text-stone-950"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="text-stone-400">Cargando reservas...</p>
      ) : (
        <div className="bg-stone-900 rounded border border-stone-700 p-4">
          <p className="text-stone-400 mb-4 text-sm">
            Total: <span className="text-white font-semibold">{reservas.length}</span> reservas
          </p>

          {reservas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto mb-3 text-stone-600" />
              <p className="text-stone-400">No hay reservas en este filtro</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((r) => (
                <div
                  key={r.id}
                  className="bg-stone-800 p-4 rounded hover:bg-stone-700 transition"
                >
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">{r.cliente_nombre}</p>
                        {r.estado === "cancelada" && (
                          <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">
                            Cancelada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-400 mb-2">
                        📅 {r.fecha} · ⏰ {r.hora_inicio} · ✂️ {r.barbero?.nombre}
                      </p>
                      <p className="text-sm text-stone-400 mb-2">
                        {r.servicio?.nombre} · {r.duracion_minutos} min
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                        {r.cliente_telefono && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            +{r.cliente_telefono}
                          </span>
                        )}
                        {r.cliente_email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {r.cliente_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-amber-200 font-bold text-xl">
                      ${r.precio_final?.toLocaleString("es-CL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
