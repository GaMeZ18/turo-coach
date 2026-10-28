import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaCorta } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import type { Categoria, Clip, EventoVideo } from "@/lib/video";
import { borrarVideo } from "../actions";
import Analizador from "./Analizador";
import Importar from "./Importar";
import { ExternalLink, Trash2 } from "lucide-react";

export default async function VerVideo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ clip?: string }> }) {
  const { id } = await params;
  const { clip: clipInicial } = await searchParams;
  const { supabase } = await requireUser();
  const { data: v } = await supabase.from("videos").select("id, equipo_id, partido_id, titulo, url, youtube_id, minutos_periodo, partidos(id, fecha, rival, local, fcbq_stats_id), equipos(nombre)").eq("id", id).maybeSingle();
  if (!v) notFound();
  const [{ data: cats }, { data: clips }, { data: plantilla }, { data: eventos }] = await Promise.all([
    supabase.from("video_categorias").select("id, equipo_id, nombre, color, antes, despues, orden, tecla, estadistica").or(`equipo_id.is.null,equipo_id.eq.${v.equipo_id}`).order("orden"),
    supabase.from("video_clips").select("id, video_id, categoria_id, inicio, fin, jugador_id, resultado, periodo, nota, estado, confianza").eq("video_id", id).order("inicio"),
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", v.equipo_id),
    supabase.from("video_eventos").select("id, video_id, t, tipo, periodo, jugadores, puntos").eq("video_id", id).order("t"),
  ]);
  const jugadores = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .map((p) => ({ id: p.jugadores.id, nombre: p.jugadores.nombre, apellidos: p.jugadores.apellidos, dorsal: p.dorsal }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const partido = v.partidos as unknown as { id: string; fecha: string; rival: string; local: boolean; fcbq_stats_id: string | null } | null;

  // Canastas de la FCBQ (jugada a jugada) en orden, para proponer quién anota
  let jugadasFCBQ: { pts: number; dorsal: number | null; nombre: string | null }[] | null = null;
  if (partido?.fcbq_stats_id) {
    const { data: st } = await supabase.from("fcbq_stats").select("datos").eq("equipo_id", v.equipo_id).eq("stats_id", partido.fcbq_stats_id).maybeSingle();
    const d = st?.datos as { local?: { nombre?: string }; visitante?: { nombre?: string }; jugadas?: [number, number, number | null, string | null][] } | undefined;
    if (d?.jugadas?.length) {
      const turo = (x?: string) => /TURO/.test((x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
      const lado = turo(d.local?.nombre) ? 0 : turo(d.visitante?.nombre) ? 1 : partido.local ? 0 : 1;
      jugadasFCBQ = d.jugadas.filter((j) => j[0] === lado).map((j) => ({ pts: j[1], dorsal: j[2], nombre: j[3] }));
    }
  }

  return (
    <div>
      <Link href="/video" className="text-sm text-tinta/60 hover:underline">← Vídeos</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{v.titulo}</h1>
          <p className="text-sm text-tinta/60">
            {(v.equipos as unknown as { nombre: string } | null)?.nombre}
            {partido && <> · <Link href={`/partidos/${partido.id}`} className="text-azul hover:underline">{fechaCorta(partido.fecha)} {partido.local ? "vs" : "@"} {partido.rival}</Link></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Importar videoId={v.id} />
          <a href={v.url} target="_blank" rel="noopener" className="btn-secundario !py-1.5 text-sm"><ExternalLink size={15} /> YouTube</a>
          <form action={borrarVideo}>
            <input type="hidden" name="id" value={v.id} />
            <Enviar className="btn-peligro !py-1.5" confirmar="¿Borrar este vídeo y todos sus clips? (El vídeo de YouTube no se toca.)"><Trash2 size={15} /></Enviar>
          </form>
        </div>
      </div>
      {v.youtube_id ? (
        <Analizador
          videoId={v.id}
          youtubeId={v.youtube_id}
          categorias={(cats ?? []) as Categoria[]}
          clipsIniciales={((clips ?? []) as Clip[]).map((c) => ({ ...c, inicio: Number(c.inicio), fin: Number(c.fin) }))}
          jugadores={jugadores}
          clipInicial={clipInicial ?? null}
          eventosIniciales={((eventos ?? []) as EventoVideo[]).map((e) => ({ ...e, t: Number(e.t) }))}
          minutosPeriodo={(v as { minutos_periodo?: number }).minutos_periodo ?? 10}
          jugadasFCBQ={jugadasFCBQ}
        />
      ) : <p className="tarjeta mt-4 p-4 text-sm">El enlace no es de YouTube.</p>}
    </div>
  );
}
