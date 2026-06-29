// Columnas PÚBLICAS de la tabla `barberia` que puede leer un visitante anónimo.
// Excluye datos internos/sensibles: email_admin, notas, monto_mensual,
// fecha_ultimo_pago, proximo_pago (cubiertos por column-GRANT en la BD).
// Usar esta constante en todos los selects de contexto público (App, Reserva, Inicio)
// para que coincidan exactamente con los permisos concedidos a `anon`.
export const COLS_PUBLICAS_BARBERIA =
  "id, nombre, plan, barberos_permitidos, estado, fecha_creacion, configuracion, tipo_negocio, logo_url, tipo_barberia, subdominio";
