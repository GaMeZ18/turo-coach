// Torneos del club: calendario todos contra todos, clasificación y cuadro de eliminatoria (lógica pura)

export type Formato = "liga" | "grupos" | "eliminatoria";
export type Torneo = {
  id: string; nombre: string; categoria: string | null; fecha_inicio: string | null; fecha_fin: string | null; lugar: string | null;
  formato: Formato; num_grupos: number; clasifican: number; ida_vuelta: boolean; tercer_puesto: boolean;
  puntos_victoria: number; puntos_derrota: number; duracion: number; notas: string | null; publico: boolean; token: string;
};
export type EquipoT = { id: string; nombre: string; club: string | null; grupo: string | null; cabeza: number | null };
export type PartidoT = {
  id: string; fase: "grupo" | "eliminatoria"; grupo: string | null; ronda: number; orden: number; tercer_puesto: boolean;
  local_id: string | null; visitante_id: string | null; fecha: string | null; pista: string | null;
  puntos_local: number | null; puntos_visitante: number | null;
};
export const CAMPOS_TORNEO = "id, nombre, categoria, fecha_inicio, fecha_fin, lugar, formato, num_grupos, clasifican, ida_vuelta, tercer_puesto, puntos_victoria, puntos_derrota, duracion, notas, publico, token";
export const CAMPOS_EQUIPO = "id, nombre, club, grupo, cabeza";
export const CAMPOS_PARTIDO = "id, fase, grupo, ronda, orden, tercer_puesto, local_id, visitante_id, fecha, pista, puntos_local, puntos_visitante";

export const FORMATOS: Record<Formato, string> = {
  liga: "Liga (todos contra todos)",
  grupos: "Grupos + eliminatoria",
  eliminatoria: "Eliminatoria directa",
};
export const LETRAS = "ABCDEFGHIJKLMNOP";
export const jugado = (p: PartidoT) => p.puntos_local !== null && p.puntos_visitante !== null;

/** Todos contra todos (método del círculo): devuelve las jornadas con sus cruces */
export function todosContraTodos(ids: string[], idaVuelta = false) {
  const lista: (string | null)[] = [...ids];
  if (lista.length % 2) lista.push(null); // descansa
  const n = lista.length, rondas: { ronda: number; local: string; visitante: string }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i], b = lista[n - 1 - i];
      if (!a || !b) continue;
      // Alternar quién es local para que no sea siempre el mismo
      const [l, v] = (r + i) % 2 ? [b, a] : [a, b];
      rondas.push({ ronda: r + 1, local: l, visitante: v });
    }
    lista.splice(1, 0, lista.pop()!);
  }
  if (idaVuelta) {
    const vuelta = rondas.map((x) => ({ ronda: x.ronda + n - 1, local: x.visitante, visitante: x.local }));
    rondas.push(...vuelta);
  }
  return rondas;
}

/** Reparte los equipos en grupos: por cabeza de serie en zigzag (A B C C B A…) y el resto al azar */
export function repartirGrupos(equipos: EquipoT[], numGrupos: number) {
  const conCabeza = equipos.filter((e) => e.cabeza).sort((a, b) => a.cabeza! - b.cabeza!);
  const resto = equipos.filter((e) => !e.cabeza).sort(() => Math.random() - 0.5);
  const orden = [...conCabeza, ...resto];
  return orden.map((e, i) => {
    const vuelta = Math.floor(i / numGrupos), pos = i % numGrupos;
    return { id: e.id, grupo: LETRAS[vuelta % 2 ? numGrupos - 1 - pos : pos] };
  });
}

export type FilaClasif = { id: string; pj: number; pg: number; pp: number; pf: number; pc: number; dif: number; pts: number };

/** Clasificación de un grupo (o de la liga): puntos, luego enfrentamiento directo, diferencia y puntos a favor */
export function clasificacion(equipos: EquipoT[], partidos: PartidoT[], pv: number, pd: number): FilaClasif[] {
  const filas = new Map(equipos.map((e) => [e.id, { id: e.id, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, dif: 0, pts: 0 }]));
  const jugados = partidos.filter((p) => p.fase === "grupo" && jugado(p) && p.local_id && p.visitante_id);
  for (const p of jugados) {
    const l = filas.get(p.local_id!), v = filas.get(p.visitante_id!);
    if (!l || !v) continue;
    const a = p.puntos_local!, b = p.puntos_visitante!;
    l.pj++; v.pj++; l.pf += a; l.pc += b; v.pf += b; v.pc += a;
    if (a > b) { l.pg++; v.pp++; l.pts += pv; v.pts += pd; }
    else if (b > a) { v.pg++; l.pp++; v.pts += pv; l.pts += pd; }
  }
  for (const f of filas.values()) f.dif = f.pf - f.pc;
  const directo = (x: string, y: string) => {
    let s = 0;
    for (const p of jugados) {
      if (p.local_id === x && p.visitante_id === y) s += p.puntos_local! - p.puntos_visitante!;
      if (p.local_id === y && p.visitante_id === x) s += p.puntos_visitante! - p.puntos_local!;
    }
    return s;
  };
  const nombre = new Map(equipos.map((e) => [e.id, e.nombre]));
  return [...filas.values()].sort((a, b) => b.pts - a.pts || directo(b.id, a.id) || b.dif - a.dif || b.pf - a.pf || (nombre.get(a.id) ?? "").localeCompare(nombre.get(b.id) ?? ""));
}

/** Orden de siembra de un cuadro de tamaño potencia de 2: [1, 8, 4, 5, 2, 7, 3, 6] para 8 */
export function ordenSiembra(tam: number): number[] {
  let o = [1, 2];
  while (o.length < tam) {
    const n = o.length * 2 + 1;
    o = o.flatMap((s) => [s, n - s]);
  }
  return o;
}

/** Cuadro a partir de los equipos ordenados (el mejor primero). Los que no tienen rival pasan directos a la 2.ª ronda. */
export function generarCuadro(sembrados: string[], tercerPuesto: boolean) {
  const n = sembrados.length;
  let tam = 2;
  while (tam < n) tam *= 2;
  const rondas = Math.log2(tam);
  const pos = ordenSiembra(tam).map((s) => sembrados[s - 1] ?? null);
  type Hueco = { ronda: number; orden: number; local: string | null; visitante: string | null; tercer: boolean };
  const partidos: Hueco[] = [];
  for (let r = 1; r <= rondas; r++) {
    const cuantos = tam / 2 ** r;
    for (let o = 0; o < cuantos; o++) partidos.push({ ronda: r, orden: o, local: null, visitante: null, tercer: false });
  }
  const hueco = (r: number, o: number) => partidos.find((p) => p.ronda === r && p.orden === o && !p.tercer)!;
  for (let o = 0; o < tam / 2; o++) {
    const a = pos[o * 2], b = pos[o * 2 + 1];
    if (a && b) { const h = hueco(1, o); h.local = a; h.visitante = b; }
    else if (a || b) {
      // Exento: pasa a la ronda siguiente y este cruce no se juega
      const sig = hueco(2, Math.floor(o / 2));
      if (o % 2 === 0) sig.local = a ?? b; else sig.visitante = a ?? b;
    }
  }
  if (tercerPuesto && rondas >= 2) partidos.push({ ronda: rondas, orden: 1, local: null, visitante: null, tercer: true });
  // Fuera los cruces de 1.ª ronda que no se juegan (exentos)
  return { rondas, partidos: partidos.filter((p) => p.ronda > 1 || p.tercer || (p.local && p.visitante)) };
}

/** Nombre de la ronda según cuántas faltan para la final */
export function nombreRonda(ronda: number, total: number, tercer = false) {
  if (tercer) return "3.er y 4.º puesto";
  const faltan = total - ronda;
  return faltan === 0 ? "Final" : faltan === 1 ? "Semifinales" : faltan === 2 ? "Cuartos de final" : faltan === 3 ? "Octavos de final" : `Ronda ${ronda}`;
}

/** Ganador y perdedor de un partido jugado (en eliminatoria no puede haber empate) */
export function ganador(p: PartidoT) {
  if (!jugado(p) || p.puntos_local === p.puntos_visitante) return null;
  return p.puntos_local! > p.puntos_visitante! ? { gana: p.local_id, pierde: p.visitante_id } : { gana: p.visitante_id, pierde: p.local_id };
}
