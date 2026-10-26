import "server-only";
import { createClient as crear } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/** Cliente con permisos de administrador (crear usuarios). Solo en el servidor y solo para el coordinador. */
export function adminClient() {
  const clave = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim();
  if (!clave) return null;
  return crear(SUPABASE_URL, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
