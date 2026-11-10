"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { enviarComunicado } from "@/lib/comunicados";
import { adminClient } from "@/lib/supabase/admin";
import { aISO } from "@/lib/fechas";

async function coordinador() {
  const { supabase, user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") throw new Error("Solo coordinadores.");
  return { supabase, user };
}

/** Crear un comunicado: se manda ya o queda programado (lo envía el aviso automático cada 15 min) */
export async function crearComunicado(fd: FormData): Promise<{ ok?: string; error?: string }> {
  const { supabase, user } = await coordinador();
  const titulo = String(fd.get("titulo") ?? "").trim().slice(0, 120);
  const cuerpo = String(fd.get("cuerpo") ?? "").trim().slice(0, 10000);
  const url = String(fd.get("url") ?? "").trim() || null;
  const tipo = fd.get("tipo") === "noticia" ? "noticia" : "comunicado";
  const contenido = String(fd.get("contenido") ?? "").trim().slice(0, 100000);
  const destinatarios = [...new Set(fd.getAll("perfil").map(String).filter(Boolean))];
  const dia = String(fd.get("dia") ?? ""), hora = String(fd.get("hora") ?? "");
  if (!titulo) return { error: "Pon un título." };
  if (!destinatarios.length) return { error: "Elige al menos a una persona." };
  const programado = dia && hora ? aISO(dia, hora) : null;
  if (programado && new Date(programado).getTime() < Date.now() - 60000) return { error: "La fecha programada ya ha pasado." };
  let noticiaId: string | null = null;
  if (tipo === "noticia") {
    if (!contenido && !cuerpo) return { error: "Escribe el texto de la noticia." };
    const { data: n, error: en } = await supabase.from("noticias").insert({ autor_id: user.id, titulo, resumen: cuerpo, contenido, publicada_en: programado ?? new Date().toISOString() }).select("id").single();
    if (en || !n) return { error: en?.message ?? "No se ha podido guardar la noticia." };
    noticiaId = n.id;
  }
  const { data, error } = await supabase.from("comunicados").insert({ autor_id: user.id, titulo, cuerpo, url, destinatarios, programado_para: programado, tipo, noticia_id: noticiaId }).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se ha podido guardar." };
  if (!programado) {
    const n = await enviarComunicado(data.id);
    revalidatePath("/comunicados");
    revalidatePath("/noticias");
    return { ok: `${tipo === "noticia" ? "Noticia publicada y enviada" : "Enviado"} a ${n} persona${n === 1 ? "" : "s"}.` };
  }
  revalidatePath("/comunicados");
  return { ok: "Programado. Se enviará a la hora elegida." };
}

/** Borrar un comunicado (enviado o programado). Si ya se envió, se quita también de «Avisos» de quien lo recibió,
 *  y si era una noticia, de la sección Noticias. */
export async function borrarComunicado(fd: FormData) {
  const { supabase } = await coordinador();
  const id = String(fd.get("id"));
  const { data: c } = await supabase.from("comunicados").select("titulo, tipo, destinatarios, enviado_en, noticia_id").eq("id", id).maybeSingle();
  if (!c) return;
  if (c.enviado_en) {
    const db = adminClient();
    if (db) {
      const t = new Date(c.enviado_en).getTime();
      await db.from("notificaciones").delete()
        .in("perfil_id", c.destinatarios as string[])
        .in("titulo", [c.titulo, `📰 ${c.titulo}`])
        .gte("created_at", new Date(t - 5 * 60000).toISOString()).lte("created_at", new Date(t + 5 * 60000).toISOString());
    }
  }
  await supabase.from("comunicados").delete().eq("id", id);
  if (c.noticia_id && fd.get("conNoticia") !== "0") await supabase.from("noticias").delete().eq("id", c.noticia_id);
  revalidatePath("/comunicados");
  revalidatePath("/noticias");
}

/** Volver a enviar un comunicado (a las mismas personas, ahora): queda como uno nuevo en el historial */
export async function reenviarComunicado(fd: FormData) {
  const { supabase, user } = await coordinador();
  const { data: c } = await supabase.from("comunicados").select("titulo, cuerpo, url, destinatarios, tipo, noticia_id").eq("id", String(fd.get("id"))).maybeSingle();
  if (!c) return;
  const { data: n } = await supabase.from("comunicados").insert({ autor_id: user.id, titulo: c.titulo, cuerpo: c.cuerpo, url: c.url, destinatarios: c.destinatarios, tipo: c.tipo, noticia_id: c.noticia_id }).select("id").single();
  if (n) await enviarComunicado(n.id);
  revalidatePath("/comunicados");
}

/** Mandar ya uno programado */
export async function enviarAhora(fd: FormData) {
  await coordinador();
  await enviarComunicado(String(fd.get("id")));
  revalidatePath("/comunicados");
  revalidatePath("/noticias");
}

export async function borrarNoticia(fd: FormData) {
  const { supabase } = await coordinador();
  await supabase.from("noticias").delete().eq("id", String(fd.get("id")));
  revalidatePath("/noticias");
}
