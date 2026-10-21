"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_EQUIPO } from "@/lib/equipo-activo";
import { check } from "@/lib/db";

export async function crearEquipo(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("equipos").insert({
    temporada_id: String(formData.get("temporada_id")),
    nombre: String(formData.get("nombre")).trim(),
    categoria: String(formData.get("categoria") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/equipos");
  revalidatePath("/", "layout");
}

export async function actualizarEquipo(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipos")
    .update({
      nombre: String(formData.get("nombre")).trim(),
      categoria: String(formData.get("categoria") ?? "").trim() || null,
    })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function borrarEquipo(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("equipos").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/", "layout");
}

export async function alternarCongelado(formData: FormData) {
  const supabase = await createClient();
  check(await supabase
    .from("equipos")
    .update({ congelado: formData.get("congelado") !== "true" })
    .eq("id", String(formData.get("id"))));
  revalidatePath("/equipos");
}

export async function asignarStaff(formData: FormData) {
  const supabase = await createClient();
  const perfil = String(formData.get("perfil_id") ?? "");
  if (!perfil) return;
  check(await supabase.from("equipo_staff").upsert({
    equipo_id: String(formData.get("equipo_id")),
    perfil_id: perfil,
    funcion: String(formData.get("funcion") ?? "entrenador"),
  }));
  revalidatePath("/equipos");
}

export async function quitarStaff(formData: FormData) {
  const supabase = await createClient();
  check(await supabase
    .from("equipo_staff")
    .delete()
    .eq("equipo_id", String(formData.get("equipo_id")))
    .eq("perfil_id", String(formData.get("perfil_id"))));
  revalidatePath("/equipos");
}

export async function trabajarCon(formData: FormData) {
  (await cookies()).set(COOKIE_EQUIPO, String(formData.get("id")), {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
  });
  redirect("/jugadores");
}
