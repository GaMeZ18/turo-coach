import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { todas } from "@/lib/db";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { aISO, fechaCorta, hoyLocal } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { resumenAsistencia } from "@/lib/asistencia";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";

type Fila = {
  jugador_id: string; estado: string; motivo: string | null; entrenamiento_id: string;
  entrenamientos: { fecha: string; equipo_id: string };
  jugadores: { nombre: string; apellidos: string | null } | null;
};
const ESTADOS = ["presente", "tarde", "ausente", "justificado", "lesionado"] as const;
const ETIQUETA: Record<string, string> = { presente: "Presente", tarde: "Tarde", ausente: "Ausente", justificado: "Justificado", lesionado: "Lesionado" };
const CHIP: Record<string, string> = {
  tarde: "bg-amber-100 text-amber-800", ausente: "bg-red-100 text-red-700",
  justificado: "bg-sky-100 text-sky-800", lesionado: "bg-violet-100 text-violet-800",
};
const color = (v: number | null) => (v === null ? "text-tinta/40" : v >= 80 ? "text-green-700" : v >= 65 ? "text-amber-700" : "text-red-700");

/** Asistencia general de todo el club (solo coordinadores): por equipo y por jugador, con los motivos de cada falta */
export default async function AsistenciaGeneral({ searchParams }: { searchParams: Promise<{ periodo?: string; equipo?: string }> }) {
  const { supabase, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");
  const { periodo = "30", equipo = "" } = await searchParams;
  const { temporada, equipos } = await equiposDeTemporada(supabase);
  const ids = equipo ? [equipo] : equipos.map((e) => e.id);
  const ahora = new Date().toISOString();
  const desde = periodo === "temporada" ? null : aISO(sumarDias(hoyLocal(), -Number(periodo || 30)), "00:00");

  const [{ data: entR }, { data: asisR }] = ids.length ? await Promise.all([
    (() => { let q = supabase.from("entrenamientos").select("id, equipo_id, fecha").in("equipo_id", ids).lte("fecha", ahora); if (desde) q = q.gte("fecha", desde); return q; })(),
    todas((a, b) => {
      let q = supabase.from("asistencias").select("jugador_id, estado, motivo, entrenamiento_id, entrenamientos!inner(fecha, equipo_id), jugadores(nombre, apellidos)")
        .in("entrenamientos.equipo_id", ids).lte("entrenamientos.fecha", ahora);
      if (desde) q = q.gte("entrenamientos.fecha", desde);
      return q.order("entrenamiento_id").order("jugador_id").range(a, b);
    }),
  ]) : [{ data: [] }, { data: [] }];
  const entrenos = (entR ?? []) as { id: string; equipo_id: string; fecha: string }[];
  const asis = (asisR ?? []) as unknown as Fila[];
  const conLista = new Set(asis.map((a) => a.entrenamiento_id));

  const cuenta = (lista: { estado: string }[]) => Object.fromEntries(ESTADOS.map((s) => [s, lista.filter((a) => a.estado === s).length])) as Record<(typeof ESTADOS)[number], number>;
  const porEquipo = equipos.filter((e) => ids.includes(e.id)).map((eq) => {
    const a = asis.filter((x) => x.entrenamientos.equipo_id === eq.id);
    const ent = entrenos.filter((x) => x.equipo_id === eq.id);
    return { eq, entrenos: ent.length, lista: ent.filter((x) => conLista.has(x.id)).length, c: cuenta(a), r: resumenAsistencia(a) };
  });
  const total = { entrenos: entrenos.length, lista: entrenos.filter((x) => conLista.has(x.id)).length, c: cuenta(asis), r: resumenAsistencia(asis) };

  // Por jugador: su %, sus cifras y el detalle de cada falta o retraso con su motivo
  const jug = new Map<string, { nombre: string; equipo: string; regs: Fila[] }>();
  for (const a of asis) {
    const k = `${a.jugador_id}|${a.entrenamientos.equipo_id}`;
    const x = jug.get(k) ?? { nombre: `${a.jugadores?.nombre ?? ""} ${a.jugadores?.apellidos ?? ""}`.trim() || "—", equipo: a.entrenamientos.equipo_id, regs: [] };
    x.regs.push(a);
    jug.set(k, x);
  }
  const jugadores = [...jug.values()]
    .map((j) => ({ ...j, r: resumenAsistencia(j.regs), c: cuenta(j.regs), incidencias: j.regs.filter((x) => x.estado !== "presente").sort((a, b) => b.entrenamientos.fecha.localeCompare(a.entrenamientos.fecha)) }))
    .sort((a, b) => (a.r.pct ?? 101) - (b.r.pct ?? 101) || a.nombre.localeCompare(b.nombre));
  const nombreEq = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";
  const enlace = (p: Record<string, string>) => `?${new URLSearchParams({ periodo, ...p }).toString()}`;
  const equipoElegido = equipo ? equipos.find((e) => e.id === equipo) : null;

  return (
    <div>
      <Link href="/coordinacion" className="inline-flex items-center gap-1 text-sm text-tinta/60 hover:text-tinta"><ArrowLeft size={15} /> Panel del coordinador</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Users className="text-azul" /> Asistencia general</h1>
      <p className="text-sm text-tinta/60">{`Temporada ${temporada?.nombre ?? ""} · ${equipoElegido ? equipoElegido.nombre : "todos los equipos"} · entrenos ya hechos con lista pasada`}</p>

      <form className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="etiqueta">Periodo</label>
          <select name="periodo" defaultValue={periodo} className="campo !w-auto">
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 3 meses</option>
            <option value="temporada">Toda la temporada</option>
          </select>
        </div>
        <div>
          <label className="etiqueta">Equipo</label>
          <select name="equipo" defaultValue={equipo} className="campo !w-auto">
            <option value="">Todos</option>
            {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <button className="btn-secundario">Ver</button>
        {equipoElegido && <Link href={enlace({})} className="self-center px-1 text-sm text-tinta/60 underline">Ver todos los equipos</Link>}
      </form>

      <div className="tarjeta mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Equipo</th><th className="p-2 text-center">Lista pasada</th><th className="p-2 text-center">Asistencia</th><th className="p-2 text-center">Presentes</th><th className="p-2 text-center">Tarde</th><th className="p-2 text-center">Ausentes</th><th className="p-2 text-center">Justif.</th><th className="p-2 text-center">Lesión</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {porEquipo.map((f) => (
              <tr key={f.eq.id} className="border-t border-linea">
                <td className="p-2 font-semibold"><Link href={enlace({ equipo: f.eq.id })} className="hover:underline"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: colorEquipo(f.eq.id, equipos) }} />{f.eq.nombre}</Link></td>
                <td className={`p-2 text-center ${f.entrenos && f.lista < f.entrenos ? "font-semibold text-red-700" : ""}`}>{f.entrenos ? `${f.lista}/${f.entrenos}` : "–"}</td>
                <td className={`p-2 text-center font-semibold ${color(f.r.pct)}`}>{f.r.pct === null ? "–" : `${f.r.pct}%`}</td>
                {ESTADOS.map((s) => <td key={s} className="p-2 text-center text-tinta/80">{f.c[s] || "·"}</td>)}
                <td className="p-2 text-right">{!equipoElegido && <Link href={enlace({ equipo: f.eq.id })} className="inline-flex items-center text-xs text-azul hover:underline">Ver jugadores <ChevronRight size={13} /></Link>}</td>
              </tr>
            ))}
            {porEquipo.length > 1 && (
              <tr className="border-t-2 border-linea bg-suave/60 font-semibold">
                <td className="p-2">Total club</td>
                <td className="p-2 text-center">{total.entrenos ? `${total.lista}/${total.entrenos}` : "–"}</td>
                <td className={`p-2 text-center ${color(total.r.pct)}`}>{total.r.pct === null ? "–" : `${total.r.pct}%`}</td>
                {ESTADOS.map((s) => <td key={s} className="p-2 text-center">{total.c[s] || "·"}</td>)}
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-tinta/50">Asistencia = presentes + tarde sobre las listas pasadas. Las faltas justificadas no cuentan: no bajan el porcentaje. «Lista pasada» = entrenos con asistencia / entrenos hechos.</p>

      <h2 className="mt-6 font-semibold">Por jugador ({jugadores.length})</h2>
      <p className="text-xs text-tinta/50">Ordenados de menos a más asistencia. Pulsa en un jugador para ver cada falta o retraso con su motivo.</p>
      <ul className="tarjeta mt-2 divide-y divide-linea">
        {jugadores.map((j, i) => (
          <li key={i}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-sm hover:bg-suave/60">
                <span className="min-w-0 flex-1 font-medium">{j.nombre}{!equipoElegido && <span className="ml-2 text-xs font-normal text-tinta/60">{nombreEq(j.equipo)}</span>}</span>
                <span className={`w-12 text-right font-semibold ${color(j.r.pct)}`}>{j.r.pct === null ? "–" : `${j.r.pct}%`}</span>
                <span className="w-20 text-xs text-tinta/60">{`${j.r.asistidos}/${j.r.validos} entrenos`}</span>
                <span className="flex flex-wrap gap-1">
                  {(["ausente", "justificado", "lesionado", "tarde"] as const).filter((s) => j.c[s] > 0).map((s) => (
                    <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP[s]}`}>{ETIQUETA[s]} {j.c[s]}</span>
                  ))}
                </span>
              </summary>
              <div className="border-t border-linea bg-suave/40 px-3 py-2 text-sm">
                {j.incidencias.length === 0 ? <p className="text-tinta/50">Sin faltas ni retrasos en este periodo.</p> : (
                  <ul className="space-y-1">
                    {j.incidencias.map((x, k) => (
                      <li key={k} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="w-28 shrink-0 text-xs capitalize text-tinta/60">{fechaCorta(x.entrenamientos.fecha)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP[x.estado] ?? "bg-suave"}`}>{ETIQUETA[x.estado] ?? x.estado}</span>
                        <span className="min-w-0 flex-1">{x.motivo ? x.motivo : <span className="text-tinta/40">Sin motivo</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {j.r.excluidos > 0 && <p className="mt-2 text-[11px] text-tinta/50">{j.r.excluidos === 1 ? "1 falta justificada no cuenta para el porcentaje." : `${j.r.excluidos} faltas justificadas no cuentan para el porcentaje.`}</p>}
              </div>
            </details>
          </li>
        ))}
        {!jugadores.length && <li className="p-3 text-center text-sm text-tinta/50">No hay listas pasadas en este periodo.</li>}
      </ul>
    </div>
  );
}
