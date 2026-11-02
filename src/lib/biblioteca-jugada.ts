// Biblioteca del CB Turó · "compilador" de jugadas: a partir del ataque (posiciones, cortes, pases, bloqueos)
// coloca y mueve a la defensa en cada paso, para que en la pizarra se vean los espacios, las ayudas y por qué
// queda libre quien queda libre.
//  · individual: presión al balón, negación a un pase, ayuda en el lado débil, ayuda ante la penetración,
//    defensor atrapado en el bloqueo o en el mano a mano, cierre del rebote.
//  · zona (2-3, 3-2, 1-3-1, match-up): cada defensor va a su sitio según dónde está el balón; ante la
//    penetración cierran los dos más cercanos; en la match-up se sigue al que corta.
import type { EjercicioSemilla } from "./biblioteca-semilla";

export type P = [number, number];
type Montaje = EjercicioSemilla["montaje"];
type Paso = NonNullable<Montaje["pasos"]>[number];

export type Lugar =
  | "cabeza" | "postealto"
  | "baseD" | "alaD" | "esqD" | "fondoD" | "posteD"
  | "baseI" | "alaI" | "esqI" | "fondoI" | "posteI";
export type Zona = "23" | "32" | "131" | "match";

export type PasoJ = Paso & {
  /** Movimientos de defensores escritos a mano: [defensor (sin "d"), punto, punto…] */
  dm?: [string, ...P[]][];
  /** (zona) Dónde está el balón tras el paso (si no, se deduce del receptor) */
  zona?: Lugar;
  /** Cerrar el rebote en este paso (cada defensor se pone entre su atacante y el aro) */
  cierra?: boolean;
  /** La defensa no se mueve en este paso */
  quieta?: boolean;
  /** (individual) Defensor que sale a ayudar ante la penetración de este paso */
  ayuda?: string;
};
export type MontajeJ = Omit<Montaje, "pasos"> & {
  pasos?: PasoJ[];
  /** individual (por defecto si hay o se piden defensores) o zona */
  defensa?: "individual" | Zona | "zonaLibre" | "ninguna";
  /** Desplazamiento mínimo (m) para dibujar el movimiento de un defensor */
  umbral?: number;
};

// ---------------------------------------------------------------------------- utilidades
const r1 = (v: number) => Math.round(v * 10) / 10;
const pt = (x: number, y: number): P => [r1(Math.min(27.9, Math.max(0.1, x))), r1(Math.min(14.9, Math.max(0.1, y)))];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const uni = (a: P, b: P): P => { const d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
const mas = (p: P, u: P, k: number): P => pt(p[0] + u[0] * k, p[1] + u[1] * k);
export const hacia = (p: P, q: P, f: number): P => pt(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f);
const espejo = (p: P): P => [p[0], r1(15 - p[1])];
/** Distancia de un punto a un segmento */
const aSegmento = (p: P, a: P, b: P) => {
  const vx = b[0] - a[0], vy = b[1] - a[1], l = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
};

export const ARO_D: P = [26.4, 7.5];
export const ARO_I: P = [1.6, 7.5];
/** Defensor entre su atacante y el aro */
export const entre = (p: P, aro: P = ARO_D, d = 1.0): P => mas(p, uni(p, aro), Math.min(d, dist(p, aro) * 0.6));

/** Posición del defensor de un jugador sin balón: negación a un pase o ayuda en el lado débil */
function sinBalon(p: P, balon: P, aro: P): P {
  if (dist(p, balon) < 6.8) {
    const u = uni(p, balon), v = uni(p, aro);
    return pt(p[0] + u[0] * 1.0 + v[0] * 0.4, p[1] + u[1] * 1.0 + v[1] * 0.4);
  }
  return hacia(p, hacia(aro, balon, 0.3), 0.55);
}

// ---------------------------------------------------------------------------- zonas
export const LUGARES: Record<Lugar, P> = {
  cabeza: [19.4, 7.5], postealto: [22.2, 7.5],
  baseD: [19.6, 10], alaD: [21, 12.4], esqD: [27, 14], fondoD: [26.8, 11.8], posteD: [25.6, 9.8],
  baseI: [19.6, 5], alaI: [21, 2.6], esqI: [27, 1], fondoI: [26.8, 3.2], posteI: [25.6, 5.2],
};
type Tabla = Record<"cabeza" | "postealto" | "baseD" | "alaD" | "esqD" | "fondoD" | "posteD", Record<string, P>>;
// 2-3: 1 y 2 arriba (1 en el lado I), 3 y 4 abajo (3 en el lado I), 5 en el centro
const Z23: Tabla = {
  cabeza: { "1": [20.6, 7.0], "2": [21.6, 9.0], "3": [24.6, 4.6], "4": [24.6, 10.4], "5": [25.2, 7.5] },
  baseD: { "2": [20.6, 9.8], "1": [21.6, 6.8], "3": [24.8, 5.0], "4": [24.4, 10.8], "5": [25.2, 8.0] },
  alaD: { "2": [21.8, 11.4], "1": [22.2, 8.4], "4": [24.8, 11.4], "5": [25.4, 9.0], "3": [25.0, 6.2] },
  esqD: { "4": [26.2, 13.0], "5": [25.8, 10.2], "3": [25.4, 7.6], "2": [23.4, 11.6], "1": [22.6, 8.6] },
  postealto: { "1": [21.8, 6.4], "2": [21.8, 8.6], "5": [23.6, 7.5], "3": [25.4, 5.6], "4": [25.4, 9.4] },
  fondoD: { "4": [26.0, 11.2], "5": [25.6, 9.4], "3": [25.4, 6.6], "2": [23.0, 11.2], "1": [22.6, 8.4] },
  posteD: { "5": [25.8, 9.0], "4": [25.0, 10.8], "2": [22.8, 10.8], "3": [25.6, 6.6], "1": [22.6, 8.2] },
};
// 3-2: 1 arriba, 2 y 3 en las alas (2 en el lado I), 4 y 5 abajo (4 en el lado I)
const Z32: Tabla = {
  cabeza: { "1": [20.4, 7.5], "2": [21.8, 4.2], "3": [21.8, 10.8], "4": [24.8, 5.8], "5": [24.8, 9.2] },
  baseD: { "1": [20.6, 9.4], "3": [21.8, 11.6], "2": [22.4, 6.0], "5": [25.0, 9.6], "4": [25.2, 6.6] },
  alaD: { "3": [21.8, 11.6], "1": [21.4, 9.0], "2": [22.6, 6.6], "5": [25.0, 10.6], "4": [25.4, 7.6] },
  esqD: { "5": [26.2, 13.0], "3": [23.0, 12.0], "4": [25.6, 9.6], "1": [22.4, 8.6], "2": [24.0, 6.6] },
  postealto: { "1": [21.3, 7.3], "2": [22.4, 5.0], "3": [22.4, 10.0], "5": [23.6, 7.9], "4": [25.2, 7.0] },
  fondoD: { "5": [26.0, 11.2], "4": [25.6, 8.4], "3": [23.0, 11.6], "1": [22.2, 8.6], "2": [23.4, 5.6] },
  posteD: { "5": [25.6, 10.2], "4": [25.6, 8.0], "3": [23.4, 11.2], "1": [22.4, 8.6], "2": [23.0, 5.8] },
};
// 1-3-1: 1 arriba, 2 y 3 en las alas (2 en el lado I), 5 en el centro (poste alto), 4 en la línea de fondo
const Z131: Tabla = {
  cabeza: { "1": [20.4, 7.5], "2": [22.4, 3.8], "3": [22.4, 11.2], "5": [23.2, 7.5], "4": [26.0, 7.5] },
  baseD: { "1": [20.6, 9.2], "3": [21.6, 11.8], "5": [23.0, 8.6], "2": [23.0, 5.0], "4": [26.0, 8.6] },
  alaD: { "3": [21.8, 11.6], "1": [21.2, 9.0], "5": [23.4, 9.6], "4": [25.8, 10.2], "2": [23.6, 5.8] },
  esqD: { "4": [26.2, 13.0], "3": [23.6, 12.2], "5": [25.4, 10.0], "2": [25.0, 6.8], "1": [22.4, 9.4] },
  postealto: { "5": [22.9, 7.5], "1": [21.3, 7.5], "2": [22.8, 5.2], "3": [22.8, 9.8], "4": [26.0, 7.5] },
  fondoD: { "4": [26.0, 11.2], "5": [25.2, 9.4], "3": [23.0, 11.8], "2": [24.6, 6.6], "1": [22.2, 9.2] },
  posteD: { "5": [25.4, 9.0], "4": [26.2, 10.4], "3": [23.4, 11.4], "2": [25.2, 6.6], "1": [22.4, 9.0] },
};
const TABLAS: Record<Zona, { t: Tabla; cambio: Record<string, string> }> = {
  "23": { t: Z23, cambio: { "1": "2", "2": "1", "3": "4", "4": "3", "5": "5" } },
  "32": { t: Z32, cambio: { "1": "1", "2": "3", "3": "2", "4": "5", "5": "4" } },
  "131": { t: Z131, cambio: { "1": "1", "2": "3", "3": "2", "4": "4", "5": "5" } },
  match: { t: Z32, cambio: { "1": "1", "2": "3", "3": "2", "4": "5", "5": "4" } },
};
/** Sitio de cada defensor de la zona con el balón en ese lugar */
export function posZona(z: Zona, l: Lugar): Record<string, P> {
  const { t, cambio } = TABLAS[z];
  if (l === "cabeza" || l === "postealto" || l.endsWith("D")) return { ...t[l as keyof Tabla] };
  const base = t[(l.slice(0, -1) + "D") as keyof Tabla];
  return Object.fromEntries(Object.entries(base).map(([k, p]) => [cambio[k], espejo(p)]));
}
/** Lugar con nombre más cercano a un punto */
export function lugarDe(p: P): Lugar {
  let mejor: Lugar = "cabeza", d = 1e9;
  for (const [l, q] of Object.entries(LUGARES) as [Lugar, P][]) { const e = dist(p, q); if (e < d) { d = e; mejor = l; } }
  // los codos cuentan como poste alto
  if (p[0] > 21.4 && p[0] < 23.6 && p[1] > 5.6 && p[1] < 9.4) return "postealto";
  return mejor;
}

// ---------------------------------------------------------------------------- compilador
export function jugada(m: MontajeJ): Montaje {
  const { defensa: modoPedido, umbral: umbralPedido, pasos = [], ...resto } = m;
  const at: Record<string, P> = { ...(m.at ?? {}) };
  const aro = m.vista === "defensiva" ? ARO_I : ARO_D;
  const modo = modoPedido ?? (m.df ? "individual" : "ninguna");
  const zona = modo !== "individual" && modo !== "ninguna" && modo !== "zonaLibre" ? modo : null;
  const libre = modo === "zonaLibre";
  // En zona se mueven todos con cada pase: solo se dibujan los desplazamientos que importan
  const umbral = umbralPedido ?? (zona ? 1.1 : 0.7);
  const coach = m.entrenador;
  let tiene: string | null = m.balon ?? null;
  const posBalon = (): P | null => (tiene && at[tiene] ? at[tiene] : tiene === "e" && coach ? coach : null);

  // Defensa inicial (la escrita se respeta; la que falta se coloca)
  const df0: Record<string, P> = modo !== "ninguna" && !libre ? dfInicial(m, zona, aro) : { ...(m.df ?? {}) };
  const df: Record<string, P> = { ...df0 };
  // Defensores escritos a mano en algún paso: esos no los mueve el compilador
  const manual = new Set<string>();
  for (const p of pasos) {
    for (const [k] of p.dm ?? []) manual.add(k);
    for (const [q] of p.m ?? []) if (!(q in at) && q[0] === "d" && q.slice(1) in df) manual.add(q.slice(1));
  }
  const auto = Object.keys(df).filter((k) => !manual.has(k) && (zona || libre || k in at));

  const salida: Paso[] = pasos.map((paso) => {
    const { dm, zona: lugarPaso, cierra, quieta, ayuda: quienAyuda, ...base } = paso;
    const antes = { ...at };
    const caminos: Record<string, { tipo: string; pts: P[] }> = {};
    const bloqueos: { k: string; p: P }[] = [];
    for (const [q, tipo, ...pts] of base.m ?? []) {
      if (q in at) {
        caminos[q] = { tipo, pts: [at[q], ...pts] };
        at[q] = pts[pts.length - 1];
        if (tipo === "bloqueo") bloqueos.push({ k: q, p: at[q] });
      } else if (q[0] === "d" && q.slice(1) in df) df[q.slice(1)] = pts[pts.length - 1];
    }
    const pasador = tiene;
    if (base.pase || base.mano) tiene = (base.pase ?? base.mano)![1];
    if (base.tiro) tiene = null;
    if (base.rebote) tiene = base.rebote;

    const objetivo: Record<string, P> = {};
    const bp = posBalon();
    if (modo !== "ninguna" && !quieta) {
      if (cierra) {
        // Cierre del rebote: cada defensor busca al atacante (en zona, el más cercano) y se pone entre él y el aro
        const libres = new Set(Object.keys(at));
        for (const k of auto) {
          let a: string | null = zona || libre ? null : k in at ? k : null;
          if (zona || libre) {
            let d = 1e9;
            for (const q of libres) { const e = dist(df[k], at[q]); if (e < d && dist(at[q], aro) < 8.5) { d = e; a = q; } }
          }
          if (a) { libres.delete(a); objetivo[k] = entre(at[a], aro, 0.75); }
        }
      } else if (bp && !base.tiro) {
        const driver = pasador && caminos[pasador]?.tipo === "botar" && pasador === tiene ? pasador : null;
        if (zona) {
          const sitio = posZona(zona, lugarPaso ?? lugarDe(bp));
          for (const k of auto) if (sitio[k]) objetivo[k] = sitio[k];
          if (driver) {
            // Los dos defensores más cercanos cierran el hueco por el que entra el bote
            const fin = at[driver];
            [...auto].sort((a, b) => dist(df[a], fin) - dist(df[b], fin)).slice(0, 2)
              .forEach((k) => { objetivo[k] = hacia(df[k], fin, 0.5); });
          }
          if (zona === "match") {
            // Match-up: el que corta lo sigue el defensor que tenía más cerca
            const usados = new Set<string>();
            for (const [q, c] of Object.entries(caminos)) {
              if (q === tiene || c.tipo !== "correr" || dist(c.pts[0], at[q]) < 2.5) continue;
              const k = [...auto].filter((x) => !usados.has(x)).sort((a, b) => dist(df[a], c.pts[0]) - dist(df[b], c.pts[0]))[0];
              if (k) { usados.add(k); objetivo[k] = entre(at[q], aro, 0.9); }
            }
          }
        } else if (libre) {
          // Zona sencilla (2-1, 1-2, 2-2…): el más cercano sale al balón y los demás basculan hacia él
          const alBalon = [...auto].sort((a, b) => dist(df0[a], bp) - dist(df0[b], bp))[0];
          for (const k of auto) objetivo[k] = k === alBalon ? entre(bp, aro, 1.1) : hacia(df0[k], bp, 0.22);
          if (driver) {
            const fin = at[driver];
            [...auto].sort((a, b) => dist(df[a], fin) - dist(df[b], fin)).slice(0, 2)
              .forEach((k) => { objetivo[k] = hacia(df[k], fin, 0.5); });
          }
        } else {
          for (const k of auto) objetivo[k] = k === tiene ? entre(at[k], aro) : sinBalon(at[k], bp, aro);
          // Penetración: el defensor del que bota se queda detrás y llega la ayuda del más cercano
          if (driver && (dist(at[driver], aro) < 5 || quienAyuda)) {
            const ini = caminos[driver].pts[0], fin = at[driver];
            if (auto.includes(driver)) objetivo[driver] = mas(fin, uni(fin, ini), 0.9);
            // si la ayuda está escrita a mano (dm), no se añade otra
            const ayuda = quienAyuda ? (auto.includes(quienAyuda) ? quienAyuda : null)
              : auto.filter((k) => k !== driver).sort((a, b) => dist(df[a], fin) - dist(df[b], fin))[0];
            if (ayuda) objetivo[ayuda] = mas(fin, uni(fin, aro), 0.9);
          }
          // Bloqueos: el defensor del que pasa rozando el bloqueo se queda atrapado detrás
          for (const b of bloqueos) for (const [q, c] of Object.entries(caminos)) {
            if (q === b.k || c.tipo === "bloqueo" || !auto.includes(q)) continue;
            const roza = c.pts.slice(1).some((_, i) => aSegmento(b.p, c.pts[i], c.pts[i + 1]) < 1.4);
            if (roza) objetivo[q] = mas(b.p, uni(b.p, antes[q]), 0.8);
          }
          // Mano a mano: el defensor del receptor choca con el que entrega
          if (base.mano) {
            const [g, rcp] = base.mano;
            if (auto.includes(rcp) && at[g]) objetivo[rcp] = mas(at[g], uni(at[g], antes[rcp]), 0.9);
          }
        }
      }
    }
    const movs: NonNullable<Paso["m"]> = [...(base.m ?? [])];
    for (const [k, q] of Object.entries(objetivo)) {
      if (dist(df[k], q) < umbral) continue;
      movs.push([`d${k}`, "correr", q]);
      df[k] = q;
    }
    for (const [k, ...pts] of dm ?? []) {
      if (!pts.length) continue;
      movs.push([`d${k}`, "correr", ...pts]);
      df[k] = pts[pts.length - 1];
    }
    return { ...base, ...(movs.length ? { m: movs } : {}) };
  });
  return { ...resto, ...(Object.keys(df0).length ? { df: df0 } : {}), pasos: salida };
}

/** Recalcula la defensa inicial (la de arriba ya se ha ido moviendo) */
function dfInicial(m: MontajeJ, zona: Zona | null, aro: P): Record<string, P> {
  const at = m.at ?? {};
  const tiene = m.balon ?? null;
  const bp: P = tiene && at[tiene] ? at[tiene] : tiene === "e" && m.entrenador ? m.entrenador : [20, 7.5];
  const df: Record<string, P> = { ...(m.df ?? {}) };
  if (zona) {
    const z0 = posZona(zona, lugarDe(bp));
    for (const k of Object.keys(z0)) if (!df[k]) df[k] = z0[k];
  } else {
    for (const [k, p] of Object.entries(at)) if (!df[k]) df[k] = k === tiene ? entre(p, aro) : sinBalon(p, bp, aro);
  }
  return df;
}
