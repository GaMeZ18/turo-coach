"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buscarExistente, cambiosFCBQ, datosFCBQ, unirResultados, type LigaFCBQ, type PartidoFCBQ, type ResultadoLiga } from "@/lib/fcbq";

const COLUMNAS = "id, equipo_id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado, fcbq_id";
type Existente = { id: string; equipo_id: string; fecha: string; rival: string; fcbq_id: string | null } & Record<string, unknown>;

export type Asignacion = { nombre: string; equipoId: string; fcbqEquipoId: string | null };
export type ResultadoImportacion = { nuevos: number; actualizados: number; iguales: number; liga: boolean; errores: string[] };

export async function importarFCBQ(partidos: PartidoFCBQ[], asignaciones: Asignacion[], liga: LigaFCBQ | null = null): Promise<ResultadoImportacion> {
  const supabase = await createClient();
  const res: ResultadoImportacion = { nuevos: 0, actualizados: 0, iguales: 0, liga: false, errores: [] };
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
    .select(COLUMNAS)
    .in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (e1) return { ...res, errores: [...res.errores, e1.message] };
  const lista = (existentes ?? []) as unknown as Existente[];

  for (const p of partidos) {
    const equipoId = equipoDe.get(p.nuestro);
    if (!equipoId) continue;
    const etiqueta = `${p.dia} ${p.nuestro} – ${p.rival}`;
    const ya = buscarExistente(lista, equipoId, p);

    if (ya) {
      const cambios = cambiosFCBQ(ya, p);
      if (!Object.keys(cambios).length) { res.iguales++; continue; }
      const { error } = await supabase.from("partidos").update(cambios).eq("id", ya.id);
      if (error) res.errores.push(`${etiqueta}: ${error.message}`); else { res.actualizados++; Object.assign(ya, cambios); }
      continue;
    }

    const { data: nuevo, error } = await supabase
      .from("partidos")
      .insert({ equipo_id: equipoId, ...datosFCBQ(p) })
      .select(COLUMNAS)
      .single();
    if (error || !nuevo) { res.errores.push(`${etiqueta}: ${error?.message ?? "error"}`); continue; }
    res.nuevos++;
    lista.push(nuevo as unknown as Existente);
    // Convocatoria por defecto: toda la plantilla
    const { data: plantilla } = await supabase.from("equipo_jugadores").select("jugador_id").eq("equipo_id", equipoId);
    if (plantilla?.length) await supabase.from("convocatorias").insert(plantilla.map((j) => ({ partido_id: (nuevo as unknown as Existente).id, jugador_id: j.jugador_id })));
  }

  // 3) Liga: resultados de todos los equipos y clasificación
  const equipoLiga = liga ? equipoDe.get(liga.nuestro) : undefined;
  if (liga && equipoLiga) {
    const { data: antes, error: e2 } = await supabase.from("ligas_fcbq").select("resultados, nombre, url, clasificacion").eq("equipo_id", equipoLiga).maybeSingle();
    if (e2) res.errores.push(/ligas_fcbq/.test(e2.message) ? "Para guardar la liga y la clasificación, ejecuta antes 0004_liga_fcbq.sql en Supabase." : e2.message);
    else {
      const { error } = await supabase.from("ligas_fcbq").upsert({
        equipo_id: equipoLiga,
        nombre: liga.nombre || antes?.nombre || null,
        url: liga.url || antes?.url || null,
        resultados: unirResultados((antes?.resultados ?? []) as ResultadoLiga[], liga.resultados),
        clasificacion: liga.clasificacion ?? antes?.clasificacion ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) res.errores.push(`Liga: ${error.message}`); else res.liga = true;
    }
  }

  revalidatePath("/partidos");
  revalidatePath("/calendario");
  return res;
}
