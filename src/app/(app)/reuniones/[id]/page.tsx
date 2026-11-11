import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga, hora } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { borrarReunion } from "../actions";
import Tareas, { type TareaV } from "../Tareas";
import { Convocados, TextoReunion } from "./Editor";
import { MapPin, Trash2 } from "lucide-react";

export default async function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil, user } = await requireUser();
  const [{ data: r }, { data: ts }, { data: perfs }] = await Promise.all([
    supabase.from("reuniones").select("*").eq("id", id).maybeSingle(),
    supabase.from("tareas").select("id, titulo, responsable_id, fecha_limite, hecha, perfiles!tareas_responsable_id_fkey(nombre)").eq("reunion_id", id).order("created_at"),
    supabase.from("perfiles").select("id, nombre").order("nombre"),
  ]);
  if (!r) notFound();
  const perfiles = ((perfs ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "—" }));
  const tareas: TareaV[] = ((ts ?? []) as unknown as { id: string; titulo: string; responsable_id: string | null; fecha_limite: string | null; hecha: boolean; perfiles: { nombre: string | null } | null }[])
    .map((t) => ({ id: t.id, titulo: t.titulo, responsable_id: t.responsable_id, responsable: t.perfiles?.nombre ?? null, fecha_limite: t.fecha_limite, hecha: t.hecha }));
  const puedeBorrar = perfil.rol === "coordinador" || r.creado_por === user.id;
  const pasada = r.fecha < new Date().toISOString();

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/reuniones" className="text-sm text-tinta/60 hover:underline">← Reuniones</Link>
        <div className="mt-1 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{r.titulo}</h1>
            <p className="text-sm capitalize text-tinta/60">{fechaLarga(r.fecha)} · {hora(r.fecha)}</p>
            {r.lugar && <p className="flex items-center gap-1 text-sm text-tinta/60"><MapPin size={13} /> {/^https?:\/\//.test(r.lugar) ? <a href={r.lugar} className="text-azul underline" target="_blank" rel="noopener noreferrer">{r.lugar}</a> : r.lugar}</p>}
          </div>
          {puedeBorrar && (
            <form action={borrarReunion}><input type="hidden" name="id" value={r.id} /><Enviar className="btn-peligro" confirmar="¿Borrar la reunión con su acta y tareas?"><Trash2 size={15} /></Enviar></form>
          )}
        </div>
      </div>
      <Convocados id={r.id} perfiles={perfiles} asistentes={r.asistentes ?? []} editable={perfil.rol === "coordinador" || r.creado_por === user.id} />
      <TextoReunion id={r.id} campo="orden_dia" valor={r.orden_dia} titulo="Orden del día" placeholder={"1. …\n2. …"} filas={pasada ? 4 : 6} />
      <TextoReunion id={r.id} campo="acta" valor={r.acta} titulo="Acta" placeholder="Qué se ha hablado y qué se ha decidido. Se guarda solo." filas={pasada ? 10 : 6} />
      <section className="tarjeta p-4">
        <h2 className="font-semibold">Tareas</h2>
        <p className="text-xs text-tinta/50">Al responsable le llega un aviso y la ve en su Inicio hasta que la marca como hecha.</p>
        <Tareas tareas={tareas} perfiles={perfiles} reunionId={r.id} yo={user.id} />
      </section>
    </div>
  );
}
