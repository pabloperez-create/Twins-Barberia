import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

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
      precioServicio,
      adicionales,
      fecha,
      hora,
      precio,
      whatsappBarberia,
      direccionBarberia,
      reservaId,
      barberiaId,
      tipoNegocio,
    } = req.body;

    // Tema según tipo de negocio
    const esSalon = tipoNegocio === 'salon';
    const headerBg = esSalon ? '#fce8f0' : '#1c1917';
    const headerColor = esSalon ? '#7a1f42' : '#fde68a';
    const headerSubColor = esSalon ? '#b05070' : '#a8a29e';
    const accentColor = esSalon ? '#d4638a' : '#d97706';
    const textColor = esSalon ? '#4a1030' : '#1c1917';

    if (!clienteEmail || !clienteNombre || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    let mostrarWhatsApp = true;
    if (barberiaId) {
      const { data: barberia } = await supabase
        .from('barberia')
        .select('configuracion')
        .eq('id', barberiaId)
        .single();
      mostrarWhatsApp = true; // Botón wa.me siempre visible, no depende de Twilio
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

    const tieneAdicionales = adicionales && Array.isArray(adicionales) && adicionales.length > 0;
    const precioServicioMostrar = precioServicio || precio;

    const bloqueServicios = tieneAdicionales ? `
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${servicioNombre} <span style="color: #78716c; font-weight: 400;">· $${precioServicioMostrar.toLocaleString('es-CL')}</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Adicionales</p>
              ${adicionales.map(ad => `
                <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 14px;">
                  <span style="color: #16a34a; font-weight: 700;">+</span> ${ad.nombre} <span style="color: #78716c;">· $${ad.precio.toLocaleString('es-CL')}</span>
                </p>
              `).join('')}
            </td>
          </tr>` : `
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${servicioNombre}</p>
            </td>
          </tr>`;

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
      <td style="background-color: ${headerBg}; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: ${headerColor}; font-size: 32px; font-weight: bold; letter-spacing: 1px;">${barberiaNombre}</h1>
        <p style="margin: 8px 0 0 0; color: ${headerSubColor}; font-size: 14px;">Sistema de Reservas</p>
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
          ${bloqueServicios}
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
            <td style="padding: 12px 16px 8px 16px; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 4px 0 0 0; color: ${accentColor}; font-size: 24px; font-weight: 700;">$${precio.toLocaleString('es-CL')}</p>
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

    // ── Email al cliente ──
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

    // ── Notificación interna al admin y barbero ──
    if (barberiaId) {
      try {
        const { data: barberiaInfo } = await supabase
          .from('barberia')
          .select('email_admin')
          .eq('id', barberiaId)
          .single();

        const { data: barberoInfo } = await supabase
          .from('barberos')
          .select('email')
          .eq('barberia_id', barberiaId)
          .eq('nombre', barberoNombre)
          .single();

        const emailNotif = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table align="center" width="100%" style="max-width:500px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1c1917;padding:20px;text-align:center;">
  <h2 style="margin:0;color:#fde68a;font-size:20px;">Nueva reserva 🎉</h2>
  <p style="margin:4px 0 0;color:#a8a29e;font-size:12px;">${barberiaNombre}</p>
</td></tr>
<tr><td style="padding:20px;">
  <table width="100%" style="background:#fafaf9;border-radius:8px;">
    <tr><td style="padding:8px 12px;"><p style="margin:0;color:#78716c;font-size:11px;text-transform:uppercase;">Cliente</p><p style="margin:3px 0 0;font-size:15px;font-weight:600;">${clienteNombre}</p></td></tr>
    <tr><td style="padding:8px 12px;"><p style="margin:0;color:#78716c;font-size:11px;text-transform:uppercase;">Servicio</p><p style="margin:3px 0 0;font-size:15px;font-weight:600;">${servicioNombre}</p></td></tr>
    <tr><td style="padding:8px 12px;"><p style="margin:0;color:#78716c;font-size:11px;text-transform:uppercase;">Barbero</p><p style="margin:3px 0 0;font-size:15px;font-weight:600;">${barberoNombre}</p></td></tr>
    <tr><td style="padding:8px 12px;"><p style="margin:0;color:#78716c;font-size:11px;text-transform:uppercase;">Fecha y Hora</p><p style="margin:3px 0 0;color:#d97706;font-size:16px;font-weight:700;">${fecha} a las ${hora}</p></td></tr>
    <tr><td style="padding:8px 12px;border-top:1px solid #e7e5e4;"><p style="margin:0;color:#78716c;font-size:11px;text-transform:uppercase;">Total</p><p style="margin:3px 0 0;font-size:16px;font-weight:700;">$${precio.toLocaleString('es-CL')}</p></td></tr>
  </table>
</td></tr>
</table></body></html>`;

        // Enviar al admin
        if (barberiaInfo?.email_admin) {
          await resend.emails.send({
            from: `${barberiaNombre} <onboarding@resend.dev>`,
            to: barberiaInfo.email_admin,
            subject: `🆕 Nueva reserva: ${clienteNombre} - ${fecha} ${hora}`,
            html: emailNotif,
          });
        }

        // Enviar al barbero (si tiene email y es distinto al admin)
        if (barberoInfo?.email && barberoInfo.email !== barberiaInfo?.email_admin) {
          await resend.emails.send({
            from: `${barberiaNombre} <onboarding@resend.dev>`,
            to: barberoInfo.email,
            subject: `✂️ Nueva cita asignada: ${clienteNombre} - ${fecha} ${hora}`,
            html: emailNotif,
          });
        }
      } catch (notifError) {
        console.error('Error enviando notificacion interna:', notifError);
      }
    }

    return res.status(200).json({
      success: true,
      messageId: data?.id,
    });

  } catch (error) {
    console.error('Error en el handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
