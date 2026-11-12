import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * ¿Hay algún partido ya terminado sin estadísticas? Lo consulta la extensión cada 10 minutos:
 * si dice que sí, carga los datos de la FCBQ en ese momento (así los puntos del Fantasy salen al acabar el partido).
 * Solo cuentan los equipos que tienen estadísticas en la FCBQ, y durante 30 horas después del partido.
 */
export async function GET() {
  const cabeceras = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  const db = adminClient();
  if (!db) return NextResponse.json({ pendiente: false }, { headers: cabeceras });
  const ahora = Date.now();
  const desde = new Date(ahora - 30 * 3600e3).toISOString();
  const hasta = new Date(ahora - 105 * 60e3).toISOString(); // empezó hace más de 1 h 45: ya ha terminado
  const { data: conStats } = await db.from("fcbq_stats").select("equipo_id").gte("fecha", new Date(ahora - 120 * 864e5).toISOString()).limit(1000);
  const equipos = [...new Set((conStats ?? []).map((x) => x.equipo_id as string))];
  if (!equipos.length) return NextResponse.json({ pendiente: false }, { headers: cabeceras });
  const { data: ps } = await db.from("partidos").select("id, equipo_id, fcbq_stats_id").in("equipo_id", equipos).gte("fecha", desde).lte("fecha", hasta);
  const lista = (ps ?? []) as { id: string; equipo_id: string; fcbq_stats_id: string | null }[];
  if (!lista.length) return NextResponse.json({ pendiente: false }, { headers: cabeceras });
  const ids = lista.map((p) => p.fcbq_stats_id).filter(Boolean) as string[];
  const { data: ya } = ids.length ? await db.from("fcbq_stats").select("equipo_id, stats_id").in("stats_id", ids) : { data: [] };
  const tienen = new Set((ya ?? []).map((x) => `${x.equipo_id}|${x.stats_id}`));
  const faltan = lista.filter((p) => !p.fcbq_stats_id || !tienen.has(`${p.equipo_id}|${p.fcbq_stats_id}`)).length;
  return NextResponse.json({ pendiente: faltan > 0, partidos: faltan }, { headers: cabeceras });
}
