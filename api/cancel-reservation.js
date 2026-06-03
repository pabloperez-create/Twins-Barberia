import { createClient } from '@supabase/supabase-js';
import { cancelToken } from './_cancel-token.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY,
);

// Horas mínimas de antelación para que el cliente pueda cancelar online
const HORAS_MINIMAS = 2;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reservaId, token } = req.body;
    if (!reservaId || !token) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    // Verificar token (evita que se cancelen reservas ajenas adivinando ids)
    if (token !== cancelToken(reservaId)) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Cargar la reserva
    const { data: reserva, error: errReserva } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .single();

    if (errReserva || !reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (reserva.estado === 'cancelada') {
      return res.status(200).json({ yaCancelada: true });
    }

    // Política: no permitir cancelar dentro de las últimas HORAS_MINIMAS.
    // Comparamos hora local de Chile (fecha/hora se guardan en hora local).
    const nowCL = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const cita = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
    const horasRestantes = (cita - nowCL) / 3600000;
    if (!isNaN(horasRestantes) && horasRestantes < HORAS_MINIMAS) {
      return res.status(200).json({ tarde: true, horasMinimas: HORAS_MINIMAS });
    }

    // Cancelar
    const { error: errUpdate } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada', motivo_cancelacion: 'Cancelada por el cliente' })
      .eq('id', reservaId);

    if (errUpdate) {
      return res.status(500).json({ error: 'No se pudo cancelar la reserva' });
    }

    // Datos para el email de cancelación
    const [{ data: barbero }, { data: servicio }, { data: barberia }] = await Promise.all([
      supabase.from('barberos').select('nombre').eq('id', reserva.barbero_id).single(),
      supabase.from('servicios_principales').select('nombre').eq('id', reserva.servicio_id).single(),
      supabase.from('barberia').select('nombre, configuracion').eq('id', reserva.barberia_id).single(),
    ]);

    // Notificar al cliente reusando el endpoint existente (best-effort)
    if (reserva.cliente_email) {
      try {
        await fetch('https://twins-barberia.vercel.app/api/send-cancellation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteEmail: reserva.cliente_email,
            clienteNombre: reserva.cliente_nombre,
            barberiaId: reserva.barberia_id,
            barberiaNombre: barberia?.nombre || 'Tu Barbería',
            barberoNombre: barbero?.nombre || 'tu profesional',
            servicioNombre: servicio?.nombre || 'tu servicio',
            fecha: reserva.fecha,
            hora: reserva.hora_inicio,
            motivo: null,
            whatsappBarberia: barberia?.configuracion?.whatsapp || '56000000000',
          }),
        });
      } catch (e) {
        console.error('No se pudo enviar email de cancelación:', e);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en cancel-reservation:', error);
    return res.status(500).json({ error: error.message });
  }
}
