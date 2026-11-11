"use server";

import { adminClient } from "@/lib/supabase/admin";
import { esMotivo, type MotivoTipo } from "@/lib/asistencia";

type R = { ok?: boolean; error?: string };
const TOKEN = /^[a-f0-9]{20}$/;

async function equipoDe(token: string) {
  const db = adminClient();
  if (!db || !TOKEN.test(token)) return null;
  const { data } = await db.from("equipos").select("id").eq("asistencia_token", token).maybeSingle();
  return data ? { db, equipoId: data.id as string } : null;
}

/** Lo que ha respondido este jugador (sin el texto libre: eso solo lo ve el entrenador) */
export async function misRespuestas(token: string, jugadorId: string): Promise<Record<string, { va: boolean; motivo_tipo: MotivoTipo | null }>> {
  const c = await equipoDe(token);
  if (!c) return {};
  const desde = new Date(Date.now() - 2 * 864e5).toISOString();
  const { data } = await c.db.from("respuestas_asistencia")
    .select("entrenamiento_id, partido_id, va, motivo_tipo, entrenamientos(equipo_id, fecha), partidos(equipo_id, fecha)")
    .eq("jugador_id", jugadorId).gte("updated_at", new Date(Date.now() - 30 * 864e5).toISOString());
  const out: Record<string, { va: boolean; motivo_tipo: MotivoTipo | null }> = {};
  for (const r of (data ?? []) as unknown as { entrenamiento_id: string | null; partido_id: string | null; va: boolean; motivo_tipo: MotivoTipo | null; entrenamientos: { equipo_id: string; fecha: string } | null; partidos: { equipo_id: string; fecha: string } | null }[]) {
    const ev = r.entrenamientos ?? r.partidos;
    if (!ev || ev.equipo_id !== c.equipoId || ev.fecha < desde) continue;
    out[r.entrenamiento_id ? `e:${r.entrenamiento_id}` : `p:${r.partido_id}`] = { va: r.va, motivo_tipo: r.motivo_tipo };
  }
  return out;
}

/** Voy / no voy a un entreno o partido, desde el enlace de WhatsApp del equipo */
export async function responder(token: string, jugadorId: string, clave: string, va: boolean, motivoTipo: string | null, motivo: string | null): Promise<R> {
  const c = await equipoDe(token);
  if (!c) return { error: "Enlace no válido. Pide el nuevo a tu entrenador." };
  const [tipo, id] = clave.split(":");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "") || !/^[0-9a-f-]{36}$/.test(jugadorId)) return { error: "Datos no válidos." };
  const { data: miembro } = await c.db.from("equipo_jugadores").select("jugador_id").eq("equipo_id", c.equipoId).eq("jugador_id", jugadorId).maybeSingle();
  if (!miembro) return { error: "No estás en este equipo." };
  const tabla = tipo === "e" ? "entrenamientos" : tipo === "p" ? "partidos" : null;
  if (!tabla) return { error: "Datos no válidos." };
  const { data: ev } = await c.db.from(tabla).select("equipo_id, fecha").eq("id", id).maybeSingle();
  if (!ev || ev.equipo_id !== c.equipoId) return { error: "No se encuentra." };
  if (new Date(ev.fecha as string).getTime() < Date.now()) return { error: "Ya ha empezado: díselo directamente al entrenador." };
  const fila = {
    jugador_id: jugadorId,
    entrenamiento_id: tipo === "e" ? id : null,
    partido_id: tipo === "p" ? id : null,
    va,
    motivo_tipo: va ? null : esMotivo(motivoTipo) ? motivoTipo : "otro",
    motivo: va ? null : (motivo ?? "").trim().slice(0, 200) || null,
    updated_at: new Date().toISOString(),
  };
  const col = tipo === "e" ? "entrenamiento_id" : "partido_id";
  const { data: ya } = await c.db.from("respuestas_asistencia").select("id").eq("jugador_id", jugadorId).eq(col, id).maybeSingle();
  const { error } = ya
    ? await c.db.from("respuestas_asistencia").update(fila).eq("id", ya.id)
    : await c.db.from("respuestas_asistencia").insert(fila);
  return error ? { error: error.message } : { ok: true };
}
