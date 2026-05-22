import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Calcular fecha de MAÑANA (en zona horaria Chile)
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    console.log(`[CRON] Buscando reservas para: ${fechaManana}`);

    // Traer reservas de mañana con TODA la info (incluyendo barbería)
    const { data: reservas, error: errorReservas } = await supabase
      .from('reservas')
      .select(`
        *,
        barbero:barbero_id(nombre),
        servicio:servicio_id(nombre),
        barberia:barberia_id(nombre, configuracion)
      `)
      .eq('fecha', fechaManana)
      .eq('estado', 'confirmada')
      .is('recordatorio_email_enviado_at', null)
      .not('cliente_email', 'is', null);

    if (errorReservas) {
      console.error('Error fetching reservas:', errorReservas);
      return res.status(500).json({ error: errorReservas.message });
    }

    if (!reservas || reservas.length === 0) {
      console.log('[CRON] No hay reservas para mañana.');
      return res.status(200).json({
        success: true,
        message: 'No hay reservas que recordar',
        count: 0,
      });
    }

    console.log(`[CRON] Encontradas ${reservas.length} reservas`);

    const resultados = [];

    for (const r of reservas) {
      try {
        const barberia = r.barberia || {};
        const configuracion = barberia.configuracion || {};
        const features = configuracion.features || {};

        // ⭐ Verificar si WhatsApp está habilitado para esta barbería
        const mostrarWhatsApp = features.whatsapp_recordatorios === true;

        const barberiaNombre = barberia.nombre || 'Tu Barbería';
        const whatsappBarberia = configuracion.whatsapp || '';

        const mensajeWhatsApp = `Hola ${barberiaNombre}! 👋 Confirmo mi cita de mañana ${r.fecha} a las ${r.hora_inicio} con ${r.barbero?.nombre || 'el profesional'}.`;
        const linkWhatsApp = `https://wa.me/${whatsappBarberia}?text=${encodeURIComponent(mensajeWhatsApp)}`;

        const bloqueWhatsApp = mostrarWhatsApp ? `
        <tr>
          <td style="padding: 20px 30px 10px 30px; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; font-weight: 600;">
              ¿Vienes mañana? Confirma por WhatsApp 👇
            </p>
            <a href="${linkWhatsApp}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
              💚 Confirmar asistencia
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 30px 30px 30px; text-align: center;">
            <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">
              💡 Si no puedes asistir, avísanos para reagendar
            </p>
          </td>
        </tr>` : `
        <tr>
          <td style="padding: 20px 30px 30px 30px; text-align: center;">
            <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">
              💡 Si no puedes asistir, contáctanos para reagendar
            </p>
          </td>
        </tr>`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recordatorio</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="background-color: #1c1917; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: #fde68a; font-size: 28px;">${barberiaNombre}</h1>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 14px;">Recordatorio de tu cita</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px 30px; text-align: center;">
        <div style="font-size: 60px;">⏰</div>
        <h2 style="margin: 20px 0 8px 0; color: #1c1917; font-size: 26px;">¡Tu cita es mañana!</h2>
        <p style="margin: 0; color: #57534e; font-size: 16px;">Hola ${r.cliente_nombre} 👋</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafaf9; border-radius: 8px; padding: 24px;">
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${r.servicio?.nombre || 'Tu servicio'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Profesional</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${r.barbero?.nombre || 'El profesional'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Fecha y Hora</p>
              <p style="margin: 4px 0 0 0; color: #d97706; font-size: 20px; font-weight: 700;">${r.fecha} · ${r.hora_inicio}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${bloqueWhatsApp}
    <tr>
      <td style="background-color: #fafaf9; padding: 24px 30px; text-align: center; border-top: 1px solid #e7e5e4;">
        <p style="margin: 0; color: #78716c; font-size: 12px;">
          Te esperamos puntual 🙏
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Enviar email
        const { data, error } = await resend.emails.send({
          from: `${barberiaNombre} <onboarding@resend.dev>`,
          to: r.cliente_email,
          subject: `⏰ Recordatorio: tu cita mañana en ${barberiaNombre}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error enviando a ${r.cliente_email}:`, error);
          resultados.push({ id: r.id, ok: false, error: error.message });
          continue;
        }

        // Marcar como enviado
        await supabase
          .from('reservas')
          .update({ recordatorio_email_enviado_at: new Date().toISOString() })
          .eq('id', r.id);

        resultados.push({ id: r.id, ok: true, messageId: data?.id });
      } catch (err) {
        console.error(`Error procesando reserva ${r.id}:`, err);
        resultados.push({ id: r.id, ok: false, error: err.message });
      }
    }

    const exitosos = resultados.filter((r) => r.ok).length;
    const fallidos = resultados.length - exitosos;

    return res.status(200).json({
      success: true,
      total: resultados.length,
      exitosos,
      fallidos,
      detalles: resultados,
    });
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({ error: error.message });
  }
}
