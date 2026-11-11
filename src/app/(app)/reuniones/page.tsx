import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga, hora, hoyLocal } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { crearReunion } from "./actions";
import Tareas, { type TareaV } from "./Tareas";
import { CalendarClock, Users } from "lucide-react";

export default async function ReunionesPage() {
  const { supabase, perfil, user } = await requireUser();
  const coord = perfil.rol === "coordinador";
  const [{ data: rs }, { data: ts }, { data: perfs }] = await Promise.all([
    supabase.from("reuniones").select("id, titulo, fecha, lugar, asistentes").order("fecha", { ascending: false }).limit(60),
    supabase.from("tareas").select("id, titulo, responsable_id, fecha_limite, hecha, reunion_id, reuniones(titulo), perfiles!tareas_responsable_id_fkey(nombre)").eq("responsable_id", user.id).order("fecha_limite", { nullsFirst: false }),
    supabase.from("perfiles").select("id, nombre").order("nombre"),
  ]);
  const ahora = new Date().toISOString();
  const reuniones = (rs ?? []) as { id: string; titulo: string; fecha: string; lugar: string | null; asistentes: string[] }[];
  const proximas = reuniones.filter((r) => r.fecha >= ahora).reverse(), pasadas = reuniones.filter((r) => r.fecha < ahora);
  const perfiles = ((perfs ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "—" }));
  const misTareas: TareaV[] = ((ts ?? []) as unknown as { id: string; titulo: string; responsable_id: string | null; fecha_limite: string | null; hecha: boolean; reunion_id: string | null; reuniones: { titulo: string } | null; perfiles: { nombre: string | null } | null }[])
    .map((t) => ({ id: t.id, titulo: t.titulo, responsable_id: t.responsable_id, responsable: t.perfiles?.nombre ?? null, fecha_limite: t.fecha_limite, hecha: t.hecha, reunion: t.reuniones?.titulo ?? null, reunion_id: t.reunion_id }));

  const Tarjeta = ({ r }: { r: (typeof reuniones)[number] }) => (
    <li><Link href={`/reuniones/${r.id}`} className="tarjeta flex items-center gap-3 p-3 hover:shadow-md">
      <CalendarClock size={20} className="shrink-0 text-azul" />
      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.titulo}</span>
        <span className="block text-xs capitalize text-tinta/60">{fechaLarga(r.fecha)} · {hora(r.fecha)}{r.lugar ? ` · ${r.lugar}` : ""}</span></span>
      <span className="flex items-center gap-1 text-xs text-tinta/50"><Users size={13} /> {r.asistentes.length}</span>
    </Link></li>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><CalendarClock className="text-azul" /> Reuniones de staff</h1>
      <p className="text-sm text-tinta/60">Orden del día, acta y tareas con responsable. Te avisa cuando te convocan o te asignan una tarea.</p>

      <section className="tarjeta mt-5 p-4">
        <h2 className="font-semibold">Mis tareas pendientes</h2>
        <Tareas tareas={misTareas.filter((t) => !t.hecha)} yo={user.id} crear={false} verReunion />
      </section>

      {coord && (
        <details className="tarjeta mt-4 p-4">
          <summary className="cursor-pointer font-semibold text-azul">+ Convocar reunión</summary>
          <form action={crearReunion} className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="sm:col-span-2"><label className="etiqueta">Título</label><input name="titulo" required placeholder="Ej.: Reunión de entrenadores" className="campo" /></div>
            <div><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={hoyLocal()} className="campo" /></div>
            <div><label className="etiqueta">Hora</label><input name="hora" type="time" defaultValue="20:00" className="campo" /></div>
            <div className="sm:col-span-4"><label className="etiqueta">Lugar o enlace</label><input name="lugar" placeholder="Local del club, Meet…" className="campo" /></div>
            <div className="sm:col-span-4"><label className="etiqueta">Orden del día</label><textarea name="orden_dia" rows={4} placeholder={"1. …\n2. …"} className="campo" /></div>
            <div className="sm:col-span-4">
              <span className="etiqueta">Convocados (les llega un aviso)</span>
              <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-linea p-2 sm:grid-cols-3">
                {perfiles.filter((p) => p.id !== user.id).map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="asistentes" value={p.id} /> <span className="truncate">{p.nombre}</span></label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-4"><Enviar>Convocar</Enviar></div>
          </form>
        </details>
      )}

      <h2 className="mt-6 font-semibold">Próximas</h2>
      <ul className="mt-2 space-y-2">{proximas.map((r) => <Tarjeta key={r.id} r={r} />)}{proximas.length === 0 && <li className="text-sm text-tinta/50">No hay reuniones convocadas.</li>}</ul>
      {pasadas.length > 0 && (<><h2 className="mt-6 font-semibold">Anteriores</h2><ul className="mt-2 space-y-2">{pasadas.map((r) => <Tarjeta key={r.id} r={r} />)}</ul></>)}
    </div>
  );
}
