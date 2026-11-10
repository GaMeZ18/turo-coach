import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase/admin";
import Cabecera from "@/components/publico/Cabecera";
import Jugadas from "./Jugadas";

export const dynamic = "force-dynamic";

async function cargar(token: string) {
  const db = adminClient();
  if (!db || !/^[a-f0-9]{8,40}$/.test(token)) return null;
  const { data: eq } = await db.from("equipos").select("id, nombre").eq("playbook_token", token).maybeSingle();
  if (!eq) return null;
  const { data } = await db.from("equipo_playbook")
    .select("ejercicio_id, notas, ejercicios(titulo, tipo, categoria, descripcion, preview, pizarra)")
    .eq("equipo_id", eq.id).order("orden");
  const items = ((data ?? []) as unknown as { ejercicio_id: string; notas: string | null; ejercicios: { titulo: string; tipo: string; categoria: string | null; descripcion: string | null; preview: string | null; pizarra: unknown } | null }[])
    .filter((x) => x.ejercicios).map((x) => ({ id: x.ejercicio_id, notas: x.notas, ...x.ejercicios! }));
  return { equipo: eq.nombre as string, items };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const d = await cargar(token);
  return d ? { title: `Jugadas · ${d.equipo}`, description: `${d.items.length} jugadas del ${d.equipo} (CB Turó de la Peira)`, robots: { index: false },
    openGraph: { title: `Jugadas · ${d.equipo}`, description: "Playbook del equipo · CB Turó de la Peira", images: [{ url: "https://coach.cbturo.com/icons/icon-512.png" }] } }
    : { title: "Enlace no válido", robots: { index: false } };
}

/** Playbook del equipo para los jugadores: solo ver */
export default async function PlaybookPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await cargar(token);
  if (!d) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-tinta/60">Pide el enlace nuevo a tu entrenador.</p></main>;
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub={`Jugadas · ${d.equipo}`} />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <h1 className="text-2xl font-semibold">Nuestras jugadas</h1>
        <p className="text-sm text-tinta/60">Toca una jugada para verla animada.</p>
        <Jugadas items={d.items} />
        <p className="pb-6 pt-6 text-center text-xs text-tinta/50">Coach Manager CBTuró · CB Turó de la Peira</p>
      </main>
    </div>
  );
}
