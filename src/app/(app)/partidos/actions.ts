"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { aISO } from "@/lib/fechas";

const txt = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (fd: FormData, k: string) => {
  const v = txt(fd, k);
  return v === null || Number.isNaN(Number(v)) ? null : Number(v);
};

function datosPartido(fd: FormData) {
  return {
    fecha: aISO(String(fd.get("dia")), String(fd.get("hora") || "12:00")),
    rival: (txt(fd, "rival") ?? "Rival").slice(0, 80),
    local: fd.get("local") !== "fuera",
    lugar: txt(fd, "lugar"),
    competicion: txt(fd, "competicion"),
    jornada: num(fd, "jornada"),
  };
}

export async function crearPartido(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partidos")
    .insert({ equipo_id: String(formData.get("equipo_id")), ...datosPartido(formData) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Por defecto, convocada toda la plantilla
  const { data: plantilla } = await supabase.from("equipo_jugadores").select("jugador_id").eq("equipo_id", String(formData.get("equipo_id")));
  if (plantilla?.length) {
    check(await supabase.from("convocatorias").insert(plantilla.map((p) => ({ partido_id: data.id, jugador_id: p.jugador_id }))));
  }
  revalidatePath("/partidos");
  revalidatePath("/calendario");
  redirect(`/partidos/${data.id}`);
}

export async function editarPartido(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  check(await supabase.from("partidos").update(datosPartido(formData)).eq("id", id));
  revalidatePath(`/partidos/${id}`);
  revalidatePath("/partidos");
  revalidatePath("/calendario");
}

export async function guardarResultado(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const favor = num(formData, "puntos_favor");
  const contra = num(formData, "puntos_contra");
  const aplazado = formData.get("aplazado") === "1";
  check(await supabase.from("partidos").update({
    puntos_favor: aplazado ? null : favor,
    puntos_contra: aplazado ? null : contra,
    estado: aplazado ? "aplazado" : favor !== null && contra !== null ? "jugado" : "programado",
    notas: txt(formData, "notas"),
  }).eq("id", id));
  revalidatePath(`/partidos/${id}`);
  revalidatePath("/partidos");
  revalidatePath("/calendario");
}

export async function borrarPartido(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("partidos").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/partidos");
  revalidatePath("/calendario");
  redirect("/partidos");
}

/** Marca o desmarca un jugador en la convocatoria */
export async function alternarConvocado(partido: string, jugador: string, convocado: boolean) {
  const supabase = await createClient();
  if (convocado) {
    check(await supabase.from("convocatorias").upsert({ partido_id: partido, jugador_id: jugador }));
  } else {
    check(await supabase.from("convocatorias").delete().eq("partido_id", partido).eq("jugador_id", jugador));
  }
  revalidatePath(`/partidos/${partido}`);
}
