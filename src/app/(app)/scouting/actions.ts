"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import type { StatsPartido } from "@/lib/stats-fcbq";

/** De los partidos de cada equipo, cuáles aún no tienen estadísticas guardadas */
export async function statsPendientes(pares: { equipoId: string; ids: string[] }[]): Promise<{ pendientes: { equipoId: string; id: string }[]; error?: string }> {
  const supabase = await createClient();
  const pendientes: { equipoId: string; id: string }[] = [];
  for (const { equipoId, ids } of pares) {
    if (!ids.length) continue;
    const { data, error } = await supabase.from("fcbq_stats").select("stats_id").eq("equipo_id", equipoId).in("stats_id", ids);
    if (error) return { pendientes: [], error: /fcbq_stats/.test(error.message) ? "Para guardar estadísticas, ejecuta antes 0006_scouting.sql en Supabase." : error.message };
    const ya = new Set((data ?? []).map((d) => d.stats_id as string));
    for (const id of ids) if (!ya.has(id)) pendientes.push({ equipoId, id });
  }
  return { pendientes };
}

export async function guardarStatsFCBQ(equipoId: string, items: StatsPartido[]) {
  const supabase = await createClient();
  if (!items.length) return 0;
  check(await supabase.from("fcbq_stats").upsert(items.map((s) => ({
    equipo_id: equipoId, stats_id: s.id, fecha: s.fecha, local: s.local.nombre, visitante: s.visitante.nombre, datos: s,
  }))));
  // Enlazar con nuestros partidos (para el control de periodos)
  const { data: partidos } = await supabase.from("partidos").select("id, fecha, fcbq_stats_id").eq("equipo_id", equipoId);
  const dia = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
  for (const s of items) {
    if (!s.fecha || !/TUR[OÓ]/i.test(`${s.local.nombre} ${s.visitante.nombre}`)) continue;
    const p = (partidos ?? []).find((x) => !x.fcbq_stats_id && dia(x.fecha) === dia(s.fecha!));
    if (p) await supabase.from("partidos").update({ fcbq_stats_id: s.id }).eq("id", p.id);
  }
  revalidatePath("/scouting", "layout");
  return items.length;
}

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

/** Ficha de un equipo rival (o del nuestro): notas y características */
export async function guardarFichaRival(fd: FormData) {
  const supabase = await createClient();
  const caracteristicas: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("c_")) continue;
    const clave = k.slice(2);
    const valor = String(v).trim();
    if (!valor) continue;
    const ya = caracteristicas[clave];
    caracteristicas[clave] = ya ? [...(Array.isArray(ya) ? ya : [ya]), valor] : valor;
  }
  check(await supabase.from("scouting_rivales").upsert({
    equipo_id: String(fd.get("equipo_id")), nombre: String(fd.get("nombre")), notas: texto(fd, "notas"), caracteristicas, updated_at: new Date().toISOString(),
  }, { onConflict: "equipo_id,nombre" }));
  revalidatePath("/scouting", "layout");
}

/** Ficha de un jugador rival */
export async function guardarFichaJugador(fd: FormData) {
  const supabase = await createClient();
  const caracteristicas = {
    posicion: texto(fd, "posicion"),
    mano: texto(fd, "mano"),
    etiquetas: fd.getAll("etiquetas").map(String),
  };
  check(await supabase.from("scouting_jugadores").upsert({
    equipo_id: String(fd.get("equipo_id")), rival: String(fd.get("rival")), nombre: String(fd.get("nombre")), dorsal: texto(fd, "dorsal"),
    notas: texto(fd, "notas"), caracteristicas, updated_at: new Date().toISOString(),
  }, { onConflict: "equipo_id,rival,nombre" }));
  revalidatePath("/scouting", "layout");
}
