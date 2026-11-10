import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Clave pública VAPID (la privada va en la variable de entorno VAPID_PRIVATE_KEY de Vercel)
export const VAPID_PUBLICO = "BO322IWK9IzQJ8iAVCqo0In5uud2J9cFfM5gD6zvYLqVnPj4C7fsVa-9dSfA8Y_2fDnF1CUsbhfRKeWs_3eZLvc";

/** Crea el aviso para el cuerpo técnico del equipo (y coordinadores) y lo manda a sus dispositivos */
export async function notificarEquipo(supabase: SupabaseClient, equipoId: string, titulo: string, cuerpo: string, url: string) {
  const { data: subs, error } = await supabase.rpc("notificar_equipo", { eq: equipoId, p_titulo: titulo, p_cuerpo: cuerpo, p_url: url });
  if (error) return; // sin la tabla (0010) o sin permiso: no pasa nada
  await enviarPush(supabase, (subs ?? []) as Sub[], { titulo, cuerpo, url });
}

type Sub = { endpoint: string; p256dh: string; auth: string };

/** Manda la notificación a esos dispositivos (y borra los que ya no existen) */
async function enviarPush(supabase: SupabaseClient, subs: Sub[], aviso: { titulo: string; cuerpo: string; url: string }) {
  const { titulo, cuerpo, url } = aviso;
  const privada = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!privada || !subs?.length) return;
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails((process.env.VAPID_SUBJECT || "mailto:info@cbturo.com").trim(), VAPID_PUBLICO, privada);
    const carga = JSON.stringify({ titulo: titulo.slice(0, 120), cuerpo: cuerpo.length > 400 ? `${cuerpo.slice(0, 397)}…` : cuerpo, url }); // el móvil admite poco texto; entero queda en Avisos
    await Promise.all((subs as { endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: "high" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        console.error("push:", code, (e as { body?: string }).body ?? String(e));
        if (code === 404 || code === 410) await supabase.rpc("borrar_suscripcion", { p_endpoint: s.endpoint });
      }
    }));
  } catch (e) { console.error("push:", e); }
}

/** Aviso a unas personas concretas (con el cliente de servidor): queda en «Avisos» y llega al móvil */
export async function notificarPerfiles(db: SupabaseClient, perfiles: string[], titulo: string, cuerpo: string, url: string, equipoId: string | null = null, efimera = false) {
  const ids = [...new Set(perfiles)].filter(Boolean);
  if (!ids.length) return;
  await db.from("notificaciones").insert(ids.map((id) => ({ perfil_id: id, equipo_id: equipoId, titulo, cuerpo, url, ...(efimera ? { efimera: true } : {}) })));
  const { data: subs } = await db.from("push_suscripciones").select("endpoint, p256dh, auth").in("perfil_id", ids);
  await enviarPush(db, (subs ?? []) as Sub[], { titulo, cuerpo, url });
}

/** Aviso a la gente que hace mesa (sin cuenta): solo llega a los móviles donde lo activaron desde el enlace */
export async function notificarPersonasMesa(db: SupabaseClient, personas: string[], titulo: string, cuerpo: string, url: string) {
  const ids = [...new Set(personas)].filter(Boolean);
  if (!ids.length) return;
  // Si esa persona también usa la app (ha vinculado su teléfono), le llega a su cuenta: Avisos y su móvil
  const { data: vinc } = await db.from("mesa_personas").select("perfil_id").in("id", ids).not("perfil_id", "is", null);
  const perfiles = ((vinc ?? []) as { perfil_id: string }[]).map((v) => v.perfil_id);
  if (perfiles.length) await notificarPerfiles(db, perfiles, titulo, cuerpo, url, null, true);
  const { data: subs } = await db.from("mesa_push").select("endpoint, p256dh, auth").in("persona_id", ids);
  const privada = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!privada || !subs?.length) return;
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails((process.env.VAPID_SUBJECT || "mailto:info@cbturo.com").trim(), VAPID_PUBLICO, privada);
    const carga = JSON.stringify({ titulo: titulo.slice(0, 120), cuerpo: cuerpo.length > 400 ? `${cuerpo.slice(0, 397)}…` : cuerpo, url }); // el móvil admite poco texto; entero queda en Avisos
    await Promise.all((subs as Sub[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: "high" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("mesa_push").delete().eq("endpoint", s.endpoint);
      }
    }));
  } catch {}
}

/** Prueba: manda un aviso a los dispositivos de una persona y devuelve qué responde cada servicio (sin datos secretos) */
export async function probarPushDe(db: SupabaseClient, perfilId: string) {
  const privada = process.env.VAPID_PRIVATE_KEY?.trim();
  const sujeto = (process.env.VAPID_SUBJECT || "mailto:info@cbturo.com").trim();
  const diag = { clavePrivada: !!privada, sujetoValido: /^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/.test(sujeto), dispositivos: [] as { servicio: string; ok: boolean; estado?: number; detalle?: string }[] };
  const { data: subs } = await db.from("push_suscripciones").select("endpoint, p256dh, auth").eq("perfil_id", perfilId);
  if (!privada) return diag;
  const webpush = (await import("web-push")).default;
  try { webpush.setVapidDetails(sujeto, VAPID_PUBLICO, privada); } catch (e) { return { ...diag, error: `Claves VAPID no válidas: ${e instanceof Error ? e.message : e}` }; }
  for (const s of (subs ?? []) as Sub[]) {
    const servicio = new URL(s.endpoint).host;
    try {
      const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ titulo: "Prueba de avisos ✅", cuerpo: "Si ves esto con la app cerrada, los avisos funcionan.", url: "/notificaciones" }), { TTL: 3600, urgency: "high" });
      diag.dispositivos.push({ servicio, ok: true, estado: r.statusCode });
    } catch (e) {
      const x = e as { statusCode?: number; body?: string };
      diag.dispositivos.push({ servicio, ok: false, estado: x.statusCode, detalle: (x.body || String(e)).slice(0, 200) });
    }
  }
  return diag;
}
