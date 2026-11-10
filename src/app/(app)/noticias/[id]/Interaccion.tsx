"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlay, Loader2, Send, Trash2, X } from "lucide-react";
import { borrarComentario, comentar, reaccionar } from "../actions";
import { EMOJIS_REACCION } from "@/lib/noticias";

type Reaccion = { emoji: string; perfil_id: string; nombre: string };
type Comentario = { id: string; perfil_id: string; nombre: string; texto: string; gif: string | null; created_at: string };

const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Reacciones con emoji y comentarios (texto corto o GIF) debajo de la noticia */
export default function Interaccion({ noticiaId, yo, coordinador, reacciones, comentarios }: {
  noticiaId: string; yo: string; coordinador: boolean; reacciones: Reaccion[]; comentarios: Comentario[];
}) {
  const [reac, setReac] = useState(reacciones);
  const [texto, setTexto] = useState("");
  const [gif, setGif] = useState<string | null>(null);
  const [verGif, setVerGif] = useState(false);
  const [enlaceGif, setEnlaceGif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const fichero = useRef<HTMLInputElement>(null);

  const tocar = (emoji: string) => {
    const mia = reac.some((r) => r.emoji === emoji && r.perfil_id === yo);
    setReac((l) => mia ? l.filter((r) => !(r.emoji === emoji && r.perfil_id === yo)) : [...l, { emoji, perfil_id: yo, nombre: "Tú" }]);
    start(() => reaccionar(noticiaId, emoji));
  };
  const subirGif = (f: File | undefined) => {
    if (!f) return;
    if (!/image\/(gif|webp)/.test(f.type)) { setError("Tiene que ser un GIF."); return; }
    if (f.size > 1_000_000) { setError("El GIF pesa demasiado (máximo 1 MB)."); return; }
    const r = new FileReader();
    r.onload = () => { setGif(String(r.result)); setVerGif(false); setError(null); };
    r.readAsDataURL(f);
  };
  const enviar = () => start(async () => {
    setError(null);
    const r = await comentar(noticiaId, texto, gif);
    if (r.error) { setError(r.error); return; }
    setTexto(""); setGif(null); setEnlaceGif("");
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
          {gif && (
            <div className="relative inline-block">
              <img src={gif} alt="GIF elegido" className="max-h-32 rounded-lg" />
              <button type="button" onClick={() => setGif(null)} aria-label="Quitar GIF" className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 shadow"><X size={14} /></button>
            </div>
          )}
          {verGif && !gif && (
            <div className="space-y-1.5 rounded-lg bg-suave p-2 text-xs">
              <p className="text-tinta/60">Pega el enlace de un GIF (en Giphy o Tenor: «Copiar enlace del GIF») o sube uno desde el móvil.</p>
              <div className="flex gap-1.5">
                <input value={enlaceGif} onChange={(e) => setEnlaceGif(e.target.value)} placeholder="https://media.giphy.com/…gif" className="campo !py-1 text-xs" />
                <button type="button" onClick={() => { if (/^https:\/\//.test(enlaceGif.trim())) { setGif(enlaceGif.trim()); setVerGif(false); } }} className="btn-secundario !px-2 !py-1 text-xs">Usar</button>
              </div>
              <button type="button" onClick={() => fichero.current?.click()} className="text-azul underline">Subir un GIF del móvil</button>
              <input ref={fichero} type="file" accept="image/gif,image/webp" hidden onChange={(e) => subirGif(e.target.files?.[0])} />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setVerGif((v) => !v)} className="inline-flex items-center gap-1 text-sm text-azul"><ImagePlay size={16} /> GIF</button>
            <button type="button" onClick={enviar} disabled={pendiente || (!texto.trim() && !gif)} className="btn-primario !py-1.5 text-sm">
              {pendiente ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Comentar
            </button>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </section>
    </div>
  );
}
