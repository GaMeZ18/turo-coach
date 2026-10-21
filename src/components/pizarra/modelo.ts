// Modelo de datos de la pizarra (versión 3, funcionamiento tipo Coach Studio).
//
// · Coordenadas en METROS sobre la pista completa horizontal (28 × 15). Las medias pistas son
//   solo una vista recortada: "ofensiva" = mitad derecha, "defensiva" = mitad izquierda.
// · La jugada es una secuencia de FOTOGRAMAS. En cada fotograma pueden moverse varios elementos
//   a la vez (en paralelo) y después pasar el balón.
// · Las CAPTURAS son cortes en esa secuencia: al capturar se limpian las líneas y se sigue grabando.
//   Cada tramo entre capturas es una imagen (para el PDF y para verlo claro).

export type TipoJugador = "atacante" | "defensor" | "entrenador";
export type TipoMaterial = "balon" | "canasta" | "cono" | "aro" | "escalera" | "valla" | "chino" | "pica" | "texto";
export type TipoElemento = TipoJugador | TipoMaterial;
export type TipoTrazo = "correr" | "botar" | "bloqueo";
export type Vista = "completa" | "ofensiva" | "defensiva";

export interface Punto { x: number; y: number }

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  etiqueta: string;
  color: string;
  rot?: number; // grados
}

export interface Movimiento {
  elementoId: string;
  tipo: TipoTrazo;
  puntos: number[]; // [x0,y0,x1,y1,...] desde donde estaba al empezar el fotograma
}

export interface AccionBalon {
  balon: string;               // id del elemento "balon"
  tipo: "pase" | "tiro" | "coger";
  de?: string;                 // quien lo tenía (pase / tiro)
  a?: string;                  // quien lo recibe (pase / coger)
  destino?: Punto;             // canasta (tiro)
}

export interface Fotograma {
  movimientos: Movimiento[];   // simultáneos; como mucho uno por elemento
  balon: AccionBalon[];        // se ejecutan al terminar los movimientos
}

export interface Dibujo {
  id: string;
  tipo: "flecha" | "lapiz";
  puntos: number[];
  color: string;
  seg: number;                 // imagen (tramo entre capturas) a la que pertenece
}

export interface Config {
  tamano: number;              // 0.85 / 1 / 1.2
  velocidad: number;           // 0.6 / 1 / 1.5
}

export interface Pizarra {
  version: 3;
  vista: Vista;
  elementos: Elemento[];
  inicial: Record<string, Punto>;
  poseedor: Record<string, string | null>; // balón → jugador que lo tiene al empezar
  fotogramas: Fotograma[];
  capturas: number[];          // índices k (1..n): tras el fotograma k se capturó
  dibujos: Dibujo[];
  config: Config;
}

export const ANCHO = 28;
export const ALTO = 15;
export const MAX_CAPTURAS = 12;

export const VISTAS: Record<Vista, { x0: number; x1: number; nombre: string }> = {
  completa: { x0: 0, x1: 28, nombre: "Pista completa" },
  ofensiva: { x0: 14, x1: 28, nombre: "Media ofensiva" },
  defensiva: { x0: 0, x1: 14, nombre: "Media defensiva" },
};

export const esJugador = (t: TipoElemento): t is TipoJugador =>
  t === "atacante" || t === "defensor" || t === "entrenador";

export const PALETA = ["#2563eb", "#dc2626", "#eab308", "#16a34a", "#ffffff", "#1f2937"];

export const COLOR_DEFECTO: Record<TipoElemento, string> = {
  atacante: "#002b8e",
  defensor: "#ca010c",
  entrenador: "#1f2937",
  balon: "#fc6401",
  canasta: "#1f2937",
  cono: "#fc6401",
  aro: "#ca010c",
  escalera: "#eab308",
  valla: "#002b8e",
  chino: "#eab308",
  pica: "#eab308",
  texto: "#1f2937",
};

export const NOMBRE: Record<TipoElemento, string> = {
  atacante: "Atacante", defensor: "Defensor", entrenador: "Entrenador", balon: "Balón", canasta: "Canasta",
  cono: "Cono", aro: "Aro", escalera: "Escalera", valla: "Valla", chino: "Chino", pica: "Pica", texto: "Texto",
};

export const pizarraVacia = (): Pizarra => ({
  version: 3, vista: "completa", elementos: [], inicial: {}, poseedor: {}, fotogramas: [], capturas: [], dibujos: [],
  config: { tamano: 1, velocidad: 1 },
});

export const nuevoId = () => Math.random().toString(36).slice(2, 9);

/** Aros fijos de la pista */
export const AROS: Punto[] = [{ x: 1.575, y: 7.5 }, { x: 28 - 1.575, y: 7.5 }];

// ---------- Estados ----------

export interface Estado {
  pos: Record<string, Punto>;
  poseedor: Record<string, string | null>;
}

/** estados[k] = cómo está todo después de k fotogramas (estados[0] = inicio). */
export function estados(p: Pizarra): Estado[] {
  let pos = { ...p.inicial };
  let poseedor = { ...p.poseedor };
  const res: Estado[] = [{ pos, poseedor }];
  for (const f of p.fotogramas) {
    const np = { ...pos };
    for (const m of f.movimientos) {
      const n = m.puntos.length;
      if (n >= 2) np[m.elementoId] = { x: m.puntos[n - 2], y: m.puntos[n - 1] };
    }
    const npo = { ...poseedor };
    for (const a of f.balon) {
      if (a.tipo === "tiro") {
        npo[a.balon] = null;
        if (a.destino) np[a.balon] = { ...a.destino };
      } else if (a.a) {
        npo[a.balon] = a.a;
      }
    }
    res.push({ pos: np, poseedor: npo });
    pos = np;
    poseedor = npo;
  }
  return res;
}

/** ¿Lleva este jugador algún balón en ese estado? */
export const llevaBalon = (e: Estado, jugadorId: string) => Object.values(e.poseedor).some((j) => j === jugadorId);

// ---------- Capturas (tramos) ----------

/** Tramo (imagen) al que pertenece el fotograma f (1..n) */
export const tramoDeFotograma = (p: Pizarra, f: number) => p.capturas.filter((b) => b < f).length;
/** Tramo que se ve con el cursor en k: justo tras capturar se ve limpio (tramo nuevo) */
export const tramoDeCursor = (p: Pizarra, k: number) => p.capturas.filter((b) => b <= k).length;

/** Lista de imágenes: cada una con su primer estado y sus fotogramas */
export function tramos(p: Pizarra) {
  const cortes = [...p.capturas].sort((a, b) => a - b);
  const res: { inicio: number; fin: number }[] = [];
  let ini = 0;
  for (const c of cortes) { res.push({ inicio: ini, fin: c }); ini = c; }
  if (ini < p.fotogramas.length || res.length === 0) res.push({ inicio: ini, fin: p.fotogramas.length });
  return res.filter((t, i) => t.fin > t.inicio || p.dibujos.some((d) => d.seg === i) || i === 0);
}

/** Quita fotogramas vacíos y corrige las capturas */
export function compactar(p: Pizarra): Pizarra {
  const fotogramas: Fotograma[] = [];
  const nuevoIndice: number[] = [0]; // índice antiguo k → nuevo
  p.fotogramas.forEach((f, i) => {
    if (f.movimientos.length || f.balon.length) fotogramas.push(f);
    nuevoIndice[i + 1] = fotogramas.length;
  });
  const capturas = [...new Set(p.capturas.map((b) => nuevoIndice[b] ?? fotogramas.length))]
    .filter((b) => b > 0 && b <= fotogramas.length)
    .sort((x, y) => x - y);
  return { ...p, fotogramas, capturas };
}

// ---------- Geometría ----------

export function longitud(puntos: number[]) {
  let L = 0;
  for (let i = 2; i < puntos.length; i += 2) L += Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
  return L;
}

export function puntoEn(puntos: number[], t: number): Punto {
  if (puntos.length < 4) return { x: puntos[0], y: puntos[1] };
  let objetivo = Math.max(0, Math.min(1, t)) * longitud(puntos);
  for (let i = 2; i < puntos.length; i += 2) {
    const seg = Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
    if (objetivo <= seg || i === puntos.length - 2) {
      const f = seg === 0 ? 1 : Math.min(1, objetivo / seg);
      return { x: puntos[i - 2] + (puntos[i] - puntos[i - 2]) * f, y: puntos[i - 1] + (puntos[i + 1] - puntos[i - 1]) * f };
    }
    objetivo -= seg;
  }
  return { x: puntos[puntos.length - 2], y: puntos[puntos.length - 1] };
}

export function simplificar(puntos: number[], minDist = 0.3) {
  if (puntos.length <= 4) return puntos;
  const out = [puntos[0], puntos[1]];
  for (let i = 2; i < puntos.length - 2; i += 2) {
    const lx = out[out.length - 2], ly = out[out.length - 1];
    if (Math.hypot(puntos[i] - lx, puntos[i + 1] - ly) >= minDist) out.push(puntos[i], puntos[i + 1]);
  }
  out.push(puntos[puntos.length - 2], puntos[puntos.length - 1]);
  return out;
}

export function recortarFinal(puntos: number[], r: number) {
  const L = longitud(puntos);
  if (L <= r * 1.5) return puntos;
  const fin = puntoEn(puntos, (L - r) / L);
  const out: number[] = [puntos[0], puntos[1]];
  let acc = 0;
  for (let i = 2; i < puntos.length; i += 2) {
    acc += Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
    if (acc >= L - r) break;
    out.push(puntos[i], puntos[i + 1]);
  }
  out.push(fin.x, fin.y);
  return out;
}

export function zigzag(puntos: number[], paso = 0.32, amp = 0.17) {
  const total = longitud(puntos);
  if (total < paso * 2) return puntos;
  const n = Math.floor(total / paso);
  const out: number[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = puntoEn(puntos, t);
    const q = puntoEn(puntos, Math.min(1, t + 0.01));
    const dx = q.x - p.x, dy = q.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const s = k >= n - 1 || k === 0 ? 0 : (k % 2 ? 1 : -1) * amp;
    out.push(p.x + (-dy / d) * s, p.y + (dx / d) * s);
  }
  return out;
}

export function barraFinal(puntos: number[], medio = 0.45): number[] {
  const n = puntos.length;
  const x = puntos[n - 2], y = puntos[n - 1];
  const px = puntos[n - 4] ?? x, py = puntos[n - 3] ?? y;
  const d = Math.hypot(x - px, y - py) || 1;
  const nx = -(y - py) / d, ny = (x - px) / d;
  return [x + nx * medio, y + ny * medio, x - nx * medio, y - ny * medio];
}

export function paralelas(a: Punto, b: Punto, sep = 0.1): [number[], number[]] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / d) * sep, ny = ((b.x - a.x) / d) * sep;
  return [[a.x + nx, a.y + ny, b.x + nx, b.y + ny], [a.x - nx, a.y - ny, b.x - nx, b.y - ny]];
}

export function barrasMano(a: Punto, b: Punto, largo = 0.32): [number[], number[]] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
  const nx = -uy * largo, ny = ux * largo;
  const c1 = { x: a.x + ux * d * 0.45, y: a.y + uy * d * 0.45 };
  const c2 = { x: c1.x + ux * 0.2, y: c1.y + uy * 0.2 };
  return [[c1.x + nx, c1.y + ny, c1.x - nx, c1.y - ny], [c2.x + nx, c2.y + ny, c2.x - nx, c2.y - ny]];
}

export function siguienteEtiqueta(p: Pizarra, tipo: TipoElemento) {
  if (tipo === "entrenador") return "E";
  if (tipo !== "atacante" && tipo !== "defensor") return "";
  const usadas = new Set(p.elementos.filter((e) => e.tipo === tipo).map((e) => e.etiqueta));
  for (let i = 1; i < 50; i++) {
    const et = tipo === "defensor" ? `X${i}` : String(i);
    if (!usadas.has(et)) return et;
  }
  return "?";
}

// ---------- Compatibilidad con versiones anteriores ----------

type PuntoV = { x: number; y: number };

export function normalizar(v: unknown): Pizarra {
  const p = v as Record<string, unknown> | null;
  if (!p) return pizarraVacia();

  if (p.version === 3) {
    const q = p as unknown as Pizarra;
    return {
      ...pizarraVacia(),
      ...q,
      vista: q.vista ?? "completa",
      poseedor: q.poseedor ?? {},
      fotogramas: (q.fotogramas ?? []).map((f) => ({ movimientos: f.movimientos ?? [], balon: f.balon ?? [] })),
      capturas: q.capturas ?? [],
      dibujos: q.dibujos ?? [],
      config: { tamano: q.config?.tamano ?? 1, velocidad: q.config?.velocidad ?? 1 },
    };
  }

  if (!Array.isArray(p.fases)) return pizarraVacia();

  // v1 / v2 → v3
  type Antigua = {
    version?: number; pista?: string; elementos?: Elemento[]; inicial?: Record<string, PuntoV>; balonInicial?: string | null;
    fases: { movimientos?: Movimiento[]; pase?: { de: string; a: string } | null; balon?: { tipo: string; de: string; a?: string } | null }[];
  };
  const a = p as unknown as Antigua;
  const v1 = a.version !== 2;
  // Transformación de coordenadas a la pista completa horizontal
  let c: (q: PuntoV) => PuntoV = (q) => q;
  let vista: Vista = "completa";
  if (a.pista === "media") {
    c = (q) => ({ x: 28 - q.y, y: q.x }); // media vertical → mitad derecha
    vista = "ofensiva";
  } else if (v1) {
    c = (q) => ({ x: q.y, y: 15 - q.x }); // completa vertical (v1) → horizontal
  }
  const cp = (pts: number[]) => {
    const out: number[] = [];
    for (let i = 0; i < pts.length; i += 2) { const q = c({ x: pts[i], y: pts[i + 1] }); out.push(q.x, q.y); }
    return out;
  };
  const p3 = pizarraVacia();
  p3.vista = vista;
  p3.elementos = (a.elementos ?? []).map((e) => ({ ...e, color: e.color ?? COLOR_DEFECTO[e.tipo] ?? "#1f2937" }));
  for (const [k, val] of Object.entries(a.inicial ?? {})) p3.inicial[k] = c(val);

  // El balón de posesión pasa a ser un elemento "balon"
  let bal: string | null = null;
  const asegurarBalon = (jugador: string) => {
    if (bal) return bal;
    bal = "b" + nuevoId();
    p3.elementos.push({ id: bal, tipo: "balon", etiqueta: "", color: COLOR_DEFECTO.balon });
    p3.inicial[bal] = p3.inicial[jugador] ?? { x: 14, y: 7.5 };
    p3.poseedor[bal] = null;
    return bal;
  };
  if (a.balonInicial) { const b = asegurarBalon(a.balonInicial); p3.poseedor[b] = a.balonInicial; }

  a.fases.forEach((f, i) => {
    const fot: Fotograma = { movimientos: (f.movimientos ?? []).map((m) => ({ ...m, puntos: cp(m.puntos) })), balon: [] };
    const acc = f.balon ?? (f.pase ? { tipo: "pase", de: f.pase.de, a: f.pase.a } : null);
    if (acc) {
      const b = asegurarBalon(acc.de);
      if (acc.tipo === "tiro") {
        const ultimo = fot.movimientos.find((m) => m.elementoId === acc.de);
        const desde = ultimo ? { x: ultimo.puntos[ultimo.puntos.length - 2], y: ultimo.puntos[ultimo.puntos.length - 1] } : p3.inicial[acc.de];
        const destino = desde && Math.abs(desde.x - AROS[0].x) < Math.abs(desde.x - AROS[1].x) ? AROS[0] : AROS[1];
        fot.balon.push({ balon: b, tipo: "tiro", de: acc.de, destino });
      } else if (acc.a) {
        fot.balon.push({ balon: b, tipo: "pase", de: acc.de, a: acc.a });
      }
    }
    p3.fotogramas.push(fot);
    if (i < a.fases.length - 1) p3.capturas.push(i + 1);
  });
  return compactar(p3);
}
