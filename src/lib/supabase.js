import { createClient } from "@supabase/supabase-js";

// Cliente Supabase único del frontend. La key se lee de variables de entorno
// (VITE_*) en vez de hardcodearse. Nota: las VITE_* se embeben en el bundle,
// así que la publishable key sigue siendo pública — la protección real es RLS.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_KEY en el entorno (.env.local o Vercel)."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
