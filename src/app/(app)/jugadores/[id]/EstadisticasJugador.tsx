import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parecido } from "@/lib/emparejar";
import type { JugadorStats, StatsPartido } from "@/lib/stats-fcbq";

type Fila = { s: StatsPartido; yo: JugadorStats; rival: string; nuestros: number; suyos: number; partidoId: string | null };
const f1 = (x: number) => x.toFixed(1).replace(".", ",");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Estadísticas de la FCBQ del jugador, partido a partido, en los equipos donde está */
export default async function EstadisticasJugador({ supabase, jugador }: { supabase: SupabaseClient; jugador: { id: string; nombre: string; apellidos: string | null } }) {
  const { data: rels } = await supabase.from("equipo_jugadores").select("equipo_id, dorsal").eq("jugador_id", jugador.id);
  if (!rels?.length) return null;
  const ids = rels.map((r) => r.equipo_id as string);
  const [{ data: filas }, { data: partidos }, { data: per }] = await Promise.all([
    supabase.from("fcbq_stats").select("equipo_id, stats_id, datos").in("equipo_id", ids),
    supabase.from("partidos").select("id, fcbq_stats_id").in("equipo_id", ids).not("fcbq_stats_id", "is", null),
    supabase.from("partido_periodos").select("partido_id, periodos").eq("jugador_id", jugador.id),
  ]);
  const nombre = `${jugador.nombre} ${jugador.apellidos ?? ""}`;
  const dorsalDe = new Map(rels.map((r) => [r.equipo_id as string, r.dorsal as number | null]));
  const partidoDe = new Map((partidos ?? []).map((p) => [p.fcbq_stats_id as string, p.id as string]));
  const periodosDe = new Map((per ?? []).map((p) => [p.partido_id as string, (p.periodos as number[]) ?? []]));

  const lista: Fila[] = [];
  for (const f of (filas ?? []) as { equipo_id: string; stats_id: string; datos: StatsPartido }[]) {
    const s = f.datos;
    const lado = /TUR[OÓ]/i.test(s.local.nombre) ? "local" : /TUR[OÓ]/i.test(s.visitante.nombre) ? "visitante" : null;
    if (!lado) continue; // partidos de otros equipos de la liga
    let mejor: { j: JugadorStats; p: number } | null = null;
    for (const j of s[lado].jugadores) {
      const p = parecido(nombre, dorsalDe.get(f.equipo_id) ?? null, j.nombre, j.dorsal);
      if (p >= 2 && (!mejor || p > mejor.p)) mejor = { j, p };
    }
    if (!mejor) continue;
    const otro = lado === "local" ? s.visitante : s.local;
    lista.push({ s, yo: mejor.j, rival: otro.nombre, nuestros: s[lado].pts, suyos: otro.pts, partidoId: partidoDe.get(f.stats_id) ?? null });
  }
  lista.sort((a, b) => (a.s.fecha ?? "").localeCompare(b.s.fecha ?? ""));

  if (!lista.length) {
    return (
      <section className="mt-8">
        <h2 className="font-semibold">Estadísticas FCBQ</h2>
        <p className="tarjeta mt-2 p-3 text-sm text-tinta/60">Sin datos todavía. Se cargan con «Actualizar desde la FCBQ» (si el nombre o el dorsal no coinciden con el acta, revisa la ficha).</p>
      </section>
    );
  }

  const jugados = lista.filter((x) => x.yo.seg > 0 || x.yo.pts > 0);
  const n = jugados.length || 1;
  const suma = (k: keyof JugadorStats) => jugados.reduce((t, x) => t + (x.yo[k] as number), 0);
  const tlm = suma("tlm"), tla = suma("tla");
  const max = Math.max(1, ...lista.map((x) => x.yo.pts));
  const datos = [
    ["Partidos", String(jugados.length)], ["Minutos", mmss(suma("seg") / n)], ["Puntos", f1(suma("pts") / n)],
    ["T2", f1(suma("t2") / n)], ["T3", f1(suma("t3") / n)], ["TL", tla ? `${Math.round((tlm * 100) / tla)}%` : "–"],
    ["Faltas", f1(suma("fc") / n)], ["+/-", f1(suma("mm") / n)], ["Titular", `${lista.filter((x) => x.yo.titular).length}`],
  ];

  return (
    <section className="mt-8">
      <h2 className="font-semibold">Estadísticas FCBQ</h2>
      <p className="text-xs text-tinta/50">Medias por partido jugado · T2 y T3: canastas anotadas · TL: % de tiros libres</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-9">
        {datos.map(([t, v]) => (
          <div key={t} className="tarjeta p-2 text-center"><div className="text-lg font-bold tabular-nums text-azul">{v}</div><div className="text-[10px] uppercase tracking-wide text-tinta/50">{t}</div></div>
        ))}
      </div>

      {/* Puntos por partido */}
      <div className="tarjeta mt-3 flex h-28 items-end gap-1 p-3">
        {lista.map((x, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-0.5" title={`${x.rival}: ${x.yo.pts} pts`}>
            <span className="text-[10px] tabular-nums text-tinta/60">{x.yo.pts}</span>
            <div className={`w-full rounded-t ${x.nuestros > x.suyos ? "bg-azul" : "bg-rojo/70"}`} style={{ height: `${(x.yo.pts / max) * 64 + 2}px` }} />
          </div>
        ))}
      </div>

      <div className="tarjeta mt-3 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
            <tr>
              <th className="px-2 py-1.5 text-left">Fecha</th><th className="px-2 py-1.5 text-left">Rival</th><th className="px-2 py-1.5 text-center">Res.</th>
              <th className="px-2 py-1.5 text-center">Min</th><th className="px-2 py-1.5 text-center">Pts</th><th className="px-2 py-1.5 text-center">T2</th>
              <th className="px-2 py-1.5 text-center">T3</th><th className="px-2 py-1.5 text-center">TL</th><th className="px-2 py-1.5 text-center">F</th>
              <th className="px-2 py-1.5 text-center">+/-</th><th className="px-2 py-1.5 text-center" title="Periodos jugados">Per.</th>
            </tr>
          </thead>
          <tbody>
            {[...lista].reverse().map((x, i) => {
              const per = x.partidoId ? periodosDe.get(x.partidoId) : undefined;
              return (
                <tr key={i} className="border-t border-linea">
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-tinta/60">{x.s.fecha ? new Date(x.s.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }) : ""}</td>
                  <td className="max-w-40 truncate px-2 py-1.5">{x.partidoId ? <Link href={`/partidos/${x.partidoId}`} className="hover:underline">{x.rival}</Link> : x.rival}</td>
                  <td className="px-2 py-1.5 text-center"><span className={`rounded px-1 text-xs font-bold text-white ${x.nuestros > x.suyos ? "bg-green-600" : x.nuestros < x.suyos ? "bg-rojo" : "bg-tinta/50"}`}>{x.nuestros}-{x.suyos}</span></td>
                  <td className="px-2 py-1.5 text-center">{mmss(x.yo.seg)}{x.yo.titular ? "*" : ""}</td>
                  <td className="px-2 py-1.5 text-center font-semibold">{x.yo.pts}</td>
                  <td className="px-2 py-1.5 text-center">{x.yo.t2}</td>
                  <td className="px-2 py-1.5 text-center">{x.yo.t3}</td>
                  <td className="px-2 py-1.5 text-center">{x.yo.tlm}/{x.yo.tla}</td>
                  <td className="px-2 py-1.5 text-center">{x.yo.fc}</td>
                  <td className={`px-2 py-1.5 text-center ${x.yo.mm > 0 ? "text-green-700" : x.yo.mm < 0 ? "text-rojo" : ""}`}>{x.yo.mm > 0 ? "+" : ""}{x.yo.mm}</td>
                  <td className="px-2 py-1.5 text-center text-xs">{per?.length ? per.join(",") : x.yo.periodos.length ? x.yo.periodos.join(",") : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-tinta/50">* titular · Per.: periodos jugados (control de periodos o, si no, los de la FCBQ)</p>
    </section>
  );
}
