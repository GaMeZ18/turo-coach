"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { borrarComentario, comentar, reaccionar } from "../actions";
import { EMOJIS_REACCION } from "@/lib/noticias";

type Reaccion = { emoji: string; perfil_id: string; nombre: string };
type Comentario = { id: string; perfil_id: string; nombre: string; texto: string; gif: string | null; created_at: string };

const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Reacciones con emoji y comentarios de texto debajo de la noticia */
export default function Interaccion({ noticiaId, yo, coordinador, reacciones, comentarios }: {
  noticiaId: string; yo: string; coordinador: boolean; reacciones: Reaccion[]; comentarios: Comentario[];
}) {
  const [reac, setReac] = useState(reacciones);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const tocar = (emoji: string) => {
    const mia = reac.some((r) => r.emoji === emoji && r.perfil_id === yo);
    setReac((l) => mia ? l.filter((r) => !(r.emoji === emoji && r.perfil_id === yo)) : [...l, { emoji, perfil_id: yo, nombre: "Tú" }]);
    start(() => reaccionar(noticiaId, emoji));
  };
  const enviar = () => start(async () => {
    setError(null);
    const r = await comentar(noticiaId, texto, null);
    if (r.error) { setError(r.error); return; }
    setTexto("");
  });

  return (
    <div className="mt-5 space-y-4">
      {/* Reacciones */}
      <div className="flex flex-wrap gap-1.5">
        {EMOJIS_REACCION.map((e) => {
          const de = reac.filter((r) => r.emoji === e);
          const mia = de.some((r) => r.perfil_id === yo);
          return (
            <button key={e} type="button" onClick={() => tocar(e)} title={de.map((r) => r.nombre).join(", ") || "Reaccionar"}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition ${mia ? "border-azul bg-azul/10" : "border-linea bg-white hover:bg-suave"}`}>
              <span className="text-base leading-none">{e}</span>{de.length > 0 && <span className="text-xs font-semibold tabular-nums">{de.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Comentarios */}
      <section className="tarjeta p-4">
        <h2 className="font-semibold">Comentarios ({comentarios.length})</h2>
        <ul className="mt-2 space-y-3">
          {comentarios.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul text-xs font-bold text-oro">{c.nombre.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-tinta/50"><strong className="text-tinta">{c.nombre}</strong> · {cuando(c.created_at)}</p>
                {c.texto && <p className="whitespace-pre-line">{c.texto}</p>}
                {c.gif && <img src={c.gif} alt="GIF" className="mt-1 max-h-48 max-w-full rounded-lg" loading="lazy" />}
              </div>
              {(c.perfil_id === yo || coordinador) && (
                <button type="button" onClick={() => start(() => borrarComentario(noticiaId, c.id))} title="Borrar comentario" className="self-start text-tinta/30 hover:text-red-700"><Trash2 size={14} /></button>
              )}
            </li>
          ))}
          {!comentarios.length && <li className="text-sm text-tinta/50">Sé el primero en comentar.</li>}
        </ul>

        <div className="mt-3 space-y-2 border-t border-linea pt-3">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={500} placeholder="Escribe un comentario…" className="campo text-sm" />
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={enviar} disabled={pendiente || !texto.trim()} className="btn-primario !py-1.5 text-sm">
              {pendiente ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Comentar
            </button>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </section>
    </div>
  );
}

