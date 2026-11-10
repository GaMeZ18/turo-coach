"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { borrarMensaje, enviarMensaje, leerMensajes } from "./actions";
import { Escudo } from "./ui";

type Msg = Awaited<ReturnType<typeof leerMensajes>>[number];
const hora = (iso: string) => new Date(iso).toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Chat de la jornada: se actualiza solo cada 15 segundos */
export default function Chat({ jornada, esAdmin, silenciado }: { jornada: string; esAdmin: boolean; silenciado: boolean }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const fin = useRef<HTMLDivElement>(null);
  const cargar = useCallback(async () => { try { setMsgs(await leerMensajes(jornada)); } catch { /* sin conexión */ } }, [jornada]);
  useEffect(() => {
    void cargar();
    const t = setInterval(() => { if (document.visibilityState === "visible") void cargar(); }, 15000);
    return () => clearInterval(t);
  }, [cargar]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [msgs?.length]);

  const enviar = () => start(async () => {
    setError(null);
    const r = await enviarMensaje(jornada, texto);
    if (r.error) setError(r.error); else { setTexto(""); await cargar(); }
  });
  const borrar = (id: string) => { if (confirm("¿Borrar este mensaje?")) start(async () => { await borrarMensaje(id); await cargar(); }); };

  return (
    <section className="fx-card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-[var(--fx-borde)] px-3 py-2.5 fx-display text-lg"><MessageCircle size={18} className="text-[var(--fx-oro)]" /> Chat de la jornada</h2>
      <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-3">
        {msgs === null ? <p className="flex items-center gap-1 text-sm fx-suave"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
          : msgs.length === 0 ? <p className="text-sm fx-suave">Nadie ha escrito todavía. ¡Sé el primero en escribir! 🏀</p>
          : msgs.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.yo ? "justify-end" : "justify-start"}`}>
              {!m.yo && <Escudo alias={m.alias} emoji={m.emoji} color={m.color} foto={m.foto} size={30} />}
              <div className={`max-w-[80%] px-3 py-1.5 text-sm shadow ${m.yo ? "fx-burbuja-yo" : "fx-burbuja"}`}>
                <p className="text-[12px] font-bold leading-tight">{m.alias} {m.mostrar && <span className="font-normal opacity-60">· {m.mostrar}</span>}</p>
                {m.borrado ? <p className="italic opacity-60">Mensaje borrado</p> : <p className="whitespace-pre-line break-words">{m.texto}</p>}
                <p className="flex items-center justify-end gap-1 text-[10px] opacity-60">
                  {hora(m.fecha)}{m.yo && " ✓✓"}
                  {!m.borrado && (m.yo || esAdmin) && <button onClick={() => borrar(m.id)} aria-label="Borrar" className="ml-1 hover:text-red-600"><Trash2 size={11} /></button>}
                </p>
              </div>
            </div>
          ))}
        <div ref={fin} />
      </div>
      {silenciado ? <p className="border-t border-[var(--fx-borde)] p-3 text-sm fx-suave">El administrador te ha silenciado en el chat.</p> : (
        <div className="flex gap-2 border-t border-[var(--fx-borde)] p-2">
          <input className="fx-input flex-1 !rounded-full" placeholder="Escribe un mensaje…" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && texto.trim() && enviar()} />
          <button onClick={enviar} disabled={pend || !texto.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--fx-rojo)] text-white disabled:opacity-50" aria-label="Enviar">{pend ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
        </div>
      )}
      {error && <p className="px-3 pb-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}
