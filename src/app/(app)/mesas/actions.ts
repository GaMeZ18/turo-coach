"use server";

import { revalidatePath } from "next/cache";
import { createClient, gestionaMesas, requireUser } from "@/lib/supabase/server";
import { companerosMesa, detalleMesa, fechaPartidoMesa, normalizarTelefono, partidoMesa, PLAZAS_MANUAL, POR_MESA, semanaCompleta, yaHayMismoNombre } from "@/lib/mesas";
import { notificarPerfiles } from "@/lib/notificar";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { notificarPersonasMesa } from "@/lib/notificar";
import { adminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aISO } from "@/lib/fechas";

async function gestor() {
  const { perfil } = await requireUser();
  if (!gestionaMesas(perfil)) throw new Error("Solo el gestor de mesas o un coordinador.");
  return createClient();
}
const refrescar = () => { revalidatePath("/mesas"); revalidatePath("/mesas/pagos"); };

/** Si con esta confirmación ya están todas las mesas de la semana, avisa al gestor para mandar el resumen al grupo */
async function avisarSiCompleta(partidoId: string) {
  try {
    const db = adminClient();
    if (!db) return;
    const f = await fechaPartidoMesa(db, partidoId);
    if (!f) return;
    const lunes = lunesDe(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(f.fecha)));
    const { completa, partidos } = await semanaCompleta(db, { desde: aISO(lunes, "00:00"), hasta: aISO(sumarDias(lunes, 7), "00:00") });
    if (!completa) return;
    const { error } = await db.from("avisos_enviados").insert({ clave: `mesascompletas:${lunes}:${partidos.length}` });
    if (error) return; // ya avisado
    const { data: pf } = await db.from("perfiles").select("id, rol, gestor_mesas");
    const todos = (pf ?? []) as { id: string; rol: string; gestor_mesas: boolean | null }[];
    const g = todos.filter((p) => p.rol === "gestor_mesas" || p.gestor_mesas).map((p) => p.id);
    await notificarPerfiles(db, g.length ? g : todos.filter((p) => p.rol === "coordinador").map((p) => p.id),
      "✅ Todas las mesas de la semana confirmadas", `${partidos.length} mesa${partidos.length > 1 ? "s" : ""}. Toca para copiar el resumen y mandarlo al grupo de WhatsApp.`, `/mesas?semana=${lunes}#resumen`, null, true);
  } catch {}
}

/** Avisa al móvil de la persona (si activó los avisos desde el enlace) */
async function avisarPersona(_db: SupabaseClient, asignacionId: string, tipo: "confirmada" | "quitada") {
  try {
    // Con permisos de servidor: el gestor no puede ver los móviles ni dejar avisos a otras personas
    const db = adminClient();
    if (!db) return;
    const { data: a } = await db.from("mesa_asignaciones").select("partido_id, persona_id").eq("id", asignacionId).maybeSingle();
    if (!a) return;
    const [p, { data: cfg }] = await Promise.all([partidoMesa(db, a.partido_id), db.from("mesa_config").select("token").maybeSingle()]);
    if (!p) return;
    // Abre la ficha de su mesa: partido, estado y con quién la hace
    const url = cfg?.token ? `/apuntarse-mesa/${cfg.token}/mesa/${asignacionId}` : "/";
    await notificarPersonasMesa(db, [a.persona_id],
      tipo === "confirmada" ? `Mesa confirmada: ${p.equipo}` : `Ya no haces la mesa de ${p.equipo}`,
      tipo === "confirmada" ? detalleMesa(p, await companerosMesa(db, a.partido_id, a.persona_id)) : detalleMesa(p).split("\n").slice(0, 3).join("\n"), url);
  } catch {}
}

/** Confirmar a alguien en la mesa de un partido (máximo 2) */
export async function confirmar(fd: FormData) {
  const db = await gestor();
  const id = String(fd.get("id")), partido = String(fd.get("partido_id"));
  const { count } = await db.from("mesa_asignaciones").select("id", { count: "exact", head: true }).eq("partido_id", partido).eq("estado", "confirmado");
  const plazas = (await fechaPartidoMesa(db, partido))?.efectivo ? PLAZAS_MANUAL : POR_MESA;
  if ((count ?? 0) >= plazas) throw new Error(`Esta mesa ya tiene ${plazas} persona${plazas > 1 ? "s" : ""} confirmada${plazas > 1 ? "s" : ""}. Quita a una antes.`);
  const { error } = await db.from("mesa_asignaciones").update({ estado: "confirmado" }).eq("id", id);
  if (error) throw new Error(error.message);
  await avisarPersona(db, id, "confirmada");
  await avisarSiCompleta(partido);
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
  const id = String(fd.get("id"));
  const { data: antes } = await db.from("mesa_asignaciones").select("estado").eq("id", id).maybeSingle();
  if (antes?.estado === "confirmado") await avisarPersona(db, id, "quitada");
  const { error } = await db.from("mesa_asignaciones").delete().eq("id", id);
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
  const { data: pe } = await db.from("mesa_personas").select("nombre").eq("id", persona).maybeSingle();
  if (pe && (await yaHayMismoNombre(db, [partido], pe.nombre, persona)).size) throw new Error(`Ya hay otra persona llamada ${pe.nombre} en esta mesa.`);
  const { count } = await db.from("mesa_asignaciones").select("id", { count: "exact", head: true }).eq("partido_id", partido).eq("estado", "confirmado");
  const { data: cfg } = await db.from("mesa_config").select("importe").maybeSingle();
  const efectivo = !!(await fechaPartidoMesa(db, partido))?.efectivo;
  const { error } = await db.from("mesa_asignaciones").upsert(
    { partido_id: partido, persona_id: persona, estado: (count ?? 0) >= (efectivo ? PLAZAS_MANUAL : POR_MESA) ? "candidato" : "confirmado", importe: efectivo ? 0 : cfg?.importe ?? 10 },
    { onConflict: "partido_id,persona_id" });
  if (error) throw new Error(error.message);
  const { data: nueva } = await db.from("mesa_asignaciones").select("id, estado").eq("partido_id", partido).eq("persona_id", persona).maybeSingle();
  if (nueva?.estado === "confirmado") { await avisarPersona(db, nueva.id, "confirmada"); await avisarSiCompleta(partido); }
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

/** Añadir a mano un partido que no viene de la federación (1 persona, sin importe) */
export async function crearPartidoManual(fd: FormData) {
  const db = await gestor();
  const equipoId = String(fd.get("equipo_id") ?? "");
  let equipo = String(fd.get("equipo_nombre") ?? "").trim();
  if (equipoId) {
    const { data } = await db.from("equipos").select("nombre").eq("id", equipoId).maybeSingle();
    equipo = data?.nombre ?? equipo;
  }
  const rival = String(fd.get("rival") ?? "").trim(), dia = String(fd.get("dia") ?? ""), hora = String(fd.get("hora") ?? "");
  if (!equipo || !rival || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) throw new Error("Rellena equipo, rival, día y hora.");
  const { error } = await db.from("mesa_partidos").insert({
    fecha: aISO(dia, hora), equipo_id: equipoId || null, equipo_nombre: equipo.slice(0, 60), rival: rival.slice(0, 80),
    lugar: String(fd.get("lugar") ?? "").trim().slice(0, 80) || null,
  });
  if (error) throw new Error(error.message);
  refrescar();
}

export async function borrarPartidoManual(fd: FormData) {
  const db = await gestor();
  const { error } = await db.from("mesa_partidos").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}

/** Mesa en efectivo sí/no para un equipo (1 persona, la pagan los jugadores) */
export async function alternarEfectivo(fd: FormData) {
  const db = await gestor();
  const { error } = await db.from("equipos").update({ mesa_efectivo: fd.get("valor") === "1" }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}
