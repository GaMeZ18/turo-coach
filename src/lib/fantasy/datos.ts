import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hoyLocal } from "@/lib/fechas";
import { calcularLiga, type Alineacion, type Comodin, type FilaStats, type PartidoCal } from "./motor";

export const ADMIN_FANTASY = "60fb55be-45e2-4f5d-addc-35aaf44b7610"; // Juan Gámez
export const COOKIE_FANTASY = "fantasy_sesion";

export type Config = { abierto: boolean; inicio: string; premio: string | null; especiales: Record<string, string[]>; anuladas: string[]; campeon: string | null; cerrada: boolean };
export type Participante = { id: string; perfil_id: string | null; alias: string; nombre: string; contacto: string | null; silenciado: boolean; comodines: Partial<Record<Comodin, string>>; created_at: string };

export function db() {
  const d = adminClient();
  if (!d) throw new Error("Falta la configuración del servidor (SUPABASE_SERVICE_ROLE_KEY).");
  return d;
}

export const hashSesion = (t: string) => createHash("sha256").update(t).digest("hex");
export function hashPin(pin: string) { const sal = randomBytes(12).toString("hex"); return `${sal}:${scryptSync(pin, sal, 32).toString("hex")}`; }
export function pinOk(pin: string, guardado: string | null) {
  if (!guardado) return false;
  const [sal, h] = guardado.split(":");
  const a = Buffer.from(h, "hex"), b = scryptSync(pin, sal, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const nuevaSesion = () => randomBytes(24).toString("hex");

export async function leerConfig(): Promise<Config> {
  const { data } = await db().from("fantasy_config").select("abierto, inicio, premio, especiales, anuladas, campeon, cerrada").eq("id", 1).single();
  return { abierto: !!data?.abierto, inicio: data?.inicio ?? "2026-11-09", premio: data?.premio ?? null, especiales: (data?.especiales ?? {}) as Record<string, string[]>, anuladas: data?.anuladas ?? [], campeon: data?.campeon ?? null, cerrada: !!data?.cerrada };
}

/** Quién está mirando: usuario de la app (staff) y/o participante del fantasy */
export async function quienSoy() {
  const config = await leerConfig();
  let perfil: { id: string; nombre: string | null } | null = null;
  try {
    const supa = await createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (user) {
      const { data } = await supa.from("perfiles").select("id, nombre").eq("id", user.id).maybeSingle();
      perfil = { id: user.id, nombre: data?.nombre ?? user.email ?? null };
    }
  } catch { /* sin sesión */ }
  const d = db();
  let participante: Participante | null = null;
  const campos = "id, perfil_id, alias, nombre, contacto, silenciado, comodines, created_at";
  if (perfil) {
    const { data } = await d.from("fantasy_participantes").select(campos).eq("perfil_id", perfil.id).maybeSingle();
    participante = (data as Participante | null) ?? null;
  }
  if (!participante) {
    const t = (await cookies()).get(COOKIE_FANTASY)?.value;
    if (t) {
      const { data } = await d.from("fantasy_participantes").select(campos).eq("sesion_hash", hashSesion(t)).maybeSingle();
      participante = (data as Participante | null) ?? null;
    }
  }
  const esAdmin = perfil?.id === ADMIN_FANTASY;
  return { config, perfil, participante, esAdmin, acceso: config.abierto || esAdmin };
}

/** Todo lo necesario para calcular la liga */
export async function cargarLiga(config: Config) {
  const d = db();
  const { data: eqs } = await d.from("equipos").select("id, nombre, temporadas!inner(actual)").eq("temporadas.actual", true);
  const equipos = ((eqs ?? []) as { id: string; nombre: string }[]).map((e) => ({ id: e.id, nombre: e.nombre }));
  const ids = equipos.map((e) => e.id);
  const desde = new Date(Date.parse(config.inicio) - 120 * 864e5).toISOString();
  const [{ data: filas }, { data: partidos }, { data: parts }, { data: als }, { data: msgs }] = await Promise.all([
    d.from("fcbq_stats").select("equipo_id, stats_id, fecha, datos").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).or("local.ilike.%tur%,visitante.ilike.%tur%").limit(2000),
    d.from("partidos").select("id, equipo_id, fecha, fcbq_stats_id").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).gte("fecha", desde).limit(2000),
    d.from("fantasy_participantes").select("id, perfil_id, alias, nombre, contacto, silenciado, comodines, created_at").order("created_at"),
    d.from("fantasy_alineaciones").select("participante_id, jornada, titulares, suplente, capitan, comodin, coste"),
    d.from("fantasy_mensajes").select("participante_id").eq("borrado", false),
  ]);
  const participantes = (parts ?? []) as Participante[];
  const mensajes: Record<string, number> = {};
  for (const m of msgs ?? []) mensajes[m.participante_id as string] = (mensajes[m.participante_id as string] ?? 0) + 1;
  const liga = calcularLiga({
    inicio: config.inicio, hoy: hoyLocal(), ahora: new Date().toISOString(),
    equipos, filas: (filas ?? []) as FilaStats[], partidos: (partidos ?? []) as PartidoCal[],
    especiales: config.especiales, anuladas: config.anuladas,
    alineaciones: (als ?? []) as Alineacion[], participantes: participantes.map((p) => ({ id: p.id, alias: p.alias })),
    mensajes, cerrada: config.cerrada, campeon: config.campeon,
  });
  return { liga, participantes, partidos: (partidos ?? []) as PartidoCal[], equipos };
}
