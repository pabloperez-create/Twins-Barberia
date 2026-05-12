import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cliente de Supabase con permisos de service_role (lee todo sin RLS)
// Si no tienes SUPABASE_SERVICE_ROLE_KEY, usamos la anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fgtbhkeqzcqpjhziyijt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Detectar si es llamada para una reserva específica (single) o el cron diario
    const singleReservaId = req.query.single;

    // Calcular fechas en zona horaria Chile
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const mañana = new Date(ahora);
    mañana.setDate(mañana.getDate() + 1);
    const mañanaStr = mañana.toISOString().split('T')[0];

    let reservas = [];

    if (singleReservaId) {
      // ===== MODO INMEDIATO: una reserva específica =====
      console.log(`📧 Enviando recordatorio inmediato para reserva ${singleReservaId}`);
      
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', singleReservaId)
        .is('recordatorio_email_enviado_at', null);

      if (error) throw error;
      reservas = data || [];
    } else {
      // ===== MODO CRON: todas las reservas de hoy + mañana =====
      console.log(`📧 Cron ejecutándose. Buscando reservas para hoy (${hoy}) y mañana (${mañanaStr})`);
      
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('estado', 'confirmada')
        .in('fecha', [hoy, mañanaStr])
        .is('recordatorio_email_enviado_at', null);

      if (error) throw error;
      reservas = data || [];
    }

    console.log(`📊 Encontradas ${reservas.length} reservas para procesar`);

    if (reservas.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No hay reservas para recordar',
        count: 0 
      });
    }

    // Procesar cada reserva
    const resultados = [];
    for (const reserva of reservas) {
      try {
        // Skip si la reserva no tiene email
        if (!reserva.cliente_email) {
          console.log(`⏭️ Reserva ${reserva.id} sin email, skip`);
          continue;
        }

        // Cargar datos relacionados
        const [barberiaRes, barberoRes, servicioRes] = await Promise.all([
          supabase.from('barberia').select('*').eq('id', reserva.barberia_id).single(),
          supabase.from('barberos').select('*').eq('id', reserva.barbero_id).single(),
          supabase.from('servicios_principales').select('*').eq('id', reserva.servicio_id).single(),
        ]);

        const barberia = barberiaRes.data;
        const barbero = barberoRes.data;
        const servicio = servicioRes.data;

        if (!barberia || !barbero || !servicio) {
          console.error(`⚠️ Datos incompletos para reserva ${reserva.id}`);
          continue;
        }

        // Determinar si es HOY o MAÑANA
        const esHoy = reserva.fecha === hoy;
        const cuandoTexto = esHoy ? 'HOY' : 'MAÑANA';
        const cuandoLower = esHoy ? 'hoy' : 'mañana';
        const emoji = esHoy ? '🔥' : '📅';

        // Mensaje pre-llenado para WhatsApp
        const mensajeWhatsApp = `Hola ${barberia.nombre}! 👋 Confirmo que asistiré ${cuandoLower} a las ${reserva.hora_inicio} con ${barbero.nombre}.`;
        const whatsappNumero = barberia.configuracion?.whatsapp || '56000000000';
        const linkWhatsApp = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensajeWhatsApp)}`;

        // Calcular precio
        const precioFinal = reserva.precio_final || 0;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de tu cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <tr>
      <td style="background-color: #1c1917; padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: #fde68a; font-size: 32px; font-weight: bold; letter-spacing: 1px;">${barberia.nombre}</h1>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 14px;">Sistema de Reservas</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px 30px; text-align: center;">
        <div style="font-size: 60px; line-height: 1;">${emoji}</div>
        <h2 style="margin: 20px 0 8px 0; color: #1c1917; font-size: 28px;">¡${cuandoTexto} es tu día!</h2>
        <p style="margin: 0; color: #57534e; font-size: 16px;">Hola ${reserva.cliente_nombre} 👋</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 20px 30px; text-align: center;">
        <p style="margin: 0; color: #57534e; font-size: 16px; line-height: 1.5;">
          ¡Ya casi! ${cuandoTexto === 'HOY' ? 'Hoy' : 'Mañana'} a las <strong>${reserva.hora_inicio}</strong> te esperamos 
          para tu <strong>${servicio.nombre}</strong> con <strong>${barbero.nombre}</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafaf9; border-radius: 8px; padding: 24px;">
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Servicio</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${servicio.nombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Profesional</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${barbero.nombre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Fecha y Hora</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${reserva.fecha} a las ${reserva.hora_inicio}</p>
            </td>
          </tr>
          ${barberia.configuracion?.direccion && barberia.configuracion.direccion !== 'Por definir' ? `
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Dirección</p>
              <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 16px; font-weight: 600;">${barberia.configuracion.direccion}</p>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 16px;">
              <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total</p>
              <p style="margin: 4px 0 0 0; color: #d97706; font-size: 20px; font-weight: 700;">$${precioFinal.toLocaleString('es-CL')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px 10px 30px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; font-weight: 600;">
          ¿Confirmas que asistirás? 👇
        </p>
        <a href="${linkWhatsApp}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
          💚 Confirmar por WhatsApp
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 30px 30px; text-align: center;">
        <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">
          💡 Al confirmar nos ayudas a tener todo listo para ti
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #fafaf9; padding: 24px 30px; text-align: center; border-top: 1px solid #e7e5e4;">
        <p style="margin: 0; color: #78716c; font-size: 12px;">
          ¿Necesitas cancelar o reagendar? Contáctanos por WhatsApp
        </p>
        <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 11px;">
          Reserva ID: ${reserva.id}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // Enviar email
        const { error: errorResend } = await resend.emails.send({
          from: `${barberia.nombre} <onboarding@resend.dev>`,
          to: reserva.cliente_email,
          subject: `${emoji} ¡${cuandoTexto} es tu día en ${barberia.nombre}!`,
          html: emailHtml,
        });

        if (errorResend) {
          console.error(`❌ Error enviando email para ${reserva.id}:`, errorResend);
          resultados.push({ id: reserva.id, success: false, error: errorResend.message });
          continue;
        }

        // Marcar como enviado
        const { error: errorUpdate } = await supabase
          .from('reservas')
          .update({ recordatorio_email_enviado_at: new Date().toISOString() })
          .eq('id', reserva.id);

        if (errorUpdate) {
          console.error(`⚠️ Email enviado pero no se pudo marcar ${reserva.id}:`, errorUpdate);
        }

        console.log(`✅ Recordatorio enviado para ${reserva.id} (${reserva.cliente_email})`);
        resultados.push({ id: reserva.id, success: true });

      } catch (err) {
        console.error(`❌ Error procesando reserva ${reserva.id}:`, err);
        resultados.push({ id: reserva.id, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      processed: resultados.length,
      successCount: resultados.filter(r => r.success).length,
      failedCount: resultados.filter(r => !r.success).length,
      results: resultados,
    });

  } catch (error) {
    console.error('❌ Error en handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
