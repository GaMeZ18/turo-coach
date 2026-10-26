import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import SinEquipo from "@/components/SinEquipo";

const COLOR: Record<string, string> = {
  presente: "bg-green-600", tarde: "bg-amber-500", justificado: "bg-sky-600", lesionado: "bg-violet-600", ausente: "bg-red-600",
};
const LETRA: Record<string, string> = { presente: "P", tarde: "T", justificado: "J", lesionado: "L", ausente: "A" };

export default async function AsistenciaPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const cuantos = Math.min(Number(n) || 20, 200);
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="su asistencia" />;

  const [{ data: entrenos }, { data: plantilla }] = await Promise.all([
    supabase.from("entrenamientos").select("id, fecha, titulo").eq("equipo_id", equipo.id).lte("fecha", new Date().toISOString()).order("fecha", { ascending: false }).limit(cuantos),
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", equipo.id),
  ]);
  const lista = (entrenos ?? []).reverse();
  const ids = lista.map((e) => e.id);
  const { data: regs } = ids.length ? await supabase.from("asistencias").select("entrenamiento_id, jugador_id, estado, motivo").in("entrenamiento_id", ids) : { data: [] };
  const conLista = new Set((regs ?? []).map((r) => r.entrenamiento_id));
  const entrenosConLista = lista.filter((e) => conLista.has(e.id));

  const jugadores = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .map((x) => ({ id: x.jugadores.id, nombre: `${x.jugadores.nombre} ${x.jugadores.apellidos ?? ""}`.trim(), dorsal: x.dorsal }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const reg = (e: string, j: string) => (regs ?? []).find((r) => r.entrenamiento_id === e && r.jugador_id === j);
  const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "numeric", timeZone: "Europe/Madrid" });

  return (
    <div>
      <Link href="/entrenamientos" className="text-sm text-tinta/60 hover:underline">← Entrenamientos</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Asistencia</h1>
          <p className="text-sm text-tinta/60">{equipo.nombre} · últimos {entrenosConLista.length} entrenos con lista</p>
        </div>
        <div className="flex gap-1 text-xs">
          {[20, 50, 200].map((x) => <Link key={x} href={`/entrenamientos/asistencia?n=${x}`} className={`rounded-full border px-2.5 py-1 ${cuantos === x ? "border-azul bg-azul text-white" : "border-linea bg-white"}`}>{x === 200 ? "Temporada" : `Últimos ${x}`}</Link>)}
        </div>
      </div>

      <div className="tarjeta mt-4 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-suave text-xs text-tinta/60">
            <tr>
              <th className="sticky left-0 bg-suave px-2 py-2 text-left">Jugador</th>
              <th className="px-2 py-2 text-center" title="% de asistencia (presente o tarde)">%</th>
              {(["presente", "tarde", "justificado", "lesionado", "ausente"] as const).map((k) => <th key={k} className="px-1 py-2 text-center" title={k}>{LETRA[k]}</th>)}
              {entrenosConLista.map((e) => <th key={e.id} className="px-0.5 py-2 text-center font-normal"><Link href={`/entrenamientos/${e.id}`} className="hover:underline" title={e.titulo ?? "Entreno"}>{fecha(e.fecha)}</Link></th>)}
            </tr>
          </thead>
          <tbody>
            {jugadores.map((j) => {
              const suyos = entrenosConLista.map((e) => reg(e.id, j.id));
              const cuenta = (k: string) => suyos.filter((r) => r?.estado === k).length;
              const marcados = suyos.filter(Boolean).length;
              const pct = marcados ? Math.round(((cuenta("presente") + cuenta("tarde")) * 100) / marcados) : null;
              return (
                <tr key={j.id} className="border-t border-linea">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1"><span className="mr-1 text-xs text-tinta/50">{j.dorsal ?? ""}</span><Link href={`/jugadores/${j.id}`} className="hover:underline">{j.nombre}</Link></td>
                  <td className={`px-2 py-1 text-center font-semibold ${pct === null ? "" : pct >= 85 ? "text-green-700" : pct >= 65 ? "text-amber-600" : "text-rojo"}`}>{pct === null ? "–" : `${pct}%`}</td>
                  {(["presente", "tarde", "justificado", "lesionado", "ausente"] as const).map((k) => <td key={k} className="px-1 py-1 text-center text-tinta/70">{cuenta(k) || ""}</td>)}
                  {suyos.map((r, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      {r ? <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${COLOR[r.estado] ?? "bg-tinta/30"}`} title={r.motivo ?? r.estado}>{LETRA[r.estado] ?? "?"}{r.motivo ? "*" : ""}</span> : <span className="text-tinta/20">·</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-tinta/50">P presente · T tarde · J justificado · L lesionado · A ausente. Con * hay motivo (pasa el ratón por encima para verlo).</p>
    </div>
  );
}
