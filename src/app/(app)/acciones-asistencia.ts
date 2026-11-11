"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { check } from "@/lib/db";

/** Enlace de asistencia del equipo (uno fijo: se manda cada semana al grupo). «nuevo» lo cambia si se ha filtrado */
export async function enlaceAsistencia(equipoId: string, nuevo = false): Promise<{ url?: string; error?: string }> {
  const { supabase, user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") {
    const { data: st } = await supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", equipoId).eq("perfil_id", user.id).maybeSingle();
    if (!st) return { error: "Solo el cuerpo técnico del equipo." };
  }
  const db = adminClient();
  if (!db) return { error: "Falta la configuración del servidor." };
  const { data: eq } = await db.from("equipos").select("asistencia_token").eq("id", equipoId).maybeSingle();
  let token = (eq?.asistencia_token as string | null) ?? null;
  if (!token || nuevo) {
    token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const { error } = await db.from("equipos").update({ asistencia_token: token }).eq("id", equipoId);
    if (error) return { error: error.message };
  }
  return { url: `https://coach.cbturo.com/a/${token}` };
}

/** Rellenar la asistencia de varios jugadores de golpe (con lo que han respondido en el enlace) */
export async function guardarVariasAsistencias(entreno: string, filas: { jugador_id: string; estado: string; motivo: string | null }[]) {
  const { supabase } = await requireUser();
  if (!filas.length) return;
  check(await supabase.from("asistencias").upsert(filas.map((f) => ({ entrenamiento_id: entreno, ...f }))));
  revalidatePath(`/entrenamientos/${entreno}`);
}

/** «No disponible hasta…» (lesión, viaje u otros; sin detalles médicos). hasta = null lo quita */
export async function marcarNoDisponible(jugadorId: string, hasta: string | null, motivo: string | null): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { error: "Fecha no válida." };
  const { error } = await supabase.from("jugadores").update({ no_disponible_hasta: hasta, no_disponible_motivo: hasta ? motivo : null }).eq("id", jugadorId);
  if (error) return { error: error.message };
  revalidatePath(`/jugadores/${jugadorId}`);
  revalidatePath("/jugadores");
  return {};
}
