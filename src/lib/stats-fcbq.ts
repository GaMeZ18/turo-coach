// Estadísticas de partido de la FCBQ (JSON de su servicio de estadísticas) → formato compacto de Turó Coach.
// La FCBQ da: puntos, canastas de 2 y de 3 anotadas, tiros libres anotados/intentados, faltas,
// minutos, +/- en pista y, por periodo, quién ha jugado.

import { aISO } from "./fechas";

export interface JugadorStats {
  dorsal: string;
  nombre: string;
  uuid: string | null;
  titular: boolean;
  seg: number;
  pts: number;
  t2: number;
  t3: number;
  tlm: number;
  tla: number;
  fc: number;
  mm: number;          // +/- con el jugador en pista
  periodos: number[];  // periodos en los que ha jugado
  tramos?: number[][];          // en pista: [inicio, fin, +/- en ese tramo] (segundos de partido)
}
export interface EquipoStats {
  nombre: string;
  pts: number;
  porPeriodo: number[];
  t2: number;
  t3: number;
  tlm: number;
  tla: number;
  fc: number;
  jugadores: JugadorStats[];
}
export interface StatsPartido {
  id: string;
  fecha: string | null;
  jornada: number | null;
  numPeriodos: number;
  local: EquipoStats;
  visitante: EquipoStats;
  v?: number;                       // 3 = con tramos en pista y marcador a lo largo del partido
  marcador?: [number, number, number][]; // [segundo de partido, puntos local, puntos visitante] en cada cambio
}

/** Versión de los datos guardados: si es menor, se vuelven a descargar */
export const VERSION_STATS = 4;

type Acum = { pts?: number; t2m?: number; t3m?: number; ftm?: number; fta?: number; fc?: number };
type JugFCBQ = { dorsal?: string; name?: string; uuid?: string; starting?: boolean; accumulated?: Acum; computed?: { seconds?: number; onCourtPlusMinus?: number } };
type EqFCBQ = { name?: string; accumulated?: Acum; players?: JugFCBQ[] };
type Stint = { startSeconds?: number; endSeconds?: number; computed?: { onCourtPlusMinus?: number } };
type FCBQ = {
  stints?: { local?: { uuid?: string; actorName?: string; dorsal?: string; stints?: Stint[] }[]; visitor?: { uuid?: string; actorName?: string; dorsal?: string; stints?: Stint[] }[] };
  pbp?: { c?: string; p?: number; m?: number; s?: number; l?: number | null; v?: number | null }[];
  header?: { date?: string; matchDayNum?: number; localTeam?: { name?: string }; visitorTeam?: { name?: string }; score?: { local?: number; visitor?: number }; periods?: { period: number; local: number; visitor: number }[] };
  boxscore?: { period: number; local?: EqFCBQ; visitor?: EqFCBQ }[];
};

const n = (x: unknown) => (typeof x === "number" && isFinite(x) ? x : Number(x) || 0);

export function compactarStats(id: string, j: unknown): StatsPartido | null {
  const d = j as FCBQ;
  const total = d?.boxscore?.find((b) => b.period === 0);
  if (!d?.header || !total) return null;
  const periodos = (d.boxscore ?? []).filter((b) => b.period > 0).sort((a, b) => a.period - b.period);

  const equipo = (lado: "local" | "visitor"): EquipoStats => {
    const eq = total[lado] ?? {};
    const a = eq.accumulated ?? {};
    const jugadores = (eq.players ?? []).map((p): JugadorStats => {
      const pa = p.accumulated ?? {};
      // Ha jugado un periodo si ha estado en pista algún segundo (o ha hecho algo) en él
      const jugados = periodos
        .filter((b) => {
          const q = b[lado]?.players?.find((x) => (p.uuid && x.uuid === p.uuid) || (x.name === p.name && x.dorsal === p.dorsal));
          return q && (n(q.computed?.seconds) > 0 || n(q.accumulated?.pts) > 0 || n(q.accumulated?.fc) > 0);
        })
        .map((b) => b.period);
      return {
        dorsal: String(p.dorsal ?? ""), nombre: String(p.name ?? "").trim(), uuid: p.uuid ?? null, titular: !!p.starting,
        seg: n(p.computed?.seconds), pts: n(pa.pts), t2: n(pa.t2m), t3: n(pa.t3m), tlm: n(pa.ftm), tla: n(pa.fta), fc: n(pa.fc),
        mm: n(p.computed?.onCourtPlusMinus), periodos: jugados,
        tramos: (d.stints?.[lado] ?? [])
          .find((x) => (p.uuid && x.uuid === p.uuid) || (x.actorName === p.name && String(x.dorsal) === String(p.dorsal)))
          ?.stints?.map((t) => [n(t.startSeconds), n(t.endSeconds), n(t.computed?.onCourtPlusMinus)]).filter(([a, b]) => b > a),
      };
    });
    const nombre = String((lado === "local" ? d.header?.localTeam?.name : d.header?.visitorTeam?.name) ?? eq.name ?? "").trim();
    return {
      nombre,
      pts: n(a.pts ?? (lado === "local" ? d.header?.score?.local : d.header?.score?.visitor)),
      porPeriodo: (d.header?.periods ?? []).sort((x, y) => x.period - y.period).map((p) => n(lado === "local" ? p.local : p.visitor)),
      t2: n(a.t2m), t3: n(a.t3m), tlm: n(a.ftm), tla: n(a.fta), fc: n(a.fc),
      jugadores,
    };
  };

  return {
    id,
    // La FCBQ marca la hora como UTC, pero es la hora local del partido
    fecha: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d.header.date ?? "") ? aISO(d.header.date!.slice(0, 10), d.header.date!.slice(11, 16)) : null,
    jornada: d.header.matchDayNum ?? null,
    numPeriodos: Math.max(periodos.length, d.header.periods?.length ?? 0),
    local: equipo("local"),
    visitante: equipo("visitor"),
    ...(() => {
      const m = d.pbp?.length ? lineaMarcador(d.pbp) : [];
      // Con marcador (jugada a jugada) o, si no lo hay, con los tramos en pista y su +/- (sinergias estimadas)
      const conTramos = (d.stints?.local?.length ?? 0) > 0;
      return m.length > 1 ? { v: VERSION_STATS, marcador: m } : { v: conTramos ? VERSION_STATS : 1 };
    })(),
  };
}

/** Marcador a lo largo del partido a partir de la jugada a jugada (reloj descendente por periodo) */
function lineaMarcador(pbp: NonNullable<FCBQ["pbp"]>): [number, number, number][] {
  // Duración de cada periodo: la del reloj al empezarlo (10:00, 5:00 en prórrogas…)
  const dur: Record<number, number> = {};
  for (const e of pbp) if (e.c === "INIPER" && e.p) dur[e.p] = n(e.m) * 60 + n(e.s);
  const inicio = (p: number) => { let t = 0; for (let i = 1; i < p; i++) t += dur[i] ?? (i > 4 ? 300 : 600); return t; };
  const res: [number, number, number][] = [[0, 0, 0]];
  for (const e of pbp) {
    if (!e.p || e.l === undefined || e.l === null || e.v === undefined || e.v === null) continue;
    const t = inicio(e.p) + (dur[e.p] ?? (e.p > 4 ? 300 : 600)) - (n(e.m) * 60 + n(e.s));
    const [, l, v] = res[res.length - 1];
    if (e.l !== l || e.v !== v) res.push([t, n(e.l), n(e.v)]);
  }
  return res;
}

// ---------- Sinergias: quintetos, parejas y on/off ----------

export interface Unidad { jugadores: string[]; seg: number; pf: number; pc: number }
export interface OnOff { nombre: string; dorsal: string; segOn: number; pfOn: number; pcOn: number; segOff: number; pfOff: number; pcOff: number }

/** Para un equipo: minutos y puntos a favor y en contra de cada quinteto, cada pareja y cada jugador en pista / en el banquillo */
export function sinergias(nombre: string, partidos: StatsPartido[]) {
  const quintetos = new Map<string, Unidad>(), parejas = new Map<string, Unidad>(), onoff = new Map<string, OnOff>();
  let conDatos = 0, estimado = false;
  for (const s of partidos) {
    const lado = mismoEquipo(s.local.nombre, nombre) ? "local" : mismoEquipo(s.visitante.nombre, nombre) ? "visitante" : null;
    if (!lado) continue;
    const otro = lado === "local" ? "visitante" : "local";
    const jug = s[lado].jugadores.filter((j) => j.tramos?.length);
    if (!jug.length) continue;
    const exacto = (s.marcador?.length ?? 0) > 1;
    const conMas = jug.some((j) => j.tramos!.some((t) => t.length > 2));
    if (!exacto && !conMas) continue;
    conDatos++;
    if (!exacto) estimado = true;

    const fin = Math.max(...s.local.jugadores.concat(s.visitante.jugadores).flatMap((j) => (j.tramos ?? []).map((t) => t[1])));
    const nP = Math.max(1, s.numPeriodos || s.local.porPeriodo.length || 4);
    const limites = Array.from({ length: nP + 1 }, (_, i) => Math.round((fin * i) / nP));
    const cortes = [...new Set([...limites, ...s.local.jugadores.concat(s.visitante.jugadores).flatMap((j) => (j.tramos ?? []).flatMap((t) => [t[0], t[1]]))])].sort((a, b) => a - b);
    const tramosSeg = cortes.slice(0, -1).map((t0, i) => [t0, cortes[i + 1]] as const);

    // Diferencia de marcador (a nuestro favor) en cada tramo: exacta con la jugada a jugada o estimada
    let difs: { pf: number; pc: number }[];
    if (exacto) {
      const linea = s.marcador!;
      const marcadorEn = (t: number) => { let r = linea[0]; for (const x of linea) { if (x[0] <= t) r = x; else break; } return r; };
      const nuestros = (x: [number, number, number]) => (lado === "local" ? [x[1], x[2]] : [x[2], x[1]]);
      difs = tramosSeg.map(([t0, t1]) => { const [f0, c0] = nuestros(marcadorEn(t0)), [f1, c1] = nuestros(marcadorEn(t1)); return { pf: f1 - f0, pc: c1 - c0 }; });
    } else {
      difs = estimarDiferencias(s, lado, otro, tramosSeg, limites).map((d) => ({ pf: d, pc: 0 }));
    }

    const enPista = (j: JugadorStats, t0: number, t1: number) => j.tramos!.some((t) => t[0] <= t0 && t[1] >= t1);
    tramosSeg.forEach(([t0, t1], i) => {
      const pista = jug.filter((j) => enPista(j, t0, t1));
      if (!pista.length) return;
      const seg = t1 - t0, { pf, pc } = difs[i];
      const nombres = pista.map((j) => j.nombre).sort();
      const sumar = (m: Map<string, Unidad>, js: string[]) => {
        const k = js.join("|");
        const u = m.get(k) ?? { jugadores: js, seg: 0, pf: 0, pc: 0 };
        u.seg += seg; u.pf += pf; u.pc += pc; m.set(k, u);
      };
      if (nombres.length === 5) sumar(quintetos, nombres);
      for (let a = 0; a < nombres.length; a++) for (let b = a + 1; b < nombres.length; b++) sumar(parejas, [nombres[a], nombres[b]]);
    });

    // On/off: con el +/- y los minutos oficiales de cada jugador (exacto aunque no haya jugada a jugada)
    const difTotal = s[lado].pts - s[otro].pts;
    for (const j of jug) {
      const segOn = j.tramos!.reduce((t, x) => t + (x[1] - x[0]), 0);
      const o = onoff.get(j.nombre) ?? { nombre: j.nombre, dorsal: j.dorsal, segOn: 0, pfOn: 0, pcOn: 0, segOff: 0, pfOff: 0, pcOff: 0 };
      o.segOn += segOn; o.pfOn += j.mm;
      o.segOff += Math.max(0, fin - segOn); o.pfOff += difTotal - j.mm;
      onoff.set(j.nombre, o);
    }
  }
  const orden = (m: Map<string, Unidad>) => [...m.values()].sort((a, b) => b.seg - a.seg);
  return { quintetos: orden(quintetos), parejas: orden(parejas), onoff: [...onoff.values()].sort((a, b) => b.segOn - a.segOn), partidos: conDatos, estimado };
}

/** Sin jugada a jugada: estima la diferencia de marcador de cada tramo con mínimos cuadrados,
 *  a partir del +/- oficial de cada tramo en pista de los jugadores de los dos equipos y del parcial de cada periodo. */
function estimarDiferencias(s: StatsPartido, lado: "local" | "visitante", otro: "local" | "visitante", seg: readonly (readonly [number, number])[], limites: number[]) {
  const n = seg.length;
  const filas: { c: number[]; b: number; w: number }[] = [];
  const dentro = (a: number, b: number) => seg.map(([t0, t1]) => (t0 >= a && t1 <= b ? 1 : 0));
  for (const j of s[lado].jugadores) for (const t of j.tramos ?? []) if (t.length > 2) filas.push({ c: dentro(t[0], t[1]), b: t[2], w: 1 });
  for (const j of s[otro].jugadores) for (const t of j.tramos ?? []) if (t.length > 2) filas.push({ c: dentro(t[0], t[1]), b: -t[2], w: 1 });
  const pf = s[lado].porPeriodo, pc = s[otro].porPeriodo;
  for (let i = 0; i + 1 < limites.length && i < pf.length; i++) filas.push({ c: dentro(limites[i], limites[i + 1]), b: pf[i] - (pc[i] ?? 0), w: 3 });
  filas.push({ c: seg.map(() => 1), b: s[lado].pts - s[otro].pts, w: 4 });
  // (AᵀWA + λI) x = AᵀWb
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (const f of filas) for (let a = 0; a < n; a++) {
    if (!f.c[a]) continue;
    for (let b = 0; b < n; b++) if (f.c[b]) M[a][b] += f.w;
    M[a][n] += f.w * f.b;
  }
  for (let a = 0; a < n; a++) M[a][a] += 0.05;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-9;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const k = M[r][col] / d;
      if (k) for (let c = col; c <= n; c++) M[r][c] -= k * M[col][c];
    }
  }
  return M.map((fila, i) => fila[n] / (M[i][i] || 1e-9));
}

/** +/- cada 10 minutos */
export const por10 = (pf: number, pc: number, seg: number) => (seg >= 60 ? ((pf - pc) * 600) / seg : null);

/** Máxima ventaja y mayor parcial a favor de un equipo en un partido */
export function rachas(s: StatsPartido, lado: "local" | "visitante") {
  const linea = s.marcador ?? [];
  let maxVentaja = 0, maxParcial = 0, parcial = 0, ultimoQuien: "f" | "c" | null = null;
  let [pf0, pc0] = [0, 0];
  for (const x of linea) {
    const [f, c] = lado === "local" ? [x[1], x[2]] : [x[2], x[1]];
    maxVentaja = Math.max(maxVentaja, f - c);
    if (f > pf0) { parcial = ultimoQuien === "f" ? parcial + (f - pf0) : f - pf0; ultimoQuien = "f"; maxParcial = Math.max(maxParcial, parcial); }
    if (c > pc0) { ultimoQuien = "c"; parcial = 0; }
    pf0 = f; pc0 = c;
  }
  return { maxVentaja, maxParcial };
}

// ---------- Agregados para el scouting ----------

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
export const mismoEquipo = (a: string, b: string) => norm(a) === norm(b);

export interface ResumenEquipo {
  nombre: string;
  pj: number; g: number; p: number;
  pf: number; pc: number;
  t2: number; t3: number; tlm: number; tla: number; fc: number;
  porPeriodoF: number[]; porPeriodoC: number[];
}
export interface ResumenJugador {
  nombre: string; dorsal: string; uuid: string | null;
  pj: number; titular: number; seg: number;
  pts: number; t2: number; t3: number; tlm: number; tla: number; fc: number; mm: number;
  maxPts: number;
}

/** Medias de un equipo a partir de los partidos con estadísticas */
export function resumenEquipo(nombre: string, partidos: StatsPartido[]) {
  const r: ResumenEquipo = { nombre, pj: 0, g: 0, p: 0, pf: 0, pc: 0, t2: 0, t3: 0, tlm: 0, tla: 0, fc: 0, porPeriodoF: [], porPeriodoC: [] };
  const jug = new Map<string, ResumenJugador>();
  const suyos: StatsPartido[] = [];
  for (const s of partidos) {
    const lado = mismoEquipo(s.local.nombre, nombre) ? "local" : mismoEquipo(s.visitante.nombre, nombre) ? "visitante" : null;
    if (!lado) continue;
    suyos.push(s);
    const yo = s[lado], el = s[lado === "local" ? "visitante" : "local"];
    r.pj++; r.pf += yo.pts; r.pc += el.pts;
    if (yo.pts > el.pts) r.g++; else if (yo.pts < el.pts) r.p++;
    r.t2 += yo.t2; r.t3 += yo.t3; r.tlm += yo.tlm; r.tla += yo.tla; r.fc += yo.fc;
    yo.porPeriodo.forEach((v, i) => (r.porPeriodoF[i] = (r.porPeriodoF[i] ?? 0) + v));
    el.porPeriodo.forEach((v, i) => (r.porPeriodoC[i] = (r.porPeriodoC[i] ?? 0) + v));
    for (const j of yo.jugadores) {
      const k = j.uuid ?? norm(j.nombre);
      const a = jug.get(k) ?? { nombre: j.nombre, dorsal: j.dorsal, uuid: j.uuid, pj: 0, titular: 0, seg: 0, pts: 0, t2: 0, t3: 0, tlm: 0, tla: 0, fc: 0, mm: 0, maxPts: 0 };
      if (j.seg > 0 || j.pts > 0 || j.periodos.length) a.pj++;
      if (j.titular) a.titular++;
      a.seg += j.seg; a.pts += j.pts; a.t2 += j.t2; a.t3 += j.t3; a.tlm += j.tlm; a.tla += j.tla; a.fc += j.fc; a.mm += j.mm;
      a.maxPts = Math.max(a.maxPts, j.pts);
      a.dorsal = j.dorsal || a.dorsal;
      jug.set(k, a);
    }
  }
  const jugadores = [...jug.values()].filter((j) => j.pj > 0).sort((a, b) => b.pts / b.pj - a.pts / a.pj);
  return { equipo: r, jugadores, partidos: suyos.sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? "")) };
}

export const media = (x: number, pj: number, dec = 1) => (pj ? (x / pj).toFixed(dec) : "–");
export const pct = (m: number, a: number) => (a ? `${Math.round((100 * m) / a)}%` : "–");
export const minutos = (seg: number, pj: number) => {
  if (!pj) return "–";
  const s = Math.round(seg / pj);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
