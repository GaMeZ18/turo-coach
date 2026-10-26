import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import SinEquipo from "@/components/SinEquipo";
import { incorporarJugador } from "./actions";
import FormNuevoJugador from "./FormNuevoJugador";
import BotonEliminar from "./BotonEliminar";
import Enviar from "@/components/Enviar";
import PlantillaFCBQ, { type Candidato, type CambioDorsal } from "./PlantillaFCBQ";
import { parecido, separarNombre } from "@/lib/emparejar";
import type { StatsPartido } from "@/lib/stats-fcbq";

type Fila = {
  dorsal: number | null;
  posicion: string | null;
  jugadores: { id: string; nombre: string; apellidos: string | null; fecha_nacimiento: string | null };
};

export default async function JugadoresPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="su plantilla" />;

  const [{ data }, { data: todos }, { data: asistencias }, { data: statsRaw }] = await Promise.all([
    supabase
      .from("equipo_jugadores")
      .select("dorsal, posicion, jugadores(id, nombre, apellidos, fecha_nacimiento)")
      .eq("equipo_id", equipo.id),
    supabase.from("jugadores").select("id, nombre, apellidos").order("nombre"),
    supabase
      .from("asistencias")
      .select("jugador_id, estado, entrenamientos!inner(equipo_id)")
      .eq("entrenamientos.equipo_id", equipo.id),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipo.id),
  ]);

  const filas = ((data ?? []) as unknown as Fila[]).sort(
    (a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)
  );
  const enEquipo = new Set(filas.map((f) => f.jugadores.id));

  // Jugadores del equipo según las actas de la FCBQ (los que salen en el lado del Turó)
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
    let mejor: { f: Fila; p: number } | null = null;
    for (const f of filas) {
      const p = parecido(`${f.jugadores.nombre} ${f.jugadores.apellidos ?? ""}`, f.dorsal, x.completo, dorsalTxt ?? "");
      if (p >= 2 && (!mejor || p > mejor.p)) mejor = { f, p };
    }
    if (mejor) {
      if (dorsal !== null && mejor.f.dorsal !== dorsal) cambios.push({ jugadorId: mejor.f.jugadores.id, nombre: mejor.f.jugadores.nombre, antes: mejor.f.dorsal, dorsal });
    } else {
      candidatos.push({ ...separarNombre(x.completo), dorsal, completo: x.completo, partidos: x.partidos });
    }
  }
  candidatos.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const otros = (todos ?? []).filter((j) => !enEquipo.has(j.id));

  const pct = (id: string) => {
    const mias = (asistencias ?? []).filter((a) => a.jugador_id === id);
    if (!mias.length) return null;
    const ok = mias.filter((a) => a.estado === "presente" || a.estado === "tarde").length;
    return Math.round((ok / mias.length) * 100);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Jugadores</h1>
      <p className="text-sm text-tinta/60">{equipo.nombre} · {filas.length} jugadores</p>
      {!equipo.congelado && <PlantillaFCBQ equipoId={equipo.id} candidatos={candidatos} cambios={cambios} />}

      <div className="tarjeta mt-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-suave text-left text-xs uppercase tracking-wide text-tinta/60">
            <tr>
              <th className="w-14 px-3 py-2">#</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="hidden px-3 py-2 sm:table-cell">Posición</th>
              <th className="px-3 py-2 text-right">Asistencia</th>
              {!equipo.congelado && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const p = pct(f.jugadores.id);
              return (
                <tr key={f.jugadores.id} className="border-t border-linea hover:bg-suave/60">
                  <td className="px-3 py-2 font-semibold text-club">{f.dorsal ?? "–"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/jugadores/${f.jugadores.id}`} className="font-medium hover:underline">
                      {f.jugadores.nombre} {f.jugadores.apellidos}
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2 text-tinta/70 sm:table-cell">{f.posicion ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-tinta/70">{p === null ? "—" : `${p}%`}</td>
                  {!equipo.congelado && (
                    <td className="w-10 px-1 py-2 text-right">
                      <BotonEliminar equipoId={equipo.id} jugadorId={f.jugadores.id} nombre={`${f.jugadores.nombre} ${f.jugadores.apellidos ?? ""}`.trim()} />
                    </td>
                  )}
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-tinta/50">Aún no hay jugadores en este equipo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!equipo.congelado && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <FormNuevoJugador equipoId={equipo.id} />

          <form action={incorporarJugador} className="tarjeta space-y-3 p-4">
            <h2 className="font-medium">Incorporar jugador existente</h2>
            <p className="text-xs text-tinta/60">Para jugadores de otros equipos o de la temporada pasada.</p>
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <select name="jugador_id" className="campo" required>
              <option value="">Buscar jugador…</option>
              {otros.map((j) => (
                <option key={j.id} value={j.id}>{j.nombre} {j.apellidos}</option>
              ))}
            </select>
            <Enviar className="btn-secundario">Incorporar</Enviar>
          </form>
        </div>
      )}
    </div>
  );
}
