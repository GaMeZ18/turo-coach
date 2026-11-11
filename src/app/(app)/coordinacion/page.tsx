import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { todas } from "@/lib/db";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { aISO, fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import { lunesDe, solapes, sumarDias, type Ocupacion, type Pista } from "@/lib/pistas";
import AltaRapida from "./AltaRapida";
import { AlertTriangle, CalendarCheck, ClipboardList, Gauge, MapPin, Trophy, UserX, Users, BellRing, Eye } from "lucide-react";

type Ent = { id: string; equipo_id: string; fecha: string; duracion_prevista: number | null; lugar: string | null };
const pc = (a: number, b: number) => (b ? Math.round((a * 100) / b) : null);

export default async function Coordinacion() {
  const { supabase, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");
  const { temporada, equipos } = await equiposDeTemporada(supabase);
  const ids = equipos.map((e) => e.id);
  const hoy = hoyLocal();
  const lunes = lunesDe(hoy);
  const ahora = new Date().toISOString();
  const iniSemana = aISO(lunes, "00:00"), finSemana = aISO(sumarDias(lunes, 7), "00:00");
  const hace14 = aISO(sumarDias(hoy, -14), "00:00"), hace30 = aISO(sumarDias(hoy, -30), "00:00");
  const en7 = aISO(sumarDias(hoy, 8), "00:00");

  const [{ data: entR }, { data: asisR }, { data: partR }, { data: staffR }, { data: pistasR }, { data: ocupR }] = await Promise.all([
    supabase.from("entrenamientos").select("id, equipo_id, fecha, duracion_prevista, lugar").is("anulado_motivo", null).in("equipo_id", ids).gte("fecha", hace30).lt("fecha", finSemana),
    todas((a, b) => supabase.from("asistencias").select("jugador_id, estado, entrenamiento_id, entrenamientos!inner(fecha, equipo_id), jugadores(nombre, apellidos)").gte("entrenamientos.fecha", hace30).lte("entrenamientos.fecha", ahora).order("entrenamiento_id").order("jugador_id").range(a, b)),
    supabase.from("partidos").select("id, equipo_id, fecha, rival, local, lugar, puntos_favor, puntos_contra").in("equipo_id", ids).order("fecha"),
    supabase.from("equipo_staff").select("equipo_id, funcion, perfiles(nombre)").in("equipo_id", ids),
    supabase.from("pistas").select("id, nombre, capacidad, orden, notas"),
    supabase.rpc("ocupacion_pistas", { desde: iniSemana, hasta: finSemana }),
  ]);
  const entrenos = (entR ?? []) as Ent[];
  const semana = entrenos.filter((e) => e.fecha >= iniSemana);
  // Entrenos recientes (14 días) y los de esta semana: qué se ha montado en cada uno
  const recientes = entrenos.filter((e) => e.fecha >= hace14).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const { data: actR } = recientes.length ? await supabase.from("entreno_actividades").select("entrenamiento_id, titulo, duracion, orden").in("entrenamiento_id", recientes.map((e) => e.id)).order("orden") : { data: [] };
  const actividades = (actR ?? []) as { entrenamiento_id: string; titulo: string | null; duracion: number | null }[];
  const conActividades = new Set(actividades.map((a) => a.entrenamiento_id));

  const asis = (asisR ?? []) as unknown as { jugador_id: string; estado: string; entrenamiento_id: string; entrenamientos: { fecha: string; equipo_id: string }; jugadores: { nombre: string; apellidos: string | null } | null }[];
  const conLista = new Set(asis.map((a) => a.entrenamiento_id));
  const pasados14 = entrenos.filter((e) => e.fecha >= hace14 && e.fecha <= ahora);
  const sinLista = pasados14.filter((e) => !conLista.has(e.id));
  const presente = (a: { estado: string }) => a.estado === "presente" || a.estado === "tarde";
  // Los justificados no cuentan para el % (ni a favor ni en contra)
  const cuenta = (a: { estado: string }) => a.estado !== "justificado";
  const pcAsis = (l: { estado: string }[]) => pc(l.filter(presente).length, l.filter(cuenta).length);

  const partidos = (partR ?? []) as { id: string; equipo_id: string; fecha: string; rival: string; local: boolean; lugar: string | null; puntos_favor: number | null; puntos_contra: number | null }[];
  const proximos = partidos.filter((p) => p.fecha >= ahora && p.fecha < en7);
  const staff = (staffR ?? []) as unknown as { equipo_id: string; funcion: string; perfiles: { nombre: string | null } | null }[];
  const choques = solapes((ocupR ?? []) as Ocupacion[], (pistasR ?? []) as Pista[]);
  const nombreEq = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";

  // Jugadores que faltan mucho (últimos 30 días, mínimo 4 entrenos con lista)
  const porJugador = new Map<string, { nombre: string; equipo: string; n: number; p: number }>();
  for (const a of asis) {
    const k = `${a.jugador_id}|${a.entrenamientos.equipo_id}`;
    const x = porJugador.get(k) ?? { nombre: `${a.jugadores?.nombre ?? ""} ${a.jugadores?.apellidos ?? ""}`.trim(), equipo: a.entrenamientos.equipo_id, n: 0, p: 0 };
    if (cuenta(a)) x.n++; if (presente(a)) x.p++;
    porJugador.set(k, x);
  }
  const faltan = [...porJugador.values()].filter((x) => x.n >= 4 && x.p / x.n < 0.6).sort((a, b) => a.p / a.n - b.p / b.n);

  const filas = equipos.map((eq) => {
    const sem = semana.filter((e) => e.equipo_id === eq.id);
    const p14 = pasados14.filter((e) => e.equipo_id === eq.id);
    const a30 = asis.filter((a) => a.entrenamientos.equipo_id === eq.id);
    const jug = partidos.filter((p) => p.equipo_id === eq.id && p.puntos_favor !== null && p.puntos_contra !== null && p.fecha <= ahora);
    const g = jug.filter((p) => p.puntos_favor! > p.puntos_contra!).length;
    const prox = partidos.find((p) => p.equipo_id === eq.id && p.fecha >= ahora);
    const st = staff.filter((s) => s.equipo_id === eq.id);
    return {
      eq, sem: sem.length, planificados: sem.filter((e) => conActividades.has(e.id)).length,
      lista: p14.filter((e) => conLista.has(e.id)).length, p14: p14.length,
      asistencia: pcAsis(a30), g, pj: jug.length, prox,
      staff: st.map((s) => s.perfiles?.nombre?.split(" ")[0]).filter(Boolean).join(", "),
      choques: sem.filter((e) => choques.has(e.id)).length,
    };
  });
  const totalSem = semana.length, totalPlan = semana.filter((e) => conActividades.has(e.id)).length;
  const asisMedia = pcAsis(asis);
  const sinStaff = filas.filter((f) => !f.staff);

  const Kpi = ({ icono: I, v, t, alerta }: { icono: typeof Gauge; v: string | number; t: string; alerta?: boolean }) => (
    <div className={`tarjeta flex items-center gap-3 p-3 ${alerta ? "ring-2 ring-red-400" : ""}`}>
      <I size={22} className={alerta ? "text-red-600" : "text-azul"} />
      <div><div className="text-xl font-bold leading-none">{v}</div><div className="mt-0.5 text-[11px] uppercase tracking-wide text-tinta/60">{t}</div></div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Gauge className="text-azul" /> Panel del coordinador</h1>
          <p className="text-sm text-tinta/60">Temporada {temporada?.nombre ?? ""} · semana del {fechaCorta(iniSemana)} · {equipos.length} equipos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/exportar?equipo=todos" download className="btn-secundario"><FileSpreadsheet size={16} /> Exportar todo a Excel</a>
          <Link href="/coordinacion/asistencia" className="btn-secundario"><Users size={16} /> Asistencia general</Link>
          <Link href="/coordinacion/avisos" className="btn-secundario"><BellRing size={16} /> Avisos activados</Link>
          <Link href="/coordinacion/visitas" className="btn-secundario"><Eye size={16} /> Visitas</Link>
          <AltaRapida equipos={equipos.map((e) => ({ id: e.id, nombre: e.nombre }))} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icono={CalendarCheck} v={`${totalPlan}/${totalSem}`} t="Entrenos planificados" alerta={totalSem > 0 && totalPlan < totalSem / 2} />
        <Kpi icono={ClipboardList} v={sinLista.length} t="Sin pasar lista (14 d)" alerta={sinLista.length > 0} />
        <Link href="/coordinacion/asistencia" className="block"><Kpi icono={Users} v={asisMedia === null ? "–" : `${asisMedia}%`} t="Asistencia (30 d) ›" alerta={asisMedia !== null && asisMedia < 70} /></Link>
        <Kpi icono={UserX} v={faltan.length} t="Jugadores que faltan" alerta={faltan.length > 0} />
        <Kpi icono={MapPin} v={choques.size} t="Choques de pista" alerta={choques.size > 0} />
        <Kpi icono={Trophy} v={proximos.length} t="Partidos (7 días)" />
      </div>

      {/* Tabla por equipo */}
      <div className="tarjeta mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Equipo</th><th className="p-2">Staff</th><th className="p-2 text-center">Semana<br />planif.</th><th className="p-2 text-center">Lista<br />14 días</th><th className="p-2 text-center">Asist.<br />30 días</th><th className="p-2 text-center">Balance</th><th className="p-2">Próximo partido</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.eq.id} className="border-t border-linea">
                <td className="p-2 font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: colorEquipo(f.eq.id, equipos) }} />{f.eq.nombre}</td>
                <td className={`p-2 text-xs ${f.staff ? "text-tinta/70" : "font-semibold text-red-700"}`}>{f.staff || "Sin entrenador"}</td>
                <td className="p-2 text-center">
                  <span className={f.sem === 0 ? "text-tinta/40" : f.planificados < f.sem ? "font-semibold text-amber-700" : "font-semibold text-green-700"}>{f.sem ? `${f.planificados}/${f.sem}` : "–"}</span>
                  {f.choques > 0 && <span className="ml-1 text-red-600" title="Coincide en la pista con otro equipo">⚠</span>}
                </td>
                <td className={`p-2 text-center ${f.p14 && f.lista < f.p14 ? "font-semibold text-red-700" : ""}`}>{f.p14 ? `${f.lista}/${f.p14}` : "–"}</td>
                <td className={`p-2 text-center font-semibold ${f.asistencia === null ? "text-tinta/40" : f.asistencia >= 80 ? "text-green-700" : f.asistencia >= 65 ? "text-amber-700" : "text-red-700"}`}>{f.asistencia === null ? "–" : `${f.asistencia}%`}</td>
                <td className="p-2 text-center">{f.pj ? `${f.g}-${f.pj - f.g}` : "–"}</td>
                <td className="p-2 text-xs">{f.prox ? <Link href={`/partidos/${f.prox.id}`} className="hover:underline"><span className="capitalize">{fechaCorta(f.prox.fecha)}</span> {hora(f.prox.fecha)} · {f.prox.local ? "vs" : "@"} {f.prox.rival}</Link> : <span className="text-tinta/40">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-tinta/50">Planificado = el entreno tiene ejercicios o actividades. Lista = se ha pasado asistencia.</p>

      {/* Entrenos de cada equipo: qué se ha montado y asistencia, día a día */}
      <section className="mt-5">
        <h2 className="flex items-center gap-2 font-semibold"><ClipboardList size={17} className="text-azul" /> Entrenos de cada equipo (últimos 14 días y esta semana)</h2>
        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          {equipos.map((eq) => {
            const es = recientes.filter((e) => e.equipo_id === eq.id);
            const pasados = es.filter((e) => e.fecha <= ahora);
            const sinListaEq = pasados.filter((e) => !conLista.has(e.id)).length;
            const sinMontar = es.filter((e) => !conActividades.has(e.id)).length;
            const aEq = asis.filter((a) => a.entrenamientos.equipo_id === eq.id && a.entrenamientos.fecha >= hace14);
            const pEq = pcAsis(aEq);
            return (
              <details key={eq.id} className="tarjeta p-3" open={sinListaEq > 0 || sinMontar > 0}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: colorEquipo(eq.id, equipos) }} />{eq.nombre}</span>
                  <span className="text-xs text-tinta/60">{es.length} entrenos</span>
                  {pEq !== null && <span className={`text-xs font-semibold ${pEq >= 80 ? "text-green-700" : pEq >= 65 ? "text-amber-700" : "text-red-700"}`}>asistencia {pEq}%</span>}
                  {sinListaEq > 0 && <span className="rounded bg-red-50 px-1.5 text-[11px] font-semibold text-red-700">{sinListaEq} sin lista</span>}
                  {sinMontar > 0 && <span className="rounded bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-800">{sinMontar} sin montar</span>}
                </summary>
                {es.length === 0 ? <p className="mt-2 text-sm text-tinta/50">No tiene entrenos en estas fechas.</p> : (
                  <ul className="mt-2 divide-y divide-linea text-sm">
                    {es.map((e) => {
                      const act = actividades.filter((a) => a.entrenamiento_id === e.id);
                      const lista = asis.filter((a) => a.entrenamiento_id === e.id);
                      const hecho = e.fecha <= ahora;
                      const minutos = act.reduce((s2, a) => s2 + (a.duracion ?? 0), 0);
                      return (
                        <li key={e.id} className="flex gap-2 py-1.5">
                          <Link href={`/entrenamientos/${e.id}`} className="w-24 shrink-0 text-xs capitalize text-tinta/60 hover:underline">{fechaCorta(e.fecha)}<br />{hora(e.fecha)}{e.lugar ? ` · ${e.lugar}` : ""}</Link>
                          <div className="min-w-0 flex-1">
                            {act.length ? (
                              <p className="text-xs"><span className="text-tinta/50">{act.length} actividades{minutos ? ` · ${minutos}′` : ""}:</span> {act.slice(0, 4).map((a) => a.titulo).filter(Boolean).join(" · ")}{act.length > 4 ? ` y ${act.length - 4} más` : ""}</p>
                            ) : <p className="text-xs font-semibold text-amber-800">Sin montar (no tiene ejercicios)</p>}
                          </div>
                          <div className="w-24 shrink-0 text-right text-xs">
                            {!hecho ? <span className="text-tinta/40">Pendiente</span>
                              : lista.length ? <span className="font-semibold">{lista.filter(presente).length}/{lista.filter(cuenta).length} <span className={(pcAsis(lista) ?? 0) >= 80 ? "text-green-700" : "text-amber-700"}>({pcAsis(lista)}%)</span>{lista.some((a) => a.estado === "justificado") && <span className="text-tinta/50"> · {lista.filter((a) => a.estado === "justificado").length} J</span>}</span>
                              : <span className="font-semibold text-red-700">Sin lista</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </details>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="tarjeta p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Trophy size={17} className="text-rojo" /> Partidos de los próximos 7 días</h2>
          {proximos.length === 0 ? <p className="mt-2 text-sm text-tinta/50">No hay partidos.</p> : (
            <ul className="mt-2 divide-y divide-linea text-sm">
              {proximos.map((p) => (
                <li key={p.id} className="flex items-baseline gap-2 py-1.5">
                  <span className="w-24 shrink-0 text-xs capitalize text-tinta/60">{fechaCorta(p.fecha)} {hora(p.fecha)}</span>
                  <Link href={`/partidos/${p.id}`} className="min-w-0 flex-1 hover:underline"><strong>{nombreEq(p.equipo_id)}</strong> {p.local ? "vs" : "@"} {p.rival}</Link>
                  <span className="hidden max-w-40 truncate text-xs text-tinta/50 sm:inline">{p.local ? "🏠 " : ""}{p.lugar}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta p-4">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} className="text-amber-600" /> Avisos</h2>
          <div className="mt-2 space-y-3 text-sm">
            {sinStaff.length > 0 && <p><strong>Equipos sin entrenador:</strong> {sinStaff.map((f) => f.eq.nombre).join(", ")}. <Link href="/club" className="text-azul underline">Asignar</Link></p>}
            {choques.size > 0 && <p><strong>{choques.size} entrenos</strong> coinciden en la misma pista esta semana. <Link href="/pistas" className="text-azul underline">Ver reparto de pistas</Link></p>}
            {sinLista.length > 0 && (
              <div>
                <p className="font-semibold">Entrenos sin pasar lista (últimos 14 días)</p>
                <ul className="mt-1 space-y-0.5">
                  {sinLista.slice(0, 10).map((e) => (
                    <li key={e.id}><Link href={`/entrenamientos/${e.id}`} className="hover:underline"><span className="capitalize">{fechaCorta(e.fecha)}</span> · {nombreEq(e.equipo_id)}</Link></li>
                  ))}
                  {sinLista.length > 10 && <li className="text-tinta/50">y {sinLista.length - 10} más…</li>}
                </ul>
              </div>
            )}
            {faltan.length > 0 && (
              <div>
                <p className="font-semibold">Jugadores con asistencia baja (menos del 60 % en 30 días)</p>
                <ul className="mt-1 space-y-0.5">
                  {faltan.slice(0, 12).map((j, i) => (
                    <li key={i} className="flex justify-between gap-2"><span>{j.nombre} <span className="text-xs text-tinta/50">· {nombreEq(j.equipo)}</span></span><span className="font-semibold text-red-700">{pc(j.p, j.n)}% ({j.p}/{j.n})</span></li>
                  ))}
                </ul>
              </div>
            )}
            {!sinStaff.length && !choques.size && !sinLista.length && !faltan.length && <p className="text-green-700">Todo en orden. 👌</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
