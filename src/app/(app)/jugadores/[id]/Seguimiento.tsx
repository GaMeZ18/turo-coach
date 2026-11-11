"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Lock, RotateCcw, Target, Trash2, X } from "lucide-react";
import { anadirNotaJugador, anadirObjetivoJugador, borrarNotaJugador, borrarObjetivoJugador, estadoObjetivoJugador } from "../actions";

export type NotaJ = { id: string; texto: string; created_at: string; autor_id: string | null; autor: string | null };
export type ObjetivoJ = { id: string; texto: string; estado: "en_curso" | "conseguido" | "descartado"; created_at: string; cerrado_en: string | null };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit", timeZone: "Europe/Madrid" });

/** Objetivos individuales y notas privadas del jugador: solo los ve el staff y pasan de una temporada a otra */
export default function Seguimiento({ jugadorId, nombre, yo, coordinador, notas, objetivos }: {
  jugadorId: string; nombre: string; yo: string; coordinador: boolean; notas: NotaJ[]; objetivos: ObjetivoJ[];
}) {
  const [obj, setObj] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verCerrados, setVerCerrados] = useState(false);
  const [pend, start] = useTransition();
  const abiertos = objetivos.filter((o) => o.estado === "en_curso");
  const cerrados = objetivos.filter((o) => o.estado !== "en_curso");
  const ok = (r: { error?: string }, limpiar: () => void) => { if (r.error) setError(r.error); else { setError(null); limpiar(); } };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Seguimiento</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-suave px-2 py-0.5 text-[11px] text-tinta/60"><Lock size={11} /> Solo staff · se mantiene de una temporada a otra</span>
      </div>

      <div className="tarjeta p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Target size={16} className="text-rojo" /> Objetivos de {nombre.split(" ")[0]}</h3>
        <ul className="mt-2 space-y-1.5">
          {abiertos.map((o) => (
            <li key={o.id} className="flex items-start gap-2 text-sm">
              <button type="button" title="Conseguido" onClick={() => start(() => estadoObjetivoJugador(jugadorId, o.id, "conseguido"))} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-linea text-transparent hover:border-green-600 hover:text-green-600"><Check size={12} strokeWidth={3} /></button>
              <span className="flex-1">{o.texto}<span className="ml-1 text-[11px] text-tinta/40">desde {fecha(o.created_at)}</span></span>
              <button type="button" title="Descartar" onClick={() => start(() => estadoObjetivoJugador(jugadorId, o.id, "descartado"))} className="text-tinta/30 hover:text-tinta"><X size={15} /></button>
            </li>
          ))}
          {abiertos.length === 0 && <li className="text-sm text-tinta/50">Sin objetivos en curso.</li>}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => ok(await anadirObjetivoJugador(jugadorId, obj), () => setObj(""))); }}>
          <input value={obj} onChange={(e) => setObj(e.target.value)} maxLength={300} placeholder="Ej.: Entrar a canasta con la mano izquierda" className="campo flex-1" />
          <button className="btn-secundario shrink-0" disabled={pend || !obj.trim()}>Añadir</button>
        </form>
        {cerrados.length > 0 && (
          <div className="mt-3">
            <button type="button" onClick={() => setVerCerrados(!verCerrados)} className="text-xs text-azul underline">{verCerrados ? "Ocultar" : "Ver"} historial ({cerrados.filter((o) => o.estado === "conseguido").length} conseguidos)</button>
            {verCerrados && (
              <ul className="mt-1.5 space-y-1">
                {cerrados.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-sm">
                    <span>{o.estado === "conseguido" ? "✅" : "➖"}</span>
                    <span className={`flex-1 ${o.estado === "descartado" ? "text-tinta/50 line-through" : ""}`}>{o.texto}<span className="ml-1 text-[11px] text-tinta/40">{o.cerrado_en ? fecha(o.cerrado_en) : ""}</span></span>
                    <button type="button" title="Volver a abrir" onClick={() => start(() => estadoObjetivoJugador(jugadorId, o.id, "en_curso"))} className="text-tinta/30 hover:text-tinta"><RotateCcw size={13} /></button>
                    <button type="button" title="Borrar" onClick={() => confirm("¿Borrar este objetivo?") && start(() => borrarObjetivoJugador(jugadorId, o.id))} className="text-tinta/30 hover:text-rojo"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="tarjeta p-4">
        <h3 className="text-sm font-semibold">Notas del cuerpo técnico</h3>
        <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => ok(await anadirNotaJugador(jugadorId, nota), () => setNota(""))); }}>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={2000} placeholder="Cómo le has visto hoy, una conversación, algo a vigilar…" className="campo" />
          <button className="btn-primario !py-1.5" disabled={pend || !nota.trim()}>{pend && <Loader2 size={15} className="animate-spin" />} Guardar nota</button>
        </form>
        <ul className="mt-3 divide-y divide-linea">
          {notas.map((n) => (
            <li key={n.id} className="py-2 text-sm">
              <p className="flex items-center gap-2 text-[11px] text-tinta/50">
                <span>{fecha(n.created_at)} · {n.autor ?? "—"}</span>
                {(n.autor_id === yo || coordinador) && <button type="button" onClick={() => confirm("¿Borrar esta nota?") && start(() => borrarNotaJugador(jugadorId, n.id))} className="hover:text-rojo"><Trash2 size={12} /></button>}
              </p>
              <p className="whitespace-pre-line">{n.texto}</p>
            </li>
          ))}
          {notas.length === 0 && <li className="py-2 text-sm text-tinta/50">Aún no hay notas.</li>}
        </ul>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
