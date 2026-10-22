// Árbol de objetivos de una planificación
export type Objetivo = {
  id: string;
  planificacion_id: string;
  padre_id: string | null;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  orden: number;
};
export type Nodo = Objetivo & { hijos: Nodo[]; nivel: number; colorFinal: string };

export const COLORES_OBJETIVO = ["#002b8e", "#d6001c", "#0f9d58", "#ef7d00", "#7b1fa2", "#00838f", "#c2185b", "#6d4c41", "#b8860b", "#455a64"];

/** Construye el árbol (los hijos sin color heredan el del padre) */
export function arbol(lista: Objetivo[]): Nodo[] {
  const hijosDe = new Map<string | null, Objetivo[]>();
  for (const o of lista) hijosDe.set(o.padre_id, [...(hijosDe.get(o.padre_id) ?? []), o]);
  const ids = new Set(lista.map((o) => o.id));
  const construir = (padre: string | null, nivel: number, colorPadre: string | null, i0 = 0): Nodo[] =>
    (hijosDe.get(padre) ?? [])
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
      .map((o, i) => {
        const colorFinal = o.color || colorPadre || COLORES_OBJETIVO[(i0 + i) % COLORES_OBJETIVO.length];
        return { ...o, nivel, colorFinal, hijos: construir(o.id, nivel + 1, colorFinal) };
      });
  // Raíces: sin padre, o con un padre que ya no existe
  const raices = lista.filter((o) => !o.padre_id || !ids.has(o.padre_id));
  if (raices.some((o) => o.padre_id)) for (const o of raices) if (o.padre_id) hijosDe.set(null, [...(hijosDe.get(null) ?? []), { ...o, padre_id: null }]);
  return construir(null, 0, null);
}

/** Recorre el árbol en orden (para pintarlo como lista con sangría) */
export function aplanar(nodos: Nodo[]): Nodo[] {
  return nodos.flatMap((n) => [n, ...aplanar(n.hijos)]);
}

/** El objetivo y todos sus descendientes */
export function conDescendientes(n: Nodo): string[] {
  return [n.id, ...n.hijos.flatMap(conDescendientes)];
}
