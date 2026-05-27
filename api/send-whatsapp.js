import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'OPTIONS' && !verifyToken(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      clienteTelefono,
      clienteNombre,
      barberiaNombre,
      barberoNombre,
      servicioNombre,
      fecha,
      hora,
      precio,
      barberiaId,
      tipo = 'confirmacion', // confirmacion | recordatorio_24h | recordatorio_hoy | cancelacion
    } = req.body;

    if (!clienteTelefono || !barberiaId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar feature flag whatsapp_recordatorios
    const { data: barberiaData } = await supabase
      .from('barberia')
      .select('configuracion')
      .eq('id', barberiaId)
      .single();

    const features = barberiaData?.configuracion?.features || {};
    if (!features.whatsapp_recordatorios) {
      return res.status(200).json({ ok: false, motivo: 'Feature WhatsApp desactivada para esta barbería' });
    }

    // Verificar credenciales Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      return res.status(500).json({ error: 'Credenciales Twilio no configuradas' });
    }

    const client = twilio(accountSid, authToken);

    // Formatear fecha legible
    const [anio, mes, dia] = fecha.split('-');
    const fechaLegible = `${dia}/${mes}/${anio}`;

    // Construir mensaje según tipo
    let mensaje = '';

    if (tipo === 'confirmacion') {
      mensaje = `✅ *¡Reserva confirmada!*\n\nHola ${clienteNombre}, tu cita en *${barberiaNombre}* está confirmada:\n\n📅 ${fechaLegible} a las ${hora}\n✂️ ${servicioNombre} con ${barberoNombre}\n💰 $${Number(precio).toLocaleString('es-CL')}\n\n_Si necesitas cancelar, responde este mensaje._`;
    } else if (tipo === 'recordatorio_24h') {
      mensaje = `⏰ *Recordatorio de cita*\n\nHola ${clienteNombre}, te recordamos tu cita en *${barberiaNombre}* es *mañana*:\n\n📅 ${fechaLegible} a las ${hora}\n✂️ ${servicioNombre} con ${barberoNombre}\n\n_¡Te esperamos!_`;
    } else if (tipo === 'recordatorio_hoy') {
      mensaje = `🔔 *Tu cita es hoy*\n\nHola ${clienteNombre}, tu cita en *${barberiaNombre}* es *hoy*:\n\n🕐 ${hora}\n✂️ ${servicioNombre} con ${barberoNombre}\n\n_¡Nos vemos pronto!_`;
    } else if (tipo === 'cancelacion') {
      mensaje = `❌ *Cita cancelada*\n\nHola ${clienteNombre}, tu cita del ${fechaLegible} a las ${hora} en *${barberiaNombre}* ha sido cancelada.\n\n_Para reagendar, visita nuestro sitio web._`;
    }

    // Formatear número destino
    const numeroDestino = clienteTelefono.startsWith('whatsapp:')
      ? clienteTelefono
      : `whatsapp:+${clienteTelefono.replace(/\D/g, '')}`;

    const message = await client.messages.create({
      from,
      to: numeroDestino,
      body: mensaje,
    });

    console.log(`✅ WhatsApp enviado [${tipo}] a ${numeroDestino} - SID: ${message.sid}`);
    return res.status(200).json({ ok: true, sid: message.sid });

  } catch (err) {
    console.error('❌ Error enviando WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
}
