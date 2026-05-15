import React, { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

export function TabEstadisticas({ supabase, barberiaId }) {
  const [stats, setStats] = useState({
    totalReservas: 0,
    reservasMes: 0,
    ingresosTotales: 0,
    ingresosMes: 0,
    barberoTop: null,
    servicioTop: null,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setCargando(true);
    try {
      // Obtener primer día del mes actual
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      // Cargar todas las reservas confirmadas
      const { data: reservas } = await supabase
        .from("reservas")
        .select("*, barbero:barbero_id(nombre), servicio:servicio_id(nombre)")
        .eq("barberia_id", barberiaId)
        .eq("estado", "confirmada");

      if (!reservas) return;

      const reservasMes = reservas.filter((r) => r.fecha >= primerDiaMes);

      // Top barbero (más reservas)
      const conteoBarberos = {};
      reservas.forEach((r) => {
        const nombre = r.barbero?.nombre || "Sin asignar";
        conteoBarberos[nombre] = (conteoBarberos[nombre] || 0) + 1;
      });
      const barberoTop = Object.entries(conteoBarberos).sort(
        (a, b) => b[1] - a[1],
      )[0];

      // Top servicio
      const conteoServicios = {};
      reservas.forEach((r) => {
        const nombre = r.servicio?.nombre || "Sin servicio";
        conteoServicios[nombre] = (conteoServicios[nombre] || 0) + 1;
      });
      const servicioTop = Object.entries(conteoServicios).sort(
        (a, b) => b[1] - a[1],
      )[0];

      setStats({
        totalReservas: reservas.length,
        reservasMes: reservasMes.length,
        ingresosTotales: reservas.reduce(
          (sum, r) => sum + (r.precio_final || 0),
          0,
        ),
        ingresosMes: reservasMes.reduce(
          (sum, r) => sum + (r.precio_final || 0),
          0,
        ),
        barberoTop: barberoTop ? { nombre: barberoTop[0], count: barberoTop[1] } : null,
        servicioTop: servicioTop
          ? { nombre: servicioTop[0], count: servicioTop[1] }
          : null,
      });
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
    setCargando(false);
  };

  if (cargando) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Estadísticas</h2>
        <p className="text-stone-400">Calculando estadísticas...</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtitle, color = "amber-200" }) => (
    <div className="bg-stone-900 p-6 rounded border border-stone-700">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 bg-${color} bg-opacity-20 rounded`}>
          <Icon size={20} className={`text-${color}`} />
        </div>
        <p className="text-stone-400 text-sm">{label}</p>
      </div>
      <p className={`text-3xl font-bold text-${color}`}>{value}</p>
      {subtitle && <p className="text-stone-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Estadísticas</h2>

      {/* Grid de stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Calendar}
          label="Reservas este mes"
          value={stats.reservasMes}
          subtitle={`Histórico total: ${stats.totalReservas}`}
        />

        <StatCard
          icon={DollarSign}
          label="Ingresos este mes"
          value={`$${stats.ingresosMes.toLocaleString("es-CL")}`}
          subtitle={`Histórico: $${stats.ingresosTotales.toLocaleString("es-CL")}`}
        />

        <StatCard
          icon={Users}
          label="Barbero del mes"
          value={stats.barberoTop?.nombre || "—"}
          subtitle={
            stats.barberoTop
              ? `${stats.barberoTop.count} reservas totales`
              : "Sin datos"
          }
        />

        <StatCard
          icon={TrendingUp}
          label="Servicio más solicitado"
          value={stats.servicioTop?.nombre || "—"}
          subtitle={
            stats.servicioTop
              ? `${stats.servicioTop.count} veces solicitado`
              : "Sin datos"
          }
        />
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded p-6">
        <p className="text-stone-400 text-sm">
          💡 Próximamente: gráficos por día/semana, comparación mes anterior,
          horarios más solicitados, retención de clientes...
        </p>
      </div>
    </div>
  );
}
