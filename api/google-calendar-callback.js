import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async function handler(req, res) {
  const { action, code } = req.query;

  // Paso 1: Redirigir a Google para autorización
  if (action === 'authorize') {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state: req.query.barbero_id,
      prompt: 'consent'
    });
    return res.redirect(url);
  }

  // Paso 2: Callback de Google con el código
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase
      .from('barberos')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_calendar_conectado: true
      })
      .eq('id', req.query.state);

    return res.redirect('https://twins-barberia.vercel.app/?login=true&calendar=conectado');
  } catch (err) {
    console.error('Error OAuth:', err);
    return res.status(500).json({ error: err.message });
  }
}
