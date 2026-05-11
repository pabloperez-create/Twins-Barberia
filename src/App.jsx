import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Scissors, LogOut, Home } from "lucide-react";
import { VistaReserva } from "./VistaReserva-FASE3";

// ============== CONFIGURACIÓN SUPABASE ==============
const SUPABASE_URL = "https://fgtbhkeqzcqpjhziyijt.supabase.co";
const SUPABASE_KEY = "sb_publishable_8E23tN1s3wbAIqjhX-1icg_VBCYqsMO";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============== COMPONENTE PRINCIPAL ==============
export default function App() {
  const [vista, setVista] = useState("login"); // 'login' | 'inicio' | 'reserva' | 'admin'
  const [usuario, setUsuario] = useState(null);
  const [barberia, setBarberia] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // ============== LOGIN ==============
  const handleLogin = async (email, password) => {
    setCargando(true);
    setError("");
    try {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .single();

      if (errorUsuarios || !usuarios) {
        setError("Usuario no encontrado");
        setCargando(false);
        return;
      }

      if (usuarios.password_hash !== password) {
        setError("Contraseña incorrecta");
        setCargando(false);
        return;
      }

      localStorage.setItem("usuario_id", usuarios.id);
      localStorage.setItem("rol", usuarios.rol);

      setUsuario(usuarios);

      if (usuarios.rol === "admin" || usuarios.rol === "gerente") {
        setVista("admin");
      } else {
        setVista("inicio");
      }
    } catch (err) {
      setError("Error en login: " + err.message);
    }
    setCargando(false);
  };

  // ============== LOGOUT ==============
  const handleLogout = () => {
    localStorage.removeItem("usuario_id");
    localStorage.removeItem("rol");
    setUsuario(null);
    setBarberia(null);
    setVista("login");
  };

  // ============== VERIFICAR SESIÓN AL CARGAR ==============
  useEffect(() => {
    const verificarSesion = async () => {
      const usuarioId = localStorage.getItem("usuario_id");

      if (usuarioId) {
        try {
          const { data: usr } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", usuarioId)
            .single();

          if (usr) {
            setUsuario(usr);
            setVista(
              usr.rol === "admin" || usr.rol === "gerente" ? "admin" : "inicio",
            );
          }
        } catch (err) {
          console.error("Error verificando sesión:", err);
        }
      }
    };

    verificarSesion();
  }, []);

  // ============== RENDERIZAR SEGÚN VISTA ==============
  if (vista === "login") {
    return (
      <VistaLogin onLogin={handleLogin} cargando={cargando} error={error} />
    );
  }

  if (vista === "inicio") {
    return (
      <VistaInicio
        usuario={usuario}
        onLogout={handleLogout}
        onNavigate={(v) => setVista(v)}
        supabase={supabase}
      />
    );
  }

  if (vista === "reserva") {
    return <VistaReserva supabase={supabase} barberiaId="org-twins" />;
  }

  if (vista === "admin") {
    return (
      <VistaAdmin
        usuario={usuario}
        onLogout={handleLogout}
        onNavigate={(v) => setVista(v)}
        supabase={supabase}
      />
    );
  }

  return <div className="text-white p-4">Cargando...</div>;
}

// ============== VISTA LOGIN ==============
function VistaLogin({ onLogin, cargando, error }) {
  const [email, setEmail] = useState("alonso@twins.cl");
  const [password, setPassword] = useState("hash_alonso123");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Scissors size={48} className="mx-auto mb-4 text-amber-200" />
          <h1 className="text-4xl font-bold">TWINS</h1>
          <p className="text-amber-200 mt-2">Sistema de Reservas</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-stone-900 p-8 rounded border border-stone-700"
        >
          <div className="mb-4">
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              placeholder="tu@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-amber-200 text-stone-950 font-bold py-2 rounded hover:bg-amber-100 disabled:opacity-50"
          >
            {cargando ? "Cargando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-center text-stone-400 text-sm">
          <p>Demo - Admin:</p>
          <p>alonso@twins.cl / hash_alonso123</p>
        </div>
      </div>
    </div>
  );
}

// ============== VISTA INICIO (CLIENTE) ==============
function VistaInicio({ usuario, onLogout, onNavigate, supabase }) {
  const [barberia, setBarberia] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarBarberia();
  }, []);

  const cargarBarberia = async () => {
    try {
      const { data } = await supabase
        .from("barberia")
        .select("*")
        .eq("id", usuario?.barberia_id)
        .single();

      setBarberia(data);
    } catch (err) {
      console.error("Error cargando barbería:", err);
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold">TWINS</h1>
          <p className="text-stone-400">Bienvenido</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <>
            <div className="bg-stone-900 p-8 rounded border border-stone-700 mb-8">
              <h2 className="text-3xl font-bold mb-2">{barberia?.nombre}</h2>
              <p className="text-stone-400 mb-6">
                {barberia?.plan === "profesional" && "Plan Profesional"}
                {barberia?.plan === "basico" && "Plan Básico"}
                {barberia?.plan === "empresarial" && "Plan Empresarial"}
              </p>

              <button
                onClick={() => onNavigate("reserva")}
                className="w-full bg-amber-200 text-stone-950 px-6 py-3 rounded font-bold text-lg hover:bg-amber-100 transition"
              >
                Reservar Hora Ahora →
              </button>
            </div>

            <div className="text-center text-stone-400 text-sm">
              <p>¿Necesitas ayuda? Contacta con nosotros por WhatsApp</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============== VISTA ADMIN ==============
function VistaAdmin({ usuario, onLogout, onNavigate, supabase }) {
  const [tab, setTab] = useState("agenda");
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      const { data, error } = await supabase
        .from("reservas")
        .select(
          "*, barbero:barbero_id(nombre), servicio:servicio_id(nombre, precio)",
        )
        .eq("barberia_id", usuario?.barberia_id)
        .order("fecha", { ascending: true });

      if (!error) {
        setReservas(data || []);
      }
    } catch (err) {
      console.error("Error cargando reservas:", err);
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">TWINS Admin</h1>
          <p className="text-stone-400 text-sm">{usuario?.nombre}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-stone-700">
        {["agenda", "estadisticas", "configuracion"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-4 capitalize font-semibold transition ${
              tab === t
                ? "border-b-2 border-amber-200 text-amber-200"
                : "text-stone-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {tab === "agenda" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Agenda</h2>
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <div className="bg-stone-900 rounded border border-stone-700 p-4">
                <p className="text-stone-400 mb-4">
                  Total de reservas: {reservas.length}
                </p>
                {reservas.length === 0 ? (
                  <p className="text-stone-400">No hay reservas aún</p>
                ) : (
                  <div className="space-y-3">
                    {reservas.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="bg-stone-800 p-3 rounded flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{r.cliente_nombre}</p>
                          <p className="text-sm text-stone-400">
                            {r.fecha} {r.hora_inicio} • {r.barbero?.nombre}
                          </p>
                        </div>
                        <p className="text-amber-200 font-semibold">
                          ${r.precio_final}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "estadisticas" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Estadísticas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-900 p-6 rounded border border-stone-700">
                <p className="text-stone-400 text-sm">Total Reservas</p>
                <p className="text-3xl font-bold text-amber-200">
                  {reservas.length}
                </p>
              </div>
              <div className="bg-stone-900 p-6 rounded border border-stone-700">
                <p className="text-stone-400 text-sm">Ingresos Totales</p>
                <p className="text-3xl font-bold text-amber-200">
                  $
                  {reservas
                    .reduce((sum, r) => sum + (r.precio_final || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "configuracion" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Configuración</h2>
            <div className="bg-stone-900 p-6 rounded border border-stone-700">
              <p className="text-stone-400 mb-2">Barbería: {usuario?.nombre}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
