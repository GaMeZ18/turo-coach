"use client";

// Analizador de vídeo: reproductor de YouTube + botonera de etiquetas + clips filtrables.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, BarChart3, FastForward, Flag, ListVideo, Rewind, Users, Loader2, Pause, Play, Repeat, Square, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { PREGUNTA_ESTADISTICA, analisisPista, enPista, esNegativa, esTiro, mmss, pctTiro, statVacia, sumarStat, teclasDe, valoracion, type Categoria, type Clip, type EventoVideo, type StatVideo } from "@/lib/video";
import { actualizarClip, borrarClip, borrarEventoVideo, crearClip, crearEventoVideo, guardarMinutosPeriodo } from "../actions";

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

type Pregunta = { id: string; cat: Categoria; jugador?: string | null; resultado?: "bien" | "mal" | null; reanudar: boolean; paso?: "asistencia"; tirador?: string | null; pista: string[]; todos?: boolean };
const VELOCIDADES = [1, 1.5, 2];

export default function Analizador({ videoId, youtubeId, categorias, clipsIniciales, jugadores, clipInicial, eventosIniciales, minutosPeriodo }: {
  videoId: string; youtubeId: string; categorias: Categoria[]; clipsIniciales: Clip[]; jugadores: Jugador[]; clipInicial?: string | null;
  eventosIniciales: EventoVideo[]; minutosPeriodo: number;
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
  const [eventos, setEventos] = useState<EventoVideo[]>([...eventosIniciales].sort((a, b) => a.t - b.t));
  const [minPer, setMinPer] = useState(minutosPeriodo);
  const [velocidad, setVelocidad] = useState(1);
  const [editorQ, setEditorQ] = useState<string[] | null>(null);   // selección del quinteto (inicio de cuarto / varios cambios)
  const [sale, setSale] = useState<string | null>(null);            // jugador que sale en un cambio rápido
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
  const refs = useRef({ activo, cola, clips, bucle, catAsist, eventos, periodo });
  refs.current = { activo, cola, clips, bucle, catAsist, eventos, periodo };
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
      setPregunta({ id: tmp.id, cat: c, reanudar: sonando, pista: enPista(refs.current.eventos, tt) });
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
      setPregunta({ id: q.id, cat: asist, reanudar: q.reanudar, paso: "asistencia", tirador: nueva.jugador ?? null, pista: q.pista });
      return;
    }
    terminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // --- Pista: quinteto, cambios, fin de cuarto y puntos del rival ---
  const nuevoEvento = (e: Omit<EventoVideo, "id" | "video_id">) => {
    const tmp: EventoVideo = { ...e, id: `tmp-ev-${Date.now()}`, video_id: videoId };
    setEventos((l) => [...l, tmp].sort((a, b) => a.t - b.t));
    crearEventoVideo({ video_id: videoId, t: e.t, tipo: e.tipo, periodo: e.periodo, jugadores: e.jugadores, puntos: e.puntos })
      .then((real) => setEventos((l) => l.map((x) => (x.id === tmp.id ? real : x))))
      .catch((err) => { setEventos((l) => l.filter((x) => x.id !== tmp.id)); setError(err instanceof Error ? err.message : "No se ha podido guardar."); });
  };
  const quitarEvento = (id: string) => {
    if (id.startsWith("tmp-")) return;
    setEventos((l) => l.filter((x) => x.id !== id));
    borrarEventoVideo(id).catch(() => setError("No se ha podido borrar."));
  };
  const ponerQuinteto = (ids: string[]) => nuevoEvento({ t: ahora(), tipo: "quinteto", periodo: refs.current.periodo, jugadores: ids, puntos: null });
  const cambioRapido = (entra: string) => {
    if (!sale) return;
    const actual = enPista(eventos, ahora());
    ponerQuinteto(actual.map((x) => (x === sale ? entra : x)));
    setSale(null);
  };
  const finPeriodo = () => {
    const p = periodo ?? 1;
    nuevoEvento({ t: ahora(), tipo: "fin_periodo", periodo: p, jugadores: null, puntos: null });
    setPeriodo(Math.min(5, p + 1));
    setEditorQ(enPista(eventos, ahora()));
  };
  const puntosRival = (n: number) => {
    nuevoEvento({ t: ahora(), tipo: "rival", periodo, jugadores: null, puntos: n });
    setDestello(`rival${n}`); setTimeout(() => setDestello(null), 350);
  };
  const cambiarVelocidad = (v: number) => { setVelocidad(v); player.current?.setPlaybackRate?.(v); };

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
      else if (k === "Z" || k === "X" || k === "C") { e.preventDefault(); refsAcc.current.puntosRival(k === "Z" ? 1 : k === "X" ? 2 : 3); }
      else if (k === "S") { e.preventDefault(); ir(ahora() + 30, false); }
      else if (k === "V") { e.preventDefault(); const v = refsAcc.current.velocidad; refsAcc.current.cambiarVelocidad(VELOCIDADES[(VELOCIDADES.indexOf(v) + 1) % VELOCIDADES.length]); }
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

  const refsAcc = useRef({ puntosRival, cambiarVelocidad, velocidad });
  refsAcc.current = { puntosRival, cambiarVelocidad, velocidad };
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

  const pista = useMemo(() => analisisPista(eventos, clips.filter((c) => !c.id.startsWith("tmp-")), categorias, minPer), [eventos, clips, categorias, minPer]);
  const enPistaAhora = enPista(eventos, t);
  const filasStats = [
    ...stats.filas,
    ...[...pista.jugadores.keys()].filter((id) => !stats.filas.some((f) => f.id === id)).map((id) => ({ id, j: jug(id), st: statVacia() })),
  ];

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
          <button onClick={() => ir(ahora() - 10, false)} className="btn-secundario !px-2 !py-1 text-xs" title="Atrás 10 s"><Rewind size={14} /> 10</button>
          <button onClick={() => ir(ahora() + 30, false)} className="btn-secundario !px-2 !py-1 text-xs" title="Adelante 30 s (S)"><FastForward size={14} /> 30</button>
          <div className="flex overflow-hidden rounded-md border border-linea text-xs" title="Velocidad (V)">
            {VELOCIDADES.map((v) => <button key={v} onClick={() => cambiarVelocidad(v)} className={`px-2 py-1 font-semibold ${velocidad === v ? "bg-azul text-white" : "bg-white text-tinta/60"}`}>{v}×</button>)}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-tinta/60">Periodo</span>
            {PERIODOS.map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} className={`h-7 min-w-8 rounded-md px-1.5 text-xs font-semibold ${periodo === p ? "bg-azul text-white" : "bg-suave text-tinta/60"}`}>{nombrePeriodo(p)}</button>
            ))}
          </div>
        </div>

        {/* En pista */}
        <div className="mt-2 rounded-xl border border-linea bg-white p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase text-tinta/60"><Users size={14} /> En pista</span>
            {enPistaAhora.length === 0 ? (
              <button onClick={() => setEditorQ([])} disabled={!listo} className="btn-primario !py-1 text-xs">Poner quinteto inicial ({nombrePeriodo(periodo ?? 1)})</button>
            ) : enPistaAhora.map((id) => {
              const j = jug(id);
              return (
                <button key={id} onClick={() => setSale(sale === id ? null : id)} title="Toca para cambiarlo"
                  className={`rounded-lg px-2 py-1 text-sm font-bold ${sale === id ? "bg-rojo text-white" : "bg-azul text-white"}`}>
                  {j?.dorsal ?? "?"} <span className="text-[10px] font-normal opacity-80">{j?.nombre}</span>
                </button>
              );
            })}
            {enPistaAhora.length > 0 && (
              <>
                <button onClick={() => setEditorQ(enPistaAhora)} className="btn-secundario !px-2 !py-1 text-xs" title="Cambiar varios a la vez"><ArrowLeftRight size={13} /> Varios</button>
                <button onClick={finPeriodo} className="btn-secundario !px-2 !py-1 text-xs"><Flag size={13} /> Fin del {nombrePeriodo(periodo ?? 1)}</button>
              </>
            )}
            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="font-semibold tabular-nums">{pista.marcador.nos}–{pista.marcador.rival}</span>
              <span className="text-tinta/50">Rival</span>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => puntosRival(n)} disabled={!listo} title={`Rival +${n} (${n === 1 ? "Z" : n === 2 ? "X" : "C"})`}
                  className={`rounded-md bg-tinta/80 px-2 py-1 font-bold text-white ${destello === `rival${n}` ? "ring-4 ring-oro" : ""}`}>+{n}</button>
              ))}
            </div>
          </div>
          {sale && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-linea pt-2">
              <span className="text-xs text-tinta/60">Sale <strong>{jug(sale)?.dorsal}</strong>, entra:</span>
              {jugadores.filter((j) => !enPistaAhora.includes(j.id)).map((j) => (
                <button key={j.id} onClick={() => cambioRapido(j.id)} className="rounded-lg bg-suave px-2 py-1 text-sm font-bold hover:bg-linea">{j.dorsal ?? "–"} <span className="text-[10px] font-normal">{j.nombre}</span></button>
              ))}
              <button onClick={() => setSale(null)} className="text-xs text-tinta/50">Cancelar</button>
            </div>
          )}
          {editorQ && (
            <div className="mt-2 border-t border-linea pt-2">
              <p className="text-xs text-tinta/60">Elige los 5 que están en pista ({editorQ.length}/5) — se guarda en el {mmss(t)} del vídeo, {nombrePeriodo(periodo ?? 1)} cuarto.</p>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
                {jugadores.map((j) => {
                  const on = editorQ.includes(j.id);
                  return (
                    <button key={j.id} onClick={() => setEditorQ(on ? editorQ.filter((x) => x !== j.id) : editorQ.length < 5 ? [...editorQ, j.id] : editorQ)}
                      className={`rounded-lg px-1 py-2 text-center ${on ? "bg-azul text-white" : "bg-suave"}`}>
                      <span className="block text-lg font-bold leading-none">{j.dorsal ?? "–"}</span><span className="block truncate text-[10px]">{j.nombre}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { ponerQuinteto(editorQ); setEditorQ(null); }} disabled={editorQ.length !== 5} className="btn-primario !py-1.5 text-sm">Guardar quinteto</button>
                <button onClick={() => setEditorQ(null)} className="btn-secundario !py-1.5 text-sm">Cancelar</button>
              </div>
            </div>
          )}
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
              {jugadores.filter((j) => (pregunta.paso !== "asistencia" || j.id !== pregunta.tirador) && (pregunta.todos || !pregunta.pista.length || pregunta.pista.includes(j.id))).map((j) => (
                <button key={j.id} onClick={() => responder(pregunta, { jugador: j.id })}
                  className={`rounded-lg px-1 py-2 text-center ${pregunta.jugador === j.id ? "bg-azul text-white ring-2 ring-oro" : "bg-suave hover:bg-linea"}`}>
                  <span className="block text-lg font-bold leading-none">{j.dorsal ?? "–"}</span>
                  <span className="block truncate text-[10px]">{j.nombre}</span>
                </button>
              ))}
              <button onClick={() => responder(pregunta, { jugador: null })} className={`rounded-lg px-1 py-2 text-xs ${pregunta.jugador === null ? "bg-azul text-white" : "bg-suave"}`}>{pregunta.paso === "asistencia" ? "Sin asistencia" : "No sé / equipo"}</button>
              {pregunta.pista.length > 0 && !pregunta.todos && <button onClick={() => setPregunta({ ...pregunta, todos: true })} className="rounded-lg bg-white px-1 py-2 text-xs text-tinta/60 ring-1 ring-linea">Otro jugador…</button>}
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
        <p className="mt-2 text-[11px] text-tinta/50">Pulsa la etiqueta justo cuando acabe la acción: el clip coge unos segundos antes y después. Con el quinteto en pista, al preguntar «¿quién?» solo salen los 5 que juegan. Teclado: la tecla de cada botón, espacio pausa, flechas ±5 s, S salta 30 s, V cambia la velocidad, Z/X/C puntos del rival (+1/+2/+3).</p>
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
            {!stats.hay && !pista.hay ? <p className="p-4 text-sm text-tinta/50">Etiqueta tiros, rebotes, asistencias, robos, tapones, pérdidas o faltas y la estadística se hace sola. Con el quinteto en pista salen también minutos y +/-.</p> : (
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="bg-suave text-[10px] uppercase text-tinta/60">
                  <tr>
                    <th className="sticky left-0 bg-suave p-2 text-left">Jugador</th>
                    {["Min", "Pts", "T2", "T3", "TL", "RO", "RD", "Reb", "Ast", "Rob", "Tap", "Pér", "FC", "Val", "+/-"].map((h) => <th key={h} className="px-1.5 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...filasStats.map((f) => ({ ...f, total: false })), { id: "__total", j: null, st: stats.total, total: true }].map(({ id, j, st, total }) => {
                    const pj = total ? null : pista.jugadores.get(id);
                    const mm = total ? pista.marcador.nos - pista.marcador.rival : pj ? pj.pf - pj.pc : null;
                    return (
                    <tr key={id} onClick={() => { if (!total) { setFJug(id); setPestana("clips"); } }}
                      className={total ? "border-t-2 border-tinta/30 bg-suave font-semibold" : "cursor-pointer border-t border-linea hover:bg-suave"}>
                      <td className={`sticky left-0 p-2 ${total ? "bg-suave" : "bg-white"}`}>{total ? "Equipo" : j ? <><strong className="text-azul">{j.dorsal ?? ""}</strong> {j.nombre}</> : <span className="text-tinta/50">Sin jugador</span>}</td>
                      <td className="px-1.5 text-center">{pj ? Math.round(pj.min) : "–"}</td>
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
                      <td className={`px-1.5 text-center font-semibold ${mm === null ? "" : mm > 0 ? "text-green-700" : mm < 0 ? "text-red-700" : ""}`}>{mm === null || !pista.hay ? "–" : `${mm > 0 ? "+" : ""}${mm}`}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {pista.hay && pista.quintetos.length > 0 && (
              <div className="border-t border-linea p-2">
                <p className="mb-1 text-[11px] font-semibold uppercase text-tinta/60">Quintetos</p>
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-tinta/50"><tr><th className="text-left">Quinteto</th><th>Min</th><th>PF</th><th>PC</th><th>+/-</th></tr></thead>
                  <tbody>
                    {pista.quintetos.slice(0, 10).map((q) => (
                      <tr key={q.ids.join()} className="border-t border-linea">
                        <td className="py-1 font-semibold text-azul">{q.ids.map((id) => jug(id)?.dorsal ?? "?").sort((a, b) => Number(a) - Number(b)).join(" · ")}</td>
                        <td className="text-center">{Math.round(q.min)}</td><td className="text-center">{q.pf}</td><td className="text-center">{q.pc}</td>
                        <td className={`text-center font-bold ${q.pf - q.pc > 0 ? "text-green-700" : q.pf - q.pc < 0 ? "text-red-700" : ""}`}>{q.pf - q.pc > 0 ? "+" : ""}{q.pf - q.pc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pista.hay && (
              <div className="flex flex-wrap items-center gap-2 border-t border-linea px-2 py-1.5 text-[11px] text-tinta/60">
                Minutos por cuarto
                <input type="number" min={4} max={20} value={minPer} onChange={(e) => setMinPer(Number(e.target.value) || 10)}
                  onBlur={() => guardarMinutosPeriodo(videoId, minPer).catch(() => {})} className="campo !w-14 !px-1 !py-0.5 text-center text-xs" />
                <span>· Los minutos se calculan con el tiempo en pista de cada cuarto (descontando lo que dura el cuarto en el vídeo). El +/- necesita apuntar los puntos del rival (Z, X, C).</span>
              </div>
            )}
            {eventos.length > 0 && (
              <details className="border-t border-linea px-2 py-1.5 text-xs">
                <summary className="cursor-pointer text-tinta/60">Cambios, cuartos y puntos del rival ({eventos.length})</summary>
                <ul className="mt-1 max-h-48 divide-y divide-linea overflow-y-auto">
                  {eventos.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 py-1">
                      <button onClick={() => ir(e.t)} className="w-12 shrink-0 text-left font-mono text-tinta/60 hover:text-azul">{mmss(e.t)}</button>
                      <span className="flex-1 truncate">
                        {e.tipo === "quinteto" ? <>Quinteto ({nombrePeriodo(e.periodo ?? 1)}): {(e.jugadores ?? []).map((id) => jug(id)?.dorsal ?? "?").join(", ")}</>
                          : e.tipo === "fin_periodo" ? <>Fin del {nombrePeriodo(e.periodo ?? 1)}</> : <>Rival +{e.puntos}</>}
                      </span>
                      <button onClick={() => quitarEvento(e.id)} className="text-tinta/40 hover:text-red-600" aria-label="Borrar"><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              </details>
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
