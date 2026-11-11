"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { aISO, fechaLarga, hora } from "@/lib/fechas";
import { notificarPerfiles } from "@/lib/notificar";

type R = { ok?: boolean; error?: string };

export async function crearReunion(fd: FormData) {
  const { supabase, user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") throw new Error("Solo coordinación puede convocar reuniones.");
  const titulo = String(fd.get("titulo") ?? "").trim().slice(0, 120);
  const dia = String(fd.get("dia") ?? ""), h = String(fd.get("hora") || "20:00");
  if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("Pon el título y el día.");
  const asistentes = [...new Set([...fd.getAll("asistentes").map(String), user.id])];
  const fecha = aISO(dia, h);
  const { data, error } = await supabase.from("reuniones").insert({
    titulo, fecha, lugar: String(fd.get("lugar") ?? "").trim() || null, orden_dia: String(fd.get("orden_dia") ?? "").trim() || null, asistentes,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const db = adminClient();
  if (db) await notificarPerfiles(db, asistentes.filter((a) => a !== user.id), `📅 Reunión: ${titulo}`, `${fechaLarga(fecha)} a las ${hora(fecha)}. Toca para ver el orden del día.`, `/reuniones/${data.id}`);
  redirect(`/reuniones/${data.id}`);
}

export async function guardarReunion(id: string, campos: { titulo?: string; orden_dia?: string | null; acta?: string | null; lugar?: string | null; dia?: string; hora?: string; asistentes?: string[] }): Promise<R> {
  const { supabase, user } = await requireUser();
  const fila: Record<string, unknown> = {};
  if (campos.titulo !== undefined) fila.titulo = campos.titulo.trim().slice(0, 120) || "Reunión";
  if (campos.orden_dia !== undefined) fila.orden_dia = campos.orden_dia?.trim() || null;
  if (campos.acta !== undefined) fila.acta = campos.acta?.trim() || null;
  if (campos.lugar !== undefined) fila.lugar = campos.lugar?.trim() || null;
  if (campos.dia && campos.hora) fila.fecha = aISO(campos.dia, campos.hora);
  let nuevos: string[] = [];
  if (campos.asistentes) {
    const { data: antes } = await supabase.from("reuniones").select("asistentes, titulo, fecha").eq("id", id).maybeSingle();
    fila.asistentes = [...new Set([...campos.asistentes, user.id])];
    nuevos = (fila.asistentes as string[]).filter((a) => !((antes?.asistentes as string[] | undefined) ?? []).includes(a) && a !== user.id);
    if (nuevos.length && antes) {
      const db = adminClient();
      if (db) await notificarPerfiles(db, nuevos, `📅 Reunión: ${antes.titulo}`, `${fechaLarga(antes.fecha as string)} a las ${hora(antes.fecha as string)}.`, `/reuniones/${id}`);
    }
  }
  const { error } = await supabase.from("reuniones").update(fila).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/reuniones/${id}`);
  revalidatePath("/reuniones");
  return { ok: true };
}

export async function borrarReunion(fd: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reuniones").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  redirect("/reuniones");
}

// ---------- Tareas ----------
export async function crearTarea(d: { reunionId: string | null; titulo: string; responsable: string | null; fechaLimite: string | null }): Promise<R> {
  const { supabase, user } = await requireUser();
  const titulo = d.titulo.trim().slice(0, 200);
  if (!titulo) return { error: "Escribe la tarea." };
  const { error } = await supabase.from("tareas").insert({
    reunion_id: d.reunionId, titulo, responsable_id: d.responsable || null,
    fecha_limite: d.fechaLimite && /^\d{4}-\d{2}-\d{2}$/.test(d.fechaLimite) ? d.fechaLimite : null,
  });
  if (error) return { error: error.message };
  if (d.responsable && d.responsable !== user.id) {
    const db = adminClient();
    if (db) await notificarPerfiles(db, [d.responsable], "📝 Tienes una tarea nueva", `${titulo}${d.fechaLimite ? ` (para el ${new Date(`${d.fechaLimite}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })})` : ""}`, d.reunionId ? `/reuniones/${d.reunionId}` : "/reuniones");
  }
  if (d.reunionId) revalidatePath(`/reuniones/${d.reunionId}`);
  revalidatePath("/reuniones");
  revalidatePath("/");
  return { ok: true };
}

export async function marcarTarea(id: string, hecha: boolean): Promise<R> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("tareas").update({ hecha, hecha_en: hecha ? new Date().toISOString() : null }).eq("id", id).select("reunion_id").maybeSingle();
  if (error) return { error: error.message };
  if (data?.reunion_id) revalidatePath(`/reuniones/${data.reunion_id}`);
  revalidatePath("/reuniones");
  revalidatePath("/");
  return { ok: true };
}

export async function borrarTarea(id: string): Promise<R> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tareas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/reuniones");
  return { ok: true };
}
