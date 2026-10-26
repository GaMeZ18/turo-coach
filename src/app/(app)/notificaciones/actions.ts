"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarLeidas() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("notificaciones").update({ leida: true }).eq("perfil_id", user.id).eq("leida", false);
  revalidatePath("/", "layout");
}

export async function guardarSuscripcion(s: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sin sesión" };
  const { error } = await supabase.from("push_suscripciones").upsert({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, perfil_id: user.id });
  return error ? { error: /push_suscripciones/.test(error.message) ? "Ejecuta antes 0010_notificaciones.sql en Supabase." : error.message } : { ok: true };
}

export async function quitarSuscripcion(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
}
