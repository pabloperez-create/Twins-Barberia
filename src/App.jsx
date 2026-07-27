import React, { useState, useEffect } from "react";
import { Scissors, ArrowLeft } from "lucide-react";
import { supabase } from "./lib/supabase";
import { COLS_PUBLICAS_BARBERIA } from "./utils/barberiaCols";
import { VistaReserva } from "./VistaReserva-FASE3";
import { VistaReservaNueva } from "./VistaReservaNueva"; // PILOTO shadcn (?ui=nuevo)
import { VistaInicio } from "./VistaInicio";
import { VistaAdmin } from "./VistaAdmin";
import { VistaBarbero } from "./VistaBarbero";
import { VistaSuperAdmin } from "./VistaSuperAdmin";
import { VistaEncuesta } from "./VistaEncuesta";
import { VistaCancelar } from "./VistaCancelar";

// ⭐ Detectar subdominio → barberiaId
const detectarBarberiaId = () => {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);

  // Si viene por ?barberiaId= (fallback legacy)
  if (params.get("barberiaId")) return { tipo: "param", valor: params.get("barberiaId") };

  // Si es subdominio (twins.reservaia.cl, nailstudio.reservaia.cl)
  const partes = hostname.split(".");
  if (partes.length >= 3 && partes[partes.length - 2] === "reservaia") {
    return { tipo: "subdominio", valor: partes[0] };
  }

  // Default local/vercel.app
  return { tipo: "param", valor: "org-twins" };
};

const detectarEncuesta = () => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const match = path.match(/^\/encuesta\/(.+)$/);
  if (match) return { encuestaId: match[1], estrellas: params.get("estrellas") };
  return null;
};

const detectarCancelacion = () => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const match = path.match(/^\/cancelar\/(.+)$/);
  if (match) return { reservaId: match[1], token: params.get("t") };
  return null;
};

export default function App() {
  const encuestaParams = detectarEncuesta();
  const cancelacionParams = detectarCancelacion();
  const barberiaDetectada = detectarBarberiaId();

  const [barberiaId, setBarberiaId] = useState(
    barberiaDetectada.tipo === "param" ? barberiaDetectada.valor : null
  );
  const [vista, setVista] = useState(encuestaParams ? "encuesta" : cancelacionParams ? "cancelar" : "inicio");
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [verificandoSesion, setVerificandoSesion] = useState(!encuestaParams && !cancelacionParams);
  const [barberiaData, setBarberiaData] = useState(null);
  const [resolviendo, setResolviendo] = useState(barberiaDetectada.tipo === "subdominio");

  // ⭐ Resolver subdominio → barberiaId desde BD
  useEffect(() => {
    if (barberiaDetectada.tipo === "subdominio") {
      supabase
        .from("barberia")
        .select(COLS_PUBLICAS_BARBERIA)
        .eq("subdominio", barberiaDetectada.valor)
        .single()
        .then(({ data }) => {
          if (data) {
            setBarberiaId(data.id);
            setBarberiaData(data);
          } else {
            // Subdominio no encontrado → fallback
            setBarberiaId("org-twins");
          }
          setResolviendo(false);
        });
    } else {
      supabase
        .from("barberia")
        .select(COLS_PUBLICAS_BARBERIA)
        .eq("id", barberiaDetectada.valor)
        .single()
        .then(({ data }) => { if (data) setBarberiaData(data); });
    }
  }, []);

  const handleLogin = async (email, password) => {
    setCargando(true);
    setError("");
    try {
      const emailNorm = (email || "").trim().toLowerCase();

      // Login vía Supabase Auth (el fallback a password_hash se retiró en Fase 1.4)
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email: emailNorm, password });

      let usr = null;
      if (!authError && authData?.user) {
        const { data } = await supabase
          .from("usuarios").select("*").eq("auth_id", authData.user.id).single();
        usr = data;
      }

      if (!usr) { setError("Usuario o contraseña incorrectos"); setCargando(false); return; }

      setUsuario(usr);
      direccionarPorRol(usr.rol);
    } catch (err) { setError("Error en login: " + err.message); }
    setCargando(false);
  };

  const direccionarPorRol = (rol) => {
    if (rol === "super_admin") setVista("super_admin");
    else if (rol === "admin" || rol === "gerente") setVista("admin");
    else if (rol === "barbero") setVista("barbero");
    else setVista("inicio");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("usuario_id");
    localStorage.removeItem("rol");
    setUsuario(null);
    setVista("inicio");
  };

  useEffect(() => {
    if (encuestaParams || resolviendo) return;
    const verificarSesion = async () => {
      try {
        // Sesión de Supabase Auth (el fallback por localStorage se retiró en Fase 1.4)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: usr } = await supabase.from("usuarios").select("*").eq("auth_id", session.user.id).single();
          if (usr) { setUsuario(usr); direccionarPorRol(usr.rol); setVerificandoSesion(false); return; }
        }
      } catch (err) { console.error("Error verificando sesión:", err); }
      setVerificandoSesion(false);
    };
    verificarSesion();
  }, [resolviendo]);

  if (resolviendo || verificandoSesion) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Cargando...</p>
      </div>
    );
  }

  if (vista === "cancelar" && cancelacionParams) {
    return <VistaCancelar supabase={supabase} reservaId={cancelacionParams.reservaId} token={cancelacionParams.token} />;
  }

  if (vista === "encuesta" && encuestaParams) {
    return <VistaEncuesta supabase={supabase} encuestaId={encuestaParams.encuestaId} estrellasInicial={encuestaParams.estrellas} />;
  }

  if (vista === "inicio") {
    return <VistaInicio barberiaId={barberiaId} onNavigate={(v) => setVista(v)} supabase={supabase} barberiaData={barberiaData} />;
  }

  const esSalonApp = barberiaData?.tipo_barberia === "salon";
  if (vista === "reserva") {
    return (
      <div style={{ minHeight: "100vh", background: esSalonApp ? "#fce8f0" : "#0c0a09" }}>
        <div style={{ background: esSalonApp ? "#fdf0f5" : "#1c1917", borderBottom: `1px solid ${esSalonApp ? "#f0c0d4" : "#44403c"}`, padding: 12 }}>
          <button onClick={() => setVista("inicio")} style={{ display: "flex", alignItems: "center", gap: 6, color: esSalonApp ? "#b05070" : "#a8a29e", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <ArrowLeft size={16} />Volver al inicio
          </button>
        </div>
        {/* PILOTO: ?ui=nuevo renderiza la versión shadcn; sin el parámetro, el flujo actual. */}
        {new URLSearchParams(window.location.search).get("ui") === "nuevo" ? (
          <VistaReservaNueva supabase={supabase} barberiaId={barberiaId} />
        ) : (
          <VistaReserva supabase={supabase} barberiaId={barberiaId} />
        )}
      </div>
    );
  }

  if (vista === "login") {
    return <VistaLogin onLogin={handleLogin} cargando={cargando} error={error} onBack={() => setVista("inicio")} barberiaData={barberiaData} />;
  }

  if (vista === "admin") return <VistaAdmin usuario={usuario} onLogout={handleLogout} supabase={supabase} />;
  if (vista === "barbero") return <VistaBarbero usuario={usuario} onLogout={handleLogout} supabase={supabase} />;
  if (vista === "super_admin") return <VistaSuperAdmin usuario={usuario} onLogout={handleLogout} supabase={supabase} />;

  return <div className="text-white p-4">Cargando...</div>;
}

function VistaLogin({ onLogin, cargando, error, onBack, barberiaData }) {
  const esSalon = barberiaData?.tipo_barberia === "salon";
  const T = esSalon ? {
    bg: "#fce8f0", cardBg: "#fff", cardBorder: "#f0c0d4",
    text: "#4a1030", inputBg: "#fdf0f5", inputBorder: "#f0c0d4",
    accent: "#d4638a", accentText: "#fff", labelColor: "#b05070",
    btnBg: "#d4638a", btnText: "#fff", mutedText: "#b08090", backColor: "#b05070"
  } : {
    bg: "#0c0a09", cardBg: "#1c1917", cardBorder: "#44403c",
    text: "#fff", inputBg: "#292524", inputBorder: "#44403c",
    accent: "#fde68a", accentText: "#1c1917", labelColor: "#d6d3d1",
    btnBg: "#fde68a", btnText: "#1c1917", mutedText: "#78716c", backColor: "#a8a29e"
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: T.backColor, background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 24 }}>
          <ArrowLeft size={16} />Volver al inicio
        </button>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {barberiaData?.logo_url
            ? <img src={barberiaData.logo_url} alt={barberiaData.nombre} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px" }} />
            : esSalon
              ? <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              : <Scissors size={48} style={{ margin: "0 auto 16px", color: T.accent }} />
          }
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{barberiaData?.nombre || "reservaIA"}</h1>
          <p style={{ color: T.accent, marginTop: 8 }}>Acceso administrativo</p>
        </div>
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: T.labelColor }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 12px", color: T.text, boxSizing: "border-box" }} placeholder="tu@email.com" autoFocus />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: T.labelColor }}>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 12px", color: T.text, boxSizing: "border-box" }} placeholder="••••••••" />
          </div>
          {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="button" onClick={() => onLogin(email, password)} disabled={cargando} style={{ width: "100%", background: T.btnBg, color: T.btnText, fontWeight: 700, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer", opacity: cargando ? 0.5 : 1 }}>
            {cargando ? "Cargando..." : "Ingresar"}
          </button>
        </div>
        <div style={{ marginTop: 24, textAlign: "center", color: T.mutedText, fontSize: 12 }}>
          <p>¿Eres cliente? Usa el botón "Reservar ahora"</p>
        </div>
      </div>
    </div>
  );
}
