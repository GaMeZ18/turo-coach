import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import HojaPlaybook, { type JugadaHoja } from "@/components/HojaPlaybook";

export const metadata = { title: "Playbook · Coach Manager CBTuró" };

export default async function ImprimirPlaybook() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <p className="p-6 text-sm">Elige un equipo primero.</p>;
  const [{ data }, { data: eq }] = await Promise.all([
    supabase.from("equipo_playbook").select("ejercicio_id, notas, ejercicios(titulo, tipo, categoria, descripcion, correcciones, preview, pizarra)").eq("equipo_id", equipo.id).order("orden"),
    supabase.from("equipos").select("playbook_token").eq("id", equipo.id).maybeSingle(),
  ]);
  const jugadas = ((data ?? []) as unknown as { ejercicio_id: string; notas: string | null; ejercicios: Omit<JugadaHoja, "id" | "notas"> | null }[])
    .filter((x) => x.ejercicios).map((x) => ({ id: x.ejercicio_id, notas: x.notas, ...x.ejercicios! }));
  const token = (eq as { playbook_token?: string | null } | null)?.playbook_token;
  return <HojaPlaybook equipo={equipo.nombre} jugadas={jugadas} volver="/playbook" enlace={token ? `https://coach.cbturo.com/jugadas/${token}` : null} />;
}
