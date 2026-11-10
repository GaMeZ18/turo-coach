import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { esVertical, urlEmbed } from "@/lib/video";
import Cabecera from "@/components/publico/Cabecera";
import VisorPublico from "@/components/publico/VisorPublico";

export const dynamic = "force-dynamic";

async function cargar(token: string) {
  const db = adminClient();
  if (!db || !/^[a-f0-9]{8,40}$/.test(token)) return null;
  const { data } = await db.from("ejercicios")
    .select("titulo, tipo, categoria, descripcion, objetivos, correcciones, duracion, jugadores_min, material, pizarra, video_url, imagenes, series, repeticiones, descanso")
    .eq("compartir_token", token).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const e = await cargar(token);
  if (!e) return { title: "Ejercicio no disponible", robots: { index: false } };
  const img = `https://coach.cbturo.com/e/${token}/imagen`;
  const desc = (e.descripcion as string | null)?.slice(0, 160) ?? "Ejercicio del CB Turó de la Peira";
  return {
    title: `${e.titulo} · CB Turó`, description: desc, robots: { index: false },
    openGraph: { title: e.titulo as string, description: desc, images: [{ url: img }], type: "article", siteName: "Coach Manager CBTuró" },
  };
}

/** Ejercicio compartido: se ve sin cuenta y no se puede cambiar */
export default async function EjercicioPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const e = await cargar(token);
  if (!e) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-tinta/60">Este ejercicio ya no está disponible.</p></main>;
  const video = urlEmbed(e.video_url);
  const bloque = (t: string, v: string | null) => v ? <section><h2 className="etiqueta">{t}</h2><p className="whitespace-pre-line text-sm">{v}</p></section> : null;
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub="Ejercicio compartido" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-rojo">{e.tipo === "sistema" ? "Sistema de juego" : e.tipo === "fisico" ? "Prep. física" : e.categoria ?? "Ejercicio"}</p>
          <h1 className="text-2xl font-semibold">{e.titulo}</h1>
          <p className="text-sm text-tinta/60">{[e.duracion ? `${e.duracion} min` : "", e.jugadores_min ? `${e.jugadores_min} jugadores` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        {e.pizarra ? <VisorPublico pizarra={e.pizarra} titulo={e.titulo as string} /> : null}
        {(e.series || e.repeticiones || e.descanso) ? (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="tarjeta p-2"><p className="font-bold">{e.series || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Series</p></div>
            <div className="tarjeta p-2"><p className="font-bold">{e.repeticiones || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Repeticiones / tiempo</p></div>
            <div className="tarjeta p-2"><p className="font-bold">{e.descanso || "—"}</p><p className="text-[10px] uppercase text-tinta/60">Descanso</p></div>
          </div>
        ) : null}
        <div className="tarjeta space-y-3 p-4">
          {bloque("Objetivos", e.objetivos)}
          {bloque("Descripción", e.descripcion)}
          {bloque("Correcciones", e.correcciones)}
          {bloque("Material", e.material)}
          {((e.imagenes as string[] | null) ?? []).length > 0 && (
            <div className="grid grid-cols-2 gap-2">{(e.imagenes as string[]).map((src, i) => <img key={i} src={src} alt="" className="w-full rounded-lg border border-linea" />)}</div>
          )}
          {video && (
            <div className={`overflow-hidden rounded-xl border border-linea bg-black ${esVertical(e.video_url) ? "mx-auto aspect-[9/16] w-full max-w-[340px]" : "aspect-video"}`}>
              <iframe src={video} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Vídeo" />
            </div>
          )}
        </div>
        <p className="pb-6 text-center text-xs text-tinta/50">Coach Manager CBTuró · CB Turó de la Peira</p>
      </main>
    </div>
  );
}
