import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import FormEjercicio from "../../FormEjercicio";
import { inferirFiltros } from "@/lib/ejercicio-filtros";

export default async function EditarEjercicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data: e } = await supabase.from("ejercicios").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  if (e.autor_id !== user.id && perfil.rol !== "coordinador") redirect(`/ejercicios/${id}`);
  // Un ejercicio antiguo sin los datos nuevos sale con lo que se deduce de su texto, para revisarlo y guardarlo
  const sug = inferirFiltros(e);

  return (
    <div>
      <Link href={`/ejercicios/${id}`} className="text-sm text-tinta/60 hover:underline">← {e.titulo}</Link>
      <h1 className="mb-5 mt-1 text-2xl font-semibold">Editar</h1>
      <FormEjercicio
        inicial={{
          id: e.id, tipo: e.tipo, titulo: e.titulo, descripcion: e.descripcion ?? "",
          correcciones: e.correcciones ?? "", categoria: e.categoria ?? "", etiquetas: e.etiquetas ?? [],
          jugadores_min: e.jugadores_min ?? sug.jugadores_min ?? null, jugadores_max: e.jugadores_max ?? sug.jugadores_max ?? null, duracion: e.duracion, video_url: e.video_url ?? "",
          visibilidad: e.visibilidad, pizarra: e.pizarra, preview: e.preview,
          en_biblioteca: e.en_biblioteca ?? false, edades: e.edades ?? [], material: e.material ?? "", objetivos: e.objetivos ?? "",
          enfoques: e.enfoques?.length ? e.enfoques : sug.enfoques ?? (e.categoria ? [e.categoria] : []),
          posiciones: e.posiciones?.length ? e.posiciones : sug.posiciones ?? [],
          modalidad: e.modalidad ?? sug.modalidad ?? null,
          balones: e.balones ?? sug.balones ?? null, canastas: e.canastas ?? sug.canastas ?? null,
          conos: e.conos ?? sug.conos ?? null, petos: e.petos ?? sug.petos ?? null,
        }}
      />
    </div>
  );
}
