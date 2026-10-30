// Detector de tiros (versión navegador). Mismo método que herramientas/detector-tiros/detector.py:
// sigue el balón por movimiento y tamaño (no por color) cerca de cada aro y une las manchas en
// trayectorias; un tiro es una trayectoria que llega al aro desde arriba (o una bandeja que sube junto
// al aro y cae dentro). Las canastas del partido se buscan solas: tableros candidatos + dónde llegan tiros.
// Todo son funciones puras sobre imágenes en escala de grises (Uint8Array), sin DOM: se prueba en Node.

export type Aro = { nombre: string; x: number; y: number; w: number; h: number };
export type Resultado = "anotada" | "fallada" | "desconocido";
export type Evento = {
  t: number; t_inicio: number; t_fin: number; canasta: string; resultado: Resultado;
  confianza: number; observaciones: number; px: [number, number];
};
type Obs = [number, number, number]; // t, u, v (u, v en anchos de aro respecto al aro)

const r2 = (x: number) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------- imagen binaria
/** Erosión / dilatación con cruz 3×3 (como cv2.MORPH_ELLIPSE 3×3) */
function morf(src: Uint8Array, w: number, h: number, dilatar: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = src[i], l = x > 0 ? src[i - 1] : 0, rr = x < w - 1 ? src[i + 1] : 0, u = y > 0 ? src[i - w] : 0, d = y < h - 1 ? src[i + w] : 0;
      out[i] = dilatar ? (c | l | rr | u | d) : (c & l & rr & u & d);
    }
  }
  return out;
}

type Mancha = { n: number; borde: number; x0: number; y0: number; x1: number; y1: number };

/** Componentes conexas (8 vecinos) de una máscara 0/1 */
function manchas(m: Uint8Array, w: number, h: number): Mancha[] {
  const et = new Int32Array(w * h).fill(-1);
  const res: Mancha[] = [];
  const pila: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || et[i] >= 0) continue;
    const id = res.length;
    const mc: Mancha = { n: 0, borde: 0, x0: w, y0: h, x1: 0, y1: 0 };
    et[i] = id; pila.push(i);
    while (pila.length) {
      const p = pila.pop()!;
      const x = p % w, y = (p - x) / w;
      mc.n++;
      if (x < mc.x0) mc.x0 = x; if (x > mc.x1) mc.x1 = x; if (y < mc.y0) mc.y0 = y; if (y > mc.y1) mc.y1 = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !m[p - 1] || !m[p + 1] || !m[p - w] || !m[p + w]) mc.borde++;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (m[q] && et[q] < 0) { et[q] = id; pila.push(q); }
        }
      }
    }
    res.push(mc);
  }
  return res;
}
/** Área como la de cv2.contourArea (polígono por los centros del borde, teorema de Pick) */
const areaMancha = (mc: Mancha) => Math.max(0, mc.n - mc.borde / 2 - 1);

// ---------------------------------------------------------------------------- fondo (como MOG2, en gris)
class Fondo {
  media: Float32Array; varz: Float32Array; n = 0;
  constructor(len: number, private historia: number, private umbral = 20) {
    this.media = new Float32Array(len); this.varz = new Float32Array(len).fill(15);
  }
  aplicar(px: Uint8Array): Uint8Array {
    const out = new Uint8Array(px.length);
    this.n++;
    const a = Math.max(1 / this.n, 1 / this.historia);
    if (this.n === 1) { this.media.set(px); return out; }
    const { media, varz, umbral } = this;
    for (let i = 0; i < px.length; i++) {
      const d = px[i] - media[i], d2 = d * d;
      const fg = d2 > umbral * varz[i];
      if (fg) out[i] = 1;
      const k = fg ? a * 0.1 : a;
      media[i] += k * d;
      let v = varz[i] + k * (d2 - varz[i]);
      if (v < 4) v = 4; else if (v > 75) v = 75;
      varz[i] = v;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------- seguidor de un aro
export class SeguidorAro {
  static U_MAX = 6; static V_MIN = -7; static V_MAX = 2;
  x0 = 0; y0 = 0; x1 = 0; y1 = 0;
  d: number; areaMin: number; areaMax: number;
  pistas: Obs[][] = [];
  eventos: Evento[] = [];
  finUltimo = -1e9;
  cuadros = 0; ruido = 0;
  private fondo: Fondo;

  constructor(public aro: Aro, ancho: number, alto: number, public fps: number) {
    const a = aro, W = aro.w;
    this.x0 = Math.max(0, Math.floor(a.x + a.w / 2 - SeguidorAro.U_MAX * W));
    this.x1 = Math.min(ancho, Math.floor(a.x + a.w / 2 + SeguidorAro.U_MAX * W));
    this.y0 = Math.max(0, Math.floor(a.y + SeguidorAro.V_MIN * W));
    this.y1 = Math.min(alto, Math.floor(a.y + SeguidorAro.V_MAX * W));
    this.d = 0.5 * aro.w;
    const area = Math.PI * (this.d / 2) ** 2;
    this.areaMin = Math.max(4, area * 0.25);
    this.areaMax = area * 2.6;
    this.fondo = new Fondo((this.x1 - this.x0) * (this.y1 - this.y0), fps * 8);
  }

  reiniciarFondo() { this.fondo = new Fondo((this.x1 - this.x0) * (this.y1 - this.y0), this.fps * 8); }

  aAro(cx: number, cy: number): [number, number] {
    const a = this.aro;
    return [(cx - (a.x + a.w / 2)) / a.w, (cy - a.y) / a.w];
  }

  /** Recorta la zona del aro de un fotograma gris (ancho total `anchoImg`, empezando en la fila `filaIni`) */
  recorte(gris: Uint8Array, anchoImg: number, filaIni = 0): Uint8Array {
    const w = this.x1 - this.x0, h = this.y1 - this.y0;
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const o = (this.y0 + y - filaIni) * anchoImg + this.x0;
      out.set(gris.subarray(o, o + w), y * w);
    }
    return out;
  }

  candidatos(zona: Uint8Array): [number, number][] {
    const w = this.x1 - this.x0, h = this.y1 - this.y0;
    if (w <= 0 || h <= 0) return [];
    let m = this.fondo.aplicar(zona);
    m = morf(morf(m, w, h, false), w, h, true); // apertura
    m = morf(m, w, h, true);                    // dilatación
    this.cuadros++;
    let grande = false;
    const res: [number, number][] = [];
    for (const mc of manchas(m, w, h)) {
      const area = areaMancha(mc);
      const bw = mc.x1 - mc.x0 + 1, bh = mc.y1 - mc.y0 + 1;
      const [u, v] = this.aAro(this.x0 + mc.x0 + bw / 2, this.y0 + mc.y0 + bh / 2);
      if (area > this.areaMax * 4 && v < -1) grande = true;
      if (area < this.areaMin || area > this.areaMax) continue;
      if (Math.max(bw, bh) > 2.2 * this.d + 3) continue;
      const asp = bw / Math.max(bh, 1);
      if (asp < 0.45 || asp > 2.2) continue;
      if (area / Math.max(1, bw * bh) < 0.4) continue;
      res.push([u, v]);
    }
    if (grande) this.ruido++;
    return res;
  }

  procesar(t: number, zona: Uint8Array) {
    let cands = this.candidatos(zona);
    if (cands.length > 6) cands = [];
    const usados = new Set<number>();
    const orden = [...this.pistas].sort((a, b) => b.length - a.length);
    for (const pista of orden) {
      const [t1, u1, v1] = pista[pista.length - 1];
      let du = 0, dv = 0;
      if (pista.length >= 2) {
        const [t0, u0, v0] = pista[pista.length - 2];
        const dt0 = Math.max(1e-3, t1 - t0);
        du = (u1 - u0) / dt0; dv = (v1 - v0) / dt0;
      }
      const dt = t - t1, pu = u1 + du * dt, pv = v1 + dv * dt;
      const margen = 1.6 + (pista.length >= 2 ? 0 : 1.4);
      let mejor: [number, number] | null = null;
      cands.forEach(([u, v], k) => {
        if (usados.has(k)) return;
        const dist = Math.hypot(u - pu, v - pv);
        if (dist < margen && (!mejor || dist < mejor[0])) mejor = [dist, k];
      });
      if (mejor) { const k = (mejor as [number, number])[1]; usados.add(k); pista.push([t, cands[k][0], cands[k][1]]); }
    }
    cands.forEach(([u, v], k) => { if (!usados.has(k)) this.pistas.push([[t, u, v]]); });
    const vivas: Obs[][] = [];
    for (const p of this.pistas) {
      if (t - p[p.length - 1][0] > 0.35) this.evaluar(p); else vivas.push(p);
    }
    this.pistas = vivas;
  }

  cerrar() { for (const p of this.pistas) this.evaluar(p); this.pistas = []; }

  evaluar(obs: Obs[]) {
    if (obs.length < 3 || obs[obs.length - 1][0] - obs[0][0] < 0.12) return;
    let recorrido = 0;
    for (let i = 1; i < obs.length; i++) recorrido += Math.hypot(obs[i][1] - obs[i - 1][1], obs[i][2] - obs[i - 1][2]);
    if (recorrido < 1.5) return;
    const arriba = obs.filter((o) => o[2] < -1.0);
    const cerca = obs.map((o, k) => (Math.abs(o[1]) < 1.4 && o[2] > -1.8 && o[2] < 0.9 ? k : -1)).filter((k) => k >= 0);
    let k: number;
    if (arriba.length && cerca.length) {
      k = cerca[0];
      if (obs[k][0] < arriba[0][0] && !arriba.some((o) => o[0] > obs[k][0])) return;
      const previos = obs.slice(0, k + 1).filter((o) => o[0] >= obs[k][0] - 0.4);
      if (previos.length >= 2 && previos[previos.length - 1][2] < previos[0][2] - 0.2) return;
    } else {
      // Bandeja: sube desde abajo hasta la altura del aro, junto a él, y luego cae en el aro
      let pico = 0;
      obs.forEach((o, j) => { if (o[2] < obs[pico][2]) pico = j; });
      const tras: number[] = [];
      for (let j = pico; j < obs.length; j++) if (Math.abs(obs[j][1]) < 0.9 && obs[j][2] > -0.7 && obs[j][2] < 0.9) tras.push(j);
      if (obs[0][2] > 0.6 && obs[pico][2] < -0.4 && Math.abs(obs[pico][1]) < 1.8 && tras.length) {
        k = tras[0];
      } else if (Math.abs(obs[0][1]) < 1 && obs[0][2] > -1.3 && obs[0][2] < -0.3 &&
        obs.slice(1).some((o) => Math.abs(o[1]) < 0.75 && o[2] > 0.35 && o[2] < 2)) {
        k = 0; // aparece a la altura del aro (la subida se perdió entre los brazos) y cae por la red
      } else return;
    }
    const llegada = obs[k][0];
    const despues = obs.slice(k + 1);
    const red = despues.filter((o) => Math.abs(o[1]) < 0.75 && o[2] > 0.35 && o[2] < 2.0);
    const sube = despues.filter((o) => o[2] < obs[k][2] - 1.0);
    const sale = despues.filter((o) => Math.abs(o[1]) > 1.1 && o[2] < 1.0);
    const resultado: Resultado = red.length && !sube.length ? "anotada" : sube.length || sale.length ? "fallada" : "desconocido";
    const conf = Math.min(1, 0.3 + 0.07 * obs.length) * (resultado === "desconocido" ? 0.85 : 1);
    const prev = this.eventos[this.eventos.length - 1];
    if (prev && llegada - this.finUltimo < 1.6 && prev.canasta === this.aro.nombre) {
      if (resultado === "anotada" || prev.resultado === "desconocido") {
        prev.resultado = resultado !== "desconocido" ? resultado : prev.resultado === "desconocido" ? "fallada" : prev.resultado;
      }
      prev.t_fin = r2(obs[obs.length - 1][0]);
      prev.observaciones += obs.length;
      prev.confianza = r2(Math.max(prev.confianza, conf));
      this.finUltimo = obs[obs.length - 1][0];
      return;
    }
    const a = this.aro;
    this.eventos.push({
      t: r2(llegada), t_inicio: r2(obs[0][0]), t_fin: r2(obs[obs.length - 1][0]), canasta: a.nombre, resultado,
      confianza: r2(conf), observaciones: obs.length,
      px: [Math.round((a.x + a.w / 2 + obs[k][1] * a.w) * 10) / 10, Math.round((a.y + obs[k][2] * a.w) * 10) / 10],
    });
    this.finUltimo = obs[obs.length - 1][0];
  }
}

// ---------------------------------------------------------------------------- canastas
/** Mediana por píxel de varias imágenes de un canal */
export function mediana(imgs: Uint8Array[], out = new Uint8Array(imgs[0].length), desde = 0, hasta = imgs[0].length): Uint8Array {
  const n = imgs.length, tmp = new Uint8Array(n);
  for (let i = desde; i < hasta; i++) {
    for (let k = 0; k < n; k++) tmp[k] = imgs[k][i];
    tmp.sort();
    out[i] = n % 2 ? tmp[(n - 1) >> 1] : (tmp[n / 2 - 1] + tmp[n / 2] + 1) >> 1;
  }
  return out;
}

/** Saturación (0-255, como el canal S de HSV en OpenCV) de una imagen RGBA */
export function grisYSaturacion(rgba: Uint8ClampedArray | Uint8Array, len: number): [Uint8Array, Uint8Array] {
  const g = new Uint8Array(len), s = new Uint8Array(len);
  for (let i = 0, j = 0; i < len; i++, j += 4) {
    const r = rgba[j], gg = rgba[j + 1], b = rgba[j + 2];
    g[i] = (r * 0.299 + gg * 0.587 + b * 0.114 + 0.5) | 0;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    s[i] = mx ? Math.round((255 * (mx - mn)) / mx) : 0;
  }
  return [g, s];
}

function minMax1D(src: Uint8Array, w: number, h: number, k: number, max: boolean, horizontal: boolean): Uint8Array {
  const out = new Uint8Array(w * h), r = k >> 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = max ? 0 : 255;
      for (let d = -r; d <= r; d++) {
        const xx = horizontal ? x + d : x, yy = horizontal ? y : y + d;
        // borde: se replica el píxel más cercano
        const v = src[Math.min(h - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))];
        if (max ? v > m : v < m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}
const rect = (src: Uint8Array, w: number, h: number, k: number, max: boolean) =>
  minMax1D(minMax1D(src, w, h, k, max, true), w, h, k, max, false);

/** Rectángulos de líneas blancas finas con forma de tablero (también los de otras pistas) */
export function candidatosTablero(gris: Uint8Array, sat: Uint8Array, W: number, H: number, altoReal = H): [number, number, number, number][] {
  const k = Math.max(5, Math.floor(W / 210) | 1);
  const apertura = rect(rect(gris, W, H, k, false), W, H, k, true);
  let m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = gris[i] - apertura[i] > 18 && sat[i] < 70 ? 1 : 0;
  m = rect(rect(m, W, H, 3, true), W, H, 3, false); // cierre 3×3
  const res: [number, number, number, number][] = [];
  for (const mc of manchas(m, W, H)) {
    const x = mc.x0, y = mc.y0, w = mc.x1 - mc.x0 + 1, h = mc.y1 - mc.y0 + 1;
    if (!(0.012 * W < w && w < 0.1 * W && 0.5 < w / h && w / h < 2.6 && y + h < 0.7 * altoReal)) continue;
    let c = 0;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) c += m[yy * W + xx];
    if (c / (w * h) > 0.45) continue;
    res.push([x, y, w, h]);
  }
  return res;
}

export function aroDeTablero(nombre: string, [x, y, w, h]: [number, number, number, number], anchoImg?: number): Aro {
  const aw = Math.max(4, Math.round(0.3 * w));
  // Vista desde la banda: el aro sobresale del tablero hacia el centro de la pista (de la imagen)
  const hacia = anchoImg ? Math.sign(anchoImg / 2 - (x + w / 2)) * 0.25 * w : 0;
  return { nombre, x: Math.floor(x + w / 2 + hacia - aw / 2), y: Math.floor(y + h - 0.12 * h), w: aw, h: Math.max(2, Math.round(aw * 0.3)) };
}

/**
 * De todos los candidatos seguidos un rato, las canastas del partido. Las dos de una pista están a una altura
 * parecida en la imagen, son de un tamaño parecido y quedan en lados opuestos: se elige la mejor pareja así;
 * si no hay pareja, la mejor canasta sola.
 */
export function elegirCanastas(seguidores: SeguidorAro[], ancho: number, alto = ancho * 0.5625): (Aro & { tiros: number })[] {
  const nota = (s: SeguidorAro) => s.eventos.length * Math.max(0, 1 - 12 * (s.ruido / Math.max(1, s.cuadros)));
  const cx = (a: Aro) => a.x + a.w / 2;
  const validos = seguidores.map((s, k) => [nota(s), k] as const).filter(([n]) => n >= 0.9);
  let mejor: number[] = [];
  let mejorNota = 0;
  for (let i = 0; i < validos.length; i++) {
    for (let j = i + 1; j < validos.length; j++) {
      const a = seguidores[validos[i][1]].aro, b = seguidores[validos[j][1]].aro;
      if (Math.abs(cx(a) - cx(b)) < 0.3 * ancho) continue;           // lados opuestos
      if (Math.abs(a.y - b.y) > 0.15 * alto) continue;                // misma altura aproximada
      if (Math.max(a.w, b.w) / Math.min(a.w, b.w) > 1.8) continue;    // mismo tamaño aproximado
      const n = Math.min(validos[i][0], validos[j][0]) * 2 + Math.max(validos[i][0], validos[j][0]) * 0.01;
      if (n > mejorNota) { mejorNota = n; mejor = [validos[i][1], validos[j][1]]; }
    }
  }
  if (!mejor.length && validos.length) mejor = [validos.reduce((a, b) => (b[0] > a[0] ? b : a))[1]];
  const res = mejor.sort((a, b) => seguidores[a].aro.x - seguidores[b].aro.x).map((k) => {
    const s = seguidores[k], a = { ...s.aro, tiros: s.eventos.length };
    const xs = s.eventos.map((e) => e.px[0]).sort((p, q) => p - q);
    if (xs.length >= 2) {
      const med = xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
      a.x = Math.round(med - a.w / 2);
    }
    return a;
  });
  const nombres = res.length === 2 ? ["izquierda", "derecha"] : ["canasta"];
  res.forEach((a, i) => (a.nombre = nombres[i]));
  return res;
}

/** Zona vertical (filas) que hay que leer de cada fotograma para todos los seguidores */
export function filasNecesarias(seg: SeguidorAro[]): [number, number] {
  return [Math.min(...seg.map((s) => s.y0)), Math.max(...seg.map((s) => s.y1))];
}
