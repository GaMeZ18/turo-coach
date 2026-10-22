"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { alternarConvocado } from "../actions";

export default function Convocatoria({
  partidoId, jugadores, convocados,
}: {
  partidoId: string;
  jugadores: { id: string; nombre: string; dorsal: number | null }[];
  convocados: string[];
}) {
  const [sel, setSel] = useState(new Set(convocados));
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

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Convocatoria</h2>
        <span className="text-sm text-tinta/60">{sel.size}/{jugadores.length}{pendiente ? " · guardando…" : ""}</span>
      </div>
      <ul className="tarjeta mt-2 divide-y divide-linea">
        {jugadores.map((j) => {
          const on = sel.has(j.id);
          return (
            <li key={j.id}>
              <button type="button" onClick={() => alternar(j.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-suave">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-azul bg-azul text-white" : "border-linea"}`}>
                  {on && <Check size={14} />}
                </span>
                <span className="w-6 text-right text-xs font-semibold text-rojo">{j.dorsal ?? ""}</span>
                <span className={`min-w-0 flex-1 truncate ${on ? "" : "text-tinta/40 line-through"}`}>{j.nombre}</span>
              </button>
            </li>
          );
        })}
        {jugadores.length === 0 && <li className="px-3 py-4 text-sm text-tinta/50">El equipo no tiene jugadores.</li>}
      </ul>
      {jugadores.length > 0 && (
        <button type="button" onClick={copiar} className="btn-secundario mt-2 w-full !py-1.5">
          {copiado ? <><Check size={15} /> Copiada</> : <><Copy size={15} /> Copiar lista (para WhatsApp)</>}
        </button>
      )}
    </section>
  );
}
