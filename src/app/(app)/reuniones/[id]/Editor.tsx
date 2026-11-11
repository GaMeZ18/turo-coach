"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { guardarReunion } from "../actions";

/** Texto de la reunión que se guarda solo al salir del campo (orden del día y acta) */
export function TextoReunion({ id, campo, valor, titulo, placeholder, filas = 8 }: { id: string; campo: "orden_dia" | "acta"; valor: string | null; titulo: string; placeholder: string; filas?: number }) {
  const [texto, setTexto] = useState(valor ?? "");
  const [guardado, setGuardado] = useState(valor ?? "");
  const [pend, start] = useTransition();
  const [ok, setOk] = useState(false);
  const guardar = () => {
    if (texto === guardado) return;
    start(async () => { const r = await guardarReunion(id, { [campo]: texto }); if (!r.error) { setGuardado(texto); setOk(true); setTimeout(() => setOk(false), 1500); } });
  };
  return (
    <section className="tarjeta p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{titulo}</h2>
        <span className="text-xs text-tinta/50">{pend ? <Loader2 size={13} className="animate-spin" /> : ok ? <span className="flex items-center gap-1 text-green-700"><Check size={13} /> Guardado</span> : texto !== guardado ? "Sin guardar" : ""}</span>
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={guardar} rows={filas} placeholder={placeholder} className="campo mt-2" />
    </section>
  );
}

/** Quién está convocado (se puede añadir gente: le llega aviso) */
export function Convocados({ id, perfiles, asistentes, editable }: { id: string; perfiles: { id: string; nombre: string }[]; asistentes: string[]; editable: boolean }) {
  const [sel, setSel] = useState(new Set(asistentes));
  const [editando, setEditando] = useState(false);
  const [pend, start] = useTransition();
  const nombres = perfiles.filter((p) => sel.has(p.id)).map((p) => p.nombre);
  return (
    <section className="tarjeta p-4">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Convocados ({sel.size})</h2>
        {editable && <button type="button" onClick={() => (editando ? start(async () => { await guardarReunion(id, { asistentes: [...sel] }); setEditando(false); }) : setEditando(true))} className="text-sm text-azul underline">{pend ? "Guardando…" : editando ? "Guardar" : "Cambiar"}</button>}
      </div>
      {editando ? (
        <div className="mt-2 grid max-h-64 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
          {perfiles.map((p) => <label key={p.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} /> <span className="truncate">{p.nombre}</span></label>)}
        </div>
      ) : <p className="mt-1 text-sm text-tinta/70">{nombres.join(", ") || "—"}</p>}
    </section>
  );
}
