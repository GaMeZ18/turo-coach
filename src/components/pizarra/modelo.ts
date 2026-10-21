// Modelo de datos de la pizarra (versión 2).
// Coordenadas en METROS sobre la pista:
//   - "completa": horizontal, 28 × 15 (canastas a izquierda y derecha)
//   - "media":    vertical,   15 × 14 (canasta arriba)
// Así el dibujo no depende del tamaño de la pantalla.

export type TipoJugador = "atacante" | "defensor" | "entrenador";
export type TipoMaterial = "cono" | "chino" | "aro" | "pica" | "valla" | "escalera" | "balon" | "texto";
export type TipoElemento = TipoJugador | TipoMaterial;
export type TipoTrazo = "correr" | "botar" | "bloqueo";
export type TipoAccionBalon = "pase" | "mano" | "tiro";

export interface Punto { x: number; y: number }

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  etiqueta: string;     // "1", "X2", "E", o el texto si es "texto"
  color: string;
  rot?: number;         // grados (materiales y texto)
}

export interface Movimiento {
  elementoId: string;
  tipo: TipoTrazo;      // para materiales siempre "correr" (se dibuja punteado y fino)
  puntos: number[];     // [x0, y0, x1, y1, ...] — empieza donde está el elemento al empezar la fase
}

export interface AccionBalon {
  tipo: TipoAccionBalon;
  de: string;           // quién tiene el balón
  a?: string;           // receptor (pase y mano a mano)
}

export interface Fase {
  movimientos: Movimiento[];   // como mucho uno por elemento
  balon: AccionBalon | null;   // se ejecuta al final de la fase
  nota?: string;
}

export interface Pizarra {
  version: 2;
  pista: "completa" | "media";
  elementos: Elemento[];
  inicial: Record<string, Punto>;
  balonInicial: string | null;
  fases: Fase[];               // 1..MAX_FASES
}

export const MAX_FASES = 6;

export const dimensiones = (pista: Pizarra["pista"]) =>
  pista === "completa" ? { ancho: 28, alto: 15 } : { ancho: 15, alto: 14 };

export const esJugador = (t: TipoElemento): t is TipoJugador =>
  t === "atacante" || t === "defensor" || t === "entrenador";

export const PALETA = ["#002b8e", "#ca010c", "#fde302", "#fc6401", "#16a34a", "#121a33", "#ffffff"];

export const COLOR_DEFECTO: Record<TipoElemento, string> = {
  atacante: "#002b8e",
  defensor: "#ca010c",
  entrenador: "#121a33",
  cono: "#fc6401",
  chino: "#fde302",
  aro: "#ca010c",
  pica: "#fde302",
  valla: "#002b8e",
  escalera: "#fde302",
  balon: "#fc6401",
  texto: "#121a33",
};

export const NOMBRE: Record<TipoElemento, string> = {
  atacante: "Atacante", defensor: "Defensor", entrenador: "Entrenador",
  cono: "Cono", chino: "Chino", aro: "Aro", pica: "Pica", valla: "Valla",
  escalera: "Escalera", balon: "Balón", texto: "Texto",
};

export const pizarraVacia = (pista: Pizarra["pista"] = "completa"): Pizarra => ({
  version: 2, pista, elementos: [], inicial: {}, balonInicial: null, fases: [{ movimientos: [], balon: null }],
});

export const nuevoId = () => Math.random().toString(36).slice(2, 9);

/** Posición de las canastas (centro del aro) */
export function canastas(pista: Pizarra["pista"]): Punto[] {
  return pista === "completa"
    ? [{ x: 1.575, y: 7.5 }, { x: 28 - 1.575, y: 7.5 }]
    : [{ x: 7.5, y: 1.575 }];
}

export function canastaCercana(pista: Pizarra["pista"], p: Punto): Punto {
  return canastas(pista).reduce((a, b) => (Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a));
}

// ---------- Estado derivado por fase ----------

export interface EstadoFase {
  inicio: Record<string, Punto>;
  fin: Record<string, Punto>;
  balonInicio: string | null;
  balonFin: string | null;
}

export function estados(p: Pizarra): EstadoFase[] {
  const res: EstadoFase[] = [];
  let pos = { ...p.inicial };
  let balon = p.balonInicial;
  for (const fase of p.fases) {
    const fin = { ...pos };
    for (const m of fase.movimientos) {
      const n = m.puntos.length;
      if (n >= 2) fin[m.elementoId] = { x: m.puntos[n - 2], y: m.puntos[n - 1] };
    }
    let balonFin = balon;
    if (fase.balon) balonFin = fase.balon.tipo === "tiro" ? null : fase.balon.a ?? balon;
    res.push({ inicio: pos, fin, balonInicio: balon, balonFin });
    pos = fin;
    balon = balonFin;
  }
  return res;
}

// ---------- Geometría ----------

export function longitud(puntos: number[]) {
  let L = 0;
  for (let i = 2; i < puntos.length; i += 2) L += Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
  return L;
}

/** Punto a una fracción t (0..1) del recorrido, a velocidad constante. */
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

/** Suaviza el trazo hecho con el dedo: quita puntos muy juntos. */
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

/** Recorta el final del trazo para que la flecha no quede tapada por el jugador. */
export function recortarFinal(puntos: number[], r: number) {
  const L = longitud(puntos);
  if (L <= r * 1.5) return puntos;
  const fin = puntoEn(puntos, (L - r) / L);
  const out: number[] = [];
  let acumulado = 0;
  out.push(puntos[0], puntos[1]);
  for (let i = 2; i < puntos.length; i += 2) {
    acumulado += Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
    if (acumulado >= L - r) break;
    out.push(puntos[i], puntos[i + 1]);
  }
  out.push(fin.x, fin.y);
  return out;
}

/** Línea en zigzag a lo largo del trazo (bote). */
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

/** Perpendicular unitaria al final del trazo */
function normalFinal(puntos: number[]) {
  const n = puntos.length;
  const x = puntos[n - 2], y = puntos[n - 1];
  const px = puntos[n - 4] ?? x, py = puntos[n - 3] ?? y;
  const d = Math.hypot(x - px, y - py) || 1;
  return { x, y, nx: -(y - py) / d, ny: (x - px) / d, dx: (x - px) / d, dy: (y - py) / d };
}

/** "T" del bloqueo */
export function barraFinal(puntos: number[], medio = 0.45): number[] {
  const { x, y, nx, ny } = normalFinal(puntos);
  return [x + nx * medio, y + ny * medio, x - nx * medio, y - ny * medio];
}

/** Dos líneas paralelas desplazadas (tiro) */
export function paralelas(a: Punto, b: Punto, sep = 0.1): [number[], number[]] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / d) * sep, ny = ((b.x - a.x) / d) * sep;
  return [
    [a.x + nx, a.y + ny, b.x + nx, b.y + ny],
    [a.x - nx, a.y - ny, b.x - nx, b.y - ny],
  ];
}

/** Las dos barritas "||" del mano a mano, cerca del receptor */
export function barrasMano(a: Punto, b: Punto, largo = 0.35): [number[], number[]] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
  const nx = -uy * largo, ny = ux * largo;
  const c1 = { x: a.x + ux * d * 0.55, y: a.y + uy * d * 0.55 };
  const c2 = { x: a.x + ux * (d * 0.55 + 0.22), y: a.y + uy * (d * 0.55 + 0.22) };
  return [
    [c1.x + nx, c1.y + ny, c1.x - nx, c1.y - ny],
    [c2.x + nx, c2.y + ny, c2.x - nx, c2.y - ny],
  ];
}

/** Siguiente etiqueta libre: atacantes 1..n, defensores X1..Xn */
export function siguienteEtiqueta(p: Pizarra, tipo: TipoElemento) {
  if (tipo === "entrenador") return "E";
  if (tipo === "texto") return "Texto";
  if (tipo !== "atacante" && tipo !== "defensor") return "";
  const usadas = new Set(p.elementos.filter((e) => e.tipo === tipo).map((e) => e.etiqueta));
  for (let i = 1; i < 50; i++) {
    const et = tipo === "defensor" ? `X${i}` : String(i);
    if (!usadas.has(et)) return et;
  }
  return "?";
}

// ---------- Cambio de pista ----------

/** Convierte coordenadas al cambiar de media pista (vertical) a completa (horizontal) y viceversa.
 *  La media pista ocupa la mitad izquierda de la completa. */
export function convertirPunto(pt: Punto, de: Pizarra["pista"], a: Pizarra["pista"]): Punto {
  if (de === a) return pt;
  if (de === "media") return { x: pt.y, y: 15 - pt.x };                       // vertical → mitad izquierda
  return { x: 15 - Math.min(15, pt.y), y: Math.min(14, pt.x) };               // mitad izquierda → vertical
}

export function cambiarPista(p: Pizarra, nueva: Pizarra["pista"]): Pizarra {
  if (p.pista === nueva) return p;
  const c = (pt: Punto) => convertirPunto(pt, p.pista, nueva);
  const inicial: Record<string, Punto> = {};
  for (const [k, v] of Object.entries(p.inicial)) inicial[k] = c(v);
  return {
    ...p,
    pista: nueva,
    inicial,
    elementos: p.elementos.map((e) => (e.rot !== undefined ? { ...e, rot: (e.rot + (nueva === "completa" ? -90 : 90)) % 360 } : e)),
    fases: p.fases.map((f) => ({
      ...f,
      movimientos: f.movimientos.map((m) => {
        const pts: number[] = [];
        for (let i = 0; i < m.puntos.length; i += 2) {
          const q = c({ x: m.puntos[i], y: m.puntos[i + 1] });
          pts.push(q.x, q.y);
        }
        return { ...m, puntos: pts };
      }),
    })),
  };
}

// ---------- Compatibilidad ----------

/** Acepta pizarras guardadas con la versión 1 (vertical, pase {de,a}) y las convierte a la 2. */
export function normalizar(v: unknown): Pizarra {
  const p = v as Record<string, unknown> | null;
  if (!p || !Array.isArray(p.fases) || !p.fases.length) return pizarraVacia();

  if (p.version === 2) {
    const q = p as unknown as Pizarra;
    return {
      version: 2,
      pista: q.pista === "media" ? "media" : "completa",
      elementos: q.elementos ?? [],
      inicial: q.inicial ?? {},
      balonInicial: q.balonInicial ?? null,
      fases: q.fases.map((f) => ({ movimientos: f.movimientos ?? [], balon: f.balon ?? null, nota: f.nota })),
    };
  }

  // Versión 1
  type V1 = {
    pista?: string; elementos?: Elemento[]; inicial?: Record<string, Punto>; balonInicial?: string | null;
    fases: { movimientos?: Movimiento[]; pase?: { de: string; a: string } | null; nota?: string }[];
  };
  const a = p as unknown as V1;
  const completaVertical = a.pista === "completa";
  // completa vertical (15×28, canasta arriba) → horizontal (28×15, canasta a la izquierda)
  const c = (pt: Punto): Punto => (completaVertical ? { x: pt.y, y: 15 - pt.x } : pt);
  const inicial: Record<string, Punto> = {};
  for (const [k, val] of Object.entries(a.inicial ?? {})) inicial[k] = c(val);
  return {
    version: 2,
    pista: completaVertical ? "completa" : "media",
    elementos: (a.elementos ?? []).map((e) => ({ ...e, tipo: e.tipo, color: e.color ?? COLOR_DEFECTO[e.tipo] })),
    inicial,
    balonInicial: a.balonInicial ?? null,
    fases: a.fases.map((f) => ({
      nota: f.nota,
      balon: f.pase ? { tipo: "pase" as const, de: f.pase.de, a: f.pase.a } : null,
      movimientos: (f.movimientos ?? []).map((m) => {
        const pts: number[] = [];
        for (let i = 0; i < m.puntos.length; i += 2) {
          const q = c({ x: m.puntos[i], y: m.puntos[i + 1] });
          pts.push(q.x, q.y);
        }
        return { ...m, puntos: pts };
      }),
    })),
  };
}
