import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import Detectar from "./Detectar";

export const metadata = { title: "Detectar tiros" };

export default async function DetectarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: v } = await supabase.from("videos").select("id, titulo, youtube_id, archivo, archivo_bytes").eq("id", id).maybeSingle();
  if (!v) notFound();
  return <Detectar videoId={v.id} titulo={v.titulo} local={!v.youtube_id} archivoEsperado={v.archivo ? { nombre: v.archivo, bytes: v.archivo_bytes } : null} />;
}
