import { mismoEquipo, por10, rachas, sinergias, type StatsPartido, type Unidad } from "@/lib/stats-fcbq";

// "AINHOA PADRÓS I ZABALETA" → "Ainhoa P."
const corto = (n: string) => {
  const t = n.toLowerCase().split(/\s+/).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1));
  return t.length > 1 ? `${t[0]} ${t[1][0]}.` : t[0] ?? n;
};
const min = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, "0")}`;
const signo = (x: number | null, dec = 1) => (x === null ? "–" : `${x > 0 ? "+" : ""}${x.toFixed(dec)}`);
const color = (x: number | null) => (x === null ? "" : x > 0 ? "text-green-700" : x < 0 ? "text-rojo" : "");

function TablaUnidades({ titulo, ayuda, unidades, estimado }: { titulo: string; ayuda: string; unidades: Unidad[]; estimado: boolean }) {
  return (
    <div className="tarjeta overflow-x-auto">
      <div className="px-3 pt-3">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="text-xs text-tinta/50">{ayuda}</p>
      </div>
      <table className="mt-2 w-full text-sm tabular-nums">
        <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
          <tr>
            <th className="px-2 py-1.5 text-left">Jugadores</th><th className="px-2 py-1.5 text-center">Min</th>
            <th className="px-2 py-1.5 text-center" title="Puntos a favor - en contra">Parcial</th><th className="px-2 py-1.5 text-center">+/-</th>
            <th className="px-2 py-1.5 text-center" title="+/- cada 10 minutos">+/- 10′</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => {
            const p = por10(u.pf, u.pc, u.seg);
            return (
              <tr key={u.jugadores.join("|")} className="border-t border-linea">
                <td className="px-2 py-1.5">{u.jugadores.map(corto).join(" · ")}</td>
                <td className="px-2 py-1.5 text-center">{min(u.seg)}</td>
                <td className="px-2 py-1.5 text-center">{estimado ? "–" : `${u.pf}-${u.pc}`}</td>
                <td className={`px-2 py-1.5 text-center font-semibold ${color(u.pf - u.pc)}`}>{estimado ? "≈" : ""}{signo(u.pf - u.pc, 0)}</td>
                <td className={`px-2 py-1.5 text-center ${color(p)}`}>{signo(p)}</td>
              </tr>
            );
          })}
          {!unidades.length && <tr><td colSpan={5} className="px-2 py-3 text-tinta/50">Sin datos suficientes.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function Sinergias({ nombre, stats }: { nombre: string; stats: StatsPartido[] }) {
  const s = sinergias(nombre, stats);

  // Titulares y banquillo, ventajas y parciales
  let titulares = 0, banquillo = 0, pj = 0, maxV = 0, maxP = 0, nRachas = 0;
  for (const p of stats) {
    const lado = mismoEquipo(p.local.nombre, nombre) ? "local" : mismoEquipo(p.visitante.nombre, nombre) ? "visitante" : null;
    if (!lado) continue;
    pj++;
    for (const j of p[lado].jugadores) { if (j.titular) titulares += j.pts; else banquillo += j.pts; }
    if ((p.marcador?.length ?? 0) > 1) { const r = rachas(p, lado); maxV += r.maxVentaja; maxP += r.maxParcial; nRachas++; }
  }
  const media = (x: number, n: number) => (n ? (x / n).toFixed(1) : "–");

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Sinergias</h2>
      <p className="text-xs text-tinta/50">
        {s.estimado
          ? <>On/off exacto con el +/- oficial. Quintetos y parejas <strong>estimados</strong> (≈) a partir de los minutos en pista y el +/- de cada tramo, porque la FCBQ no publica la jugada a jugada de estos partidos ({s.partidos} de {pj}).</>
          : <>Calculado con la jugada a jugada de la FCBQ ({s.partidos} de {pj} partidos). La FCBQ no publica los tiros fallados, así que se mide con puntos y +/-, no con posesiones.</>}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Pts titulares", media(titulares, pj)], ["Pts banquillo", media(banquillo, pj)],
          ["Máx. ventaja", media(maxV, nRachas)], ["Mayor parcial", media(maxP, nRachas)],
        ].map(([t, v]) => (
          <div key={t} className="tarjeta p-2 text-center">
            <div className="text-xl font-bold tabular-nums text-azul">{v}</div>
            <div className="text-[11px] uppercase tracking-wide text-tinta/50">{t}</div>
          </div>
        ))}
      </div>

      {s.partidos === 0 ? (
        <p className="tarjeta mt-2 p-3 text-sm text-tinta/60">Faltan los datos de jugada a jugada. Pulsa «Actualizar desde la FCBQ» (extensión 1.4.1 o posterior) y se descargarán.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="tarjeta overflow-x-auto">
            <div className="px-3 pt-3">
              <h3 className="text-sm font-semibold">En pista y en el banquillo (on/off)</h3>
              <p className="text-xs text-tinta/50">Cómo va el equipo con cada jugador en pista y sin él, cada 10 minutos. «Dif.» es lo que mejora (o empeora) al equipo.</p>
            </div>
            <table className="mt-2 w-full text-sm tabular-nums">
              <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
                <tr>
                  <th className="px-2 py-1.5 text-left">Jugador</th><th className="px-2 py-1.5 text-center">Min</th>
                  <th className="px-2 py-1.5 text-center">+/- en pista</th><th className="px-2 py-1.5 text-center">En pista 10′</th>
                  <th className="px-2 py-1.5 text-center">Fuera 10′</th><th className="px-2 py-1.5 text-center">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {s.onoff.map((o) => {
                  const on = por10(o.pfOn, o.pcOn, o.segOn), off = por10(o.pfOff, o.pcOff, o.segOff);
                  const dif = on !== null && off !== null ? on - off : null;
                  return (
                    <tr key={o.nombre} className="border-t border-linea">
                      <td className="px-2 py-1.5"><span className="mr-1 text-xs text-tinta/50">{o.dorsal}</span>{corto(o.nombre)}</td>
                      <td className="px-2 py-1.5 text-center">{min(o.segOn)}</td>
                      <td className={`px-2 py-1.5 text-center ${color(o.pfOn - o.pcOn)}`}>{signo(o.pfOn - o.pcOn, 0)}</td>
                      <td className={`px-2 py-1.5 text-center ${color(on)}`}>{signo(on)}</td>
                      <td className={`px-2 py-1.5 text-center ${color(off)}`}>{signo(off)}</td>
                      <td className={`px-2 py-1.5 text-center font-semibold ${color(dif)}`}>{signo(dif)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablaUnidades titulo="Quintetos" ayuda="Los más utilizados (más de 2 minutos juntos)." unidades={s.quintetos.filter((q) => q.seg >= 120).slice(0, 12)} estimado={s.estimado} />
          <TablaUnidades titulo="Parejas" ayuda="Las parejas que más minutos comparten en pista." unidades={s.parejas.slice(0, 15)} estimado={s.estimado} />
        </div>
      )}
    </section>
  );
}
