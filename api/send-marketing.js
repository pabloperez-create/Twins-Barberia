import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './_verify-token.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'OPTIONS' && !verifyToken(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const ahora = new Date().toISOString();

    // Buscar campañas programadas cuya fecha ya pasó
    const { data: campanas, error } = await supabase
      .from('campanas_marketing')
      .select('*, barberia:barberia_id(nombre, configuracion)')
      .eq('estado', 'programada')
      .lte('fecha_envio', ahora);

    if (error) throw error;

    if (!campanas || campanas.length === 0) {
      return res.status(200).json({ success: true, message: 'No hay campañas para enviar', count: 0 });
    }

    const resultados = [];

    for (const campana of campanas) {
      try {
        const barberia = campana.barberia || {};
        const features = barberia.configuracion?.features || {};

        // Verificar feature flag
        if (!features.marketing_automatizado) {
          await supabase.from('campanas_marketing').update({ estado: 'cancelada' }).eq('id', campana.id);
          resultados.push({ id: campana.id, ok: false, motivo: 'Feature desactivada' });
          continue;
        }

        const barberiaNombre = barberia.nombre || 'Tu Barbería';

        // Obtener emails únicos de clientes de la barbería
        const { data: reservas } = await supabase
          .from('reservas')
          .select('cliente_email, cliente_nombre')
          .eq('barberia_id', campana.barberia_id)
          .eq('estado', 'confirmada')
          .not('cliente_email', 'is', null);

        // Deduplicar emails
        const clientesMap = {};
        (reservas || []).forEach((r) => {
          if (r.cliente_email && !clientesMap[r.cliente_email]) {
            clientesMap[r.cliente_email] = r.cliente_nombre;
          }
        });
        const clientes = Object.entries(clientesMap);

        if (clientes.length === 0) {
          await supabase.from('campanas_marketing').update({ estado: 'enviada', total_enviados: 0 }).eq('id', campana.id);
          resultados.push({ id: campana.id, ok: true, enviados: 0 });
          continue;
        }

        // Bloque promo
        let bloquePromo = '';
        if (campana.tipo_promo && campana.valor_promo) {
          const descuento = campana.tipo_promo === 'porcentaje'
            ? `${campana.valor_promo}% de descuento`
            : `$${campana.valor_promo.toLocaleString('es-CL')} de descuento`;

          bloquePromo = `
          <tr>
            <td style="padding: 20px 30px;">
              <div style="background-color: #fef3c7; border: 2px dashed #d97706; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">🎁 Oferta especial</p>
                <p style="margin: 0 0 8px 0; color: #1c1917; font-size: 28px; font-weight: 900;">${descuento}</p>
                ${campana.codigo_promo ? `<p style="margin: 0; color: #57534e; font-size: 14px;">Usa el código: <strong style="background:#1c1917;color:#fde68a;padding:4px 12px;border-radius:4px;font-size:16px;">${campana.codigo_promo}</strong></p>` : ''}
              </div>
            </td>
          </tr>`;
        }

        // Enviar a cada cliente
        let enviados = 0;
        for (const [email, nombre] of clientes) {
          try {
            const mensajePersonalizado = campana.mensaje.replace('{nombre}', nombre || 'Cliente');

            const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background-color:#1c1917;padding:40px 30px;text-align:center;">
    <h1 style="margin:0;color:#fde68a;font-size:28px;">${barberiaNombre}</h1>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <p style="margin:0;color:#1c1917;font-size:16px;line-height:1.6;white-space:pre-wrap;">${mensajePersonalizado}</p>
  </td></tr>
  ${bloquePromo}
  <tr><td style="padding:20px 30px;text-align:center;">
    <a href="${process.env.VITE_APP_URL || 'https://twins-barberia.vercel.app'}" style="display:inline-block;background-color:#1c1917;color:#fde68a;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
      📅 Reservar ahora
    </a>
  </td></tr>
  <tr><td style="background-color:#fafaf9;padding:20px 30px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="margin:0;color:#a8a29e;font-size:11px;">Recibiste este email porque eres cliente de ${barberiaNombre}.</p>
  </td></tr>
</table></body></html>`;

            await resend.emails.send({
              from: `${barberiaNombre} <onboarding@resend.dev>`,
              to: email,
              subject: campana.asunto,
              html: emailHtml,
            });
            enviados++;
          } catch (err) {
            console.error(`Error enviando a ${email}:`, err.message);
          }
        }

        // Marcar como enviada
        await supabase
          .from('campanas_marketing')
          .update({ estado: 'enviada', total_enviados: enviados })
          .eq('id', campana.id);

        resultados.push({ id: campana.id, ok: true, enviados });
      } catch (err) {
        console.error(`Error procesando campaña ${campana.id}:`, err);
        resultados.push({ id: campana.id, ok: false, error: err.message });
      }
    }

    return res.status(200).json({ success: true, total: resultados.length, resultados });
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({ error: error.message });
  }
}
