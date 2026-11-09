// Datos de cada ejercicio que sirven para filtrar la búsqueda (para qué sirve, jugadores,
// posiciones, material, modalidad) y la lógica para completarlos en los ejercicios que ya existían.
import { CATEGORIAS } from "./categorias";
import { EDADES } from "./edades";

/** Para qué sirve el ejercicio: son las mismas categorías de siempre (calentamiento, tiro, rebote, defensa…) */
export const ENFOQUES = CATEGORIAS;
export const POSICIONES = ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"] as const;
export const MODALIDADES = [
  { v: "individual", t: "Individual" },
  { v: "grupos", t: "Parejas o grupos pequeños" },
  { v: "equipo", t: "Todo el equipo" },
] as const;
export const MATERIALES = [
  { k: "balones", t: "Balones" },
  { k: "canastas", t: "Canastas" },
  { k: "conos", t: "Conos" },
  { k: "petos", t: "Petos" },
] as const;
export type ClaveMaterial = (typeof MATERIALES)[number]["k"];

/** Columnas añadidas en 0025_ejercicios_filtros.sql */
export const RE_COLUMNAS_NUEVAS = /enfoques|posiciones|modalidad|jugadores_max|balones|canastas|conos|petos/;
export const AVISO_MIGRACION = "Para filtrar por estos datos, ejecuta antes 0025_ejercicios_filtros.sql en el SQL Editor de Supabase.";

// ---------------------------------------------------------------------------
// Filtros de búsqueda (los usan /ejercicios y /biblioteca)
// ---------------------------------------------------------------------------
export type FiltrosEjercicio = { cat?: string; jug?: string; edad?: string; pos?: string; mod?: string; mat?: string };
export const PARAMS_FILTRO = ["cat", "jug", "edad", "pos", "mod", "mat"] as const;

export const FILTROS_MATERIAL = [
  { v: "sin-conos", t: "Sin conos" },
  { v: "sin-petos", t: "Sin petos" },
  { v: "sin-canastas", t: "Sin canastas (solo balones)" },
] as const;

/** ¿Alguno de los filtros nuevos está activo? (los que necesitan las columnas de 0025) */
export const usaColumnasNuevas = (f: FiltrosEjercicio) => !!(f.jug || f.pos || f.mod || f.mat || f.cat);

/**
 * Añade a la consulta de Supabase los filtros elegidos. Lo que no tiene el dato (ejercicios
 * sin posiciones, sin edades o sin nº de jugadores) se considera válido para todos.
 */
export function filtrarEjercicios<Q>(consulta: Q, f: FiltrosEjercicio): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = consulta;
  if (f.cat && (ENFOQUES as readonly string[]).includes(f.cat)) {
    // Vale tanto si está marcado como enfoque como si es su categoría de siempre
    q = q.or(`enfoques.cs.{"${f.cat}"},categoria.eq.${f.cat}${f.cat === "Sistema de juego" ? ",tipo.eq.sistema" : ""}`);
  }
  const n = Number.parseInt(f.jug ?? "", 10);
  if (Number.isFinite(n) && n > 0) {
    q = q.or(`jugadores_min.is.null,jugadores_min.lte.${n}`).or(`jugadores_max.is.null,jugadores_max.gte.${n}`);
  }
  if (f.edad && (EDADES as readonly string[]).includes(f.edad)) q = q.or(`edades.cs.{"${f.edad}"},edades.eq.{}`);
  if (f.pos && (POSICIONES as readonly string[]).includes(f.pos)) q = q.or(`posiciones.cs.{"${f.pos}"},posiciones.eq.{}`);
  if (f.mod && MODALIDADES.some((m) => m.v === f.mod)) q = q.eq("modalidad", f.mod);
  if (f.mat === "sin-conos") q = q.or("conos.is.null,conos.eq.0");
  if (f.mat === "sin-petos") q = q.or("petos.is.null,petos.eq.0");
  if (f.mat === "sin-canastas") q = q.or("canastas.is.null,canastas.eq.0");
  return q as Q;
}

// ---------------------------------------------------------------------------
// Textos para mostrar
// ---------------------------------------------------------------------------
export function textoJugadores(min?: number | null, max?: number | null) {
  if (min && max && max !== min) return `${min}-${max}`;
  if (min) return `${min}`;
  if (max) return `hasta ${max}`;
  return "";
}

export function textoMaterial(e: Partial<Record<ClaveMaterial, number | null>>) {
  const nombre: Record<ClaveMaterial, [string, string]> = {
    balones: ["balón", "balones"], canastas: ["canasta", "canastas"], conos: ["cono", "conos"], petos: ["peto", "petos"],
  };
  return MATERIALES
    .map((m) => ({ n: e[m.k], p: nombre[m.k] }))
    .filter((x): x is { n: number; p: [string, string] } => typeof x.n === "number" && x.n > 0)
    .map((x) => `${x.n} ${x.n === 1 ? x.p[0] : x.p[1]}`);
}

// ---------------------------------------------------------------------------
// Completar los ejercicios que ya existían (los del club y los de los entrenadores)
// ---------------------------------------------------------------------------
export type EjercicioBase = {
  tipo?: string | null; titulo: string; descripcion?: string | null; correcciones?: string | null; objetivos?: string | null;
  categoria?: string | null; etiquetas?: string[] | null; material?: string | null;
  jugadores_min?: number | null; jugadores_max?: number | null;
  enfoques?: string[] | null; posiciones?: string[] | null; modalidad?: string | null;
  balones?: number | null; canastas?: number | null; conos?: number | null; petos?: number | null;
};
export type PatchFiltros = Partial<{
  enfoques: string[]; posiciones: string[]; modalidad: string; jugadores_min: number; jugadores_max: number;
  balones: number; canastas: number; conos: number; petos: number;
}>;

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PALABRAS_ENFOQUE: [string, RegExp][] = [
  ["Calentamiento", /calent|activacion|movilidad|estiramient/],
  ["Fundamentos", /fundament/],
  ["Tiro", /\btiros?\b|lanzamiento|bandeja|entrada a canasta|finalizacion|tirador/],
  ["Pase", /\bpases?\b|\bpasar\b|pasador/],
  ["Bote", /\bbote\b|botar|manejo de balon|\bdribl/],
  ["Ataque", /ataque|ofensiv|continuidad|bloqueo directo|bloqueo indirecto|pick ?(and|&|n) ?roll|corte sin balon/],
  ["Defensa", /defens|marcaje|\bayudas?\b|rotacion|presion|\bpress\b|\btrap\b|cierre/],
  ["Transición", /transici|contraataque|contrataque|salida de balon/],
  ["Rebote", /rebote|rebot|box ?out/],
  ["Juego reducido", /juego reducido|\b[2-4]\s*(?:c|x|vs|v|contra)\s*[1-4]\b/],
  ["Físico", /fisic|resistencia|velocidad|fuerza|\bsalto|agilidad|\bcore\b|coordinacion|pliometr/],
];

const PALABRAS_POSICION: [string, RegExp][] = [
  ["Base", /\b(?:el|los|del|al|un|y|con|para|de|e)\s+bases?\b|\bpunto guard|\bplaymaker/],
  ["Escolta", /\bescoltas?\b|\bshooting guard/],
  ["Alero", /\baleros?\b/],
  ["Ala-pívot", /ala[- ]?pivot|\bpower forward/],
  ["Pívot", /\bpivots?\b|\bposte (?:bajo|alto)|\bjugadores? de poste/],
];

const NUMEROS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
};
const PALABRAS_MATERIAL: Record<ClaveMaterial, string> = {
  balones: "balon(?:es)?|pelotas?",
  canastas: "canastas?|cestas?|aros?",
  conos: "conos?|piquetas?",
  petos: "petos?|chalecos?",
};

function cuentaMaterial(texto: string, palabras: string, jugadores: number | null): number | null {
  const re = new RegExp(`\\b(\\d{1,3}|${Object.keys(NUMEROS).join("|")})\\s+(?:de\\s+)?(?:${palabras})\\b`);
  const m = texto.match(re);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
  if (!n) return null;
  // «1 balón por jugador» → tantos como jugadores; «por pareja» → la mitad
  const resto = texto.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 24);
  if (jugadores && /^\s*(?:por|cada)\s+jugador/.test(resto)) return n * jugadores;
  if (jugadores && /^\s*(?:por|cada)\s+pareja/.test(resto)) return n * Math.ceil(jugadores / 2);
  return n;
}

/** Calcula SOLO lo que falta en un ejercicio (nunca pisa lo que ya tenga relleno) a partir de su título, textos y material */
export function inferirFiltros(e: EjercicioBase): PatchFiltros {
  const out: PatchFiltros = {};
  const titulo = sinAcentos([e.titulo, ...(e.etiquetas ?? [])].join(" · "));
  const enfoque = sinAcentos([e.titulo, ...(e.etiquetas ?? []), e.objetivos ?? ""].join(" · "));
  const todo = sinAcentos([e.titulo, ...(e.etiquetas ?? []), e.objetivos ?? "", e.descripcion ?? "", e.correcciones ?? ""].join(" · "));

  // Jugadores
  let jmin = e.jugadores_min ?? null;
  if (jmin === null) {
    const c = titulo.match(/\b(\d)\s*(?:c|x|vs|v|contra)\s*(\d)\b/);
    const rango = todo.match(/\b(\d{1,2})\s*(?:a|-|–|y|o)\s*(\d{1,2})\s+jugadores/);
    const uno = todo.match(/\b(\d{1,2})\s+jugadores/);
    if (c) jmin = Number(c[1]) + Number(c[2]);
    else if (rango) jmin = Number(rango[1]);
    else if (uno) jmin = Number(uno[1]);
    if (jmin !== null && jmin > 0) out.jugadores_min = jmin; else jmin = null;
  }
  if (e.jugadores_max == null) {
    const rango = todo.match(/\b(\d{1,2})\s*(?:a|-|–|y|o)\s*(\d{1,2})\s+jugadores/);
    if (rango && Number(rango[2]) > (jmin ?? 0)) out.jugadores_max = Number(rango[2]);
  }

  // Para qué sirve: su categoría de siempre + lo que se deduce del título, etiquetas y objetivos
  if (!e.enfoques || e.enfoques.length === 0) {
    const lista: string[] = [];
    if (e.categoria && (ENFOQUES as readonly string[]).includes(e.categoria)) lista.push(e.categoria);
    if (e.tipo === "sistema") lista.push("Sistema de juego");
    for (const [nombre, re] of PALABRAS_ENFOQUE) if (re.test(enfoque)) lista.push(nombre);
    const unico = [...new Set(lista)];
    if (unico.length) out.enfoques = unico;
  }

  // Posiciones (solo si el texto las nombra)
  if (!e.posiciones || e.posiciones.length === 0) {
    const lista: string[] = [];
    for (const [nombre, re] of PALABRAS_POSICION) if (re.test(todo)) lista.push(nombre);
    if (/\binteriores\b/.test(todo)) lista.push("Ala-pívot", "Pívot");
    if (/\bexteriores\b/.test(todo)) lista.push("Base", "Escolta", "Alero");
    const unico = POSICIONES.filter((p) => lista.includes(p));
    if (unico.length) out.posiciones = unico;
  }

  // Modalidad
  if (!e.modalidad) {
    let m: string | null = null;
    if (e.tipo === "sistema" || /equipo completo|todo el equipo|\b5\s*(?:c|x|vs|v|contra)\s*5\b|colectivo/.test(titulo + " " + enfoque)) m = "equipo";
    else if (/individual|por separado|en solitario/.test(titulo + " " + enfoque) || jmin === 1) m = "individual";
    else if (/parejas|trios|grupos|por filas|\b[1-4]\s*(?:c|x|vs|v|contra)\s*[1-4]\b/.test(titulo + " " + enfoque)) m = "grupos";
    if (m) out.modalidad = m;
  }

  // Material: «6 conos», «2 balones», «1 balón por jugador»…
  const material = sinAcentos(e.material ?? "");
  if (material) {
    const jug = jmin ?? out.jugadores_min ?? null;
    for (const m of MATERIALES) {
      if (e[m.k] != null) continue;
      const n = cuentaMaterial(material, PALABRAS_MATERIAL[m.k], jug);
      if (n !== null) out[m.k] = n;
    }
  }
  return out;
}

/** Quita del objeto las columnas nuevas (por si la base de datos aún no tiene 0025) */
const COLUMNAS_NUEVAS = ["enfoques", "posiciones", "modalidad", "jugadores_max", "balones", "canastas", "conos", "petos"];
export function sinColumnasNuevas<T extends Record<string, unknown>>(o: T): T {
  const copia: Record<string, unknown> = { ...o };
  for (const k of COLUMNAS_NUEVAS) delete copia[k];
  return copia as T;
}
