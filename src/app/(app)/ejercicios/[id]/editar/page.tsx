import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import FormEjercicio from "../../FormEjercicio";

export default async function EditarEjercicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data: e } = await supabase.from("ejercicios").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  if (e.autor_id !== user.id && perfil.rol !== "coordinador") redirect(`/ejercicios/${id}`);

  return (
    <div>
      <Link href={`/ejercicios/${id}`} className="text-sm text-tinta/60 hover:underline">← {e.titulo}</Link>
      <h1 className="mb-5 mt-1 text-2xl font-semibold">Editar</h1>
      <FormEjercicio
        inicial={{
          id: e.id, tipo: e.tipo, titulo: e.titulo, descripcion: e.descripcion ?? "",
          correcciones: e.correcciones ?? "", categoria: e.categoria ?? "", etiquetas: e.etiquetas ?? [],
          jugadores_min: e.jugadores_min, duracion: e.duracion, video_url: e.video_url ?? "",
          visibilidad: e.visibilidad, pizarra: e.pizarra, preview: e.preview,
          en_biblioteca: e.en_biblioteca ?? false, edades: e.edades ?? [], material: e.material ?? "", objetivos: e.objetivos ?? "",
        }}
      />
    </div>
  );
}
