"use server";

import { revalidatePath } from "next/cache";
import { requireUser, veMaterial } from "@/lib/supabase/server";

async function cliente() {
  const { supabase, perfil } = await requireUser();
  if (!veMaterial(perfil)) throw new Error("Sin permiso");
  return { supabase, yo: perfil.id };
}
const texto = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);
const entero = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 99999) : 0; };

export type Lugar = { id: string; nombre: string; orden: number };
export type Material = { id: string; lugar_id: string; nombre: string; categoria: string | null; cantidad: number; rotos: number; minimo: number | null; notas: string | null; contado_at: string | null };
const CAMPOS = "id, lugar_id, nombre, categoria, cantidad, rotos, minimo, notas, contado_at";

export async function crearLugar(nombre: string): Promise<{ lugar?: Lugar; error?: string }> {
  const { supabase } = await cliente();
  const n = texto(nombre);
  if (!n) return { error: "Pon un nombre" };
  const { count } = await supabase.from("material_lugares").select("id", { count: "exact", head: true });
  const { data, error } = await supabase.from("material_lugares").insert({ nombre: n, orden: count ?? 0 }).select("id, nombre, orden").single();
  if (error) return { error: error.message };
  revalidatePath("/material");
  return { lugar: data as Lugar };
}

export async function renombrarLugar(id: string, nombre: string) {
  const { supabase } = await cliente();
  const n = texto(nombre);
  if (!n) return { error: "Pon un nombre" };
  const { error } = await supabase.from("material_lugares").update({ nombre: n }).eq("id", id);
  revalidatePath("/material");
  return error ? { error: error.message } : {};
}

export async function borrarLugar(id: string) {
  const { supabase } = await cliente();
  const { error } = await supabase.from("material_lugares").delete().eq("id", id);
  revalidatePath("/material");
  return error ? { error: error.message } : {};
}

export async function crearMaterial(d: { lugar_id: string; nombre: string; categoria?: string; cantidad?: number; minimo?: number | null }): Promise<{ item?: Material; error?: string }> {
  const { supabase, yo } = await cliente();
  const n = texto(d.nombre);
  if (!n) return { error: "Pon qué es" };
  const { data, error } = await supabase.from("material").insert({
    lugar_id: d.lugar_id, nombre: n, categoria: texto(d.categoria, 40) || null, cantidad: entero(d.cantidad),
    minimo: d.minimo == null ? null : entero(d.minimo), contado_at: new Date().toISOString(), updated_by: yo,
  }).select(CAMPOS).single();
  if (error) return { error: error.message };
  revalidatePath("/material");
  return { item: data as Material };
}

/** Guarda cambios de un material (cantidades, nombre, mínimo, notas…). contado=true marca que se acaba de contar. */
export async function guardarMaterial(id: string, c: Partial<Pick<Material, "nombre" | "categoria" | "cantidad" | "rotos" | "minimo" | "notas" | "lugar_id">>, contado = false) {
  const { supabase, yo } = await cliente();
  const fila: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: yo };
  if (c.nombre !== undefined) fila.nombre = texto(c.nombre) || "Sin nombre";
  if (c.categoria !== undefined) fila.categoria = texto(c.categoria, 40) || null;
  if (c.cantidad !== undefined) fila.cantidad = entero(c.cantidad);
  if (c.rotos !== undefined) fila.rotos = entero(c.rotos);
  if (c.minimo !== undefined) fila.minimo = c.minimo == null ? null : entero(c.minimo);
  if (c.notas !== undefined) fila.notas = texto(c.notas, 500) || null;
  if (c.lugar_id !== undefined) fila.lugar_id = c.lugar_id;
  if (contado) fila.contado_at = new Date().toISOString();
  const { error } = await supabase.from("material").update(fila).eq("id", id);
  return error ? { error: error.message } : { contado_at: contado ? (fila.contado_at as string) : undefined };
}

/** Marca como contado todo el material de un sitio */
export async function marcarSitioContado(lugarId: string) {
  const { supabase, yo } = await cliente();
  const ahora = new Date().toISOString();
  const { error } = await supabase.from("material").update({ contado_at: ahora, updated_by: yo }).eq("lugar_id", lugarId);
  return error ? { error: error.message } : { contado_at: ahora };
}

export async function borrarMaterial(id: string) {
  const { supabase } = await cliente();
  const { error } = await supabase.from("material").delete().eq("id", id);
  revalidatePath("/material");
  return error ? { error: error.message } : {};
}
