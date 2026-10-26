import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Clave pública VAPID (la privada va en la variable de entorno VAPID_PRIVATE_KEY de Vercel)
export const VAPID_PUBLICO = "BO322IWK9IzQJ8iAVCqo0In5uud2J9cFfM5gD6zvYLqVnPj4C7fsVa-9dSfA8Y_2fDnF1CUsbhfRKeWs_3eZLvc";

/** Crea el aviso para el cuerpo técnico del equipo (y coordinadores) y lo manda a sus dispositivos */
export async function notificarEquipo(supabase: SupabaseClient, equipoId: string, titulo: string, cuerpo: string, url: string) {
  const { data: subs, error } = await supabase.rpc("notificar_equipo", { eq: equipoId, p_titulo: titulo, p_cuerpo: cuerpo, p_url: url });
  if (error) return; // sin la tabla (0010) o sin permiso: no pasa nada
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!privada || !subs?.length) return;
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@cbturo.com", VAPID_PUBLICO, privada);
    const carga = JSON.stringify({ titulo, cuerpo, url });
    await Promise.all((subs as { endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await supabase.rpc("borrar_suscripcion", { p_endpoint: s.endpoint });
      }
    }));
  } catch {}
}
