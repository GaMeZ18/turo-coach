"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { AVISO_MIGRACION, ENFOQUES, MODALIDADES, POSICIONES, RE_COLUMNAS_NUEVAS, inferirFiltros, sinColumnasNuevas } from "@/lib/ejercicio-filtros";

export type DatosEjercicio = {
  id?: string;
  tipo: "ejercicio" | "sistema";
  titulo: string;
  descripcion: string;
  correcciones: string;
  categoria: string;
  etiquetas: string[];
  jugadores_min: number | null;
  duracion: number | null;
  video_url: string;
  visibilidad: "privado" | "club";
  pizarra: unknown;
  preview: string | null;
  en_biblioteca?: boolean;
  edades?: string[];
  material?: string;
  objetivos?: string;
  // Datos para filtrar (0025_ejercicios_filtros.sql)
  enfoques?: string[];
  posiciones?: string[];
  modalidad?: string | null;
  jugadores_max?: number | null;
  balones?: number | null;
  canastas?: number | null;
  conos?: number | null;
  petos?: number | null;
};

const vacioANull = (s: string) => (s.trim() === "" ? null : s.trim());
const faltaSQL = (m: string) => (RE_COLUMNAS_NUEVAS.test(m) ? AVISO_MIGRACION : /en_biblioteca|edades|material/.test(m) ? "Para usar la biblioteca, ejecuta antes 0007_biblioteca.sql en Supabase." : m);
const cantidad = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : null);

export async function guardarEjercicio(d: DatosEjercicio, entrenoId?: string) {
  const supabase = await createClient();
  // Para qué sirve: el primero que se marca es la categoría principal de siempre
  const marcados = (d.enfoques ?? []).filter((x) => (ENFOQUES as readonly string[]).includes(x));
  const categoria = marcados[0] ?? vacioANull(d.categoria);
  const enfoques = categoria && !marcados.includes(categoria) ? [categoria, ...marcados] : marcados;
  const fila: Record<string, unknown> & { titulo: string; visibilidad: string; en_biblioteca: boolean } = {
    tipo: d.tipo,
    titulo: d.titulo.trim() || "Sin título",
    descripcion: vacioANull(d.descripcion),
    correcciones: vacioANull(d.correcciones),
    categoria,
    etiquetas: d.etiquetas.map((e) => e.trim().toLowerCase()).filter(Boolean),
    jugadores_min: d.jugadores_min,
    duracion: d.duracion,
    video_url: vacioANull(d.video_url),
    visibilidad: d.visibilidad,
    pizarra: d.pizarra,
    preview: d.preview,
    updated_at: new Date().toISOString(),
    // Biblioteca (columnas de 0007_biblioteca.sql)
    en_biblioteca: !!d.en_biblioteca,
    edades: d.edades ?? [],
    material: vacioANull(d.material ?? ""),
    objetivos: vacioANull(d.objetivos ?? ""),
    // Datos para filtrar (columnas de 0025_ejercicios_filtros.sql)
    enfoques,
    posiciones: (d.posiciones ?? []).filter((x) => (POSICIONES as readonly string[]).includes(x)),
    modalidad: MODALIDADES.some((m) => m.v === d.modalidad) ? d.modalidad : null,
    jugadores_max: cantidad(d.jugadores_max),
    balones: cantidad(d.balones),
    canastas: cantidad(d.canastas),
    conos: cantidad(d.conos),
    petos: cantidad(d.petos),
  };
  // En la biblioteca, siempre visible para el club
  if (fila.en_biblioteca) fila.visibilidad = "club";

  // Si aún faltan columnas en la base de datos (0012 objetivos, 0025 filtros), se guarda sin ellas
  const editando = !!d.id;
  let id = d.id;
  let datos: Record<string, unknown> = { ...fila };
  let error: { message: string } | null = null;
  for (let intento = 0; intento < 3; intento++) {
    if (editando) {
      ({ error } = await supabase.from("ejercicios").update(datos).eq("id", d.id!));
    } else {
      const r = await supabase.from("ejercicios").insert(datos).select("id").single();
      error = r.error;
      if (!r.error && r.data) id = r.data.id;
    }
    if (!error) break;
    if (RE_COLUMNAS_NUEVAS.test(error.message)) datos = sinColumnasNuevas(datos);
    else if (/objetivos/.test(error.message)) { const { objetivos: _o, ...resto } = datos; datos = resto; }
    else break;
  }
  if (error || !id) return { error: faltaSQL(error?.message ?? "No se ha podido guardar") };
  revalidatePath("/ejercicios");
  if (entrenoId && !d.id) {
    const { count } = await supabase
      .from("entreno_actividades")
      .select("id", { count: "exact", head: true })
      .eq("entrenamiento_id", entrenoId);
    check(await supabase.from("entreno_actividades").insert({
      entrenamiento_id: entrenoId,
      orden: count ?? 0,
      tipo: "ejercicio",
      ejercicio_id: id,
      titulo: fila.titulo,
      duracion: d.duracion ?? 10,
    }));
    revalidatePath(`/entrenamientos/${entrenoId}`);
    redirect(`/entrenamientos/${entrenoId}`);
  }
  redirect(`/ejercicios/${id}`);
}

export async function borrarEjercicio(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.from("ejercicios").delete().eq("id", String(formData.get("id"))));
  revalidatePath("/ejercicios");
  redirect("/ejercicios");
}

export async function duplicarEjercicio(formData: FormData) {
  const supabase = await createClient();
  const { data: e } = await supabase.from("ejercicios").select("*").eq("id", String(formData.get("id"))).single();
  if (!e) return;
  const { id: _id, autor_id: _a, created_at: _c, updated_at: _u, ...resto } = e;
  const { data } = await supabase
    .from("ejercicios")
    .insert({ ...resto, titulo: `${e.titulo} (copia)`, visibilidad: "privado", ...("en_biblioteca" in e ? { en_biblioteca: false } : {}) })
    .select("id")
    .single();
  if (data) redirect(`/ejercicios/${data.id}/editar`);
}

/** Poner o quitar un ejercicio de la biblioteca del club (su autor o el coordinador) */
export async function alternarBiblioteca(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const poner = formData.get("poner") === "1";
  check(await supabase.from("ejercicios").update({ en_biblioteca: poner, ...(poner ? { visibilidad: "club" } : {}) }).eq("id", id));
  revalidatePath(`/ejercicios/${id}`);
  revalidatePath("/biblioteca");
}

/** Carga la biblioteca inicial del club (solo el coordinador). No duplica los que ya estén. */
/** JSON con las claves ordenadas (jsonb no guarda el orden de las claves) para comparar contenidos */
const estable = (v: unknown): string => Array.isArray(v) ? `[${v.map(estable).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${estable((v as Record<string, unknown>)[k])}`).join(",")}}`
  : JSON.stringify(v ?? null);

export async function cargarBibliotecaInicial(): Promise<{ nuevos: number; actualizados?: number; quitados?: number; quedan?: number; error?: string }> {
  try {
    const { SEMILLA, montar } = await import("@/lib/biblioteca-semilla");
    const { RETIRADOS, RENOMBRADOS } = await import("@/lib/biblioteca-retirados");
    const { todas } = await import("@/lib/db");
    const supabase = await createClient();
    // 1) Renombrados y retirados de la biblioteca inicial
    for (const [viejo, nuevo] of RENOMBRADOS) await supabase.from("ejercicios").update({ titulo: nuevo }).eq("en_biblioteca", true).eq("titulo", viejo);
    let quitados = 0;
    for (let i = 0; i < RETIRADOS.length; i += 50) {
      const { data: q } = await supabase.from("ejercicios").delete().eq("en_biblioteca", true).in("titulo", RETIRADOS.slice(i, i + 50)).select("id");
      quitados += q?.length ?? 0;
    }
    // Todos los ya cargados (más de 1000: hay que paginar o se duplicarían)
    type Fila = { id: string; titulo: string; descripcion: string | null; correcciones: string | null; objetivos: string | null; categoria: string | null; etiquetas: string[] | null;
      jugadores_min: number | null; duracion: number | null; material: string | null; edades: string[] | null; pizarra: unknown; video_url: string | null };
    const { data: ya, error } = await todas<Fila>((d, h) =>
      supabase.from("ejercicios").select("id, titulo, descripcion, correcciones, objetivos, categoria, etiquetas, jugadores_min, duracion, material, edades, pizarra, video_url").eq("en_biblioteca", true).order("id").range(d, h));
    if (error) return { nuevos: 0, error: faltaSQL(error.message) };
    const fila = (e: (typeof SEMILLA)[number]) => ({
      titulo: e.titulo, descripcion: e.descripcion, correcciones: e.correcciones, categoria: e.categoria, etiquetas: e.etiquetas,
      jugadores_min: e.jugadores, duracion: e.duracion, material: e.material ?? null, objetivos: e.objetivos ?? null, edades: e.edades,
      pizarra: montar(e.montaje), video_url: e.video ?? null,
    });
    const porTitulo = new Map(ya.map((x) => [x.titulo, x]));
    // 2) Nuevos: por llamada, como mucho 300 (el servidor tiene un tiempo límite); el botón vuelve a llamar si quedan
    const pendientes = SEMILLA.filter((e) => !porTitulo.has(e.titulo));
    // Los nuevos ya entran con sus datos para filtrar (jugadores, posiciones, material…) deducidos del texto
    const nuevos = pendientes.slice(0, 300).map((e) => {
      const f = fila(e), tipo = e.tipo ?? "ejercicio";
      return { tipo, ...f, ...inferirFiltros({ tipo, ...f }), visibilidad: "club", en_biblioteca: true };
    });
    let n = 0;
    for (let i = 0; i < nuevos.length; i += 50) {
      const tanda = nuevos.slice(i, i + 50);
      let { error: e2 } = await supabase.from("ejercicios").insert(tanda);
      // Si aún no se ha ejecutado 0025, se cargan igualmente sin los datos para filtrar
      if (e2 && RE_COLUMNAS_NUEVAS.test(e2.message)) ({ error: e2 } = await supabase.from("ejercicios").insert(tanda.map((t) => sinColumnasNuevas(t))));
      if (e2) return { nuevos: n, quitados, error: faltaSQL(e2.message) };
      n += tanda.length;
    }
    // 3) Los ya cargados cuyo contenido ha cambiado (pizarra con defensa, descripción, vídeo…): se actualizan
    const cambiados: { id: string; datos: ReturnType<typeof fila> }[] = [];
    for (const e of SEMILLA) {
      const x = porTitulo.get(e.titulo);
      if (!x) continue;
      const nueva = fila(e);
      const { id: _id, ...actual } = x;
      if (estable(actual) !== estable(nueva)) cambiados.push({ id: x.id, datos: nueva });
    }
    const LOTE = 150;
    let actualizados = 0;
    const lote = cambiados.slice(0, LOTE);
    for (let i = 0; i < lote.length; i += 10) {
      const res = await Promise.all(lote.slice(i, i + 10).map((c) => supabase.from("ejercicios").update(c.datos).eq("id", c.id)));
      const fallo = res.find((r) => r.error);
      if (fallo?.error) return { nuevos: n, actualizados, quitados, error: faltaSQL(fallo.error.message) };
      actualizados += res.length;
    }
    revalidatePath("/biblioteca");
    revalidatePath("/ejercicios");
    return { nuevos: n, actualizados, quitados, quedan: Math.max(0, pendientes.length - n) + Math.max(0, cambiados.length - actualizados) };
  } catch (e) {
    return { nuevos: 0, error: e instanceof Error ? e.message : String(e) };
  }
}


/**
 * Completa los datos para filtrar (para qué sirve, jugadores, posiciones, modalidad y material) en TODOS los
 * ejercicios que ya existen —los de la biblioteca y los que han creado los entrenadores— deduciéndolos de su
 * título, etiquetas, objetivos, descripción y material. Solo rellena lo que está vacío: nunca pisa lo que ya
 * haya escrito alguien. Solo el coordinador. Se llama de seguido hasta que no quede ninguno (por tandas).
 */
export async function completarFiltrosEjercicios(): Promise<{ revisados: number; actualizados: number; quedan: number; error?: string }> {
  try {
    const { supabase, perfil } = await requireUser();
    if (perfil.rol !== "coordinador") return { revisados: 0, actualizados: 0, quedan: 0, error: "Solo el coordinador puede hacer esto." };
    const { todas } = await import("@/lib/db");
    type Fila = {
      id: string; tipo: string | null; titulo: string; descripcion: string | null; correcciones: string | null; objetivos: string | null;
      categoria: string | null; etiquetas: string[] | null; material: string | null; jugadores_min: number | null; jugadores_max: number | null;
      enfoques: string[] | null; posiciones: string[] | null; modalidad: string | null;
      balones: number | null; canastas: number | null; conos: number | null; petos: number | null;
    };
    const { data, error } = await todas<Fila>((d, h) =>
      supabase.from("ejercicios").select("id, tipo, titulo, descripcion, correcciones, objetivos, categoria, etiquetas, material, jugadores_min, jugadores_max, enfoques, posiciones, modalidad, balones, canastas, conos, petos").order("id").range(d, h));
    if (error) return { revisados: 0, actualizados: 0, quedan: 0, error: faltaSQL(error.message) };

    const cambios = data
      .map((e) => ({ id: e.id, patch: inferirFiltros(e) }))
      .filter((c) => Object.keys(c.patch).length > 0);
    const LOTE = 150;
    const lote = cambios.slice(0, LOTE);
    let actualizados = 0;
    for (let i = 0; i < lote.length; i += 10) {
      const res = await Promise.all(lote.slice(i, i + 10).map((c) => supabase.from("ejercicios").update(c.patch).eq("id", c.id)));
      const fallo = res.find((r) => r.error);
      if (fallo?.error) return { revisados: data.length, actualizados, quedan: cambios.length - actualizados, error: faltaSQL(fallo.error.message) };
      actualizados += res.length;
    }
    revalidatePath("/ejercicios");
    revalidatePath("/biblioteca");
    return { revisados: data.length, actualizados, quedan: Math.max(0, cambios.length - actualizados) };
  } catch (e) {
    return { revisados: 0, actualizados: 0, quedan: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
