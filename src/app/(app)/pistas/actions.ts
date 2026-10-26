"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";

export async function guardarPista(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "") || null;
  const fila = {
    nombre: String(fd.get("nombre") ?? "").trim().toUpperCase().slice(0, 60),
    capacidad: Math.min(6, Math.max(1, Number(fd.get("capacidad") || 1))),
    orden: Number(fd.get("orden") || 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
    partidos_casa: fd.get("partidos_casa") === "on",
  };
  if (!fila.nombre) throw new Error("Ponle un nombre a la pista.");
  check(id ? await supabase.from("pistas").update(fila).eq("id", id) : await supabase.from("pistas").insert(fila));
  revalidatePath("/pistas");
}

export async function borrarPista(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("pistas").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/pistas");
}
