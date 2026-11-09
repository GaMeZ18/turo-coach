// Datos de cada ejercicio para filtrar (material, jugadores, focos, posiciones y tipo de trabajo).
// Si el entrenador no los rellena, se deducen de la pizarra, la categoría, las etiquetas y el título
// (mismas reglas que la migración 0025_ejercicios_datos.sql).
import { CATEGORIAS } from "./categorias";

export const FOCOS = CATEGORIAS;
export const POSICIONES = ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"] as const;
export const FORMATOS: { v: string; t: string }[] = [
  { v: "individual", t: "Individual" },
  { v: "parejas", t: "Por parejas" },
  { v: "reducido", t: "Grupos reducidos (2c2–4c4)" },
  { v: "equipo", t: "Equipo (5c5 / sistema)" },
  { v: "circuito", t: "Filas o circuito (todo el grupo)" },
];
export const nombreFormato = (v?: string | null) => FORMATOS.find((f) => f.v === v)?.t ?? "";
export const RANGOS_JUGADORES: { v: string; t: string; min: number; max: number }[] = [
  { v: "1-2", t: "1–2 jugadores", min: 1, max: 2 },
  { v: "3-6", t: "3–6 jugadores", min: 3, max: 6 },
  { v: "7-10", t: "7–10 jugadores", min: 7, max: 10 },
  { v: "11+", t: "Más de 10", min: 11, max: 99 },
];

export type Rasgos = { balones: number | null; canastas: number; conos: number; jugadores: number | null; focos: string[]; posiciones: string[]; formato: string };
type Fuente = { pizarra?: unknown; titulo?: string | null; categoria?: string | null; etiquetas?: string[] | null; tipo?: string | null; jugadores_min?: number | null };

export function rasgosDe(e: Fuente): Rasgos {
  const p = (e.pizarra ?? {}) as { elementos?: { tipo: string }[]; vista?: string };
  const els = p.elementos ?? [];
  const n = (tipos: string[]) => els.filter((x) => tipos.includes(x.tipo)).length;
  const nbal = n(["balon"]), ncon = n(["cono", "chino", "pica", "valla"]), ncan = n(["canasta"]), njugP = n(["atacante", "defensor"]);
  const njug = njugP > 0 ? njugP : e.jugadores_min ?? null;
  const t = `${e.titulo ?? ""} ${e.categoria ?? ""} ${(e.etiquetas ?? []).join(" ")}`.toLowerCase();
  const focos = new Set<string>();
  if (e.categoria) focos.add(e.categoria);
  const regla: [RegExp, string][] = [
    [/tiro|tirador|triple|finaliz|bandeja|tiro libre/, "Tiro"], [/rebote/, "Rebote"],
    [/defensa|defender|cierre|ayuda|shell|presión|negaci/, "Defensa"], [/pase|pases/, "Pase"], [/bote|manejo/, "Bote"],
    [/transición|contraataque|toda la pista/, "Transición"], [/calentamiento/, "Calentamiento"], [/físico|condición|fatiga/, "Físico"],
    [/1c1|2c2|3c3|4c4|juego reducido/, "Juego reducido"], [/atacar|ataque|bloqueo|poste|mano a mano/, "Ataque"],
  ];
  for (const [re, f] of regla) if (re.test(t)) focos.add(f);
  if (e.tipo === "sistema") focos.add("Sistema de juego");
  const posiciones = /poste|interior|gancho|pívot|pivot/.test(t) ? ["Ala-pívot", "Pívot"]
    : /bloqueo directo|pick/.test(t) ? ["Base", "Escolta", "Ala-pívot", "Pívot"]
    : e.categoria === "Bote" ? ["Base", "Escolta", "Alero"] : [...POSICIONES];
  const j = njug ?? 0;
  const formato = e.tipo === "sistema" || /5c5/.test(t) || j >= 10 ? "equipo"
    : /filas|rueda|circuito|estrella|carriles|calentamiento/.test(t) && j >= 4 ? "circuito"
    : j <= 1 ? "individual" : j === 2 ? "parejas" : "reducido";
  return { balones: nbal || null, canastas: ncan || (p.vista === "completa" ? 2 : 1), conos: ncon, jugadores: njug, focos: [...focos], posiciones, formato };
}

/** Filtros de búsqueda comunes (Ejercicios y Biblioteca) aplicados a una consulta de Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltros<Q extends { or: (...a: any[]) => Q; contains: (...a: any[]) => Q; eq: (...a: any[]) => Q; gte: (...a: any[]) => Q; lte: (...a: any[]) => Q }>(
  q: Q, f: { foco?: string; edad?: string; pos?: string; formato?: string; jug?: string; balones?: string },
): Q {
  if (f.foco) q = q.or(`categoria.eq."${f.foco}",focos.cs.{"${f.foco}"}`);
  if (f.edad) q = q.contains("edades", [f.edad]);
  if (f.pos) q = q.contains("posiciones", [f.pos]);
  if (f.formato) q = q.eq("formato", f.formato);
  const r = RANGOS_JUGADORES.find((x) => x.v === f.jug);
  if (r) q = q.gte("jugadores_min", r.min).lte("jugadores_min", r.max);
  if (f.balones === "1") q = q.lte("balones", 1);
  return q;
}
