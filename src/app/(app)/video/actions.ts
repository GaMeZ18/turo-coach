"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { youtubeId, type Clip, type EventoVideo } from "@/lib/video";

async function tituloYRival(supabase: Awaited<ReturnType<typeof createClient>>, fd: FormData) {
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
  return { partido, titulo, rival };
}

/** Vídeo que está en el ordenador (no se sube): solo se guarda su nombre y tamaño */
export async function crearVideoLocal(fd: FormData): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const archivo = String(fd.get("archivo") ?? "").trim();
  if (!archivo) return { error: "Elige el archivo del vídeo." };
  const { partido, titulo, rival } = await tituloYRival(supabase, fd);
  const { data, error } = await supabase.from("videos").insert({
    equipo_id: String(fd.get("equipo_id")), partido_id: partido, url: null, youtube_id: null,
    titulo: titulo || archivo.replace(/\.[^.]+$/, ""), rival, archivo, archivo_bytes: Number(fd.get("bytes")) || null,
  }).select("id").single();
  if (error) return { error: /archivo|url/.test(error.message) ? "Falta preparar la base de datos (0021_video_local.sql)." : error.message };
  revalidatePath("/video");
  return { id: data.id };
}

export async function crearVideo(fd: FormData) {
  const supabase = await createClient();
  const url = String(fd.get("url") ?? "").trim();
  const yt = youtubeId(url);
  if (!yt) throw new Error("Pega un enlace de YouTube (youtube.com/watch?v=… o youtu.be/…).");
  const { partido, titulo, rival } = await tituloYRival(supabase, fd);
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

export async function actualizarClip(id: string, campos: Partial<Pick<Clip, "categoria_id" | "inicio" | "fin" | "jugador_id" | "resultado" | "periodo" | "nota" | "estado">>) {
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

// ---------- Detecciones automáticas (detector de tiros del PC) ----------
type Deteccion = { t: number; canasta?: string; resultado?: string; confianza?: number };

export async function importarDetecciones(fd: FormData): Promise<{ nuevos: number; repetidos: number; error?: string }> {
  const supabase = await createClient();
  const videoId = String(fd.get("video_id"));
  const archivo = fd.get("archivo");
  const desfase = Number(fd.get("desfase") || 0) || 0;
  if (!(archivo instanceof File)) return { nuevos: 0, repetidos: 0, error: "Elige el archivo .detecciones.json" };
  let datos: { herramienta?: string; eventos?: Deteccion[] };
  try { datos = JSON.parse(await archivo.text()); } catch { return { nuevos: 0, repetidos: 0, error: "El archivo no es un JSON válido." }; }
  const eventos = (datos.eventos ?? []).filter((e) => typeof e.t === "number");
  if (!eventos.length) return { nuevos: 0, repetidos: 0, error: "El archivo no tiene detecciones." };

  const [{ data: cats }, { data: ya }, { data: v }] = await Promise.all([
    supabase.from("video_categorias").select("id, equipo_id, estadistica, antes, despues").eq("estadistica", "t2"),
    supabase.from("video_clips").select("inicio, fin").eq("video_id", videoId),
    supabase.from("videos").select("equipo_id").eq("id", videoId).maybeSingle(),
  ]);
  const cat = (cats ?? []).find((c) => c.equipo_id === v?.equipo_id) ?? (cats ?? []).find((c) => !c.equipo_id) ?? null;
  const antes = cat?.antes ?? 6, despues = cat?.despues ?? 3;
  const existentes = (ya ?? []).map((c) => Number(c.fin) - despues);
  let repetidos = 0;
  const filas = [];
  for (const e of eventos) {
    const t = e.t + desfase;
    if (t < 0) continue;
    if (existentes.some((x) => Math.abs(x - t) < 1.5)) { repetidos++; continue; }
    filas.push({
      video_id: videoId, categoria_id: cat?.id ?? null, inicio: Math.max(0, Math.round((t - antes) * 10) / 10), fin: Math.round((t + despues) * 10) / 10,
      resultado: e.resultado === "anotada" ? "bien" : e.resultado === "fallada" ? "mal" : null,
      estado: "pendiente", confianza: typeof e.confianza === "number" ? e.confianza : null, origen: "detector",
      nota: e.canasta ? `Detectado · canasta ${e.canasta}` : "Detectado",
    });
  }
  for (let i = 0; i < filas.length; i += 200) {
    const { error } = await supabase.from("video_clips").insert(filas.slice(i, i + 200));
    if (error) return { nuevos: i, repetidos, error: /estado|confianza|origen/.test(error.message) ? "Falta preparar la base de datos (0020_video_detecciones.sql)." : error.message };
  }
  revalidatePath(`/video/${videoId}`);
  return { nuevos: filas.length, repetidos };
}

/** Confirmar un clip detectado (deja de estar pendiente) */
export async function confirmarClip(id: string, campos: Partial<Pick<Clip, "categoria_id" | "jugador_id" | "resultado">>) {
  const supabase = await createClient();
  check(await supabase.from("video_clips").update({ ...campos, estado: null }).eq("id", id));
}
