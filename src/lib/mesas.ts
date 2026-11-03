// Mesas de los partidos de casa: quién está apuntado, quién confirmado y cuánto se debe.
import type { SupabaseClient } from "@supabase/supabase-js";

export type PartidoMesa = { id: string; fecha: string; rival: string; lugar: string | null; equipo_id: string; equipo: string; federada: boolean };
export type Asignacion = { id: string; partido_id: string; persona_id: string; estado: "candidato" | "confirmado"; importe: number; created_at: string; mesa_personas: { nombre: string; telefono: string | null } | null };
export const POR_MESA = 2;

/** Partidos de casa de los equipos de la temporada actual entre dos fechas (ISO) */
export async function partidosDeCasa(db: SupabaseClient, desde: string, hasta: string): Promise<PartidoMesa[]> {
  const { data: t } = await db.from("temporadas").select("id").eq("actual", true).maybeSingle();
  if (!t) return [];
  const { data: eqs } = await db.from("equipos").select("id, nombre, mesa_federada").eq("temporada_id", t.id);
  const equipos = (eqs ?? []) as { id: string; nombre: string; mesa_federada: boolean }[];
  if (!equipos.length) return [];
  const { data } = await db.from("partidos").select("id, fecha, rival, lugar, equipo_id")
    .in("equipo_id", equipos.map((e) => e.id)).eq("local", true).gte("fecha", desde).lt("fecha", hasta).order("fecha");
  return ((data ?? []) as { id: string; fecha: string; rival: string; lugar: string | null; equipo_id: string }[]).map((p) => {
    const e = equipos.find((x) => x.id === p.equipo_id)!;
    return { ...p, equipo: e.nombre, federada: e.mesa_federada };
  });
}

/** Solo dígitos (y + inicial) para comparar teléfonos */
export const normalizarTelefono = (t: string) => {
  const d = t.replace(/[^\d+]/g, "");
  return d.startsWith("+34") ? d.slice(3) : d.startsWith("0034") ? d.slice(4) : d;
};
export const euros = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
