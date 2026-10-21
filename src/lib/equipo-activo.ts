import { cookies } from "next/headers";
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

export async function equipoActivo(supabase: SupabaseClient): Promise<Equipo | null> {
  const id = (await cookies()).get(COOKIE_EQUIPO)?.value;
  if (!id) return null;
  const { data } = await supabase
    .from("equipos")
    .select("id, nombre, categoria, congelado, temporada_id")
    .eq("id", id)
    .maybeSingle();
  return (data as Equipo) ?? null;
}
