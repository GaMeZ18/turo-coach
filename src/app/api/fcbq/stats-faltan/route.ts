import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { VERSION_STATS } from "@/lib/stats-fcbq";

export const dynamic = "force-dynamic";

// Lo usa el marcador del móvil (fcbq-movil.js) desde basquetcatala.cat: de una lista de partidos de la FCBQ,
// cuáles no tienen aún estadísticas guardadas (o las tienen de una versión antigua). Solo devuelve números de partido.
const cabeceras = {
  "Access-Control-Allow-Origin": "https://www.basquetcatala.cat",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cabeceras });
}

export async function POST(req: Request) {
  let ids: string[] = [];
  try {
    const j = JSON.parse(await req.text());
    ids = [...new Set((Array.isArray(j?.ids) ? j.ids : []).map(String).filter((x: string) => /^\d{1,12}$/.test(x)))].slice(0, 2000) as string[];
  } catch {}
  const db = adminClient();
  if (!db || !ids.length) return NextResponse.json({ ids }, { headers: cabeceras });
  const ya = new Set<string>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("fcbq_stats").select("stats_id, v:datos->v").in("stats_id", ids.slice(i, i + 300));
    for (const d of data ?? []) if (Number((d as { v?: unknown }).v) >= VERSION_STATS) ya.add(String(d.stats_id));
  }
  return NextResponse.json({ ids: ids.filter((id) => !ya.has(id)) }, { headers: cabeceras });
}
