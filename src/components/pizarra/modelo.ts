// Modelo de datos de la pizarra. Todo en METROS sobre la pista FIBA (15 × 28 m),
// así el dibujo es independiente del tamaño de pantalla.

export type TipoElemento = "atacante" | "defensor" | "cono" | "entrenador";
export type TipoAccion = "correr" | "botar" | "bloqueo";

export interface Punto { x: number; y: number }

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  etiqueta: string;     // "1", "2", "X3", "E"...
  color: string;
}

export interface Movimiento {
  elementoId: string;
  tipo: TipoAccion;
  puntos: number[];     // [x0, y0, x1, y1, ...] — empieza en la posición inicial de la fase
}

export interface Pase { de: string; a: string }

export interface Fase {
  movimientos: Movimiento[];   // máx. uno por elemento
  pase: Pase | null;           // como mucho un pase por fase
  nota?: string;
}

export interface Pizarra {
  version: 1;
  pista: "media" | "completa";
  elementos: Elemento[];
  inicial: Record<string, Punto>;   // posiciones al empezar la fase 1
  balonInicial: string | null;      // quién tiene el balón al empezar
  fases: Fase[];                    // 1..MAX_FASES
}

export const MAX_FASES = 6;
export const ANCHO = 15;
export const LARGO = (p: Pizarra["pista"]) => (p === "media" ? 14 : 28);

export const COLORES = {
  atacante: "#002b8e",
  defensor: "#ca010c",
  cono: "#fc6401",
  entrenador: "#121a33",
};

export const pizarraVacia = (pista: Pizarra["pista"] = "media"): Pizarra => ({
  version: 1, pista, elementos: [], inicial: {}, balonInicial: null, fases: [{ movimientos: [], pase: null }],
});

export const nuevoId = () => Math.random().toString(36).slice(2, 9);

// ---------- Estado derivado por fase ----------

export interface EstadoFase {
  inicio: Record<string, Punto>;
  fin: Record<string, Punto>;
  balonInicio: string | null;
  balonFin: string | null;
}

/** Recorre las fases y calcula dónde está cada elemento y quién tiene el balón. */
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
    const balonFin = fase.pase ? fase.pase.a : balon;
    res.push({ inicio: pos, fin, balonInicio: balon, balonFin });
    pos = fin;
    balon = balonFin;
  }
  return res;
}

// ---------- Geometría de trayectorias ----------

export function longitud(puntos: number[]) {
  let L = 0;
  for (let i = 2; i < puntos.length; i += 2) {
    L += Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
  }
  return L;
}

/** Punto a una fracción t (0..1) del recorrido, a velocidad constante. */
export function puntoEn(puntos: number[], t: number): Punto {
  if (puntos.length < 4) return { x: puntos[0], y: puntos[1] };
  const total = longitud(puntos);
  let objetivo = Math.max(0, Math.min(1, t)) * total;
  for (let i = 2; i < puntos.length; i += 2) {
    const seg = Math.hypot(puntos[i] - puntos[i - 2], puntos[i + 1] - puntos[i - 1]);
    if (objetivo <= seg || i === puntos.length - 2) {
      const f = seg === 0 ? 1 : Math.min(1, objetivo / seg);
      return {
        x: puntos[i - 2] + (puntos[i] - puntos[i - 2]) * f,
        y: puntos[i - 1] + (puntos[i + 1] - puntos[i - 1]) * f,
      };
    }
    objetivo -= seg;
  }
  return { x: puntos[puntos.length - 2], y: puntos[puntos.length - 1] };
}

/** Quita puntos demasiado juntos del trazo a mano alzada. */
export function simplificar(puntos: number[], minDist = 0.35) {
  if (puntos.length <= 4) return puntos;
  const out = [puntos[0], puntos[1]];
  for (let i = 2; i < puntos.length - 2; i += 2) {
    const lx = out[out.length - 2], ly = out[out.length - 1];
    if (Math.hypot(puntos[i] - lx, puntos[i + 1] - ly) >= minDist) out.push(puntos[i], puntos[i + 1]);
  }
  out.push(puntos[puntos.length - 2], puntos[puntos.length - 1]);
  return out;
}

/** Línea en zigzag a lo largo del trazo (para el bote). */
export function zigzag(puntos: number[], paso = 0.35, amp = 0.18) {
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
    // Las últimas muestras van rectas para que la flecha quede limpia
    const s = k >= n - 1 || k === 0 ? 0 : (k % 2 ? 1 : -1) * amp;
    out.push(p.x + (-dy / d) * s, p.y + (dx / d) * s);
  }
  return out;
}

/** Tramo perpendicular al final del trazo (la "T" del bloqueo). */
export function barraFinal(puntos: number[], medio = 0.45): number[] {
  const n = puntos.length;
  const x = puntos[n - 2], y = puntos[n - 1];
  const px = puntos[n - 4] ?? x, py = puntos[n - 3] ?? y;
  const dx = x - px, dy = y - py;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  return [x + nx * medio, y + ny * medio, x - nx * medio, y - ny * medio];
}

/** Siguiente etiqueta libre: atacantes 1..n, defensores X1..Xn */
export function siguienteEtiqueta(p: Pizarra, tipo: TipoElemento) {
  if (tipo === "cono") return "";
  if (tipo === "entrenador") return "E";
  const usadas = new Set(p.elementos.filter((e) => e.tipo === tipo).map((e) => e.etiqueta));
  for (let i = 1; i < 50; i++) {
    const et = tipo === "defensor" ? `X${i}` : String(i);
    if (!usadas.has(et)) return et;
  }
  return "?";
}

/** Garantiza que un JSON guardado tenga la forma esperada. */
export function normalizar(v: unknown): Pizarra {
  const p = v as Partial<Pizarra> | null;
  if (!p || p.version !== 1 || !Array.isArray(p.fases) || !p.fases.length) return pizarraVacia();
  return {
    version: 1,
    pista: p.pista === "completa" ? "completa" : "media",
    elementos: p.elementos ?? [],
    inicial: p.inicial ?? {},
    balonInicial: p.balonInicial ?? null,
    fases: p.fases.map((f) => ({ movimientos: f.movimientos ?? [], pase: f.pase ?? null, nota: f.nota })),
  };
}
