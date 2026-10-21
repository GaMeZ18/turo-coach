import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { urlEmbed } from "@/lib/video";
import { borrarEjercicio, duplicarEjercicio } from "../actions";
import VisorPizarra from "./VisorPizarra";
import { Copy, Pencil, Trash2 } from "lucide-react";

export default async function VerEjercicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data: e } = await supabase
    .from("ejercicios")
    .select("*, perfiles(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const puedeEditar = e.autor_id === user.id || perfil.rol === "coordinador";
  const video = urlEmbed(e.video_url);

  return (
    <div>
      <Link href="/ejercicios" className="text-sm text-tinta/60 hover:underline">← Ejercicios</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-club">
            {e.tipo === "sistema" ? "Sistema de juego" : "Ejercicio"}{e.categoria ? ` · ${e.categoria}` : ""}
          </p>
          <h1 className="text-2xl font-semibold">{e.titulo}</h1>
          <p className="text-sm text-tinta/60">
            {(e.perfiles as { nombre: string | null } | null)?.nombre}
            {e.duracion ? ` · ${e.duracion} min` : ""}{e.jugadores_min ? ` · ${e.jugadores_min} jugadores` : ""}
            {e.visibilidad === "privado" ? " · privado" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {puedeEditar && <Link href={`/ejercicios/${e.id}/editar`} className="btn-primario"><Pencil size={16} /> Editar</Link>}
          <form action={duplicarEjercicio}>
            <input type="hidden" name="id" value={e.id} />
            <button className="btn-secundario" title="Hacer una copia para modificarla"><Copy size={16} /> Copiar</button>
          </form>
          {puedeEditar && (
            <form action={borrarEjercicio}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn-peligro" title="Borrar"><Trash2 size={16} /></button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {e.pizarra ? <VisorPizarra pizarra={e.pizarra} /> : (
            <div className="tarjeta p-8 text-center text-sm text-tinta/50">Este ejercicio no tiene pizarra.</div>
          )}
        </div>
        <div className="space-y-4">
          {e.descripcion && (
            <section>
              <h2 className="etiqueta">Descripción</h2>
              <p className="whitespace-pre-line text-sm">{e.descripcion}</p>
            </section>
          )}
          {e.correcciones && (
            <section>
              <h2 className="etiqueta">Correcciones</h2>
              <p className="whitespace-pre-line text-sm">{e.correcciones}</p>
            </section>
          )}
          {e.etiquetas?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {e.etiquetas.map((t: string) => (
                <Link key={t} href={`/ejercicios?q=${encodeURIComponent(t)}`} className="rounded-full bg-suave px-2.5 py-0.5 text-xs hover:bg-linea">#{t}</Link>
              ))}
            </div>
          )}
          {video && (
            <div className="aspect-video overflow-hidden rounded-xl border border-linea bg-black">
              <iframe src={video} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Vídeo del ejercicio" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
