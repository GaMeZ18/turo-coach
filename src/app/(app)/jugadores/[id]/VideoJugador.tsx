import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esTiro, hayStat, mmss, pctTiro, statVacia, sumarStat, valoracion, type Estadistica, type StatVideo } from "@/lib/video";
import { Clapperboard, ThumbsDown, ThumbsUp } from "lucide-react";

type Fila = {
  id: string; video_id: string; inicio: number; resultado: string | null; nota: string | null;
  video_categorias: { nombre: string; color: string; estadistica: Estadistica | null } | null;
  videos: { titulo: string; created_at: string; partidos: { fecha: string } | null } | null;
};

/** Clips de vídeo del jugador y la estadística que sale de ellos */
export default async function VideoJugador({ supabase, jugadorId }: { supabase: SupabaseClient; jugadorId: string }) {
  const { data, error } = await supabase
    .from("video_clips")
    .select("id, video_id, inicio, resultado, nota, video_categorias(nombre, color, estadistica), videos(titulo, created_at, partidos(fecha))")
    .eq("jugador_id", jugadorId)
    .limit(2000);
  if (error || !data?.length) return null;
  const clips = (data as unknown as Fila[]).map((c) => ({ ...c, inicio: Number(c.inicio) }));

  const total = statVacia();
  const porVideo = new Map<string, { titulo: string; fecha: string; st: StatVideo; n: number }>();
  for (const c of clips) {
    const v = porVideo.get(c.video_id) ?? { titulo: c.videos?.titulo ?? "Vídeo", fecha: c.videos?.partidos?.fecha ?? c.videos?.created_at ?? "", st: statVacia(), n: 0 };
    v.n++;
    const e = c.video_categorias?.estadistica;
    if (e) { sumarStat(total, e, c.resultado); sumarStat(v.st, e, c.resultado); }
    porVideo.set(c.video_id, v);
  }
  const videos = [...porVideo.entries()].sort((a, b) => b[1].fecha.localeCompare(a[1].fecha));
  const conStats = hayStat(total);
  const nv = videos.filter(([, v]) => hayStat(v.st)).length || 1;
  const pp = (x: number) => (x / nv).toFixed(1);
  const recientes = [...clips].sort((a, b) => (b.videos?.created_at ?? "").localeCompare(a.videos?.created_at ?? "") || b.inicio - a.inicio).slice(0, 25);
  const fecha = (iso: string) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }) : "");

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold"><Clapperboard size={18} className="text-azul" /> Vídeo</h2>
      {conStats && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[
            ["Puntos", pp(total.pts), `${total.pts} en ${nv} partidos`],
            ["Rebotes", pp(total.ro + total.rd), `${total.ro} of. · ${total.rd} def.`],
            ["Asistencias", pp(total.as), `${total.as} en total`],
            ["Robos", pp(total.rob), `${total.tap} tapones`],
            ["Valoración", pp(valoracion(total)), "por partido"],
            ["Tiros de 2", `${total.t2m}/${total.t2a}`, pctTiro(total.t2m, total.t2a)],
            ["Triples", `${total.t3m}/${total.t3a}`, pctTiro(total.t3m, total.t3a)],
            ["Tiros libres", `${total.tlm}/${total.tla}`, pctTiro(total.tlm, total.tla)],
            ["Pérdidas", pp(total.perdidas), `${total.fc} faltas (${pp(total.fc)}/p)`],
            ["Clips", `${clips.length}`, `${videos.length} vídeos`],
          ].map(([t, v, sub]) => (
            <div key={t} className="tarjeta p-2 text-center"><div className="text-lg font-bold text-azul">{v}</div><div className="text-[10px] uppercase text-tinta/60">{t}</div><div className="text-[11px] text-tinta/50">{sub}</div></div>
          ))}
        </div>
      )}
      {conStats && (
        <div className="tarjeta mt-2 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-suave text-[11px] uppercase text-tinta/60"><tr><th className="p-2 text-left">Partido / vídeo</th><th>Pts</th><th>T2</th><th>T3</th><th>TL</th><th>Reb</th><th>Ast</th><th>Rob</th><th>Pér</th><th>FC</th><th>Val</th></tr></thead>
            <tbody>
              {videos.map(([id, v]) => (
                <tr key={id} className="border-t border-linea">
                  <td className="p-2"><Link href={`/video/${id}`} className="hover:underline">{v.titulo}</Link> <span className="text-xs text-tinta/50">{fecha(v.fecha)}</span></td>
                  <td className="text-center font-semibold">{v.st.pts}</td>
                  <td className="text-center text-xs">{v.st.t2m}/{v.st.t2a}</td>
                  <td className="text-center text-xs">{v.st.t3m}/{v.st.t3a}</td>
                  <td className="text-center text-xs">{v.st.tlm}/{v.st.tla}</td>
                  <td className="text-center">{v.st.ro + v.st.rd || "–"}</td>
                  <td className="text-center">{v.st.as || "–"}</td>
                  <td className="text-center">{v.st.rob || "–"}</td>
                  <td className="text-center">{v.st.perdidas || "–"}</td>
                  <td className="text-center">{v.st.fc || "–"}</td>
                  <td className="text-center font-semibold">{valoracion(v.st)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 className="mt-4 text-sm font-semibold text-tinta/70">Últimos clips</h3>
      <ul className="tarjeta mt-1 divide-y divide-linea text-sm">
        {recientes.map((c) => {
          const tiro = esTiro(c.video_categorias?.estadistica);
          return (
            <li key={c.id}>
              <Link href={`/video/${c.video_id}?clip=${c.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-suave">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.video_categorias?.color ?? "#999" }} />
                <span className="min-w-0 flex-1 truncate"><strong className="font-medium">{c.video_categorias?.nombre ?? "Clip"}</strong> <span className="text-tinta/50">· {c.videos?.titulo} · {mmss(c.inicio)}</span>{c.nota && <span className="block truncate text-xs text-tinta/50">{c.nota}</span>}</span>
                {c.resultado === "bien" && (tiro ? <span className="text-xs font-semibold text-green-700">Anotada</span> : <ThumbsUp size={14} className="text-green-600" />)}
                {c.resultado === "mal" && (tiro ? <span className="text-xs font-semibold text-red-700">Fallada</span> : <ThumbsDown size={14} className="text-red-600" />)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
