"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aISO } from "@/lib/fechas";
import { check } from "@/lib/db";

const ruta = (id: string) => `/entrenamientos/${id}`;

export async function crearEntreno(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entrenamientos")
    .insert({
      equipo_id: String(formData.get("equipo_id")),
      fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "18:00")),
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      duracion_prevista: Number(formData.get("duracion_prevista") || 90),
      lugar: String(formData.get("lugar") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(ruta(data.id));
}

export async function editarEntreno(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("entrenamientos")
    .update({
      fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "18:00")),
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      duracion_prevista: Number(formData.get("duracion_prevista") || 90),
      lugar: String(formData.get("lugar") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ruta(id));
  revalidatePath("/entrenamientos");
}

export async function borrarEntreno(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("entrenamientos").delete().eq("id", String(formData.get("id"))));
  redirect("/entrenamientos");
}

export async function duplicarEntreno(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("entrenamientos").select("*").eq("id", id).single();
  if (!e) return;
  const semana = new Date(new Date(e.fecha).getTime() + 7 * 24 * 3600 * 1000).toISOString();
  const { data: nuevo } = await supabase
    .from("entrenamientos")
    .insert({
      equipo_id: e.equipo_id, fecha: semana, titulo: e.titulo,
      duracion_prevista: e.duracion_prevista, lugar: e.lugar, notas: e.notas,
    })
    .select("id")
    .single();
  if (!nuevo) return;
  const { data: acts } = await supabase.from("entreno_actividades").select("*").eq("entrenamiento_id", id);
  if (acts?.length) {
    check(await supabase.from("entreno_actividades").insert(
      acts.map(({ id: _id, entrenamiento_id: _e, ...resto }) => ({ ...resto, entrenamiento_id: nuevo.id }))
    ));
  }
  redirect(ruta(nuevo.id));
}

export async function guardarNotasEntreno(id: string, campos: { titulo?: string; notas?: string; duracion_prevista?: number }) {
  const supabase = await createClient();
  check(await supabase.from("entrenamientos").update(campos).eq("id", id));
  revalidatePath(ruta(id));
}

// ---------- Actividades ----------
export async function anadirActividad(formData: FormData) {
  const supabase = await createClient();
  const entreno = String(formData.get("entrenamiento_id"));
  const ejercicioId = String(formData.get("ejercicio_id") ?? "") || null;
  let titulo = String(formData.get("titulo") ?? "").trim() || null;
  let duracion = Number(formData.get("duracion") || 10);

  if (ejercicioId) {
    const { data: ej } = await supabase.from("ejercicios").select("titulo, duracion").eq("id", ejercicioId).single();
    titulo = titulo ?? ej?.titulo ?? null;
    if (!formData.get("duracion") && ej?.duracion) duracion = ej.duracion;
  }
  const { count } = await supabase
    .from("entreno_actividades")
    .select("id", { count: "exact", head: true })
    .eq("entrenamiento_id", entreno);

  check(await supabase.from("entreno_actividades").insert({
    entrenamiento_id: entreno,
    orden: count ?? 0,
    tipo: ejercicioId ? "ejercicio" : String(formData.get("tipo") ?? "nota"),
    ejercicio_id: ejercicioId,
    titulo,
    duracion,
  }));
  revalidatePath(ruta(entreno));
}

export async function actualizarActividad(entreno: string, id: string, campos: { duracion?: number; notas?: string; titulo?: string }) {
  const supabase = await createClient();
  check(await supabase.from("entreno_actividades").update(campos).eq("id", id));
  revalidatePath(ruta(entreno));
}

export async function borrarActividad(entreno: string, id: string) {
  const supabase = await createClient();
  check(await supabase.from("entreno_actividades").delete().eq("id", id));
  revalidatePath(ruta(entreno));
}

/** Guarda el orden completo tras reordenar en el cliente. */
export async function reordenarActividades(entreno: string, ids: string[]) {
  const supabase = await createClient();
  await Promise.all(
    ids.map((id, orden) => supabase.from("entreno_actividades").update({ orden }).eq("id", id))
  );
  revalidatePath(ruta(entreno));
}

// ---------- Asistencia ----------
export async function guardarAsistencia(entreno: string, jugador: string, estado: string, motivo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asistencias")
    .upsert({ entrenamiento_id: entreno, jugador_id: jugador, estado, motivo });
  if (error) throw new Error(error.message);
  revalidatePath(ruta(entreno));
}

export async function todosPresentes(entreno: string, jugadores: string[]) {
  const supabase = await createClient();
  check(await supabase.from("asistencias").upsert(
    jugadores.map((j) => ({ entrenamiento_id: entreno, jugador_id: j, estado: "presente", motivo: null }))
  ));
  revalidatePath(ruta(entreno));
}
