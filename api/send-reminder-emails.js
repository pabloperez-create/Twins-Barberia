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
    const hoy = new Date();

    // ── FECHA MAÑANA (recordatorios) ──
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    // ── FECHA AYER (encuestas post-cita) ──
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().split('T')[0];

    console.log(`[CRON] Recordatorios para: ${fechaManana} | Encuestas para: ${fechaAyer}`);

    // ══════════════════════════════════════
    // 1. RECORDATORIOS (reservas de mañana)
    // ══════════════════════════════════════
    const { data: reservas, error: errorReservas } = await supabase
      .from('reservas')
      .select(`*, barbero:barbero_id(nombre), servicio:servicio_id(nombre), barberia:barberia_id(nombre, configuracion)`)
      .eq('fecha', fechaManana)
      .eq('estado', 'confirmada')
      .is('recordatorio_email_enviado_at', null)
      .not('cliente_email', 'is', null);

    if (errorReservas) {
      console.error('Error fetching reservas:', errorReservas);
      return res.status(500).json({ error: errorReservas.message });
    }

    const resultadosRecordatorios = [];

    for (const r of reservas || []) {
      try {
        const barberia = r.barberia || {};
        const configuracion = barberia.configuracion || {};
        const barberiaNombre = barberia.nombre || 'Tu Barbería';
        const whatsappBarberia = configuracion.whatsapp || '';
        const mensajeWhatsApp = `Hola ${barberiaNombre}! 👋 Confirmo mi cita de mañana ${r.fecha} a las ${r.hora_inicio} con ${r.barbero?.nombre || 'el profesional'}.`;
        const linkWhatsApp = `https://wa.me/${whatsappBarberia}?text=${encodeURIComponent(mensajeWhatsApp)}`;

        const bloqueWhatsApp = `
        <tr>
          <td style="padding: 20px 30px 10px 30px; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; font-weight: 600;">¿Vienes mañana? Confirma por WhatsApp 👇</p>
            <a href="${linkWhatsApp}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">💚 Confirmar asistencia</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 30px 30px 30px; text-align: center;">
            <p style="margin: 0; color: #a8a29e; font-size: 13px; font-style: italic;">💡 Si no puedes asistir, avísanos para reagendar</p>
          </td>
        </tr>`;

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background-color:#1c1917;padding:40px 30px;text-align:center;">
    <h1 style="margin:0;color:#fde68a;font-size:28px;">${barberiaNombre}</h1>
    <p style="margin:8px 0 0 0;color:#a8a29e;font-size:14px;">Recordatorio de tu cita</p>
  </td></tr>
  <tr><td style="padding:40px 30px 20px 30px;text-align:center;">
    <div style="font-size:60px;">⏰</div>
    <h2 style="margin:20px 0 8px 0;color:#1c1917;font-size:26px;">¡Tu cita es mañana!</h2>
    <p style="margin:0;color:#57534e;font-size:16px;">Hola ${r.cliente_nombre} 👋</p>
  </td></tr>
  <tr><td style="padding:20px 30px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafaf9;border-radius:8px;padding:24px;">
      <tr><td style="padding:8px 16px;"><p style="margin:0;color:#78716c;font-size:12px;text-transform:uppercase;">Servicio</p><p style="margin:4px 0 0 0;color:#1c1917;font-size:16px;font-weight:600;">${r.servicio?.nombre || 'Tu servicio'}</p></td></tr>
      <tr><td style="padding:8px 16px;"><p style="margin:0;color:#78716c;font-size:12px;text-transform:uppercase;">Profesional</p><p style="margin:4px 0 0 0;color:#1c1917;font-size:16px;font-weight:600;">${r.barbero?.nombre || 'El profesional'}</p></td></tr>
      <tr><td style="padding:8px 16px;"><p style="margin:0;color:#78716c;font-size:12px;text-transform:uppercase;">Fecha y Hora</p><p style="margin:4px 0 0 0;color:#d97706;font-size:20px;font-weight:700;">${r.fecha} · ${r.hora_inicio}</p></td></tr>
    </table>
  </td></tr>
  ${bloqueWhatsApp}
  <tr><td style="background-color:#fafaf9;padding:24px 30px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="margin:0;color:#78716c;font-size:12px;">Te esperamos puntual 🙏</p>
  </td></tr>
</table></body></html>`;

        const { data, error } = await resend.emails.send({
          from: `${barberiaNombre} <no-reply@reservaia.cl>`,
          to: r.cliente_email,
          subject: `⏰ Recordatorio: tu cita mañana en ${barberiaNombre}`,
          html: emailHtml,
        });

        if (error) {
          resultadosRecordatorios.push({ id: r.id, ok: false, error: error.message });
          continue;
        }

        await supabase.from('reservas').update({ recordatorio_email_enviado_at: new Date().toISOString() }).eq('id', r.id);
        resultadosRecordatorios.push({ id: r.id, ok: true });
      } catch (err) {
        resultadosRecordatorios.push({ id: r.id, ok: false, error: err.message });
      }
    }

    // ══════════════════════════════════════
    // 2. ENCUESTAS POST-CITA (reservas de ayer)
    // ══════════════════════════════════════
    const { data: reservasAyer } = await supabase
      .from('reservas')
      .select(`*, barbero:barbero_id(nombre), servicio:servicio_id(nombre), barberia:barberia_id(nombre, configuracion)`)
      .eq('fecha', fechaAyer)
      .eq('estado', 'confirmada')
      .not('cliente_email', 'is', null);

    const resultadosEncuestas = [];

    for (const r of reservasAyer || []) {
      try {
        const barberia = r.barberia || {};
        const configuracion = barberia.configuracion || {};
        const features = configuracion.features || {};

        // Verificar feature flag encuestas
        if (!features.encuestas_satisfaccion) {
          resultadosEncuestas.push({ id: r.id, ok: false, motivo: 'Feature desactivada' });
          continue;
        }

        // Verificar si ya existe encuesta para esta reserva
        const { data: encuestaExistente } = await supabase
          .from('encuestas')
          .select('id')
          .eq('reserva_id', r.id)
          .single();

        if (encuestaExistente) {
          resultadosEncuestas.push({ id: r.id, ok: false, motivo: 'Ya enviada' });
          continue;
        }

        const barberiaNombre = barberia.nombre || 'Tu Barbería';
        const baseUrl = process.env.VITE_APP_URL || 'https://twins-barberia.vercel.app';
        const encuestaId = `enc-${r.id}`;

        // Crear registro de encuesta pendiente
        await supabase.from('encuestas').insert({
          id: encuestaId,
          barberia_id: r.barberia_id,
          reserva_id: r.id,
          barbero_id: r.barbero_id,
          cliente_nombre: r.cliente_nombre,
          cliente_email: r.cliente_email,
          fecha_reserva: r.fecha,
          visible_publico: false,
        });

        // Links de estrellas
        const estrellas = [1, 2, 3, 4, 5];
        const emojis = ['😞', '😕', '😐', '😊', '🤩'];
        const colores = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

        const linksEstrellas = estrellas.map((n, i) => `
          <a href="${baseUrl}/encuesta/${encuestaId}?estrellas=${n}" target="_blank"
             style="display:inline-block;text-decoration:none;margin:0 6px;">
            <div style="background-color:${colores[i]};color:white;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;line-height:56px;text-align:center;">
              ${emojis[i]}
            </div>
            <p style="margin:6px 0 0 0;text-align:center;color:#57534e;font-size:12px;font-weight:600;">${n} ★</p>
          </a>`).join('');

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background-color:#1c1917;padding:40px 30px;text-align:center;">
    <h1 style="margin:0;color:#fde68a;font-size:28px;">${barberiaNombre}</h1>
    <p style="margin:8px 0 0 0;color:#a8a29e;font-size:14px;">¿Cómo fue tu experiencia?</p>
  </td></tr>
  <tr><td style="padding:40px 30px 20px 30px;text-align:center;">
    <div style="font-size:60px;">⭐</div>
    <h2 style="margin:20px 0 8px 0;color:#1c1917;font-size:24px;">¡Gracias por visitarnos, ${r.cliente_nombre}!</h2>
    <p style="margin:0;color:#57534e;font-size:15px;">Tu opinión nos ayuda a mejorar. ¿Cómo calificarías tu experiencia de ayer con <strong>${r.barbero?.nombre || 'nuestro equipo'}</strong>?</p>
  </td></tr>
  <tr><td style="padding:20px 30px 30px 30px;text-align:center;">
    <p style="margin:0 0 20px 0;color:#78716c;font-size:13px;">Toca la carita que mejor describe tu experiencia:</p>
    <div style="display:flex;justify-content:center;gap:8px;">
      ${linksEstrellas}
    </div>
  </td></tr>
  <tr><td style="background-color:#fafaf9;padding:24px 30px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="margin:0;color:#a8a29e;font-size:12px;">Solo toma 10 segundos 🙏</p>
  </td></tr>
</table></body></html>`;

        const { error } = await resend.emails.send({
          from: `${barberiaNombre} <no-reply@reservaia.cl>`,
          to: r.cliente_email,
          subject: `⭐ ¿Cómo estuvo tu visita en ${barberiaNombre}?`,
          html: emailHtml,
        });

        if (error) {
          resultadosEncuestas.push({ id: r.id, ok: false, error: error.message });
        } else {
          resultadosEncuestas.push({ id: r.id, ok: true });
        }
      } catch (err) {
        resultadosEncuestas.push({ id: r.id, ok: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      recordatorios: { total: resultadosRecordatorios.length, exitosos: resultadosRecordatorios.filter(r => r.ok).length },
      encuestas: { total: resultadosEncuestas.length, exitosos: resultadosEncuestas.filter(r => r.ok).length },
    });

  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({ error: error.message });
  }
}
