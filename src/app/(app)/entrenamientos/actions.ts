"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aISO } from "@/lib/fechas";
import { check } from "@/lib/db";

const ruta = (id: string) => `/entrenamientos/${id}`;

export async function crearEntreno(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entrenamientos")
    .insert({
      equipo_id: String(formData.get("equipo_id")),
      fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "18:00")),
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      duracion_prevista: Number(formData.get("duracion_prevista") || 90),
      lugar: String(formData.get("lugar") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(ruta(data.id));
}

export async function editarEntreno(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("entrenamientos")
    .update({
      fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "18:00")),
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      duracion_prevista: Number(formData.get("duracion_prevista") || 90),
      lugar: String(formData.get("lugar") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ruta(id));
  revalidatePath("/entrenamientos");
}

export async function borrarEntreno(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("entrenamientos").delete().eq("id", String(formData.get("id"))));
  redirect("/entrenamientos");
}

export async function duplicarEntreno(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("entrenamientos").select("*").eq("id", id).single();
  if (!e) return;
  const semana = new Date(new Date(e.fecha).getTime() + 7 * 24 * 3600 * 1000).toISOString();
  const { data: nuevo } = await supabase
    .from("entrenamientos")
    .insert({
      equipo_id: e.equipo_id, fecha: semana, titulo: e.titulo,
      duracion_prevista: e.duracion_prevista, lugar: e.lugar, notas: e.notas,
    })
    .select("id")
    .single();
  if (!nuevo) return;
  const { data: acts } = await supabase.from("entreno_actividades").select("*").eq("entrenamiento_id", id);
  if (acts?.length) {
    check(await supabase.from("entreno_actividades").insert(
      acts.map(({ id: _id, entrenamiento_id: _e, ...resto }) => ({ ...resto, entrenamiento_id: nuevo.id }))
    ));
  }
  redirect(ruta(nuevo.id));
}

export async function guardarNotasEntreno(id: string, campos: { titulo?: string; notas?: string; duracion_prevista?: number }) {
  const supabase = await createClient();
  check(await supabase.from("entrenamientos").update(campos).eq("id", id));
  revalidatePath(ruta(id));
}

// ---------- Actividades ----------
export async function anadirActividad(formData: FormData) {
  const supabase = await createClient();
  const entreno = String(formData.get("entrenamiento_id"));
  const ejercicioId = String(formData.get("ejercicio_id") ?? "") || null;
  let titulo = String(formData.get("titulo") ?? "").trim() || null;
  let duracion = Number(formData.get("duracion") || 10);

  if (ejercicioId) {
    const { data: ej } = await supabase.from("ejercicios").select("titulo, duracion").eq("id", ejercicioId).single();
    titulo = titulo ?? ej?.titulo ?? null;
    if (!formData.get("duracion") && ej?.duracion) duracion = ej.duracion;
  }
  const { count } = await supabase
    .from("entreno_actividades")
    .select("id", { count: "exact", head: true })
    .eq("entrenamiento_id", entreno);

  check(await supabase.from("entreno_actividades").insert({
    entrenamiento_id: entreno,
    orden: count ?? 0,
    tipo: ejercicioId ? "ejercicio" : String(formData.get("tipo") ?? "nota"),
    ejercicio_id: ejercicioId,
    titulo,
    duracion,
  }));
  revalidatePath(ruta(entreno));
}

export async function actualizarActividad(entreno: string, id: string, campos: { duracion?: number; notas?: string; titulo?: string }) {
  const supabase = await createClient();
  check(await supabase.from("entreno_actividades").update(campos).eq("id", id));
  revalidatePath(ruta(entreno));
}

export async function borrarActividad(entreno: string, id: string) {
  const supabase = await createClient();
  check(await supabase.from("entreno_actividades").delete().eq("id", id));
  revalidatePath(ruta(entreno));
}

/** Guarda el orden completo tras reordenar en el cliente. */
export async function reordenarActividades(entreno: string, ids: string[]) {
  const supabase = await createClient();
  await Promise.all(
    ids.map((id, orden) => supabase.from("entreno_actividades").update({ orden }).eq("id", id))
  );
  revalidatePath(ruta(entreno));
}

// ---------- Asistencia ----------
export async function guardarAsistencia(entreno: string, jugador: string, estado: string, motivo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asistencias")
    .upsert({ entrenamiento_id: entreno, jugador_id: jugador, estado, motivo });
  if (error) throw new Error(error.message);
  revalidatePath(ruta(entreno));
}

export async function todosPresentes(entreno: string, jugadores: string[]) {
  const supabase = await createClient();
  check(await supabase.from("asistencias").upsert(
    jugadores.map((j) => ({ entrenamiento_id: entreno, jugador_id: j, estado: "presente", motivo: null }))
  ));
  revalidatePath(ruta(entreno));
}

// ---------- Plantillas ----------
type ActividadPlantilla = { tipo: string; ejercicio_id: string | null; titulo: string | null; duracion: number; notas: string | null };
const sinTabla = (m: string) => (/plantillas_entreno/.test(m) ? "Ejecuta antes 0008_plantillas_entreno.sql en Supabase." : m);

/** Guarda la sesión de un entreno como plantilla reutilizable */
export async function guardarComoPlantilla(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("entrenamientos").select("equipo_id, duracion_prevista, notas").eq("id", id).single();
  const { data: acts } = await supabase.from("entreno_actividades").select("tipo, ejercicio_id, titulo, duracion, notas").eq("entrenamiento_id", id).order("orden");
  const { error } = await supabase.from("plantillas_entreno").insert({
    nombre: String(formData.get("nombre") ?? "").trim() || "Plantilla",
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    equipo_id: formData.get("club") === "1" ? null : e?.equipo_id ?? null,
    duracion_prevista: e?.duracion_prevista ?? 90,
    actividades: (acts ?? []) as ActividadPlantilla[],
  });
  if (error) throw new Error(sinTabla(error.message));
  revalidatePath("/entrenamientos/plantillas");
  revalidatePath(ruta(id));
}

export async function borrarPlantilla(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("plantillas_entreno").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/entrenamientos/plantillas");
}

async function copiarPlantilla(supabase: Awaited<ReturnType<typeof createClient>>, plantillaId: string, entrenoId: string) {
  const { data: p } = await supabase.from("plantillas_entreno").select("actividades").eq("id", plantillaId).single();
  let acts = (p?.actividades ?? []) as ActividadPlantilla[];
  // Si algún ejercicio de la plantilla se ha borrado, queda como actividad sin ejercicio
  const ids = acts.map((a) => a.ejercicio_id).filter(Boolean) as string[];
  if (ids.length) {
    const { data: vivos } = await supabase.from("ejercicios").select("id").in("id", ids);
    const ok = new Set((vivos ?? []).map((x) => x.id));
    acts = acts.map((a) => (a.ejercicio_id && !ok.has(a.ejercicio_id) ? { ...a, ejercicio_id: null, tipo: "nota" } : a));
  }
  if (acts.length) {
    check(await supabase.from("entreno_actividades").insert(acts.map((a, orden) => ({ ...a, orden, entrenamiento_id: entrenoId }))));
  }
}

/** Crear un entreno (opcionalmente desde una plantilla) */
export async function crearEntrenoDesde(formData: FormData) {
  const supabase = await createClient();
  const plantilla = String(formData.get("plantilla_id") ?? "");
  let duracion = Number(formData.get("duracion_prevista") || 90);
  let titulo = String(formData.get("titulo") ?? "").trim() || null;
  if (plantilla) {
    const { data: p } = await supabase.from("plantillas_entreno").select("nombre, duracion_prevista").eq("id", plantilla).single();
    if (p) { duracion = p.duracion_prevista; titulo = titulo ?? p.nombre; }
  }
  const { data, error } = await supabase.from("entrenamientos").insert({
    equipo_id: String(formData.get("equipo_id")),
    fecha: aISO(String(formData.get("dia")), String(formData.get("hora") || "18:00")),
    titulo, duracion_prevista: duracion,
    lugar: String(formData.get("lugar") ?? "").trim() || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  if (plantilla) await copiarPlantilla(supabase, plantilla, data.id);
  redirect(ruta(data.id));
}

/** Programar varios entrenos: ciertos días de la semana, a una hora, entre dos fechas */
export async function programarEntrenos(formData: FormData) {
  const supabase = await createClient();
  const equipo = String(formData.get("equipo_id"));
  const dias = formData.getAll("dias").map(Number); // 1 = lunes … 7 = domingo
  const hora = String(formData.get("hora") || "18:00");
  const desde = String(formData.get("desde")), hasta = String(formData.get("hasta"));
  const plantilla = String(formData.get("plantilla_id") ?? "");
  const duracion = Number(formData.get("duracion_prevista") || 90);
  const lugar = String(formData.get("lugar") ?? "").trim() || null;
  if (!dias.length || !desde || !hasta) throw new Error("Elige los días y las fechas.");

  // Fechas que ya tienen entreno (para no duplicar)
  const { data: ya } = await supabase.from("entrenamientos").select("fecha").eq("equipo_id", equipo).gte("fecha", aISO(desde, "00:00")).lte("fecha", aISO(hasta, "23:59"));
  const ocupados = new Set((ya ?? []).map((x) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(x.fecha))));
  const filas: { equipo_id: string; fecha: string; titulo: string | null; duracion_prevista: number; lugar: string | null }[] = [];
  let titulo: string | null = String(formData.get("titulo") ?? "").trim() || null;
  let dur = duracion;
  if (plantilla) {
    const { data: p } = await supabase.from("plantillas_entreno").select("nombre, duracion_prevista").eq("id", plantilla).single();
    if (p) { titulo = titulo ?? p.nombre; dur = p.duracion_prevista; }
  }
  for (let d = new Date(`${desde}T12:00:00Z`); d <= new Date(`${hasta}T12:00:00Z`); d = new Date(d.getTime() + 864e5)) {
    const dia = d.toISOString().slice(0, 10);
    const semana = ((d.getUTCDay() + 6) % 7) + 1;
    if (!dias.includes(semana) || ocupados.has(dia)) continue;
    filas.push({ equipo_id: equipo, fecha: aISO(dia, hora), titulo, duracion_prevista: dur, lugar });
    if (filas.length >= 120) break;
  }
  if (filas.length) {
    const { data: creados, error } = await supabase.from("entrenamientos").insert(filas).select("id");
    if (error) throw new Error(error.message);
    if (plantilla) for (const c of creados ?? []) await copiarPlantilla(supabase, plantilla, c.id);
  }
  revalidatePath("/entrenamientos");
  revalidatePath("/calendario");
}
