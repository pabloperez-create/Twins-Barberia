// Fecha de "hoy" en zona horaria de Chile, formato YYYY-MM-DD.
// Evita el bug de usar new Date().toISOString() (que es UTC): en la tarde
// chilena (UTC-3/-4) el UTC ya marca el día siguiente, rompiendo los filtros
// "hoy"/"próximas" y los min de los date inputs.
export function hoyChile() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

// Hora actual de Chile en formato "HH:MM" (24h), para comparar contra hora_inicio.
export function ahoraChileHM() {
  return new Date()
    .toLocaleTimeString("en-GB", { timeZone: "America/Santiago", hour12: false })
    .slice(0, 5);
}
