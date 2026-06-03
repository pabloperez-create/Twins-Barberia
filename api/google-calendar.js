import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barbero_id, reserva } = req.body;

  try {
    // Obtener tokens del barbero
    const { data: barbero, error } = await supabase
      .from('barberos')
      .select('google_access_token, google_refresh_token, google_calendar_conectado')
      .eq('id', barbero_id)
      .single();

    if (error || !barbero?.google_calendar_conectado) {
      return res.status(200).json({ ok: false, motivo: 'Barbero sin calendario conectado' });
    }

    // ⚠️ Cliente OAuth POR REQUEST: un cliente a nivel de módulo se comparte entre
    // requests concurrentes y cruza las credenciales (el evento de un barbero termina
    // en el calendario de otro). Cada request debe tener su propia instancia.
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Configurar tokens
    oauth2Client.setCredentials({
      access_token: barbero.google_access_token,
      refresh_token: barbero.google_refresh_token
    });

    // Refrescar token si expiró
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await supabase
          .from('barberos')
          .update({ google_access_token: tokens.access_token })
          .eq('id', barbero_id);
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calcular hora fin
    const inicio = `${reserva.fecha}T${reserva.hora_inicio}:00`;
    const [h, m] = reserva.hora_inicio.split(':').map(Number);
    const finMinutos = h * 60 + m + reserva.duracion_minutos;
    const finH = String(Math.floor(finMinutos / 60)).padStart(2, '0');
    const finM = String(finMinutos % 60).padStart(2, '0');
    const fin = `${reserva.fecha}T${finH}:${finM}:00`;

    const evento = {
      summary: `${reserva.servicio} — ${reserva.cliente_nombre}`,
      description: `📱 ${reserva.cliente_telefono}\n✉️ ${reserva.cliente_email}\n💰 $${reserva.precio_final}`,
      start: { dateTime: inicio, timeZone: 'America/Santiago' },
      end: { dateTime: fin, timeZone: 'America/Santiago' },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }]
      }
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: evento
    });

    return res.status(200).json({ ok: true, eventId: result.data.id });

  } catch (err) {
    console.error('Error Google Calendar:', err);
    return res.status(500).json({ error: err.message });
  }
}
