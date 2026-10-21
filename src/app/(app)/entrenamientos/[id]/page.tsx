import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga, hora } from "@/lib/fechas";
import { borrarEntreno, duplicarEntreno } from "../actions";
import Actividades from "./Actividades";
import Asistencia from "./Asistencia";
import { Copy, Trash2 } from "lucide-react";

export default async function EntrenoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: e } = await supabase
    .from("entrenamientos")
    .select("*, equipos(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const [{ data: actividades }, { data: ejercicios }, { data: plantilla }, { data: asistencias }] = await Promise.all([
    supabase
      .from("entreno_actividades")
      .select("id, orden, tipo, titulo, duracion, notas, ejercicio_id, ejercicios(titulo, preview, descripcion)")
      .eq("entrenamiento_id", id)
      .order("orden"),
    supabase.from("ejercicios").select("id, titulo, tipo, categoria, duracion").order("titulo"),
    supabase
      .from("equipo_jugadores")
      .select("dorsal, jugadores(id, nombre, apellidos)")
      .eq("equipo_id", e.equipo_id),
    supabase.from("asistencias").select("jugador_id, estado, motivo").eq("entrenamiento_id", id),
  ]);

  const jugadores = ((plantilla ?? []) as unknown as {
    dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null };
  }[])
    .map((p) => ({ id: p.jugadores.id, nombre: `${p.jugadores.nombre} ${p.jugadores.apellidos ?? ""}`.trim(), dorsal: p.dorsal }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));

  return (
    <div>
      <Link href="/entrenamientos" className="text-sm text-tinta/60 hover:underline">← Entrenamientos</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{e.titulo ?? "Entrenamiento"}</h1>
          <p className="text-sm capitalize text-tinta/60">
            {fechaLarga(e.fecha)} · {hora(e.fecha)} · {(e.equipos as { nombre: string } | null)?.nombre}
            {e.lugar ? ` · ${e.lugar}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={duplicarEntreno}>
            <input type="hidden" name="id" value={e.id} />
            <button className="btn-secundario" title="Copia este entreno a la semana siguiente"><Copy size={16} /> +1 semana</button>
          </form>
          <form action={borrarEntreno}>
            <input type="hidden" name="id" value={e.id} />
            <button className="btn-peligro" title="Borrar"><Trash2 size={16} /></button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Actividades
          entrenoId={e.id}
          inicio={e.fecha}
          prevista={e.duracion_prevista}
          actividades={(actividades ?? []) as never}
          ejercicios={ejercicios ?? []}
        />
        <Asistencia entrenoId={e.id} jugadores={jugadores} registros={asistencias ?? []} />
      </div>
    </div>
  );
}
