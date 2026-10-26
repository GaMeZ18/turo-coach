import { requireUser } from "@/lib/supabase/server";
import { todas } from "@/lib/db";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaCorta } from "@/lib/fechas";
import { media, minutos, pct, resumenEquipo, type StatsPartido } from "@/lib/stats-fcbq";
import BotonImprimir from "../entreno/[id]/Imprimir";

export const metadata = { title: "Informe de temporada · Coach Manager CBTuró" };

const esTuro = (s: string) => /TURO/.test(s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase());
const pc = (a: number, b: number) => (b ? Math.round((a * 100) / b) : 0);

type Jug = { id: string; nombre: string; dorsal: number | null };

export default async function InformeTemporada() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <main className="p-8 text-center">Elige primero un equipo.</main>;
  const ahora = new Date().toISOString();

  const [
    { data: temporada }, { data: entrenos }, { data: plantilla }, { data: asis }, { data: partidos },
    { data: convs }, { data: periodos }, { data: stats }, { data: objs }, { data: acts },
  ] = await Promise.all([
    supabase.from("temporadas").select("nombre").eq("id", equipo.temporada_id).maybeSingle(),
    supabase.from("entrenamientos").select("id, fecha, duracion_prevista").eq("equipo_id", equipo.id).lte("fecha", ahora),
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", equipo.id),
    todas((a, b) => supabase.from("asistencias").select("jugador_id, estado, entrenamiento_id, entrenamientos!inner(equipo_id, fecha)").eq("entrenamientos.equipo_id", equipo.id).lte("entrenamientos.fecha", ahora).order("entrenamiento_id").order("jugador_id").range(a, b)),
    supabase.from("partidos").select("id, fecha, rival, local, puntos_favor, puntos_contra, competicion, jornada").eq("equipo_id", equipo.id).order("fecha"),
    supabase.from("convocatorias").select("jugador_id, partidos!inner(equipo_id)").eq("partidos.equipo_id", equipo.id),
    supabase.from("partido_periodos").select("jugador_id, periodos, partidos!inner(equipo_id)").eq("partidos.equipo_id", equipo.id),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipo.id),
    supabase.from("entreno_objetivos").select("objetivo_id, objetivos(nombre, color), entrenamientos!inner(equipo_id)").eq("entrenamientos.equipo_id", equipo.id),
    todas((a, b) => supabase.from("entreno_actividades").select("id, ejercicio_id, tipo, duracion, ejercicios(titulo, categoria), entrenamientos!inner(equipo_id, fecha)").eq("entrenamientos.equipo_id", equipo.id).lte("entrenamientos.fecha", ahora).order("id").range(a, b)),
  ]);

  const jugadores: Jug[] = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .map((p) => ({ id: p.jugadores.id, dorsal: p.dorsal, nombre: `${p.jugadores.nombre} ${p.jugadores.apellidos ?? ""}`.trim() }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));

  // --- Entrenos y asistencia ---
  const nEntrenos = (entrenos ?? []).length;
  const minEntreno = (entrenos ?? []).reduce((s, e) => s + (e.duracion_prevista ?? 0), 0);
  const registros = (asis ?? []) as { jugador_id: string; estado: string }[];
  const asistencia = jugadores.map((j) => {
    const r = registros.filter((x) => x.jugador_id === j.id);
    const n = (v: string) => r.filter((x) => x.estado === v).length;
    return { ...j, total: r.length, p: n("presente"), t: n("tarde"), jus: n("justificado"), l: n("lesionado"), a: n("ausente") };
  });
  const totalReg = registros.length;
  const mediaAsis = pc(registros.filter((x) => x.estado === "presente" || x.estado === "tarde").length, totalReg);

  // --- Partidos ---
  const ps = (partidos ?? []) as { id: string; fecha: string; rival: string; local: boolean; puntos_favor: number | null; puntos_contra: number | null; competicion: string | null; jornada: number | null }[];
  const jugados = ps.filter((p) => p.puntos_favor !== null && p.puntos_contra !== null && p.fecha <= ahora);
  const g = jugados.filter((p) => p.puntos_favor! > p.puntos_contra!).length;
  const pf = jugados.reduce((s, p) => s + p.puntos_favor!, 0), pcn = jugados.reduce((s, p) => s + p.puntos_contra!, 0);
  const casa = jugados.filter((p) => p.local), fuera = jugados.filter((p) => !p.local);
  const gan = (l: typeof jugados) => l.filter((p) => p.puntos_favor! > p.puntos_contra!).length;
  const convocado = (id: string) => (convs ?? []).filter((c) => c.jugador_id === id).length;
  const periodosDe = (id: string) => (periodos ?? []).filter((c) => c.jugador_id === id).reduce((s, c) => s + ((c.periodos as number[]) ?? []).length, 0);

  // --- Estadísticas de la FCBQ ---
  const lista = ((stats ?? []) as { datos: StatsPartido }[]).map((s) => s.datos).filter(Boolean);
  const nuestro = lista.map((s) => [s.local.nombre, s.visitante.nombre]).flat().find(esTuro) ?? "";
  const fcbq = nuestro ? resumenEquipo(nuestro, lista) : null;

  // --- Contenido de los entrenos ---
  const contObj = new Map<string, { nombre: string; color: string | null; n: number }>();
  for (const o of (objs ?? []) as unknown as { objetivo_id: string; objetivos: { nombre: string; color: string | null } | null }[]) {
    if (!o.objetivos) continue;
    const x = contObj.get(o.objetivo_id) ?? { ...o.objetivos, n: 0 };
    x.n++; contObj.set(o.objetivo_id, x);
  }
  const objetivos = [...contObj.values()].sort((a, b) => b.n - a.n);
  const porCategoria = new Map<string, number>();
  const porEjercicio = new Map<string, { titulo: string; n: number }>();
  for (const a of (acts ?? []) as unknown as { ejercicio_id: string | null; tipo: string; duracion: number; ejercicios: { titulo: string; categoria: string | null } | null }[]) {
    const cat = a.ejercicios?.categoria ?? (a.tipo === "ejercicio" ? "Sin categoría" : a.tipo[0].toUpperCase() + a.tipo.slice(1));
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + (a.duracion || 0));
    if (a.ejercicio_id && a.ejercicios) {
      const x = porEjercicio.get(a.ejercicio_id) ?? { titulo: a.ejercicios.titulo, n: 0 };
      x.n++; porEjercicio.set(a.ejercicio_id, x);
    }
  }
  const categorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  const totalCat = categorias.reduce((s, [, v]) => s + v, 0);
  const topEjercicios = [...porEjercicio.values()].sort((a, b) => b.n - a.n).slice(0, 10);

  const Seccion = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-b-2 border-azul pb-1 text-sm font-bold uppercase tracking-wide text-azul">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
  const Dato = ({ v, t }: { v: string | number; t: string }) => (
    <div className="rounded-lg border border-linea p-2 text-center"><div className="text-xl font-bold text-azul">{v}</div><div className="text-[10px] uppercase tracking-wide text-tinta/60">{t}</div></div>
  );

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-tinta print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: white } }`}</style>
      <BotonImprimir volver="/entrenamientos" texto="← Volver" />

      <header className="flex items-center gap-4 border-b-4 border-azul pb-3">
        <img src="/marca/escudo-128.png" alt="" className="h-16 w-auto" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-rojo">CB Turó de la Peira · Temporada {temporada?.nombre ?? ""}</p>
          <h1 className="text-2xl font-bold">Informe de temporada · {equipo.nombre}</h1>
          <p className="text-sm text-tinta/70">Datos hasta el {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" })}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Dato v={nEntrenos} t="Entrenos" />
        <Dato v={`${Math.round(minEntreno / 60)} h`} t="Entrenadas" />
        <Dato v={totalReg ? `${mediaAsis}%` : "–"} t="Asistencia" />
        <Dato v={jugados.length} t="Partidos" />
        <Dato v={`${g}-${jugados.length - g}`} t="Balance" />
        <Dato v={jugados.length ? `${(pf / jugados.length).toFixed(1)} / ${(pcn / jugados.length).toFixed(1)}` : "–"} t="PF / PC" />
      </div>

      <Seccion titulo="Asistencia a los entrenos">
        {totalReg === 0 ? <p className="text-sm text-tinta/60">Todavía no se ha pasado lista en ningún entreno.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-tinta/30 text-left text-[11px] uppercase text-tinta/60">
              <th className="py-1">#</th><th>Jugador</th><th className="text-center">Pres.</th><th className="text-center">Tarde</th><th className="text-center">Just.</th><th className="text-center">Les.</th><th className="text-center">Aus.</th><th className="w-32 text-right">% asistencia</th>
            </tr></thead>
            <tbody>
              {asistencia.map((j) => {
                const v = pc(j.p + j.t, j.total);
                return (
                  <tr key={j.id} className="border-b border-linea">
                    <td className="py-1 text-xs font-semibold text-azul">{j.dorsal ?? ""}</td><td>{j.nombre}</td>
                    <td className="text-center">{j.p}</td><td className="text-center">{j.t}</td><td className="text-center">{j.jus}</td><td className="text-center">{j.l}</td><td className="text-center">{j.a}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-linea"><span className={`block h-full ${v >= 80 ? "bg-green-600" : v >= 60 ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${v}%` }} /></span>
                        <strong>{j.total ? `${v}%` : "–"}</strong>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Seccion>

      <Seccion titulo="Resultados">
        {ps.length === 0 ? <p className="text-sm text-tinta/60">No hay partidos.</p> : (
          <>
            {jugados.length > 0 && <p className="mb-2 text-sm">En casa <strong>{gan(casa)}-{casa.length - gan(casa)}</strong> · Fuera <strong>{gan(fuera)}-{fuera.length - gan(fuera)}</strong> · Diferencia media <strong>{((pf - pcn) / jugados.length).toFixed(1)}</strong></p>}
            <table className="w-full text-sm">
              <tbody>
                {ps.map((p) => {
                  const res = p.puntos_favor !== null && p.puntos_contra !== null;
                  const v = res && p.puntos_favor! > p.puntos_contra!;
                  return (
                    <tr key={p.id} className="border-b border-linea">
                      <td className="w-24 py-1 text-xs capitalize text-tinta/60">{fechaCorta(p.fecha)}</td>
                      <td className="w-10 text-xs text-tinta/60">{p.jornada ? `J${p.jornada}` : ""}</td>
                      <td>{p.local ? "vs" : "@"} {p.rival}</td>
                      <td className="w-24 text-right font-semibold tabular-nums">{res ? <><span className={v ? "text-green-700" : "text-red-700"}>{v ? "V" : "D"}</span> {p.puntos_favor}-{p.puntos_contra}</> : <span className="font-normal text-tinta/40">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </Seccion>

      <Seccion titulo="Jugadores: convocatorias, periodos y estadísticas FCBQ">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-tinta/30 text-left text-[11px] uppercase text-tinta/60">
            <th className="py-1">#</th><th>Jugador</th><th className="text-center">Conv.</th><th className="text-center">Periodos</th>
            {fcbq && <><th className="text-center">PJ</th><th className="text-center">Min</th><th className="text-center">Pts</th><th className="text-center">T3</th><th className="text-center">TL</th><th className="text-center">Faltas</th><th className="text-center">+/-</th></>}
          </tr></thead>
          <tbody>
            {jugadores.map((j) => {
              const f = fcbq?.jugadores.find((x) => j.dorsal !== null ? Number(x.dorsal) === j.dorsal : x.nombre.toLowerCase().includes(j.nombre.split(" ")[0].toLowerCase()));
              return (
                <tr key={j.id} className="border-b border-linea">
                  <td className="py-1 text-xs font-semibold text-azul">{j.dorsal ?? ""}</td><td>{j.nombre}</td>
                  <td className="text-center">{convocado(j.id) || "–"}</td><td className="text-center">{periodosDe(j.id) || "–"}</td>
                  {fcbq && (f ? <>
                    <td className="text-center">{f.pj}</td><td className="text-center">{minutos(f.seg, f.pj)}</td><td className="text-center font-semibold">{media(f.pts, f.pj)}</td>
                    <td className="text-center">{media(f.t3, f.pj)}</td><td className="text-center">{pct(f.tlm, f.tla)}</td><td className="text-center">{media(f.fc, f.pj)}</td>
                    <td className={`text-center ${f.mm > 0 ? "text-green-700" : f.mm < 0 ? "text-red-700" : ""}`}>{f.mm > 0 ? "+" : ""}{f.mm}</td>
                  </> : <td colSpan={7} className="text-center text-xs text-tinta/40">sin datos FCBQ</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        {fcbq && <p className="mt-1 text-[11px] text-tinta/50">Promedios por partido de la FCBQ ({fcbq.equipo.pj} partidos con estadísticas). TL: % de tiros libres. +/-: total de la temporada con el jugador en pista.</p>}
      </Seccion>

      <Seccion titulo="Contenido de los entrenos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase text-tinta/60">Tiempo por tipo de trabajo</h3>
            {categorias.length === 0 ? <p className="text-sm text-tinta/50">Sin actividades.</p> : (
              <ul className="mt-1 space-y-1 text-sm">
                {categorias.map(([c, m]) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="w-28 truncate">{c}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-linea"><span className="block h-full bg-azul" style={{ width: `${pc(m, totalCat)}%` }} /></span>
                    <span className="w-20 text-right text-xs tabular-nums">{Math.round(m / 60 * 10) / 10} h · {pc(m, totalCat)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-tinta/60">Objetivos trabajados</h3>
            {objetivos.length === 0 ? <p className="text-sm text-tinta/50">No se han marcado objetivos en los entrenos.</p> : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {objetivos.slice(0, 12).map((o) => (
                  <li key={o.nombre} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: o.color ?? "#002b8e" }} />
                    <span className="flex-1 truncate">{o.nombre}</span><span className="text-xs text-tinta/60">{o.n} {o.n === 1 ? "entreno" : "entrenos"}</span>
                  </li>
                ))}
              </ul>
            )}
            {topEjercicios.length > 0 && (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase text-tinta/60">Ejercicios más usados</h3>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
                  {topEjercicios.map((e) => <li key={e.titulo}>{e.titulo} <span className="text-xs text-tinta/50">×{e.n}</span></li>)}
                </ol>
              </>
            )}
          </div>
        </div>
      </Seccion>

      <section className="mt-8 break-inside-avoid border-t border-linea pt-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-tinta/60">Valoración del cuerpo técnico</h2>
        <div className="mt-2 h-28 rounded-lg border border-dashed border-tinta/30 print:h-40" />
      </section>
    </main>
  );
}
