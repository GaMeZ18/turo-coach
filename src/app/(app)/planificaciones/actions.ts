"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;
const ruta = (id: string) => `/planificaciones/${id}`;

export async function crearPlanificacion(fd: FormData) {
  const supabase = await createClient();
  const ambito = String(fd.get("ambito") ?? "club");
  const { data: temporada } = await supabase.from("temporadas").select("id").eq("actual", true).maybeSingle();
  const { data, error } = await supabase
    .from("planificaciones")
    .insert({
      nombre: texto(fd, "nombre") ?? "Planificación",
      descripcion: texto(fd, "descripcion"),
      equipo_id: ambito === "club" ? null : ambito,
      temporada_id: temporada?.id ?? null,
    })
    .select("id")
    .single();
  check({ error });
  redirect(ruta(data!.id));
}

export async function editarPlanificacion(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  check(await supabase.from("planificaciones").update({ nombre: texto(fd, "nombre") ?? "Planificación", descripcion: texto(fd, "descripcion") }).eq("id", id));
  revalidatePath(ruta(id));
}

export async function borrarPlanificacion(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("planificaciones").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/planificaciones");
  redirect("/planificaciones");
}

/** Copia una planificación (p. ej. la del club) para un equipo, con todo su árbol */
export async function duplicarPlanificacion(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const ambito = String(fd.get("ambito") ?? "club");
  const { data: p } = await supabase.from("planificaciones").select("*").eq("id", id).single();
  if (!p) return;
  const { data: nueva, error } = await supabase
    .from("planificaciones")
    .insert({ nombre: `${p.nombre}${ambito === (p.equipo_id ?? "club") ? " (copia)" : ""}`, descripcion: p.descripcion, equipo_id: ambito === "club" ? null : ambito, temporada_id: p.temporada_id })
    .select("id")
    .single();
  check({ error });

  const { data: objetivos } = await supabase.from("objetivos").select("*").eq("planificacion_id", id);
  // Insertamos por niveles para poder enlazar cada hijo con el nuevo id de su padre
  const nuevoId = new Map<string, string>();
  let pendientes = [...(objetivos ?? [])];
  while (pendientes.length) {
    const nivel = pendientes.filter((o) => !o.padre_id || nuevoId.has(o.padre_id));
    if (!nivel.length) break;
    const { data: creados, error: e2 } = await supabase
      .from("objetivos")
      .insert(nivel.map((o) => ({ planificacion_id: nueva!.id, padre_id: o.padre_id ? nuevoId.get(o.padre_id) : null, nombre: o.nombre, descripcion: o.descripcion, color: o.color, orden: o.orden })))
      .select("id");
    check({ error: e2 });
    nivel.forEach((o, i) => nuevoId.set(o.id, creados![i].id));
    pendientes = pendientes.filter((o) => !nuevoId.has(o.id));
  }
  revalidatePath("/planificaciones");
  redirect(ruta(nueva!.id));
}

export async function crearObjetivo(fd: FormData) {
  const supabase = await createClient();
  const plan = String(fd.get("planificacion_id"));
  const padre = texto(fd, "padre_id");
  const nombres = String(fd.get("nombre") ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
  if (!nombres.length) return;
  let q = supabase.from("objetivos").select("orden").eq("planificacion_id", plan).order("orden", { ascending: false }).limit(1);
  q = padre ? q.eq("padre_id", padre) : q.is("padre_id", null);
  const { data: ultimo } = await q.maybeSingle();
  const base = (ultimo?.orden ?? -1) + 1;
  // Varias líneas = varios objetivos de golpe
  check(await supabase.from("objetivos").insert(nombres.map((nombre, i) => ({
    planificacion_id: plan, padre_id: padre, nombre, color: texto(fd, "color"), orden: base + i,
  }))));
  revalidatePath(ruta(plan));
}

export async function editarObjetivo(fd: FormData) {
  const supabase = await createClient();
  const sinColor = fd.get("heredar") === "1";
  check(await supabase.from("objetivos").update({
    nombre: texto(fd, "nombre") ?? "Objetivo",
    descripcion: texto(fd, "descripcion"),
    color: sinColor ? null : texto(fd, "color"),
  }).eq("id", String(fd.get("id"))));
  revalidatePath(ruta(String(fd.get("planificacion_id"))));
}

export async function borrarObjetivo(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("objetivos").delete().eq("id", String(fd.get("id"))));
  revalidatePath(ruta(String(fd.get("planificacion_id"))));
}

/** Sube o baja un objetivo entre sus hermanos */
export async function moverObjetivo(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const dir = Number(fd.get("dir"));
  const { data: o } = await supabase.from("objetivos").select("id, planificacion_id, padre_id").eq("id", id).single();
  if (!o) return;
  let q = supabase.from("objetivos").select("id, orden, nombre").eq("planificacion_id", o.planificacion_id);
  q = o.padre_id ? q.eq("padre_id", o.padre_id) : q.is("padre_id", null);
  const { data: hermanos } = await q;
  const lista = (hermanos ?? []).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  const i = lista.findIndex((h) => h.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await Promise.all(lista.map((h, k) => supabase.from("objetivos").update({ orden: k }).eq("id", h.id)));
  revalidatePath(ruta(o.planificacion_id));
}

/** Objetivos trabajados en un entreno */
export async function guardarObjetivosEntreno(entrenoId: string, ids: string[]) {
  const supabase = await createClient();
  const { data: actuales } = await supabase.from("entreno_objetivos").select("objetivo_id").eq("entrenamiento_id", entrenoId);
  const antes = new Set((actuales ?? []).map((a) => a.objetivo_id as string));
  const ahora = new Set(ids);
  const quitar = [...antes].filter((x) => !ahora.has(x));
  const poner = [...ahora].filter((x) => !antes.has(x));
  if (quitar.length) check(await supabase.from("entreno_objetivos").delete().eq("entrenamiento_id", entrenoId).in("objetivo_id", quitar));
  if (poner.length) check(await supabase.from("entreno_objetivos").insert(poner.map((objetivo_id) => ({ entrenamiento_id: entrenoId, objetivo_id }))));
  revalidatePath(`/entrenamientos/${entrenoId}`);
  revalidatePath("/planificaciones", "layout");
}
