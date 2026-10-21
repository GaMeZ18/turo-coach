import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import SinEquipo from "@/components/SinEquipo";
import { incorporarJugador } from "./actions";
import FormNuevoJugador from "./FormNuevoJugador";

type Fila = {
  dorsal: number | null;
  posicion: string | null;
  jugadores: { id: string; nombre: string; apellidos: string | null; fecha_nacimiento: string | null };
};

export default async function JugadoresPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="su plantilla" />;

  const [{ data }, { data: todos }, { data: asistencias }] = await Promise.all([
    supabase
      .from("equipo_jugadores")
      .select("dorsal, posicion, jugadores(id, nombre, apellidos, fecha_nacimiento)")
      .eq("equipo_id", equipo.id),
    supabase.from("jugadores").select("id, nombre, apellidos").order("nombre"),
    supabase
      .from("asistencias")
      .select("jugador_id, estado, entrenamientos!inner(equipo_id)")
      .eq("entrenamientos.equipo_id", equipo.id),
  ]);

  const filas = ((data ?? []) as unknown as Fila[]).sort(
    (a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)
  );
  const enEquipo = new Set(filas.map((f) => f.jugadores.id));
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

      <div className="tarjeta mt-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-suave text-left text-xs uppercase tracking-wide text-tinta/60">
            <tr>
              <th className="w-14 px-3 py-2">#</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="hidden px-3 py-2 sm:table-cell">Posición</th>
              <th className="px-3 py-2 text-right">Asistencia</th>
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
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-tinta/50">Aún no hay jugadores en este equipo.</td></tr>
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
            <button className="btn-secundario">Incorporar</button>
          </form>
        </div>
      )}
    </div>
  );
}
