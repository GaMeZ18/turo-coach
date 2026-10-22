import type { SupabaseClient } from "@supabase/supabase-js";
import type { Equipo } from "./equipo-activo";

// Campos de la ficha de un equipo rival
export const CAMPOS_EQUIPO: { k: string; label: string; opciones?: string[]; placeholder?: string }[] = [
  { k: "defensa", label: "Defensa", opciones: ["Individual", "Zona 2-3", "Zona 3-2", "Zona 1-3-1", "Presión toda pista", "Mixta / cambiante"] },
  { k: "ritmo", label: "Ritmo", opciones: ["Lento, posesiones largas", "Medio", "Rápido, contraataque"] },
  { k: "rebote", label: "Rebote", opciones: ["Débil", "Normal", "Fuerte"] },
  { k: "exterior", label: "Tiro exterior", opciones: ["Poco", "Normal", "Mucho"] },
  { k: "ataque", label: "Ataque / sistemas", placeholder: "Bloqueo directo central, juego al poste, sacadas de fondo…" },
  { k: "fuertes", label: "Puntos fuertes", placeholder: "Qué hacen bien" },
  { k: "debiles", label: "Puntos débiles", placeholder: "Dónde atacarles" },
  { k: "plan", label: "Cómo jugarles", placeholder: "Plan de partido: defensa, emparejamientos, ritmo…" },
];

export const POSICIONES = ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"];
export const ETIQUETAS_JUGADOR = [
  "Tirador", "Penetrador", "Pasador", "Reboteador", "Juego interior", "Buen defensor", "Defiende mal",
  "Contraataque", "Zurdo", "Se carga de faltas", "Líder", "Mal tirador de TL",
];

export type FichaRival = { nombre: string; notas: string | null; caracteristicas: Record<string, string | string[]>; updated_at: string };
export type FichaJugador = { rival: string; nombre: string; dorsal: string | null; notas: string | null; caracteristicas: { posicion?: string | null; mano?: string | null; etiquetas?: string[] } };

/** El scouting de un equipo solo lo ve su staff (y el coordinador) */
export async function puedeVerScouting(supabase: SupabaseClient, equipo: Equipo | null, userId: string, rol: string) {
  if (!equipo) return false;
  if (rol === "coordinador") return true;
  const { data } = await supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", equipo.id).eq("perfil_id", userId).maybeSingle();
  return !!data;
}

export const esTuro = (s: string) => /TUR[OÓ]/i.test(s);
