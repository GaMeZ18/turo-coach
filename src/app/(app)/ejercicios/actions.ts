"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";

export type DatosEjercicio = {
  id?: string;
  tipo: "ejercicio" | "sistema";
  titulo: string;
  descripcion: string;
  correcciones: string;
  categoria: string;
  etiquetas: string[];
  jugadores_min: number | null;
  duracion: number | null;
  video_url: string;
  visibilidad: "privado" | "club";
  pizarra: unknown;
  preview: string | null;
};

const vacioANull = (s: string) => (s.trim() === "" ? null : s.trim());

export async function guardarEjercicio(d: DatosEjercicio, entrenoId?: string) {
  const supabase = await createClient();
  const fila = {
    tipo: d.tipo,
    titulo: d.titulo.trim() || "Sin título",
    descripcion: vacioANull(d.descripcion),
    correcciones: vacioANull(d.correcciones),
    categoria: vacioANull(d.categoria),
    etiquetas: d.etiquetas.map((e) => e.trim().toLowerCase()).filter(Boolean),
    jugadores_min: d.jugadores_min,
    duracion: d.duracion,
    video_url: vacioANull(d.video_url),
    visibilidad: d.visibilidad,
    pizarra: d.pizarra,
    preview: d.preview,
    updated_at: new Date().toISOString(),
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from("ejercicios").update(fila).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("ejercicios").insert(fila).select("id").single();
    if (error) return { error: error.message };
    id = data.id;
  }
  revalidatePath("/ejercicios");
  if (entrenoId && !d.id) {
    const { count } = await supabase
      .from("entreno_actividades")
      .select("id", { count: "exact", head: true })
      .eq("entrenamiento_id", entrenoId);
    check(await supabase.from("entreno_actividades").insert({
      entrenamiento_id: entrenoId,
      orden: count ?? 0,
      tipo: "ejercicio",
      ejercicio_id: id,
      titulo: fila.titulo,
      duracion: d.duracion ?? 10,
    }));
    revalidatePath(`/entrenamientos/${entrenoId}`);
    redirect(`/entrenamientos/${entrenoId}`);
  }
  redirect(`/ejercicios/${id}`);
}

export async function borrarEjercicio(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("ejercicios").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/ejercicios");
  redirect("/ejercicios");
}

export async function duplicarEjercicio(formData: FormData) {
  const supabase = await createClient();
  const { data: e } = await supabase.from("ejercicios").select("*").eq("id", String(formData.get("id"))).single();
  if (!e) return;
  const { id: _id, autor_id: _a, created_at: _c, updated_at: _u, ...resto } = e;
  const { data } = await supabase
    .from("ejercicios")
    .insert({ ...resto, titulo: `${e.titulo} (copia)`, visibilidad: "privado" })
    .select("id")
    .single();
  if (data) redirect(`/ejercicios/${data.id}/editar`);
}
