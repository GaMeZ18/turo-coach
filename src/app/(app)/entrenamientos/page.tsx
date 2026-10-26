import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import SinEquipo from "@/components/SinEquipo";
import { crearEntrenoDesde, programarEntrenos } from "./actions";
import { CalendarRange, ClipboardCheck, LayoutTemplate } from "lucide-react";
import Enviar from "@/components/Enviar";

type Entreno = {
  id: string; fecha: string; titulo: string | null; duracion_prevista: number; lugar: string | null;
  entreno_actividades: { duracion: number }[];
};

export default async function EntrenamientosPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="sus entrenamientos" />;

  const { data: plantillas } = await supabase.from("plantillas_entreno").select("id, nombre, equipo_id, duracion_prevista").order("nombre");
  const { data } = await supabase
    .from("entrenamientos")
    .select("id, fecha, titulo, duracion_prevista, lugar, entreno_actividades(duracion)")
    .eq("equipo_id", equipo.id)
    .order("fecha", { ascending: false })
    .limit(60);

  const ahora = Date.now() - 3 * 3600 * 1000; // un entreno de hoy sigue en "próximos" un rato
  const lista = (data ?? []) as Entreno[];
  const proximos = lista.filter((e) => new Date(e.fecha).getTime() >= ahora).reverse();
  const pasados = lista.filter((e) => new Date(e.fecha).getTime() < ahora);

  const Tarjeta = ({ e }: { e: Entreno }) => {
    const total = e.entreno_actividades.reduce((s, a) => s + a.duracion, 0);
    return (
      <Link href={`/entrenamientos/${e.id}`} className="tarjeta flex items-center gap-4 p-3 transition hover:shadow-md">
        <div className="w-16 shrink-0 text-center">
          <div className="text-xs uppercase text-tinta/50">{fechaCorta(e.fecha).split(",")[0]}</div>
          <div className="text-lg font-semibold leading-tight">{hora(e.fecha)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{e.titulo ?? "Entrenamiento"}</div>
          <div className="text-xs text-tinta/60">
            {fechaCorta(e.fecha)}{e.lugar ? ` · ${e.lugar}` : ""} · {e.entreno_actividades.length} actividades
          </div>
        </div>
        <div className={`text-sm tabular-nums ${total > e.duracion_prevista ? "text-red-700" : "text-tinta/60"}`}>
          {total}/{e.duracion_prevista}′
        </div>
      </Link>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Entrenamientos</h1>
          <p className="text-sm text-tinta/60">{equipo.nombre}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/entrenamientos/asistencia" className="btn-secundario"><ClipboardCheck size={16} /> Asistencia</Link>
          <Link href="/entrenamientos/plantillas" className="btn-secundario"><LayoutTemplate size={16} /> Plantillas</Link>
        </div>
      </div>

      <form action={crearEntrenoDesde} className="tarjeta mt-5 grid grid-cols-2 gap-2 p-4 sm:grid-cols-6 sm:items-end">
        <input type="hidden" name="equipo_id" value={equipo.id} />
        <div className="col-span-1"><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={hoyLocal()} className="campo" /></div>
        <div className="col-span-1"><label className="etiqueta">Hora</label><input name="hora" type="time" defaultValue="18:00" className="campo" /></div>
        <div className="col-span-2"><label className="etiqueta">Título</label><input name="titulo" placeholder="Ej.: Bloqueo directo" className="campo" /></div>
        <div className="col-span-1"><label className="etiqueta">Minutos</label><input name="duracion_prevista" type="number" defaultValue={90} className="campo" /></div>
        <Enviar className="btn-primario col-span-1">Crear</Enviar>
        <div className="col-span-2 sm:col-span-3"><input name="lugar" placeholder="Pista (opcional)" className="campo" /></div>
        <div className="col-span-2 sm:col-span-3">
          <select name="plantilla_id" className="campo" defaultValue="">
            <option value="">Sesión vacía</option>
            {(plantillas ?? []).map((p) => <option key={p.id} value={p.id}>Plantilla: {p.nombre} ({p.duracion_prevista}′){p.equipo_id ? "" : " · club"}</option>)}
          </select>
        </div>
      </form>

      <details className="tarjeta mt-3 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-azul [&::-webkit-details-marker]:hidden"><CalendarRange size={18} /> Programar varios entrenos (cada semana)</summary>
        <form action={programarEntrenos} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:items-end">
          <input type="hidden" name="equipo_id" value={equipo.id} />
          <div className="col-span-2 sm:col-span-6">
            <span className="etiqueta">Días</span>
            <div className="flex flex-wrap gap-1">
              {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                <label key={d} className="cursor-pointer">
                  <input type="checkbox" name="dias" value={i + 1} className="peer sr-only" />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-linea bg-white text-sm font-semibold peer-checked:border-azul peer-checked:bg-azul peer-checked:text-white">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <div><label className="etiqueta">Hora</label><input name="hora" type="time" defaultValue="18:00" className="campo" /></div>
          <div><label className="etiqueta">Minutos</label><input name="duracion_prevista" type="number" defaultValue={90} className="campo" /></div>
          <div><label className="etiqueta">Desde</label><input name="desde" type="date" required defaultValue={hoyLocal()} className="campo" /></div>
          <div><label className="etiqueta">Hasta</label><input name="hasta" type="date" required className="campo" /></div>
          <div className="col-span-2"><label className="etiqueta">Pista</label><input name="lugar" className="campo" /></div>
          <div className="col-span-2 sm:col-span-3">
            <select name="plantilla_id" className="campo" defaultValue="">
              <option value="">Sin plantilla (sesiones vacías)</option>
              {(plantillas ?? []).map((p) => <option key={p.id} value={p.id}>Plantilla: {p.nombre}</option>)}
            </select>
          </div>
          <div className="col-span-2"><input name="titulo" placeholder="Título (opcional)" className="campo" /></div>
          <Enviar className="btn-primario">Programar</Enviar>
          <p className="col-span-2 text-xs text-tinta/50 sm:col-span-6">Los días que ya tienen entreno se saltan. Aparecen también en el calendario.</p>
        </form>
      </details>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Próximos</h2>
      <div className="mt-2 space-y-2">
        {proximos.map((e) => <Tarjeta key={e.id} e={e} />)}
        {proximos.length === 0 && <p className="text-sm text-tinta/50">No hay entrenos programados.</p>}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Anteriores</h2>
      <div className="mt-2 space-y-2">
        {pasados.map((e) => <Tarjeta key={e.id} e={e} />)}
        {pasados.length === 0 && <p className="text-sm text-tinta/50">Todavía no hay entrenos pasados.</p>}
      </div>
    </div>
  );
}
