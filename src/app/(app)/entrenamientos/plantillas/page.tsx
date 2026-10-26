import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import Enviar from "@/components/Enviar";
import { borrarPlantilla } from "../actions";
import { LayoutTemplate, Trash2 } from "lucide-react";

type Plantilla = {
  id: string; nombre: string; descripcion: string | null; equipo_id: string | null; autor_id: string; duracion_prevista: number;
  actividades: { titulo: string | null; tipo: string; duracion: number }[]; equipos: { nombre: string } | null;
};

export default async function PlantillasPage() {
  const { supabase, user, perfil } = await requireUser();
  const { data, error } = await supabase.from("plantillas_entreno").select("*, equipos(nombre)").order("nombre");
  const lista = (data ?? []) as unknown as Plantilla[];

  return (
    <div>
      <Link href="/entrenamientos" className="text-sm text-tinta/60 hover:underline">← Entrenamientos</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><LayoutTemplate className="text-azul" /> Plantillas de entreno</h1>
      <p className="max-w-2xl text-sm text-tinta/60">
        Sesiones tipo para reutilizar. Se crean desde un entreno («Guardar como plantilla») y se usan al crear o programar entrenos.
        Las del club las ven todos los equipos.
      </p>
      {error && /plantillas_entreno/.test(error.message) && <p className="tarjeta mt-4 p-3 text-sm text-red-700">Ejecuta <code>0008_plantillas_entreno.sql</code> en Supabase.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((p) => (
          <div key={p.id} className="tarjeta p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{p.nombre}</h2>
                <p className="text-xs text-tinta/60">{p.equipos?.nombre ?? "Del club"} · {p.duracion_prevista}′ · {p.actividades.length} actividades</p>
              </div>
              {(p.autor_id === user.id || perfil.rol === "coordinador") && (
                <form action={borrarPlantilla}>
                  <input type="hidden" name="id" value={p.id} />
                  <Enviar className="rounded p-1 text-tinta/35 hover:bg-red-50 hover:text-red-600" title="Borrar plantilla" confirmar={`¿Borrar la plantilla «${p.nombre}»?`}><Trash2 size={15} /></Enviar>
                </form>
              )}
            </div>
            {p.descripcion && <p className="mt-1 text-sm text-tinta/70">{p.descripcion}</p>}
            <ol className="mt-2 space-y-0.5 text-sm">
              {p.actividades.map((a, i) => (
                <li key={i} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {a.titulo ?? a.tipo}</span><span className="tabular-nums text-tinta/50">{a.duracion}′</span></li>
              ))}
            </ol>
          </div>
        ))}
        {!lista.length && !error && <p className="text-sm text-tinta/50">Todavía no hay plantillas. Abre un entreno y pulsa «Guardar como plantilla».</p>}
      </div>
    </div>
  );
}
