import crypto from 'crypto';

// Token de cancelación: HMAC del id de reserva con el secreto del servidor.
// El mismo secreto se usa al generar el link (en el email de confirmación)
// y al verificarlo (en /api/cancel-reservation), ambos server-side.
export function cancelToken(reservaId) {
  const secret = process.env.API_SECRET_TOKEN || 'twins-fallback-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(String(reservaId))
    .digest('hex')
    .slice(0, 20);
}
