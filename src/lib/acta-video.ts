// Emparejar las canastas del acta de la FCBQ (con su segundo de partido) con los tiros detectados en el vídeo.
// Las canastas ya confirmadas en la revisión sirven de referencia (segundo de vídeo ↔ segundo de partido):
// con ellas se calcula dónde debería estar cada canasta siguiente en el vídeo y se busca el tiro más cercano.
// Lo que no casa con ninguna canasta del acta es un fallo.

export type Prediccion = "canasta" | "fallo";
type Pendiente = { id: string; t: number; nota: number };

const RITMO = 2.2; // segundos de vídeo por segundo de partido (paradas, tiros libres, tiempos muertos…), por defecto

/** Segundo de vídeo previsto para un segundo de partido, a partir de las referencias [vídeo, partido] */
export function preverVideo(refs: [number, number][], g: number): number | null {
  if (!refs.length) return null;
  const r = [...refs].sort((a, b) => a[1] - b[1]);
  const pend = (a: [number, number], b: [number, number]) => {
    const p = (b[0] - a[0]) / Math.max(1, b[1] - a[1]);
    return Math.min(6, Math.max(1, p));
  };
  if (r.length === 1) return r[0][0] + (g - r[0][1]) * RITMO;
  for (let i = 1; i < r.length; i++) {
    if (g <= r[i][1]) {
      const a = r[i - 1], b = r[i];
      if (g >= a[1]) return a[0] + ((g - a[1]) * (b[0] - a[0])) / Math.max(1, b[1] - a[1]);
      return a[0] + (g - a[1]) * pend(a, b); // antes de la primera referencia
    }
  }
  const a = r[r.length - 2], b = r[r.length - 1];
  return b[0] + (g - b[1]) * pend(a, b); // después de la última
}

/**
 * @param acta     canastas propias del acta, en orden, con su segundo de partido (t)
 * @param anclas   segundos de vídeo de las canastas ya confirmadas, en orden (la n.º i del acta ↔ la i del vídeo)
 * @param pend     tiros detectados por revisar (propios), con su momento en el vídeo y lo claro que ve el detector la canasta
 */
export function emparejarActa(acta: { t?: number | null }[], anclas: number[], pend: Pendiente[]): Map<string, Prediccion> {
  const res = new Map<string, Prediccion>();
  const restantes = Math.max(0, acta.length - anclas.length);
  const refs: [number, number][] = anclas.map((v, i) => [v, acta[i]?.t ?? NaN] as [number, number]).filter(([, g]) => Number.isFinite(g));
  const ordenados = [...pend].sort((a, b) => a.t - b.t);

  if (!refs.length || !acta.slice(anclas.length).some((c) => typeof c.t === "number")) {
    // Sin referencias de tiempo: por descarte, las más claras son canastas
    [...pend].sort((a, b) => b.nota - a.nota).forEach((x, i) => res.set(x.id, i < restantes ? "canasta" : "fallo"));
    return res;
  }
  const usados = new Set<string>();
  let ultimo = anclas.length ? anclas[anclas.length - 1] : -Infinity;
  for (const c of acta.slice(anclas.length)) {
    if (typeof c.t !== "number") continue;
    const v = preverVideo(refs, c.t);
    if (v === null) continue;
    // Margen: crece con la distancia a la referencia más cercana (más incertidumbre lejos)
    const lejos = Math.min(...refs.map(([, g]) => Math.abs(g - c.t!)));
    const margen = Math.max(25, Math.min(180, lejos * 0.6));
    let mejor: Pendiente | null = null, mejorPunt = -Infinity;
    for (const p of ordenados) {
      if (usados.has(p.id) || p.t <= ultimo) continue;
      const d = Math.abs(p.t - v);
      if (d > margen) continue;
      const punt = p.nota * 8 - d / 3;
      if (punt > mejorPunt) { mejorPunt = punt; mejor = p; }
    }
    if (mejor) { usados.add(mejor.id); ultimo = mejor.t; }
  }
  for (const p of pend) res.set(p.id, usados.has(p.id) ? "canasta" : "fallo");
  return res;
}
