"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { enviarComunicado } from "@/lib/comunicados";
import { aISO } from "@/lib/fechas";

async function coordinador() {
  const { supabase, user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") throw new Error("Solo coordinadores.");
  return { supabase, user };
}

/** Crear un comunicado: se manda ya o queda programado (lo envía el aviso automático cada 15 min) */
export async function crearComunicado(fd: FormData): Promise<{ ok?: string; error?: string }> {
  const { supabase, user } = await coordinador();
  const titulo = String(fd.get("titulo") ?? "").trim().slice(0, 120);
  const cuerpo = String(fd.get("cuerpo") ?? "").trim().slice(0, 2000);
  const url = String(fd.get("url") ?? "").trim() || null;
  const destinatarios = [...new Set(fd.getAll("perfil").map(String).filter(Boolean))];
  const dia = String(fd.get("dia") ?? ""), hora = String(fd.get("hora") ?? "");
  if (!titulo) return { error: "Pon un título." };
  if (!destinatarios.length) return { error: "Elige al menos a una persona." };
  const programado = dia && hora ? aISO(dia, hora) : null;
  if (programado && new Date(programado).getTime() < Date.now() - 60000) return { error: "La fecha programada ya ha pasado." };
  const { data, error } = await supabase.from("comunicados").insert({ autor_id: user.id, titulo, cuerpo, url, destinatarios, programado_para: programado }).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se ha podido guardar." };
  if (!programado) {
    const n = await enviarComunicado(data.id);
    revalidatePath("/comunicados");
    return { ok: `Enviado a ${n} persona${n === 1 ? "" : "s"}.` };
  }
  revalidatePath("/comunicados");
  return { ok: "Programado. Se enviará a la hora elegida." };
}

export async function borrarComunicado(fd: FormData) {
  const { supabase } = await coordinador();
  await supabase.from("comunicados").delete().eq("id", String(fd.get("id"))).is("enviado_en", null);
  revalidatePath("/comunicados");
}
