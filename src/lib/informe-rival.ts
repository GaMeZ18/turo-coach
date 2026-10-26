// Informe automático de un equipo con los datos de la FCBQ (clasificación, resultados y estadísticas)
import type { ResultadoLiga, TablaFCBQ } from "./fcbq";
import { calcularClasificacion } from "./fcbq";
import { mismoEquipo, resumenEquipo, type StatsPartido } from "./stats-fcbq";

export interface LineaInforme { titulo: string; texto: string; tono?: "bien" | "mal" | "neutro" }

const corto = (n: string) => {
  const t = n.toLowerCase().split(/\s+/).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1));
  return t.length > 1 ? `${t[0]} ${t[1]}` : t[0] ?? n;
};
const f1 = (x: number) => x.toFixed(1).replace(".", ",");

export function informeRival(
  nombre: string,
  datos: { resultados: ResultadoLiga[]; clasificacion: TablaFCBQ | null; stats: StatsPartido[]; nuestro?: string | null },
): LineaInforme[] {
  const out: LineaInforme[] = [];
  const { resultados, clasificacion, stats } = datos;

  // --- Clasificación ---
  const oficial = clasificacion;
  let filas: { equipo: string; pj: number; g: number; p: number; pf: number; pc: number; pts: number }[] = [];
  if (oficial) {
    const i = (re: RegExp) => oficial.cabeceras.findIndex((c) => re.test(c));
    const [iE, iJ, iG, iP, iPF, iPC, iPts] = [/^Equip/i, /^J$/i, /^G$/i, /^P$/i, /^PF$/i, /^PC$/i, /^Punts|^Pts/i].map(i);
    if (iE >= 0 && iJ >= 0) filas = oficial.filas.map((f) => ({ equipo: f[iE], pj: +f[iJ] || 0, g: +f[iG] || 0, p: +f[iP] || 0, pf: +f[iPF] || 0, pc: +f[iPC] || 0, pts: +f[iPts] || 0 }));
  }
  if (!filas.length) filas = calcularClasificacion(resultados);
  const pos = filas.findIndex((f) => mismoEquipo(f.equipo, nombre));
  const fila = filas[pos];
  if (fila && fila.pj) {
    const ataque = [...filas].filter((f) => f.pj).sort((a, b) => b.pf / b.pj - a.pf / a.pj).findIndex((f) => f === fila) + 1;
    const defensa = [...filas].filter((f) => f.pj).sort((a, b) => a.pc / a.pj - b.pc / b.pj).findIndex((f) => f === fila) + 1;
    out.push({ titulo: "Clasificación", texto: `${pos + 1}º de ${filas.length} · ${fila.g}-${fila.p}${fila.pts ? ` · ${fila.pts} ${fila.pts === 1 ? "punto" : "puntos"}` : ""}`, tono: pos < filas.length / 3 ? "mal" : pos >= (2 * filas.length) / 3 ? "bien" : "neutro" });
    out.push({ titulo: "Ataque y defensa", texto: `Mete ${f1(fila.pf / fila.pj)} y recibe ${f1(fila.pc / fila.pj)} por partido (${ataque}º ataque y ${defensa}º defensa de la liga).` });
  }

  // --- Racha y enfrentamiento directo ---
  const suyos = resultados
    .filter((r) => (mismoEquipo(r.local, nombre) || mismoEquipo(r.visitante, nombre)) && r.pl !== null && r.pv !== null)
    .sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
  if (suyos.length) {
    const ult = suyos.slice(-5).map((r) => {
      const [a, b] = mismoEquipo(r.local, nombre) ? [r.pl!, r.pv!] : [r.pv!, r.pl!];
      return a > b ? "V" : a < b ? "D" : "E";
    });
    let racha = 1;
    for (let i = ult.length - 2; i >= 0 && ult[i] === ult[ult.length - 1]; i--) racha++;
    out.push({ titulo: "Últimos partidos", texto: `${ult.join(" ")}${racha >= 2 ? ` · lleva ${racha} ${ult[ult.length - 1] === "V" ? "victorias" : "derrotas"} seguidas` : ""}` });
    const casa = suyos.filter((r) => mismoEquipo(r.local, nombre));
    const fuera = suyos.filter((r) => mismoEquipo(r.visitante, nombre));
    const g = (lst: ResultadoLiga[], local: boolean) => lst.filter((r) => (local ? r.pl! > r.pv! : r.pv! > r.pl!)).length;
    if (casa.length && fuera.length) out.push({ titulo: "Casa y fuera", texto: `En casa ${g(casa, true)}-${casa.length - g(casa, true)} · fuera ${g(fuera, false)}-${fuera.length - g(fuera, false)}` });
  }
  if (datos.nuestro && !mismoEquipo(datos.nuestro, nombre)) {
    const directo = suyos.filter((r) => mismoEquipo(r.local, datos.nuestro!) || mismoEquipo(r.visitante, datos.nuestro!));
    for (const r of directo) out.push({ titulo: "Contra nosotros", texto: `${r.local} ${r.pl}-${r.pv} ${r.visitante} (${r.jornada ? `J${r.jornada}` : r.dia})` });
  }

  // --- Estadísticas de la FCBQ ---
  const { equipo: eq, jugadores, partidos } = resumenEquipo(nombre, stats);
  if (eq.pj) {
    const top = jugadores.slice(0, 3).map((j) => `${corto(j.nombre)} (#${j.dorsal}) ${f1(j.pts / j.pj)}`);
    if (top.length) out.push({ titulo: "Máximos anotadores", texto: `${top.join(" · ")} puntos por partido`, tono: "mal" });
    const pctTop = eq.pf ? Math.round((jugadores.slice(0, 2).reduce((s, j) => s + j.pts, 0) * 100) / eq.pf) : 0;
    if (pctTop >= 45) out.push({ titulo: "Dependencia", texto: `Sus dos máximos anotadores hacen el ${pctTop}% de los puntos: si se les frena, el equipo sufre.`, tono: "bien" });
    const tiradores = jugadores.filter((j) => j.t3 / j.pj >= 1).sort((a, b) => b.t3 / b.pj - a.t3 / a.pj).slice(0, 3);
    out.push(tiradores.length
      ? { titulo: "Tiro exterior", texto: `${f1(eq.t3 / eq.pj)} triples por partido. Tiradores: ${tiradores.map((j) => `${corto(j.nombre)} (#${j.dorsal}, ${f1(j.t3 / j.pj)})`).join(", ")}.`, tono: "mal" }
      : { titulo: "Tiro exterior", texto: `Solo ${f1(eq.t3 / eq.pj)} triples por partido: se les puede defender más cerrados.`, tono: "bien" });
    if (eq.tla) {
      const pct = Math.round((eq.tlm * 100) / eq.tla);
      out.push({ titulo: "Tiros libres", texto: `${pct}% (${f1(eq.tla / eq.pj)} lanzamientos por partido).${pct < 60 ? " Hacerles falta al final puede salir a cuenta." : ""}`, tono: pct < 60 ? "bien" : "neutro" });
      const malos = jugadores.filter((j) => j.tla >= 4 && j.tlm / j.tla < 0.5).slice(0, 3);
      if (malos.length) out.push({ titulo: "Malos tiradores de TL", texto: malos.map((j) => `${corto(j.nombre)} (#${j.dorsal}) ${Math.round((j.tlm * 100) / j.tla)}%`).join(" · "), tono: "bien" });
    }
    out.push({ titulo: "Faltas", texto: `${f1(eq.fc / eq.pj)} faltas por partido.` });
    // Periodos
    if (eq.porPeriodoF.length) {
      const dif = eq.porPeriodoF.map((v, i) => (v - (eq.porPeriodoC[i] ?? 0)) / eq.pj);
      const mejor = dif.indexOf(Math.max(...dif)), peor = dif.indexOf(Math.min(...dif));
      out.push({ titulo: "Por periodos", texto: `Su mejor periodo es el ${mejor + 1}º (${dif[mejor] > 0 ? "+" : ""}${f1(dif[mejor])}) y el peor el ${peor + 1}º (${dif[peor] > 0 ? "+" : ""}${f1(dif[peor])}).` });
    }
    // Quinteto inicial habitual y banquillo
    const titulares = [...jugadores].sort((a, b) => b.titular - a.titular).slice(0, 5).filter((j) => j.titular > 0);
    if (titulares.length >= 4) out.push({ titulo: "Quinteto inicial habitual", texto: titulares.map((j) => `#${j.dorsal} ${corto(j.nombre)}`).join(", ") });
    const banquillo = partidos.reduce((s, p) => s + (mismoEquipo(p.local.nombre, nombre) ? p.local : p.visitante).jugadores.filter((j) => !j.titular).reduce((a, j) => a + j.pts, 0), 0);
    if (eq.pf) out.push({ titulo: "Banquillo", texto: `Aporta ${f1(banquillo / eq.pj)} puntos por partido (${Math.round((banquillo * 100) / eq.pf)}% del total).` });
    const cargados = jugadores.filter((j) => j.fc / j.pj >= 3.5).slice(0, 3);
    if (cargados.length) out.push({ titulo: "Se cargan de faltas", texto: cargados.map((j) => `${corto(j.nombre)} (#${j.dorsal}) ${f1(j.fc / j.pj)}`).join(" · "), tono: "bien" });
  } else if (!out.length) {
    out.push({ titulo: "Sin datos", texto: "Todavía no hay datos de este equipo. Pulsa «Actualizar desde la FCBQ»." });
  }
  return out;
}
