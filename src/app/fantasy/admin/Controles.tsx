"use client";

import { useState, useTransition } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { adminAnular, adminQuitarFoto, adminBorrarParticipante, adminCerrarTemporada, adminConfig, adminEspecial, adminSilenciar } from "../actions";

function useAccion() {
  const [pend, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | undefined>) => start(async () => { setError(null); const r = await fn(); if (r?.error) setError(r.error); });
  return { pend, error, run };
}

export function Interruptor({ abierto }: { abierto: boolean }) {
  const a = useAccion();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={abierto} disabled={a.pend} onChange={(e) => {
        if (e.target.checked && !confirm("¿Abrir el fantasy a todo el club? Cualquiera con el enlace podrá apuntarse.")) return;
        a.run(() => adminConfig({ abierto: e.target.checked }));
      }} />
      Abierto a todo el club {a.pend && <Loader2 size={14} className="animate-spin" />}
    </label>
  );
}
export function Premio({ valor }: { valor: string }) {
  const [v, setV] = useState(valor); const a = useAccion();
  return (
    <div className="flex gap-2">
      <input className="fx-input flex-1" placeholder="Premio (p. ej. sudadera del club)" value={v} onChange={(e) => setV(e.target.value)} maxLength={200} />
      <button className="fx-btn-sec" onClick={() => a.run(() => adminConfig({ premio: v }))} disabled={a.pend}>{a.pend ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</button>
    </div>
  );
}
export function Inicio({ valor }: { valor: string }) {
  const [v, setV] = useState(valor); const a = useAccion();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Primera jornada (semana del)</span>
      <input type="date" className="fx-input !w-auto" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="fx-btn-sec" onClick={() => a.run(() => adminConfig({ inicio: v }))} disabled={a.pend}>Guardar</button>
    </div>
  );
}
export function CopiarEnlace({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded bg-white/10 px-2 py-1.5 text-xs">{url}</code>
      <button className="fx-btn-sec" onClick={async () => { try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} }}>{ok ? <Check size={15} /> : <Link2 size={15} />} Copiar</button>
    </div>
  );
}
export function Especial({ lunes, partidoId, activo, texto }: { lunes: string; partidoId: string; activo: boolean; texto: string }) {
  const a = useAccion();
  return (
    <label className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${activo ? "bg-red-900/50 font-semibold text-red-100" : "bg-white/10"}`}>
      <input type="checkbox" checked={activo} disabled={a.pend} onChange={(e) => a.run(() => adminEspecial(lunes, partidoId, e.target.checked))} />
      {activo ? "🔥 " : ""}{texto}
    </label>
  );
}
export function Anular({ lunes, anulada }: { lunes: string; anulada: boolean }) {
  const a = useAccion();
  return <button className={`rounded px-2 py-0.5 text-xs font-semibold ${anulada ? "bg-amber-900/60 text-amber-100" : "bg-white/10"}`} disabled={a.pend}
    onClick={() => (anulada || confirm("¿Anular esta jornada? No contará para nadie.")) && a.run(() => adminAnular(lunes, !anulada))}>{anulada ? "Anulada · reactivar" : "Anular"}</button>;
}
export function Silenciar({ id, silenciado }: { id: string; silenciado: boolean }) {
  const a = useAccion();
  return <button className={`rounded px-2 py-0.5 text-xs font-semibold ${silenciado ? "bg-red-900/60 text-red-100" : "bg-white/10"}`} disabled={a.pend} onClick={() => a.run(() => adminSilenciar(id, !silenciado))}>{silenciado ? "Silenciado" : "Silenciar"}</button>;
}
export function Borrar({ id, alias }: { id: string; alias: string }) {
  const a = useAccion();
  return <button className="rounded px-2 py-0.5 text-xs text-white/50 hover:text-rojo" disabled={a.pend} onClick={() => confirm(`¿Borrar a «${alias}» del fantasy con todos sus equipos y mensajes? No se puede deshacer.`) && a.run(() => adminBorrarParticipante(id))}>Borrar</button>;
}
export function CerrarTemporada({ cerrada, lider }: { cerrada: boolean; lider: string | null }) {
  const a = useAccion();
  return (
    <div>
      {cerrada ? (
        <button className="fx-btn-sec" disabled={a.pend} onClick={() => confirm("¿Reabrir la temporada?") && a.run(() => adminCerrarTemporada(false))}>Reabrir temporada</button>
      ) : (
        <button className="fx-btn" disabled={a.pend || !lider} onClick={() => confirm(`¿Cerrar la temporada? Campeón: ${lider}. Se publicará en Noticias.`) && a.run(() => adminCerrarTemporada(true))}>🏆 Cerrar temporada{lider ? ` (campeón: ${lider})` : ""}</button>
      )}
      {a.error && <p className="mt-1 text-sm text-red-300">{a.error}</p>}
    </div>
  );
}
export function QuitarFoto({ id }: { id: string }) {
  const a = useAccion();
  return <button className="rounded px-2 py-0.5 text-xs text-white/60 hover:text-white" disabled={a.pend} onClick={() => confirm("¿Quitar la foto de este participante?") && a.run(() => adminQuitarFoto(id))}>Quitar foto</button>;
}
