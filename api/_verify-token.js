export function verifyToken(req) {
  // Permitir requests desde nuestro propio dominio
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  const validOrigins = [
    'https://twins-barberia.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  // También aceptar token directo (para crons de Vercel)
  const token = req.headers['x-api-token'];
  const validToken = process.env.API_SECRET_TOKEN;
  if (validToken && token === validToken) return true;
  
  // Aceptar si viene de nuestro dominio
  return validOrigins.some(o => origin.startsWith(o));
}
