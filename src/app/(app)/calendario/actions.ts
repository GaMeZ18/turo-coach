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

// ---------- Suscripción al calendario desde el móvil ----------
export async function crearEnlaceCalendario(formData: FormData) {
  const supabase = await createClient();
  const alcance = String(formData.get("alcance") ?? "mios");
  const equipo = String(formData.get("equipo_id") ?? "") || null;
  if (!["mios", "equipo", "club"].includes(alcance)) throw new Error("Calendario no válido.");
  if (alcance === "equipo" && !equipo) throw new Error("Elige el equipo.");
  check(await supabase.from("calendario_enlaces").insert({ alcance, equipo_id: alcance === "equipo" ? equipo : null }));
  revalidatePath("/calendario/movil");
}

export async function borrarEnlaceCalendario(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("calendario_enlaces").delete().eq("token", String(formData.get("token"))));
  revalidatePath("/calendario/movil");
}
