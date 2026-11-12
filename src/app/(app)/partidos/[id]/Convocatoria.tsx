"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { alternarConvocado, jugadoresDeEquipo } from "../actions";
import { textoRespuesta, MOTIVOS_NO_DISP, type NoDisponible, type Respuesta } from "@/lib/asistencia";
import EnlaceAsistencia from "@/components/EnlaceAsistencia";
import ImagenConvocatoria, { type DatosPartido } from "./ImagenConvocatoria";

export default function Convocatoria({
  partidoId, jugadores: base, convocados, respuestas = {}, noDisp = {}, partido, equipoId, otrosEquipos = [],
}: {
  partidoId: string;
  jugadores: { id: string; nombre: string; dorsal: number | null; equipo?: string }[];
  otrosEquipos?: { id: string; nombre: string }[];
  convocados: string[];
  respuestas?: Record<string, Respuesta>;
  noDisp?: Record<string, NoDisponible>;
  partido?: DatosPartido;
  equipoId?: string;
}) {
  const [sel, setSel] = useState(new Set(convocados));
  // Jugadores de otros equipos añadidos ahora (los ya convocados vienen en «base» con su equipo)
  const [extra, setExtra] = useState<{ id: string; nombre: string; dorsal: number | null; equipo?: string }[]>([]);
  const jugadores = [...base, ...extra.filter((x) => !base.some((b) => b.id === x.id))];
  const [otro, setOtro] = useState("");
  const [lista, setLista] = useState<{ id: string; nombre: string; dorsal: number | null }[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorOtro, setErrorOtro] = useState<string | null>(null);
  const elegirEquipo = async (id: string) => {
    setOtro(id); setLista(null); setErrorOtro(null);
    if (!id) return;
    setCargando(true);
    const r = await jugadoresDeEquipo(partidoId, id);
    setCargando(false);
    if (r.error) setErrorOtro(r.error); else setLista(r.jugadores ?? []);
  };
  const convocarDeOtro = (j: { id: string; nombre: string; dorsal: number | null }) => {
    const eq = otrosEquipos.find((e) => e.id === otro)?.nombre;
    setExtra((x) => [...x.filter((y) => y.id !== j.id), { ...j, equipo: eq }]);
    if (!sel.has(j.id)) alternar(j.id);
  };
  const [pendiente, start] = useTransition();
  const [copiado, setCopiado] = useState(false);
  useEffect(() => setSel(new Set(convocados)), [convocados]);

  const alternar = (id: string) => {
    const nuevo = !sel.has(id);
    setSel((s) => { const n = new Set(s); if (nuevo) n.add(id); else n.delete(id); return n; });
    start(() => alternarConvocado(partidoId, id, nuevo));
  };

  /** Lista para pegar en el grupo de WhatsApp de las familias */
  const copiar = async () => {
    const lista = jugadores.filter((j) => sel.has(j.id)).map((j) => `${j.dorsal ?? "–"} · ${j.nombre}`).join("\n");
    try {
      await navigator.clipboard.writeText(`Convocatoria (${sel.size}):\n${lista}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles */ }
  };
  const nResp = jugadores.filter((j) => respuestas[j.id]).length;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Convocatoria</h2>
        <span className="text-sm text-tinta/60">{sel.size}/{jugadores.length}{pendiente ? " · guardando…" : ""}</span>
      </div>
      {equipoId && partido && <div className="mt-2"><EnlaceAsistencia equipoId={equipoId} equipo={partido.equipo} /></div>}
      {nResp > 0 && (
        <p className="mt-2 rounded-lg bg-suave px-3 py-2 text-xs">
          Disponibles: <strong className="text-green-700">{jugadores.filter((j) => respuestas[j.id]?.va && !noDisp[j.id]).length} pueden</strong> ·{" "}
          <strong className="text-red-700">{jugadores.filter((j) => respuestas[j.id] && !respuestas[j.id].va).length} no</strong> ·{" "}
          {jugadores.length - nResp} sin contestar
        </p>
      )}
      <ul className="tarjeta mt-2 divide-y divide-linea">
        {jugadores.map((j) => {
          const on = sel.has(j.id);
          const r = respuestas[j.id];
          const nd = noDisp[j.id];
          return (
            <li key={j.id}>
              <button type="button" onClick={() => alternar(j.id)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-suave ${nd && !on ? "bg-suave" : ""}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-azul bg-azul text-white" : "border-linea"}`}>
                  {on && <Check size={14} />}
                </span>
                <span className="w-6 text-right text-xs font-semibold text-rojo">{j.dorsal ?? ""}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${on ? "" : "text-tinta/40 line-through"}`}>{j.nombre}{j.equipo && <span className="ml-1.5 rounded bg-azul/10 px-1.5 py-0.5 text-[10px] font-semibold text-azul no-underline">{j.equipo}</span>}</span>
                  {nd ? <span className="block text-[11px] text-tinta/60">🚫 No disponible ({MOTIVOS_NO_DISP[nd.motivo as keyof typeof MOTIVOS_NO_DISP] ?? "otros"})</span>
                    : r ? <span className={`block truncate text-[11px] ${r.va ? "text-green-700" : "text-red-700"}`}>{r.va ? "✅ Puede ir" : `❌ ${textoRespuesta(r).replace("No viene", "No puede")}`}</span>
                    : nResp > 0 ? <span className="block text-[11px] text-tinta/40">Sin contestar</span> : null}
                </span>
              </button>
            </li>
          );
        })}
        {jugadores.length === 0 && <li className="px-3 py-4 text-sm text-tinta/50">El equipo no tiene jugadores.</li>}
      </ul>
      {otrosEquipos.length > 0 && (
        <details className="mt-2 rounded-lg border border-dashed border-linea p-3 text-sm" onToggle={(e) => { if (!(e.target as HTMLDetailsElement).open) { setOtro(""); setLista(null); } }}>
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-azul"><UserPlus size={15} /> Convocar a alguien de otro equipo</summary>
          <p className="mt-1 text-xs text-tinta/60">Por ejemplo, un jugador del U16 que sube a jugar con el U18.</p>
          <select value={otro} onChange={(e) => elegirEquipo(e.target.value)} className="campo mt-2">
            <option value="">Elige el equipo…</option>
            {otrosEquipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {cargando && <p className="mt-2 flex items-center gap-1 text-xs text-tinta/60"><Loader2 size={13} className="animate-spin" /> Cargando…</p>}
          {errorOtro && <p className="mt-2 text-xs text-red-700">{errorOtro}</p>}
          {lista && (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {lista.map((j) => {
                const ya = sel.has(j.id);
                return (
                  <li key={j.id}>
                    <button type="button" disabled={ya} onClick={() => convocarDeOtro(j)} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left ${ya ? "border-green-600 bg-green-50 text-green-800" : "border-linea hover:bg-suave"}`}>
                      <span className="w-6 text-right text-xs font-semibold text-rojo">{j.dorsal ?? ""}</span>
                      <span className="flex-1 truncate">{j.nombre}</span>
                      {ya ? <Check size={14} /> : <span className="text-xs text-azul">Convocar</span>}
                    </button>
                  </li>
                );
              })}
              {lista.length === 0 && <li className="text-xs text-tinta/50">Ese equipo no tiene jugadores.</li>}
            </ul>
          )}
        </details>
      )}
      {jugadores.length > 0 && (
        <div className="mt-2 space-y-2">
          {partido && <ImagenConvocatoria partido={partido} jugadores={jugadores.filter((j) => sel.has(j.id))} />}
          <button type="button" onClick={copiar} className="btn-secundario w-full !py-1.5">
            {copiado ? <><Check size={15} /> Copiada</> : <><Copy size={15} /> Copiar lista (texto)</>}
          </button>
        </div>
      )}
    </section>
  );
}
