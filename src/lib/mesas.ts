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

/** Datos de un partido de mesa (de la federación o añadido a mano), para los avisos */
export async function partidoMesa(db: SupabaseClient, id: string): Promise<{ fecha: string; equipo: string; rival: string; lugar: string | null } | null> {
  const { data: a } = await db.from("partidos").select("fecha, rival, lugar, equipos(nombre)").eq("id", id).maybeSingle();
  if (a) return { fecha: a.fecha, rival: a.rival, lugar: a.lugar, equipo: (a.equipos as unknown as { nombre: string } | null)?.nombre ?? "" };
  const { data: b } = await db.from("mesa_partidos").select("fecha, rival, lugar, equipo_nombre").eq("id", id).maybeSingle();
  return b ? { fecha: b.fecha, rival: b.rival, lugar: b.lugar, equipo: b.equipo_nombre } : null;
}

/** Texto corto de un partido: «sáb 14 nov 10:00 · INFANTIL A vs Rival (Pista)» */
export function textoPartido(p: { fecha: string; equipo: string; rival: string; lugar: string | null }) {
  const cuando = new Date(p.fecha).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${cuando} · ${p.equipo} vs ${p.rival}${p.lugar ? ` (${p.lugar})` : ""}`;
}

/** Semana que enseña el enlace público: la indicada, o la actual (desde el sábado, también la siguiente) */
export function rangoPublico(semana: string | undefined, hoy: string, lunesDe: (d: string) => string, sumarDias: (d: string, n: number) => string) {
  if (semana && /^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    const l = lunesDe(semana);
    return { desde: aISO(l, "00:00"), hasta: aISO(sumarDias(l, 7), "00:00"), lunes: l };
  }
  const l = lunesDe(hoy);
  const dow = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const finde = dow === 6 || dow === 0;
  return { desde: aISO(l, "00:00"), hasta: aISO(sumarDias(l, finde ? 14 : 7), "00:00"), lunes: l };
}
