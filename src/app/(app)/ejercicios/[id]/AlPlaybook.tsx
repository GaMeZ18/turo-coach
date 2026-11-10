"use client";

import { useState, useTransition } from "react";
import { BookMarked, Check, Loader2, X } from "lucide-react";
import { anadirAlPlaybook } from "@/app/(app)/playbook/actions";

/** Añadir el ejercicio al playbook de uno de mis equipos */
export default function AlPlaybook({ ejercicioId, equipos }: { ejercicioId: string; equipos: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [hecho, setHecho] = useState<Record<string, string>>({});
  const [pendiente, start] = useTransition();
  if (!equipos.length) return null;
  const anadir = (id: string) => start(async () => {
    const r = await anadirAlPlaybook(id, ejercicioId);
    setHecho((h) => ({ ...h, [id]: r.error ?? "ok" }));
  });
  return (
    <div className="relative">
      <button type="button" className="btn-secundario" onClick={() => setAbierto((a) => !a)} title="Añadir al playbook de un equipo"><BookMarked size={16} /> Al playbook</button>
      {abierto && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-linea bg-white p-2 text-sm shadow-lg">
          <div className="flex items-center justify-between px-1"><p className="font-semibold">Añadir al playbook de…</p><button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={16} /></button></div>
          <ul className="mt-1 max-h-64 overflow-y-auto">
            {equipos.map((e) => (
              <li key={e.id}>
                <button type="button" disabled={pendiente || hecho[e.id] === "ok"} onClick={() => anadir(e.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-suave disabled:opacity-70">
                  <span className="flex-1">{e.nombre}</span>
                  {hecho[e.id] === "ok" ? <Check size={15} className="text-green-700" /> : pendiente ? <Loader2 size={14} className="animate-spin text-tinta/40" /> : null}
                </button>
                {hecho[e.id] && hecho[e.id] !== "ok" && <p className="px-2 text-xs text-red-700">{hecho[e.id]}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
