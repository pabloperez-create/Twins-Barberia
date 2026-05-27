import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CACHE_HORAS = 24; // Actualizar cada 24 horas

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'OPTIONS' && !verifyToken(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { barberiaId, placeId } = req.query;

  if (!barberiaId || !placeId) {
    return res.status(400).json({ error: 'Faltan barberiaId o placeId' });
  }

  try {
    const cacheId = `google-${barberiaId}`;

    // Verificar si hay caché válido
    const { data: cache } = await supabase
      .from('google_reviews_cache')
      .select('*')
      .eq('id', cacheId)
      .single();

    if (cache) {
      const ultimaActualizacion = new Date(cache.ultima_actualizacion);
      const horasDesdeActualizacion = (Date.now() - ultimaActualizacion.getTime()) / (1000 * 60 * 60);

      if (horasDesdeActualizacion < CACHE_HORAS) {
        console.log(`[Google Reviews] Usando caché (${Math.round(horasDesdeActualizacion)}h)`);
        return res.status(200).json({ reseñas: cache.reseñas, fromCache: true });
      }
    }

    // Llamar a Google Places API
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Google API key no configurada' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=es&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places error:', data.status, data.error_message);
      // Si falla Google pero tenemos caché viejo, usarlo igual
      if (cache) {
        return res.status(200).json({ reseñas: cache.reseñas, fromCache: true, stale: true });
      }
      return res.status(500).json({ error: 'Error consultando Google Places: ' + data.status });
    }

    const reseñas = {
      rating: data.result.rating,
      total: data.result.user_ratings_total,
      reviews: (data.result.reviews || [])
        .filter(r => r.rating >= 4) // Solo reseñas positivas (4-5 estrellas)
        .sort((a, b) => b.time - a.time) // Más recientes primero
        .slice(0, 6) // Máximo 6
        .map(r => ({
          autor: r.author_name,
          foto: r.profile_photo_url,
          estrellas: r.rating,
          texto: r.text,
          fecha: new Date(r.time * 1000).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
        })),
    };

    // Guardar en caché
    await supabase
      .from('google_reviews_cache')
      .upsert({
        id: cacheId,
        barberia_id: barberiaId,
        reseñas,
        ultima_actualizacion: new Date().toISOString(),
      });

    console.log(`[Google Reviews] Actualizadas ${reseñas.reviews.length} reseñas`);
    return res.status(200).json({ reseñas, fromCache: false });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
