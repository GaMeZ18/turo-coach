import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga, hora } from "@/lib/fechas";
import type { StatsPartido } from "@/lib/stats-fcbq";
import BoxScore, { Parciales } from "@/components/BoxScore";
import MiniPizarra from "@/components/pizarra/Mini";
import BotonImprimir from "../../entreno/[id]/Imprimir";

export const metadata = { title: "Informe de partido · Coach Manager CBTuró" };

export default async function InformePartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data: p } = await supabase.from("partidos").select("*, equipos(nombre)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const equipo = (p.equipos as { nombre: string } | null)?.nombre ?? "Equipo";

  const [{ data: staff }, { data: conv }, { data: periodos }, { data: stats }, { data: sistemas }] = await Promise.all([
    supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", p.equipo_id).eq("perfil_id", user.id).maybeSingle(),
    supabase.from("convocatorias").select("jugadores(id, nombre, apellidos)").eq("partido_id", id),
    supabase.from("partido_periodos").select("jugador_id, periodos").eq("partido_id", id),
    p.fcbq_stats_id ? supabase.from("fcbq_stats").select("datos").eq("equipo_id", p.equipo_id).eq("stats_id", p.fcbq_stats_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("partido_ejercicios").select("ejercicios(titulo, pizarra, preview)").eq("partido_id", id).order("orden"),
  ]);
  const esStaff = perfil.rol === "coordinador" || !!staff;
  const st = (stats as { datos: StatsPartido } | null)?.datos ?? null;
  const convocados = ((conv ?? []) as unknown as { jugadores: { id: string; nombre: string; apellidos: string | null } | null }[]).map((c) => c.jugadores).filter(Boolean) as { id: string; nombre: string; apellidos: string | null }[];
  const per = new Map((periodos ?? []).map((x) => [x.jugador_id as string, (x.periodos as number[]) ?? []]));
  const numPer = p.num_periodos ?? st?.numPeriodos ?? 4;
  const jugado = p.puntos_favor !== null && p.puntos_contra !== null;
  const [l, v] = p.local ? [equipo, p.rival] : [p.rival, equipo];
  const marcador = jugado ? (p.local ? `${p.puntos_favor} – ${p.puntos_contra}` : `${p.puntos_contra} – ${p.puntos_favor}`) : "vs";
  const listaSistemas = ((sistemas ?? []) as unknown as { ejercicios: { titulo: string; pizarra: unknown; preview: string | null } | null }[]).map((x) => x.ejercicios).filter(Boolean) as { titulo: string; pizarra: unknown; preview: string | null }[];

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-tinta print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: white } }`}</style>
      <BotonImprimir volver={`/partidos/${id}`} />

      <header className="flex items-center gap-4 border-b-4 border-azul pb-3">
        <img src="/marca/escudo-128.png" alt="" className="h-14 w-auto" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-rojo">{p.competicion ?? "Partido"}{p.jornada ? ` · Jornada ${p.jornada}` : ""}</p>
          <h1 className="text-xl font-bold">{l} <span className="tabular-nums">{marcador}</span> {v}</h1>
          <p className="text-sm capitalize text-tinta/70">{fechaLarga(p.fecha)} · {hora(p.fecha)}{p.lugar ? ` · ${p.lugar}` : ""}</p>
        </div>
      </header>

      {st && <div className="mt-3"><Parciales local={st.local} visitante={st.visitante} /></div>}

      {esStaff && p.previa && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Plan de partido</h2>
          <p className="mt-1 whitespace-pre-line text-sm">{p.previa}</p>
        </section>
      )}
      {esStaff && listaSistemas.length > 0 && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Sistemas</h2>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {listaSistemas.map((s, i) => (
              <div key={i} className="overflow-hidden rounded border border-linea">
                {s.preview ? <img src={s.preview} alt="" className="w-full" /> : s.pizarra ? <MiniPizarra pizarra={s.pizarra} className="w-full" /> : null}
                <p className="truncate px-1 py-0.5 text-[11px] font-medium">{s.titulo}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {st && (
        <section className="mt-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Estadísticas (FCBQ)</h2>
          <div className="break-inside-avoid"><BoxScore eq={st.local} destacar={/TUR[OÓ]/i.test(st.local.nombre)} /></div>
          <div className="break-inside-avoid"><BoxScore eq={st.visitante} destacar={/TUR[OÓ]/i.test(st.visitante.nombre)} /></div>
        </section>
      )}

      {convocados.length > 0 && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Convocatoria y periodos</h2>
          <table className="mt-1 w-full text-sm">
            <thead><tr className="text-xs text-tinta/50"><th className="text-left font-normal">Jugador</th>{Array.from({ length: numPer }, (_, i) => <th key={i} className="w-8 font-normal">{i + 1}º</th>)}<th className="w-10 font-normal">Total</th></tr></thead>
            <tbody>
              {convocados.map((j) => {
                const ps = per.get(j.id) ?? [];
                return (
                  <tr key={j.id} className="border-t border-linea">
                    <td className="py-0.5">{j.nombre} {j.apellidos ?? ""}</td>
                    {Array.from({ length: numPer }, (_, i) => <td key={i} className="text-center">{ps.includes(i + 1) ? "■" : "□"}</td>)}
                    <td className="text-center font-semibold">{ps.length || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {p.notas && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Notas del partido</h2>
          <p className="mt-1 whitespace-pre-line text-sm">{p.notas}</p>
        </section>
      )}
    </main>
  );
}
