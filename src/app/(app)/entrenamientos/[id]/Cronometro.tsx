"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Timer, X } from "lucide-react";

type Paso = { id: string; titulo: string; tipo: string; duracion: number; notas: string | null };

const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

// El audio se «desbloquea» con un toque del usuario (iPhone no deja sonar sin eso)
let audio: AudioContext | null = null;
function prepararAudio() {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new C();
    void audio.resume();
  } catch { /* sin audio */ }
}

/** Pitido corto con el altavoz del móvil (sin archivos de sonido) */
function pitar(veces = 3) {
  try {
    if (audio) {
      for (let i = 0; i < veces; i++) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = i === veces - 1 ? 1320 : 880;
        o.connect(g); g.connect(audio.destination);
        const t = audio.currentTime + i * 0.35;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.start(t); o.stop(t + 0.3);
      }
    }
  } catch { /* sin audio */ }
  try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch { /* sin vibración */ }
}

/** Modo pista: cuenta atrás de cada ejercicio, pita al acabar y pasa al siguiente */
export default function Cronometro({ pasos, onHecho }: { pasos: Paso[]; onHecho: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [i, setI] = useState(0);
  const [restante, setRestante] = useState(0); // segundos
  const [corriendo, setCorriendo] = useState(false);
  const fin = useRef<number | null>(null); // hora de fin del paso actual (ms) mientras corre
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  const ir = useCallback((n: number, correr: boolean) => {
    const p = pasos[n];
    if (!p) return;
    setI(n);
    const s = Math.max(0, Math.round((p.duracion || 0) * 60));
    setRestante(s);
    fin.current = correr ? Date.now() + s * 1000 : null;
    setCorriendo(correr);
  }, [pasos]);

  // Pantalla siempre encendida mientras está abierto
  useEffect(() => {
    if (!abierto) return;
    const pedir = async () => { try { lock.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch { /* no disponible */ } };
    void pedir();
    const vis = () => { if (document.visibilityState === "visible") void pedir(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); lock.current?.release().catch(() => null); lock.current = null; };
  }, [abierto]);

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => {
      if (fin.current === null) return;
      const s = Math.ceil((fin.current - Date.now()) / 1000);
      setRestante(s);
      if (s <= 0) {
        pitar();
        onHecho(pasos[i].id);
        if (i + 1 < pasos.length) ir(i + 1, true);
        else { setCorriendo(false); fin.current = null; }
      }
    }, 250);
    return () => clearInterval(t);
  }, [corriendo, i, pasos, ir, onHecho]);

  const pausar = () => { setCorriendo(false); fin.current = null; };
  const seguir = () => { prepararAudio(); fin.current = Date.now() + Math.max(restante, 0) * 1000; setCorriendo(true); };
  const cerrar = () => { pausar(); setAbierto(false); };

  if (!pasos.length) return null;
  if (!abierto) {
    return (
      <button type="button" onClick={() => { prepararAudio(); setAbierto(true); ir(Math.max(0, pasos.findIndex((p) => p.duracion > 0)), false); }} className="btn-primario !py-1.5 text-sm">
        <Timer size={15} /> Empezar entreno
      </button>
    );
  }
  const p = pasos[i];
  const total = Math.max(1, Math.round((p.duracion || 0) * 60));
  const pct = Math.min(100, Math.max(0, ((total - restante) / total) * 100));
  const sig = pasos[i + 1];
  const acabado = !corriendo && restante <= 0 && i === pasos.length - 1;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-azul text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">{i + 1} de {pasos.length}</span>
        <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro">{p.tipo === "ejercicio" ? "Ejercicio" : p.tipo.replace("_", " ")}</p>
        <h2 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{p.titulo}</h2>
        <p className={`font-[family-name:var(--font-barlow-condensed)] text-[28vw] font-bold leading-none tabular-nums sm:text-[12rem] ${restante <= 10 && corriendo ? "text-oro" : ""}`}>{acabado ? "✓" : mmss(Math.max(restante, 0))}</p>
        <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-white/15"><div className="h-full bg-oro transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
        {p.notas && <p className="max-w-xl whitespace-pre-line text-sm text-white/80">{p.notas}</p>}
        {acabado && <p className="text-lg font-semibold">¡Entreno terminado! 🏀</p>}
      </div>
      <div className="px-4 pb-4">
        {sig && <p className="mb-3 truncate text-center text-sm text-white/70">Siguiente: <strong className="text-white">{sig.titulo}</strong> · {sig.duracion}′</p>}
        <div className="mx-auto flex max-w-md items-center justify-center gap-4">
          <button type="button" onClick={() => ir(Math.max(0, i - 1), corriendo)} disabled={i === 0} className="rounded-full bg-white/10 p-4 disabled:opacity-30" aria-label="Anterior"><SkipBack size={26} /></button>
          {corriendo
            ? <button type="button" onClick={pausar} className="rounded-full bg-oro p-6 text-azul" aria-label="Pausa"><Pause size={36} /></button>
            : <button type="button" onClick={() => { prepararAudio(); if (restante <= 0) ir(i, true); else seguir(); }} className="rounded-full bg-oro p-6 text-azul" aria-label="Empezar"><Play size={36} /></button>}
          <button type="button" onClick={() => { onHecho(p.id); ir(Math.min(pasos.length - 1, i + 1), corriendo); }} disabled={i === pasos.length - 1} className="rounded-full bg-white/10 p-4 disabled:opacity-30" aria-label="Siguiente"><SkipForward size={26} /></button>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/50">Pita y vibra al acabar cada bloque y pasa solo al siguiente. La pantalla no se apaga.</p>
      </div>
    </div>
  );
}
