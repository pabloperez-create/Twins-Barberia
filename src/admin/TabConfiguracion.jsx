import React, { useState, useEffect, useRef } from "react";
import { Save, Check, AlertCircle, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

export function TabConfiguracion({ supabase, barberia, onUpdate }) {
  const [general, setGeneral] = useState({
    nombre: barberia?.nombre || "",
    direccion: barberia?.configuracion?.direccion || "",
  });

  const [contacto, setContacto] = useState({
    whatsapp: barberia?.configuracion?.whatsapp || "",
    instagram: barberia?.configuracion?.instagram || "",
    email_admin: barberia?.email_admin || "",
  });

  const [horario, setHorario] = useState({
    horario_atencion: barberia?.configuracion?.horario_atencion || "",
  });

  const [guardando, setGuardando] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const canvasRef = useRef(null);

  // Generar QR al cargar
  useEffect(() => {
    generarQR();
  }, [barberia]);

  const generarQR = async () => {
    try {
      const url = window.location.origin; // URL del sitio actual
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1c1917",
          light: "#fafaf9",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Error generando QR:", err);
    }
  };

  const descargarQR = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${barberia?.nombre || "barberia"}.png`;
    link.click();
  };

  const guardarSeccion = async (seccion, datos) => {
    setGuardando(seccion);
    setMensaje({ tipo: "", texto: "" });

    try {
      let updateData = {};

      if (seccion === "general") {
        updateData = {
          nombre: datos.nombre,
          configuracion: {
            ...barberia.configuracion,
            direccion: datos.direccion,
          },
        };
      } else if (seccion === "contacto") {
        updateData = {
          email_admin: datos.email_admin,
          configuracion: {
            ...barberia.configuracion,
            whatsapp: datos.whatsapp,
            instagram: datos.instagram,
          },
        };
      } else if (seccion === "horario") {
        updateData = {
          configuracion: {
            ...barberia.configuracion,
            horario_atencion: datos.horario_atencion,
          },
        };
      }

      const { error } = await supabase
        .from("barberia")
        .update(updateData)
        .eq("id", barberia.id);

      if (error) throw error;

      setMensaje({
        tipo: "success",
        texto: `✅ ${seccion} actualizado correctamente`,
      });
      onUpdate();
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error: " + err.message });
    }

    setGuardando("");
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };
  const subirLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${barberia.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("barberos")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("barberos")
        .getPublicUrl(fileName);
      await supabase
        .from("barberia")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", barberia.id);
      onUpdate();
      setMensaje({ tipo: "success", texto: "Logo actualizado ✓" });
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: "Error subiendo logo: " + err.message,
      });
    }
    setSubiendoLogo(false);
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Configuración</h2>

      {mensaje.texto && (
        <div
          className={`p-4 rounded mb-6 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}
        >
          {mensaje.tipo === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p>{mensaje.texto}</p>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* SECCIÓN 1: INFORMACIÓN GENERAL */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1">📋 Información General</h3>
          <p className="text-stone-400 text-sm mb-4">
            Nombre y datos básicos de tu barbería
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Nombre de la barbería
              </label>
              <input
                type="text"
                value={general.nombre}
                onChange={(e) =>
                  setGeneral({ ...general, nombre: e.target.value })
                }
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Logo de la barbería
              </label>
              <div className="flex items-center gap-4">
                {barberia?.logo_url && (
                  <img
                    src={barberia.logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover border border-stone-600"
                  />
                )}
                <label className="cursor-pointer flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-white px-4 py-2 rounded">
                  {subiendoLogo ? "Subiendo..." : "Subir logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={subirLogo}
                    disabled={subiendoLogo}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={general.direccion}
                onChange={(e) =>
                  setGeneral({ ...general, direccion: e.target.value })
                }
                placeholder="Ej: Av. Providencia 123, Santiago"
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <button
              onClick={() => guardarSeccion("general", general)}
              disabled={guardando === "general"}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
            >
              <Save size={16} />
              {guardando === "general" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* SECCIÓN 2: CONTACTO Y REDES */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1">📞 Contacto y Redes</h3>
          <p className="text-stone-400 text-sm mb-4">
            WhatsApp para reservas y redes sociales
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                WhatsApp{" "}
                <span className="text-stone-400 text-xs font-normal">
                  (formato: 56912345678, sin + ni espacios)
                </span>
              </label>
              <input
                type="text"
                value={contacto.whatsapp}
                onChange={(e) =>
                  setContacto({
                    ...contacto,
                    whatsapp: e.target.value.replace(/\D/g, "").slice(0, 11),
                  })
                }
                placeholder="56912345678"
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Instagram
              </label>
              <input
                type="text"
                value={contacto.instagram}
                onChange={(e) =>
                  setContacto({ ...contacto, instagram: e.target.value })
                }
                placeholder="@tubarberia"
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Email del administrador
              </label>
              <input
                type="email"
                value={contacto.email_admin}
                onChange={(e) =>
                  setContacto({ ...contacto, email_admin: e.target.value })
                }
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <button
              onClick={() => guardarSeccion("contacto", contacto)}
              disabled={guardando === "contacto"}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
            >
              <Save size={16} />
              {guardando === "contacto" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* SECCIÓN 3: HORARIO */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1">⏰ Horario de Atención</h3>
          <p className="text-stone-400 text-sm mb-4">
            Horario general de la barbería (los horarios por barbero se editan
            en la pestaña Barberos)
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Horario general
              </label>
              <input
                type="text"
                value={horario.horario_atencion}
                onChange={(e) =>
                  setHorario({ ...horario, horario_atencion: e.target.value })
                }
                placeholder="Ej: Lun-Sáb 10:00-20:00"
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-2 text-white"
              />
            </div>
            <button
              onClick={() => guardarSeccion("horario", horario)}
              disabled={guardando === "horario"}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-5 py-2 rounded disabled:opacity-50"
            >
              <Save size={16} />
              {guardando === "horario" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* SECCIÓN 4: QR DE RESERVAS ⭐ NUEVO */}
        <div className="bg-stone-900 border border-stone-700 rounded p-6">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <QrCode size={20} className="text-amber-200" />
            QR de Reservas
          </h3>
          <p className="text-stone-400 text-sm mb-6">
            Imprime este QR y ponlo en tu barbería. Tus clientes lo escanean y
            reservan directamente desde su celular.
          </p>

          <div className="flex flex-col items-center gap-6">
            {/* QR Image */}
            {qrDataUrl ? (
              <div className="bg-stone-50 p-4 rounded-xl">
                <img src={qrDataUrl} alt="QR Reservas" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-stone-800 rounded-xl flex items-center justify-center">
                <p className="text-stone-500 text-sm">Generando QR...</p>
              </div>
            )}

            {/* Info */}
            <div className="text-center">
              <p className="text-sm font-semibold text-white mb-1">
                {barberia?.nombre}
              </p>
              <p className="text-xs text-stone-400">{window.location.origin}</p>
            </div>

            {/* Botón descargar */}
            <button
              onClick={descargarQR}
              disabled={!qrDataUrl}
              className="flex items-center gap-2 bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold px-6 py-2 rounded disabled:opacity-50"
            >
              <Download size={16} />
              Descargar QR
            </button>

            <p className="text-xs text-stone-500 text-center">
              💡 Cuando tengas tu dominio propio (agendaia.cl), el QR se
              actualizará automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
