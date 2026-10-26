"use client";

// Analizador de vídeo: reproductor de YouTube + botonera de etiquetas + clips filtrables.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ListVideo, Loader2, Pause, Play, Repeat, Square, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { PREGUNTA_ESTADISTICA, esNegativa, esTiro, mmss, pctTiro, statVacia, sumarStat, teclasDe, valoracion, type Categoria, type Clip, type StatVideo } from "@/lib/video";
import { actualizarClip, borrarClip, crearClip } from "../actions";

type Jugador = { id: string; nombre: string; apellidos: string | null; dorsal: number | null };

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}
let apiPromesa: Promise<void> | null = null;
function cargarAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromesa) return apiPromesa;
  apiPromesa = new Promise((ok) => {
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previo?.(); ok(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromesa;
}

const PERIODOS = [1, 2, 3, 4, 5];
const nombrePeriodo = (p: number) => (p === 5 ? "Pró." : `${p}º`);

type Pregunta = { id: string; cat: Categoria; jugador?: string | null; resultado?: "bien" | "mal" | null; reanudar: boolean; paso?: "asistencia"; tirador?: string | null };

export default function Analizador({ videoId, youtubeId, categorias, clipsIniciales, jugadores, clipInicial }: {
  videoId: string; youtubeId: string; categorias: Categoria[]; clipsIniciales: Clip[]; jugadores: Jugador[]; clipInicial?: string | null;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const [listo, setListo] = useState(false);
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [clips, setClips] = useState<Clip[]>(clipsIniciales);
  const [sel, setSel] = useState<string | null>(null);
  const [activo, setActivo] = useState<string | null>(null);     // clip que se está reproduciendo
  const [cola, setCola] = useState<string[] | null>(null);       // lista que se reproduce seguida
  const [bucle, setBucle] = useState(false);
  const [periodo, setPeriodo] = useState<number | null>(1);
  const [destello, setDestello] = useState<string | null>(null);
  const [fCat, setFCat] = useState("");
  const [fJug, setFJug] = useState("");
  const [fRes, setFRes] = useState<"" | "bien" | "mal" | "sin">("");
  const [error, setError] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [dorsalTecleado, setDorsalTecleado] = useState("");
  const [pestana, setPestana] = useState<"clips" | "stats">("clips");
  const teclas = useMemo(() => teclasDe(categorias), [categorias]);
  const teclaDe = useCallback((c: Categoria) => [...teclas.entries()].find(([, x]) => x.id === c.id)?.[0] ?? null, [teclas]);
  // Clips recién creados: id provisional → id real, y cambios hechos antes de tener el id real
  const idReal = useRef(new Map<string, string>());
  const pendientes = useRef(new Map<string, Partial<Clip>>());

  const cat = useCallback((id: string | null) => categorias.find((c) => c.id === id) ?? null, [categorias]);
  const jug = useCallback((id: string | null) => jugadores.find((j) => j.id === id) ?? null, [jugadores]);
  const ordenados = useMemo(() => [...clips].sort((a, b) => a.inicio - b.inicio), [clips]);
  const filtrados = useMemo(() => ordenados.filter((c) =>
    (!fCat || c.categoria_id === fCat) && (!fJug || c.jugador_id === fJug) &&
    (!fRes || (fRes === "sin" ? !c.resultado : c.resultado === fRes))), [ordenados, fCat, fJug, fRes]);
  const seleccionado = clips.find((c) => c.id === sel) ?? null;

  // --- Reproductor ---
  useEffect(() => {
    let vivo = true;
    cargarAPI().then(() => {
      if (!vivo || !contenedor.current) return;
      const div = document.createElement("div");
      contenedor.current.innerHTML = "";
      contenedor.current.appendChild(div);
      player.current = new window.YT.Player(div, {
        videoId: youtubeId, width: "100%", height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => vivo && setListo(true),
          onStateChange: (e: any) => vivo && setTocando(e.data === 1),
          onError: () => vivo && setError("YouTube no deja reproducir este vídeo aquí. Revisa que no sea privado (usa «Oculto») y que permita insertarlo."),
        },
      });
    });
    return () => { vivo = false; try { player.current?.destroy?.(); } catch {} };
  }, [youtubeId]);

  const ahora = () => (player.current?.getCurrentTime?.() as number) ?? 0;
  const ir = (s: number, play = true) => { player.current?.seekTo?.(Math.max(0, s), true); if (play) player.current?.playVideo?.(); };

  // Reloj: tiempo actual y parar al final del clip / pasar al siguiente de la lista
  const catAsist = categorias.find((c) => c.estadistica === "as") ?? null;
  const refs = useRef({ activo, cola, clips, bucle, catAsist });
  refs.current = { activo, cola, clips, bucle, catAsist };
  useEffect(() => {
    const iv = setInterval(() => {
      if (!player.current?.getCurrentTime) return;
      const tt = ahora();
      setT(tt);
      const { activo: a, cola: q, clips: cs, bucle: b } = refs.current;
      if (!a) return;
      const c = cs.find((x) => x.id === a);
      if (!c || tt < c.fin - 0.05) return;
      if (q && q.length) {
        const i = q.indexOf(a);
        const sig = i >= 0 && i + 1 < q.length ? cs.find((x) => x.id === q[i + 1]) : (b ? cs.find((x) => x.id === q[0]) : null);
        if (sig) { setActivo(sig.id); setSel(sig.id); ir(sig.inicio); return; }
        setCola(null);
      } else if (b) { ir(c.inicio); return; }
      player.current?.pauseVideo?.();
      setActivo(null);
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const verClip = (c: Clip) => { setCola(null); setActivo(c.id); setSel(c.id); ir(c.inicio); };
  const verSeguidos = () => {
    if (!filtrados.length) return;
    setCola(filtrados.map((c) => c.id)); setActivo(filtrados[0].id); setSel(filtrados[0].id); ir(filtrados[0].inicio);
  };
  const parar = () => { setCola(null); setActivo(null); player.current?.pauseVideo?.(); };

  // --- Etiquetar ---
  const etiquetar = useCallback(async (c: Categoria) => {
    if (!player.current?.getCurrentTime) return;
    const tt = ahora();
    const tmp: Clip = { id: `tmp-${Date.now()}`, video_id: videoId, categoria_id: c.id, inicio: Math.max(0, tt - c.antes), fin: tt + c.despues, jugador_id: null, resultado: null, periodo, nota: null };
    setClips((l) => [...l, tmp]);
    setSel(tmp.id);
    setDestello(c.id); setTimeout(() => setDestello(null), 350);
    if (c.estadistica) {
      const sonando = player.current?.getPlayerState?.() === 1;
      if (sonando) player.current?.pauseVideo?.();
      setDorsalTecleado("");
      setPregunta({ id: tmp.id, cat: c, reanudar: sonando });
    }
    try {
      const real = await crearClip({ video_id: videoId, categoria_id: c.id, inicio: tmp.inicio, fin: tmp.fin, periodo });
      idReal.current.set(tmp.id, real.id);
      const pend = pendientes.current.get(tmp.id);
      pendientes.current.delete(tmp.id);
      if (pend) actualizarClip(real.id, pend).catch(() => setError("No se ha podido guardar el cambio."));
      setClips((l) => l.map((x) => (x.id === tmp.id ? { ...real, ...pend } : x)));
      setSel((s) => (s === tmp.id ? real.id : s));
      setPregunta((q) => (q && q.id === tmp.id ? { ...q, id: real.id } : q));
    } catch {
      setClips((l) => l.filter((x) => x.id !== tmp.id));
      setError("No se ha podido guardar el clip. Revisa la conexión.");
    }
  }, [videoId, periodo]);

  const cambiar = (idPedido: string, campos: Partial<Clip>) => {
    const id = idReal.current.get(idPedido) ?? idPedido;
    setClips((l) => l.map((x) => (x.id === id ? { ...x, ...campos } : x)));
    if (id.startsWith("tmp-")) { pendientes.current.set(id, { ...pendientes.current.get(id), ...campos }); return; }
    actualizarClip(id, campos).catch(() => setError("No se ha podido guardar el cambio."));
  };

  // --- Pregunta tras etiquetar un tiro o una pérdida: jugador (y si entra) ---
  const responder = useCallback((q: Pregunta, r: Partial<Pick<Pregunta, "jugador" | "resultado">>) => {
    const nueva = { ...q, ...r };
    const terminar = () => { setPregunta(null); setDorsalTecleado(""); if (q.reanudar) player.current?.playVideo?.(); };
    // Paso extra tras una canasta: ¿asistencia de quién?
    if (q.paso === "asistencia") {
      if (nueva.jugador === undefined) { setPregunta(nueva); return; }
      const tiroClip = refs.current.clips.find((x) => x.id === (idReal.current.get(q.id) ?? q.id));
      if (nueva.jugador && tiroClip) {
        const tmp: Clip = { ...tiroClip, id: `tmp-as-${Date.now()}`, categoria_id: q.cat.id, jugador_id: nueva.jugador, resultado: "bien", nota: null };
        setClips((l) => [...l, tmp]);
        crearClip({ video_id: tiroClip.video_id, categoria_id: q.cat.id, inicio: tiroClip.inicio, fin: tiroClip.fin, periodo: tiroClip.periodo, jugador_id: nueva.jugador, resultado: "bien" })
          .then((real) => setClips((l) => l.map((x) => (x.id === tmp.id ? real : x))))
          .catch(() => { setClips((l) => l.filter((x) => x.id !== tmp.id)); setError("No se ha podido guardar la asistencia."); });
      }
      terminar();
      return;
    }
    const tiro = esTiro(q.cat.estadistica);
    const completa = nueva.jugador !== undefined && (!tiro || nueva.resultado !== undefined);
    if (!completa) { setPregunta(nueva); return; }
    cambiar(q.id, { jugador_id: nueva.jugador ?? null, resultado: tiro ? nueva.resultado ?? null : esNegativa(q.cat.estadistica) ? "mal" : "bien" });
    const asist = refs.current.catAsist;
    if (tiro && nueva.resultado === "bien" && q.cat.estadistica !== "tl" && asist) {
      setDorsalTecleado("");
      setPregunta({ id: q.id, cat: asist, reanudar: q.reanudar, paso: "asistencia", tirador: nueva.jugador ?? null });
      return;
    }
    terminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cerrarPregunta = () => { if (pregunta?.reanudar) player.current?.playVideo?.(); setPregunta(null); setDorsalTecleado(""); };
  const quitar = (id: string) => {
    if (id.startsWith("tmp-")) return;
    setClips((l) => l.filter((x) => x.id !== id));
    if (sel === id) setSel(null);
    borrarClip(id).catch(() => setError("No se ha podido borrar el clip."));
  };

  // --- Teclado: 1-9/0 etiquetas, espacio play/pausa, flechas ±5 s ---
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const q = refsP.current.pregunta;
      if (q) {
        // Con la pregunta abierta: dorsal con los números, M = la mete, F/X = la falla, Enter = vale, Esc = saltar
        e.preventDefault();
        if (/^[0-9]$/.test(k)) {
          let buf = (refsP.current.dorsal + k).slice(-2);
          let j = jugadores.find((x) => x.dorsal === Number(buf));
          if (!j) { buf = k; j = jugadores.find((x) => x.dorsal === Number(k)); }
          setDorsalTecleado(buf);
          if (j) setPregunta({ ...q, jugador: j.id });
        } else if (k === "M" && esTiro(q.cat.estadistica)) responder(q, { resultado: "bien", jugador: q.jugador === undefined ? null : q.jugador });
        else if ((k === "F" || k === "X") && esTiro(q.cat.estadistica)) responder(q, { resultado: "mal", jugador: q.jugador === undefined ? null : q.jugador });
        else if (k === "Enter" && (!esTiro(q.cat.estadistica) || q.resultado !== undefined)) responder(q, { jugador: q.jugador === undefined ? null : q.jugador });
        else if (k === "Escape") cerrarPregunta();
        return;
      }
      const c = teclas.get(k);
      if (c) { e.preventDefault(); etiquetar(c); }
      else if (e.key === " ") {
        e.preventDefault();
        if (player.current?.getPlayerState?.() === 1) player.current.pauseVideo(); else player.current?.playVideo?.();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault(); ir(ahora() + (e.key === "ArrowLeft" ? -5 : 5), false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [teclas, etiquetar, jugadores, responder]);

  const refsP = useRef({ pregunta, dorsal: dorsalTecleado });
  refsP.current = { pregunta, dorsal: dorsalTecleado };

  // Abrir un clip concreto (desde la ficha del jugador)
  const abierto = useRef(false);
  useEffect(() => {
    if (!listo || abierto.current || !clipInicial) return;
    const c = clips.find((x) => x.id === clipInicial);
    if (c) { abierto.current = true; verClip(c); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, clipInicial]);

  // --- Estadística que sale de las etiquetas ---
  const stats = useMemo(() => {
    const porJug = new Map<string, StatVideo>();
    const total = statVacia();
    let hay = false;
    for (const c of clips) {
      const e = cat(c.categoria_id)?.estadistica;
      if (!e || c.id.startsWith("tmp-")) continue;
      hay = true;
      sumarStat(total, e, c.resultado);
      const k = c.jugador_id ?? "";
      sumarStat(porJug.get(k) ?? (porJug.set(k, statVacia()), porJug.get(k)!), e, c.resultado);
    }
    const filas = [...porJug.entries()].map(([id, st]) => ({ id, j: jug(id || null), st })).sort((a, b) => b.st.pts - a.st.pts || (a.j?.dorsal ?? 999) - (b.j?.dorsal ?? 999));
    return { hay, total, filas };
  }, [clips, cat, jug]);

  // --- Contadores ---
  const contadores = useMemo(() => categorias.map((c) => {
    const de = clips.filter((x) => x.categoria_id === c.id);
    return { c, n: de.length, bien: de.filter((x) => x.resultado === "bien").length, mal: de.filter((x) => x.resultado === "mal").length };
  }).filter((x) => x.n > 0), [categorias, clips]);

  const etiquetaJug = (j: Jugador) => `${j.dorsal ?? "–"} ${j.nombre}`;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Izquierda: vídeo + botonera */}
      <div className="min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <div ref={contenedor} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
          {!listo && !error && <div className="absolute inset-0 flex items-center justify-center text-white/70"><Loader2 className="animate-spin" /></div>}
        </div>
        {error && <p className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}<button onClick={() => setError(null)}><X size={14} /></button></p>}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => (tocando ? player.current?.pauseVideo?.() : player.current?.playVideo?.())} className="btn-secundario !px-2.5 !py-1.5" aria-label="Play/pausa">{tocando ? <Pause size={16} /> : <Play size={16} />}</button>
          <span className="font-mono tabular-nums">{mmss(t)}</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-tinta/60">Periodo</span>
            {PERIODOS.map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} className={`h-7 min-w-8 rounded-md px-1.5 text-xs font-semibold ${periodo === p ? "bg-azul text-white" : "bg-suave text-tinta/60"}`}>{nombrePeriodo(p)}</button>
            ))}
          </div>
        </div>

        {/* Pregunta: jugador y si la mete */}
        {pregunta && (
          <div className="mt-3 rounded-xl border-2 p-3" style={{ borderColor: pregunta.cat.color }}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold" style={{ color: pregunta.cat.color }}>
                {pregunta.paso === "asistencia" ? "¡Canasta! ¿Asistencia de quién?" : `${pregunta.cat.nombre}: ${pregunta.cat.estadistica ? PREGUNTA_ESTADISTICA[pregunta.cat.estadistica] : "¿Quién?"}`}
              </p>
              <button onClick={cerrarPregunta} className="text-xs text-tinta/50 hover:text-tinta">Saltar (Esc)</button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
              {jugadores.filter((j) => pregunta.paso !== "asistencia" || j.id !== pregunta.tirador).map((j) => (
                <button key={j.id} onClick={() => responder(pregunta, { jugador: j.id })}
                  className={`rounded-lg px-1 py-2 text-center ${pregunta.jugador === j.id ? "bg-azul text-white ring-2 ring-oro" : "bg-suave hover:bg-linea"}`}>
                  <span className="block text-lg font-bold leading-none">{j.dorsal ?? "–"}</span>
                  <span className="block truncate text-[10px]">{j.nombre}</span>
                </button>
              ))}
              <button onClick={() => responder(pregunta, { jugador: null })} className={`rounded-lg px-1 py-2 text-xs ${pregunta.jugador === null ? "bg-azul text-white" : "bg-suave"}`}>{pregunta.paso === "asistencia" ? "Sin asistencia" : "No sé / equipo"}</button>
            </div>
            {esTiro(pregunta.cat.estadistica) && pregunta.paso !== "asistencia" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => responder(pregunta, { resultado: "bien" })} className={`rounded-xl py-3 text-base font-bold text-white ${pregunta.resultado === "bien" ? "ring-4 ring-oro" : ""} bg-green-600`}>✓ Anotada <span className="text-xs font-normal opacity-80">(M)</span></button>
                <button onClick={() => responder(pregunta, { resultado: "mal" })} className={`rounded-xl py-3 text-base font-bold text-white ${pregunta.resultado === "mal" ? "ring-4 ring-oro" : ""} bg-red-600`}>✗ Fallada <span className="text-xs font-normal opacity-80">(F)</span></button>
              </div>
            )}
            <p className="mt-2 text-[11px] text-tinta/50">
              Teclado: escribe el dorsal{dorsalTecleado && <strong> ({dorsalTecleado})</strong>}{esTiro(pregunta.cat.estadistica) && pregunta.paso !== "asistencia" ? " y pulsa M si la mete o F si la falla." : pregunta.paso === "asistencia" ? " y pulsa Enter (Enter solo = sin asistencia)." : " y pulsa Enter."} El vídeo sigue al responder.
            </p>
          </div>
        )}

        {/* Botonera */}
        <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 ${pregunta ? "hidden" : ""}`}>
          {categorias.map((c) => (
            <button key={c.id} onClick={() => etiquetar(c)} disabled={!listo}
              className={`relative rounded-xl px-3 py-3 text-left text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${destello === c.id ? "scale-95 ring-4 ring-oro" : ""}`}
              style={{ background: c.color }}>
              {c.nombre}
              {teclaDe(c) && <span className="absolute right-2 top-1.5 hidden rounded bg-white/25 px-1 text-[10px] font-semibold sm:block">{teclaDe(c)}</span>}
              {c.estadistica && <span className="block text-[10px] font-medium opacity-80">{esTiro(c.estadistica) ? "Jugador · mete/falla" : "Jugador"}</span>}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-tinta/50">Pulsa la etiqueta justo cuando acabe la acción: el clip coge unos segundos antes y después. En el ordenador: la tecla de cada botón (arriba a la derecha), espacio para pausar y flechas para ±5 s. Tiros y pérdidas te preguntan el jugador y van a su estadística.</p>
      </div>

      {/* Derecha: clip seleccionado + lista */}
      <div className="min-w-0 space-y-3">
        {seleccionado && (
          <div className="tarjeta space-y-2.5 p-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: cat(seleccionado.categoria_id)?.color ?? "#999" }} />
              <select value={seleccionado.categoria_id ?? ""} onChange={(e) => cambiar(seleccionado.id, { categoria_id: e.target.value || null })} className="campo !py-1 text-sm font-semibold">
                <option value="">Sin etiqueta</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button onClick={() => setSel(null)} className="p-1 text-tinta/40 hover:text-tinta" aria-label="Cerrar"><X size={16} /></button>
            </div>
            {seleccionado.id.startsWith("tmp-") ? <p className="flex items-center gap-1 text-xs text-tinta/50"><Loader2 size={12} className="animate-spin" /> Guardando…</p> : (
              <>
                <div>
                  <p className="etiqueta">Jugador</p>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => cambiar(seleccionado.id, { jugador_id: null })} className={`rounded-md px-2 py-1 text-xs ${!seleccionado.jugador_id ? "bg-azul text-white" : "bg-suave"}`}>Equipo</button>
                    {jugadores.map((j) => (
                      <button key={j.id} title={`${j.nombre} ${j.apellidos ?? ""}`} onClick={() => cambiar(seleccionado.id, { jugador_id: j.id })}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${seleccionado.jugador_id === j.id ? "bg-azul text-white" : "bg-suave"}`}>{etiquetaJug(j)}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => cambiar(seleccionado.id, { resultado: seleccionado.resultado === "bien" ? null : "bien" })} className={`btn-secundario !py-1 text-sm ${seleccionado.resultado === "bien" ? "!border-green-600 !bg-green-600 !text-white" : ""}`}><ThumbsUp size={15} /> {esTiro(cat(seleccionado.categoria_id)?.estadistica) ? "Anotada" : "Bien"}</button>
                  <button onClick={() => cambiar(seleccionado.id, { resultado: seleccionado.resultado === "mal" ? null : "mal" })} className={`btn-secundario !py-1 text-sm ${seleccionado.resultado === "mal" ? "!border-red-600 !bg-red-600 !text-white" : ""}`}><ThumbsDown size={15} /> {esTiro(cat(seleccionado.categoria_id)?.estadistica) ? "Fallada" : "Mal"}</button>
                  <div className="ml-auto flex gap-0.5">
                    {PERIODOS.map((p) => (
                      <button key={p} onClick={() => cambiar(seleccionado.id, { periodo: p })} className={`h-7 min-w-7 rounded px-1 text-[11px] font-semibold ${seleccionado.periodo === p ? "bg-azul text-white" : "bg-suave text-tinta/60"}`}>{nombrePeriodo(p)}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(["inicio", "fin"] as const).map((k) => (
                    <div key={k} className="rounded-lg bg-suave p-1.5">
                      <p className="mb-1 font-semibold uppercase text-tinta/50">{k === "inicio" ? "Empieza" : "Acaba"} <span className="font-mono text-tinta">{mmss(seleccionado[k])}</span></p>
                      <div className="flex gap-1">
                        <button onClick={() => cambiar(seleccionado.id, { [k]: Math.max(0, seleccionado[k] - 1) } as Partial<Clip>)} className="rounded bg-white px-1.5 py-0.5">−1 s</button>
                        <button onClick={() => cambiar(seleccionado.id, { [k]: seleccionado[k] + 1 } as Partial<Clip>)} className="rounded bg-white px-1.5 py-0.5">+1 s</button>
                        <button onClick={() => cambiar(seleccionado.id, { [k]: Math.round(ahora() * 10) / 10 } as Partial<Clip>)} className="rounded bg-white px-1.5 py-0.5" title="Usar el momento actual del vídeo">Aquí</button>
                      </div>
                    </div>
                  ))}
                </div>
                <input key={seleccionado.id} defaultValue={seleccionado.nota ?? ""} placeholder="Nota (ej.: no cerramos el rebote)" className="campo !py-1.5 text-sm"
                  onBlur={(e) => e.target.value !== (seleccionado.nota ?? "") && cambiar(seleccionado.id, { nota: e.target.value || null })} />
                <div className="flex justify-between">
                  <button onClick={() => verClip(seleccionado)} className="btn-primario !py-1.5 text-sm"><Play size={15} /> Ver clip</button>
                  <button onClick={() => quitar(seleccionado.id)} className="btn-peligro !py-1.5 text-sm"><Trash2 size={15} /> Borrar</button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex rounded-lg border border-linea bg-white p-0.5 text-sm">
          <button onClick={() => setPestana("clips")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${pestana === "clips" ? "bg-azul text-white" : "text-tinta/70"}`}><ListVideo size={15} /> Clips ({clips.length})</button>
          <button onClick={() => setPestana("stats")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${pestana === "stats" ? "bg-azul text-white" : "text-tinta/70"}`}><BarChart3 size={15} /> Estadística</button>
        </div>

        {pestana === "stats" ? (
          <div className="tarjeta overflow-x-auto">
            {!stats.hay ? <p className="p-4 text-sm text-tinta/50">Etiqueta tiros, rebotes, asistencias, robos, tapones, pérdidas o faltas y la estadística se hace sola.</p> : (
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="bg-suave text-[10px] uppercase text-tinta/60">
                  <tr>
                    <th className="sticky left-0 bg-suave p-2 text-left">Jugador</th>
                    {["Pts", "T2", "T3", "TL", "RO", "RD", "Reb", "Ast", "Rob", "Tap", "Pér", "FC", "Val"].map((h) => <th key={h} className="px-1.5 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...stats.filas.map((f) => ({ ...f, total: false })), { id: "__total", j: null, st: stats.total, total: true }].map(({ id, j, st, total }) => (
                    <tr key={id} onClick={() => { if (!total) { setFJug(id); setPestana("clips"); } }}
                      className={total ? "border-t-2 border-tinta/30 bg-suave font-semibold" : "cursor-pointer border-t border-linea hover:bg-suave"}>
                      <td className={`sticky left-0 p-2 ${total ? "bg-suave" : "bg-white"}`}>{total ? "Equipo" : j ? <><strong className="text-azul">{j.dorsal ?? ""}</strong> {j.nombre}</> : <span className="text-tinta/50">Sin jugador</span>}</td>
                      <td className="px-1.5 text-center text-sm font-bold">{st.pts}</td>
                      {([[st.t2m, st.t2a], [st.t3m, st.t3a], [st.tlm, st.tla]] as const).map(([m, a], i) => (
                        <td key={i} className="px-1.5 text-center">{a ? <>{m}/{a}<span className="block text-[10px] font-normal text-tinta/50">{pctTiro(m, a)}</span></> : "–"}</td>
                      ))}
                      <td className="px-1.5 text-center">{st.ro || "–"}</td>
                      <td className="px-1.5 text-center">{st.rd || "–"}</td>
                      <td className="px-1.5 text-center font-semibold">{st.ro + st.rd || "–"}</td>
                      <td className="px-1.5 text-center">{st.as || "–"}</td>
                      <td className="px-1.5 text-center">{st.rob || "–"}</td>
                      <td className="px-1.5 text-center">{st.tap || "–"}</td>
                      <td className="px-1.5 text-center">{st.perdidas || "–"}</td>
                      <td className="px-1.5 text-center">{st.fc || "–"}</td>
                      <td className={`px-1.5 text-center font-bold ${valoracion(st) > 0 ? "text-green-700" : valoracion(st) < 0 ? "text-red-700" : ""}`}>{valoracion(st)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {stats.hay && <p className="px-2 pb-2 pt-1 text-[11px] text-tinta/50">Toca un jugador para ver sus clips. Val = valoración (puntos + rebotes + asistencias + robos + tapones − tiros fallados − pérdidas − faltas). Se guarda también en su ficha.</p>}
          </div>
        ) : (
          <>
        {/* Contadores */}
        {contadores.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contadores.map(({ c, n, bien, mal }) => (
              <button key={c.id} onClick={() => setFCat(fCat === c.id ? "" : c.id)}
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${fCat === c.id ? "text-white" : "bg-white"}`}
                style={fCat === c.id ? { background: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}>
                {c.nombre} {n}{bien || mal ? <span className="font-normal opacity-80"> · {bien}👍 {mal}👎</span> : null}
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="tarjeta space-y-2 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="campo !py-1 text-xs">
              <option value="">Todas las acciones</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={fJug} onChange={(e) => setFJug(e.target.value)} className="campo !py-1 text-xs">
              <option value="">Todos</option>
              {jugadores.map((j) => <option key={j.id} value={j.id}>{etiquetaJug(j)}</option>)}
            </select>
            <select value={fRes} onChange={(e) => setFRes(e.target.value as typeof fRes)} className="campo !py-1 text-xs">
              <option value="">Bien y mal</option>
              <option value="bien">👍 Bien</option>
              <option value="mal">👎 Mal</option>
              <option value="sin">Sin valorar</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {cola ? (
              <button onClick={parar} className="btn-primario flex-1 !py-1.5 text-sm"><Square size={14} /> Parar ({cola.indexOf(activo ?? "") + 1}/{cola.length})</button>
            ) : (
              <button onClick={verSeguidos} disabled={!filtrados.length || !listo} className="btn-primario flex-1 !py-1.5 text-sm"><Play size={15} /> Ver seguidos ({filtrados.length})</button>
            )}
            <button onClick={() => setBucle(!bucle)} className={`btn-secundario !px-2.5 !py-1.5 ${bucle ? "!bg-azul !text-white" : ""}`} title="Repetir"><Repeat size={15} /></button>
          </div>
        </div>

        {/* Lista */}
        <ul className="tarjeta max-h-[55vh] divide-y divide-linea overflow-y-auto">
          {filtrados.map((c) => {
            const k = cat(c.categoria_id), j = jug(c.jugador_id);
            return (
              <li key={c.id}>
                <button onClick={() => verClip(c)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-suave ${activo === c.id ? "bg-oro/25" : sel === c.id ? "bg-azul/5" : ""}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: k?.color ?? "#999" }} />
                  <span className="w-12 shrink-0 font-mono text-xs text-tinta/60">{mmss(c.inicio)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{k?.nombre ?? "Sin etiqueta"}</span>
                    {j && <span className="text-tinta/60"> · #{j.dorsal ?? ""} {j.nombre}</span>}
                    {c.nota && <span className="block truncate text-xs text-tinta/50">{c.nota}</span>}
                  </span>
                  {c.periodo && <span className="text-[10px] text-tinta/40">{nombrePeriodo(c.periodo)}</span>}
                  {c.resultado === "bien" && <ThumbsUp size={14} className="text-green-600" />}
                  {c.resultado === "mal" && <ThumbsDown size={14} className="text-red-600" />}
                </button>
              </li>
            );
          })}
          {filtrados.length === 0 && <li className="p-4 text-center text-sm text-tinta/50">{clips.length ? "Ningún clip con esos filtros." : "Dale al play y pulsa las etiquetas para crear clips."}</li>}
        </ul>
          </>
        )}
      </div>
    </div>
  );
}
