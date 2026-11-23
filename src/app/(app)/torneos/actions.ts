"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, veTorneos } from "@/lib/supabase/server";
import { aISO } from "@/lib/fechas";

/** «2026-12-05T10:00» (hora de Barcelona, de un input datetime-local) → ISO */
const local = (v: string) => { const [d, h] = v.split("T"); return d && h ? aISO(d, h.slice(0, 5)) : null; };
import {
  CAMPOS_EQUIPO, CAMPOS_PARTIDO, CAMPOS_TORNEO, LETRAS, clasificacion, ganador, generarCuadro, repartirGrupos, todosContraTodos,
  type EquipoT, type Formato, type PartidoT, type Torneo,
} from "@/lib/torneos";

type R = { ok?: boolean; error?: string };

async function cliente() {
  const { supabase, perfil } = await requireUser();
  if (!veTorneos(perfil)) throw new Error("Sin permiso");
  return supabase;
}
const texto = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max) || null;
const entero = (v: unknown, min: number, max: number, def: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const formato = (v: unknown): Formato => (v === "liga" || v === "eliminatoria" ? v : "grupos");
const refrescar = (id?: string) => { revalidatePath("/torneos"); if (id) revalidatePath(`/torneos/${id}`); };

async function cargar(supabase: Awaited<ReturnType<typeof cliente>>, id: string) {
  const [t, e, p] = await Promise.all([
    supabase.from("torneos").select(CAMPOS_TORNEO).eq("id", id).single(),
    supabase.from("torneo_equipos").select(CAMPOS_EQUIPO).eq("torneo_id", id).order("created_at"),
    supabase.from("torneo_partidos").select(CAMPOS_PARTIDO).eq("torneo_id", id),
  ]);
  if (!t.data) throw new Error("No existe el torneo");
  return { torneo: t.data as Torneo, equipos: (e.data ?? []) as EquipoT[], partidos: (p.data ?? []) as PartidoT[] };
}

// ---------- Torneo ----------
function datosTorneo(f: FormData) {
  return {
    nombre: texto(f.get("nombre")) ?? "Torneo",
    categoria: texto(f.get("categoria"), 60),
    fecha_inicio: texto(f.get("fecha_inicio"), 10),
    fecha_fin: texto(f.get("fecha_fin"), 10),
    lugar: texto(f.get("lugar")),
    formato: formato(f.get("formato")),
    num_grupos: entero(f.get("num_grupos"), 1, 16, 2),
    clasifican: entero(f.get("clasifican"), 1, 16, 2),
    ida_vuelta: f.get("ida_vuelta") === "on",
    tercer_puesto: f.get("tercer_puesto") === "on",
    puntos_victoria: entero(f.get("puntos_victoria"), 0, 10, 2),
    puntos_derrota: entero(f.get("puntos_derrota"), 0, 10, 1),
    duracion: entero(f.get("duracion"), 10, 240, 60),
    notas: texto(f.get("notas"), 2000),
  };
}

export async function crearTorneo(f: FormData) {
  const supabase = await cliente();
  const { data, error } = await supabase.from("torneos").insert(datosTorneo(f)).select("id").single();
  if (error) throw new Error(error.message);
  refrescar();
  redirect(`/torneos/${data.id}`);
}

export async function editarTorneo(id: string, f: FormData): Promise<R> {
  const supabase = await cliente();
  const { error } = await supabase.from("torneos").update(datosTorneo(f)).eq("id", id);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

export async function hacerPublico(id: string, publico: boolean): Promise<R> {
  const supabase = await cliente();
  const { error } = await supabase.from("torneos").update({ publico }).eq("id", id);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

export async function borrarTorneo(id: string) {
  const supabase = await cliente();
  await supabase.from("torneos").delete().eq("id", id);
  refrescar();
  redirect("/torneos");
}

// ---------- Equipos ----------
export async function anadirEquipos(id: string, lineas: string): Promise<R> {
  const supabase = await cliente();
  // Uno por línea; «Equipo · Club» o «Equipo, Club» para indicar el club
  const filas = lineas.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 64).map((l) => {
    const [nombre, club] = l.split(/\s*[·,|]\s*/);
    return { torneo_id: id, nombre: nombre.slice(0, 80), club: club?.slice(0, 80) || null };
  });
  if (!filas.length) return { error: "Escribe al menos un equipo." };
  const { error } = await supabase.from("torneo_equipos").insert(filas);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

export async function editarEquipo(torneoId: string, equipoId: string, d: { nombre?: string; club?: string | null; grupo?: string | null; cabeza?: number | null }): Promise<R> {
  const supabase = await cliente();
  const cambios: Record<string, unknown> = {};
  if (d.nombre !== undefined) cambios.nombre = texto(d.nombre, 80) ?? "Equipo";
  if (d.club !== undefined) cambios.club = texto(d.club, 80);
  if (d.grupo !== undefined) cambios.grupo = d.grupo && LETRAS.includes(d.grupo) ? d.grupo : null;
  if (d.cabeza !== undefined) cambios.cabeza = d.cabeza ? entero(d.cabeza, 1, 64, 1) : null;
  const { error } = await supabase.from("torneo_equipos").update(cambios).eq("id", equipoId).eq("torneo_id", torneoId);
  refrescar(torneoId);
  return error ? { error: error.message } : { ok: true };
}

export async function borrarEquipo(torneoId: string, equipoId: string): Promise<R> {
  const supabase = await cliente();
  const { error } = await supabase.from("torneo_equipos").delete().eq("id", equipoId).eq("torneo_id", torneoId);
  refrescar(torneoId);
  return error ? { error: error.message } : { ok: true };
}

export async function sortearGrupos(id: string): Promise<R> {
  const supabase = await cliente();
  const { torneo, equipos } = await cargar(supabase, id);
  if (equipos.length < 2) return { error: "Añade al menos 2 equipos." };
  const reparto = repartirGrupos(equipos, Math.min(torneo.num_grupos, equipos.length));
  for (const r of reparto) await supabase.from("torneo_equipos").update({ grupo: r.grupo }).eq("id", r.id);
  refrescar(id);
  return { ok: true };
}

// ---------- Calendario ----------
/** Partidos de la fase de grupos (o de la liga): todos contra todos dentro de cada grupo */
export async function generarFaseGrupos(id: string): Promise<R> {
  const supabase = await cliente();
  const { torneo, equipos, partidos } = await cargar(supabase, id);
  if (partidos.some((p) => p.fase === "grupo" && p.puntos_local !== null)) return { error: "Ya hay resultados en la fase de grupos: bórralos antes de volver a generar." };
  const grupos = new Map<string, string[]>();
  for (const e of equipos) {
    const g = torneo.formato === "liga" ? "A" : e.grupo;
    if (!g) return { error: `${e.nombre} no tiene grupo. Sortea los grupos o asígnalos a mano.` };
    grupos.set(g, [...(grupos.get(g) ?? []), e.id]);
  }
  if ([...grupos.values()].some((g) => g.length < 2)) return { error: "Cada grupo necesita al menos 2 equipos." };
  await supabase.from("torneo_partidos").delete().eq("torneo_id", id).eq("fase", "grupo");
  const filas = [...grupos.entries()].sort().flatMap(([g, ids]) => todosContraTodos(ids, torneo.ida_vuelta).map((c, i) => ({
    torneo_id: id, fase: "grupo", grupo: torneo.formato === "liga" ? null : g, ronda: c.ronda, orden: i, local_id: c.local, visitante_id: c.visitante,
  })));
  const { error } = await supabase.from("torneo_partidos").insert(filas);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

/** Cuadro de eliminatoria: con los clasificados de cada grupo, o con todos (eliminatoria directa) por cabeza de serie */
export async function generarEliminatoria(id: string): Promise<R> {
  const supabase = await cliente();
  const { torneo, equipos, partidos } = await cargar(supabase, id);
  if (partidos.some((p) => p.fase === "eliminatoria" && p.puntos_local !== null)) return { error: "La eliminatoria ya tiene resultados: bórrala antes de volver a generarla." };
  let sembrados: string[];
  if (torneo.formato === "eliminatoria") {
    sembrados = [...equipos].sort((a, b) => (a.cabeza ?? 999) - (b.cabeza ?? 999) || Math.random() - 0.5).map((e) => e.id);
  } else {
    const deGrupos = partidos.filter((p) => p.fase === "grupo");
    if (!deGrupos.length) return { error: "Primero genera y juega la fase de grupos." };
    if (deGrupos.some((p) => p.puntos_local === null)) return { error: "Faltan resultados de la fase de grupos." };
    const grupos = torneo.formato === "liga" ? [null] : [...new Set(equipos.map((e) => e.grupo))].filter(Boolean).sort() as (string | null)[];
    const tablas = grupos.map((g) => clasificacion(equipos.filter((e) => torneo.formato === "liga" || e.grupo === g), deGrupos, torneo.puntos_victoria, torneo.puntos_derrota));
    // Primero todos los 1.º, luego los 2.º… (así se cruzan 1.º de un grupo contra 2.º de otro)
    sembrados = [];
    for (let pos = 0; pos < torneo.clasifican; pos++) for (const t of tablas) if (t[pos]) sembrados.push(t[pos].id);
  }
  if (sembrados.length < 2) return { error: "Hacen falta al menos 2 equipos para la eliminatoria." };
  const { partidos: cuadro } = generarCuadro(sembrados, torneo.tercer_puesto);
  await supabase.from("torneo_partidos").delete().eq("torneo_id", id).eq("fase", "eliminatoria");
  const { error } = await supabase.from("torneo_partidos").insert(cuadro.map((c) => ({
    torneo_id: id, fase: "eliminatoria", ronda: c.ronda, orden: c.orden, tercer_puesto: c.tercer, local_id: c.local, visitante_id: c.visitante,
  })));
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

export async function borrarFase(id: string, fase: "grupo" | "eliminatoria"): Promise<R> {
  const supabase = await cliente();
  const { error } = await supabase.from("torneo_partidos").delete().eq("torneo_id", id).eq("fase", fase);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

/** Horario automático: reparte los partidos sin resultado en franjas desde «inicio», con N pistas a la vez */
export async function ponerHorario(id: string, inicio: string, pistas: number, pausa: number): Promise<R> {
  const supabase = await cliente();
  const { torneo, partidos } = await cargar(supabase, id);
  const t0 = new Date(local(inicio) ?? "x");
  if (Number.isNaN(t0.getTime())) return { error: "Pon el día y la hora del primer partido." };
  const n = entero(pistas, 1, 12, 1), hueco = (torneo.duracion + entero(pausa, 0, 120, 0)) * 60000;
  const pendientes = partidos.filter((p) => p.puntos_local === null)
    .sort((a, b) => (a.fase === b.fase ? 0 : a.fase === "grupo" ? -1 : 1) || a.ronda - b.ronda || Number(a.tercer_puesto) - Number(b.tercer_puesto) || (a.grupo ?? "").localeCompare(b.grupo ?? "") || a.orden - b.orden);
  // Una ronda nueva empieza en una franja nueva (nadie juega dos partidos a la vez)
  let franja = 0, enFranja = 0, clave = "";
  for (const p of pendientes) {
    const k = `${p.fase}|${p.ronda}`;
    if ((clave && k !== clave && enFranja > 0) || enFranja >= n) { franja++; enFranja = 0; }
    clave = k;
    await supabase.from("torneo_partidos").update({ fecha: new Date(t0.getTime() + franja * hueco).toISOString(), pista: n > 1 ? `Pista ${enFranja + 1}` : null }).eq("id", p.id);
    enFranja++;
  }
  refrescar(id);
  return { ok: true };
}

// ---------- Partidos ----------
export async function guardarPartido(torneoId: string, partidoId: string, d: { local: string; visitante: string; fecha?: string | null; pista?: string | null }): Promise<R> {
  const supabase = await cliente();
  const { partidos } = await cargar(supabase, torneoId);
  const p = partidos.find((x) => x.id === partidoId);
  if (!p) return { error: "Ese partido ya no existe." };
  const num = (v: string) => (v.trim() === "" ? null : entero(v, 0, 999, 0));
  const pl = num(d.local), pvv = num(d.visitante);
  if ((pl === null) !== (pvv === null)) return { error: "Pon los dos marcadores (o ninguno)." };
  if (p.fase === "eliminatoria" && pl !== null && pl === pvv) return { error: "En la eliminatoria no puede haber empate." };
  const cambios: Record<string, unknown> = { puntos_local: pl, puntos_visitante: pvv };
  if (d.fecha !== undefined) cambios.fecha = d.fecha ? local(d.fecha) : null;
  if (d.pista !== undefined) cambios.pista = texto(d.pista, 40);
  const { error } = await supabase.from("torneo_partidos").update(cambios).eq("id", partidoId);
  if (error) return { error: error.message };
  // Eliminatoria: el ganador pasa a la siguiente ronda (y los perdedores de semis, al 3.er puesto)
  if (p.fase === "eliminatoria" && !p.tercer_puesto) {
    const r = ganador({ ...p, puntos_local: pl, puntos_visitante: pvv });
    const lado = p.orden % 2 === 0 ? "local_id" : "visitante_id";
    const sig = partidos.find((x) => x.fase === "eliminatoria" && !x.tercer_puesto && x.ronda === p.ronda + 1 && x.orden === Math.floor(p.orden / 2));
    if (sig) await supabase.from("torneo_partidos").update({ [lado]: r?.gana ?? null }).eq("id", sig.id);
    const maxRonda = Math.max(...partidos.filter((x) => x.fase === "eliminatoria").map((x) => x.ronda));
    const tercero = partidos.find((x) => x.fase === "eliminatoria" && x.tercer_puesto);
    if (tercero && p.ronda === maxRonda - 1) await supabase.from("torneo_partidos").update({ [lado]: r?.pierde ?? null }).eq("id", tercero.id);
  }
  refrescar(torneoId);
  return { ok: true };
}
