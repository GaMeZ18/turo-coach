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

export type ResultadoAlta = { ok: boolean; error?: string; n: number };

export async function crearJugador(prev: ResultadoAlta, formData: FormData): Promise<ResultadoAlta> {
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
  if (error) return { ok: false, error: `Jugador: ${error.message}`, n: prev.n };
  const { error: e2 } = await supabase.from("equipo_jugadores").insert({
    equipo_id: equipoId,
    jugador_id: data.id,
    dorsal: num(formData, "dorsal"),
    posicion: txt(formData, "posicion"),
  });
  if (e2) return { ok: false, error: `Plantilla: ${e2.message}`, n: prev.n };
  revalidatePath("/jugadores");
  return { ok: true, n: prev.n + 1 };
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

/**
 * Elimina al jugador de este equipo. Si no está en ningún otro equipo,
 * borra también su ficha (solo lo permite la base de datos al coordinador;
 * para un entrenador se queda en "quitado del equipo").
 */
export async function eliminarJugador(equipoId: string, jugadorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipo_jugadores")
    .delete()
    .eq("equipo_id", equipoId)
    .eq("jugador_id", jugadorId);
  if (error) return { error: error.message };
  const { count } = await supabase
    .from("equipo_jugadores")
    .select("jugador_id", { count: "exact", head: true })
    .eq("jugador_id", jugadorId);
  if (!count) await supabase.from("jugadores").delete().eq("id", jugadorId);
  revalidatePath("/jugadores");
  return { error: null };
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
