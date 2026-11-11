// Informe automático de un partido a partir de las estadísticas de la FCBQ
import type { EquipoStats, JugadorStats, StatsPartido } from "./stats-fcbq";

export type Destacado = { titulo: string; nombre: string; dorsal: string; dato: string };
export type InformePartido = {
  nuestro: string; rival: string; pf: number; pc: number; gana: boolean; local: boolean;
  parciales: { n: number; a: number; b: number }[];
  destacados: Destacado[];
  claves: string[];
  cronica: string;
};

const nombreBonito = (n: string) => n.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()).replace(/,\s*/, " ");
/** «PUIG SOLER, MARC» → «Marc Puig» */
export const nombreJugador = (n: string) => {
  const [ap, nom] = n.split(",").map((x) => x.trim());
  return nom ? `${nombreBonito(nom).split(" ")[0]} ${nombreBonito(ap).split(" ")[0]}` : nombreBonito(n).split(" ").slice(0, 2).join(" ");
};
const pct = (a: number, b: number) => (b ? Math.round((a * 100) / b) : 0);
const plural = (n: number, s: string, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;
const min = (seg: number) => Math.round(seg / 60);

/** Valoración sencilla para elegir el MVP: puntos, acierto en tiros libres, +/- y faltas */
const valoracion = (j: JugadorStats) => j.pts + j.t3 * 0.5 - (j.tla - j.tlm) * 0.5 + j.mm / 3 - Math.max(0, j.fc - 3);

/** Racha más larga de puntos seguidos sin respuesta del otro equipo (con el marcador del partido) */
function rachas(st: StatsPartido, somosLocal: boolean) {
  const m = st.marcador ?? [];
  let mejorN = 0, mejorR = 0, cur = 0, quien: 0 | 1 | null = null, prevL = 0, prevV = 0;
  let maxVentaja = 0, maxDesventaja = 0;
  for (const [, l, v] of m) {
    const dl = l - prevL, dv = v - prevV;
    const q: 0 | 1 | null = dl > 0 && dv === 0 ? 0 : dv > 0 && dl === 0 ? 1 : null;
    if (q === null) { cur = 0; quien = null; } else if (q === quien) cur += q === 0 ? dl : dv; else { quien = q; cur = q === 0 ? dl : dv; }
    const nuestro = quien === (somosLocal ? 0 : 1);
    if (quien !== null) { if (nuestro) mejorN = Math.max(mejorN, cur); else mejorR = Math.max(mejorR, cur); }
    const dif = somosLocal ? l - v : v - l;
    maxVentaja = Math.max(maxVentaja, dif); maxDesventaja = Math.max(maxDesventaja, -dif);
    prevL = l; prevV = v;
  }
  return { nuestra: mejorN, suya: mejorR, maxVentaja, maxDesventaja, hay: m.length > 3 };
}

export function informePartido(st: StatsPartido): InformePartido | null {
  const somosLocal = /TUR[OÓ]/i.test(st.local.nombre);
  if (!somosLocal && !/TUR[OÓ]/i.test(st.visitante.nombre)) return null;
  const yo: EquipoStats = somosLocal ? st.local : st.visitante;
  const el: EquipoStats = somosLocal ? st.visitante : st.local;
  const gana = yo.pts > el.pts;
  const jug = yo.jugadores.filter((j) => j.seg > 0);
  const parciales = yo.porPeriodo.map((a, i) => ({ n: i + 1, a, b: el.porPeriodo[i] ?? 0 }));

  const destacados: Destacado[] = [];
  const top = <T,>(arr: T[], f: (x: T) => number) => [...arr].sort((a, b) => f(b) - f(a))[0];
  const mvp = top(jug, valoracion);
  if (mvp) destacados.push({ titulo: "MVP", nombre: nombreJugador(mvp.nombre), dorsal: mvp.dorsal, dato: `${mvp.pts} pts · ${mvp.mm > 0 ? "+" : ""}${mvp.mm} · ${min(mvp.seg)}′` });
  const anot = top(jug, (j) => j.pts);
  if (anot && anot !== mvp && anot.pts > 0) destacados.push({ titulo: "Máximo anotador", nombre: nombreJugador(anot.nombre), dorsal: anot.dorsal, dato: `${anot.pts} puntos` });
  const triples = top(jug, (j) => j.t3);
  if (triples && triples.t3 >= 2) destacados.push({ titulo: "Desde el triple", nombre: nombreJugador(triples.nombre), dorsal: triples.dorsal, dato: plural(triples.t3, "triple") });
  const mm = top(jug, (j) => j.mm);
  if (mm && mm !== mvp && mm.mm > 0) destacados.push({ titulo: "Mejor +/-", nombre: nombreJugador(mm.nombre), dorsal: mm.dorsal, dato: `+${mm.mm} en pista` });
  const tl = top(jug.filter((j) => j.tla >= 4), (j) => j.tlm / j.tla + j.tla / 100);
  if (tl && pct(tl.tlm, tl.tla) >= 70) destacados.push({ titulo: "Seguro en el tiro libre", nombre: nombreJugador(tl.nombre), dorsal: tl.dorsal, dato: `${tl.tlm}/${tl.tla} TL` });

  const claves: string[] = [];
  const mejor = [...parciales].sort((a, b) => (b.a - b.b) - (a.a - a.b))[0];
  const peor = [...parciales].sort((a, b) => (a.a - a.b) - (b.a - b.b))[0];
  if (mejor && mejor.a > mejor.b) claves.push(`Mejor cuarto: el ${mejor.n}º (${mejor.a}-${mejor.b}).`);
  if (peor && peor.a < peor.b && peor !== mejor) claves.push(`Peor cuarto: el ${peor.n}º (${peor.a}-${peor.b}).`);
  const r = rachas(st, somosLocal);
  if (r.hay) {
    if (r.nuestra >= 6) claves.push(`Parcial de ${r.nuestra}-0 a favor en el mejor momento.`);
    if (r.suya >= 6) claves.push(`El rival llegó a hacer un ${r.suya}-0.`);
    if (r.maxVentaja >= 5) claves.push(`Máxima ventaja: +${r.maxVentaja}.`);
    if (r.maxDesventaja >= 5) claves.push(`Máxima desventaja: −${r.maxDesventaja}.`);
  }
  claves.push(`Tiros libres: ${yo.tlm}/${yo.tla} (${pct(yo.tlm, yo.tla)}%) · rival ${el.tlm}/${el.tla} (${pct(el.tlm, el.tla)}%).`);
  if (yo.t3 || el.t3) claves.push(`Triples: ${yo.t3} nuestros, ${el.t3} del rival.`);
  const anotadores = jug.filter((j) => j.pts > 0).length;
  claves.push(`${plural(anotadores, "jugador", "jugadores")} anotaron y ${plural(jug.length, "jugó", "jugaron")}.`);
  claves.push(`Faltas: ${yo.fc} nuestras, ${el.fc} del rival.`);

  // Crónica corta
  const dif = Math.abs(yo.pts - el.pts);
  const rival = nombreBonito(el.nombre);
  const tipo = gana ? (dif >= 20 ? "Victoria contundente" : dif <= 5 ? "Victoria sufrida" : "Victoria") : (dif <= 5 ? "Derrota por la mínima" : dif >= 20 ? "Derrota clara" : "Derrota");
  const remontada = gana && r.hay && r.maxDesventaja >= 6 ? ` remontando una desventaja de ${r.maxDesventaja} puntos` : "";
  const escapada = !gana && r.hay && r.maxVentaja >= 6 ? ` después de ir ganando de ${r.maxVentaja}` : "";
  let cronica = `${tipo} ${somosLocal ? "en casa" : "a domicilio"} contra ${rival} (${yo.pts}-${el.pts})${remontada}${escapada}.`;
  if (mejor && mejor.a > mejor.b) cronica += ` La clave estuvo en el ${mejor.n}º cuarto, ganado ${mejor.a}-${mejor.b}.`;
  if (mvp) cronica += ` ${nombreJugador(mvp.nombre)} fue el más destacado con ${plural(mvp.pts, "punto")}${mvp.mm > 0 ? ` y un +${mvp.mm} en pista` : ""}.`;
  if (anotadores >= 7) cronica += ` Buen reparto: anotaron ${anotadores} jugadores.`;

  return { nuestro: nombreBonito(yo.nombre), rival, pf: yo.pts, pc: el.pts, gana, local: somosLocal, parciales, destacados, claves, cronica };
}
