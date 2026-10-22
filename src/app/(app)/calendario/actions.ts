"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { aISO } from "@/lib/fechas";

export async function crearEvento(formData: FormData) {
  const supabase = await createClient();
  const ambito = String(formData.get("ambito") ?? "equipo");
  const titulo = String(formData.get("titulo") ?? "").trim().slice(0, 80);
  if (!titulo) throw new Error("Ponle un título al evento.");
  check(await supabase.from("eventos").insert({
    equipo_id: ambito === "club" ? null : String(formData.get("equipo_id") || "") || null,
    titulo,
    tipo: String(formData.get("tipo") ?? "evento"),
    fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "10:00")),
    lugar: String(formData.get("lugar") ?? "").trim() || null,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
  }));
  revalidatePath("/calendario");
}

export async function borrarEvento(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("eventos").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/calendario");
}
