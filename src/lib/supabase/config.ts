// Acepta la URL del proyecto con o sin restos (/rest/v1/, /auth/v1, barra final...)
// y se queda solo con https://xxxx.supabase.co
const bruta = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
let url = bruta;
try {
  url = new URL(bruta).origin;
} catch {
  // se deja tal cual: Supabase dará un error claro
}

export const SUPABASE_URL = url;
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
