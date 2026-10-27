"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { youtubeId, type Clip, type EventoVideo } from "@/lib/video";

export async function crearVideo(fd: FormData) {
  const supabase = await createClient();
  const url = String(fd.get("url") ?? "").trim();
  const yt = youtubeId(url);
  if (!yt) throw new Error("Pega un enlace de YouTube (youtube.com/watch?v=… o youtu.be/…).");
  const partido = String(fd.get("partido_id") ?? "") || null;
  let titulo = String(fd.get("titulo") ?? "").trim();
  let rival: string | null = null;
  if (partido) {
    const { data: p } = await supabase.from("partidos").select("rival, fecha, local").eq("id", partido).maybeSingle();
    if (p) {
      rival = p.rival;
      if (!titulo) titulo = `${p.local ? "vs" : "@"} ${p.rival} · ${new Date(p.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}`;
    }
  }
  const { data, error } = await supabase.from("videos").insert({
    equipo_id: String(fd.get("equipo_id")), partido_id: partido, url, youtube_id: yt, titulo: titulo || "Vídeo", rival,
  }).select("id").single();
  if (error) throw new Error(/videos/.test(error.message) ? "Falta preparar la base de datos (0016_video.sql)." : error.message);
  revalidatePath("/video");
  redirect(`/video/${data.id}`);
}

export async function borrarVideo(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("videos").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/video");
  redirect("/video");
}

export async function renombrarVideo(id: string, titulo: string) {
  const supabase = await createClient();
  check(await supabase.from("videos").update({ titulo: titulo.trim() || "Vídeo" }).eq("id", id));
  revalidatePath(`/video/${id}`);
}

// ---------- Clips ----------
export async function crearClip(c: { video_id: string; categoria_id: string | null; inicio: number; fin: number; periodo: number | null; jugador_id?: string | null; resultado?: "bien" | "mal" | null }): Promise<Clip> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_clips").insert({
    video_id: c.video_id, categoria_id: c.categoria_id, inicio: Math.max(0, Math.round(c.inicio * 10) / 10), fin: Math.round(c.fin * 10) / 10, periodo: c.periodo,
    jugador_id: c.jugador_id ?? null, resultado: c.resultado ?? null,
  }).select("id, video_id, categoria_id, inicio, fin, jugador_id, resultado, periodo, nota").single();
  if (error) throw new Error(error.message);
  return { ...data, inicio: Number(data.inicio), fin: Number(data.fin) } as Clip;
}

export async function actualizarClip(id: string, campos: Partial<Pick<Clip, "categoria_id" | "inicio" | "fin" | "jugador_id" | "resultado" | "periodo" | "nota">>) {
  const supabase = await createClient();
  check(await supabase.from("video_clips").update(campos).eq("id", id));
}

export async function borrarClip(id: string) {
  const supabase = await createClient();
  check(await supabase.from("video_clips").delete().eq("id", id));
}

// ---------- Botonera (categorías) ----------
export async function guardarCategoria(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "") || null;
  const fila = {
    nombre: String(fd.get("nombre") ?? "").trim().slice(0, 40),
    color: String(fd.get("color") ?? "#002b8e"),
    antes: Math.min(60, Math.max(0, Number(fd.get("antes") || 8))),
    despues: Math.min(60, Math.max(0, Number(fd.get("despues") || 4))),
    orden: Number(fd.get("orden") || 0),
    tecla: (String(fd.get("tecla") ?? "").trim().slice(0, 1).toUpperCase() || null),
    estadistica: (String(fd.get("estadistica") ?? "") || null),
  };
  if (!fila.nombre) throw new Error("Ponle nombre a la etiqueta.");
  if (id) check(await supabase.from("video_categorias").update(fila).eq("id", id));
  else check(await supabase.from("video_categorias").insert({ ...fila, equipo_id: String(fd.get("equipo_id") ?? "") || null }));
  revalidatePath("/video");
}

export async function borrarCategoria(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("video_categorias").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/video");
}

// ---------- Pista (quinteto, fin de cuarto, puntos del rival) ----------
export async function crearEventoVideo(e: { video_id: string; t: number; tipo: "quinteto" | "fin_periodo" | "rival"; periodo: number | null; jugadores?: string[] | null; puntos?: number | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_eventos").insert({
    video_id: e.video_id, t: Math.max(0, Math.round(e.t * 10) / 10), tipo: e.tipo, periodo: e.periodo, jugadores: e.jugadores ?? null, puntos: e.puntos ?? null,
  }).select("id, video_id, t, tipo, periodo, jugadores, puntos").single();
  if (error) throw new Error(/video_eventos/.test(error.message) ? "Falta preparar la base de datos (0019_video_pista.sql)." : error.message);
  return { ...data, t: Number(data.t) } as EventoVideo;
}

export async function borrarEventoVideo(id: string) {
  const supabase = await createClient();
  check(await supabase.from("video_eventos").delete().eq("id", id));
}

export async function guardarMinutosPeriodo(videoId: string, minutos: number) {
  const supabase = await createClient();
  check(await supabase.from("videos").update({ minutos_periodo: Math.min(20, Math.max(4, Math.round(minutos))) }).eq("id", videoId));
}
