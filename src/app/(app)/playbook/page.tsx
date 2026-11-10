import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { todas } from "@/lib/db";
import { BookMarked, Printer } from "lucide-react";
import TodasSeguidas from "@/components/pizarra/TodasSeguidas";
import EditorPlaybook, { type ItemPlaybook } from "./EditorPlaybook";

export const metadata = { title: "Playbook" };

/** Las jugadas y ejercicios del equipo, con un enlace de solo lectura para los jugadores */
export default async function PlaybookPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <p className="text-sm text-tinta/60">Elige un equipo arriba para ver su playbook.</p>;
  const [{ data: eq }, { data: items }, { data: opciones }] = await Promise.all([
    supabase.from("equipos").select("playbook_token").eq("id", equipo.id).maybeSingle(),
    supabase.from("equipo_playbook").select("ejercicio_id, orden, notas, ejercicios(id, titulo, tipo, categoria, preview, pizarra)").eq("equipo_id", equipo.id).order("orden"),
    todas((d, h) => supabase.from("ejercicios").select("id, titulo, tipo, categoria").not("pizarra", "is", null).order("tipo", { ascending: false }).order("titulo").range(d, h)),
  ]);
  const lista = ((items ?? []) as unknown as { ejercicio_id: string; notas: string | null; ejercicios: ItemPlaybook["ej"] | null }[])
    .filter((x) => x.ejercicios).map((x) => ({ id: x.ejercicio_id, notas: x.notas, ej: x.ejercicios! }));
  const token = (eq as { playbook_token?: string | null } | null)?.playbook_token ?? null;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><BookMarked className="text-azul" /> Playbook · {equipo.nombre}</h1>
      <p className="max-w-2xl text-sm text-tinta/60">
        Las jugadas y sistemas del equipo. Crea un enlace para los jugadores: lo abren sin cuenta y ven cada jugada animada, sin poder cambiar nada.
        También puedes añadir desde cualquier ejercicio con el botón «Al playbook». <Link href="/ejercicios?tipo=sistema" className="text-azul underline">Ver sistemas</Link>
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        {lista.length > 0 && <Link href="/imprimir/playbook" className="btn-secundario"><Printer size={16} /> PDF paso a paso</Link>}
      </div>
      {lista.length > 0 && (
        <div className="mt-2">
          <TodasSeguidas nombre={`Jugadas · ${equipo.nombre}`} jugadas={lista.map((x) => ({ id: x.id, titulo: x.ej.titulo, notas: x.notas, pizarra: x.ej.pizarra }))} />
        </div>
      )}
      <EditorPlaybook
        equipoId={equipo.id}
        items={lista}
        opciones={(opciones ?? []) as { id: string; titulo: string; tipo: string; categoria: string | null }[]}
        url={token ? `https://coach.cbturo.com/jugadas/${token}` : null}
      />
    </div>
  );
}
