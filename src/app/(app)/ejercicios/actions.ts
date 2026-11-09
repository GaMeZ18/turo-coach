"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { rasgosDe } from "@/lib/rasgos-ejercicio";

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
  // Datos para filtrar (0025). Si se dejan vacíos se deducen solos.
  balones?: number | null;
  canastas?: number | null;
  conos?: number | null;
  focos?: string[];
  posiciones?: string[];
  formato?: string;
};

const vacioANull = (s: string) => (s.trim() === "" ? null : s.trim());
const faltaSQL = (m: string) => (/en_biblioteca|edades|material/.test(m) ? "Para usar la biblioteca, ejecuta antes 0007_biblioteca.sql en Supabase." : m);

export async function guardarEjercicio(d: DatosEjercicio, entrenoId?: string) {
  const supabase = await createClient();
  const fila = {
    tipo: d.tipo,
    titulo: d.titulo.trim() || "Sin título",
    descripcion: vacioANull(d.descripcion),
    correcciones: vacioANull(d.correcciones),
    categoria: vacioANull(d.categoria),
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
  };
  // Datos para los filtros: lo que rellene el entrenador y, si falta algo, deducido de la pizarra y el título
  const r = rasgosDe({ ...d, etiquetas: fila.etiquetas });
  const datos = {
    balones: d.balones ?? r.balones,
    canastas: d.canastas ?? r.canastas,
    conos: d.conos ?? r.conos,
    focos: [...new Set([...(fila.categoria ? [fila.categoria] : []), ...(d.focos?.length ? d.focos : r.focos)])],
    posiciones: d.posiciones?.length ? d.posiciones : r.posiciones,
    formato: d.formato || r.formato,
  };
  if (fila.jugadores_min == null && r.jugadores) fila.jugadores_min = r.jugadores;
  Object.assign(fila, datos);
  // En la biblioteca, siempre visible para el club
  if (fila.en_biblioteca) fila.visibilidad = "club";

  // Si aún no se ha ejecutado 0012 (columna objetivos), se guarda sin ella
  const sinObjetivos = (m: string) => /objetivos/.test(m);
  const { objetivos: _o, ...filaSinObj } = fila;
  let id = d.id;
  if (id) {
    let { error } = await supabase.from("ejercicios").update(fila).eq("id", id);
    if (error && sinObjetivos(error.message)) ({ error } = await supabase.from("ejercicios").update(filaSinObj).eq("id", id));
    if (error) return { error: faltaSQL(error.message) };
  } else {
    let { data, error } = await supabase.from("ejercicios").insert(fila).select("id").single();
    if (error && sinObjetivos(error.message)) ({ data, error } = await supabase.from("ejercicios").insert(filaSinObj).select("id").single());
    if (error || !data) return { error: faltaSQL(error?.message ?? "No se ha podido guardar") };
    id = data.id;
  }
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
      jugadores_min: number | null; duracion: number | null; material: string | null; edades: string[] | null; pizarra: unknown; video_url: string | null;
      balones: number | null; canastas: number | null; conos: number | null; focos: string[] | null; posiciones: string[] | null; formato: string | null };
    const { data: ya, error } = await todas<Fila>((d, h) =>
      supabase.from("ejercicios").select("id, titulo, descripcion, correcciones, objetivos, categoria, etiquetas, jugadores_min, duracion, material, edades, pizarra, video_url, balones, canastas, conos, focos, posiciones, formato").eq("en_biblioteca", true).order("id").range(d, h));
    if (error) return { nuevos: 0, error: faltaSQL(error.message) };
    const fila = (e: (typeof SEMILLA)[number]) => {
      const pizarra = montar(e.montaje);
      const r = rasgosDe({ pizarra, titulo: e.titulo, categoria: e.categoria, etiquetas: e.etiquetas, tipo: e.tipo ?? "ejercicio", jugadores_min: e.jugadores });
      return {
        titulo: e.titulo, descripcion: e.descripcion, correcciones: e.correcciones, categoria: e.categoria, etiquetas: e.etiquetas,
        jugadores_min: e.jugadores ?? r.jugadores, duracion: e.duracion, material: e.material ?? null, objetivos: e.objetivos ?? null, edades: e.edades,
        pizarra, video_url: e.video ?? null,
        balones: r.balones, canastas: r.canastas, conos: r.conos, focos: r.focos, posiciones: r.posiciones, formato: r.formato,
      };
    };
    const porTitulo = new Map(ya.map((x) => [x.titulo, x]));
    // 2) Nuevos: por llamada, como mucho 300 (el servidor tiene un tiempo límite); el botón vuelve a llamar si quedan
    const pendientes = SEMILLA.filter((e) => !porTitulo.has(e.titulo));
    const nuevos = pendientes.slice(0, 300).map((e) => ({ tipo: e.tipo ?? "ejercicio", ...fila(e), visibilidad: "club", en_biblioteca: true }));
    let n = 0;
    for (let i = 0; i < nuevos.length; i += 50) {
      const tanda = nuevos.slice(i, i + 50);
      const { error: e2 } = await supabase.from("ejercicios").insert(tanda);
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
