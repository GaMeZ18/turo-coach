"use client";

import { useState, useTransition } from "react";
import { Eye, Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { borrarComentarioEntreno, comentarEntreno } from "../actions";

export type ComentarioEntreno = { id: string; texto: string; visita: boolean; created_at: string; autor_id: string; perfiles: { nombre: string | null } | null };

const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Comentarios del entreno: el coordinador deja feedback (o apunta su visita en directo) y el staff responde */
export default function Comentarios({ entrenoId, yo, coordinador, comentarios }: { entrenoId: string; yo: string; coordinador: boolean; comentarios: ComentarioEntreno[] }) {
  const [texto, setTexto] = useState("");
  const [visita, setVisita] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const visitas = comentarios.filter((c) => c.visita).length;

  const enviar = () => start(async () => {
    setError(null);
    const r = await comentarEntreno(entrenoId, texto, visita);
    if (r.error) setError(r.error); else { setTexto(""); setVisita(false); }
  });
  const borrar = (id: string) => { if (confirm("¿Borrar este comentario?")) start(async () => { const r = await borrarComentarioEntreno(entrenoId, id); if (r.error) setError(r.error); }); };

  return (
    <section className="tarjeta mt-6 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><MessageSquare size={18} className="text-azul" /> Comentarios
        {visitas > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"><Eye size={12} className="mr-0.5 inline" /> Visitado por coordinación</span>}
      </h2>
      {comentarios.length === 0 && <p className="mt-1 text-sm text-tinta/60">{coordinador ? "Deja tu feedback al cuerpo técnico. Si lo has visto en directo, márcalo como visita." : "Aquí verás los comentarios de coordinación y podrás responder."}</p>}
      <ul className="mt-3 space-y-2">
        {comentarios.map((c) => (
          <li key={c.id} className={`rounded-lg p-3 text-sm ${c.visita ? "border border-green-200 bg-green-50" : c.autor_id === yo ? "bg-azul/5" : "bg-suave"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">{c.perfiles?.nombre ?? "Alguien"}</span>
              {c.visita && <span className="inline-flex items-center gap-0.5 font-semibold text-green-800"><Eye size={12} /> Visita en directo</span>}
              <span className="text-tinta/50">{cuando(c.created_at)}</span>
              {(c.autor_id === yo || coordinador) && (
                <button type="button" onClick={() => borrar(c.id)} className="ml-auto text-tinta/40 hover:text-rojo" aria-label="Borrar comentario"><Trash2 size={14} /></button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line">{c.texto}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2">
        <textarea value={texto} onChange={(ev) => setTexto(ev.target.value)} rows={3} maxLength={2000} className="campo text-sm"
          placeholder={coordinador ? (visita ? "Qué has visto: lo que ha funcionado, qué mejorar, actitud del grupo…" : "Feedback para el cuerpo técnico…") : "Responder…"} />
        <div className="flex flex-wrap items-center gap-2">
          {coordinador && (
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={visita} onChange={(ev) => setVisita(ev.target.checked)} /> <Eye size={14} /> Lo he visto en directo (visita)
            </label>
          )}
          <button type="button" onClick={enviar} disabled={pendiente || !texto.trim()} className="btn-primario ml-auto">
            {pendiente ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
          </button>
        </div>
        <p className="text-xs text-tinta/50">Se avisa al cuerpo técnico del equipo{coordinador ? "" : " y a quien haya comentado"}.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
