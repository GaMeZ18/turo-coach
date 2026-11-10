"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import MiniPizarra from "@/components/pizarra/Mini";
import VisorPublico from "@/components/publico/VisorPublico";

type Item = { id: string; notas: string | null; titulo: string; tipo: string; categoria: string | null; descripcion: string | null; preview: string | null; pizarra: unknown };

/** Lista de jugadas; solo se carga la pizarra animada de la que está abierta */
export default function Jugadas({ items }: { items: Item[] }) {
  const [abierta, setAbierta] = useState<string | null>(items[0]?.id ?? null);
  if (!items.length) return <p className="mt-4 text-sm text-tinta/60">Todavía no hay jugadas.</p>;
  return (
    <ol className="mt-4 space-y-3">
      {items.map((x, i) => {
        const open = abierta === x.id;
        return (
          <li key={x.id} className="tarjeta overflow-hidden">
            <button type="button" onClick={() => setAbierta(open ? null : x.id)} className="flex w-full items-center gap-3 p-2 text-left">
              <span className="flex aspect-[15/14] w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-suave">
                {x.preview ? <img src={x.preview} alt="" className="h-full w-full object-contain" /> : x.pizarra ? <MiniPizarra pizarra={x.pizarra} className="h-full w-full" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold"><span className="mr-1 text-tinta/40">{i + 1}.</span>{x.titulo}</span>
                <span className="block text-xs text-tinta/50">{x.tipo === "sistema" ? "Sistema" : x.categoria ?? "Ejercicio"}</span>
              </span>
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open && (
              <div className="space-y-2 border-t border-linea p-3">
                {x.notas && <p className="rounded-lg bg-oro/15 p-2 text-sm font-medium">{x.notas}</p>}
                {x.pizarra ? <VisorPublico pizarra={x.pizarra} titulo={x.titulo} /> : null}
                {x.descripcion && <p className="whitespace-pre-line text-sm">{x.descripcion}</p>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
