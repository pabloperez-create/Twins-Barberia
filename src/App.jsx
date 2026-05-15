import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Scissors } from "lucide-react";
import { VistaReserva } from "./VistaReserva-FASE3";
import { VistaInicio } from "./VistaInicio";
import { VistaAdmin } from "./VistaAdmin";

// ============== CONFIGURACIÓN SUPABASE ==============
const SUPABASE_URL = "https://fgtbhkeqzcqpjhziyijt.supabase.co";
const SUPABASE_KEY = "sb_publishable_8E23tN1s3wbAIqjhX-1icg_VBCYqsMO";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============== COMPONENTE PRINCIPAL ==============
export default function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
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

      // Admin y barbero van al admin (el barbero verá solo lo suyo en el futuro)
      if (usuarios.rol === "admin" || usuarios.rol === "gerente") {
        setVista("admin");
      } else if (usuarios.rol === "barbero") {
        // TODO: Por ahora barbero también va al admin
        // En próxima sesión: vista filtrada para barbero
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
            if (usr.rol === "admin" || usr.rol === "gerente" || usr.rol === "barbero") {
              setVista("admin");
            } else {
              setVista("inicio");
            }
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
          <p className="mt-2 text-xs">Barberos: vicente@twins.cl / twins123</p>
        </div>
      </div>
    </div>
  );
}
