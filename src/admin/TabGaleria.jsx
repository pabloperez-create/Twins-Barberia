import React, { useState, useEffect, useRef } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon } from "lucide-react";

// Gestión de la galería de trabajos ("Nuestros trabajos") que se muestra en la
// página pública como carrusel. Las imágenes van al bucket Storage "barberos"
// (público) bajo galeria/<barberiaId>/. La tabla galeria_trabajos tiene RLS.
export function TabGaleria({ supabase, barberiaId, tema: t }) {
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const fileRef = useRef(null);

  const aviso = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000); };

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await supabase
      .from("galeria_trabajos").select("*").eq("barberia_id", barberiaId)
      .order("orden", { ascending: true });
    setFotos(data || []);
  };

  const subir = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSubiendo(true);
    try {
      let orden = fotos.length;
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `galeria/${barberiaId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("barberos").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("barberos").getPublicUrl(path);
        const { error: insErr } = await supabase.from("galeria_trabajos")
          .insert({ barberia_id: barberiaId, foto_url: urlData.publicUrl, orden: orden++, activo: true });
        if (insErr) throw insErr;
      }
      aviso("success", "✅ Foto(s) agregada(s)");
      await cargar();
    } catch (err) { aviso("error", "Error: " + err.message); }
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const borrar = async (foto) => {
    if (!window.confirm("¿Eliminar esta foto de la galería?")) return;
    const { error } = await supabase.from("galeria_trabajos").delete().eq("id", foto.id);
    if (error) return aviso("error", "Error: " + error.message);
    await cargar();
  };

  const toggleActivo = async (foto) => {
    await supabase.from("galeria_trabajos").update({ activo: !foto.activo }).eq("id", foto.id);
    await cargar();
  };

  const mover = async (index, dir) => {
    const ni = index + dir;
    if (ni < 0 || ni >= fotos.length) return;
    const a = fotos[index], b = fotos[ni];
    await supabase.from("galeria_trabajos").update({ orden: b.orden }).eq("id", a.id);
    await supabase.from("galeria_trabajos").update({ orden: a.orden }).eq("id", b.id);
    await cargar();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Galería de trabajos</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={subiendo}
          className={`flex items-center gap-2 ${t.boton} px-5 py-2 rounded disabled:opacity-50`}
        >
          <Upload size={16} />{subiendo ? "Subiendo..." : "Subir fotos"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={subir} className="hidden" />
      </div>
      <p className={`${t.textoMuted} text-sm mb-6`}>
        Estas fotos se muestran como carrusel en tu página pública. Se ocultan automáticamente si no hay ninguna activa.
      </p>

      {mensaje.texto && (
        <div className={`p-3 rounded mb-5 ${mensaje.tipo === "success" ? "bg-green-900 border border-green-700 text-green-200" : "bg-red-900 border border-red-700 text-red-200"}`}>
          {mensaje.texto}
        </div>
      )}

      {fotos.length === 0 ? (
        <div className={`${t.bgCard} border ${t.border} rounded-xl p-12 text-center`}>
          <ImageIcon size={40} className={`${t.textoMuted} mx-auto mb-3`} />
          <p className={t.textoSub}>Aún no hay fotos. Sube las primeras para mostrar tus trabajos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {fotos.map((f, i) => (
            <div key={f.id} className={`${t.bgCard} border ${t.border} rounded-lg overflow-hidden ${f.activo ? "" : "opacity-50"}`}>
              <img src={f.foto_url} alt="Trabajo" className="w-full aspect-[4/5] object-cover" />
              <div className="flex items-center justify-between p-2 gap-1">
                <div className="flex gap-1">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} className={`${t.bgInput} rounded p-1.5 disabled:opacity-30`} title="Subir"><ArrowUp size={14} /></button>
                  <button onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} className={`${t.bgInput} rounded p-1.5 disabled:opacity-30`} title="Bajar"><ArrowDown size={14} /></button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActivo(f)} className={`${t.bgInput} rounded p-1.5`} title={f.activo ? "Ocultar" : "Mostrar"}>
                    {f.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => borrar(f)} className="bg-red-900 text-red-200 rounded p-1.5" title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
