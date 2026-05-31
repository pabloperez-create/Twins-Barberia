import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Obtener todas las barberías activas
    const { data: barberias } = await supabase
      .from('barberia')
      .select('*')
      .eq('activa', true);

    let totalEnviados = 0;

    for (const barberia of barberias || []) {
      const config = barberia.configuracion?.marketing_inactivos;
      if (!config?.activo) continue;

      const { dias_inactividad, frecuencia_reenvio, asunto, mensaje } = config;
      const hoy = new Date();
      const fechaCorte = new Date(hoy.getTime() - dias_inactividad * 24 * 60 * 60 * 1000);
      const fechaCorteISO = fechaCorte.toISOString().split('T')[0];

      // Obtener clientes con reservas confirmadas
      const { data: reservas } = await supabase
        .from('reservas')
        .select('cliente_email, cliente_nombre, fecha')
        .eq('barberia_id', barberia.id)
        .eq('estado', 'confirmada')
        .not('cliente_email', 'is', null);

      if (!reservas?.length) continue;

      // Agrupar última reserva por cliente
      const ultimaReserva = {};
      for (const r of reservas) {
        if (!ultimaReserva[r.cliente_email] || r.fecha > ultimaReserva[r.cliente_email].fecha) {
          ultimaReserva[r.cliente_email] = r;
        }
      }

      // Filtrar clientes inactivos
      const clientesInactivos = Object.values(ultimaReserva).filter(r => r.fecha < fechaCorteISO);

      for (const cliente of clientesInactivos) {
        // Verificar si ya se le envió recientemente
        const fechaUltimoEnvio = new Date(hoy.getTime() - frecuencia_reenvio * 24 * 60 * 60 * 1000);
        const { data: envioPrevio } = await supabase
          .from('campanas_marketing')
          .select('id')
          .eq('barberia_id', barberia.id)
          .eq('estado', 'enviada')
          .ilike('mensaje', `%${cliente.cliente_email}%`)
          .gte('fecha_envio', fechaUltimoEnvio.toISOString().split('T')[0])
          .limit(1);

        if (envioPrevio?.length) continue;

        const diasSinVisita = Math.floor((hoy - new Date(cliente.fecha)) / (1000 * 60 * 60 * 24));
        const mensajePersonalizado = mensaje
          .replace('{nombre}', cliente.cliente_nombre || 'amigo')
          .replace('{dias}', diasSinVisita);

        try {
          await resend.emails.send({
            from: `${barberia.nombre} <onboarding@resend.dev>`,
            to: cliente.cliente_email,
            subject: asunto,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="color:#1c1917">${asunto}</h2>
                <p style="color:#44403c;font-size:16px;line-height:1.6">${mensajePersonalizado}</p>
                <a href="${process.env.VITE_APP_URL || 'https://twins-barberia.vercel.app'}?barberiaId=${barberia.id}"
                   style="display:inline-block;margin-top:16px;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                  Reservar ahora →
                </a>
                <p style="color:#a8a29e;font-size:12px;margin-top:24px">${barberia.nombre}</p>
              </div>
            `
          });
          totalEnviados++;
        } catch (emailErr) {
          console.error('Error enviando email a', cliente.cliente_email, emailErr);
        }
      }
    }

    return res.status(200).json({ ok: true, enviados: totalEnviados });
  } catch (err) {
    console.error('Error cron inactivos:', err);
    return res.status(500).json({ error: err.message });
  }
}
