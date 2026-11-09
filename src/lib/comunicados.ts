import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { notificarPerfiles } from "@/lib/notificar";

/** Envía un comunicado (una sola vez) */
export async function enviarComunicado(id: string): Promise<number> {
  const db = adminClient();
  if (!db) return 0;
  // Se marca primero para no mandarlo dos veces
  const { data: c } = await db.from("comunicados").update({ enviado_en: new Date().toISOString() }).eq("id", id).is("enviado_en", null).select("titulo, cuerpo, url, destinatarios").maybeSingle();
  if (!c) return 0;
  await notificarPerfiles(db, c.destinatarios as string[], c.titulo, c.cuerpo, c.url || "/notificaciones");
  return (c.destinatarios as string[]).length;
}


/** Comunicados programados cuya hora ya ha llegado */
export async function enviarProgramados(): Promise<number> {
  const db = adminClient();
  if (!db) return 0;
  const { data } = await db.from("comunicados").select("id").is("enviado_en", null).not("programado_para", "is", null).lte("programado_para", new Date().toISOString());
  let n = 0;
  for (const c of (data ?? []) as { id: string }[]) n += (await enviarComunicado(c.id)) ? 1 : 0;
  return n;
}
