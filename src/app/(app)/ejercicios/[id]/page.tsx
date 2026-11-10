import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { esVertical, urlEmbed } from "@/lib/video";
import { alternarBiblioteca, borrarEjercicio, duplicarEjercicio } from "../actions";
import VisorPizarra from "./VisorPizarra";
import Social from "./Social";
import AlPlaybook from "./AlPlaybook";
import { misEquipos } from "@/lib/equipo-activo";
import Historial from "@/components/Historial";
import { Copy, Library, Pencil, Trash2, PlayCircle } from "lucide-react";
import Enviar from "@/components/Enviar";
import { nombreFormato } from "@/lib/rasgos-ejercicio";

export default async function VerEjercicio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data: e } = await supabase
    .from("ejercicios")
    .select("*, perfiles!ejercicios_autor_id_fkey(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const esCoord = perfil.rol === "coordinador";
  const [{ data: fav }, { data: mg }, { equipos: mios }] = await Promise.all([
    supabase.from("ejercicio_favoritos").select("ejercicio_id").eq("ejercicio_id", id).eq("perfil_id", user.id).maybeSingle(),
    supabase.from("ejercicio_megusta").select("ejercicio_id").eq("ejercicio_id", id).eq("perfil_id", user.id).maybeSingle(),
    misEquipos(supabase),
  ]);

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
          {(e.en_biblioteca || e.edades?.length > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {e.en_biblioteca && <Link href="/biblioteca" className="inline-flex items-center gap-1 rounded-full bg-oro/30 px-2 py-0.5 text-xs font-semibold text-tinta"><Library size={12} /> Biblioteca del club</Link>}
              {(e.edades ?? []).map((x: string) => <span key={x} className="rounded-full bg-azul/10 px-2 py-0.5 text-xs text-azul">{x}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Social id={e.id} titulo={e.titulo} favorito={!!fav} megusta={!!mg} total={e.megusta ?? 0} />
          {e.pizarra && <AlPlaybook ejercicioId={e.id} equipos={mios.map((q) => ({ id: q.id, nombre: q.nombre }))} />}
          {puedeEditar && <Link href={`/ejercicios/${e.id}/editar`} className="btn-primario"><Pencil size={16} /> Editar</Link>}
          <form action={duplicarEjercicio}>
            <input type="hidden" name="id" value={e.id} />
            <Enviar className="btn-secundario" title="Hacer una copia para modificarla"><Copy size={16} /> Copiar</Enviar>
          </form>
          {puedeEditar && "en_biblioteca" in e && (
            <form action={alternarBiblioteca}>
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="poner" value={e.en_biblioteca ? "0" : "1"} />
              <Enviar className="btn-secundario" title={e.en_biblioteca ? "Quitar de la Biblioteca del club" : "Publicar en la Biblioteca del club"}>
                <Library size={16} /> {e.en_biblioteca ? "Quitar de la biblioteca" : "A la biblioteca"}
              </Enviar>
            </form>
          )}
          {puedeEditar && (
            <form action={borrarEjercicio}>
              <input type="hidden" name="id" value={e.id} />
              <Enviar className="btn-peligro" title="Borrar ejercicio" confirmar={`¿Borrar «${e.titulo}»? Desaparecerá también de los entrenamientos donde esté. No se puede deshacer.`}><Trash2 size={16} /></Enviar>
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
          <section className="tarjeta grid grid-cols-3 gap-2 p-3 text-center text-sm">
            <div><p className="text-lg font-bold">{e.balones ?? "—"}</p><p className="text-[11px] uppercase text-tinta/60">Balones</p></div>
            <div><p className="text-lg font-bold">{e.canastas ?? "—"}</p><p className="text-[11px] uppercase text-tinta/60">Canastas</p></div>
            <div><p className="text-lg font-bold">{e.conos ?? 0}</p><p className="text-[11px] uppercase text-tinta/60">Conos</p></div>
            <div className="col-span-3 space-y-1.5 border-t border-linea pt-2 text-left">
              {e.formato && <p><span className="text-tinta/60">Tipo de trabajo:</span> {nombreFormato(e.formato)}</p>}
              {(e.focos ?? []).length > 0 && <p className="flex flex-wrap items-center gap-1"><span className="text-tinta/60">Se trabaja:</span> {(e.focos as string[]).map((x) => <Link key={x} href={`/biblioteca?foco=${encodeURIComponent(x)}`} className="rounded-full bg-suave px-2 py-0.5 text-xs hover:bg-linea">{x}</Link>)}</p>}
              {(e.posiciones ?? []).length > 0 && <p><span className="text-tinta/60">Posiciones:</span> {(e.posiciones as string[]).join(", ")}</p>}
            </div>
          </section>
      {(e.series || e.repeticiones || e.descanso) ? (
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-suave p-2"><p className="font-bold">{e.series || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Series</p></div>
          <div className="rounded-lg bg-suave p-2"><p className="font-bold">{e.repeticiones || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Repeticiones / tiempo</p></div>
          <div className="rounded-lg bg-suave p-2"><p className="font-bold">{e.descanso || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Descanso</p></div>
        </div>
      ) : null}
          {e.material && (
            <section>
              <h2 className="etiqueta">Otro material</h2>
              <p className="text-sm">{e.material}</p>
            </section>
          )}
          {e.objetivos && (
            <section className="rounded-lg bg-azul/5 p-3">
              <h2 className="etiqueta">Objetivos</h2>
              <p className="whitespace-pre-line text-sm">{e.objetivos}</p>
            </section>
          )}
          {e.descripcion && (
            <section>
              <h2 className="etiqueta">Descripción</h2>
              <p className="whitespace-pre-line text-sm">{e.descripcion}</p>
            </section>
          )}
          {(e.imagenes ?? []).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {(e.imagenes as string[]).map((src, i) => <a key={i} href={src} target="_blank" rel="noopener"><img src={src} alt={`Imagen ${i + 1}`} className="w-full rounded-lg border border-linea object-cover" /></a>)}
            </div>
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
          {!video && e.video_url && (
            <a href={e.video_url} target="_blank" rel="noopener" className="btn-secundario inline-flex text-sm"><PlayCircle size={16} /> Ver el vídeo</a>
          )}
          {video && (
            <div className={`overflow-hidden rounded-xl border border-linea bg-black ${esVertical(e.video_url) ? "mx-auto aspect-[9/16] w-full max-w-[340px]" : "aspect-video"}`}>
              <iframe src={video} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Vídeo del ejercicio" />
            </div>
          )}
        </div>
      </div>
      {esCoord && <Historial registroId={e.id} />}
    </div>
  );
}
