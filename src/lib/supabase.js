// ---------------------------------------------------------------------------
// Cliente de Supabase.
//
// Si faltan las variables de entorno, `supabase` queda en null y toda la app
// funciona en modo local (localStorage). Así el proyecto sigue arrancando con
// `npm run dev` sin credenciales, como en la Fase 1.
//
// Las credenciales van en un archivo .env en la raíz (ver .env.example).
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hayBackend = Boolean(url && anonKey);

export const supabase = hayBackend
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

if (!hayBackend) {
  console.warn(
    "Quindío Se Ayuda: sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Los datos se guardarán solo en este navegador."
  );
}
