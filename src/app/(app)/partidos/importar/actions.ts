"use server";

import { revalidatePath } from "next/cache";
import { notificarEquipo } from "@/lib/notificar";
import { createClient } from "@/lib/supabase/server";
import { buscarExistente, cambiosFCBQ, datosFCBQ, unirResultados, type LigaFCBQ, type PartidoFCBQ, type ResultadoLiga } from "@/lib/fcbq";

const COLUMNAS = "id, equipo_id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado, fcbq_id";
type Existente = { id: string; equipo_id: string; fecha: string; rival: string; fcbq_id: string | null } & Record<string, unknown>;

export type Asignacion = { nombre: string; equipoId: string; fcbqEquipoId: string | null };
export type Desaparecido = { id: string; fecha: string; rival: string; equipo: string };
export type ResultadoImportacion = { nuevos: number; actualizados: number; iguales: number; ligas: number; errores: string[]; desaparecidos: Desaparecido[] };

export async function importarFCBQ(partidos: PartidoFCBQ[], asignaciones: Asignacion[], ligas: LigaFCBQ[] = []): Promise<ResultadoImportacion> {
  const supabase = await createClient();
  const res: ResultadoImportacion = { nuevos: 0, actualizados: 0, iguales: 0, ligas: 0, errores: [], desaparecidos: [] };
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
  const { data: nombresEq } = await supabase.from("equipos").select("id, nombre").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const nombreDe = new Map((nombresEq ?? []).map((e) => [e.id as string, e.nombre as string]));
  const avisos: { equipoId: string; titulo: string; cuerpo: string; url: string }[] = [];
  const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  for (const p of partidos) {
    const equipoId = equipoDe.get(p.nuestro);
    if (!equipoId) continue;
    const etiqueta = `${p.dia} ${p.nuestro} – ${p.rival}`;
    const ya = buscarExistente(lista, equipoId, p);

    if (ya) {
      const cambios = cambiosFCBQ(ya, p);
      if (!Object.keys(cambios).length) { res.iguales++; continue; }
      const antes = { fecha: ya.fecha as string, lugar: (ya.lugar as string | null) ?? null, pf: ya.puntos_favor };
      const { error } = await supabase.from("partidos").update(cambios).eq("id", ya.id);
      if (error) { res.errores.push(`${etiqueta}: ${error.message}`); continue; }
      res.actualizados++;
      Object.assign(ya, cambios);
      // Avisos: cambio de horario o de pista en partidos que aún no se han jugado, y resultados nuevos
      const eqNombre = nombreDe.get(equipoId) ?? p.nuestro;
      const vs = `${eqNombre} ${p.local ? "vs" : "@"} ${p.rival}`;
      const futuro = new Date(ya.fecha as string).getTime() > Date.now() - 3600e3;
      if (futuro && "fecha" in cambios) avisos.push({ equipoId, titulo: `Cambio de horario · ${vs}`, cuerpo: `Ahora: ${cuando(String(cambios.fecha))} (antes ${cuando(antes.fecha)})`, url: `/partidos/${ya.id}` });
      else if (futuro && "lugar" in cambios && antes.lugar) avisos.push({ equipoId, titulo: `Cambio de pista · ${vs}`, cuerpo: `Ahora: ${cambios.lugar} (antes ${antes.lugar})`, url: `/partidos/${ya.id}` });
      if ("puntos_favor" in cambios && antes.pf === null && p.pf !== null && p.pc !== null) {
        avisos.push({ equipoId, titulo: `${p.pf > p.pc ? "Victoria" : p.pf < p.pc ? "Derrota" : "Empate"} · ${vs}`, cuerpo: `${p.local ? `${p.pf}-${p.pc}` : `${p.pc}-${p.pf}`}`, url: `/partidos/${ya.id}` });
      }
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

  // Avisos al cuerpo técnico (en la app y, si lo han activado, en el móvil)
  for (const a of avisos.slice(0, 40)) await notificarEquipo(supabase, a.equipoId, a.titulo, a.cuerpo, a.url);

  // 3) Ligas: resultados de todos los equipos y clasificación
  for (const liga of ligas) {
    const equipoLiga = equipoDe.get(liga.nuestro);
    if (!equipoLiga) continue;
    const { data: antes, error: e2 } = await supabase.from("ligas_fcbq").select("resultados, nombre, url, clasificacion").eq("equipo_id", equipoLiga).maybeSingle();
    if (e2) {
      res.errores.push(/ligas_fcbq/.test(e2.message) ? "Para guardar ligas y clasificaciones, ejecuta antes 0004_liga_fcbq.sql en Supabase." : e2.message);
      break;
    }
    const { error } = await supabase.from("ligas_fcbq").upsert({
      equipo_id: equipoLiga,
      nombre: liga.nombre || antes?.nombre || null,
      url: liga.url || antes?.url || null,
      resultados: unirResultados((antes?.resultados ?? []) as ResultadoLiga[], liga.resultados),
      clasificacion: liga.clasificacion ?? antes?.clasificacion ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) res.errores.push(`Liga de ${liga.nuestro}: ${error.message}`); else res.ligas++;
  }

  // 4) Partidos futuros que venían de la FCBQ y ya no están en su calendario (aplazados o anulados)
  const idsLeidos = new Set(partidos.map((p) => p.fcbqId).filter(Boolean));
  // (solo si se ha leído el calendario de varios meses, como hace el botón de actualizar)
  const meses = new Set(partidos.filter((p) => p.fcbqId).map((p) => p.dia.slice(0, 7)));
  if (idsLeidos.size && meses.size >= 3) {
    const ahora = new Date().toISOString();
    const nombreEq = new Map(asignaciones.map((a) => [a.equipoId, a.nombre]));
    for (const x of lista) {
      if (!x.fcbq_id || idsLeidos.has(x.fcbq_id) || x.fecha < ahora || x.estado === "aplazado" || x.estado === "jugado") continue;
      res.desaparecidos.push({ id: x.id, fecha: x.fecha, rival: x.rival, equipo: nombreEq.get(x.equipo_id) ?? "" });
    }
  }

  revalidatePath("/partidos");
  revalidatePath("/calendario");
  return res;
}
