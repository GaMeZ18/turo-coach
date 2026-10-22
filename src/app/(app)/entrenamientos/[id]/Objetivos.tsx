"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Target } from "lucide-react";
import { aplanar, arbol, type Nodo, type Objetivo } from "@/lib/objetivos";
import { guardarObjetivosEntreno } from "../../planificaciones/actions";

type Plan = { id: string; nombre: string; club: boolean; objetivos: Objetivo[] };

export default function Objetivos({ entrenoId, planes, seleccionados }: { entrenoId: string; planes: Plan[]; seleccionados: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState(() => new Set(seleccionados));
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const arboles = useMemo(() => planes.map((p) => ({ ...p, lista: aplanar(arbol(p.objetivos)) })), [planes]);
  const todos = useMemo(() => new Map<string, Nodo & { plan: string }>(arboles.flatMap((p) => p.lista.map((o) => [o.id, { ...o, plan: p.nombre }] as [string, Nodo & { plan: string }]))), [arboles]);
  const elegidos = seleccionados.map((id) => todos.get(id)).filter((o): o is Nodo & { plan: string } => !!o);

  const alternar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const guardar = () => start(async () => {
    try { await guardarObjetivosEntreno(entrenoId, [...marcados]); setAbierto(false); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "No se ha podido guardar."); }
  });

  return (
    <section className="tarjeta mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Target size={18} className="text-rojo" /> Objetivos del entreno</h2>
        {planes.length > 0 && !abierto && (
          <button type="button" className="btn-secundario !py-1.5 text-sm" onClick={() => { setMarcados(new Set(seleccionados)); setAbierto(true); }}>
            {seleccionados.length ? "Cambiar" : "Elegir objetivos"}
          </button>
        )}
      </div>

      {!abierto && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {elegidos.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${o.colorFinal}1a`, color: o.colorFinal }} title={o.plan}>
              <span className="h-2 w-2 rounded-full" style={{ background: o.colorFinal }} />{o.nombre}
            </span>
          ))}
          {!elegidos.length && (
            <p className="text-sm text-tinta/50">
              {planes.length ? "Ningún objetivo marcado." : <>No hay planificaciones para este equipo. <Link href="/planificaciones" className="text-azul underline">Crea una</Link>.</>}
            </p>
          )}
        </div>
      )}

      {abierto && (
        <div className="mt-3 space-y-4">
          {arboles.map((p) => (
            <div key={p.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">{p.nombre}{p.club ? " · club" : ""}</p>
              <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
                {p.lista.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-suave" style={{ paddingLeft: `${0.25 + o.nivel * 1.1}rem` }}>
                    <input type="checkbox" checked={marcados.has(o.id)} onChange={() => alternar(o.id)} className="h-4 w-4" style={{ accentColor: o.colorFinal }} />
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.colorFinal }} />
                    <span className={o.nivel === 0 ? "font-medium" : ""}>{o.nombre}</span>
                  </label>
                ))}
                {!p.lista.length && <p className="text-sm text-tinta/50">Sin objetivos.</p>}
              </div>
            </div>
          ))}
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primario" onClick={guardar} disabled={pendiente}>
              {pendiente && <Loader2 size={16} className="animate-spin" />} Guardar ({marcados.size})
            </button>
            <button type="button" className="btn-secundario" onClick={() => setAbierto(false)} disabled={pendiente}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}
