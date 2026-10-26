import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import type { ResultadoLiga } from "@/lib/fcbq";
import { media, minutos, mismoEquipo, pct, resumenEquipo, type StatsPartido } from "@/lib/stats-fcbq";
import { CAMPOS_EQUIPO, ETIQUETAS_JUGADOR, POSICIONES, esTuro, puedeVerScouting, type FichaJugador, type FichaRival } from "@/lib/scouting";
import SinEquipo from "@/components/SinEquipo";
import Enviar from "@/components/Enviar";
import { guardarFichaJugador, guardarFichaRival } from "../actions";
import { Lock, NotebookPen } from "lucide-react";
import Sinergias from "./Sinergias";
import InformeRival from "@/components/InformeRival";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

export default async function ScoutingEquipo({ searchParams }: { searchParams: Promise<{ nombre?: string }> }) {
  const { nombre: buscado = "" } = await searchParams;
  const { supabase, user, perfil } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="su scouting" />;
  if (!(await puedeVerScouting(supabase, equipo, user.id, perfil.rol))) {
    return <div className="tarjeta mx-auto mt-8 max-w-lg p-6 text-center"><Lock className="mx-auto text-tinta/40" /><p className="mt-2">Solo lo ve el cuerpo técnico de {equipo.nombre}.</p></div>;
  }

  const [{ data: liga }, { data: filas }, { data: fichaRow }, { data: fichasJug }] = await Promise.all([
    supabase.from("ligas_fcbq").select("resultados").eq("equipo_id", equipo.id).maybeSingle(),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipo.id),
    supabase.from("scouting_rivales").select("nombre, notas, caracteristicas, updated_at").eq("equipo_id", equipo.id).eq("nombre", buscado).maybeSingle(),
    supabase.from("scouting_jugadores").select("rival, nombre, dorsal, notas, caracteristicas").eq("equipo_id", equipo.id).eq("rival", buscado),
  ]);
  const stats = ((filas ?? []) as { datos: StatsPartido }[]).map((f) => f.datos);
  const resultados = ((liga?.resultados ?? []) as ResultadoLiga[]).filter((r) => mismoEquipo(r.local, buscado) || mismoEquipo(r.visitante, buscado));
  const { equipo: r, jugadores } = resumenEquipo(buscado, stats);
  const ficha = fichaRow as FichaRival | null;
  const fichaDe = (n: string) => ((fichasJug ?? []) as FichaJugador[]).find((f) => mismoEquipo(f.nombre, n));
  const nuestro = esTuro(buscado);

  // Nuestro equipo: periodos jugados por cada jugador en la temporada (del control de periodos)
  let periodosTemporada: { partidos: { id: string; fecha: string; rival: string; jornada: number | null }[]; filas: { nombre: string; dorsal: number | null; por: Record<string, number>; total: number }[] } | null = null;
  if (nuestro) {
    const [{ data: ps }, { data: plantilla }] = await Promise.all([
      supabase.from("partidos").select("id, fecha, rival, jornada").eq("equipo_id", equipo.id).order("fecha"),
      supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", equipo.id),
    ]);
    const ids = (ps ?? []).map((x) => x.id);
    const { data: pp } = ids.length ? await supabase.from("partido_periodos").select("partido_id, jugador_id, periodos").in("partido_id", ids) : { data: [] };
    const conDatos = new Set((pp ?? []).map((x) => x.partido_id as string));
    const partidos = (ps ?? []).filter((x) => conDatos.has(x.id));
    const filas = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[]).map((x) => {
      const por: Record<string, number> = {};
      for (const r of pp ?? []) if (r.jugador_id === x.jugadores.id) por[r.partido_id as string] = (r.periodos as number[]).length;
      return { nombre: `${x.jugadores.nombre} ${x.jugadores.apellidos ?? ""}`.trim(), dorsal: x.dorsal, por, total: Object.values(por).reduce((a, b) => a + b, 0) };
    }).sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
    if (partidos.length) periodosTemporada = { partidos, filas };
  }

  // Balance con los resultados (más completos que las estadísticas)
  const jugados = resultados.filter((x) => x.pl !== null && x.pv !== null);
  const deEl = (x: ResultadoLiga) => (mismoEquipo(x.local, buscado) ? [x.pl!, x.pv!] : [x.pv!, x.pl!]);
  const g = jugados.filter((x) => deEl(x)[0] > deEl(x)[1]).length;
  const pf = jugados.reduce((s, x) => s + deEl(x)[0], 0), pc = jugados.reduce((s, x) => s + deEl(x)[1], 0);

  const valor = (k: string) => {
    const v = ficha?.caracteristicas?.[k];
    return Array.isArray(v) ? v.join(", ") : v ?? "";
  };
  const Dato = ({ t, v, sub }: { t: string; v: string; sub?: string }) => (
    <div className="tarjeta p-3 text-center">
      <div className="text-2xl font-bold tabular-nums text-azul">{v}</div>
      <div className="text-[11px] uppercase tracking-wide text-tinta/50">{t}</div>
      {sub && <div className="text-[11px] text-tinta/40">{sub}</div>}
    </div>
  );

  return (
    <div>
      <Link href="/scouting" className="text-sm text-tinta/60 hover:underline">← Scouting</Link>
      <h1 className="mt-1 text-2xl font-semibold">{buscado}</h1>
      <p className="text-sm text-tinta/60">{nuestro ? "Nuestro equipo" : `Rival de ${equipo.nombre}`} · {jugados.length} partidos jugados · {r.pj} con estadísticas</p>

      <div className="mt-4"><InformeRival supabase={supabase} equipoId={equipo.id} nombre={buscado} /></div>

      {/* Números del equipo */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Dato t="Balance" v={`${g}-${jugados.length - g}`} />
        <Dato t="Puntos a favor" v={media(pf, jugados.length)} sub="por partido" />
        <Dato t="Puntos en contra" v={media(pc, jugados.length)} sub="por partido" />
        <Dato t="Triples" v={media(r.t3, r.pj)} sub="anotados / partido" />
        <Dato t="Tiros libres" v={pct(r.tlm, r.tla)} sub={`${media(r.tlm, r.pj)} de ${media(r.tla, r.pj)} / partido`} />
        <Dato t="Faltas" v={media(r.fc, r.pj)} sub="por partido" />
      </div>

      {r.pj > 0 && r.porPeriodoF.length > 0 && (
        <div className="tarjeta mt-3 overflow-x-auto p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-tinta/50">Puntos por periodo (media)</p>
          <table className="text-sm tabular-nums">
            <thead><tr className="text-xs text-tinta/50"><th />{r.porPeriodoF.map((_, i) => <th key={i} className="px-3 font-normal">{i + 1}º</th>)}</tr></thead>
            <tbody>
              <tr><td className="pr-3 text-xs text-tinta/60">Anotados</td>{r.porPeriodoF.map((v, i) => <td key={i} className="px-3 text-center font-semibold">{media(v, r.pj)}</td>)}</tr>
              <tr><td className="pr-3 text-xs text-tinta/60">Recibidos</td>{r.porPeriodoC.map((v, i) => <td key={i} className="px-3 text-center">{media(v, r.pj)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {/* Jugadores */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Jugadores</h2>
            {jugadores.length === 0 ? (
              <p className="tarjeta mt-2 p-3 text-sm text-tinta/60">Sin estadísticas todavía. Se descargan con «Actualizar desde la FCBQ».</p>
            ) : (
              <div className="tarjeta mt-2 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">Jugador</th>
                      <th className="px-2 py-2 text-center">PJ</th><th className="px-2 py-2 text-center">Min</th>
                      <th className="px-2 py-2 text-center">Pts</th><th className="px-2 py-2 text-center" title="Canastas de 2 por partido">T2</th>
                      <th className="px-2 py-2 text-center" title="Triples por partido">T3</th><th className="px-2 py-2 text-center" title="Tiros libres">TL</th>
                      <th className="px-2 py-2 text-center" title="Faltas por partido">F</th><th className="px-2 py-2 text-center" title="+/- por partido">+/-</th>
                      <th className="px-2 py-2 text-center" title="Máximo de puntos en un partido">Máx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadores.map((j, i) => {
                      const f = fichaDe(j.nombre);
                      const destacado = i < 3 && j.pts / j.pj >= 6;
                      return (
                        <tr key={j.uuid ?? j.nombre} className="border-t border-linea align-top">
                          <td className="px-2 py-1.5 text-tinta/60">{j.dorsal}</td>
                          <td className="px-2 py-1.5">
                            <details>
                              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                <span className={destacado ? "font-semibold text-rojo" : ""}>{j.nombre}</span>
                                {f && (f.notas || f.caracteristicas?.etiquetas?.length || f.caracteristicas?.posicion) && <NotebookPen size={12} className="ml-1 inline text-oro" />}
                                {f?.caracteristicas?.etiquetas?.length ? <span className="block text-[11px] text-tinta/60">{[f.caracteristicas.posicion, ...f.caracteristicas.etiquetas].filter(Boolean).join(" · ")}</span> : null}
                                {f?.notas && <span className="block max-w-xs whitespace-pre-line text-[11px] text-tinta/60">{f.notas}</span>}
                              </summary>
                              <form action={guardarFichaJugador} className="mt-2 grid max-w-sm gap-2 rounded-lg bg-suave p-2">
                                <input type="hidden" name="equipo_id" value={equipo.id} />
                                <input type="hidden" name="rival" value={buscado} />
                                <input type="hidden" name="nombre" value={j.nombre} />
                                <input type="hidden" name="dorsal" value={j.dorsal} />
                                <div className="grid grid-cols-2 gap-2">
                                  <select name="posicion" defaultValue={f?.caracteristicas?.posicion ?? ""} className="campo !py-1 text-xs"><option value="">Posición</option>{POSICIONES.map((p) => <option key={p}>{p}</option>)}</select>
                                  <select name="mano" defaultValue={f?.caracteristicas?.mano ?? ""} className="campo !py-1 text-xs"><option value="">Mano</option><option>Diestro</option><option>Zurdo</option></select>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {ETIQUETAS_JUGADOR.map((t) => (
                                    <label key={t} className="cursor-pointer">
                                      <input type="checkbox" name="etiquetas" value={t} defaultChecked={f?.caracteristicas?.etiquetas?.includes(t)} className="peer sr-only" />
                                      <span className="block rounded-full border border-linea bg-white px-2 py-0.5 text-[11px] peer-checked:border-azul peer-checked:bg-azul peer-checked:text-white">{t}</span>
                                    </label>
                                  ))}
                                </div>
                                <textarea name="notas" rows={2} defaultValue={f?.notas ?? ""} placeholder="Cómo defenderle, qué hace…" className="campo !py-1 text-xs" />
                                <Enviar className="btn-primario !py-1 text-xs">Guardar ficha</Enviar>
                              </form>
                            </details>
                          </td>
                          <td className="px-2 py-1.5 text-center">{j.pj}</td>
                          <td className="px-2 py-1.5 text-center">{minutos(j.seg, j.pj)}</td>
                          <td className="px-2 py-1.5 text-center font-semibold">{media(j.pts, j.pj)}</td>
                          <td className="px-2 py-1.5 text-center">{media(j.t2, j.pj)}</td>
                          <td className="px-2 py-1.5 text-center">{media(j.t3, j.pj)}</td>
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">{j.tla ? `${j.tlm}/${j.tla}` : "–"} <span className="text-[11px] text-tinta/50">{pct(j.tlm, j.tla)}</span></td>
                          <td className="px-2 py-1.5 text-center">{media(j.fc, j.pj)}</td>
                          <td className={`px-2 py-1.5 text-center ${j.mm > 0 ? "text-green-700" : j.mm < 0 ? "text-rojo" : ""}`}>{media(j.mm, j.pj)}</td>
                          <td className="px-2 py-1.5 text-center">{j.maxPts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-1 text-xs text-tinta/50">Medias por partido jugado. Toca un nombre para su ficha. En rojo, los máximos anotadores.</p>
          </section>

          {periodosTemporada && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Periodos jugados en la temporada</h2>
              <div className="tarjeta mt-2 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-suave text-xs text-tinta/60">
                    <tr>
                      <th className="px-2 py-2 text-left">Jugador</th>
                      {periodosTemporada.partidos.map((x) => (
                        <th key={x.id} className="px-1 py-2 text-center font-normal"><Link href={`/partidos/${x.id}`} className="hover:underline" title={x.rival}>{x.jornada ? `J${x.jornada}` : fecha(x.fecha)}</Link></th>
                      ))}
                      <th className="px-2 py-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodosTemporada.filas.map((f) => (
                      <tr key={f.nombre} className="border-t border-linea">
                        <td className="whitespace-nowrap px-2 py-1"><span className="mr-1 text-xs text-tinta/50">{f.dorsal ?? ""}</span>{f.nombre}</td>
                        {periodosTemporada!.partidos.map((x) => <td key={x.id} className={`px-1 py-1 text-center ${f.por[x.id] === undefined ? "text-tinta/30" : ""}`}>{f.por[x.id] ?? "·"}</td>)}
                        <td className="px-2 py-1 text-center font-semibold">{f.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-tinta/50">Sale del control de periodos de cada partido.</p>
            </section>
          )}

          {stats.length > 0 && <Sinergias nombre={buscado} stats={stats} />}

          {/* Resultados */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Resultados</h2>
            <ul className="tarjeta mt-2 divide-y divide-linea text-sm">
              {resultados.map((x, i) => {
                const [a, b] = x.pl !== null ? deEl(x) : [null, null];
                const casa = mismoEquipo(x.local, buscado);
                return (
                  <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="w-14 shrink-0 text-xs text-tinta/50">{x.jornada ? `J${x.jornada}` : ""} {fecha(`${x.dia}T12:00:00Z`)}</span>
                    <span className="min-w-0 flex-1 truncate">{casa ? "vs" : "@"} {casa ? x.visitante : x.local}</span>
                    {a !== null && b !== null ? (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold tabular-nums text-white ${a > b ? "bg-green-600" : a < b ? "bg-rojo" : "bg-tinta/50"}`}>{a}-{b}</span>
                    ) : <span className="text-xs text-tinta/40">{x.hora}</span>}
                    {x.statsId && <a href={`https://www.basquetcatala.cat/estadistica/partit/${x.statsId}`} target="_blank" rel="noreferrer" className="text-xs text-azul underline">FCBQ</a>}
                  </li>
                );
              })}
              {!resultados.length && <li className="px-3 py-3 text-tinta/50">Sin resultados.</li>}
            </ul>
          </section>
        </div>

        {/* Ficha del equipo */}
        <form action={guardarFichaRival} className="tarjeta h-fit space-y-2 p-4">
          <h2 className="flex items-center gap-2 font-semibold"><NotebookPen size={18} className="text-oro" /> Ficha {nuestro ? "del equipo" : "del rival"}</h2>
          {ficha?.updated_at && <p className="text-xs text-tinta/50">Actualizada el {fecha(ficha.updated_at)}</p>}
          <input type="hidden" name="equipo_id" value={equipo.id} />
          <input type="hidden" name="nombre" value={buscado} />
          {CAMPOS_EQUIPO.map((c) => (
            <div key={c.k}>
              <label className="etiqueta">{c.label}</label>
              {c.opciones ? (
                <select name={`c_${c.k}`} defaultValue={valor(c.k)} className="campo !py-1.5">
                  <option value="">—</option>
                  {c.opciones.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <textarea name={`c_${c.k}`} rows={2} defaultValue={valor(c.k)} placeholder={c.placeholder} className="campo !py-1.5 text-sm" />
              )}
            </div>
          ))}
          <div>
            <label className="etiqueta">Notas</label>
            <textarea name="notas" rows={4} defaultValue={ficha?.notas ?? ""} placeholder="Entrenador, pista, horarios, lo que vimos en la primera vuelta…" className="campo text-sm" />
          </div>
          <Enviar>Guardar ficha</Enviar>
        </form>
      </div>
    </div>
  );
}
