import type { EquipoStats } from "@/lib/stats-fcbq";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Box score de un equipo (datos de la FCBQ) */
export default function BoxScore({ eq, destacar = false }: { eq: EquipoStats; destacar?: boolean }) {
  const jugadores = eq.jugadores.filter((j) => j.seg > 0 || j.pts > 0 || j.fc > 0);
  return (
    <div className="overflow-x-auto">
      <p className={`px-1 pb-1 text-sm font-semibold ${destacar ? "text-azul" : ""}`}>{eq.nombre} · {eq.pts}</p>
      <table className="w-full text-xs tabular-nums sm:text-sm">
        <thead className="bg-suave text-[11px] uppercase tracking-wide text-tinta/60">
          <tr>
            <th className="px-1.5 py-1 text-left">#</th><th className="px-1.5 py-1 text-left">Jugador</th>
            <th className="px-1.5 py-1 text-center">Min</th><th className="px-1.5 py-1 text-center">Pts</th>
            <th className="px-1.5 py-1 text-center">T2</th><th className="px-1.5 py-1 text-center">T3</th>
            <th className="px-1.5 py-1 text-center">TL</th><th className="px-1.5 py-1 text-center">F</th>
            <th className="px-1.5 py-1 text-center">+/-</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j) => (
            <tr key={j.uuid ?? j.nombre} className="border-t border-linea">
              <td className="px-1.5 py-1 text-tinta/60">{j.dorsal}{j.titular ? "*" : ""}</td>
              <td className="max-w-40 truncate px-1.5 py-1">{j.nombre}</td>
              <td className="px-1.5 py-1 text-center">{mmss(j.seg)}</td>
              <td className="px-1.5 py-1 text-center font-semibold">{j.pts}</td>
              <td className="px-1.5 py-1 text-center">{j.t2}</td>
              <td className="px-1.5 py-1 text-center">{j.t3}</td>
              <td className="px-1.5 py-1 text-center">{j.tlm}/{j.tla}</td>
              <td className={`px-1.5 py-1 text-center ${j.fc >= 5 ? "font-bold text-rojo" : ""}`}>{j.fc}</td>
              <td className={`px-1.5 py-1 text-center ${j.mm > 0 ? "text-green-700" : j.mm < 0 ? "text-rojo" : ""}`}>{j.mm > 0 ? "+" : ""}{j.mm}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-linea font-semibold">
            <td /><td className="px-1.5 py-1">Total</td><td />
            <td className="px-1.5 py-1 text-center">{eq.pts}</td><td className="px-1.5 py-1 text-center">{eq.t2}</td>
            <td className="px-1.5 py-1 text-center">{eq.t3}</td><td className="px-1.5 py-1 text-center">{eq.tlm}/{eq.tla}</td>
            <td className="px-1.5 py-1 text-center">{eq.fc}</td><td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Parciales por periodo */
export function Parciales({ local, visitante }: { local: EquipoStats; visitante: EquipoStats }) {
  if (!local.porPeriodo.length) return null;
  return (
    <table className="text-sm tabular-nums">
      <thead><tr className="text-xs text-tinta/50"><th />{local.porPeriodo.map((_, i) => <th key={i} className="px-2 font-normal">{i + 1}º</th>)}<th className="px-2">Total</th></tr></thead>
      <tbody>
        {[local, visitante].map((e) => (
          <tr key={e.nombre}><td className="max-w-40 truncate pr-3 text-xs">{e.nombre}</td>{e.porPeriodo.map((v, i) => <td key={i} className="px-2 text-center">{v}</td>)}<td className="px-2 text-center font-bold">{e.pts}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
