import React, { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Calendar, ArrowUp, ArrowDown, Minus, Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export function TabEstadisticas({ supabase, barberiaId }) {
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("mes"); // mes | trimestre | anio
  const [kpis, setKpis] = useState({});
  const [reservasPorDia, setReservasPorDia] = useState([]);
  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [porBarbero, setPorBarbero] = useState([]);
  const [porServicio, setPorServicio] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [insights, setInsights] = useState({});

  useEffect(() => {
    cargarTodo();
  }, [filtro]);

  const getFechaInicio = () => {
    const hoy = new Date();
    if (filtro === "mes") return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (filtro === "trimestre") return new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
    if (filtro === "anio") return new Date(hoy.getFullYear(), 0, 1);
  };

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const hoy = new Date();
      const inicioFiltro = getFechaInicio().toISOString().split("T")[0];
      const hoyStr = hoy.toISOString().split("T")[0];

      // Mes anterior para comparar KPIs
      const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split("T")[0];
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split("T")[0];
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split("T")[0];

      // Cargar reservas del período filtrado
      const { data: reservas } = await supabase
        .from("reservas")
        .select("*, barbero:barbero_id(nombre), servicio:servicio_id(nombre)")
        .eq("barberia_id", barberiaId)
        .eq("estado", "confirmada")
        .gte("fecha", inicioFiltro)
        .lte("fecha", hoyStr);

      // Cargar reservas mes anterior (para comparar)
      const { data: reservasAnterior } = await supabase
        .from("reservas")
        .select("precio_final")
        .eq("barberia_id", barberiaId)
        .eq("estado", "confirmada")
        .gte("fecha", inicioMesAnterior)
        .lte("fecha", finMesAnterior);

      // Cargar últimos 6 meses para gráfico de ingresos
      const inicio6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().split("T")[0];
      const { data: reservas6Meses } = await supabase
        .from("reservas")
        .select("fecha, precio_final")
        .eq("barberia_id", barberiaId)
        .eq("estado", "confirmada")
        .gte("fecha", inicio6Meses)
        .lte("fecha", hoyStr);

      const r = reservas || [];
      const rAnt = reservasAnterior || [];

      // ── KPIs ──
      const totalReservas = r.length;
      const totalIngresos = r.reduce((s, x) => s + (x.precio_final || 0), 0);
      const ticketPromedio = totalReservas > 0 ? Math.round(totalIngresos / totalReservas) : 0;

      const totalReservasAnt = rAnt.length;
      const totalIngresosAnt = rAnt.reduce((s, x) => s + (x.precio_final || 0), 0);

      const deltaReservas = totalReservasAnt > 0
        ? Math.round(((totalReservas - totalReservasAnt) / totalReservasAnt) * 100)
        : null;
      const deltaIngresos = totalIngresosAnt > 0
        ? Math.round(((totalIngresos - totalIngresosAnt) / totalIngresosAnt) * 100)
        : null;

      setKpis({ totalReservas, totalIngresos, ticketPromedio, deltaReservas, deltaIngresos });

      // ── Reservas por día (últimos 30 días) ──
      const dias = {};
      const haceN = new Date();
      haceN.setDate(haceN.getDate() - 29);
      for (let d = new Date(haceN); d <= hoy; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        dias[key] = 0;
      }
      r.forEach((res) => {
        if (dias[res.fecha] !== undefined) dias[res.fecha]++;
      });
      const diasData = Object.entries(dias).map(([fecha, reservas]) => ({
        fecha: fecha.slice(5), // MM-DD
        reservas,
      }));
      setReservasPorDia(diasData);

      // ── Ingresos por mes (6 meses) ──
      const meses = {};
      const nombresMeses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        meses[key] = { mes: nombresMeses[d.getMonth()], ingresos: 0, reservas: 0 };
      }
      (reservas6Meses || []).forEach((res) => {
        const key = res.fecha.slice(0, 7);
        if (meses[key]) {
          meses[key].ingresos += res.precio_final || 0;
          meses[key].reservas++;
        }
      });
      setIngresosPorMes(Object.values(meses));

      // ── Por barbero ──
      const barbMap = {};
      r.forEach((res) => {
        const nombre = res.barbero?.nombre || "Sin asignar";
        if (!barbMap[nombre]) barbMap[nombre] = { nombre, reservas: 0, ingresos: 0 };
        barbMap[nombre].reservas++;
        barbMap[nombre].ingresos += res.precio_final || 0;
      });
      setPorBarbero(Object.values(barbMap).sort((a, b) => b.reservas - a.reservas));

      // ── Por servicio ──
      const srvMap = {};
      r.forEach((res) => {
        const nombre = res.servicio?.nombre || "Sin servicio";
        if (!srvMap[nombre]) srvMap[nombre] = { nombre, valor: 0 };
        srvMap[nombre].valor++;
      });
      setPorServicio(Object.values(srvMap).sort((a, b) => b.valor - a.valor));

      // ── Top clientes ──
      const clienteMap = {};
      r.forEach((res) => {
        const nombre = res.cliente_nombre || "Anónimo";
        if (!clienteMap[nombre]) clienteMap[nombre] = { nombre, visitas: 0, gasto: 0 };
        clienteMap[nombre].visitas++;
        clienteMap[nombre].gasto += res.precio_final || 0;
      });
      setTopClientes(
        Object.values(clienteMap).sort((a, b) => b.visitas - a.visitas).slice(0, 5)
      );

      // ── Insights: mejor día y hora ──
      const porDiaSemana = [0,0,0,0,0,0,0];
      const porHora = {};
      r.forEach((res) => {
        const diaSemana = new Date(res.fecha + "T12:00:00").getDay();
        porDiaSemana[diaSemana]++;
        if (res.hora_inicio) {
          const h = res.hora_inicio.slice(0, 2);
          porHora[h] = (porHora[h] || 0) + 1;
        }
      });
      const diasNombres = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      const mejorDiaIdx = porDiaSemana.indexOf(Math.max(...porDiaSemana));
      const mejorHora = Object.entries(porHora).sort((a,b) => b[1]-a[1])[0];
      setInsights({
        mejorDia: diasNombres[mejorDiaIdx],
        mejorHora: mejorHora ? `${mejorHora[0]}:00` : "—",
      });

    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
    setCargando(false);
  };

  const exportarCSV = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioFiltro = getFechaInicio().toISOString().split("T")[0];
    const { data } = await supabase
      .from("reservas")
      .select("fecha, hora_inicio, cliente_nombre, cliente_telefono, cliente_email, precio_final, barbero:barbero_id(nombre), servicio:servicio_id(nombre)")
      .eq("barberia_id", barberiaId)
      .eq("estado", "confirmada")
      .gte("fecha", inicioFiltro)
      .lte("fecha", hoy);

    if (!data?.length) return;

    const headers = ["Fecha","Hora","Cliente","Teléfono","Email","Barbero","Servicio","Precio"];
    const rows = data.map(r => [
      r.fecha, r.hora_inicio, r.cliente_nombre, r.cliente_telefono,
      r.cliente_email, r.barbero?.nombre, r.servicio?.nombre, r.precio_final
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas-${inicioFiltro}-${hoy}.csv`;
    a.click();
  };

  // ── Colores ──
  const COLORES = ["#e5d59a", "#a3a3a3", "#78716c", "#d6b96e", "#b8b8b8"];

  const Delta = ({ valor }) => {
    if (valor === null) return null;
    if (valor === 0) return <span className="flex items-center gap-1 text-stone-400 text-xs"><Minus size={12} /> 0% vs mes ant.</span>;
    if (valor > 0) return <span className="flex items-center gap-1 text-green-400 text-xs"><ArrowUp size={12} /> +{valor}% vs mes ant.</span>;
    return <span className="flex items-center gap-1 text-red-400 text-xs"><ArrowDown size={12} /> {valor}% vs mes ant.</span>;
  };

  const tooltipStyle = {
    backgroundColor: "#1c1917",
    border: "1px solid #44403c",
    borderRadius: "8px",
    color: "#fff",
  };

  if (cargando) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Estadísticas</h2>
        <p className="text-stone-400">Calculando estadísticas...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Estadísticas</h2>
        <div className="flex items-center gap-3">
          {/* Filtro temporal */}
          <div className="flex bg-stone-900 border border-stone-700 rounded overflow-hidden">
            {[
              { key: "mes", label: "Este mes" },
              { key: "trimestre", label: "Trimestre" },
              { key: "anio", label: "Este año" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-4 py-2 text-sm transition ${
                  filtro === f.key
                    ? "bg-amber-200 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Exportar CSV */}
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-sm text-stone-300"
          >
            <Download size={16} />
            CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-stone-900 p-6 rounded border border-stone-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-200 bg-opacity-20 rounded">
              <Calendar size={20} className="text-amber-200" />
            </div>
            <p className="text-stone-400 text-sm">Reservas</p>
          </div>
          <p className="text-3xl font-bold text-amber-200">{kpis.totalReservas}</p>
          <Delta valor={kpis.deltaReservas} />
        </div>

        <div className="bg-stone-900 p-6 rounded border border-stone-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-200 bg-opacity-20 rounded">
              <DollarSign size={20} className="text-amber-200" />
            </div>
            <p className="text-stone-400 text-sm">Ingresos</p>
          </div>
          <p className="text-3xl font-bold text-amber-200">
            ${kpis.totalIngresos?.toLocaleString("es-CL")}
          </p>
          <Delta valor={kpis.deltaIngresos} />
        </div>

        <div className="bg-stone-900 p-6 rounded border border-stone-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-200 bg-opacity-20 rounded">
              <TrendingUp size={20} className="text-amber-200" />
            </div>
            <p className="text-stone-400 text-sm">Ticket promedio</p>
          </div>
          <p className="text-3xl font-bold text-amber-200">
            ${kpis.ticketPromedio?.toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* Gráfico reservas por día */}
      <div className="bg-stone-900 border border-stone-700 rounded p-6 mb-6">
        <h3 className="font-bold mb-4">Reservas por día (últimos 30 días)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={reservasPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
            <XAxis dataKey="fecha" stroke="#78716c" tick={{ fontSize: 11 }} interval={4} />
            <YAxis stroke="#78716c" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="reservas"
              stroke="#e5d59a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico ingresos por mes */}
      <div className="bg-stone-900 border border-stone-700 rounded p-6 mb-6">
        <h3 className="font-bold mb-4">Ingresos últimos 6 meses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ingresosPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
            <XAxis dataKey="mes" stroke="#78716c" tick={{ fontSize: 12 }} />
            <YAxis stroke="#78716c" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [`$${v.toLocaleString("es-CL")}`, "Ingresos"]}
            />
            <Bar dataKey="ingresos" fill="#e5d59a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Barberos + Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Por barbero */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="font-bold mb-4">Reservas por barbero</h3>
          {porBarbero.length === 0 ? (
            <p className="text-stone-500 text-sm">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porBarbero} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                <XAxis type="number" stroke="#78716c" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" stroke="#78716c" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [v, name === "reservas" ? "Reservas" : "Ingresos"]}
                />
                <Bar dataKey="reservas" fill="#e5d59a" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por servicio (pie) */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="font-bold mb-4">Servicios más solicitados</h3>
          {porServicio.length === 0 ? (
            <p className="text-stone-500 text-sm">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={porServicio}
                  dataKey="valor"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ nombre, percent }) =>
                    `${nombre.slice(0, 12)} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {porServicio.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Reservas"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top clientes + Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top 5 clientes */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Users size={18} className="text-amber-200" />
            Top 5 clientes recurrentes
          </h3>
          {topClientes.length === 0 ? (
            <p className="text-stone-500 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topClientes.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500 text-sm w-4">{i + 1}</span>
                    <span className="text-sm font-medium">{c.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-200 text-sm font-bold">{c.visitas} visitas</span>
                    <p className="text-stone-500 text-xs">${c.gasto.toLocaleString("es-CL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-200" />
            Insights del período
          </h3>
          <div className="space-y-4">
            <div className="bg-stone-800 rounded p-4">
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Mejor día de la semana</p>
              <p className="text-2xl font-bold text-amber-200">{insights.mejorDia || "—"}</p>
            </div>
            <div className="bg-stone-800 rounded p-4">
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Hora más solicitada</p>
              <p className="text-2xl font-bold text-amber-200">{insights.mejorHora || "—"}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
