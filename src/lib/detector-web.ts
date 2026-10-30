// Lado navegador del detector: lee los fotogramas de un <video> (archivo local) y usa el núcleo de detector.ts.
// Sin React, para poder probarlo en un navegador sin la app.
import {
  SeguidorAro, aroDeTablero, candidatosTablero, elegirCanastas, filasNecesarias, grisYSaturacion, mediana,
  type Aro, type Evento,
} from "./detector";

export type Control = { parar: boolean; corregir: boolean };
export type Avisos = { progreso?: (p: number) => void; tiros?: (n: number, restoSeg: number | null) => void };

export const MINUTOS_BUSQUEDA = 6;
export const FPS_BUSQUEDA = 10;
export const FPS_TIROS = 15;

const pausa = () => new Promise((r) => setTimeout(r, 0));

export const irA = (v: HTMLVideoElement, t: number) => new Promise<void>((res) => {
  const h = () => { v.removeEventListener("seeked", h); res(); };
  v.addEventListener("seeked", h);
  v.currentTime = t;
});

let lienzo: { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null = null;
/** Filas [y0, y1) del fotograma actual, en gris */
export function leerFilas(v: HTMLVideoElement, W: number, y0: number, y1: number): Uint8Array {
  if (!lienzo) {
    const c = document.createElement("canvas");
    lienzo = { c, x: c.getContext("2d", { willReadFrequently: true })! };
  }
  const { c, x } = lienzo, h = y1 - y0;
  if (c.width !== W || c.height !== h) { c.width = W; c.height = h; }
  x.drawImage(v, 0, y0, W, h, 0, 0, W, h);
  const px = x.getImageData(0, 0, W, h).data;
  const g = new Uint8Array(W * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114 + 0.5) | 0;
  return g;
}

/**
 * Reproduce el vídeo deprisa entre `desde` y `hasta` y llama a `cada` unos `fps` fotogramas por segundo de vídeo.
 * La velocidad se ajusta sola para no saltarse fotogramas (depende del ordenador y de la pantalla).
 */
export async function recorrer(v: HTMLVideoElement, desde: number, hasta: number, fps: number, ctl: Control,
  cada: (t: number) => void, avance?: (t: number) => void): Promise<void> {
  await irA(v, desde);
  let velocidad = 4, ultimo = -1e9, ventanaT = desde, ventanaN = 0;
  v.playbackRate = velocidad;
  await new Promise<void>((resolver) => {
    let acabado = false;
    const fin = () => { if (acabado) return; acabado = true; v.pause(); v.removeEventListener("ended", fin); resolver(); };
    v.addEventListener("ended", fin);
    const fotograma = (t: number) => {
      if (ctl.parar || ctl.corregir || t >= hasta) { fin(); return; }
      if (t - ultimo >= 1 / fps - 0.004) { ultimo = t; cada(t); ventanaN++; }
      avance?.(t);
      if (t - ventanaT > 4) {
        const real = ventanaN / (t - ventanaT);
        if (real < fps * 0.85 && velocidad > 1) velocidad = Math.max(1, velocidad * 0.75);
        else if (real >= fps * 0.97 && velocidad < 8) velocidad = Math.min(8, velocidad * 1.2);
        v.playbackRate = velocidad;
        ventanaT = t; ventanaN = 0;
      }
    };
    const vv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (n: number, m: { mediaTime: number }) => void) => number };
    if (typeof vv.requestVideoFrameCallback === "function") {
      const cb = (_: number, m: { mediaTime: number }) => { fotograma(m.mediaTime); if (!acabado) vv.requestVideoFrameCallback!(cb); };
      vv.requestVideoFrameCallback(cb);
    } else {
      const tick = () => { if (acabado) return; fotograma(v.currentTime); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    v.play().catch(() => fin());
  });
}

export type Preparacion = {
  W: number; H: number; dur: number; foto: ImageData; aros: (Aro & { tiros?: number })[]; motivo?: string;
  candidatos?: { aro: Aro; tiros: number; ruido: number }[];
};

/** Imagen del pabellón, tableros candidatos y elección de las dos canastas del partido */
export async function buscarCanastas(v: HTMLVideoElement, ctl: Control, av: Avisos & { fase?: (f: "fondo" | "canastas") => void } = {}): Promise<Preparacion | null> {
  const W = v.videoWidth, H = v.videoHeight, dur = v.duration;
  av.fase?.("fondo");
  const Hc = Math.ceil(H * 0.7), N = 25;
  const gs: Uint8Array[] = [], ss: Uint8Array[] = [];
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const cx = c.getContext("2d", { willReadFrequently: true })!;
  let foto: ImageData | null = null;
  for (let k = 0; k < N; k++) {
    await irA(v, (dur * (k + 0.5)) / N);
    cx.drawImage(v, 0, 0, W, H);
    if (k === Math.floor(N / 2)) foto = cx.getImageData(0, 0, W, H);
    const [g, s] = grisYSaturacion(cx.getImageData(0, 0, W, Hc).data, W * Hc);
    gs.push(g); ss.push(s);
    av.progreso?.(((k + 1) / N) * 0.5);
    if (ctl.parar) return null;
  }
  const g = new Uint8Array(W * Hc), s = new Uint8Array(W * Hc);
  for (let y = 0; y < Hc; y += 40) {
    mediana(gs, g, y * W, Math.min(Hc, y + 40) * W);
    mediana(ss, s, y * W, Math.min(Hc, y + 40) * W);
    av.progreso?.(0.5 + (y / Hc) * 0.5);
    await pausa();
  }
  gs.length = 0; ss.length = 0;
  const tableros = candidatosTablero(g, s, W, Hc, H);
  if (!tableros.length) return { W, H, dur, foto: foto!, aros: [], motivo: "No he encontrado tableros en la imagen. Marca tú los aros." };

  av.fase?.("canastas"); av.progreso?.(0);
  const segs = tableros.map((t, i) => new SeguidorAro(aroDeTablero(`c${i}`, t, W), W, H, FPS_BUSQUEDA));
  const [fy0, fy1] = filasNecesarias(segs);
  const tramo = 45, total = MINUTOS_BUSQUEDA * 60, n = Math.floor(total / tramo);
  const tramos: [number, number][] = dur <= total ? [[0, dur]]
    : Array.from({ length: n }, (_, k) => {
      const ini = Math.max(0, (dur * (k + 0.5)) / n - tramo / 2);
      return [ini, Math.min(dur, ini + tramo)] as [number, number];
    });
  const durBusqueda = tramos.reduce((a, [i, f]) => a + f - i, 0);
  let hecho = 0;
  for (const [ini, fin] of tramos) {
    await recorrer(v, ini, fin, FPS_BUSQUEDA, ctl, (t) => {
      const gris = leerFilas(v, W, fy0, fy1);
      for (const sg of segs) sg.procesar(t, sg.recorte(gris, W, fy0));
    }, (t) => av.progreso?.((hecho + t - ini) / durBusqueda));
    hecho += fin - ini;
    segs.forEach((sg) => { sg.cerrar(); sg.reiniciarFondo(); });
    if (ctl.parar) return null;
  }
  const aros = elegirCanastas(segs, W, H);
  const candidatos = segs.map((sg) => ({ aro: sg.aro, tiros: sg.eventos.length, ruido: Math.round((sg.ruido / Math.max(1, sg.cuadros)) * 1000) / 1000 }));
  return { W, H, dur, foto: foto!, aros, candidatos, motivo: aros.length ? undefined : "No he visto tiros en ninguna canasta. Marca tú los aros." };
}

/** Recorre todo el partido con las canastas elegidas. Devuelve null si se pidió corregir los aros. */
export async function buscarTiros(v: HTMLVideoElement, aros: Aro[], ctl: Control, av: Avisos = {}): Promise<Evento[] | null> {
  const W = v.videoWidth, H = v.videoHeight, dur = v.duration;
  const segs = aros.map((a) => new SeguidorAro(a, W, H, FPS_TIROS));
  const [fy0, fy1] = filasNecesarias(segs);
  const t0 = performance.now();
  let ultimoAviso = 0;
  await recorrer(v, 0, dur, FPS_TIROS, ctl, (t) => {
    const gris = leerFilas(v, W, fy0, fy1);
    for (const sg of segs) sg.procesar(t, sg.recorte(gris, W, fy0));
  }, (t) => {
    const ahora = performance.now();
    if (ahora - ultimoAviso < 500) return;
    ultimoAviso = ahora;
    const p = t / dur;
    av.progreso?.(p);
    av.tiros?.(segs.reduce((a, s) => a + s.eventos.length, 0), p > 0.02 ? ((ahora - t0) / 1000) * (1 / p - 1) : null);
  });
  if (ctl.corregir) return null;
  segs.forEach((s) => s.cerrar());
  return segs.flatMap((s) => s.eventos).sort((a, b) => a.t - b.t);
}
