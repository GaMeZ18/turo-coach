// Fantasy Turó: todo el cálculo (sin base de datos). Se recalcula siempre a partir de las estadísticas de la FCBQ,
// así los puntos aparecen solos en cuanto entran las estadísticas de cada partido.
import { lunesDe, sumarDias } from "@/lib/pistas";
import { aISO, diaInput } from "@/lib/fechas";

export const PRESUPUESTO = 50;
export const PRECIO_MIN = 4;
export const PRECIO_MAX = 15;
export const PRECIO_SIN_DATOS = 6;
export const MAX_POR_EQUIPO = 2;

export type Comodin = "capitan3" | "banquillo" | "presupuesto";
export const COMODINES: Record<Comodin, { nombre: string; texto: string }> = {
  capitan3: { nombre: "Capitán ×3", texto: "Tu capitán puntúa el triple esta jornada." },
  banquillo: { nombre: "El suplente también puntúa", texto: "Tu suplente suma sus puntos aunque jueguen los 5 titulares." },
  presupuesto: { nombre: "+10 ⭐", texto: "Esta jornada tienes 60 ⭐ en vez de 50." },
};

// ---------- Datos de entrada ----------
type JugStats = { dorsal: string; nombre: string; uuid: string | null; titular: boolean; seg: number; pts: number; t2: number; t3: number; tlm: number; tla: number; fc: number; mm: number };
type EqStats = { nombre: string; pts: number; jugadores: JugStats[] };
export type FilaStats = { equipo_id: string; stats_id: string; fecha: string | null; datos: { local: EqStats; visitante: EqStats; fecha?: string | null } };
export type PartidoCal = { id: string; equipo_id: string; fecha: string; fcbq_stats_id: string | null };
export type Equipo = { id: string; nombre: string };

export type JugadorF = { id: string; persona: string; nombre: string; dorsal: string; equipoId: string; equipo: string; chica: boolean };
export type Actuacion = {
  jugador: string; partido: string; partidoId: string | null; fecha: string; lunes: string; jugo: boolean; base: number; puntos: number; especial: boolean;
  s: { pts: number; t3: number; tlm: number; tla: number; min: number; fc: number; mm: number; titular: boolean; gana: boolean; marcador: string };
};

const esTuro = (n: string) => /TUR[OÓ]/i.test(n ?? "");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const titulo = (s: string) => /^([A-Z]\.)+$/.test(s.replace(/\s/g, "")) ? s : s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m) => m.toUpperCase());
const r4 = (x: number) => Math.round(x * 4) / 4;
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lunesDeFecha = (iso: string) => lunesDe(diaInput(iso));

/** Puntos fantasy de una actuación (fórmula acordada) */
export function puntosDe(j: JugStats, nos: number, ellos: number) {
  const fallados = Math.max(0, j.tla - j.tlm);
  let p = j.pts * 0.5 + j.t3 * 0.5 + j.tlm * 0.25 - fallados * 0.5
    + Math.floor(j.seg / 300) + (j.titular ? 1 : 0)
    + clamp(j.mm / 4, -6, 6) + (nos > ellos ? 1 : 0)
    - 0.5 * Math.max(0, j.fc - 2) - (j.fc >= 5 ? 2 : 0);
  p = Math.max(-5, p);
  return r4(p);
}

/** Jugadores y actuaciones a partir de las estadísticas guardadas */
export function construir(filas: FilaStats[], equipos: Equipo[], partidos: PartidoCal[], especiales: Record<string, string[]>) {
  const nombreEq = new Map(equipos.map((e) => [e.id, e.nombre]));
  const partidoDeStats = new Map(partidos.filter((p) => p.fcbq_stats_id).map((p) => [`${p.equipo_id}|${p.fcbq_stats_id}`, p.id]));
  const jugadores = new Map<string, JugadorF>();
  const actuaciones: Actuacion[] = [];
  const vistos = new Set<string>();
  // Lado del Turó en cada partido (si los dos lo son, el que más se parece a ese equipo en otros partidos)
  const personasEq = new Map<string, Set<string>>();
  const persona = (j: JugStats) => (j.uuid ? `u:${j.uuid}` : `n:${norm(j.nombre)}`);
  const lados = filas.map((f) => {
    const l = esTuro(f.datos.local?.nombre), v = esTuro(f.datos.visitante?.nombre);
    return { f, lados: l && v ? (["local", "visitante"] as const) : l ? (["local"] as const) : v ? (["visitante"] as const) : ([] as const) };
  });
  for (const { f, lados: ls } of lados) if (ls.length === 1) {
    const set = personasEq.get(f.equipo_id) ?? new Set();
    f.datos[ls[0]].jugadores.forEach((j) => set.add(persona(j)));
    personasEq.set(f.equipo_id, set);
  }
  for (const { f, lados: ls } of lados) {
    if (!ls.length || !nombreEq.has(f.equipo_id)) continue;
    const clave = `${f.equipo_id}|${f.stats_id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    let lado: "local" | "visitante" = ls[0];
    if (ls.length === 2) {
      const set = personasEq.get(f.equipo_id) ?? new Set();
      const c = (x: "local" | "visitante") => f.datos[x].jugadores.filter((j) => set.has(persona(j))).length;
      lado = c("visitante") > c("local") ? "visitante" : "local";
    }
    const yo = f.datos[lado], otro = f.datos[lado === "local" ? "visitante" : "local"];
    const fecha = f.fecha ?? f.datos.fecha;
    if (!fecha) continue;
    const lunes = lunesDeFecha(fecha);
    const partidoId = partidoDeStats.get(clave) ?? null;
    const especial = !!partidoId && (especiales[lunes] ?? []).includes(partidoId);
    const equipo = nombreEq.get(f.equipo_id)!;
    for (const j of yo.jugadores ?? []) {
      const pers = persona(j);
      const id = `${f.equipo_id}:${pers}`;
      if (!jugadores.has(id)) jugadores.set(id, { id, persona: pers, nombre: titulo(j.nombre), dorsal: j.dorsal, equipoId: f.equipo_id, equipo, chica: /FEM|FEMEN/i.test(equipo) });
      const base = puntosDe(j, yo.pts, otro.pts);
      actuaciones.push({
        jugador: id, partido: f.stats_id, partidoId, fecha, lunes, jugo: j.seg > 0, base: j.seg > 0 ? base : 0, puntos: j.seg > 0 ? r4(base * (especial ? 1.5 : 1)) : 0, especial,
        s: { pts: j.pts, t3: j.t3, tlm: j.tlm, tla: j.tla, min: Math.round(j.seg / 60), fc: j.fc, mm: j.mm, titular: j.titular, gana: yo.pts > otro.pts, marcador: `${yo.pts}-${otro.pts}` },
      });
    }
  }
  return { jugadores, actuaciones };
}

// ---------- Jornadas ----------
/** Primer partido de la jornada (cierre de fichajes). Si no hay ninguno, el sábado a las 9:00. */
export function cierreDe(lunes: string, partidos: PartidoCal[], equiposPool: Set<string>) {
  const ini = aISO(lunes, "00:00"), fin = aISO(sumarDias(lunes, 7), "00:00");
  const fs = partidos.filter((p) => equiposPool.has(p.equipo_id) && p.fecha >= ini && p.fecha < fin).map((p) => p.fecha).sort();
  return fs[0] ?? aISO(sumarDias(lunes, 5), "09:00");
}
/** Equipos que no juegan esa jornada */
export function descansan(lunes: string, partidos: PartidoCal[], equiposPool: Set<string>) {
  const ini = aISO(lunes, "00:00"), fin = aISO(sumarDias(lunes, 7), "00:00");
  const juegan = new Set(partidos.filter((p) => p.fecha >= ini && p.fecha < fin).map((p) => p.equipo_id));
  return new Set([...equiposPool].filter((e) => !juegan.has(e)));
}
/** Lunes de todas las jornadas desde el inicio hasta `hasta` (incluido) */
export function jornadasHasta(inicio: string, hasta: string) {
  const r: string[] = [];
  for (let l = lunesDe(inicio); l <= hasta; l = sumarDias(l, 7)) r.push(l);
  return r;
}
export const nombreJornada = (inicio: string, lunes: string) => `Jornada ${Math.round((Date.parse(lunes) - Date.parse(lunesDe(inicio))) / 6048e5) + 1}`;

// ---------- Precios ----------
export function precios(lunes: string, jugadores: Map<string, JugadorF>, actuaciones: Actuacion[]) {
  const porJ = new Map<string, Actuacion[]>();
  for (const a of actuaciones) if (a.jugo && a.lunes < lunes) { const l = porJ.get(a.jugador) ?? []; l.push(a); porJ.set(a.jugador, l); }
  const r = new Map<string, { precio: number; media: number | null; pj: number }>();
  for (const id of jugadores.keys()) {
    const l = (porJ.get(id) ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4);
    if (!l.length) { r.set(id, { precio: PRECIO_SIN_DATOS, media: null, pj: 0 }); continue; }
    const media = l.reduce((s, a) => s + a.base, 0) / l.length;
    r.set(id, { precio: clamp(Math.round(3 + 0.75 * media), PRECIO_MIN, PRECIO_MAX), media: Math.round(media * 10) / 10, pj: (porJ.get(id) ?? []).length });
  }
  return r;
}

// ---------- Alineaciones y puntos ----------
export type Ficha = { id: string; precio: number };
export type Alineacion = { participante_id: string; jornada: string; titulares: Ficha[]; suplente: Ficha | null; capitan: string; comodin: Comodin | null; coste: number };

export type Resultado = {
  total: number;
  filas: { id: string; precio: number; puntos: number; jugo: boolean; capitan: boolean; extra: number; porJugar: boolean }[];
  suplente: { id: string; precio: number; puntos: number; jugo: boolean; entro: boolean; porJugar: boolean } | null;
};

/** Puntos de cada jugador en una jornada (suma de sus partidos con ese equipo) */
export function puntosSemana(lunes: string, actuaciones: Actuacion[]) {
  const m = new Map<string, { puntos: number; jugo: boolean; partidos: Actuacion[] }>();
  for (const a of actuaciones) if (a.lunes === lunes) {
    const x = m.get(a.jugador) ?? { puntos: 0, jugo: false, partidos: [] };
    x.puntos = r4(x.puntos + a.puntos); x.jugo = x.jugo || a.jugo; x.partidos.push(a);
    m.set(a.jugador, x);
  }
  return m;
}

export function puntuar(al: Alineacion, sem: Map<string, { puntos: number; jugo: boolean }>, pendientes: Set<string>, jugadores: Map<string, JugadorF>): Resultado {
  const eqDe = (id: string) => jugadores.get(id)?.equipoId ?? "";
  const filas = al.titulares.map((t) => {
    const x = sem.get(t.id);
    return { id: t.id, precio: t.precio, puntos: x?.jugo ? x.puntos : 0, jugo: !!x?.jugo, capitan: t.id === al.capitan, extra: 0, porJugar: !x?.jugo && pendientes.has(eqDe(t.id)) };
  });
  let suplente: Resultado["suplente"] = null;
  if (al.suplente) {
    const x = sem.get(al.suplente.id);
    const jugo = !!x?.jugo;
    // Entra si algún titular no ha jugado (y su equipo ya no juega más esta jornada)
    const hueco = filas.some((f) => !f.jugo && !f.porJugar);
    const entro = jugo && (al.comodin === "banquillo" || hueco);
    suplente = { id: al.suplente.id, precio: al.suplente.precio, puntos: jugo ? x!.puntos : 0, jugo, entro, porJugar: !jugo && pendientes.has(eqDe(al.suplente.id)) };
  }
  const cap = filas.find((f) => f.capitan);
  if (cap && cap.jugo) cap.extra = r4(cap.puntos * ((al.comodin === "capitan3" ? 3 : 2) - 1));
  const total = r4(filas.reduce((s, f) => s + f.puntos + f.extra, 0) + (suplente?.entro ? suplente.puntos : 0));
  return { total, filas, suplente };
}

/** Personas bloqueadas para la jornada siguiente: los titulares y el suplente si llegó a entrar */
export function bloqueadosTras(al: Alineacion | undefined, res: Resultado | undefined, jugadores: Map<string, JugadorF>) {
  const s = new Set<string>();
  if (!al) return s;
  al.titulares.forEach((t) => { const p = jugadores.get(t.id)?.persona; if (p) s.add(p); });
  if (al.suplente && res?.suplente?.entro) { const p = jugadores.get(al.suplente.id)?.persona; if (p) s.add(p); }
  return s;
}

/** Quinteto ideal: los 5 que más puntuaron (máx. 2 por equipo, sin repetir persona) */
export function quintetoIdeal(sem: Map<string, { puntos: number; jugo: boolean }>, jugadores: Map<string, JugadorF>) {
  const lista = [...sem.entries()].filter(([, x]) => x.jugo).sort((a, b) => b[1].puntos - a[1].puntos);
  const r: { id: string; puntos: number }[] = [];
  const porEq = new Map<string, number>(); const pers = new Set<string>();
  for (const [id, x] of lista) {
    const j = jugadores.get(id); if (!j || pers.has(j.persona) || (porEq.get(j.equipoId) ?? 0) >= MAX_POR_EQUIPO) continue;
    r.push({ id, puntos: x.puntos }); pers.add(j.persona); porEq.set(j.equipoId, (porEq.get(j.equipoId) ?? 0) + 1);
    if (r.length === 5) break;
  }
  return r;
}

/** Ganga de la semana: más puntos por estrella (mínimo 8 puntos) */
export function ganga(sem: Map<string, { puntos: number; jugo: boolean }>, prec: Map<string, { precio: number }>) {
  let mejor: { id: string; puntos: number; precio: number; ratio: number } | null = null;
  for (const [id, x] of sem) {
    if (!x.jugo || x.puntos < 8) continue;
    const precio = prec.get(id)?.precio ?? PRECIO_SIN_DATOS;
    const ratio = x.puntos / precio;
    if (!mejor || ratio > mejor.ratio || (ratio === mejor.ratio && x.puntos > mejor.puntos)) mejor = { id, puntos: x.puntos, precio, ratio };
  }
  return mejor;
}

// ---------- Insignias ----------
export type Nivel = "facil" | "media" | "dificil" | "legendaria";
export const INSIGNIAS: { codigo: string; nombre: string; nivel: Nivel; texto: string; img: string }[] = [
  ["debut", "Debut", "facil", "Juega tu primera jornada."],
  ["bocazas", "Bocazas", "facil", "Escribe tu primer mensaje en el chat."],
  ["hucha", "Hucha", "facil", "Ficha un equipo gastando 40 ⭐ o menos."],
  ["a-tope", "A tope", "facil", "Gasta todo tu presupuesto exacto."],
  ["mestizo", "Mestizo", "facil", "Titulares de 4 equipos distintos."],
  ["paritario", "Paritario", "facil", "Al menos 2 chicas y 2 chicos de titulares."],
  ["doble-vida", "Doble vida", "facil", "Ficha a alguien que juega en dos equipos."],
  ["constante", "Constante", "facil", "Juega 3 jornadas seguidas."],
  ["medio-centenar", "Medio centenar", "facil", "Haz 50 puntos en una jornada."],
  ["cazador", "Cazador", "facil", "Un fichaje de 4 ⭐ que haga 8 puntos o más."],
  ["ojo-de-halcon", "Ojo de halcón", "media", "Ficha a la ganga de la semana."],
  ["brazalete", "Brazalete", "media", "Tu capitán es tu mejor jugador 3 veces."],
  ["pleno", "Pleno", "media", "Tus 5 titulares hacen 10 puntos o más."],
  ["banquillo-de-oro", "Banquillo de oro", "media", "Tu suplente entra y es tu mejor jugador."],
  ["podio", "Podio", "media", "Termina una jornada en el top 3."],
  ["remontada", "Remontada", "media", "Sube 5 puestos en la general en una jornada."],
  ["centenario", "Centenario", "media", "Haz 100 puntos en una jornada."],
  ["visionario", "Visionario", "media", "Ficha a la revelación del mes antes de que suba de precio."],
  ["constante-pro", "Constante pro", "media", "Juega 10 jornadas seguidas."],
  ["turo-de-cap-a-peus", "Turó de cap a peus", "media", "Ficha a jugadores de todos los equipos durante la temporada."],
  ["mvp", "MVP", "dificil", "Gana una jornada."],
  ["low-cost", "Low cost", "dificil", "Gana una jornada gastando 40 ⭐ o menos."],
  ["racha", "Racha", "dificil", "3 jornadas seguidas en el top 3."],
  ["rey-del-derbi", "Rey del derbi", "dificil", "Gana una jornada especial."],
  ["comodin-maestro", "Comodín maestro", "dificil", "Usa «Capitán ×3» y que tu capitán sume 25 o más."],
  ["150", "150", "dificil", "Haz 150 puntos en una jornada."],
  ["sin-ceros", "Sin ceros", "dificil", "10 jornadas en las que ningún titular se queda a 0 o menos."],
  ["quinteto-perfecto", "Quinteto perfecto", "legendaria", "Clava el quinteto ideal de la jornada (5 de 5)."],
  ["campeon-del-turo", "Campeón del Turó", "legendaria", "Gana la liga."],
  ["incondicional", "Incondicional", "legendaria", "Juega todas las jornadas de la temporada."],
].map(([codigo, nombre, nivel, texto], i) => ({ codigo, nombre, nivel: nivel as Nivel, texto, img: `/insignias/${String(i + 1).padStart(2, "0")}-${codigo}.png` }));

// ---------- Liga completa ----------
export type Entrada = {
  inicio: string; hoy: string; ahora: string;
  equipos: Equipo[]; filas: FilaStats[]; partidos: PartidoCal[];
  especiales: Record<string, string[]>; anuladas: string[];
  alineaciones: Alineacion[]; participantes: { id: string; alias: string }[];
  mensajes: Record<string, number>; cerrada: boolean; campeon: string | null;
};

export function calcularLiga(e: Entrada) {
  const { jugadores, actuaciones } = construir(e.filas, e.equipos, e.partidos, e.especiales);
  const pool = new Set([...jugadores.values()].map((j) => j.equipoId));
  const lunesHoy = lunesDe(e.hoy);
  const cierreHoy = cierreDe(lunesHoy, e.partidos, pool);
  // Jornada en la que se ficha: la de esta semana hasta el primer partido; después, la siguiente
  const abierta = e.ahora < cierreHoy ? lunesHoy : sumarDias(lunesHoy, 7);
  const enJuego = e.ahora >= cierreHoy ? lunesHoy : null;
  const todas = jornadasHasta(e.inicio, lunesHoy).filter((l) => l >= lunesDe(e.inicio));
  const cerradas = todas.filter((l) => l < lunesHoy || (l === lunesHoy && enJuego)); // con alineaciones ya fijas
  const terminadas = todas.filter((l) => l < lunesHoy);

  const preciosDe = new Map<string, ReturnType<typeof precios>>();
  const precio = (l: string) => { if (!preciosDe.has(l)) preciosDe.set(l, precios(l, jugadores, actuaciones)); return preciosDe.get(l)!; };
  const semanas = new Map<string, ReturnType<typeof puntosSemana>>();
  const semana = (l: string) => { if (!semanas.has(l)) semanas.set(l, puntosSemana(l, actuaciones)); return semanas.get(l)!; };
  // Equipos que aún tienen partido sin estadísticas esa jornada
  const pendientes = (l: string) => {
    const ini = aISO(l, "00:00"), fin = aISO(sumarDias(l, 7), "00:00");
    const con = new Set(actuaciones.filter((a) => a.lunes === l).map((a) => `${jugadores.get(a.jugador)?.equipoId}|${a.partido}`));
    return new Set(e.partidos.filter((p) => p.fecha >= ini && p.fecha < fin && (!p.fcbq_stats_id || !con.has(`${p.equipo_id}|${p.fcbq_stats_id}`)) && pool.has(p.equipo_id)).map((p) => p.equipo_id));
  };

  const alDe = new Map(e.alineaciones.map((a) => [`${a.participante_id}|${a.jornada}`, a]));
  const resultados = new Map<string, Resultado>(); // participante|lunes
  const porJornada = new Map<string, { id: string; total: number; pos: number }[]>();
  for (const l of cerradas) {
    const sem = semana(l), pend = pendientes(l);
    const lista: { id: string; total: number; pos: number }[] = [];
    for (const p of e.participantes) {
      const al = alDe.get(`${p.id}|${l}`);
      if (!al) continue;
      const res = puntuar(al, sem, pend, jugadores);
      resultados.set(`${p.id}|${l}`, res);
      if (!e.anuladas.includes(l)) lista.push({ id: p.id, total: res.total, pos: 0 });
    }
    lista.sort((a, b) => b.total - a.total);
    lista.forEach((x, i) => { x.pos = i > 0 && lista[i - 1].total === x.total ? lista[i - 1].pos : i + 1; });
    porJornada.set(l, lista);
  }
  // Clasificación general (después de cada jornada, para la remontada)
  const acumulado = new Map<string, number>();
  const posGeneral = new Map<string, Map<string, number>>();
  for (const l of cerradas) {
    for (const x of porJornada.get(l) ?? []) acumulado.set(x.id, r4((acumulado.get(x.id) ?? 0) + x.total));
    const orden = e.participantes.map((p) => ({ id: p.id, t: acumulado.get(p.id) ?? 0 })).sort((a, b) => b.t - a.t);
    const m = new Map<string, number>();
    orden.forEach((x, i) => m.set(x.id, i > 0 && orden[i - 1].t === x.t ? m.get(orden[i - 1].id)! : i + 1));
    posGeneral.set(l, m);
  }
  const general = e.participantes.map((p) => ({ id: p.id, alias: p.alias, total: acumulado.get(p.id) ?? 0, jornadas: cerradas.filter((l) => alDe.has(`${p.id}|${l}`)).length }))
    .sort((a, b) => b.total - a.total || a.alias.localeCompare(b.alias));

  const bloqueados = (pid: string, l: string) => {
    const prev = sumarDias(l, -7);
    return bloqueadosTras(alDe.get(`${pid}|${prev}`), resultados.get(`${pid}|${prev}`) ?? (alDe.get(`${pid}|${prev}`) ? puntuar(alDe.get(`${pid}|${prev}`)!, semana(prev), pendientes(prev), jugadores) : undefined), jugadores);
  };

  // Revelación del mes: el que más sube de precio desde la primera jornada del mes
  const revelacion = (l: string) => {
    const mes = l.slice(0, 7);
    const primera = todas.find((x) => x.slice(0, 7) === mes) ?? l;
    const a = precio(primera), b = precio(sumarDias(l, 7));
    let mejor: { id: string; antes: number; ahora: number } | null = null;
    for (const [id, x] of b) { const d = x.precio - (a.get(id)?.precio ?? PRECIO_SIN_DATOS); if (d > 0 && (!mejor || d > mejor.ahora - mejor.antes)) mejor = { id, antes: a.get(id)?.precio ?? PRECIO_SIN_DATOS, ahora: x.precio }; }
    return mejor;
  };

  // Insignias de cada participante (solo con jornadas terminadas, salvo el chat)
  const insignias = (pid: string) => {
    const g = new Map<string, string>(); // codigo -> lunes
    const dar = (c: string, l: string) => { if (!g.has(c)) g.set(c, l); };
    if ((e.mensajes[pid] ?? 0) > 0) dar("bocazas", "");
    let seguidas = 0, top3 = 0, brazalete = 0, sinCeros = 0;
    const equiposFichados = new Set<string>();
    const prevPos = { v: null as number | null };
    for (const l of terminadas) {
      const al = alDe.get(`${pid}|${l}`);
      const res = resultados.get(`${pid}|${l}`);
      const anulada = e.anuladas.includes(l);
      const posG = posGeneral.get(l)?.get(pid) ?? null;
      if (prevPos.v !== null && posG !== null && prevPos.v - posG >= 5 && al) dar("remontada", l);
      prevPos.v = posG;
      if (!al || !res) { seguidas = 0; top3 = 0; continue; }
      seguidas++;
      if (anulada) continue;
      dar("debut", l);
      if (seguidas >= 3) dar("constante", l);
      if (seguidas >= 10) dar("constante-pro", l);
      const presupuesto = PRESUPUESTO + (al.comodin === "presupuesto" ? 10 : 0);
      if (al.coste <= 40) dar("hucha", l);
      if (al.coste === presupuesto) dar("a-tope", l);
      const tit = al.titulares.map((t) => jugadores.get(t.id)).filter(Boolean) as JugadorF[];
      if (new Set(tit.map((j) => j.equipoId)).size >= 4) dar("mestizo", l);
      if (tit.filter((j) => j.chica).length >= 2 && tit.filter((j) => !j.chica).length >= 2) dar("paritario", l);
      const fichados = [...tit, ...(al.suplente ? [jugadores.get(al.suplente.id)].filter(Boolean) as JugadorF[] : [])];
      fichados.forEach((j) => equiposFichados.add(j.equipoId));
      if (fichados.some((j) => [...jugadores.values()].filter((x) => x.persona === j.persona).length > 1)) dar("doble-vida", l);
      if (res.total >= 50) dar("medio-centenar", l);
      if (res.total >= 100) dar("centenario", l);
      if (res.total >= 150) dar("150", l);
      if (res.filas.some((f) => f.precio === 4 && f.puntos >= 8)) dar("cazador", l);
      const gg = ganga(semana(l), precio(l));
      if (gg && al.titulares.some((t) => t.id === gg.id)) dar("ojo-de-halcon", l);
      const cap = res.filas.find((f) => f.capitan);
      if (cap?.jugo && res.filas.every((f) => f.puntos <= cap.puntos)) { brazalete++; if (brazalete >= 3) dar("brazalete", l); }
      if (res.filas.every((f) => f.puntos >= 10)) dar("pleno", l);
      if (res.suplente?.entro && res.filas.every((f) => f.puntos < res.suplente!.puntos)) dar("banquillo-de-oro", l);
      const pj = porJornada.get(l)?.find((x) => x.id === pid);
      if (pj && pj.pos <= 3) { dar("podio", l); top3++; if (top3 >= 3) dar("racha", l); } else top3 = 0;
      if (pj?.pos === 1) {
        dar("mvp", l);
        if (al.coste <= 40) dar("low-cost", l);
        if ((e.especiales[l] ?? []).length) dar("rey-del-derbi", l);
      }
      if (al.comodin === "capitan3" && cap && cap.puntos + cap.extra >= 25) dar("comodin-maestro", l);
      if (res.filas.every((f) => f.jugo && f.puntos > 0)) { sinCeros++; if (sinCeros >= 10) dar("sin-ceros", l); }
      const ideal = quintetoIdeal(semana(l), jugadores).map((x) => x.id);
      if (ideal.length === 5 && ideal.every((id) => al.titulares.some((t) => t.id === id))) dar("quinteto-perfecto", l);
      const rev = revelacion(l);
      if (rev && al.titulares.some((t) => t.id === rev.id && t.precio < rev.ahora)) dar("visionario", l);
    }
    if (pool.size && [...pool].every((x) => equiposFichados.has(x))) dar("turo-de-cap-a-peus", terminadas[terminadas.length - 1] ?? "");
    if (e.cerrada && e.campeon === pid) dar("campeon-del-turo", "");
    if (e.cerrada && terminadas.filter((l) => !e.anuladas.includes(l)).every((l) => alDe.has(`${pid}|${l}`))) dar("incondicional", "");
    return g;
  };

  return {
    jugadores, actuaciones, pool, abierta, enJuego, todas, cerradas, terminadas,
    cierre: (l: string) => cierreDe(l, e.partidos, pool),
    descansan: (l: string) => descansan(l, e.partidos, pool),
    precio, semana, pendientes, resultados, porJornada, general, bloqueados, revelacion, insignias,
    alineacion: (pid: string, l: string) => alDe.get(`${pid}|${l}`),
    ganga: (l: string) => ganga(semana(l), precio(l)),
    ideal: (l: string) => quintetoIdeal(semana(l), jugadores),
  };
}
export type Liga = ReturnType<typeof calcularLiga>;
