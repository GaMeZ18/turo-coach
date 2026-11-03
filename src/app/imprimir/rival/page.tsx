import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaLarga, hora } from "@/lib/fechas";
import type { ResultadoLiga, TablaFCBQ } from "@/lib/fcbq";
import { informeRival } from "@/lib/informe-rival";
import { media, minutos, mismoEquipo, pct, resumenEquipo, type ResumenEquipo, type StatsPartido } from "@/lib/stats-fcbq";
import { CAMPOS_EQUIPO, puedeVerScouting, type FichaJugador, type FichaRival } from "@/lib/scouting";
import BotonImprimir from "../entreno/[id]/Imprimir";

export const metadata = { title: "Informe del rival · Coach Manager CBTuró" };

const f1 = (x: number) => x.toFixed(1).replace(".", ",");
const por = (x: number, pj: number) => (pj ? x / pj : 0);

/** Informe completo de un rival para imprimir o guardar en PDF (datos FCBQ + fichas de scouting) */
export default async function InformeRivalPDF({ searchParams }: { searchParams: Promise<{ nombre?: string }> }) {
  const { nombre = "" } = await searchParams;
  const { supabase, user, perfil } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo || !nombre) notFound();
  if (!(await puedeVerScouting(supabase, equipo, user.id, perfil.rol))) notFound();

  const [{ data: liga }, { data: filas }, { data: fichaRow }, { data: fichasJug }, { data: partidos }] = await Promise.all([
    supabase.from("ligas_fcbq").select("nombre, resultados, clasificacion").eq("equipo_id", equipo.id).maybeSingle(),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipo.id),
    supabase.from("scouting_rivales").select("nombre, notas, caracteristicas, updated_at").eq("equipo_id", equipo.id).eq("nombre", nombre).maybeSingle(),
    supabase.from("scouting_jugadores").select("rival, nombre, dorsal, notas, caracteristicas").eq("equipo_id", equipo.id).eq("rival", nombre),
    supabase.from("partidos").select("fecha, rival, local, lugar, estado").eq("equipo_id", equipo.id).gte("fecha", new Date(Date.now() - 3 * 3600e3).toISOString()).order("fecha"),
  ]);
  const stats = ((filas ?? []) as { datos: StatsPartido }[]).map((f) => f.datos);
  const todos = (liga?.resultados ?? []) as ResultadoLiga[];
  const resultados = todos.filter((r) => mismoEquipo(r.local, nombre) || mismoEquipo(r.visitante, nombre));
  const nuestro = [...todos.map((r) => r.local), ...todos.map((r) => r.visitante)].find((n) => /TUR[OÓ]/i.test(n)) ?? null;
  const lineas = informeRival(nombre, { resultados: todos, clasificacion: (liga?.clasificacion ?? null) as TablaFCBQ | null, stats, nuestro });
  const { equipo: r, jugadores } = resumenEquipo(nombre, stats);
  const ficha = fichaRow as FichaRival | null;
  const fichas = (fichasJug ?? []) as FichaJugador[];
  const fichaDe = (n: string) => fichas.find((f) => mismoEquipo(f.nombre, n));
  const proximo = ((partidos ?? []) as { fecha: string; rival: string; local: boolean; lugar: string | null; estado: string }[]).find((p) => p.estado !== "jugado" && mismoEquipo(p.rival, nombre));

  // Balance con los resultados (más completos que las estadísticas)
  const jugados = resultados.filter((x) => x.pl !== null && x.pv !== null).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
  const deEl = (x: ResultadoLiga) => (mismoEquipo(x.local, nombre) ? [x.pl!, x.pv!] : [x.pv!, x.pl!]);
  const g = jugados.filter((x) => deEl(x)[0] > deEl(x)[1]).length;
  const pf = jugados.reduce((s, x) => s + deEl(x)[0], 0), pc = jugados.reduce((s, x) => s + deEl(x)[1], 0);

  // Comparación con la liga y con nosotros (equipos con estadísticas)
  const nombres = [...new Set(stats.flatMap((s) => [s.local.nombre, s.visitante.nombre]))];
  const liga2 = nombres.map((n) => resumenEquipo(n, stats).equipo).filter((e) => e.pj > 0);
  const nos = nuestro ? liga2.find((e) => mismoEquipo(e.nombre, nuestro)) ?? null : null;
  type Metrica = { t: string; v: (e: ResumenEquipo) => number; fmt: (x: number) => string; alto: "mal" | "bien" | null };
  const METRICAS: Metrica[] = [
    { t: "Puntos anotados / partido", v: (e) => por(e.pf, e.pj), fmt: f1, alto: "mal" },
    { t: "Puntos recibidos / partido", v: (e) => por(e.pc, e.pj), fmt: f1, alto: "bien" },
    { t: "Diferencia / partido", v: (e) => por(e.pf - e.pc, e.pj), fmt: (x) => `${x > 0 ? "+" : ""}${f1(x)}`, alto: "mal" },
    { t: "Canastas de 2 / partido", v: (e) => por(e.t2, e.pj), fmt: f1, alto: "mal" },
    { t: "Triples / partido", v: (e) => por(e.t3, e.pj), fmt: f1, alto: "mal" },
    { t: "Tiros libres intentados / partido", v: (e) => por(e.tla, e.pj), fmt: f1, alto: "mal" },
    { t: "% de tiros libres", v: (e) => (e.tla ? (100 * e.tlm) / e.tla : 0), fmt: (x) => `${Math.round(x)}%`, alto: "mal" },
    { t: "Faltas / partido", v: (e) => por(e.fc, e.pj), fmt: f1, alto: "bien" },
  ];
  const ranking = (m: Metrica) => {
    const orden = [...liga2].sort((a, b) => m.v(b) - m.v(a));
    return orden.findIndex((e) => mismoEquipo(e.nombre, nombre)) + 1;
  };
  const mediaLiga = (m: Metrica) => (liga2.length ? liga2.reduce((s, e) => s + m.v(e), 0) / liga2.length : 0);
  const top = jugadores.slice(0, 5);
  const tono = { bien: "border-l-green-600", mal: "border-l-rojo", neutro: "border-l-gray-300" } as const;
  const valor = (k: string) => { const v = ficha?.caracteristicas?.[k]; return Array.isArray(v) ? v.join(", ") : v ?? ""; };
  const camposConDato = CAMPOS_EQUIPO.filter((c) => valor(c.k));
  const conNotas = jugadores.map((j) => ({ j, f: fichaDe(j.nombre) })).filter((x) => x.f && (x.f.notas || x.f.caracteristicas?.etiquetas?.length || x.f.caracteristicas?.posicion));
  const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-5 border-b-2 border-azul pb-1 text-sm font-bold uppercase tracking-wide text-azul">{children}</h2>;

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-[13px] text-tinta print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: white } .evitar { break-inside: avoid } }`}</style>
      <BotonImprimir volver={`/scouting/equipo?nombre=${encodeURIComponent(nombre)}`} texto="← Volver al scouting" />

      <header className="flex items-center gap-4 border-b-4 border-azul pb-3">
        <img src="/icons/icon-192.png" alt="" className="h-14 w-14 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rojo">Informe del rival · {equipo.nombre}</p>
          <h1 className="text-2xl font-bold leading-tight">{nombre}</h1>
          <p className="text-xs text-tinta/60">
            {proximo ? <>Próximo partido: <span className="capitalize">{fechaLarga(proximo.fecha)}</span> · {hora(proximo.fecha)} · {proximo.local ? "en casa" : "fuera"}{proximo.lugar ? ` · ${proximo.lugar}` : ""}</> : "Sin partido programado contra este equipo"}
          </p>
        </div>
        <div className="text-right text-xs text-tinta/60">
          <div className="text-2xl font-bold text-tinta">{g}-{jugados.length - g}</div>
          <div>balance</div>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[["Mete", jugados.length ? f1(pf / jugados.length) : "–"], ["Recibe", jugados.length ? f1(pc / jugados.length) : "–"], ["Triples", r.pj ? f1(r.t3 / r.pj) : "–"], ["Tiros libres", pct(r.tlm, r.tla)]].map(([t, v]) => (
          <div key={t} className="rounded-lg bg-suave p-2"><div className="text-xl font-bold text-azul">{v}</div><div className="text-[10px] uppercase tracking-wide text-tinta/60">{t}{t !== "Tiros libres" ? " / partido" : ""}</div></div>
        ))}
      </div>

      <H2>Claves del rival</H2>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {lineas.map((l, i) => (
          <li key={i} className={`evitar rounded border border-l-4 border-gray-200 px-2 py-1 ${tono[l.tono ?? "neutro"]}`}>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-tinta/50">{l.titulo}</span>{l.texto}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-tinta/50">Verde: punto débil del rival. Rojo: peligro.</p>

      {liga2.length > 1 && r.pj > 0 && (
        <section className="evitar">
          <H2>Comparado con la liga{nos && !mismoEquipo(nos.nombre, nombre) ? " y con nosotros" : ""}</H2>
          <table className="mt-2 w-full tabular-nums">
            <thead className="text-left text-[10px] uppercase text-tinta/60">
              <tr><th className="py-1">Dato</th><th className="text-center">{nombre.length > 18 ? "Rival" : nombre}</th><th className="text-center">Media liga</th>{nos && !mismoEquipo(nos.nombre, nombre) && <th className="text-center">Nosotros</th>}<th className="text-center">Puesto en la liga</th><th>Lectura</th></tr>
            </thead>
            <tbody>
              {METRICAS.map((m) => {
                const v = m.v(r), med = mediaLiga(m), dif = med ? (v - med) / Math.abs(med) : 0;
                const alto = dif > 0.08, bajo = dif < -0.08;
                const lectura = !alto && !bajo ? "En la media" : alto ? "Por encima de la media" : "Por debajo de la media";
                const color = (alto && m.alto === "mal") || (bajo && m.alto === "bien") ? "text-rojo" : (alto && m.alto === "bien") || (bajo && m.alto === "mal") ? "text-green-700" : "text-tinta/60";
                return (
                  <tr key={m.t} className="border-t border-gray-200">
                    <td className="py-1">{m.t}</td>
                    <td className="text-center font-bold">{m.fmt(v)}</td>
                    <td className="text-center text-tinta/70">{m.fmt(med)}</td>
                    {nos && !mismoEquipo(nos.nombre, nombre) && <td className="text-center text-tinta/70">{m.fmt(m.v(nos))}</td>}
                    <td className="text-center">{ranking(m)}º de {liga2.length}</td>
                    <td className={`text-xs font-semibold ${color}`}>{lectura}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-tinta/50">Con los partidos que tienen estadísticas de la FCBQ ({r.pj} de este rival). Rojo: le favorece a él. Verde: le perjudica.</p>
        </section>
      )}

      {top.length > 0 && (
        <section className="evitar">
          <H2>Máximos anotadores</H2>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {top.map((j, i) => {
              const f = fichaDe(j.nombre);
              return (
                <div key={j.uuid ?? j.nombre} className={`rounded-lg border p-2 ${i < 2 ? "border-rojo" : "border-gray-200"}`}>
                  <div className="text-[10px] text-tinta/50">#{j.dorsal}{f?.caracteristicas?.posicion ? ` · ${f.caracteristicas.posicion}` : ""}</div>
                  <div className="truncate font-semibold leading-tight" title={j.nombre}>{j.nombre}</div>
                  <div className="mt-1 text-xl font-bold text-rojo">{media(j.pts, j.pj)}</div>
                  <div className="text-[10px] leading-tight text-tinta/60">pts/partido · máx {j.maxPts}<br />{media(j.t3, j.pj)} triples · TL {pct(j.tlm, j.tla)}<br />{minutos(j.seg, j.pj)} min · titular {j.titular}/{j.pj}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {jugadores.length > 0 && (
        <section>
          <H2>Plantilla (medias por partido)</H2>
          <table className="mt-2 w-full tabular-nums">
            <thead className="text-left text-[10px] uppercase text-tinta/60">
              <tr><th className="py-1">#</th><th>Jugador</th><th className="text-center">PJ</th><th className="text-center">Min</th><th className="text-center">Pts</th><th className="text-center">T2</th><th className="text-center">T3</th><th className="text-center">TL</th><th className="text-center">F</th><th className="text-center">Máx</th></tr>
            </thead>
            <tbody>
              {jugadores.map((j, i) => (
                <tr key={j.uuid ?? j.nombre} className="border-t border-gray-200">
                  <td className="py-0.5 text-tinta/60">{j.dorsal}</td>
                  <td className={i < 3 ? "font-semibold text-rojo" : ""}>{j.nombre}</td>
                  <td className="text-center">{j.pj}</td><td className="text-center">{minutos(j.seg, j.pj)}</td>
                  <td className="text-center font-bold">{media(j.pts, j.pj)}</td><td className="text-center">{media(j.t2, j.pj)}</td><td className="text-center">{media(j.t3, j.pj)}</td>
                  <td className="text-center">{j.tla ? `${pct(j.tlm, j.tla)}` : "–"}</td><td className="text-center">{media(j.fc, j.pj)}</td><td className="text-center">{j.maxPts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {r.pj > 0 && r.porPeriodoF.length > 0 && (
        <section className="evitar">
          <H2>Puntos por periodo (media)</H2>
          <table className="mt-2 tabular-nums">
            <thead><tr className="text-[10px] text-tinta/50"><th />{r.porPeriodoF.map((_, i) => <th key={i} className="px-4 font-normal">{i + 1}º</th>)}</tr></thead>
            <tbody>
              <tr><td className="pr-3 text-xs text-tinta/60">Anotados</td>{r.porPeriodoF.map((v, i) => <td key={i} className="px-4 text-center font-semibold">{media(v, r.pj)}</td>)}</tr>
              <tr><td className="pr-3 text-xs text-tinta/60">Recibidos</td>{r.porPeriodoC.map((v, i) => <td key={i} className="px-4 text-center">{media(v, r.pj)}</td>)}</tr>
            </tbody>
          </table>
        </section>
      )}

      {(camposConDato.length > 0 || ficha?.notas) && (
        <section className="evitar">
          <H2>Nuestro scouting</H2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {camposConDato.map((c) => (
              <div key={c.k} className={c.opciones ? "" : "col-span-2"}><dt className="text-[10px] font-semibold uppercase tracking-wide text-tinta/50">{c.label}</dt><dd className="whitespace-pre-line">{valor(c.k)}</dd></div>
            ))}
            {ficha?.notas && <div className="col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-tinta/50">Notas</dt><dd className="whitespace-pre-line">{ficha.notas}</dd></div>}
          </dl>
        </section>
      )}

      {conNotas.length > 0 && (
        <section>
          <H2>Fichas de jugadores</H2>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {conNotas.map(({ j, f }) => (
              <li key={j.nombre} className="evitar rounded border border-gray-200 p-2">
                <p className="font-semibold">#{j.dorsal} {j.nombre} <span className="font-normal text-tinta/60">· {media(j.pts, j.pj)} pts</span></p>
                {(f!.caracteristicas?.posicion || f!.caracteristicas?.mano || f!.caracteristicas?.etiquetas?.length) ? <p className="text-[11px] text-tinta/60">{[f!.caracteristicas?.posicion, f!.caracteristicas?.mano, ...(f!.caracteristicas?.etiquetas ?? [])].filter(Boolean).join(" · ")}</p> : null}
                {f!.notas && <p className="mt-0.5 whitespace-pre-line">{f!.notas}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {jugados.length > 0 && (
        <section className="evitar">
          <H2>Resultados</H2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 tabular-nums">
            {jugados.map((x, i) => {
              const [a, b] = deEl(x), casa = mismoEquipo(x.local, nombre);
              return (
                <li key={i} className="flex items-center gap-2 border-b border-gray-100 py-0.5">
                  <span className="w-9 text-[10px] text-tinta/50">{x.jornada ? `J${x.jornada}` : ""}</span>
                  <span className="min-w-0 flex-1 truncate">{casa ? "vs" : "@"} {casa ? x.visitante : x.local}</span>
                  <span className={`font-bold ${a > b ? "text-green-700" : a < b ? "text-rojo" : ""}`}>{a > b ? "V" : a < b ? "D" : "E"} {a}-{b}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-6 border-t border-gray-200 pt-2 text-[10px] text-tinta/50">
        Coach Manager CBTuró · datos de la FCBQ y del scouting del cuerpo técnico · generado el {new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}
      </footer>
    </main>
  );
}
