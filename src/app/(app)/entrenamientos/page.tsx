import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import SinEquipo from "@/components/SinEquipo";
import { crearEntreno } from "./actions";
import Enviar from "@/components/Enviar";

type Entreno = {
  id: string; fecha: string; titulo: string | null; duracion_prevista: number; lugar: string | null;
  entreno_actividades: { duracion: number }[];
};

export default async function EntrenamientosPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="sus entrenamientos" />;

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
      <h1 className="text-2xl font-semibold">Entrenamientos</h1>
      <p className="text-sm text-tinta/60">{equipo.nombre}</p>

      <form action={crearEntreno} className="tarjeta mt-5 grid grid-cols-2 gap-2 p-4 sm:grid-cols-6 sm:items-end">
        <input type="hidden" name="equipo_id" value={equipo.id} />
        <div className="col-span-1"><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={hoyLocal()} className="campo" /></div>
        <div className="col-span-1"><label className="etiqueta">Hora</label><input name="hora" type="time" defaultValue="18:00" className="campo" /></div>
        <div className="col-span-2"><label className="etiqueta">Título</label><input name="titulo" placeholder="Ej.: Bloqueo directo" className="campo" /></div>
        <div className="col-span-1"><label className="etiqueta">Minutos</label><input name="duracion_prevista" type="number" defaultValue={90} className="campo" /></div>
        <Enviar className="btn-primario col-span-1">Crear</Enviar>
        <div className="col-span-2 sm:col-span-3"><input name="lugar" placeholder="Pista (opcional)" className="campo" /></div>
      </form>

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
