import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import Detectar from "./Detectar";

export const metadata = { title: "Detectar tiros" };

export default async function DetectarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: v } = await supabase.from("videos").select("id, titulo, youtube_id, archivo, archivo_bytes, canasta_1a, descanso, equipos(nombre)").eq("id", id).maybeSingle();
  if (!v) notFound();
  return <Detectar videoId={v.id} titulo={v.titulo} local={!v.youtube_id} archivoEsperado={v.archivo ? { nombre: v.archivo, bytes: v.archivo_bytes } : null}
    equipo={(v.equipos as unknown as { nombre: string } | null)?.nombre ?? "equipo"}
    canasta1a={(v.canasta_1a as "izquierda" | "derecha" | null) ?? null} descansoGuardado={v.descanso ?? null} />;
}
