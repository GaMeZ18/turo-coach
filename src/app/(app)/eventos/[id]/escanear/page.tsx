import { notFound } from "next/navigation";
import { requireUser, veEventos } from "@/lib/supabase/server";
import Escaner from "./Escaner";

export const metadata = { title: "Escanear entrada" };

export default async function EscanearPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await requireUser();
  if (!veEventos(perfil)) notFound();
  const { data } = await supabase.from("eventos").select("id, nombre").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <Escaner eventoId={data.id} nombre={data.nombre} />;
}
