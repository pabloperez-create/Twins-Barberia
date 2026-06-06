import React, { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Calendar, ArrowUp, ArrowDown, Minus, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { hoyChile } from "../utils/fecha";

export function TabEstadisticas({ supabase, barberiaId, tema: t }) {
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("mes");
  const [kpis, setKpis] = useState({});
  const [reservasPorDia, setReservasPorDia] = useState([]);
  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [porBarbero, setPorBarbero] = useState([]);
  const [porServicio, setPorServicio] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [insights, setInsights] = useState({});

  useEffect(() => { cargarTodo(); }, [filtro]);

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
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split("T")[0];
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split("T")[0];
      const inicio6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().split("T")[0];

      const { data: reservas } = await supabase.from("reservas").select("*, barbero:barbero_id(nombre), servicio:servicio_id(nombre)").eq("barberia_id", barberiaId).eq("estado", "confirmada").gte("fecha", inicioFiltro).lte("fecha", hoyStr);
      const { data: reservasAnterior } = await supabase.from("reservas").select("precio_final, asistencia").eq("barberia_id", barberiaId).eq("estado", "confirmada").gte("fecha", inicioMesAnterior).lte("fecha", finMesAnterior);
      const { data: reservas6Meses } = await supabase.from("reservas").select("fecha, precio_final, asistencia").eq("barberia_id", barberiaId).eq("estado", "confirmada").gte("fecha", inicio6Meses).lte("fecha", hoyStr);
      const { data: reservasCanceladas } = await supabase.from("reservas").select("barbero:barbero_id(nombre)").eq("barberia_id", barberiaId).eq("estado", "cancelada").gte("fecha", inicioFiltro).lte("fecha", hoyStr);

      const r = reservas || [];
      const rAnt = reservasAnterior || [];
      const totalReservas = r.length;
      // Los "no llegó" (no-show) no generan ingreso: se excluyen de ingresos y ticket
      const conIngreso = r.filter((x) => x.asistencia !== "no_asistio");
      const totalIngresos = conIngreso.reduce((s, x) => s + (x.precio_final || 0), 0);
      const ticketPromedio = conIngreso.length > 0 ? Math.round(totalIngresos / conIngreso.length) : 0;
      const totalReservasAnt = rAnt.length;
      const totalIngresosAnt = rAnt.filter((x) => x.asistencia !== "no_asistio").reduce((s, x) => s + (x.precio_final || 0), 0);
      const deltaReservas = totalReservasAnt > 0 ? Math.round(((totalReservas - totalReservasAnt) / totalReservasAnt) * 100) : null;
      const deltaIngresos = totalIngresosAnt > 0 ? Math.round(((totalIngresos - totalIngresosAnt) / totalIngresosAnt) * 100) : null;
      setKpis({ totalReservas, totalIngresos, ticketPromedio, deltaReservas, deltaIngresos });

      const dias = {};
      const haceN = new Date(); haceN.setDate(haceN.getDate() - 29);
      for (let d = new Date(haceN); d <= hoy; d.setDate(d.getDate() + 1)) dias[d.toISOString().split("T")[0]] = 0;
      r.forEach((res) => { if (dias[res.fecha] !== undefined) dias[res.fecha]++; });
      setReservasPorDia(Object.entries(dias).map(([fecha, reservas]) => ({ fecha: fecha.slice(5), reservas })));

      const meses = {};
      const nombresMeses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        meses[key] = { mes: nombresMeses[d.getMonth()], ingresos: 0, reservas: 0 };
      }
      (reservas6Meses || []).forEach((res) => { const key = res.fecha.slice(0, 7); if (meses[key]) { if (res.asistencia !== "no_asistio") meses[key].ingresos += res.precio_final || 0; meses[key].reservas++; } });
      setIngresosPorMes(Object.values(meses));

      const barbMap = {};
      const nuevoBarbero = (nombre) => ({ nombre, reservas: 0, ingresos: 0, asistidos: 0, inasistencias: 0, canceladas: 0 });
      r.forEach((res) => {
        const nombre = res.barbero?.nombre || "Sin asignar";
        if (!barbMap[nombre]) barbMap[nombre] = nuevoBarbero(nombre);
        barbMap[nombre].reservas++;
        if (res.asistencia !== "no_asistio") barbMap[nombre].ingresos += res.precio_final || 0;
        if (res.asistencia === "asistio") barbMap[nombre].asistidos++;
        else if (res.asistencia === "no_asistio") barbMap[nombre].inasistencias++;
      });
      (reservasCanceladas || []).forEach((res) => {
        const nombre = res.barbero?.nombre || "Sin asignar";
        if (!barbMap[nombre]) barbMap[nombre] = nuevoBarbero(nombre);
        barbMap[nombre].canceladas++;
      });
      setPorBarbero(Object.values(barbMap).sort((a, b) => b.reservas - a.reservas));

      const srvMap = {};
      r.forEach((res) => { const nombre = res.servicio?.nombre || "Sin servicio"; if (!srvMap[nombre]) srvMap[nombre] = { nombre, valor: 0 }; srvMap[nombre].valor++; });
      setPorServicio(Object.values(srvMap).sort((a, b) => b.valor - a.valor));

      const clienteMap = {};
      r.forEach((res) => { const nombre = res.cliente_nombre || "Anónimo"; if (!clienteMap[nombre]) clienteMap[nombre] = { nombre, visitas: 0, gasto: 0 }; clienteMap[nombre].visitas++; clienteMap[nombre].gasto += res.precio_final || 0; });
      setTopClientes(Object.values(clienteMap).sort((a, b) => b.visitas - a.visitas).slice(0, 5));

      const porDiaSemana = [0,0,0,0,0,0,0];
      const porHora = {};
      r.forEach((res) => { const diaSemana = new Date(res.fecha + "T12:00:00").getDay(); porDiaSemana[diaSemana]++; if (res.hora_inicio) { const h = res.hora_inicio.slice(0, 2); porHora[h] = (porHora[h] || 0) + 1; } });
      const diasNombres = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      const mejorDiaIdx = porDiaSemana.indexOf(Math.max(...porDiaSemana));
      const mejorHora = Object.entries(porHora).sort((a,b) => b[1]-a[1])[0];
      setInsights({ mejorDia: diasNombres[mejorDiaIdx], mejorHora: mejorHora ? `${mejorHora[0]}:00` : "—" });
    } catch (err) { console.error("Error cargando estadísticas:", err); }
    setCargando(false);
  };

  const exportarCSV = async () => {
    const hoy = hoyChile();
    const inicioFiltro = getFechaInicio().toISOString().split("T")[0];
    const { data } = await supabase.from("reservas").select("fecha, hora_inicio, cliente_nombre, cliente_telefono, cliente_email, precio_final, barbero:barbero_id(nombre), servicio:servicio_id(nombre)").eq("barberia_id", barberiaId).eq("estado", "confirmada").gte("fecha", inicioFiltro).lte("fecha", hoy);
    if (!data?.length) return;
    const headers = ["Fecha","Hora","Cliente","Teléfono","Email","Barbero","Servicio","Precio"];
    const rows = data.map(r => [r.fecha, r.hora_inicio, r.cliente_nombre, r.cliente_telefono, r.cliente_email, r.barbero?.nombre, r.servicio?.nombre, r.precio_final]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `reservas-${inicioFiltro}-${hoy}.csv`; a.click();
  };

  const Delta = ({ valor }) => {
    if (valor === null) return null;
    if (valor === 0) return <span className={`flex items-center gap-1 ${t.textoMuted} text-xs`}><Minus size={12} /> 0% vs mes ant.</span>;
    if (valor > 0) return <span className="flex items-center gap-1 text-green-400 text-xs"><ArrowUp size={12} /> +{valor}% vs mes ant.</span>;
    return <span className="flex items-center gap-1 text-red-400 text-xs"><ArrowDown size={12} /> {valor}% vs mes ant.</span>;
  };

  if (cargando) return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Estadísticas</h2>
      <p className={t.textoSub}>Calculando estadísticas...</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Estadísticas</h2>
        <div className="flex items-center gap-3">
          <div className={`flex ${t.bgCard} border ${t.border} rounded overflow-hidden`}>
            {[{ key: "mes", label: "Este mes" }, { key: "trimestre", label: "Trimestre" }, { key: "anio", label: "Este año" }].map((f) => (
              <button key={f.key} onClick={() => setFiltro(f.key)} className={`px-4 py-2 text-sm transition ${filtro === f.key ? `${t.acentoBg} ${t.acentoText} font-bold` : `${t.textoSub} ${t.bgHover}`}`}>{f.label}</button>
            ))}
          </div>
          <button onClick={exportarCSV} className={`flex items-center gap-2 px-4 py-2 ${t.bgMuted} ${t.bgHover} border ${t.border} rounded text-sm ${t.textoSub}`}>
            <Download size={16} />CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Calendar, label: "Reservas", valor: kpis.totalReservas, delta: kpis.deltaReservas },
          { icon: DollarSign, label: "Ingresos", valor: `$${kpis.totalIngresos?.toLocaleString("es-CL")}`, delta: kpis.deltaIngresos },
          { icon: TrendingUp, label: "Ticket promedio", valor: `$${kpis.ticketPromedio?.toLocaleString("es-CL")}`, delta: null },
        ].map(({ icon: Icon, label, valor, delta }) => (
          <div key={label} className={`${t.bgCard} p-6 rounded border ${t.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${t.acentoBgOpacity} rounded`}>
                <Icon size={20} className={t.acento} />
              </div>
              <p className={`${t.textoSub} text-sm`}>{label}</p>
            </div>
            <p className={`text-3xl font-bold ${t.acento}`}>{valor}</p>
            <Delta valor={delta} />
          </div>
        ))}
      </div>

      {/* Gráfico reservas por día */}
      <div className={`${t.bgCard} border ${t.border} rounded p-6 mb-6`}>
        <h3 className="font-bold mb-4">Reservas por día (últimos 30 días)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={reservasPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.tipo === "salon" ? "#fbcfe8" : "#44403c"} />
            <XAxis dataKey="fecha" stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 11 }} interval={4} />
            <YAxis stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={t.tooltipStyle} />
            <Line type="monotone" dataKey="reservas" stroke={t.chartColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico ingresos por mes */}
      <div className={`${t.bgCard} border ${t.border} rounded p-6 mb-6`}>
        <h3 className="font-bold mb-4">Ingresos últimos 6 meses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ingresosPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.tipo === "salon" ? "#fbcfe8" : "#44403c"} />
            <XAxis dataKey="mes" stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 12 }} />
            <YAxis stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={t.tooltipStyle} formatter={(v) => [`$${v.toLocaleString("es-CL")}`, "Ingresos"]} />
            <Bar dataKey="ingresos" fill={t.chartColor} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Barberos + Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`${t.bgCard} border ${t.border} rounded p-6`}>
          <h3 className="font-bold mb-4">Reservas por {t.tipo === "salon" ? "estilista" : "barbero"}</h3>
          {porBarbero.length === 0 ? <p className={`${t.textoMuted} text-sm`}>Sin datos</p> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porBarbero} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.tipo === "salon" ? "#fbcfe8" : "#44403c"} />
                <XAxis type="number" stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" stroke={t.tipo === "salon" ? "#f9a8d4" : "#78716c"} tick={{ fontSize: 12 }} width={80} />
                <Tooltip contentStyle={t.tooltipStyle} />
                <Bar dataKey="reservas" fill={t.chartColor} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {porBarbero.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className={`flex items-center justify-end gap-3 text-[10px] uppercase tracking-wide ${t.textoMuted} pr-1`}>
                <span className="w-12 text-center">Asistió</span>
                <span className="w-12 text-center">No llegó</span>
                <span className="w-12 text-center">Cancel.</span>
              </div>
              {porBarbero.map((b) => (
                <div key={b.nombre} className={`flex items-center justify-between text-xs ${t.bgMuted} rounded px-3 py-2`}>
                  <span className="font-semibold truncate">{b.nombre}</span>
                  <div className="flex gap-3">
                    <span className="w-12 text-center text-green-400 font-semibold">{b.asistidos}</span>
                    <span className="w-12 text-center text-red-400 font-semibold">{b.inasistencias}</span>
                    <span className={`w-12 text-center ${t.textoMuted} font-semibold`}>{b.canceladas}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded p-6`}>
          <h3 className="font-bold mb-4">Servicios más solicitados</h3>
          {porServicio.length === 0 ? <p className={`${t.textoMuted} text-sm`}>Sin datos</p> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={porServicio} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius={70} label={({ nombre, percent }) => `${nombre.slice(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {porServicio.map((_, i) => <Cell key={i} fill={t.chartColors[i % t.chartColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={t.tooltipStyle} formatter={(v) => [v, "Reservas"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top clientes + Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${t.bgCard} border ${t.border} rounded p-6`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Users size={18} className={t.acento} />Top 5 clientes recurrentes
          </h3>
          {topClientes.length === 0 ? <p className={`${t.textoMuted} text-sm`}>Sin datos</p> : (
            <div className="space-y-3">
              {topClientes.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`${t.textoMuted} text-sm w-4`}>{i + 1}</span>
                    <span className="text-sm font-medium">{c.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className={`${t.acento} text-sm font-bold`}>{c.visitas} visitas</span>
                    <p className={`${t.textoMuted} text-xs`}>${c.gasto.toLocaleString("es-CL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded p-6`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className={t.acento} />Insights del período
          </h3>
          <div className="space-y-4">
            <div className={`${t.bgMuted} rounded p-4`}>
              <p className={`${t.textoMuted} text-xs uppercase tracking-wider mb-1`}>Mejor día de la semana</p>
              <p className={`text-2xl font-bold ${t.acento}`}>{insights.mejorDia || "—"}</p>
            </div>
            <div className={`${t.bgMuted} rounded p-4`}>
              <p className={`${t.textoMuted} text-xs uppercase tracking-wider mb-1`}>Hora más solicitada</p>
              <p className={`text-2xl font-bold ${t.acento}`}>{insights.mejorHora || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
