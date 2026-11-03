import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { todas } from "@/lib/db";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { aISO, hoyLocal } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { ArrowLeft, Users } from "lucide-react";

type Fila = { jugador_id: string; estado: string; entrenamiento_id: string; entrenamientos: { fecha: string; equipo_id: string }; jugadores: { nombre: string; apellidos: string | null } | null };
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
      let q = supabase.from("asistencias").select("jugador_id, estado, entrenamiento_id, entrenamientos!inner(fecha, equipo_id), jugadores(nombre, apellidos)")
        .in("entrenamientos.equipo_id", ids).lte("entrenamientos.fecha", ahora);
      if (desde) q = q.gte("entrenamientos.fecha", desde);
      return q.order("entrenamiento_id").order("jugador_id").range(a, b);
    }),
  ]) : [{ data: [] }, { data: [] }];
  const entrenos = (entR ?? []) as { id: string; equipo_id: string; fecha: string }[];
  const asis = (asisR ?? []) as unknown as Fila[];
  const conLista = new Set(asis.map((a) => a.entrenamiento_id));
  const presente = (e: string) => e === "presente" || e === "tarde";

  const cuenta = (lista: Fila[]) => Object.fromEntries(ESTADOS.map((s) => [s, lista.filter((a) => a.estado === s).length])) as Record<(typeof ESTADOS)[number], number>;
  const porEquipo = equipos.filter((e) => ids.includes(e.id)).map((eq) => {
    const a = asis.filter((x) => x.entrenamientos.equipo_id === eq.id);
    const ent = entrenos.filter((x) => x.equipo_id === eq.id);
    return { eq, entrenos: ent.length, lista: ent.filter((x) => conLista.has(x.id)).length, c: cuenta(a), pct: pc(a.filter((x) => presente(x.estado)).length, a.length) };
  });
  const total = { entrenos: entrenos.length, lista: entrenos.filter((x) => conLista.has(x.id)).length, c: cuenta(asis), pct: pc(asis.filter((x) => presente(x.estado)).length, asis.length) };

  const jug = new Map<string, { nombre: string; equipo: string; n: number; p: number; c: Record<string, number> }>();
  for (const a of asis) {
    const k = `${a.jugador_id}|${a.entrenamientos.equipo_id}`;
    const x = jug.get(k) ?? { nombre: `${a.jugadores?.nombre ?? ""} ${a.jugadores?.apellidos ?? ""}`.trim() || "—", equipo: a.entrenamientos.equipo_id, n: 0, p: 0, c: {} };
    x.n++; if (presente(a.estado)) x.p++; x.c[a.estado] = (x.c[a.estado] ?? 0) + 1;
    jug.set(k, x);
  }
  const jugadores = [...jug.values()].sort((a, b) => a.p / a.n - b.p / b.n || a.nombre.localeCompare(b.nombre));
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
      <p className="mt-1 text-[11px] text-tinta/50">Asistencia = presentes + tarde sobre las listas pasadas. «Lista pasada» = entrenos con asistencia / entrenos hechos.</p>

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
                  <td className="p-2 text-center">{j.p}/{j.n}</td>
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
