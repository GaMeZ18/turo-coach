import type { SupabaseClient } from "@supabase/supabase-js";
import { parecido, separarNombre } from "./emparejar";
import type { StatsPartido } from "./stats-fcbq";

export type Candidato = { nombre: string; apellidos: string; dorsal: number | null; completo: string; partidos: number };
export type CambioDorsal = { jugadorId: string; nombre: string; antes: number | null; dorsal: number | null };

/** Jugadores que salen en las actas de la FCBQ del equipo y no están en su plantilla, y dorsales distintos */
export async function plantillaDesdeActas(supabase: SupabaseClient, equipoId: string) {
  const [{ data: plantilla }, { data: statsRaw }] = await Promise.all([
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", equipoId),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipoId),
  ]);
  const filas = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } | null }[]).filter((f) => f.jugadores);

  const deActas = new Map<string, { completo: string; dorsales: Map<string, number>; partidos: number }>();
  for (const { datos: st } of (statsRaw ?? []) as { datos: StatsPartido }[]) {
    const lado = /TUR[OÓ]/i.test(st.local.nombre) ? st.local : /TUR[OÓ]/i.test(st.visitante.nombre) ? st.visitante : null;
    for (const j of lado?.jugadores ?? []) {
      const k = j.uuid ?? j.nombre;
      const x = deActas.get(k) ?? { completo: j.nombre, dorsales: new Map<string, number>(), partidos: 0 };
      x.partidos++;
      if (j.dorsal) x.dorsales.set(j.dorsal, (x.dorsales.get(j.dorsal) ?? 0) + 1);
      deActas.set(k, x);
    }
  }
  const candidatos: Candidato[] = [];
  const cambios: CambioDorsal[] = [];
  for (const x of deActas.values()) {
    const dorsalTxt = [...x.dorsales.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const dorsal = dorsalTxt && /^\d+$/.test(dorsalTxt) ? Number(dorsalTxt) : null;
    let mejor: { f: (typeof filas)[number]; p: number } | null = null;
    for (const f of filas) {
      const p = parecido(`${f.jugadores!.nombre} ${f.jugadores!.apellidos ?? ""}`, f.dorsal, x.completo, dorsalTxt ?? "");
      if (p >= 2 && (!mejor || p > mejor.p)) mejor = { f, p };
    }
    if (mejor) {
      if (dorsal !== null && mejor.f.dorsal !== dorsal) cambios.push({ jugadorId: mejor.f.jugadores!.id, nombre: mejor.f.jugadores!.nombre, antes: mejor.f.dorsal, dorsal });
    } else {
      candidatos.push({ ...separarNombre(x.completo), dorsal, completo: x.completo, partidos: x.partidos });
    }
  }
  candidatos.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  return { candidatos, cambios };
}
