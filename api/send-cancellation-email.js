import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const {
      clienteEmail,
      clienteNombre,
      barberiaNombre,
      barberoNombre,
      servicioNombre,
      fecha,
      hora,
      motivo,
      whatsappBarberia,
      barberiaId, // ⭐ Para auto-leer feature
    } = req.body;

    if (!clienteEmail || !clienteNombre) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // ⭐ Auto-leer feature whatsapp_recordatorios
    let mostrarWhatsApp = true;
    if (barberiaId) {
      const { data: barberia } = await supabase
        .from('barberia')
        .select('configuracion')
        .eq('id', barberiaId)
        .single();
      const features = barberia?.configuracion?.features || {};
      mostrarWhatsApp = features.whatsapp_recordatorios === true;
    }

    const mensajeWhatsApp = `Hola ${barberiaNombre}! Me cancelaron mi reserva del ${fecha} a las ${hora}, me gustaría reagendar.`;
    const linkWhatsApp = `https://wa.me/${whatsappBarberia}?text=${encodeURIComponent(mensajeWhatsApp)}`;

    const bloqueMotivo = motivo ? `
      <p style="margin: 16px 0 0 0; color: #57534e; font-size: 14px; font-style: italic; text-align: center;">
        Motivo: ${motivo}
      </p>` : '';

    const bloqueWhatsApp = mostrarWhatsApp ? `
    <tr>
      <td style="padding: 20px 30px 10px 30px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px;">
          ¿Quieres reagendar tu cita?
        </p>
        <a href="${linkWhatsApp}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
          💚 Reagendar por WhatsApp
        </a>
      </td>
    </tr>` : `
    <tr>
      <td style="padding: 20px 30px; text-align: center;">
        <p style="margin: 0; color: #a8a29e; font-size: 13px;">
          💡 Contáctanos si quieres reagendar tu cita
        </p>
      </td>
    </tr>`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reserva cancelada</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="background-color: #1c1917; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: #fde68a; font-size: 28px;">${barberiaNombre}</h1>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 14px;">Notificación</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px 30px; text-align: center;">
        <div style="font-size: 60px;">❌</div>
        <h2 style="margin: 20px 0 8px 0; color: #1c1917; font-size: 26px;">Reserva cancelada</h2>
        <p style="margin: 0; color: #57534e; font-size: 16px;">Hola ${clienteNombre} 👋</p>
        <p style="margin: 16px 0 0 0; color: #57534e; font-size: 15px; line-height: 1.5;">
          Lamentamos avisarte que tu reserva ha sido cancelada.
        </p>${bloqueMotivo}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafaf9; border-radius: 8px; padding: 24px;">
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${servicioNombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Profesional</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${barberoNombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase;">Fecha y Hora</p>
              <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 18px; font-weight: 700; text-decoration: line-through;">${fecha} a las ${hora}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${bloqueWhatsApp}
    <tr>
      <td style="background-color: #fafaf9; padding: 24px 30px; text-align: center; border-top: 1px solid #e7e5e4;">
        <p style="margin: 0; color: #78716c; font-size: 12px;">
          Lamentamos las molestias 🙏
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: `${barberiaNombre} <onboarding@resend.dev>`,
      to: clienteEmail,
      subject: `❌ Reserva cancelada en ${barberiaNombre}`,
      html: emailHtml,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
