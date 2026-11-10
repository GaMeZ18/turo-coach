import type { Alineacion, Resultado } from "@/lib/fantasy/motor";
import { COMODINES, type Comodin } from "@/lib/fantasy/motor";

/** Puntos con decimales a la española (12,5) */
export function Pts({ v }: { v: number }) {
  return <>{v.toLocaleString("es-ES", { maximumFractionDigits: 2 })}</>;
}

/** El equipo de una jornada con los puntos de cada uno */
export function MiJornada({ titulo, res, al, nombre, equipo, compacto = false }: {
  titulo?: string; res: Resultado; al: Alineacion; nombre: (id: string) => string; equipo: (id: string) => string; compacto?: boolean;
}) {
  return (
    <section className={compacto ? "" : "tarjeta p-3"}>
      {titulo && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{titulo}</h2>
          <span className="text-xl font-bold"><Pts v={res.total} /> <span className="text-xs font-normal text-tinta/50">pts</span></span>
        </div>
      )}
      {al.comodin && <p className="text-xs font-semibold text-azul">Comodín: {COMODINES[al.comodin as Comodin].nombre}</p>}
      <ul className="mt-1 divide-y divide-linea text-sm">
        {res.filas.map((f) => (
          <li key={f.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">
              {f.capitan && <span className="mr-1 rounded bg-oro px-1 text-[10px] font-bold text-tinta">C</span>}
              {nombre(f.id)} <span className="text-xs text-tinta/50">{equipo(f.id)} · {f.precio} ⭐</span>
            </span>
            <span className={`w-20 text-right font-semibold tabular-nums ${!f.jugo ? "text-tinta/40" : f.puntos < 0 ? "text-red-600" : ""}`}>
              {f.jugo ? <><Pts v={f.puntos} />{f.extra ? <span className="text-xs text-amber-700"> +<Pts v={f.extra} /></span> : null}</> : f.porJugar ? "por jugar" : "no jugó"}
            </span>
          </li>
        ))}
        {res.suplente && (
          <li className="flex items-center gap-2 py-1.5 text-tinta/70">
            <span className="min-w-0 flex-1 truncate"><span className="mr-1 rounded bg-suave px-1 text-[10px] font-bold">SUP</span>{nombre(res.suplente.id)} <span className="text-xs text-tinta/50">{equipo(res.suplente.id)} · {res.suplente.precio} ⭐</span></span>
            <span className="w-20 text-right font-semibold tabular-nums">
              {res.suplente.entro ? <span className="text-green-700">entra · <Pts v={res.suplente.puntos} /></span> : res.suplente.porJugar ? "por jugar" : res.suplente.jugo ? <span className="text-tinta/40">(<Pts v={res.suplente.puntos} />)</span> : "—"}
            </span>
          </li>
        )}
      </ul>
      {compacto && <p className="mt-1 text-right text-xs text-tinta/50">Total <strong><Pts v={res.total} /></strong></p>}
    </section>
  );
}
