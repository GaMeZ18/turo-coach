import type { Alineacion, Duo, JugadorF, Resultado } from "@/lib/fantasy/motor";
import { COMODINES, type Comodin } from "@/lib/fantasy/motor";
import { Camiseta, Sigla, pts } from "./ui";

/** El equipo de una jornada con los puntos de cada uno (como en el mockup) */
export function MiJornada({ titulo, res, al, jugador, compacto = false, duos }: {
  titulo?: string; res: Resultado; al: Alineacion; jugador: (id: string) => JugadorF | undefined; compacto?: boolean; duos?: Map<string, Duo>;
}) {
  const Fila = ({ id, puntos, jugo, porJugar, extra = 0, capitan = false, entro }: { id: string; puntos: number; jugo: boolean; porJugar: boolean; extra?: number; capitan?: boolean; entro?: boolean }) => {
    const j = jugador(id);
    return (
      <li className="flex items-center gap-2.5 px-3 py-2">
        <Camiseta dorsal={j?.dorsal ?? ""} equipo={j?.equipo ?? ""} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{j?.nombre ?? "?"}</span>
          {j && <Sigla equipo={j.equipo} />}
        </span>
        {capitan && extra > 0 && <span className="text-sm font-bold text-[var(--fx-oro)]">+{pts(extra)}</span>}
        {capitan && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#ffe27a] to-[#e2a414] text-[11px] font-black text-black">C</span>}
        {entro !== undefined ? (
          entro ? <span className="fx-pill-verde">Entra · {pts(puntos)} pts</span> : porJugar ? <span className="text-xs fx-suave">Por jugar</span> : jugo ? <span className="text-xs fx-suave">No entra ({pts(puntos)})</span> : <span className="text-xs fx-suave">—</span>
        ) : jugo ? <span className={puntos < 0 ? "fx-pill-rojo" : "fx-pill-verde"}>{pts(puntos)} pts</span>
          : porJugar ? <span className="rounded-lg border border-white/20 px-2 py-0.5 text-xs font-semibold text-white/70">Por jugar</span>
          : <span className="fx-pill-rojo">No jugó</span>}
      </li>
    );
  };
  return (
    <section className={compacto ? "" : "fx-card overflow-hidden"}>
      {titulo && (
        <div className="fx-cab-rojo flex items-center px-3 py-2">
          <p className="fx-display flex-1 text-lg">{titulo}</p>
          <p className="fx-display text-lg">Total: {pts(res.total)} pts</p>
        </div>
      )}
      {al.comodin && <p className="px-3 pt-2 text-xs font-semibold text-[var(--fx-oro)]">🃏 {COMODINES[al.comodin as Comodin].nombre}</p>}
      <ul className="fx-sep">
        {res.filas.map((f) => <Fila key={f.id} id={f.id} puntos={f.puntos} jugo={f.jugo} porJugar={f.porJugar} extra={f.extra} capitan={f.capitan} />)}
      </ul>
      {res.suplente && (
        <>
          <p className="bg-white/5 px-3 py-1 text-xs font-bold uppercase fx-suave">Suplente</p>
          <ul><Fila id={res.suplente.id} puntos={res.suplente.puntos} jugo={res.suplente.jugo} porJugar={res.suplente.porJugar} entro={res.suplente.entro} /></ul>
        </>
      )}
      {res.duo && (() => {
        const d = duos?.get(res.duo.id);
        return (
          <>
            <p className="bg-white/5 px-3 py-1 text-xs font-bold uppercase fx-suave">Dúo técnico</p>
            <div className="flex items-center gap-2.5 px-3 py-2">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-white/10">📋</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{d?.nombre ?? "Dúo técnico"}</span>{d && <Sigla equipo={d.equipo} />}</span>
              {res.duo.jugo ? <span className={res.duo.puntos < 0 ? "fx-pill-rojo" : "fx-pill-verde"}>{pts(res.duo.puntos)} pts</span>
                : res.duo.porJugar ? <span className="rounded-lg border border-white/20 px-2 py-0.5 text-xs font-semibold text-white/70">Por jugar</span>
                : <span className="fx-pill-rojo">No jugó</span>}
            </div>
          </>
        );
      })()}
      {compacto && <p className="px-3 pb-2 text-right text-sm">Total <strong className="text-[var(--fx-oro)]">{pts(res.total)}</strong></p>}
    </section>
  );
}
