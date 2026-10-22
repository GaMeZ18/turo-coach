"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aISO, diaInput } from "@/lib/fechas";
import type { PartidoFCBQ } from "@/lib/fcbq";

export type Asignacion = { nombre: string; equipoId: string; fcbqEquipoId: string | null };
export type ResultadoImportacion = { nuevos: number; actualizados: number; iguales: number; errores: string[] };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export async function importarFCBQ(partidos: PartidoFCBQ[], asignaciones: Asignacion[]): Promise<ResultadoImportacion> {
  const supabase = await createClient();
  const res: ResultadoImportacion = { nuevos: 0, actualizados: 0, iguales: 0, errores: [] };
  const equipoDe = new Map(asignaciones.map((a) => [a.nombre, a.equipoId]));

  // 1) Recordar cómo se llama cada equipo en la FCBQ (para la próxima vez)
  for (const a of asignaciones) {
    const { error } = await supabase.from("equipos").update({ fcbq_nombre: a.nombre, ...(a.fcbqEquipoId ? { fcbq_equipo_id: a.fcbqEquipoId } : {}) }).eq("id", a.equipoId);
    if (error) res.errores.push(`${a.nombre}: ${error.message}`);
  }

  // 2) Partidos que ya existen en esos equipos
  const ids = [...new Set(asignaciones.map((a) => a.equipoId))];
  const { data: existentes, error: e1 } = await supabase
    .from("partidos")
    .select("id, equipo_id, fecha, rival, local, lugar, competicion, fcbq_id")
    .in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (e1) return { ...res, errores: [...res.errores, e1.message] };
  const lista = existentes ?? [];

  for (const p of partidos) {
    const equipoId = equipoDe.get(p.nuestro);
    if (!equipoId) continue;
    const fecha = aISO(p.dia, p.hora);
    const datos = { fecha, rival: p.rival, local: p.local, lugar: p.lugar || null, competicion: p.categoria || null };
    const ya =
      (p.fcbqId && lista.find((x) => x.fcbq_id === p.fcbqId)) ||
      lista.find((x) => x.equipo_id === equipoId && diaInput(x.fecha) === p.dia && norm(x.rival) === norm(p.rival));

    if (ya) {
      const igual = new Date(ya.fecha).getTime() === new Date(fecha).getTime() && ya.local === p.local &&
        (ya.lugar ?? "") === (p.lugar ?? "") && (ya.competicion ?? "") === (p.categoria ?? "") && (!p.fcbqId || ya.fcbq_id === p.fcbqId);
      if (igual) { res.iguales++; continue; }
      const { error } = await supabase.from("partidos").update({ ...datos, ...(p.fcbqId ? { fcbq_id: p.fcbqId } : {}) }).eq("id", ya.id);
      if (error) res.errores.push(`${p.dia} ${p.nuestro} – ${p.rival}: ${error.message}`); else res.actualizados++;
      continue;
    }

    const { data: nuevo, error } = await supabase
      .from("partidos")
      .insert({ equipo_id: equipoId, ...datos, fcbq_id: p.fcbqId })
      .select("id")
      .single();
    if (error || !nuevo) { res.errores.push(`${p.dia} ${p.nuestro} – ${p.rival}: ${error?.message ?? "error"}`); continue; }
    res.nuevos++;
    // Convocatoria por defecto: toda la plantilla
    const { data: plantilla } = await supabase.from("equipo_jugadores").select("jugador_id").eq("equipo_id", equipoId);
    if (plantilla?.length) await supabase.from("convocatorias").insert(plantilla.map((j) => ({ partido_id: nuevo.id, jugador_id: j.jugador_id })));
  }

  revalidatePath("/partidos");
  revalidatePath("/calendario");
  return res;
}
