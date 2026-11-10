"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

/** Añade un ejercicio o sistema al playbook de un equipo (staff del equipo o coordinador) */
export async function anadirAlPlaybook(equipoId: string, ejercicioId: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireUser();
  const { data: ult } = await supabase.from("equipo_playbook").select("orden").eq("equipo_id", equipoId).order("orden", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("equipo_playbook").upsert({ equipo_id: equipoId, ejercicio_id: ejercicioId, orden: (ult?.orden ?? -1) + 1 }, { onConflict: "equipo_id,ejercicio_id", ignoreDuplicates: true });
  revalidatePath("/playbook");
  return error ? { error: /row-level/.test(error.message) ? "Solo el cuerpo técnico del equipo puede cambiar su playbook." : error.message } : { ok: true };
}

export async function quitarDelPlaybook(equipoId: string, ejercicioId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("equipo_playbook").delete().eq("equipo_id", equipoId).eq("ejercicio_id", ejercicioId);
  revalidatePath("/playbook");
  return error ? { error: error.message } : {};
}

export async function ordenarPlaybook(equipoId: string, ids: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(ids.map((id, i) => supabase.from("equipo_playbook").update({ orden: i }).eq("equipo_id", equipoId).eq("ejercicio_id", id)));
  revalidatePath("/playbook");
  return {};
}

export async function notaPlaybook(equipoId: string, ejercicioId: string, notas: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("equipo_playbook").update({ notas: notas.trim().slice(0, 500) || null }).eq("equipo_id", equipoId).eq("ejercicio_id", ejercicioId);
  return error ? { error: error.message } : {};
}

/** Crea (o quita) el enlace público de solo lectura del playbook para los jugadores */
export async function enlacePlaybook(equipoId: string, activar: boolean): Promise<{ url?: string | null; error?: string }> {
  const { adminClient } = await import("@/lib/supabase/admin");
  const { supabase, user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") {
    const { data: st } = await supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", equipoId).eq("perfil_id", user.id).maybeSingle();
    if (!st) return { error: "Solo el cuerpo técnico del equipo." };
  }
  const db = adminClient();
  if (!db) return { error: "Falta la configuración del servidor." };
  const token = activar ? crypto.randomUUID().replace(/-/g, "").slice(0, 20) : null;
  const { error } = await db.from("equipos").update({ playbook_token: token }).eq("id", equipoId);
  if (error) return { error: error.message };
  revalidatePath("/playbook");
  return { url: token ? `https://coach.cbturo.com/jugadas/${token}` : null };
}
