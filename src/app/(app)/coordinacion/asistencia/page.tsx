import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { todas } from "@/lib/db";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { aISO, fechaCorta, hoyLocal } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { ArrowLeft, Users } from "lucide-react";

type Fila = { jugador_id: string; estado: string; motivo: string | null; entrenamiento_id: string; entrenamientos: { fecha: string; equipo_id: string }; jugadores: { nombre: string; apellidos: string | null } | null };
const ESTADOS = ["presente", "tarde", "ausente", "justificado", "lesionado"] as const;
const pc = (a: number, b: number) => (b ? Math.round((a * 100) / b) : null);
const color = (v: number | null) => (v === null ? "text-tinta/40" : v >= 80 ? "text-green-700" : v >= 65 ? "text-amber-700" : "text-red-700");

/** Asistencia general de todo el club (solo coordinadores): por equipo y por jugador */
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
  const presente = (e: string) => e === "presente" || e === "tarde";
  // % = (presente + tarde) / (todos menos los justificados): una falta justificada no baja el %
  const pctDe = (l: Fila[]) => pc(l.filter((x) => presente(x.estado)).length, l.filter((x) => x.estado !== "justificado").length);

  const cuenta = (lista: Fila[]) => Object.fromEntries(ESTADOS.map((s) => [s, lista.filter((a) => a.estado === s).length])) as Record<(typeof ESTADOS)[number], number>;
  const porEquipo = equipos.filter((e) => ids.includes(e.id)).map((eq) => {
    const a = asis.filter((x) => x.entrenamientos.equipo_id === eq.id);
    const ent = entrenos.filter((x) => x.equipo_id === eq.id);
    return { eq, entrenos: ent.length, lista: ent.filter((x) => conLista.has(x.id)).length, c: cuenta(a), pct: pctDe(a) };
  });
  const total = { entrenos: entrenos.length, lista: entrenos.filter((x) => conLista.has(x.id)).length, c: cuenta(asis), pct: pctDe(asis) };

  const jug = new Map<string, { nombre: string; equipo: string; n: number; p: number; c: Record<string, number> }>();
  for (const a of asis) {
    const k = `${a.jugador_id}|${a.entrenamientos.equipo_id}`;
    const x = jug.get(k) ?? { nombre: `${a.jugadores?.nombre ?? ""} ${a.jugadores?.apellidos ?? ""}`.trim() || "—", equipo: a.entrenamientos.equipo_id, n: 0, p: 0, c: {} };
    if (a.estado !== "justificado") x.n++; if (presente(a.estado)) x.p++; x.c[a.estado] = (x.c[a.estado] ?? 0) + 1;
    jug.set(k, x);
  }
  const jugadores = [...jug.values()].sort((a, b) => (a.n ? a.p / a.n : 1) - (b.n ? b.p / b.n : 1) || a.nombre.localeCompare(b.nombre));
  // Faltas con su motivo (justificadas, lesiones y ausencias), las más recientes primero
  const faltas = asis.filter((a) => a.estado === "justificado" || a.estado === "lesionado" || a.estado === "ausente")
    .sort((a, b) => b.entrenamientos.fecha.localeCompare(a.entrenamientos.fecha));
  const nombreEq = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";
  const enlace = (p: Record<string, string>) => `?${new URLSearchParams({ periodo, ...(equipo ? { equipo } : {}), ...p }).toString()}`;

  return (
    <div>
      <Link href="/coordinacion" className="inline-flex items-center gap-1 text-sm text-tinta/60 hover:text-tinta"><ArrowLeft size={15} /> Panel del coordinador</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Users className="text-azul" /> Asistencia general</h1>
      <p className="text-sm text-tinta/60">Temporada {temporada?.nombre ?? ""} · todos los equipos · entrenos ya hechos con lista pasada</p>

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
      </form>

      {/* Resumen por equipo: pulsa para ver jugadores y motivos */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {porEquipo.map((f) => (
          <Link key={f.eq.id} href={enlace({ equipo: f.eq.id })} className={`tarjeta p-3 transition hover:shadow-md ${equipo === f.eq.id ? "ring-2 ring-azul" : ""}`}>
            <p className="truncate text-sm font-semibold"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: colorEquipo(f.eq.id, equipos) }} />{f.eq.nombre}</p>
            <p className={`mt-1 text-2xl font-bold ${color(f.pct)}`}>{f.pct === null ? "–" : `${f.pct}%`}</p>
            <p className="text-[11px] text-tinta/60">{f.c.justificado} justif. · {f.c.ausente} ausencias · {f.c.lesionado} lesión</p>
            <p className={`text-[11px] ${f.entrenos && f.lista < f.entrenos ? "font-semibold text-red-700" : "text-tinta/50"}`}>Lista {f.lista}/{f.entrenos} entrenos</p>
          </Link>
        ))}
      </div>
      {equipo && <p className="mt-2 text-sm"><Link href={`?${new URLSearchParams({ periodo }).toString()}`} className="text-azul underline">← Ver todos los equipos</Link></p>}

      <div className="tarjeta mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Equipo</th><th className="p-2 text-center">Lista pasada</th><th className="p-2 text-center">Asistencia</th><th className="p-2 text-center">Presentes</th><th className="p-2 text-center">Tarde</th><th className="p-2 text-center">Ausentes</th><th className="p-2 text-center">Justif.</th><th className="p-2 text-center">Lesión</th></tr>
          </thead>
          <tbody>
            {porEquipo.map((f) => (
              <tr key={f.eq.id} className="border-t border-linea">
                <td className="p-2 font-semibold"><Link href={enlace({ equipo: f.eq.id })} className="hover:underline"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: colorEquipo(f.eq.id, equipos) }} />{f.eq.nombre}</Link></td>
                <td className={`p-2 text-center ${f.entrenos && f.lista < f.entrenos ? "font-semibold text-red-700" : ""}`}>{f.entrenos ? `${f.lista}/${f.entrenos}` : "–"}</td>
                <td className={`p-2 text-center font-semibold ${color(f.pct)}`}>{f.pct === null ? "–" : `${f.pct}%`}</td>
                {ESTADOS.map((s) => <td key={s} className="p-2 text-center text-tinta/80">{f.c[s] || "·"}</td>)}
              </tr>
            ))}
            {porEquipo.length > 1 && (
              <tr className="border-t-2 border-linea bg-suave/60 font-semibold">
                <td className="p-2">Total club</td>
                <td className="p-2 text-center">{total.entrenos ? `${total.lista}/${total.entrenos}` : "–"}</td>
                <td className={`p-2 text-center ${color(total.pct)}`}>{total.pct === null ? "–" : `${total.pct}%`}</td>
                {ESTADOS.map((s) => <td key={s} className="p-2 text-center">{total.c[s] || "·"}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-tinta/50">Asistencia = (presentes + tarde) sobre las listas pasadas, sin contar las faltas justificadas (no bajan el %). «Lista pasada» = entrenos con asistencia / entrenos hechos.</p>

      <h2 className="mt-6 font-semibold">Faltas y motivos{equipo ? ` · ${nombreEq(equipo)}` : ""} ({faltas.length})</h2>
      <div className="tarjeta mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Fecha</th><th className="p-2">Jugador</th>{!equipo && <th className="p-2">Equipo</th>}<th className="p-2">Tipo</th><th className="p-2">Motivo</th></tr>
          </thead>
          <tbody>
            {faltas.slice(0, equipo ? 200 : 40).map((a, i) => (
              <tr key={i} className="border-t border-linea align-top">
                <td className="whitespace-nowrap p-2 text-xs capitalize text-tinta/70">{fechaCorta(a.entrenamientos.fecha)}</td>
                <td className="p-2">{`${a.jugadores?.nombre ?? ""} ${a.jugadores?.apellidos ?? ""}`.trim()}</td>
                {!equipo && <td className="p-2 text-xs text-tinta/70">{nombreEq(a.entrenamientos.equipo_id)}</td>}
                <td className={`p-2 text-xs font-semibold ${a.estado === "justificado" ? "text-sky-700" : a.estado === "lesionado" ? "text-violet-700" : "text-red-700"}`}>{a.estado === "justificado" ? "Justificada" : a.estado === "lesionado" ? "Lesión" : "Ausencia"}</td>
                <td className="p-2 text-xs">{a.motivo || <span className="text-tinta/40">Sin motivo</span>}</td>
              </tr>
            ))}
            {!faltas.length && <tr><td colSpan={5} className="p-3 text-center text-tinta/50">No hay faltas en este periodo.</td></tr>}
          </tbody>
        </table>
      </div>
      {!equipo && faltas.length > 40 && <p className="mt-1 text-xs text-tinta/50">Se ven las 40 más recientes. Elige un equipo para verlas todas.</p>}

      <h2 className="mt-6 font-semibold">Por jugador ({jugadores.length})</h2>
      <p className="text-xs text-tinta/50">Ordenados de menos a más asistencia.</p>
      <div className="tarjeta mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Jugador</th><th className="p-2">Equipo</th><th className="p-2 text-center">Asistencia</th><th className="p-2 text-center">Entrenos</th><th className="p-2 text-center">Ausente</th><th className="p-2 text-center">Justif.</th><th className="p-2 text-center">Lesión</th><th className="p-2 text-center">Tarde</th></tr>
          </thead>
          <tbody>
            {jugadores.map((j, i) => {
              const v = pc(j.p, j.n);
              return (
                <tr key={i} className="border-t border-linea">
                  <td className="p-2">{j.nombre}</td>
                  <td className="p-2 text-xs text-tinta/70">{nombreEq(j.equipo)}</td>
                  <td className={`p-2 text-center font-semibold ${color(v)}`}>{v === null ? "–" : `${v}%`}</td>
                  <td className="p-2 text-center">{j.p}/{j.n}{j.c.justificado ? <span className="text-tinta/50"> (+{j.c.justificado} J)</span> : null}</td>
                  <td className="p-2 text-center">{j.c.ausente || "·"}</td>
                  <td className="p-2 text-center">{j.c.justificado || "·"}</td>
                  <td className="p-2 text-center">{j.c.lesionado || "·"}</td>
                  <td className="p-2 text-center">{j.c.tarde || "·"}</td>
                </tr>
              );
            })}
            {!jugadores.length && <tr><td colSpan={8} className="p-3 text-center text-tinta/50">No hay listas pasadas en este periodo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
