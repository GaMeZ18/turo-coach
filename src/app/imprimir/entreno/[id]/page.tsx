import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga, hora } from "@/lib/fechas";
import MiniPizarra from "@/components/pizarra/Mini";
import BotonImprimir from "./Imprimir";
import AsistenciaHoja from "./AsistenciaHoja";

type Act = {
  id: string; orden: number; tipo: string; titulo: string | null; duracion: number; notas: string | null;
  ejercicios: { titulo: string; descripcion: string | null; correcciones: string | null; objetivos?: string | null; material: string | null; pizarra: unknown; preview: string | null } | null;
};

export const metadata = { title: "Entreno · Coach Manager CBTuró" };

export default async function ImprimirEntreno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: e } = await supabase.from("entrenamientos").select("*, equipos(nombre)").eq("id", id).maybeSingle();
  if (!e) notFound();
  const [{ data: acts }, { data: plantilla }, { data: objs }, { data: asistencias }] = await Promise.all([
    supabase.from("entreno_actividades").select("id, orden, tipo, titulo, duracion, notas, ejercicios(*)").eq("entrenamiento_id", id).order("orden"),
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", e.equipo_id),
    supabase.from("entreno_objetivos").select("objetivos(nombre, color)").eq("entrenamiento_id", id),
    supabase.from("asistencias").select("jugador_id, estado, motivo").eq("entrenamiento_id", id),
  ]);
  const lista = (acts ?? []) as unknown as Act[];
  const total = lista.reduce((s, a) => s + (a.duracion || 0), 0);
  const jugadores = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999))
    .map((j) => ({ id: j.jugadores.id, dorsal: j.dorsal, nombre: `${j.jugadores.nombre} ${j.jugadores.apellidos ?? ""}`.trim() }));
  const objetivos = ((objs ?? []) as unknown as { objetivos: { nombre: string; color: string | null } | null }[]).map((o) => o.objetivos).filter(Boolean) as { nombre: string; color: string | null }[];
  const t0 = new Date(e.fecha).getTime();
  let acumulado = 0;
  const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-tinta print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: white } }`}</style>
      <BotonImprimir volver={`/entrenamientos/${id}`} />

      <header className="flex items-center gap-4 border-b-4 border-azul pb-3">
        <img src="/marca/escudo-128.png" alt="" className="h-14 w-auto" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-rojo">{(e.equipos as { nombre: string } | null)?.nombre} · CB Turó de la Peira</p>
          <h1 className="text-2xl font-bold">{e.titulo ?? "Entrenamiento"}</h1>
          <p className="text-sm capitalize text-tinta/70">{fechaLarga(e.fecha)} · {hora(e.fecha)}{e.lugar ? ` · ${e.lugar}` : ""} · {total} de {e.duracion_prevista} min</p>
        </div>
      </header>

      {(objetivos.length > 0 || e.notas) && (
        <section className="mt-3 text-sm">
          {objetivos.length > 0 && (
            <p><strong>Objetivos:</strong> {objetivos.map((o, i) => <span key={i} className="mr-2 inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: o.color ?? "#002b8e" }} />{o.nombre}</span>)}</p>
          )}
          {e.notas && <p className="mt-1 whitespace-pre-line"><strong>Notas:</strong> {e.notas}</p>}
        </section>
      )}

      <ol className="mt-4 space-y-3">
        {lista.map((a, i) => {
          const desde = t0 + acumulado * 60000;
          acumulado += a.duracion || 0;
          const ej = a.ejercicios;
          return (
            <li key={a.id} className="break-inside-avoid rounded-lg border border-linea p-3">
              <div className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 text-xs tabular-nums text-tinta/60">{hhmm(desde)}</span>
                <span className="flex-1 font-semibold">{i + 1}. {a.titulo ?? ej?.titulo ?? a.tipo}</span>
                <span className="text-sm font-semibold tabular-nums">{a.duracion}′</span>
              </div>
              {ej && (
                <div className="mt-2 flex gap-3">
                  {(ej.preview || ej.pizarra) ? (
                    <div className="w-48 shrink-0 overflow-hidden rounded border border-linea">
                      {ej.preview ? <img src={ej.preview} alt="" className="w-full" /> : <MiniPizarra pizarra={ej.pizarra} className="w-full" />}
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1 text-xs leading-snug">
                    {ej.objetivos && <p className="whitespace-pre-line"><strong>Objetivos:</strong> {ej.objetivos}</p>}
                    {ej.descripcion && <p className="whitespace-pre-line">{ej.descripcion}</p>}
                    {ej.correcciones && <p className="whitespace-pre-line"><strong>Claves:</strong> {ej.correcciones}</p>}
                    {ej.material && <p><strong>Material:</strong> {ej.material}</p>}
                  </div>
                </div>
              )}
              {a.notas && <p className="mt-1 whitespace-pre-line text-xs"><strong>Notas:</strong> {a.notas}</p>}
            </li>
          );
        })}
      </ol>

      {jugadores.length > 0 && (
        <AsistenciaHoja entrenoId={id} jugadores={jugadores} registros={asistencias ?? []} />
      )}
    </main>
  );
}
