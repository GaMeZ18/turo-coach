"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { guardarPeriodos } from "../actions";

type Jugador = { id: string; nombre: string; dorsal: number | null };
type DeFCBQ = { nombre: string; dorsal: string; periodos: number[] };

const tokens = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1);

/** Empareja a los jugadores de la FCBQ con los de la plantilla (por nombre y dorsal) */
function emparejar(jugadores: Jugador[], fcbq: DeFCBQ[]) {
  const res: Record<string, number[]> = {};
  for (const f of fcbq) {
    const tf = new Set(tokens(f.nombre));
    let mejor: { id: string; p: number } | null = null;
    for (const j of jugadores) {
      const comunes = tokens(j.nombre).filter((t) => tf.has(t)).length;
      const p = comunes + (j.dorsal !== null && String(j.dorsal) === f.dorsal ? 2 : 0);
      if (p >= 2 && (!mejor || p > mejor.p)) mejor = { id: j.id, p };
    }
    if (mejor) res[mejor.id] = f.periodos;
  }
  return res;
}

export default function Periodos({ partidoId, jugadores, inicial, numInicial, fcbq }: {
  partidoId: string; jugadores: Jugador[]; inicial: Record<string, number[]>; numInicial: number; fcbq: DeFCBQ[] | null;
}) {
  const [num, setNum] = useState(numInicial);
  const [marcas, setMarcas] = useState<Record<string, number[]>>(inicial);
  const [minimo, setMinimo] = useState(0);
  const [cambiado, setCambiado] = useState(false);
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // El mínimo de periodos se recuerda en este navegador
  useEffect(() => { try { setMinimo(Number(localStorage.getItem("periodos-minimo") ?? 0)); } catch {} }, []);
  const cambiarMinimo = (v: number) => { setMinimo(v); try { localStorage.setItem("periodos-minimo", String(v)); } catch {} };

  const alternar = (id: string, p: number) => {
    setCambiado(true);
    setMarcas((m) => { const a = new Set(m[id] ?? []); if (a.has(p)) a.delete(p); else a.add(p); return { ...m, [id]: [...a].sort((x, y) => x - y) }; });
  };
  const desdeFCBQ = () => {
    if (!fcbq) return;
    const e = emparejar(jugadores, fcbq);
    setMarcas(e);
    setNum((n) => Math.max(n, ...fcbq.flatMap((f) => f.periodos)));
    setCambiado(true);
    const sin = fcbq.filter((f) => f.periodos.length && !Object.values(e).includes(f.periodos)).length;
    setMsg(`Rellenado con la FCBQ: ${Object.keys(e).length} jugadores${sin ? ` (${sin} sin emparejar: revisa nombres o dorsales)` : ""}.`);
  };
  const guardar = () => start(async () => {
    try {
      await guardarPeriodos(partidoId, num, jugadores.map((j) => ({ jugadorId: j.id, periodos: (marcas[j.id] ?? []).filter((p) => p <= num) })));
      setCambiado(false); setMsg("Guardado.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "No se ha podido guardar."); }
  });

  const periodos = Array.from({ length: num }, (_, i) => i + 1);
  const porPeriodo = periodos.map((p) => jugadores.filter((j) => marcas[j.id]?.includes(p)).length);

  return (
    <section className="tarjeta p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Control de periodos</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1">Periodos
            <select value={num} onChange={(e) => { setNum(Number(e.target.value)); setCambiado(true); }} className="campo !w-auto !py-1">{[4, 5, 6, 8].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <label className="flex items-center gap-1">Mínimo por jugador
            <select value={minimo} onChange={(e) => cambiarMinimo(Number(e.target.value))} className="campo !w-auto !py-1">{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n || "—"}</option>)}</select>
          </label>
          {fcbq && <button type="button" onClick={desdeFCBQ} className="btn-secundario !py-1 text-xs"><Download size={14} /> Rellenar desde la FCBQ</button>}
        </div>
      </div>
      {!jugadores.length ? <p className="mt-2 text-sm text-tinta/50">No hay jugadores convocados.</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-tinta/50">
                <th className="py-1 text-left font-normal">Jugador</th>
                {periodos.map((p) => <th key={p} className="w-9 py-1 text-center font-normal">{p}º</th>)}
                <th className="w-10 py-1 text-center font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j) => {
                const total = (marcas[j.id] ?? []).filter((p) => p <= num).length;
                const corto = minimo > 0 && total < minimo;
                return (
                  <tr key={j.id} className={`border-t border-linea ${corto ? "bg-red-50" : ""}`}>
                    <td className="py-1 pr-2"><span className="mr-1 text-xs text-tinta/50">{j.dorsal ?? ""}</span>{j.nombre}</td>
                    {periodos.map((p) => {
                      const on = marcas[j.id]?.includes(p);
                      return (
                        <td key={p} className="py-1 text-center">
                          <button type="button" onClick={() => alternar(j.id, p)} aria-pressed={on} aria-label={`${j.nombre}, periodo ${p}`}
                            className={`h-7 w-7 rounded-md border text-xs font-bold transition ${on ? "border-azul bg-azul text-white" : "border-linea bg-white text-tinta/30 hover:bg-suave"}`}>
                            {on ? "✓" : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className={`py-1 text-center font-semibold tabular-nums ${corto ? "text-red-700" : ""}`}>{total}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-linea text-xs text-tinta/50">
                <td className="py-1">Jugaron</td>
                {porPeriodo.map((n, i) => <td key={i} className="py-1 text-center tabular-nums">{n || ""}</td>)}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={pendiente || !cambiado} className="btn-primario">{pendiente && <Loader2 size={16} className="animate-spin" />} Guardar periodos</button>
        {msg && <span className="text-xs text-tinta/60">{msg}</span>}
      </div>
    </section>
  );
}
