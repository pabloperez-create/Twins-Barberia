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
  if (validOrigins.some(o => origin.startsWith(o))) return true;

  // Aceptar cualquier dominio propio de la app: *.reservaia.cl (twins, nailstudio,
  // demo, www, ...) y el apex reservaia.cl. Son los orígenes reales del frontend.
  try {
    const host = new URL(origin).hostname;
    if (host === 'reservaia.cl' || host.endsWith('.reservaia.cl')) return true;
  } catch {
    // origin vacío o malformado → no autorizado
  }
  return false;
}
