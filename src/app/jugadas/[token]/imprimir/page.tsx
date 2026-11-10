import { adminClient } from "@/lib/supabase/admin";
import HojaPlaybook, { type JugadaHoja } from "@/components/HojaPlaybook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jugadas · PDF", robots: { index: false } };

export default async function ImprimirJugadas({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = adminClient();
  const { data: eq } = db && /^[a-f0-9]{8,40}$/.test(token) ? await db.from("equipos").select("id, nombre").eq("playbook_token", token).maybeSingle() : { data: null };
  if (!db || !eq) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1></main>;
  const { data } = await db.from("equipo_playbook").select("ejercicio_id, notas, ejercicios(titulo, tipo, categoria, descripcion, correcciones, preview, pizarra)").eq("equipo_id", eq.id).order("orden");
  const jugadas = ((data ?? []) as unknown as { ejercicio_id: string; notas: string | null; ejercicios: Omit<JugadaHoja, "id" | "notas"> | null }[])
    .filter((x) => x.ejercicios).map((x) => ({ id: x.ejercicio_id, notas: x.notas, ...x.ejercicios! }));
  return <HojaPlaybook equipo={eq.nombre as string} jugadas={jugadas} volver={`/jugadas/${token}`} enlace={`https://coach.cbturo.com/jugadas/${token}`} />;
}
