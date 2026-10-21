"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const txt = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (fd: FormData, k: string) => {
  const v = txt(fd, k);
  return v === null ? null : Number(v);
};

export async function crearJugador(formData: FormData) {
  const supabase = await createClient();
  const equipoId = String(formData.get("equipo_id"));
  const { data, error } = await supabase
    .from("jugadores")
    .insert({
      nombre: txt(formData, "nombre"),
      apellidos: txt(formData, "apellidos"),
      fecha_nacimiento: txt(formData, "fecha_nacimiento"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e2 } = await supabase.from("equipo_jugadores").insert({
    equipo_id: equipoId,
    jugador_id: data.id,
    dorsal: num(formData, "dorsal"),
    posicion: txt(formData, "posicion"),
  });
  if (e2) throw new Error(e2.message);
  revalidatePath("/jugadores");
}

/** Añade al equipo activo un jugador que ya existe (p. ej. de la temporada pasada). */
export async function incorporarJugador(formData: FormData) {
  const supabase = await createClient();
  const jugador = String(formData.get("jugador_id") ?? "");
  if (!jugador) return;
  await supabase.from("equipo_jugadores").upsert({
    equipo_id: String(formData.get("equipo_id")),
    jugador_id: jugador,
  });
  revalidatePath("/jugadores");
}

export async function quitarDelEquipo(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("equipo_jugadores")
    .delete()
    .eq("equipo_id", String(formData.get("equipo_id")))
    .eq("jugador_id", String(formData.get("jugador_id")));
  revalidatePath("/jugadores");
  redirect("/jugadores");
}

export async function guardarJugador(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("jugador_id"));
  const equipoId = String(formData.get("equipo_id"));
  const { error } = await supabase
    .from("jugadores")
    .update({
      nombre: txt(formData, "nombre"),
      apellidos: txt(formData, "apellidos"),
      fecha_nacimiento: txt(formData, "fecha_nacimiento"),
      contacto: txt(formData, "contacto"),
      notas: txt(formData, "notas"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (equipoId) {
    await supabase
      .from("equipo_jugadores")
      .update({ dorsal: num(formData, "dorsal"), posicion: txt(formData, "posicion") })
      .eq("equipo_id", equipoId)
      .eq("jugador_id", id);
  }
  revalidatePath("/jugadores");
  redirect("/jugadores");
}
