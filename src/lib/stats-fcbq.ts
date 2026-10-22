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
}

type Acum = { pts?: number; t2m?: number; t3m?: number; ftm?: number; fta?: number; fc?: number };
type JugFCBQ = { dorsal?: string; name?: string; uuid?: string; starting?: boolean; accumulated?: Acum; computed?: { seconds?: number; onCourtPlusMinus?: number } };
type EqFCBQ = { name?: string; accumulated?: Acum; players?: JugFCBQ[] };
type FCBQ = {
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
  };
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
