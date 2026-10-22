export type Partido = {
  id: string; fecha: string; rival: string; local: boolean; lugar: string | null; competicion: string | null;
  jornada: number | null; puntos_favor: number | null; puntos_contra: number | null; estado: string;
};

export function Resultado({ p, grande = false }: { p: Partido; grande?: boolean }) {
  if (p.estado === "aplazado") return <span className="rounded bg-tinta/10 px-2 py-0.5 text-xs font-semibold uppercase text-tinta/60">Aplazado</span>;
  if (p.puntos_favor === null || p.puntos_contra === null) return null;
  const v = p.puntos_favor > p.puntos_contra;
  const e = p.puntos_favor === p.puntos_contra;
  return (
    <span className={`inline-flex items-center gap-1.5 ${grande ? "text-2xl" : "text-sm"} font-bold tabular-nums`}>
      <span className={`flex items-center justify-center rounded ${grande ? "h-8 w-8 text-base" : "h-6 w-6 text-xs"} text-white ${v ? "bg-green-600" : e ? "bg-tinta/50" : "bg-rojo"}`}>
        {v ? "V" : e ? "E" : "D"}
      </span>
      {p.local ? `${p.puntos_favor}-${p.puntos_contra}` : `${p.puntos_contra}-${p.puntos_favor}`}
    </span>
  );
}
