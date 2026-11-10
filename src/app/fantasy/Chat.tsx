"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { borrarMensaje, enviarMensaje, leerMensajes } from "./actions";

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
    <section className="tarjeta overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-linea px-3 py-2 font-semibold"><MessageCircle size={17} className="text-azul" /> Chat de la jornada</h2>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3">
        {msgs === null ? <p className="flex items-center gap-1 text-sm text-tinta/50"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
          : msgs.length === 0 ? <p className="text-sm text-tinta/50">Nadie ha escrito todavía. ¡Empieza tú el pique! 😄</p>
          : msgs.map((m) => (
            <div key={m.id} className={`flex ${m.yo ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${m.yo ? "rounded-br-sm bg-azul text-white" : "rounded-bl-sm bg-suave"}`}>
                {!m.yo && <p className="text-[11px] font-bold text-azul">{m.alias}</p>}
                {m.borrado ? <p className="italic opacity-60">Mensaje borrado</p> : <p className="whitespace-pre-line break-words">{m.texto}</p>}
                <p className={`flex items-center justify-end gap-1 text-[10px] ${m.yo ? "text-white/70" : "text-tinta/45"}`}>
                  {hora(m.fecha)}
                  {!m.borrado && (m.yo || esAdmin) && <button onClick={() => borrar(m.id)} aria-label="Borrar" className="hover:text-rojo"><Trash2 size={11} /></button>}
                </p>
              </div>
            </div>
          ))}
        <div ref={fin} />
      </div>
      {silenciado ? <p className="border-t border-linea p-3 text-sm text-tinta/60">El administrador te ha silenciado en el chat.</p> : (
        <div className="flex gap-2 border-t border-linea p-2">
          <input className="campo flex-1" placeholder="Escribe… (con respeto 😉)" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && texto.trim() && enviar()} />
          <button onClick={enviar} disabled={pend || !texto.trim()} className="btn-primario" aria-label="Enviar">{pend ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
        </div>
      )}
      {error && <p className="px-3 pb-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
