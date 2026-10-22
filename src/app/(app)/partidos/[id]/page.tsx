import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { diaInput, fechaLarga, hora, horaInput } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { borrarPartido, editarPartido, guardarResultado } from "../actions";
import { Resultado, type Partido } from "../comun";
import Convocatoria from "./Convocatoria";
import { MapPin, Pencil, Trash2 } from "lucide-react";

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("partidos").select("*, equipos(nombre)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Partido & { equipo_id: string; notas: string | null; equipos: { nombre: string } | null };
  const equipo = p.equipos?.nombre ?? "Equipo";

  const [{ data: plantilla }, { data: conv }] = await Promise.all([
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", p.equipo_id),
    supabase.from("convocatorias").select("jugador_id").eq("partido_id", id),
  ]);
  const jugadores = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .map((x) => ({ id: x.jugadores.id, nombre: `${x.jugadores.nombre} ${x.jugadores.apellidos ?? ""}`.trim(), dorsal: x.dorsal }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const convocados = (conv ?? []).map((c) => c.jugador_id);

  const local = p.local ? equipo : p.rival;
  const visitante = p.local ? p.rival : equipo;

  return (
    <div>
      <Link href="/partidos" className="text-sm text-tinta/60 hover:underline">← Partidos</Link>

      {/* Marcador */}
      <div className="tarjeta mt-2 overflow-hidden">
        <div className="bg-azul px-4 py-2 text-xs font-semibold uppercase tracking-wide text-oro">
          {p.competicion ?? "Partido"}{p.jornada ? ` · Jornada ${p.jornada}` : ""}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 text-center">
          <div className={`font-[family-name:var(--font-titulo)] text-xl font-bold uppercase ${p.local ? "text-azul" : ""}`}>{local}</div>
          <div className="text-3xl font-bold tabular-nums text-tinta">
            {p.puntos_favor !== null && p.puntos_contra !== null
              ? p.local ? `${p.puntos_favor} – ${p.puntos_contra}` : `${p.puntos_contra} – ${p.puntos_favor}`
              : <span className="text-base font-medium text-tinta/50">vs</span>}
          </div>
          <div className={`font-[family-name:var(--font-titulo)] text-xl font-bold uppercase ${!p.local ? "text-azul" : ""}`}>{visitante}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-linea px-4 py-2 text-sm text-tinta/70">
          <span className="capitalize">{fechaLarga(p.fecha)} · {hora(p.fecha)}</span>
          {p.lugar && <span className="flex items-center gap-1"><MapPin size={14} /> {p.lugar}</span>}
          <Resultado p={p} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Resultado y notas */}
          <form action={guardarResultado} className="tarjeta space-y-3 p-4">
            <input type="hidden" name="id" value={p.id} />
            <h2 className="font-semibold">Resultado</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="etiqueta">{equipo}</label><input name="puntos_favor" type="number" min={0} defaultValue={p.puntos_favor ?? ""} className="campo !w-24 text-center text-lg font-bold" /></div>
              <div><label className="etiqueta">{p.rival}</label><input name="puntos_contra" type="number" min={0} defaultValue={p.puntos_contra ?? ""} className="campo !w-24 text-center text-lg font-bold" /></div>
              <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" name="aplazado" value="1" defaultChecked={p.estado === "aplazado"} /> Aplazado</label>
            </div>
            <div>
              <label className="etiqueta">Notas del partido</label>
              <textarea name="notas" rows={4} defaultValue={p.notas ?? ""} className="campo" placeholder="Qué funcionó, qué hay que trabajar, incidencias…" />
            </div>
            <Enviar>Guardar</Enviar>
          </form>

          {/* Datos del partido */}
          <details className="tarjeta p-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-azul [&::-webkit-details-marker]:hidden">
              <Pencil size={15} /> Editar datos del partido
            </summary>
            <form action={editarPartido} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input type="hidden" name="id" value={p.id} />
              <div><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={diaInput(p.fecha)} className="campo" /></div>
              <div><label className="etiqueta">Hora</label><input name="hora" type="time" required defaultValue={horaInput(p.fecha)} className="campo" /></div>
              <div className="col-span-2"><label className="etiqueta">Rival</label><input name="rival" required defaultValue={p.rival} className="campo" /></div>
              <div>
                <label className="etiqueta">Dónde</label>
                <select name="local" defaultValue={p.local ? "casa" : "fuera"} className="campo"><option value="casa">En casa</option><option value="fuera">Fuera</option></select>
              </div>
              <div><label className="etiqueta">Jornada</label><input name="jornada" type="number" min={1} defaultValue={p.jornada ?? ""} className="campo" /></div>
              <div className="col-span-2"><label className="etiqueta">Competición</label><input name="competicion" defaultValue={p.competicion ?? ""} className="campo" /></div>
              <div className="col-span-2 sm:col-span-3"><label className="etiqueta">Pista</label><input name="lugar" defaultValue={p.lugar ?? ""} className="campo" /></div>
              <div className="flex items-end"><Enviar>Guardar</Enviar></div>
            </form>
            <form action={borrarPartido} className="mt-4 border-t border-linea pt-3">
              <input type="hidden" name="id" value={p.id} />
              <Enviar className="btn-peligro !px-0" confirmar="¿Borrar este partido y su convocatoria? No se puede deshacer."><Trash2 size={15} /> Borrar partido</Enviar>
            </form>
          </details>
        </div>

        <Convocatoria partidoId={p.id} jugadores={jugadores} convocados={convocados} />
      </div>
    </div>
  );
}
