import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { notificarPerfiles } from "@/lib/notificar";

/** Envía un comunicado (una sola vez) */
export async function enviarComunicado(id: string): Promise<number> {
  const db = adminClient();
  if (!db) return 0;
  // Se marca primero para no mandarlo dos veces
  const ahora = new Date().toISOString();
  const { data: c } = await db.from("comunicados").update({ enviado_en: ahora }).eq("id", id).is("enviado_en", null).select("titulo, cuerpo, url, destinatarios, tipo, noticia_id").maybeSingle();
  if (!c) return 0;
  // Noticia programada: se publica ahora en la pantalla de Noticias
  if (c.noticia_id) await db.from("noticias").update({ publicada_en: ahora }).eq("id", c.noticia_id);
  const url = c.noticia_id ? `/noticias/${c.noticia_id}` : c.url || "/notificaciones";
  // Se ven una vez: al leerlos desaparecen de Avisos (la noticia se queda en Noticias)
  await notificarPerfiles(db, c.destinatarios as string[], c.tipo === "noticia" ? `📰 ${c.titulo}` : c.titulo, c.cuerpo, url, null, true);
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
