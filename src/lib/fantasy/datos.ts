import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hoyLocal } from "@/lib/fechas";
import { calcularLiga, type Alineacion, type Comodin, type FilaStats, type PartidoCal, type PreciosFijos } from "./motor";

export const ADMIN_FANTASY = "60fb55be-45e2-4f5d-addc-35aaf44b7610"; // Juan Gámez
export const COOKIE_FANTASY = "fantasy_sesion";

export type Prueba = { inicio: string; jornada: string; especial: string | null; alineacionAdmin: boolean };
export type Config = { abierto: boolean; inicio: string; premio: string | null; especiales: Record<string, string[]>; anuladas: string[]; campeon: string | null; cerrada: boolean; prueba: Prueba | null; duos: Record<string, string> };
export type Participante = { id: string; perfil_id: string | null; alias: string; nombre: string; mostrar: string | null; contacto: string | null; silenciado: boolean; comodines: Partial<Record<Comodin, string>>; emoji: string | null; color: string | null; foto: string | null; created_at: string };
export const CAMPOS_PARTICIPANTE = "id, perfil_id, alias, nombre, mostrar, contacto, silenciado, comodines, emoji, color, foto, created_at";
/** "Juan Gámez Gómez" → "Juan G." */
export const nombreCorto = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0] ?? ""; };

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
  const { data } = await db().from("fantasy_config").select("abierto, inicio, premio, especiales, anuladas, campeon, cerrada, prueba, duos").eq("id", 1).single();
  return { abierto: !!data?.abierto, inicio: data?.inicio ?? "2026-11-09", premio: data?.premio ?? null, especiales: (data?.especiales ?? {}) as Record<string, string[]>, anuladas: data?.anuladas ?? [], campeon: data?.campeon ?? null, cerrada: !!data?.cerrada, prueba: (data?.prueba as Prueba | null) ?? null, duos: (data?.duos ?? {}) as Record<string, string> };
}

/** Quién está mirando: usuario de la app (staff) y/o participante del fantasy */
export async function quienSoy() {
  const config = await leerConfig();
  let perfil: { id: string; nombre: string | null; rol: string | null } | null = null;
  try {
    const supa = await createClient();
    const { data: cl } = await supa.auth.getClaims();
    const user = cl?.claims?.sub ? { id: cl.claims.sub as string, email: (cl.claims.email as string | undefined) ?? null } : null;
    if (user) {
      const { data } = await supa.from("perfiles").select("id, nombre, rol").eq("id", user.id).maybeSingle();
      perfil = { id: user.id, nombre: data?.nombre ?? user.email ?? null, rol: data?.rol ?? null };
    }
  } catch { /* sin sesión */ }
  const d = db();
  let participante: Participante | null = null;
  const campos = CAMPOS_PARTICIPANTE;
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
  // Cargar puntos (estadísticas de la FCBQ): el administrador y los coordinadores
  const cargaPuntos = esAdmin || perfil?.rol === "coordinador";
  return { config, perfil, participante, esAdmin, cargaPuntos, acceso: config.abierto || esAdmin };
}

/** Todo lo necesario para calcular la liga */
export async function cargarLiga(config: Config) {
  const d = db();
  const { data: eqs } = await d.from("equipos").select("id, nombre, temporadas!inner(actual)").eq("temporadas.actual", true);
  const equipos = ((eqs ?? []) as { id: string; nombre: string }[]).map((e) => ({ id: e.id, nombre: e.nombre }));
  const ids = equipos.map((e) => e.id);
  const desde = new Date(Date.parse(config.inicio) - 120 * 864e5).toISOString();
  const [{ data: filas }, { data: partidos }, { data: parts }, { data: als }, { data: msgs }, { data: fijos }] = await Promise.all([
    d.from("fcbq_stats").select("equipo_id, stats_id, fecha, datos").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).or("local.ilike.%tur%,visitante.ilike.%tur%").limit(2000),
    d.from("partidos").select("id, equipo_id, fecha, fcbq_stats_id, rival, local, puntos_favor, puntos_contra").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).gte("fecha", desde).limit(2000),
    d.from("fantasy_participantes").select(CAMPOS_PARTICIPANTE).order("created_at"),
    d.from("fantasy_alineaciones").select("participante_id, jornada, titulares, suplente, capitan, comodin, coste, duo"),
    d.from("fantasy_mensajes").select("participante_id").eq("borrado", false),
    d.from("fantasy_precios").select("jornada, precios"),
  ]);
  // Para el dúo técnico: ¿el rival de cada partido va por encima en la clasificación?
  const clas = await cargarClasificaciones();
  const rivalArriba: Record<string, boolean> = {};
  for (const p of (partidos ?? []) as PartidoCal[]) {
    const c = clas.get(p.equipo_id), r = posicion(c, p.rival), n = posicion(c, null, true);
    if (r && n) rivalArriba[p.id] = r.pos < n.pos;
  }
  const preciosFijos: PreciosFijos = Object.fromEntries((fijos ?? []).map((f) => [f.jornada as string, f.precios as PreciosFijos[string]]));
  const participantes = (parts ?? []) as Participante[];
  const mensajes: Record<string, number> = {};
  for (const m of msgs ?? []) mensajes[m.participante_id as string] = (mensajes[m.participante_id as string] ?? 0) + 1;
  const liga = calcularLiga({
    inicio: config.inicio, hoy: hoyLocal(), ahora: new Date().toISOString(),
    equipos, filas: (filas ?? []) as FilaStats[], partidos: (partidos ?? []) as PartidoCal[],
    especiales: config.especiales, anuladas: config.anuladas,
    alineaciones: (als ?? []) as Alineacion[], participantes: participantes.map((p) => ({ id: p.id, alias: p.alias })),
    mensajes, cerrada: config.cerrada, campeon: config.campeon, preciosFijos, duosNombres: config.duos, rivalArriba,
  });
  // Al abrirse una jornada se guardan sus precios: así no cambian aunque luego entren más estadísticas
  if (liga.abierta && !preciosFijos[liga.abierta]) {
    const p = [...liga.precio(liga.abierta), ...liga.precioDuo(liga.abierta)];
    await d.from("fantasy_precios").upsert({ jornada: liga.abierta, precios: Object.fromEntries(p.map(([id, x]) => [id, [x.precio, x.media, x.pj]])) }, { onConflict: "jornada", ignoreDuplicates: true });
  }
  return { liga, participantes, partidos: (partidos ?? []) as PartidoCal[], equipos };
}

/** Clasificación de la liga de cada equipo (la que trae la extensión de la FCBQ): para saber en qué posición va cada uno */
export type Clasif = { filas: string[][] };
export async function cargarClasificaciones(): Promise<Map<string, Clasif>> {
  const { data } = await db().from("ligas_fcbq").select("equipo_id, clasificacion");
  return new Map(((data ?? []) as { equipo_id: string; clasificacion: Clasif | null }[]).filter((x) => x.clasificacion?.filas?.length).map((x) => [x.equipo_id, x.clasificacion!]));
}
const normEq = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
/** Posición de un equipo en la tabla (por nombre; el Turó se busca por «TURÓ») */
export function posicion(c: Clasif | undefined, nombre: string | null | undefined, turo = false): { pos: number; total: number } | null {
  if (!c) return null;
  const n = nombre ? normEq(nombre) : "";
  const fila = turo ? c.filas.find((f) => /TUR[OÓ]/i.test(f[1] ?? ""))
    : c.filas.find((f) => normEq(f[1] ?? "") === n) ?? (n.length > 5 ? c.filas.find((f) => { const m = normEq(f[1] ?? ""); return m.includes(n) || n.includes(m); }) : undefined);
  const pos = fila ? Number(fila[0]) : NaN;
  return Number.isFinite(pos) ? { pos, total: c.filas.length } : null;
}
