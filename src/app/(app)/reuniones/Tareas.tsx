"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { borrarTarea, crearTarea, marcarTarea } from "./actions";

export type TareaV = { id: string; titulo: string; responsable_id: string | null; responsable: string | null; fecha_limite: string | null; hecha: boolean; reunion?: string | null; reunion_id?: string | null };

const corta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

/** Lista de tareas con responsable y fecha; cada uno marca las suyas como hechas */
export default function Tareas({ tareas, perfiles = [], reunionId = null, yo, crear = true, verReunion = false }: {
  tareas: TareaV[]; perfiles?: { id: string; nombre: string }[]; reunionId?: string | null; yo: string; crear?: boolean; verReunion?: boolean;
}) {
  const [lista, setLista] = useState(tareas);
  useEffect(() => setLista(tareas), [tareas]);
  const [f, setF] = useState({ titulo: "", responsable: "", fecha: "" });
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const hoy = new Date().toISOString().slice(0, 10);
  const marcar = (t: TareaV) => {
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, hecha: !t.hecha } : x)));
    start(async () => { const r = await marcarTarea(t.id, !t.hecha); if (r.error) { setError("Solo puede marcarla su responsable o quien la creó."); setLista((l) => l.map((x) => (x.id === t.id ? t : x))); } });
  };
  const ordenadas = [...lista].sort((a, b) => Number(a.hecha) - Number(b.hecha) || (a.fecha_limite ?? "9").localeCompare(b.fecha_limite ?? "9"));

  return (
    <div>
      <ul className="divide-y divide-linea">
        {ordenadas.map((t) => {
          const tarde = !t.hecha && t.fecha_limite && t.fecha_limite < hoy;
          return (
            <li key={t.id} className="flex items-start gap-2 py-2 text-sm">
              <button type="button" onClick={() => marcar(t)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${t.hecha ? "border-green-600 bg-green-600 text-white" : "border-linea text-transparent hover:border-green-600"}`} aria-label="Hecha"><Check size={12} strokeWidth={3} /></button>
              <span className="min-w-0 flex-1">
                <span className={t.hecha ? "text-tinta/50 line-through" : ""}>{t.titulo}</span>
                <span className="block text-[11px] text-tinta/50">
                  {t.responsable_id === yo ? <strong className="text-azul">Tú</strong> : t.responsable ?? "Sin responsable"}
                  {t.fecha_limite && <span className={tarde ? "font-semibold text-red-700" : ""}> · para el {corta(t.fecha_limite)}{tarde ? " (vencida)" : ""}</span>}
                  {verReunion && t.reunion && <a href={`/reuniones/${t.reunion_id}`} className="ml-1 underline">· {t.reunion}</a>}
                </span>
              </span>
              {crear && <button type="button" onClick={() => confirm("¿Borrar la tarea?") && start(async () => { const r = await borrarTarea(t.id); if (!r.error) setLista((l) => l.filter((x) => x.id !== t.id)); })} className="text-tinta/30 hover:text-rojo"><Trash2 size={13} /></button>}
            </li>
          );
        })}
        {lista.length === 0 && <li className="py-2 text-sm text-tinta/50">No hay tareas.</li>}
      </ul>
      {crear && (
        <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_180px_140px_auto]" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await crearTarea({ reunionId, titulo: f.titulo, responsable: f.responsable || null, fechaLimite: f.fecha || null });
            if (r.error) setError(r.error);
            else { setError(null); setLista((l) => [...l, { id: `tmp-${Date.now()}`, titulo: f.titulo, responsable_id: f.responsable || null, responsable: perfiles.find((p) => p.id === f.responsable)?.nombre ?? null, fecha_limite: f.fecha || null, hecha: false }]); setF({ titulo: "", responsable: "", fecha: "" }); }
          });
        }}>
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} maxLength={200} placeholder="Nueva tarea" className="campo" />
          <select value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value })} className="campo">
            <option value="">Responsable…</option>
            {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="campo" />
          <button className="btn-secundario" disabled={pend || !f.titulo.trim()}>{pend && <Loader2 size={14} className="animate-spin" />} Añadir</button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
