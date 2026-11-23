// Piezas de solo lectura de un torneo: se usan en el panel y en la página pública /t/<token>
import { clasificacion, ganador, jugado, nombreRonda, type EquipoT, type PartidoT, type Torneo } from "@/lib/torneos";

const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const fechaPartido = (iso: string | null) => (iso ? fmtFecha(iso) : null);

export function grupos(torneo: Torneo, equipos: EquipoT[]) {
  if (torneo.formato === "liga") return [{ g: null as string | null, equipos }];
  return [...new Set(equipos.map((e) => e.grupo).filter(Boolean) as string[])].sort().map((g) => ({ g: g as string | null, equipos: equipos.filter((e) => e.grupo === g) }));
}

export function Clasificaciones({ torneo, equipos, partidos }: { torneo: Torneo; equipos: EquipoT[]; partidos: PartidoT[] }) {
  const nombre = new Map(equipos.map((e) => [e.id, e]));
  const gs = grupos(torneo, equipos).filter((g) => g.equipos.length);
  if (!gs.length || !partidos.some((p) => p.fase === "grupo")) return <p className="text-sm text-tinta/50">La clasificación sale cuando se genera el calendario.</p>;
  const pasan = torneo.formato === "grupos" ? torneo.clasifican : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {gs.map(({ g, equipos: es }) => {
        const tabla = clasificacion(es, partidos, torneo.puntos_victoria, torneo.puntos_derrota);
        return (
          <section key={g ?? "liga"} className="tarjeta overflow-x-auto">
            <h3 className="px-3 pt-3 font-semibold">{g ? `Grupo ${g}` : "Clasificación"}</h3>
            <table className="mt-2 w-full text-sm">
              <thead className="text-xs text-tinta/50"><tr><th className="px-2 py-1 text-left">#</th><th className="text-left">Equipo</th><th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>Dif</th><th className="px-2">Pts</th></tr></thead>
              <tbody>
                {tabla.map((f, i) => (
                  <tr key={f.id} className={`border-t border-linea text-center ${i < pasan ? "bg-green-500/10" : ""}`}>
                    <td className="px-2 py-1.5 text-left font-semibold">{i + 1}</td>
                    <td className="max-w-40 truncate text-left">{nombre.get(f.id)?.nombre}</td>
                    <td>{f.pj}</td><td>{f.pg}</td><td>{f.pp}</td><td>{f.pf}</td><td>{f.pc}</td><td>{f.dif > 0 ? `+${f.dif}` : f.dif}</td>
                    <td className="px-2 font-bold">{f.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pasan > 0 && <p className="px-3 pb-2 pt-1 text-[11px] text-tinta/50">En verde, los que pasan a la eliminatoria.</p>}
          </section>
        );
      })}
    </div>
  );
}

function Marcador({ p, nombre }: { p: PartidoT; nombre: (id: string | null) => string }) {
  const g = ganador(p);
  const fila = (id: string | null, pts: number | null) => (
    <div className={`flex items-center justify-between gap-2 ${g && g.gana === id ? "font-bold" : g ? "text-tinta/50" : ""}`}>
      <span className="truncate">{nombre(id)}</span><span className="tabular-nums">{pts ?? ""}</span>
    </div>
  );
  return <div className="space-y-0.5 text-sm">{fila(p.local_id, p.puntos_local)}{fila(p.visitante_id, p.puntos_visitante)}</div>;
}

/** Cuadro de eliminatoria por rondas (en el móvil se desliza hacia los lados) */
export function Cuadro({ equipos, partidos }: { equipos: EquipoT[]; partidos: PartidoT[] }) {
  const elim = partidos.filter((p) => p.fase === "eliminatoria");
  if (!elim.length) return <p className="text-sm text-tinta/50">Aún no se ha generado la eliminatoria.</p>;
  const nom = new Map(equipos.map((e) => [e.id, e.nombre]));
  const nombre = (id: string | null) => (id ? nom.get(id) ?? "?" : "Por decidir");
  const total = Math.max(...elim.map((p) => p.ronda));
  const rondas = Array.from({ length: total }, (_, i) => i + 1).filter((r) => elim.some((p) => p.ronda === r && !p.tercer_puesto));
  const tercero = elim.find((p) => p.tercer_puesto);
  const final = elim.find((p) => p.ronda === total && !p.tercer_puesto);
  const campeon = final ? ganador(final)?.gana : null;
  return (
    <div className="space-y-3">
      {campeon && <p className="tarjeta p-3 text-center text-lg font-bold">🏆 Campeón: {nombre(campeon)}</p>}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {rondas.map((r) => (
          <div key={r} className="flex min-w-48 flex-1 flex-col">
            <p className="mb-2 text-center text-xs font-bold uppercase text-tinta/50">{nombreRonda(r, total)}</p>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {elim.filter((p) => p.ronda === r && !p.tercer_puesto).sort((a, b) => a.orden - b.orden).map((p) => (
                <div key={p.id} className="tarjeta p-2">
                  <Marcador p={p} nombre={nombre} />
                  {(p.fecha || p.pista) && !jugado(p) && <p className="mt-1 text-[11px] text-tinta/50">{[fechaPartido(p.fecha), p.pista].filter(Boolean).join(" · ")}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tercero && (
        <div className="max-w-60">
          <p className="mb-1 text-xs font-bold uppercase text-tinta/50">{nombreRonda(0, 0, true)}</p>
          <div className="tarjeta p-2"><Marcador p={tercero} nombre={nombre} /></div>
        </div>
      )}
    </div>
  );
}

/** Lista de partidos por día (solo lectura) */
export function Partidos({ torneo, equipos, partidos }: { torneo: Torneo; equipos: EquipoT[]; partidos: PartidoT[] }) {
  const nom = new Map(equipos.map((e) => [e.id, e.nombre]));
  const nombre = (id: string | null) => (id ? nom.get(id) ?? "?" : "Por decidir");
  const total = Math.max(0, ...partidos.filter((p) => p.fase === "eliminatoria").map((p) => p.ronda));
  const lista = [...partidos].sort((a, b) => (a.fecha ?? "9").localeCompare(b.fecha ?? "9") || (a.fase === b.fase ? 0 : a.fase === "grupo" ? -1 : 1) || a.ronda - b.ronda || (a.grupo ?? "").localeCompare(b.grupo ?? "") || a.orden - b.orden);
  if (!lista.length) return <p className="text-sm text-tinta/50">Todavía no hay partidos.</p>;
  return (
    <ul className="space-y-2">
      {lista.map((p) => (
        <li key={p.id} className="tarjeta flex items-center gap-3 p-3">
          <div className="w-28 shrink-0 text-xs text-tinta/60">
            <p className="font-semibold text-tinta/80">{p.fase === "grupo" ? (torneo.formato === "liga" ? `Jornada ${p.ronda}` : `Grupo ${p.grupo} · J${p.ronda}`) : nombreRonda(p.ronda, total, p.tercer_puesto)}</p>
            {p.fecha && <p className="capitalize">{fechaPartido(p.fecha)}</p>}
            {p.pista && <p>{p.pista}</p>}
          </div>
          <div className="min-w-0 flex-1"><Marcador p={p} nombre={nombre} /></div>
        </li>
      ))}
    </ul>
  );
}
