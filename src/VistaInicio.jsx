import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

export function VistaInicio({ usuario, onLogout, onNavigate, supabase }) {
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
