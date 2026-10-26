import Link from "next/link";
import { calcularClasificacion, esNuestro, type ResultadoLiga, type TablaFCBQ } from "@/lib/fcbq";

export type LigaGuardada = {
  nombre: string | null;
  url: string | null;
  resultados: ResultadoLiga[];
  clasificacion: TablaFCBQ | null;
  updated_at: string;
};

const fecha = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Clasificacion({ liga }: { liga: LigaGuardada }) {
  if (liga.clasificacion) {
    const { cabeceras, filas } = liga.clasificacion;
    const iEquipo = Math.max(0, cabeceras.findIndex((c) => /^Equip/i.test(c)));
    return (
      <table className="w-full text-sm tabular-nums">
        <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
          <tr>{cabeceras.map((c, i) => <th key={i} className={`px-2 py-2 ${i === iEquipo ? "text-left" : "text-center"}`}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className={`border-t border-linea ${esNuestro(f[iEquipo] ?? "") ? "bg-azul/10 font-semibold text-azul" : ""}`}>
              {f.map((c, j) => <td key={j} className={`px-2 py-1.5 ${j === iEquipo ? "text-left" : "text-center"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const filas = calcularClasificacion(liga.resultados);
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
        <tr>
          <th className="px-2 py-2 text-center">#</th><th className="px-2 py-2 text-left">Equipo</th>
          <th className="px-2 py-2 text-center">PJ</th><th className="px-2 py-2 text-center">G</th><th className="px-2 py-2 text-center">P</th>
          <th className="hidden px-2 py-2 text-center sm:table-cell">PF</th><th className="hidden px-2 py-2 text-center sm:table-cell">PC</th>
          <th className="px-2 py-2 text-center">Dif</th><th className="px-2 py-2 text-center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={f.equipo} className={`border-t border-linea ${esNuestro(f.equipo) ? "bg-azul/10 font-semibold text-azul" : ""}`}>
            <td className="px-2 py-1.5 text-center text-tinta/50">{i + 1}</td>
            <td className="px-2 py-1.5">{f.equipo}</td>
            <td className="px-2 py-1.5 text-center">{f.pj}</td><td className="px-2 py-1.5 text-center">{f.g}</td><td className="px-2 py-1.5 text-center">{f.p}</td>
            <td className="hidden px-2 py-1.5 text-center sm:table-cell">{f.pf}</td><td className="hidden px-2 py-1.5 text-center sm:table-cell">{f.pc}</td>
            <td className="px-2 py-1.5 text-center">{f.pf - f.pc > 0 ? "+" : ""}{f.pf - f.pc}</td>
            <td className="px-2 py-1.5 text-center font-bold">{f.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Liga({ liga }: { liga: LigaGuardada | null }) {
  if (!liga || (!liga.resultados.length && !liga.clasificacion)) {
    return (
      <section className="tarjeta mt-8 p-4 text-sm text-tinta/70">
        <h2 className="font-semibold text-tinta">Liga y clasificación</h2>
        <p className="mt-1">
          Abre en basquetcatala.cat la página de <strong>Resultats</strong> (o la <strong>Classificació</strong>) de la competición de este equipo y pulsa el marcador «Enviar a Coach Manager CBTuró».{" "}
          <Link href="/partidos/importar" className="font-medium text-azul underline">Cómo se hace</Link>
        </p>
      </section>
    );
  }

  // Jornadas: la última con resultados abierta
  const porJornada = new Map<string, ResultadoLiga[]>();
  for (const r of liga.resultados) {
    const k = r.jornada ? `Jornada ${r.jornada}` : fecha(r.dia);
    porJornada.set(k, [...(porJornada.get(k) ?? []), r]);
  }
  const jornadas = [...porJornada.entries()];
  const ultimaJugada = jornadas.map(([, rs]) => rs.some((r) => r.pl !== null)).lastIndexOf(true);
  const actualizado = new Date(liga.updated_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Clasificación</h2>
          {liga.nombre && <p className="text-sm text-tinta/70">{liga.nombre}</p>}
        </div>
        <p className="text-xs text-tinta/50">
          Actualizado {actualizado}
          {liga.url && <> · <a href={liga.url} target="_blank" rel="noreferrer" className="font-medium text-azul underline">Actualizar en la FCBQ</a></>}
        </p>
      </div>
      <div className="tarjeta mt-2 overflow-x-auto">
        <Clasificacion liga={liga} />
      </div>
      {!liga.clasificacion && liga.resultados.length > 0 && (
        <p className="mt-1 text-xs text-tinta/50">Calculada con los resultados guardados (2 puntos victoria, 1 derrota). Envía la página de Classificació para ver la oficial.</p>
      )}

      {jornadas.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Resultados de la liga</h2>
          <div className="mt-2 space-y-2">
            {jornadas.map(([nombre, rs], i) => (
              <details key={nombre} open={i === (ultimaJugada >= 0 ? ultimaJugada : 0)} className="tarjeta overflow-hidden">
                <summary className="cursor-pointer bg-suave px-3 py-2 text-sm font-semibold">
                  {nombre} <span className="font-normal text-tinta/50">· {fecha(rs[0].dia)}</span>
                </summary>
                <ul className="divide-y divide-linea text-sm">
                  {rs.map((r, j) => {
                    const nuestro = esNuestro(r.local) || esNuestro(r.visitante);
                    const gana = r.pl !== null && r.pv !== null ? (r.pl > r.pv ? "l" : r.pv > r.pl ? "v" : "") : "";
                    return (
                      <li key={j} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 ${nuestro ? "bg-azul/5 font-medium" : ""}`}>
                        <span className={`truncate text-right ${gana === "l" ? "font-semibold" : ""}`}>{r.local}</span>
                        <span className="min-w-16 rounded bg-suave px-2 py-0.5 text-center tabular-nums">
                          {r.pl !== null && r.pv !== null ? `${r.pl} - ${r.pv}` : <span className="text-xs text-tinta/50">{r.hora}</span>}
                        </span>
                        <span className={`truncate ${gana === "v" ? "font-semibold" : ""}`}>
                          {r.visitante}
                          {r.statsId && (
                            <a href={`https://www.basquetcatala.cat/estadistica/partit/${r.statsId}`} target="_blank" rel="noreferrer" className="ml-2 text-xs font-normal text-azul underline">stats</a>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
