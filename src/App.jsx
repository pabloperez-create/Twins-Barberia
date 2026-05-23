import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Scissors, ArrowLeft } from "lucide-react";
import { VistaReserva } from "./VistaReserva-FASE3";
import { VistaInicio } from "./VistaInicio";
import { VistaAdmin } from "./VistaAdmin";
import { VistaBarbero } from "./VistaBarbero";
import { VistaSuperAdmin } from "./VistaSuperAdmin";

// ============== CONFIGURACIÓN SUPABASE ==============
const SUPABASE_URL = "https://fgtbhkeqzcqpjhziyijt.supabase.co";
const SUPABASE_KEY = "sb_publishable_8E23tN1s3wbAIqjhX-1icg_VBCYqsMO";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============== COMPONENTE PRINCIPAL ==============
export default function App() {
  // ⭐ Por defecto arrancar en "inicio" (público), no en "login"
  const [vista, setVista] = useState("inicio");
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [verificandoSesion, setVerificandoSesion] = useState(true);

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
      direccionarPorRol(usuarios.rol);
    } catch (err) {
      setError("Error en login: " + err.message);
    }
    setCargando(false);
  };

  const direccionarPorRol = (rol) => {
    if (rol === "super_admin") {
      setVista("super_admin");
    } else if (rol === "admin" || rol === "gerente") {
      setVista("admin");
    } else if (rol === "barbero") {
      setVista("barbero");
    } else {
      // cliente u otros → vuelve al inicio
      setVista("inicio");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("usuario_id");
    localStorage.removeItem("rol");
    setUsuario(null);
    setVista("inicio"); // ⭐ Logout vuelve al inicio público
  };

  // Al cargar la app, verificar si hay sesión activa
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
            direccionarPorRol(usr.rol);
          }
        } catch (err) {
          console.error("Error verificando sesión:", err);
        }
      }
      setVerificandoSesion(false);
    };

    verificarSesion();
  }, []);

  // Loader mientras verifica sesión
  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Cargando...</p>
      </div>
    );
  }

  // ============== RENDERIZAR SEGÚN VISTA ==============

  // INICIO (público - sin login)
  if (vista === "inicio") {
    return (
      <VistaInicio
        barberiaId="org-twins"
        onNavigate={(v) => setVista(v)}
        supabase={supabase}
      />
    );
  }

  // RESERVA (público - sin login)
  if (vista === "reserva") {
    return (
      <div className="min-h-screen bg-stone-950">
        {/* Barra superior con botón "Volver" */}
        <div className="bg-stone-900 border-b border-stone-700 p-3">
          <button
            onClick={() => setVista("inicio")}
            className="flex items-center gap-2 text-stone-400 hover:text-amber-200 text-sm"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
        </div>
        <VistaReserva supabase={supabase} barberiaId="org-twins" />
      </div>
    );
  }

  // LOGIN (para admin/barbero/super_admin)
  if (vista === "login") {
    return (
      <VistaLogin
        onLogin={handleLogin}
        cargando={cargando}
        error={error}
        onBack={() => setVista("inicio")}
      />
    );
  }

  // ADMIN
  if (vista === "admin") {
    return (
      <VistaAdmin
        usuario={usuario}
        onLogout={handleLogout}
        supabase={supabase}
      />
    );
  }

  // BARBERO
  if (vista === "barbero") {
    return (
      <VistaBarbero
        usuario={usuario}
        onLogout={handleLogout}
        supabase={supabase}
      />
    );
  }

  // SUPER ADMIN
  if (vista === "super_admin") {
    return (
      <VistaSuperAdmin
        usuario={usuario}
        onLogout={handleLogout}
        supabase={supabase}
      />
    );
  }

  return <div className="text-white p-4">Cargando...</div>;
}

// ============== VISTA LOGIN ==============
function VistaLogin({ onLogin, cargando, error, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón volver */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-amber-200 text-sm mb-6 mx-auto"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </button>

        <div className="text-center mb-8">
          <Scissors size={48} className="mx-auto mb-4 text-amber-200" />
          <h1 className="text-4xl font-bold">TWINS</h1>
          <p className="text-amber-200 mt-2">Acceso administrativo</p>
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
              autoFocus
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

        <div className="mt-6 text-center text-stone-500 text-xs">
          <p>¿Eres cliente? Usa el botón "Reservar ahora"</p>
        </div>
      </div>
    </div>
  );
}
