"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, RotateCcw, X } from "lucide-react";
import { anularEntreno } from "../actions";

const MOTIVOS = ["🌧️ Lluvia", "✊ Vaga / huelga", "🚫 Pista no disponible", "🎉 Festivo", "👥 Pocos jugadores", "🤒 Entrenador enfermo"];

/** Botón «Anular» con el motivo; si ya está anulado, «Reactivar» */
export default function Anular({ entrenoId, motivo }: { entrenoId: string; motivo: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);
  const [otro, setOtro] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const ir = (m: string | null) => start(async () => {
    setError(null);
    const r = await anularEntreno(entrenoId, m, avisar);
    if (r.error) setError(r.error); else setAbierto(false);
  });

  if (motivo) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <Ban size={18} /> <strong>Entreno anulado</strong> · {motivo}
        <span className="text-xs text-red-700/80">No cuenta para avisos, asistencia ni ocupación de pistas.</span>
        <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} /> Avisar al staff</label>
        <button className="btn-secundario !py-1" disabled={pend} onClick={() => ir(null)}>{pend ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reactivar</button>
        {error && <p className="w-full text-xs">{error}</p>}
      </div>
    );
  }
  return (
    <div className="relative">
      <button type="button" className="btn-secundario" onClick={() => setAbierto((a) => !a)} title="Anular este entreno (lluvia, vaga…)"><Ban size={16} /> Anular</button>
      {abierto && (
        <div className="fixed inset-x-3 top-24 z-40 rounded-xl border border-linea bg-white p-3 text-sm shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-1 sm:w-80">
          <div className="flex items-center justify-between"><p className="font-semibold">¿Por qué se anula?</p><button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={16} /></button></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button key={m} type="button" onClick={() => { setElegido(m); setOtro(""); }} className={`rounded-full border px-2.5 py-1 text-xs ${elegido === m ? "border-azul bg-azul text-white" : "border-linea"}`}>{m}</button>
            ))}
          </div>
          <input className="campo mt-2 text-sm" placeholder="Otro motivo…" value={otro} maxLength={80} onChange={(e) => { setOtro(e.target.value); setElegido(null); }} />
          <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} /> Avisar al resto del cuerpo técnico</label>
          <button type="button" className="btn-peligro mt-2 w-full justify-center" disabled={pend || (!elegido && !otro.trim())} onClick={() => ir(elegido ? elegido.replace(/^\S+\s/, "") : otro)}>
            {pend ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Anular entreno
          </button>
          {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
