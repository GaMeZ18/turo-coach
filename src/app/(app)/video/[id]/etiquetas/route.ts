// Descarga las etiquetas de un vídeo en JSON (para medir el detector de tiros: detector.py evaluar)
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: v }, { data: clips }] = await Promise.all([
    supabase.from("videos").select("titulo").eq("id", id).maybeSingle(),
    supabase.from("video_clips").select("inicio, fin, resultado, estado, periodo, jugador_id, video_categorias(nombre, estadistica, despues)").eq("video_id", id).order("inicio"),
  ]);
  if (!v) return new Response("No encontrado", { status: 404 });
  type Fila = { inicio: number; fin: number; resultado: string | null; estado: string | null; periodo: number | null; jugador_id: string | null; video_categorias: { nombre: string; estadistica: string | null; despues: number } | null };
  const salida = {
    video: v.titulo,
    clips: ((clips ?? []) as unknown as Fila[]).filter((c) => !c.estado).map((c) => ({
      momento: Math.round((Number(c.fin) - (c.video_categorias?.despues ?? 0)) * 10) / 10,
      inicio: Number(c.inicio), fin: Number(c.fin), etiqueta: c.video_categorias?.nombre ?? null, estadistica: c.video_categorias?.estadistica ?? null,
      resultado: c.resultado, periodo: c.periodo, jugador_id: c.jugador_id,
    })),
  };
  return new Response(JSON.stringify(salida, null, 1), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="etiquetas.json"` },
  });
}
