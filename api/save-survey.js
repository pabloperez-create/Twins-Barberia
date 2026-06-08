import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'OPTIONS' && !verifyToken(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Modo "detalle" (GET): devuelve lo que muestra VistaEncuesta. Antes era un
  // select directo anónimo; ahora la lectura pasa por aquí (gateado por verifyToken)
  // para que el anón no pueda leer encuestas por id adivinable (enc-<reservaId>).
  if (req.method === 'GET') {
    try {
      const { encuestaId } = req.query;
      if (!encuestaId) return res.status(400).json({ error: 'Falta encuestaId' });
      const { data: enc } = await supabase
        .from('encuestas')
        .select('estrellas, cliente_nombre, barbero_id, barberia:barberia_id(nombre)')
        .eq('id', encuestaId)
        .single();
      if (!enc) return res.status(404).json({ error: 'Encuesta no encontrada' });
      return res.status(200).json({
        estrellas: enc.estrellas,
        cliente_nombre: enc.cliente_nombre,
        barbero_id: enc.barbero_id,
        barberiaNombre: enc.barberia?.nombre || '',
      });
    } catch (err) {
      console.error('Error leyendo encuesta:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { encuestaId, estrellas, comentario } = req.body;

    if (!encuestaId || !estrellas) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (estrellas < 1 || estrellas > 5) {
      return res.status(400).json({ error: 'Estrellas debe ser entre 1 y 5' });
    }

    // Verificar que la encuesta existe y no fue respondida
    const { data: encuesta } = await supabase
      .from('encuestas')
      .select('*')
      .eq('id', encuestaId)
      .single();

    if (!encuesta) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    if (encuesta.estrellas) {
      return res.status(200).json({ ok: true, yaRespondida: true });
    }

    // Guardar respuesta
    const { error } = await supabase
      .from('encuestas')
      .update({
        estrellas: parseInt(estrellas),
        comentario: comentario?.trim() || null,
        fecha_respuesta: new Date().toISOString(),
      })
      .eq('id', encuestaId);

    if (error) throw error;

    return res.status(200).json({ ok: true, barberiaNombre: encuesta.barberia_id });
  } catch (err) {
    console.error('Error guardando encuesta:', err);
    return res.status(500).json({ error: err.message });
  }
}
