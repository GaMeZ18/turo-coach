import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase/admin";
import Cabecera from "@/components/publico/Cabecera";
import { hoyLocal, aISO } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { nombrePublico } from "@/lib/asistencia";
import Responder, { type Evento } from "./Responder";

export const dynamic = "force-dynamic";

async function cargar(token: string) {
  const db = adminClient();
  if (!db || !/^[a-f0-9]{20}$/.test(token)) return null;
  const { data: eq } = await db.from("equipos").select("id, nombre").eq("asistencia_token", token).maybeSingle();
  if (!eq) return null;
  const hoy = hoyLocal();
  const desde = aISO(hoy, "00:00"), hasta = aISO(sumarDias(hoy, 8), "00:00");
  const [{ data: pl }, { data: ents }, { data: pts }] = await Promise.all([
    db.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", eq.id),
    db.from("entrenamientos").select("id, fecha, titulo, lugar, anulado_motivo").eq("equipo_id", eq.id).gte("fecha", desde).lt("fecha", hasta).order("fecha"),
    db.from("partidos").select("id, fecha, rival, local, lugar, estado").eq("equipo_id", eq.id).gte("fecha", desde).lt("fecha", hasta).order("fecha"),
  ]);
  const jugadores = ((pl ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } | null }[])
    .filter((x) => x.jugadores)
    .map((x) => ({ id: x.jugadores!.id, nombre: nombrePublico(x.jugadores!.nombre, x.jugadores!.apellidos), dorsal: x.dorsal }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const eventos: Evento[] = [
    ...((ents ?? []) as { id: string; fecha: string; titulo: string | null; lugar: string | null; anulado_motivo: string | null }[])
      .map((e) => ({ clave: `e:${e.id}`, tipo: "e" as const, fecha: e.fecha, titulo: "Entreno", lugar: e.lugar, anulado: e.anulado_motivo })),
    ...((pts ?? []) as { id: string; fecha: string; rival: string; local: boolean; lugar: string | null; estado: string | null }[])
      .filter((p) => p.estado !== "aplazado")
      .map((p) => ({ clave: `p:${p.id}`, tipo: "p" as const, fecha: p.fecha, titulo: `Partido ${p.local ? "en casa" : "fuera"} vs ${p.rival}`, lugar: p.lugar, anulado: null })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
  // Quién ha respondido ya (solo eso: el motivo lo ve el entrenador)
  const ids = (t: "e" | "p") => eventos.filter((e) => e.tipo === t).map((e) => e.clave.slice(2));
  const [{ data: re }, { data: rp }] = await Promise.all([
    ids("e").length ? db.from("respuestas_asistencia").select("entrenamiento_id, jugador_id").in("entrenamiento_id", ids("e")) : Promise.resolve({ data: [] }),
    ids("p").length ? db.from("respuestas_asistencia").select("partido_id, jugador_id").in("partido_id", ids("p")) : Promise.resolve({ data: [] }),
  ]);
  const respondidos: Record<string, string[]> = {};
  for (const r of (re ?? []) as { entrenamiento_id: string; jugador_id: string }[]) (respondidos[`e:${r.entrenamiento_id}`] ??= []).push(r.jugador_id);
  for (const r of (rp ?? []) as { partido_id: string; jugador_id: string }[]) (respondidos[`p:${r.partido_id}`] ??= []).push(r.jugador_id);
  return { equipo: eq.nombre as string, jugadores, eventos, respondidos };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const d = await cargar(token);
  return d
    ? { title: `Asistencia · ${d.equipo}`, description: "Marca si vienes a los entrenos y partidos de esta semana", robots: { index: false },
        openGraph: { title: `Asistencia · ${d.equipo}`, description: "Marca si vienes a los entrenos y partidos de esta semana 🏀", images: [{ url: "https://coach.cbturo.com/icons/icon-512.png" }] } }
    : { title: "Enlace no válido", robots: { index: false } };
}

/** Enlace del equipo para el grupo de WhatsApp: cada jugador dice si viene o no (y por qué) */
export default async function AsistenciaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await cargar(token);
  if (!d) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-tinta/60">Pide el enlace nuevo a tu entrenador.</p></main>;
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub={`Asistencia · ${d.equipo}`} />
      <main className="mx-auto max-w-lg px-4 py-5">
        <Responder token={token} equipo={d.equipo} jugadores={d.jugadores} eventos={d.eventos} respondidos={d.respondidos} />
      </main>
    </div>
  );
}
