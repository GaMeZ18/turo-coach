"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Sparkles, Eraser } from "lucide-react";
import { guardarPeriodos } from "../actions";
import { PERIODOS_MINI, proponerAlineacion, textoAlineacion, validarAlineacion } from "@/lib/minibasquet";

type Jugador = { id: string; nombre: string; dorsal: number | null };

/** Alineación de minibàsquet: quién juega cada uno de los 6 períodos, comprobando la normativa del CEEB */
export default function AlineacionMini({ partidoId, jugadores, inicial }: { partidoId: string; jugadores: Jugador[]; inicial: Record<string, number[]> }) {
  const [marcas, setMarcas] = useState<Record<string, number[]>>(inicial);
  const [cambiado, setCambiado] = useState(false);
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { setMarcas(inicial); setCambiado(false); }, [inicial]);

  const avisos = useMemo(() => validarAlineacion(jugadores, marcas), [jugadores, marcas]);
  const errores = avisos.filter((a) => a.nivel === "error");
  const info = avisos.filter((a) => a.nivel === "info");
  const de = (id: string) => marcas[id] ?? [];
  const enPeriodo = (p: number) => jugadores.filter((j) => de(j.id).includes(p)).length;

  const alternar = (id: string, p: number) => {
    setMarcas((m) => { const l = m[id] ?? []; return { ...m, [id]: l.includes(p) ? l.filter((x) => x !== p) : [...l, p].sort((a, b) => a - b) }; });
    setCambiado(true); setMsg(null);
  };
  const proponer = () => { setMarcas(proponerAlineacion(jugadores)); setCambiado(true); setMsg("Propuesta hecha: cámbiala a tu gusto y guarda."); };
  const limpiar = () => { setMarcas({}); setCambiado(true); setMsg(null); };
  const guardar = () => start(async () => {
    try {
      await guardarPeriodos(partidoId, PERIODOS_MINI, jugadores.map((j) => ({ jugadorId: j.id, periodos: de(j.id) })));
      setCambiado(false);
      setMsg(errores.length ? "Guardada, pero todavía NO cumple la normativa: revisa los avisos en rojo." : "Guardada. La alineación cumple la normativa.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "No se ha podido guardar."); }
  });
  const copiar = async () => {
    try { await navigator.clipboard.writeText(`Alineación (${jugadores.length} en acta)\n${textoAlineacion(jugadores, marcas)}`); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  };

  return (
    <section className="tarjeta p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Alineación de minibàsquet (normativa CEEB)</h2>
          <p className="text-xs text-tinta/60">{jugadores.length} en acta (los convocados) · 6 períodos · toca las casillas de quién juega cada período</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={proponer} className="btn-secundario !py-1.5 text-sm" disabled={jugadores.length < 5 || jugadores.length > 12}><Sparkles size={15} /> Proponer</button>
          <button type="button" onClick={limpiar} className="btn-secundario !py-1.5 text-sm"><Eraser size={15} /> Limpiar</button>
          <button type="button" onClick={copiar} className="btn-secundario !py-1.5 text-sm">{copiado ? <Check size={15} /> : <Copy size={15} />} Copiar</button>
          <button type="button" onClick={guardar} disabled={pendiente || !cambiado} className="btn-primario !py-1.5 text-sm">{pendiente && <Loader2 size={15} className="animate-spin" />} Guardar</button>
        </div>
      </div>

      {/* Estado de la normativa */}
      <div className={`mt-3 rounded-lg border p-2.5 text-sm ${errores.length ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
        {errores.length ? (
          <>
            <p className="flex items-center gap-1.5 font-semibold text-red-800"><AlertTriangle size={16} /> La alineación no cumple la normativa ({errores.length})</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-red-800">{errores.map((a, i) => <li key={i}>{a.texto}</li>)}</ul>
          </>
        ) : (
          <p className="flex items-center gap-1.5 font-semibold text-green-800"><CheckCircle2 size={16} /> Alineación correcta según la normativa{cambiado ? " (falta guardar)" : ""}</p>
        )}
        {info.map((a, i) => <p key={i} className="mt-1 text-xs text-tinta/60">{a.texto}</p>)}
      </div>

      {jugadores.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-tinta/60">
                <th className="p-1 text-left">Jugador</th>
                {Array.from({ length: PERIODOS_MINI }, (_, i) => <th key={i} className="w-11 p-1 text-center">{i + 1}º</th>)}
                <th className="w-10 p-1 text-center">Tot.</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j) => {
                const t = de(j.id).length;
                const mal = errores.some((a) => a.texto.startsWith(j.nombre.split(" ").slice(0, 2).join(" ")));
                return (
                  <tr key={j.id} className={`border-t border-linea ${mal ? "bg-red-50/60" : ""}`}>
                    <td className="max-w-40 truncate p-1"><span className="mr-1 text-xs font-semibold text-rojo">{j.dorsal ?? ""}</span>{j.nombre}</td>
                    {Array.from({ length: PERIODOS_MINI }, (_, i) => {
                      const p = i + 1, on = de(j.id).includes(p);
                      return (
                        <td key={p} className="p-0.5 text-center">
                          <button type="button" onClick={() => alternar(j.id, p)} aria-label={`${j.nombre}, ${p}º período`}
                            className={`h-8 w-9 rounded-md border text-xs font-bold transition ${on ? "border-azul bg-azul text-white" : "border-linea bg-white text-tinta/30 hover:bg-suave"}`}>
                            {on ? "✓" : "–"}
                          </button>
                        </td>
                      );
                    })}
                    <td className={`p-1 text-center font-semibold ${mal ? "text-red-700" : ""}`}>{t}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-linea text-xs">
                <td className="p-1 text-tinta/60">En pista</td>
                {Array.from({ length: PERIODOS_MINI }, (_, i) => {
                  const c = enPeriodo(i + 1);
                  return <td key={i} className={`p-1 text-center font-bold ${c === 5 ? "text-green-700" : "text-red-700"}`}>{c}/5</td>;
                })}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-tinta/70">{msg}</p>}
    </section>
  );
}
