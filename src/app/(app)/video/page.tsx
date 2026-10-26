import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaCorta } from "@/lib/fechas";
import SinEquipo from "@/components/SinEquipo";
import Enviar from "@/components/Enviar";
import type { Categoria } from "@/lib/video";
import { borrarCategoria, crearVideo, guardarCategoria } from "./actions";
import { Clapperboard, Plus, Settings2, Tags, Trash2, Video } from "lucide-react";

type V = { id: string; titulo: string; youtube_id: string | null; created_at: string; partido_id: string | null; partidos: { fecha: string } | null; video_clips: { count: number }[] };

export default async function VideoPage({ searchParams }: { searchParams: Promise<{ partido?: string }> }) {
  const { partido: partidoPre } = await searchParams;
  const { supabase, perfil } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="sus vídeos" />;
  const esCoord = perfil.rol === "coordinador";

  const [{ data: vids, error }, { data: partidos }, { data: cats }] = await Promise.all([
    supabase.from("videos").select("id, titulo, youtube_id, created_at, partido_id, partidos(fecha), video_clips(count)").eq("equipo_id", equipo.id).order("created_at", { ascending: false }),
    supabase.from("partidos").select("id, fecha, rival, local").eq("equipo_id", equipo.id).lte("fecha", new Date(Date.now() + 86400000).toISOString()).order("fecha", { ascending: false }).limit(40),
    supabase.from("video_categorias").select("id, equipo_id, nombre, color, antes, despues, orden, tecla, estadistica").or(`equipo_id.is.null,equipo_id.eq.${equipo.id}`).order("orden"),
  ]);
  const videos = (vids ?? []) as unknown as V[];
  const categorias = (cats ?? []) as Categoria[];
  const faltaSQL = error && /videos/.test(error.message);

  const FilaCategoria = ({ c }: { c?: Categoria }) => (
    <div className="flex flex-wrap items-end gap-2">
      <form action={guardarCategoria} className="flex flex-1 flex-wrap items-end gap-2">
        {c ? <input type="hidden" name="id" value={c.id} /> : <input type="hidden" name="equipo_id" value={equipo.id} />}
        <input type="color" name="color" defaultValue={c?.color ?? "#002b8e"} className="h-9 w-10 cursor-pointer rounded border border-linea" aria-label="Color" />
        <div className="min-w-36 flex-1"><input name="nombre" defaultValue={c?.nombre} placeholder="Nueva etiqueta (ej.: Contraataque)" required className="campo" /></div>
        <label className="text-xs text-tinta/60">Antes<input name="antes" type="number" min={0} max={60} defaultValue={c?.antes ?? 8} className="campo !w-16" /></label>
        <label className="text-xs text-tinta/60">Después<input name="despues" type="number" min={0} max={60} defaultValue={c?.despues ?? 4} className="campo !w-16" /></label>
        <label className="text-xs text-tinta/60">Orden<input name="orden" type="number" defaultValue={c?.orden ?? 50} className="campo !w-16" /></label>
        <label className="text-xs text-tinta/60">Tecla<input name="tecla" maxLength={1} defaultValue={c?.tecla ?? ""} placeholder="auto" className="campo !w-14 text-center uppercase" /></label>
        <label className="text-xs text-tinta/60">Estadística
          <select name="estadistica" defaultValue={c?.estadistica ?? ""} className="campo !w-32">
            <option value="">No</option>
            <option value="t2">Tiro de 2</option>
            <option value="t3">Tiro de 3</option>
            <option value="tl">Tiro libre</option>
            <option value="perdida">Pérdida</option>
          </select>
        </label>
        <Enviar className="btn-secundario">{c ? "Guardar" : <><Plus size={15} /> Añadir</>}</Enviar>
      </form>
      {c && (
        <form action={borrarCategoria}>
          <input type="hidden" name="id" value={c.id} />
          <Enviar className="btn-peligro" confirmar={`¿Borrar la etiqueta «${c.nombre}»? Los clips no se borran, se quedan sin etiqueta.`}><Trash2 size={15} /></Enviar>
        </form>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><Clapperboard className="text-azul" /> Vídeo</h1>
      <p className="max-w-2xl text-sm text-tinta/60">
        Sube el partido a YouTube (como <strong>«Oculto»</strong>), pega aquí el enlace y etiqueta las acciones con la botonera:
        cada toque crea un clip que después puedes filtrar por jugador, acción o si salió bien o mal.
      </p>

      {faltaSQL ? <p className="tarjeta mt-4 p-3 text-sm text-red-700">Falta preparar la base de datos (0016_video.sql).</p> : (
        <>
          <form action={crearVideo} className="tarjeta mt-5 grid gap-2 p-4 sm:grid-cols-[2fr_1.4fr_1fr_auto] sm:items-end">
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <div><label className="etiqueta">Enlace de YouTube</label><input name="url" required placeholder="https://youtu.be/…" className="campo" /></div>
            <div>
              <label className="etiqueta">Partido</label>
              <select name="partido_id" className="campo" defaultValue={partidoPre ?? ""}>
                <option value="">— Sin partido (entreno, rival…) —</option>
                {(partidos ?? []).map((p) => <option key={p.id} value={p.id}>{fechaCorta(p.fecha)} · {p.local ? "vs" : "@"} {p.rival}</option>)}
              </select>
            </div>
            <div><label className="etiqueta">Título (opcional)</label><input name="titulo" placeholder="Se pone solo con el partido" className="campo" /></div>
            <Enviar className="btn-primario"><Plus size={16} /> Añadir vídeo</Enviar>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => (
              <Link key={v.id} href={`/video/${v.id}`} className="tarjeta group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-video bg-tinta">
                  {v.youtube_id && <img src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{v.video_clips?.[0]?.count ?? 0} clips</span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-semibold group-hover:text-azul">{v.titulo}</p>
                  <p className="text-xs text-tinta/50">{fechaCorta(v.partidos?.fecha ?? v.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
          {videos.length === 0 && (
            <div className="mt-8 text-center text-sm text-tinta/50"><Video className="mx-auto mb-2 text-tinta/30" size={36} />Todavía no hay vídeos de {equipo.nombre}.</div>
          )}

          <details className="mt-8">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-azul hover:underline [&::-webkit-details-marker]:hidden"><Settings2 size={14} /> Botonera de etiquetas</summary>
            <div className="mt-2 space-y-4">
              <p className="text-xs text-tinta/60">«Antes» y «Después»: segundos que coge el clip alrededor del momento en que pulsas el botón (en el partido, la acción ya ha pasado cuando la ves). «Tecla»: atajo en el ordenador (si no pones ninguna, se le da un número). «Estadística»: al pulsarla te pregunta el jugador (y si la mete o la falla) y cuenta para su estadística.</p>
              <section>
                <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold"><Tags size={14} /> De {equipo.nombre}</h3>
                <div className="space-y-2">
                  {categorias.filter((c) => c.equipo_id).map((c) => <FilaCategoria key={c.id} c={c} />)}
                  <FilaCategoria />
                </div>
              </section>
              <section>
                <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold"><Tags size={14} /> Del club {esCoord ? "" : "(solo las cambia el coordinador)"}</h3>
                {esCoord ? (
                  <div className="space-y-2">{categorias.filter((c) => !c.equipo_id).map((c) => <FilaCategoria key={c.id} c={c} />)}</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">{categorias.filter((c) => !c.equipo_id).map((c) => <span key={c.id} className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: c.color }}>{c.nombre}{c.tecla ? ` · ${c.tecla}` : ""}</span>)}</div>
                )}
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
