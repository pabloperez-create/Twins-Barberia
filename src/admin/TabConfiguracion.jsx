import React, { useState, useEffect, useRef } from "react";
import { Save, Check, AlertCircle, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

export function TabConfiguracion({ supabase, barberia, onUpdate, tema: t }) {
  const [general, setGeneral] = useState({ nombre: barberia?.nombre || "", direccion: barberia?.configuracion?.direccion || "" });
  const [contacto, setContacto] = useState({ whatsapp: barberia?.configuracion?.whatsapp || "", instagram: barberia?.configuracion?.instagram || "", email_admin: barberia?.email_admin || "" });
  const [horario, setHorario] = useState({ horario_atencion: barberia?.configuracion?.horario_atencion || "" });
  const [guardando, setGuardando] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => { generarQR(); }, [barberia]);

  const generarQR = async () => {
    try {
      const url = window.location.origin;
      const qrColor = t.tipo === "salon" ? "#9d174d" : "#1c1917";
      const qrBg = t.tipo === "salon" ? "#fdf2f8" : "#fafaf9";
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: qrColor, light: qrBg } });
      setQrDataUrl(dataUrl);
    } catch (err) { console.error("Error generando QR:", err); }
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
      if (seccion === "general") updateData = { nombre: datos.nombre, configuracion: { ...barberia.configuracion, direccion: datos.direccion } };
      else if (seccion === "contacto") updateData = { email_admin: datos.email_admin, configuracion: { ...barberia.configuracion, whatsapp: datos.whatsapp, instagram: datos.instagram } };
      else if (seccion === "horario") updateData = { configuracion: { ...barberia.configuracion, horario_atencion: datos.horario_atencion } };
      const { error } = await supabase.from("barberia").update(updateData).eq("id", barberia.id);
      if (error) throw error;
      setMensaje({ tipo: "success", texto: `✅ ${seccion} actualizado correctamente` });
      onUpdate();
    } catch (err) { setMensaje({ tipo: "error", texto: "Error: " + err.message }); }
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
      const { error: uploadError } = await supabase.storage.from("Barberos").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("Barberos").getPublicUrl(fileName);
      await supabase.from("barberia").update({ logo_url: urlData.publicUrl }).eq("id", barberia.id);
      onUpdate();
      setMensaje({ tipo: "success", texto: "Logo actualizado ✓" });
    } catch (err) { setMensaje({ tipo: "error", texto: "Error subiendo logo: " + err.message }); }
    setSubiendoLogo(false);
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 3000);
  };

  const inputClass = `w-full ${t.bgInput} border ${t.borderInput} rounded px-4 py-2 ${t.texto}`;
  const cardClass = `${t.bgCard} border ${t.border} rounded p-6`;
  const btnGuardar = (seccion) => `flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Configuración</h2>

      {mensaje.texto && (
        <div className={`p-4 rounded mb-6 flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.tipo === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* INFORMACIÓN GENERAL */}
        <div className={cardClass}>
          <h3 className="text-lg font-bold mb-1">📋 Información General</h3>
          <p className={`${t.textoSub} text-sm mb-4`}>Nombre y datos básicos de tu {t.tipo === "salon" ? "salón" : "barbería"}</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Nombre de {t.tipo === "salon" ? "el salón" : "la barbería"}</label>
              <input type="text" value={general.nombre} onChange={(e) => setGeneral({ ...general, nombre: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {barberia?.logo_url && <img src={barberia.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-pink-200" />}
                <label className={`cursor-pointer flex items-center gap-2 ${t.bgMuted} ${t.bgHover} border ${t.border} ${t.texto} px-4 py-2 rounded`}>
                  {subiendoLogo ? "Subiendo..." : "Subir logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={subirLogo} disabled={subiendoLogo} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Dirección</label>
              <input type="text" value={general.direccion} onChange={(e) => setGeneral({ ...general, direccion: e.target.value })} placeholder="Ej: Av. Providencia 123, Santiago" className={inputClass} />
            </div>
            <button onClick={() => guardarSeccion("general", general)} disabled={guardando === "general"} className={btnGuardar("general")}>
              <Save size={16} />{guardando === "general" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* CONTACTO Y REDES */}
        <div className={cardClass}>
          <h3 className="text-lg font-bold mb-1">📞 Contacto y Redes</h3>
          <p className={`${t.textoSub} text-sm mb-4`}>WhatsApp para reservas y redes sociales</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">WhatsApp <span className={`${t.textoMuted} text-xs font-normal`}>(formato: 56912345678)</span></label>
              <input type="text" value={contacto.whatsapp} onChange={(e) => setContacto({ ...contacto, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="56912345678" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Instagram</label>
              <input type="text" value={contacto.instagram} onChange={(e) => setContacto({ ...contacto, instagram: e.target.value })} placeholder="@tusalon" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email del administrador</label>
              <input type="email" value={contacto.email_admin} onChange={(e) => setContacto({ ...contacto, email_admin: e.target.value })} className={inputClass} />
            </div>
            <button onClick={() => guardarSeccion("contacto", contacto)} disabled={guardando === "contacto"} className={btnGuardar("contacto")}>
              <Save size={16} />{guardando === "contacto" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* HORARIO */}
        <div className={cardClass}>
          <h3 className="text-lg font-bold mb-1">⏰ Horario de Atención</h3>
          <p className={`${t.textoSub} text-sm mb-4`}>Horario general (los horarios por {t.tipo === "salon" ? "estilista" : "barbero"} se editan en la pestaña correspondiente)</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Horario general</label>
              <input type="text" value={horario.horario_atencion} onChange={(e) => setHorario({ ...horario, horario_atencion: e.target.value })} placeholder="Ej: Lun-Sáb 10:00-20:00" className={inputClass} />
            </div>
            <button onClick={() => guardarSeccion("horario", horario)} disabled={guardando === "horario"} className={btnGuardar("horario")}>
              <Save size={16} />{guardando === "horario" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* QR */}
        <div className={cardClass}>
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <QrCode size={20} className={t.acento} />QR de Reservas
          </h3>
          <p className={`${t.textoSub} text-sm mb-6`}>Imprime este QR y ponlo en tu {t.tipo === "salon" ? "salón" : "barbería"}. Tus clientes lo escanean y reservan directamente.</p>
          <div className="flex flex-col items-center gap-6">
            {qrDataUrl ? (
              <div className={`${t.bgCard} p-4 rounded-xl border ${t.border}`}>
                <img src={qrDataUrl} alt="QR Reservas" className="w-48 h-48" />
              </div>
            ) : (
              <div className={`w-48 h-48 ${t.bgMuted} rounded-xl flex items-center justify-center`}>
                <p className={`${t.textoMuted} text-sm`}>Generando QR...</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-semibold mb-1">{barberia?.nombre}</p>
              <p className={`text-xs ${t.textoMuted}`}>{window.location.origin}</p>
            </div>
            <button onClick={descargarQR} disabled={!qrDataUrl} className={`flex items-center gap-2 ${t.boton} px-6 py-2 rounded disabled:opacity-50`}>
              <Download size={16} />Descargar QR
            </button>
            <p className={`text-xs ${t.textoMuted} text-center`}>💡 Cuando tengas tu dominio propio (reservaia.cl), el QR se actualizará automáticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
