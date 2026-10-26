"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";

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
export async function cargarBibliotecaInicial(): Promise<{ nuevos: number; error?: string }> {
  try {
    const { SEMILLA, montar } = await import("@/lib/biblioteca-semilla");
    const supabase = await createClient();
    const { data: ya, error } = await supabase.from("ejercicios").select("titulo").eq("en_biblioteca", true);
    if (error) return { nuevos: 0, error: faltaSQL(error.message) };
    const titulos = new Set((ya ?? []).map((x) => x.titulo));
    const nuevos = SEMILLA.filter((e) => !titulos.has(e.titulo)).map((e) => ({
      tipo: e.tipo ?? "ejercicio",
      titulo: e.titulo,
      descripcion: e.descripcion,
      correcciones: e.correcciones,
      categoria: e.categoria,
      etiquetas: e.etiquetas,
      jugadores_min: e.jugadores,
      duracion: e.duracion,
      material: e.material ?? null,
      objetivos: e.objetivos ?? null,
      edades: e.edades,
      pizarra: montar(e.montaje),
      visibilidad: "club",
      en_biblioteca: true,
    }));
    // Por tandas, para que un fallo no deje todo a medias
    let n = 0;
    let conObjetivos = true;
    for (let i = 0; i < nuevos.length; i += 10) {
      const tanda = nuevos.slice(i, i + 10);
      let { error: e2 } = await supabase.from("ejercicios").insert(conObjetivos ? tanda : tanda.map(({ objetivos: _o, ...r }) => r));
      if (e2 && /objetivos/.test(e2.message)) { conObjetivos = false; ({ error: e2 } = await supabase.from("ejercicios").insert(tanda.map(({ objetivos: _o, ...r }) => r))); }
      if (e2) return { nuevos: n, error: faltaSQL(e2.message) };
      n += Math.min(10, nuevos.length - i);
    }
    // Completar los objetivos de los que ya estaban cargados sin ellos
    if (conObjetivos) {
      const { data: sinObj } = await supabase.from("ejercicios").select("id, titulo").eq("en_biblioteca", true).is("objetivos", null);
      const porTitulo = new Map(SEMILLA.filter((e) => e.objetivos).map((e) => [e.titulo, e.objetivos!]));
      for (const x of sinObj ?? []) {
        const o = porTitulo.get(x.titulo);
        if (o) await supabase.from("ejercicios").update({ objetivos: o }).eq("id", x.id);
      }
    }
    revalidatePath("/biblioteca");
    revalidatePath("/ejercicios");
    return { nuevos: n };
  } catch (e) {
    return { nuevos: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
