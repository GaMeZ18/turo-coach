"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, FileText, Loader2, MessageCircle, MoreVertical, Paperclip, Send, SmilePlus, Trash2, X } from "lucide-react";
import { adminModerar, avisoVisto, borrarMensaje, enviarMensaje, leerMensajes, reaccionar, urlSubidaChat, type Adjunto } from "./actions";
import { REACCIONES } from "@/lib/fantasy/estilo";
import { createClient } from "@/lib/supabase/client";
import { Escudo } from "./ui";

type Datos = Awaited<ReturnType<typeof leerMensajes>>;
type Msg = Datos["mensajes"][number];
const hora = (iso: string) => new Date(iso).toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Imagen o vídeo adjunto (lo sube el administrador) */
function VerAdjunto({ a }: { a: Adjunto & { url: string } }) {
  if (a.tipo.startsWith("image/")) return <a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.nombre} loading="lazy" className="mt-1 max-h-72 w-full rounded-lg object-cover" /></a>;
  if (a.tipo.startsWith("video/")) return <video src={a.url} controls playsInline preload="metadata" className="mt-1 max-h-80 w-full rounded-lg bg-black" />;
  if (a.tipo.startsWith("audio/")) return <audio src={a.url} controls className="mt-1 w-full" />;
  return <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5 underline"><FileText size={16} /> {a.nombre}</a>;
}

/** Imágenes grandes: se reducen a 1600 px antes de subirlas (ocupan mucho menos) */
async function reducir(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.type === "image/gif" || f.size < 600 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    return b ? new File([b], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : f;
  } catch { return f; }
}

/** Menú del administrador sobre el mensaje de otro: avisar o silenciar */
function Moderar({ m, onHecho }: { m: Msg; onHecho: () => void }) {
  const [modo, setModo] = useState<"aviso" | "silencio" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState(24);
  const [borrar, setBorrar] = useState(true);
  const [pend, start] = useTransition();
  const [hecho, setHecho] = useState<string | null>(null);
  const ok = (t: string) => { setHecho(t); setModo(null); setMotivo(""); onHecho(); };
  return (
    <div className="mt-1 w-full max-w-sm rounded-xl border border-[var(--fx-borde)] bg-[#0c1430] p-2 text-xs text-white">
      {hecho ? <p className="text-green-300">{hecho}</p> : !modo ? (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setModo("aviso")} className="rounded-lg bg-amber-500/20 px-2 py-1 font-semibold text-amber-200">⚠️ Avisar a {m.alias}</button>
          <button type="button" onClick={() => setModo("silencio")} className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold text-red-200">🔇 Silenciar</button>
          <button type="button" onClick={() => start(async () => { await adminModerar({ participanteId: m.autor, tipo: "silencio", horas: 0, motivo: "" }); ok("Ya puede volver a escribir."); })} className="rounded-lg bg-white/10 px-2 py-1">Quitar silencio</button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder={modo === "aviso" ? "Mensaje del aviso (le llega a él)" : "Motivo (opcional)"} className="fx-input !py-1.5 text-xs" />
          {modo === "silencio" && (
            <div className="flex flex-wrap gap-1">
              {([[1, "1 hora"], [24, "1 día"], [72, "3 días"], [168, "1 semana"], [-1, "Indefinido"]] as const).map(([h, t]) => (
                <button key={h} type="button" onClick={() => setHoras(h)} className={`rounded-full px-2 py-0.5 ${horas === h ? "bg-[var(--fx-oro)] font-bold text-black" : "bg-white/10"}`}>{t}</button>
              ))}
            </div>
          )}
          {!m.borrado && <label className="flex items-center gap-1.5"><input type="checkbox" checked={borrar} onChange={(e) => setBorrar(e.target.checked)} /> Borrar también este mensaje</label>}
          <div className="flex gap-1.5">
            <button type="button" disabled={pend || (modo === "aviso" && !motivo.trim())} onClick={() => start(async () => {
              const r = await adminModerar({ participanteId: m.autor, tipo: modo, horas, motivo, mensajeId: m.id, borrar });
              if (!r.error) ok(modo === "aviso" ? `Aviso enviado a ${m.alias}.` : `${m.alias} silenciado.`);
            })} className="rounded-lg bg-[var(--fx-rojo)] px-3 py-1 font-semibold disabled:opacity-50">{pend ? <Loader2 size={12} className="animate-spin" /> : "Enviar"}</button>
            <button type="button" onClick={() => setModo(null)} className="rounded-lg bg-white/10 px-3 py-1">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Chat de la jornada: se actualiza solo cada 15 segundos */
export default function Chat({ jornada, esAdmin, silenciado, equipos = [] }: { jornada: string; esAdmin: boolean; silenciado: string | null; equipos?: string[] }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selector, setSelector] = useState<string | null>(null); // mensaje con el selector de reacciones abierto
  const [moderando, setModerando] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pend, start] = useTransition();
  const fin = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const msgs = datos?.mensajes ?? null;
  const sil = datos ? datos.silencio : silenciado;
  // «@» al final: sugerir equipos para mencionar
  const arroba = texto.match(/@([^@]*)$/);
  const sugerencias = arroba ? ["all", ...equipos].filter((a) => a.toLowerCase().startsWith(arroba[1].toLowerCase()) && a.toLowerCase() !== arroba[1].toLowerCase().trim()).slice(0, 5) : [];
  const mencionar = (alias: string) => setTexto(texto.replace(/@([^@]*)$/, `@${alias} `));
  /** Resalta las menciones a equipos que existen */
  const conMenciones = (t: string) => {
    const nombres = ["all", ...equipos].sort((a, b) => b.length - a.length).map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const partes = t.split(new RegExp(`(@(?:${nombres.join("|")}))`, "gi"));
    return partes.map((x, i) => (i % 2 ? <strong key={i} className="text-[#1d4ed8]">{x}</strong> : x));
  };
  const cargar = useCallback(async () => { try { setDatos(await leerMensajes(jornada)); } catch { /* sin conexión */ } }, [jornada]);
  useEffect(() => {
    void cargar();
    const t = setInterval(() => { if (document.visibilityState === "visible") void cargar(); }, 15000);
    return () => clearInterval(t);
  }, [cargar]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [msgs?.length]);
  const vista = useMemo(() => (archivo && archivo.type.startsWith("image/") ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const enviar = () => start(async () => {
    setError(null);
    let adjunto: Adjunto | null = null;
    if (archivo) {
      setSubiendo(true);
      try {
        const f = await reducir(archivo);
        const u = await urlSubidaChat(f.name, f.type, f.size);
        if (u.error || !u.path || !u.token) throw new Error(u.error ?? "No se ha podido subir.");
        const { error: e } = await createClient().storage.from("fantasy-chat").uploadToSignedUrl(u.path, u.token, f, { contentType: f.type });
        if (e) throw new Error(e.message);
        adjunto = { path: u.path, tipo: f.type, nombre: f.name };
      } catch (e) { setError(e instanceof Error ? e.message : "No se ha podido subir."); setSubiendo(false); return; }
      setSubiendo(false);
    }
    const r = await enviarMensaje(jornada, texto, adjunto);
    if (r.error) setError(r.error); else { setTexto(""); setArchivo(null); await cargar(); }
  });
  const borrar = (id: string) => { if (confirm("¿Borrar este mensaje?")) start(async () => { await borrarMensaje(id); await cargar(); }); };
  // Reacción al momento (luego se confirma en la siguiente carga)
  const reaccion = (m: Msg, e: string) => {
    const quitar = m.miReaccion === e;
    setDatos((d) => d && ({ ...d, mensajes: d.mensajes.map((x) => {
      if (x.id !== m.id) return x;
      const r = { ...x.reacciones };
      if (x.miReaccion) { r[x.miReaccion] = (r[x.miReaccion] ?? 1) - 1; if (r[x.miReaccion] <= 0) delete r[x.miReaccion]; }
      if (!quitar) r[e] = (r[e] ?? 0) + 1;
      return { ...x, reacciones: r, miReaccion: quitar ? null : e };
    }) }));
    setSelector(null);
    void reaccionar(m.id, quitar ? null : e);
  };

  return (
    <section className="fx-card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-[var(--fx-borde)] px-3 py-2.5 fx-display text-lg"><MessageCircle size={18} className="text-[var(--fx-oro)]" /> Chat de la jornada</h2>
      {datos?.avisos.map((a) => (
        <div key={a.id} className="flex items-start gap-2 border-b border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">
            <strong>{a.tipo === "aviso" ? "Aviso del administrador" : "Te han silenciado en el chat"}</strong>
            {a.motivo && <span className="block">{a.motivo}</span>}
            <span className="block text-xs opacity-75">Recuerda: en el chat, buen rollo y respeto. Sin insultos ni faltas.</span>
          </p>
          <button type="button" onClick={() => { setDatos((d) => d && ({ ...d, avisos: d.avisos.filter((x) => x.id !== a.id) })); void avisoVisto(a.id); }} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold">Entendido</button>
        </div>
      ))}
      <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-3 pt-12" onClick={() => setSelector(null)}>
        {msgs === null ? <p className="flex items-center gap-1 text-sm fx-suave"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
          : msgs.length === 0 ? <p className="text-sm fx-suave">Nadie ha escrito todavía. ¡Sé el primero en escribir! 🏀</p>
          : msgs.map((m) => {
            const reacc = Object.entries(m.reacciones);
            return (
              <div key={m.id} className={`flex flex-col ${m.yo ? "items-end" : "items-start"}`}>
                <div className={`flex w-full items-end gap-2 ${m.yo ? "justify-end" : "justify-start"}`}>
                  {!m.yo && <Escudo alias={m.alias} emoji={m.emoji} color={m.color} foto={m.foto} size={30} />}
                  <div className={`relative max-w-[80%] px-3 py-1.5 text-sm shadow ${m.yo ? "fx-burbuja-yo" : "fx-burbuja"}`}>
                    <p className="text-[12px] font-bold leading-tight">{m.alias} {m.mostrar && <span className="font-normal opacity-60">· {m.mostrar}</span>}</p>
                    {m.borrado ? <p className="italic opacity-60">Mensaje borrado</p> : (
                      <>
                        {m.adjunto && <VerAdjunto a={m.adjunto} />}
                        {m.texto && <p className="whitespace-pre-line break-words">{conMenciones(m.texto)}</p>}
                      </>
                    )}
                    <p className="flex items-center justify-end gap-2 text-[10px] opacity-70">
                      {hora(m.fecha)}{m.yo && " ✓✓"}
                      {!m.borrado && <button type="button" onClick={(e) => { e.stopPropagation(); setSelector(selector === m.id ? null : m.id); }} aria-label="Reaccionar" className="-m-1 p-1"><SmilePlus size={13} /></button>}
                      {!m.borrado && (m.yo || esAdmin) && <button type="button" onClick={() => borrar(m.id)} aria-label="Borrar" className="-m-1 p-1 hover:text-red-600"><Trash2 size={12} /></button>}
                      {esAdmin && !m.yo && <button type="button" onClick={() => setModerando(moderando === m.id ? null : m.id)} aria-label="Moderar" className="-m-1 p-1"><MoreVertical size={13} /></button>}
                    </p>
                    {selector === m.id && (
                      <div className={`absolute -top-11 z-10 flex gap-0.5 rounded-full border border-[var(--fx-borde)] bg-[#0c1430] px-1.5 py-1 shadow-xl ${m.yo ? "right-0" : "left-0"}`} onClick={(e) => e.stopPropagation()}>
                        {REACCIONES.map((e) => <button key={e} type="button" onClick={() => reaccion(m, e)} className={`rounded-full px-1 text-xl transition hover:scale-125 ${m.miReaccion === e ? "bg-white/20" : ""}`}>{e}</button>)}
                      </div>
                    )}
                  </div>
                </div>
                {reacc.length > 0 && (
                  <div className={`-mt-1 flex flex-wrap gap-1 ${m.yo ? "pr-2" : "pl-10"}`}>
                    {reacc.map(([e, n]) => (
                      <button key={e} type="button" onClick={() => reaccion(m, e)} className={`rounded-full border px-1.5 text-xs ${m.miReaccion === e ? "border-[var(--fx-oro)] bg-[var(--fx-oro)]/20" : "border-[var(--fx-borde)] bg-[#0c1430]"}`}>{e} {n}</button>
                    ))}
                  </div>
                )}
                {moderando === m.id && <div className="pl-10"><Moderar m={m} onHecho={() => void cargar()} /></div>}
              </div>
            );
          })}
        <div ref={fin} />
      </div>
      {sil ? <p className="border-t border-[var(--fx-borde)] p-3 text-sm fx-suave">🔇 {sil}</p> : (
        <div className="relative border-t border-[var(--fx-borde)] p-2">
          {sugerencias.length > 0 && (
            <ul className="absolute bottom-full left-2 right-2 mb-1 overflow-hidden rounded-xl border border-[var(--fx-borde)] bg-[#0c1430] shadow-lg">
              {sugerencias.map((a) => <li key={a}><button type="button" onClick={() => mencionar(a)} className="w-full px-3 py-2 text-left text-sm hover:bg-white/10">@{a}{a === "all" && <span className="ml-2 text-xs fx-suave">avisa a todos</span>}</button></li>)}
            </ul>
          )}
          {archivo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-xs">
              {vista ? <img src={vista} alt="" className="h-10 w-10 rounded object-cover" /> : <FileText size={18} />}
              <span className="min-w-0 flex-1 truncate">{archivo.name} · {(archivo.size / 1048576).toFixed(1)} MB</span>
              <button type="button" onClick={() => setArchivo(null)} aria-label="Quitar"><X size={14} /></button>
            </div>
          )}
          <div className="flex gap-2">
            {esAdmin && (
              <>
                <input ref={inputArchivo} type="file" accept="image/*,video/*,audio/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 50 * 1048576 && !f.type.startsWith("image/")) setError("Máximo 50 MB por archivo."); else { setError(null); setArchivo(f); } } e.target.value = ""; }} />
                <button type="button" onClick={() => inputArchivo.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10" aria-label="Adjuntar imagen o vídeo"><Paperclip size={16} /></button>
              </>
            )}
            <input className="fx-input min-w-0 flex-1 !rounded-full" placeholder={archivo ? "Añade un texto (opcional)" : "Escribe un mensaje… (@ para mencionar)"} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (texto.trim() || archivo) && enviar()} />
            <button onClick={enviar} disabled={pend || (!texto.trim() && !archivo)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--fx-rojo)] text-white disabled:opacity-50" aria-label="Enviar">{pend ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
          </div>
          {subiendo && <p className="mt-1 flex items-center gap-1 text-xs fx-suave"><Loader2 size={12} className="animate-spin" /> Subiendo…</p>}
        </div>
      )}
      {error && <p className="px-3 pb-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}
