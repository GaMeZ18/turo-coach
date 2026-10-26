import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { diaInput, fechaLarga, hora, horaInput } from "@/lib/fechas";
import { borrarEntreno, duplicarEntreno, editarEntreno, guardarComoPlantilla } from "../actions";
import Actividades from "./Actividades";
import Asistencia from "./Asistencia";
import Objetivos from "./Objetivos";
import type { Objetivo } from "@/lib/objetivos";
import { Copy, LayoutTemplate, Pencil, Printer, Trash2 } from "lucide-react";
import Enviar from "@/components/Enviar";

export default async function EntrenoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await requireUser();

  const { data: e } = await supabase
    .from("entrenamientos")
    .select("*, equipos(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const [{ data: actividades }, { data: ejercicios }, { data: plantilla }, { data: asistencias }, { data: planes }, { data: marcados }, { data: temporada }] = await Promise.all([
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
    // Planificaciones del club y de este equipo (si aún no existe la tabla, simplemente no hay)
    supabase.from("planificaciones").select("id, nombre, equipo_id, temporada_id, objetivos(id, planificacion_id, padre_id, nombre, descripcion, color, orden)").or(`equipo_id.is.null,equipo_id.eq.${e.equipo_id}`).order("created_at"),
    supabase.from("entreno_objetivos").select("objetivo_id").eq("entrenamiento_id", id),
    supabase.from("temporadas").select("id").eq("actual", true).maybeSingle(),
  ]);
  const planesEntreno = ((planes ?? []) as unknown as { id: string; nombre: string; equipo_id: string | null; temporada_id: string | null; objetivos: Objetivo[] }[])
    .filter((p) => !p.temporada_id || p.temporada_id === temporada?.id)
    .sort((a, b) => (a.equipo_id ? 0 : 1) - (b.equipo_id ? 0 : 1))
    .map((p) => ({ id: p.id, nombre: p.nombre, club: !p.equipo_id, objetivos: p.objetivos ?? [] }));

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
        <div className="flex flex-wrap gap-2">
          <Link href={`/imprimir/entreno/${e.id}`} className="btn-secundario" title="Imprimir o guardar en PDF"><Printer size={16} /> PDF</Link>
          <form action={duplicarEntreno}>
            <input type="hidden" name="id" value={e.id} />
            <Enviar className="btn-secundario" title="Copia este entreno a la semana siguiente"><Copy size={16} /> +1 semana</Enviar>
          </form>
          <form action={borrarEntreno}>
            <input type="hidden" name="id" value={e.id} />
            <Enviar className="btn-peligro" title="Borrar entrenamiento" confirmar="¿Borrar este entrenamiento con sus actividades y la asistencia? No se puede deshacer."><Trash2 size={16} /></Enviar>
          </form>
        </div>
      </div>

      {e.notas && <p className="mt-3 whitespace-pre-line rounded-lg bg-oro/15 p-3 text-sm">{e.notas}</p>}

      <details className="mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-1 text-sm text-azul hover:underline">
          <Pencil size={14} /> Editar fecha, hora y datos
        </summary>
        <form action={editarEntreno} className="tarjeta mt-2 grid grid-cols-2 gap-2 p-4 sm:grid-cols-6 sm:items-end">
          <input type="hidden" name="id" value={e.id} />
          <div><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={diaInput(e.fecha)} className="campo" /></div>
          <div><label className="etiqueta">Hora</label><input name="hora" type="time" required defaultValue={horaInput(e.fecha)} className="campo" /></div>
          <div className="col-span-2"><label className="etiqueta">Título</label><input name="titulo" defaultValue={e.titulo ?? ""} className="campo" /></div>
          <div><label className="etiqueta">Minutos</label><input name="duracion_prevista" type="number" min={0} defaultValue={e.duracion_prevista} className="campo" /></div>
          <div><label className="etiqueta">Pista</label><input name="lugar" defaultValue={e.lugar ?? ""} className="campo" /></div>
          <div className="col-span-2 sm:col-span-5"><label className="etiqueta">Notas del entreno</label><textarea name="notas" rows={2} defaultValue={e.notas ?? ""} className="campo" placeholder="Objetivo de la sesión, material, avisos…" /></div>
          <Enviar>Guardar</Enviar>
        </form>
      </details>

      <Objetivos entrenoId={e.id} planes={planesEntreno} seleccionados={(marcados ?? []).map((m) => m.objetivo_id as string)} />

      <details className="mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-1 text-sm text-azul hover:underline">
          <LayoutTemplate size={14} /> Guardar como plantilla
        </summary>
        <form action={guardarComoPlantilla} className="tarjeta mt-2 grid max-w-xl gap-2 p-4">
          <input type="hidden" name="id" value={e.id} />
          <input name="nombre" required defaultValue={e.titulo ?? ""} placeholder="Nombre de la plantilla" className="campo" />
          <textarea name="descripcion" rows={2} placeholder="Para qué sirve (opcional)" className="campo" />
          {perfil.rol === "coordinador" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="club" value="1" /> Plantilla del club (para todos los equipos)</label>}
          <Enviar>Guardar plantilla</Enviar>
        </form>
      </details>

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
