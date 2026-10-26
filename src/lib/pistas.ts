// Reparto de pistas: detectar entrenos que coinciden en la misma pista más allá de su capacidad.
export type Pista = { id: string; nombre: string; capacidad: number; orden: number; notas: string | null; partidos_casa?: boolean };
export type Ocupacion = { id: string; equipo_id: string; fecha: string; duracion: number | null; lugar: string | null; tipo?: "entreno" | "partido"; detalle?: string | null };

export const normPista = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();

const fin = (o: Ocupacion) => new Date(o.fecha).getTime() + Math.max(15, o.duracion || 90) * 60000;
const ini = (o: Ocupacion) => new Date(o.fecha).getTime();

/** Devuelve, para cada entreno con conflicto, los entrenos con los que coincide */
export function solapes(ocup: Ocupacion[], pistas: Pista[]) {
  const cap = new Map(pistas.map((p) => [normPista(p.nombre), p.capacidad]));
  const porPista = new Map<string, Ocupacion[]>();
  for (const o of ocup) {
    const k = normPista(o.lugar);
    if (!k) continue;
    porPista.set(k, [...(porPista.get(k) ?? []), o]);
  }
  const conflictos = new Map<string, string[]>();
  for (const [k, lista] of porPista) {
    const c = cap.get(k) ?? 1;
    for (const o of lista) {
      const con = lista.filter((x) => x.id !== o.id && ini(x) < fin(o) && ini(o) < fin(x));
      if (con.length + 1 > c) conflictos.set(o.id, con.map((x) => x.id));
    }
  }
  return conflictos;
}

/** Lunes (YYYY-MM-DD) de la semana de una fecha local */
export function lunesDe(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export const sumarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
