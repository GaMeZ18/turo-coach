// Mesas de los partidos de casa: quién está apuntado, quién confirmado y cuánto se debe.
import type { SupabaseClient } from "@supabase/supabase-js";
import { aISO } from "./fechas";

// manual = partido añadido a mano por el gestor (no es de la federación): 1 persona y sin importe (la pagan los jugadores)
export type PartidoMesa = { id: string; fecha: string; rival: string; lugar: string | null; equipo_id: string | null; equipo: string; federada: boolean; manual: boolean; plazas: number };
export type Asignacion = { id: string; partido_id: string; persona_id: string; estado: "candidato" | "confirmado"; importe: number; created_at: string; mesa_personas: { nombre: string; telefono: string | null } | null };
export const POR_MESA = 2;

/** Partidos de casa de los equipos de la temporada actual entre dos fechas (ISO) */
export async function partidosDeCasa(db: SupabaseClient, desde: string, hasta: string): Promise<PartidoMesa[]> {
  const [federacion, { data: man }] = await Promise.all([
    partidosFederacion(db, desde, hasta),
    db.from("mesa_partidos").select("id, fecha, rival, lugar, equipo_id, equipo_nombre").gte("fecha", desde).lt("fecha", hasta),
  ]);
  const manuales: PartidoMesa[] = ((man ?? []) as { id: string; fecha: string; rival: string; lugar: string | null; equipo_id: string | null; equipo_nombre: string }[])
    .map((p) => ({ id: p.id, fecha: p.fecha, rival: p.rival, lugar: p.lugar, equipo_id: p.equipo_id, equipo: p.equipo_nombre, federada: false, manual: true, plazas: PLAZAS_MANUAL }));
  return [...federacion, ...manuales].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export const PLAZAS_MANUAL = 1;

/** Fecha de un partido de mesa (de la federación o añadido a mano) */
export async function fechaPartidoMesa(db: SupabaseClient, id: string): Promise<{ fecha: string; manual: boolean } | null> {
  const { data: a } = await db.from("partidos").select("fecha").eq("id", id).maybeSingle();
  if (a) return { fecha: a.fecha, manual: false };
  const { data: b } = await db.from("mesa_partidos").select("fecha").eq("id", id).maybeSingle();
  return b ? { fecha: b.fecha, manual: true } : null;
}

async function partidosFederacion(db: SupabaseClient, desde: string, hasta: string): Promise<PartidoMesa[]> {
  const { data: t } = await db.from("temporadas").select("id").eq("actual", true).maybeSingle();
  if (!t) return [];
  const { data: eqs } = await db.from("equipos").select("id, nombre, mesa_federada").eq("temporada_id", t.id);
  const equipos = (eqs ?? []) as { id: string; nombre: string; mesa_federada: boolean }[];
  if (!equipos.length) return [];
  const { data } = await db.from("partidos").select("id, fecha, rival, lugar, equipo_id")
    .in("equipo_id", equipos.map((e) => e.id)).eq("local", true).gte("fecha", desde).lt("fecha", hasta).order("fecha");
  return ((data ?? []) as { id: string; fecha: string; rival: string; lugar: string | null; equipo_id: string }[]).map((p) => {
    const e = equipos.find((x) => x.id === p.equipo_id)!;
    return { ...p, equipo: e.nombre, federada: e.mesa_federada, manual: false, plazas: POR_MESA };
  });
}

/** Solo dígitos (y + inicial) para comparar teléfonos */
export const normalizarTelefono = (t: string) => {
  const d = t.replace(/[^\d+]/g, "");
  return d.startsWith("+34") ? d.slice(3) : d.startsWith("0034") ? d.slice(4) : d;
};
export const euros = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

/**
 * Hasta cuándo se puede uno apuntar o borrar sin cuenta: el viernes a las 23:59 de la semana del partido
 * (o la hora del partido, si es antes). Después, solo el gestor puede cambiar la mesa.
 */
export function plazoMesa(fechaPartido: string): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(fechaPartido));
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 4); // viernes de esa semana
  const viernes = d.toISOString().slice(0, 10);
  const corte = aISO(viernes, "23:59");
  return corte < fechaPartido ? corte : fechaPartido;
}
export const abierta = (fechaPartido: string, ahora = new Date().toISOString()) => ahora < plazoMesa(fechaPartido);
