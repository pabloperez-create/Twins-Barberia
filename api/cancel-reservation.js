import { createClient } from '@supabase/supabase-js';
import { cancelToken } from './_cancel-token.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Minutos mínimos de antelación por defecto (si el barbero no configuró nada): 2h
const MIN_CANCELACION_DEFAULT = 120;

// Convierte minutos a una etiqueta legible para el mensaje al cliente
function formatLimite(min) {
  if (min < 60) return `${min} minutos`;
  if (min < 1440) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (m === 0) return h === 1 ? '1 hora' : `${h} horas`;
    return `${h} h ${m} min`;
  }
  if (min < 10080) {
    const d = min / 1440;
    return d === 1 ? '1 día' : `${d} días`;
  }
  return '1 semana';
}

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

    // Política configurable por el barbero (minutos de antelación mínima).
    const { data: barberoPol } = await supabase
      .from('barberos')
      .select('min_cancelacion')
      .eq('id', reserva.barbero_id)
      .single();
    const minCancel = barberoPol?.min_cancelacion ?? MIN_CANCELACION_DEFAULT;

    // Comparamos hora local de Chile (fecha/hora se guardan en hora local).
    const nowCL = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const cita = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
    const minutosRestantes = (cita - nowCL) / 60000;
    if (!isNaN(minutosRestantes) && minutosRestantes < minCancel) {
      return res.status(200).json({ tarde: true, limite: formatLimite(minCancel) });
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
