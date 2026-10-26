import { cookies } from "next/headers";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const COOKIE_EQUIPO = "equipo_activo";

export type Equipo = {
  id: string;
  nombre: string;
  categoria: string | null;
  congelado: boolean;
  temporada_id: string;
};

/** Equipos de la temporada actual. El coordinador ve todos; el entrenador, los suyos primero. */
export async function equiposDeTemporada(supabase: SupabaseClient) {
  const { data: temporada } = await supabase
    .from("temporadas")
    .select("id, nombre")
    .eq("actual", true)
    .maybeSingle();
  if (!temporada) return { temporada: null, equipos: [] as Equipo[] };
  const { data } = await supabase
    .from("equipos")
    .select("id, nombre, categoria, congelado, temporada_id")
    .eq("temporada_id", temporada.id)
    .order("nombre");
  return { temporada, equipos: (data ?? []) as Equipo[] };
}

/** Equipos con los que puede trabajar el usuario: el coordinador, todos; el resto, donde es staff */
export const misEquipos = cache(async (supabase: SupabaseClient) => {
  const { user, perfil } = await requireUser();
  const { temporada, equipos } = await equiposDeTemporada(supabase);
  if (perfil.rol === "coordinador") return { temporada, equipos };
  const { data: staff } = await supabase.from("equipo_staff").select("equipo_id").eq("perfil_id", user.id);
  const mios = new Set((staff ?? []).map((x) => x.equipo_id as string));
  return { temporada, equipos: equipos.filter((e) => mios.has(e.id)) };
});

/** Equipo con el que se está trabajando (cookie). Si no hay o no es suyo, el primero de sus equipos. */
export const equipoActivo = cache(async (supabase: SupabaseClient): Promise<Equipo | null> => {
  const id = (await cookies()).get(COOKIE_EQUIPO)?.value;
  const { perfil } = await requireUser();
  if (id) {
    const { data } = await supabase
      .from("equipos")
      .select("id, nombre, categoria, congelado, temporada_id")
      .eq("id", id)
      .maybeSingle();
    if (data && perfil.rol === "coordinador") return data as Equipo;
    if (data) {
      const { equipos } = await misEquipos(supabase);
      if (equipos.some((e) => e.id === data.id)) return data as Equipo;
    }
  }
  // Sin elegir (o elegido uno que no es suyo): si el usuario tiene equipos, el primero
  if (perfil.rol !== "coordinador") {
    const { equipos } = await misEquipos(supabase);
    return equipos[0] ?? null;
  }
  return null;
});
