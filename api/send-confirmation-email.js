import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      precio,
      whatsappBarberia,
      direccionBarberia,
      reservaId,
      mostrarWhatsApp = true, // ⭐ NUEVO - default true para compatibilidad
    } = req.body;

    if (!clienteEmail || !clienteNombre || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const mensajeWhatsApp = `Hola ${barberiaNombre}! 👋 Confirmo mi reserva del ${fecha} a las ${hora} con ${barberoNombre}. Código: ${reservaId}`;
    const linkWhatsApp = `https://wa.me/${whatsappBarberia}?text=${encodeURIComponent(mensajeWhatsApp)}`;

    const bloqueDireccion = direccionBarberia && direccionBarberia !== "Por definir" ? `
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Dirección</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${direccionBarberia}</p>
            </td>
          </tr>` : '';

    // ⭐ Bloque WhatsApp condicional
    const bloqueWhatsApp = mostrarWhatsApp ? `
    <tr>
      <td style="padding: 20px 30px 10px 30px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px;">
          Confirma tu reserva por WhatsApp para recibir actualizaciones:
        </p>
        <a href="${linkWhatsApp}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
          💚 Confirmar por WhatsApp
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 30px 30px; text-align: center;">
        <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">
          💡 Te enviaremos un recordatorio 1 día antes de tu cita
        </p>
      </td>
    </tr>` : `
    <tr>
      <td style="padding: 20px 30px 30px 30px; text-align: center;">
        <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">
          💡 Te enviaremos un recordatorio 1 día antes de tu cita
        </p>
      </td>
    </tr>`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Confirmada</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <tr>
      <td style="background-color: #1c1917; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: #fde68a; font-size: 32px; font-weight: bold; letter-spacing: 1px;">${barberiaNombre}</h1>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 14px;">Sistema de Reservas</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px 30px; text-align: center;">
        <div style="background-color: #10b981; width: 80px; height: 80px; border-radius: 50%; display: inline-block; line-height: 80px; color: white; font-size: 40px;">✓</div>
        <h2 style="margin: 20px 0 8px 0; color: #1c1917; font-size: 28px;">¡Reserva confirmada!</h2>
        <p style="margin: 0; color: #57534e; font-size: 16px;">Hola ${clienteNombre} 👋</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafaf9; border-radius: 8px; padding: 24px;">
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${servicioNombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Profesional</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${barberoNombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Fecha y Hora</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${fecha} a las ${hora}</p>
            </td>
          </tr>${bloqueDireccion}
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 4px 0 0 0; color: #d97706; font-size: 20px; font-weight: 700;">$${precio.toLocaleString('es-CL')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${bloqueWhatsApp}
    <tr>
      <td style="background-color: #fafaf9; padding: 24px 30px; text-align: center; border-top: 1px solid #e7e5e4;">
        <p style="margin: 0; color: #78716c; font-size: 12px;">
          ¿Necesitas cancelar o reagendar? Contáctanos
        </p>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 11px;">
          Reserva ID: ${reservaId}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${barberiaNombre} <onboarding@resend.dev>`,
      to: clienteEmail,
      subject: `✂️ Reserva confirmada en ${barberiaNombre}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error de Resend:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      messageId: data?.id,
      message: 'Email enviado correctamente',
    });

  } catch (error) {
    console.error('Error en el handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
