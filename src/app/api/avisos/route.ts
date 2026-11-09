import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { enviarAvisos } from "@/lib/avisos";

export const dynamic = "force-dynamic";

/** Recordatorios diarios (lo lanza Vercel Cron cada mañana). Cada aviso se manda una sola vez. */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "Falta la clave de servicio" }, { status: 500 });
  return NextResponse.json(await enviarAvisos(db));
}
