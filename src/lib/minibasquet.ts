// Normativa de alineaciones de minibàsquet del CEEB (Reglament MiniBàsquet 2025-26, JEEB):
// · 6 períodos de 8 minutos. En acta, entre 5 y 12 jugadores.
// · 8 o más en acta: todos juegan como mínimo 2 períodos antes del 6º y como máximo 4 en todo el partido.
// · 7 en acta: 2 jugadores juegan 5 períodos y el resto 4.
// · 6 en acta: todos descansan un período entero (juegan 5).
// · 5 en acta: todos juegan los 6 períodos.
// · Del 1º al 5º no hay cambios (salvo lesión, 5ª falta o descalificación); en el 6º sí, si hay 8 o más en acta.

export const PERIODOS_MINI = 6;
export type AvisoAlineacion = { nivel: "error" | "info"; texto: string };
type J = { id: string; nombre: string };

export function validarAlineacion(jugadores: J[], marcas: Record<string, number[]>): AvisoAlineacion[] {
  const n = jugadores.length;
  const res: AvisoAlineacion[] = [];
  if (n < 5) return [{ nivel: "error", texto: `En acta tiene que haber como mínimo 5 jugadores (ahora ${n}). Marca la convocatoria.` }];
  if (n > 12) return [{ nivel: "error", texto: `En acta caben como máximo 12 jugadores (ahora ${n}). Quita alguno de la convocatoria.` }];
  const de = (id: string) => [...new Set(marcas[id] ?? [])].filter((p) => p >= 1 && p <= PERIODOS_MINI);
  const corto = (j: J) => j.nombre.split(" ").slice(0, 2).join(" ");

  for (let p = 1; p <= PERIODOS_MINI; p++) {
    const c = jugadores.filter((j) => de(j.id).includes(p)).length;
    if (c !== 5) res.push({ nivel: "error", texto: `${p}º período: hay ${c} jugador${c === 1 ? "" : "es"} (tienen que ser 5).` });
  }

  if (n >= 8) {
    for (const j of jugadores) {
      const t = de(j.id), antes6 = t.filter((p) => p <= 5).length;
      if (antes6 < 2) res.push({ nivel: "error", texto: `${corto(j)} juega ${antes6} período${antes6 === 1 ? "" : "s"} antes del 6º (mínimo 2).` });
      if (t.length > 4) res.push({ nivel: "error", texto: `${corto(j)} juega ${t.length} períodos (máximo 4).` });
    }
    res.push({ nivel: "info", texto: "Con 8 o más en acta: mínimo 2 períodos antes del 6º y máximo 4 en total. En el 6º se pueden hacer cambios (cuenta como período jugado para los dos)." });
  } else if (n === 7) {
    const cinco = jugadores.filter((j) => de(j.id).length === 5).length;
    for (const j of jugadores) {
      const t = de(j.id).length;
      if (t !== 4 && t !== 5) res.push({ nivel: "error", texto: `${corto(j)} juega ${t} períodos (con 7 en acta: 4, o 5 para dos de ellos).` });
    }
    if (cinco !== 2) res.push({ nivel: "error", texto: `Con 7 en acta, exactamente 2 jugadores juegan 5 períodos (ahora ${cinco}).` });
    res.push({ nivel: "info", texto: "Con 7 en acta: 2 jugadores juegan 5 períodos y el resto 4. En el 6º no hay cambios (salvo lesión, 5ª falta o descalificación)." });
  } else if (n === 6) {
    for (const j of jugadores) {
      const t = de(j.id).length;
      if (t !== 5) res.push({ nivel: "error", texto: `${corto(j)} juega ${t} períodos (con 6 en acta todos descansan 1: juegan 5).` });
    }
    res.push({ nivel: "info", texto: "Con 6 en acta: todos descansan un período entero. En el 6º no hay cambios (salvo lesión, 5ª falta o descalificación)." });
  } else if (n === 5) {
    for (const j of jugadores) {
      const t = de(j.id).length;
      if (t !== 6) res.push({ nivel: "error", texto: `${corto(j)} juega ${t} períodos (con 5 en acta todos juegan los 6).` });
    }
  }
  return res;
}

export const alineacionCorrecta = (jugadores: J[], marcas: Record<string, number[]>) =>
  !validarAlineacion(jugadores, marcas).some((a) => a.nivel === "error");

/** Propone una alineación que cumple la normativa, repartiendo los minutos y alternando descansos */
export function proponerAlineacion(jugadores: J[]): Record<string, number[]> {
  const n = jugadores.length;
  const res: Record<string, number[]> = Object.fromEntries(jugadores.map((j) => [j.id, []]));
  if (n < 5 || n > 12) return res;
  const ids = jugadores.map((j) => j.id);
  // Cuántos períodos juega cada uno del 1º al 5º (q15) y quién juega el 6º
  const q15: Record<string, number> = {};
  let en6: string[] = [];
  if (n >= 8) {
    ids.forEach((id) => (q15[id] = 2));
    let resto = 25 - 2 * n, i = 0;
    while (resto > 0) { if (q15[ids[i % n]] < 3) { q15[ids[i % n]]++; resto--; } i++; if (i > 200) break; }
    i = 0;
    while (resto > 0) { if (q15[ids[i % n]] < 4) { q15[ids[i % n]]++; resto--; } i++; if (i > 400) break; }
    en6 = [...ids].sort((a, b) => q15[a] - q15[b]).filter((id) => q15[id] < 4).slice(0, 5);
  } else if (n === 7) {
    // 2 juegan 5 y 5 juegan 4 → el 6º lo juegan los 5 que menos tengan
    const total: Record<string, number> = Object.fromEntries(ids.map((id, k) => [id, k < 2 ? 5 : 4]));
    en6 = [...ids].slice(2).slice(0, 5);
    ids.forEach((id) => (q15[id] = total[id] - (en6.includes(id) ? 1 : 0)));
  } else if (n === 6) {
    ids.forEach((id, k) => (q15[id] = k < 5 ? 4 : 5)); // el que descansa en el 6º es el último
    en6 = ids.slice(0, 5);
  } else {
    ids.forEach((id) => (q15[id] = 5));
    en6 = [...ids];
  }
  const quedan = { ...q15 };
  let anterior: string[] = [];
  for (let p = 1; p <= 5; p++) {
    const elegidos = [...ids].sort((a, b) => (quedan[b] - quedan[a]) || ((anterior.includes(a) ? 1 : 0) - (anterior.includes(b) ? 1 : 0))).slice(0, 5);
    elegidos.forEach((id) => { res[id].push(p); quedan[id]--; });
    anterior = elegidos;
  }
  en6.forEach((id) => res[id].push(6));
  return res;
}

/** Texto de la alineación por períodos (para WhatsApp o el acta) */
export function textoAlineacion(jugadores: (J & { dorsal: number | null })[], marcas: Record<string, number[]>) {
  const lin = [];
  for (let p = 1; p <= PERIODOS_MINI; p++) {
    const quien = jugadores.filter((j) => (marcas[j.id] ?? []).includes(p)).map((j) => `${j.dorsal ?? "–"} ${j.nombre.split(" ")[0]}`);
    lin.push(`${p}º: ${quien.join(", ") || "—"}`);
  }
  return lin.join("\n");
}
