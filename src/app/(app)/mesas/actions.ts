"use server";

import { revalidatePath } from "next/cache";
import { createClient, gestionaMesas, requireUser } from "@/lib/supabase/server";
import { normalizarTelefono, POR_MESA } from "@/lib/mesas";

async function gestor() {
  const { perfil } = await requireUser();
  if (!gestionaMesas(perfil)) throw new Error("Solo el gestor de mesas o un coordinador.");
  return createClient();
}
const refrescar = () => { revalidatePath("/mesas"); revalidatePath("/mesas/pagos"); };

/** Confirmar a alguien en la mesa de un partido (máximo 2) */
export async function confirmar(fd: FormData) {
  const db = await gestor();
  const id = String(fd.get("id")), partido = String(fd.get("partido_id"));
  const { count } = await db.from("mesa_asignaciones").select("id", { count: "exact", head: true }).eq("partido_id", partido).eq("estado", "confirmado");
  if ((count ?? 0) >= POR_MESA) throw new Error("Esta mesa ya tiene 2 personas confirmadas. Quita a una antes.");
  const { error } = await db.from("mesa_asignaciones").update({ estado: "confirmado" }).eq("id", id);
  if (error) throw new Error(error.message);
  refrescar();
}

/** Volver a dejarla como apuntada (sin confirmar) */
export async function desconfirmar(fd: FormData) {
  const db = await gestor();
  const { error } = await db.from("mesa_asignaciones").update({ estado: "candidato" }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}

export async function quitar(fd: FormData) {
  const db = await gestor();
  const { error } = await db.from("mesa_asignaciones").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}

/** El gestor pone a alguien directamente (persona ya conocida o nueva) y queda confirmado */
export async function asignar(fd: FormData) {
  const db = await gestor();
  const partido = String(fd.get("partido_id"));
  let persona = String(fd.get("persona_id") ?? "");
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizarTelefono(String(fd.get("telefono") ?? ""));
  if (!persona) {
    if (!nombre) throw new Error("Elige a una persona o escribe su nombre.");
    if (telefono) {
      const { data: ya } = await db.from("mesa_personas").select("id").eq("telefono", telefono).maybeSingle();
      if (ya) persona = ya.id;
    }
    if (!persona) {
      const { data, error } = await db.from("mesa_personas").insert({ nombre, telefono: telefono || null }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "No se ha podido crear la persona.");
      persona = data.id;
    }
  }
  const { count } = await db.from("mesa_asignaciones").select("id", { count: "exact", head: true }).eq("partido_id", partido).eq("estado", "confirmado");
  const { data: cfg } = await db.from("mesa_config").select("importe").maybeSingle();
  const { error } = await db.from("mesa_asignaciones").upsert(
    { partido_id: partido, persona_id: persona, estado: (count ?? 0) >= POR_MESA ? "candidato" : "confirmado", importe: cfg?.importe ?? 10 },
    { onConflict: "partido_id,persona_id" });
  if (error) throw new Error(error.message);
  refrescar();
}

/** Mesa federada sí/no para un equipo */
export async function alternarFederada(fd: FormData) {
  const db = await gestor();
  const { error } = await db.from("equipos").update({ mesa_federada: fd.get("valor") === "1" }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}

/** Importe por persona y mesa (para las mesas nuevas) */
export async function guardarImporte(fd: FormData) {
  const db = await gestor();
  const v = Number(String(fd.get("importe") ?? "").replace(",", "."));
  if (!(v >= 0)) throw new Error("Importe no válido.");
  const { error } = await db.from("mesa_config").update({ importe: v }).eq("id", true);
  if (error) throw new Error(error.message);
  refrescar();
}

/** Nuevo enlace para apuntarse (el anterior deja de funcionar) */
export async function nuevoEnlace() {
  const db = await gestor();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { error } = await db.from("mesa_config").update({ token }).eq("id", true);
  if (error) throw new Error(error.message);
  refrescar();
}

/** Marcar (o desmarcar) como pagado lo de un mes a una persona */
export async function marcarPagado(fd: FormData) {
  const db = await gestor();
  const persona = String(fd.get("persona_id")), mes = String(fd.get("mes"));
  if (fd.get("pagado") === "1") {
    const { error } = await db.from("mesa_pagos").upsert({ persona_id: persona, mes, importe: Number(fd.get("importe") ?? 0), pagado_en: new Date().toISOString() });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("mesa_pagos").delete().eq("persona_id", persona).eq("mes", mes);
    if (error) throw new Error(error.message);
  }
  refrescar();
}

export async function editarPersona(fd: FormData) {
  const db = await gestor();
  const telefono = normalizarTelefono(String(fd.get("telefono") ?? ""));
  const { error } = await db.from("mesa_personas").update({
    nombre: String(fd.get("nombre") ?? "").trim() || "Sin nombre", telefono: telefono || null, activo: fd.get("activo") === "on",
  }).eq("id", String(fd.get("id")));
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "Ese teléfono ya lo tiene otra persona." : error.message);
  refrescar();
}
