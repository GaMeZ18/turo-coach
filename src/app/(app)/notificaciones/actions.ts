"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarLeidas() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("notificaciones").update({ leida: true }).eq("perfil_id", user.id).eq("leida", false);
  revalidatePath("/", "layout");
}

export async function guardarSuscripcion(s: { endpoint: string; p256dh: string; auth: string; dispositivo?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sin sesión" };
  const { error } = await supabase.from("push_suscripciones").upsert({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, perfil_id: user.id, dispositivo: s.dispositivo?.slice(0, 60) ?? null });
  return error ? { error: /push_suscripciones/.test(error.message) ? "Ejecuta antes 0010_notificaciones.sql en Supabase." : error.message } : { ok: true };
}

export async function quitarSuscripcion(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
}

/** Manda un aviso de prueba a mis dispositivos y dice qué ha pasado */
export async function probarAvisos() {
  const { requireUser } = await import("@/lib/supabase/server");
  const { adminClient } = await import("@/lib/supabase/admin");
  const { probarPushDe } = await import("@/lib/notificar");
  const { user } = await requireUser();
  const db = adminClient();
  if (!db) return { error: "Falta la clave de servicio en el servidor." };
  return await probarPushDe(db, user.id);
}

/** Vincular «mis mesas» (por teléfono) a mi cuenta: los avisos de mesa me llegan a la app y al móvil */
export async function vincularMesas(fd: FormData): Promise<{ ok?: string; error?: string }> {
  const { requireUser } = await import("@/lib/supabase/server");
  const { adminClient } = await import("@/lib/supabase/admin");
  const { normalizarTelefono } = await import("@/lib/mesas");
  const { user, perfil } = await requireUser();
  const db = adminClient();
  if (!db) return { error: "Falta la clave de servicio en el servidor." };
  const tel = normalizarTelefono(String(fd.get("telefono") ?? ""));
  if (fd.get("quitar") === "1") {
    await db.from("mesa_personas").update({ perfil_id: null }).eq("perfil_id", user.id);
    revalidatePath("/notificaciones");
    return { ok: "Desvinculado." };
  }
  if (tel.length < 9) return { error: "Escribe tu teléfono (el mismo con el que te apuntas a las mesas)." };
  const { data: p } = await db.from("mesa_personas").select("id").eq("telefono", tel).maybeSingle();
  if (p) await db.from("mesa_personas").update({ perfil_id: user.id }).eq("id", p.id);
  else await db.from("mesa_personas").insert({ nombre: perfil.nombre ?? "Sin nombre", telefono: tel, perfil_id: user.id });
  revalidatePath("/notificaciones");
  return { ok: "Listo: los avisos de tus mesas te llegarán aquí y al móvil." };
}
