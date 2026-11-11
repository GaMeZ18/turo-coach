"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/db";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { aISO, diaInput, fechaCorta, hora, horaInput } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { notificarPerfiles } from "@/lib/notificar";

export async function guardarPista(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "") || null;
  const fila = {
    nombre: String(fd.get("nombre") ?? "").trim().toUpperCase().slice(0, 60),
    capacidad: Math.min(6, Math.max(1, Number(fd.get("capacidad") || 1))),
    orden: Number(fd.get("orden") || 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
    partidos_casa: fd.get("partidos_casa") === "on",
  };
  if (!fila.nombre) throw new Error("Ponle un nombre a la pista.");
  check(id ? await supabase.from("pistas").update(fila).eq("id", id) : await supabase.from("pistas").insert(fila));
  revalidatePath("/pistas");
}

export async function borrarPista(fd: FormData) {
  const supabase = await createClient();
  check(await supabase.from("pistas").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/pistas");
}

// ---------- Cambios de pista: los pide un entrenador y los aprueba coordinación ----------

type R = { ok?: boolean; error?: string };
type Ent = { id: string; equipo_id: string; fecha: string; lugar: string | null };
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const UUID = /^[0-9a-f-]{36}$/;

async function nombresEquipos(db: NonNullable<ReturnType<typeof adminClient>>, ids: string[]) {
  const { data } = await db.from("equipos").select("id, nombre").in("id", ids);
  return new Map((data ?? []).map((e) => [e.id as string, e.nombre as string]));
}
async function staffDe(db: NonNullable<ReturnType<typeof adminClient>>, equipo: string) {
  const { data } = await db.from("equipo_staff").select("perfil_id").eq("equipo_id", equipo);
  return (data ?? []).map((x) => x.perfil_id as string);
}

export async function pedirCambioPista(d: { entrenoId: string; modo: "mover" | "intercambio"; dia?: string; hora?: string; lugar?: string; intercambioId?: string; todas: boolean; motivo: string }): Promise<R> {
  const { supabase, user } = await requireUser();
  const db = adminClient();
  if (!db) return { error: "Falta la configuración del servidor." };
  if (!UUID.test(d.entrenoId)) return { error: "Entreno no válido." };
  const { data: e } = await supabase.from("entrenamientos").select("id, equipo_id, fecha, lugar").eq("id", d.entrenoId).maybeSingle();
  if (!e) return { error: "No puedes cambiar este entreno." };
  const { data: st } = await supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", e.equipo_id).eq("perfil_id", user.id).maybeSingle();
  const { data: yo } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (!st && yo?.rol !== "coordinador") return { error: "Solo el cuerpo técnico del equipo." };
  const fila: Record<string, unknown> = { entrenamiento_id: e.id, solicitante_id: user.id, todas_semanas: !!d.todas, motivo: d.motivo.trim().slice(0, 300) || null };
  let texto = "";
  if (d.modo === "intercambio") {
    if (!d.intercambioId || !UUID.test(d.intercambioId)) return { error: "Elige con qué entreno intercambiar." };
    const { data: x } = await db.from("entrenamientos").select("id, equipo_id, fecha, lugar").eq("id", d.intercambioId).maybeSingle();
    if (!x || x.equipo_id === e.equipo_id) return { error: "Ese entreno no vale para intercambiar." };
    fila.intercambio_id = x.id;
    const n = await nombresEquipos(db, [e.equipo_id, x.equipo_id]);
    texto = `${n.get(e.equipo_id)} quiere intercambiar su entreno (${fechaCorta(e.fecha)} ${hora(e.fecha)}, ${e.lugar ?? "sin pista"}) con el de ${n.get(x.equipo_id)} (${fechaCorta(x.fecha)} ${hora(x.fecha)}, ${x.lugar ?? "sin pista"})`;
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dia ?? "") || !/^\d{2}:\d{2}$/.test(d.hora ?? "")) return { error: "Pon el día y la hora nuevos." };
    fila.nueva_fecha = aISO(d.dia!, d.hora!);
    fila.nuevo_lugar = (d.lugar ?? "").trim().toUpperCase().slice(0, 60) || e.lugar;
    if (fila.nueva_fecha === e.fecha && fila.nuevo_lugar === e.lugar) return { error: "No has cambiado nada." };
    const n = await nombresEquipos(db, [e.equipo_id]);
    texto = `${n.get(e.equipo_id)} pide pasar el entreno del ${fechaCorta(e.fecha)} ${hora(e.fecha)} (${e.lugar ?? "sin pista"}) al ${fechaCorta(fila.nueva_fecha as string)} ${hora(fila.nueva_fecha as string)} (${fila.nuevo_lugar ?? "sin pista"})`;
  }
  // Una sola pendiente por entreno
  await db.from("solicitudes_pista").update({ estado: "cancelada", resuelto_en: new Date().toISOString() }).eq("entrenamiento_id", e.id).eq("estado", "pendiente");
  const { error } = await db.from("solicitudes_pista").insert(fila);
  if (error) return { error: error.message };
  const { data: coords } = await db.from("perfiles").select("id").eq("rol", "coordinador");
  await notificarPerfiles(db, (coords ?? []).map((c) => c.id as string).filter((id) => id !== user.id), "🔄 Cambio de pista para aprobar",
    `${texto}${d.todas ? " (todas las semanas)" : ""}.${fila.motivo ? ` Motivo: ${fila.motivo}` : ""}`, "/pistas#solicitudes");
  revalidatePath("/pistas");
  revalidatePath(`/entrenamientos/${e.id}`);
  return { ok: true };
}

export async function cancelarSolicitudPista(id: string): Promise<R> {
  const { user } = await requireUser();
  const db = adminClient();
  if (!db || !UUID.test(id)) return { error: "No válido." };
  const { error } = await db.from("solicitudes_pista").update({ estado: "cancelada", resuelto_en: new Date().toISOString() }).eq("id", id).eq("solicitante_id", user.id).eq("estado", "pendiente");
  if (error) return { error: error.message };
  revalidatePath("/pistas");
  return { ok: true };
}

/** Entrenos de la misma «franja» (mismo día de la semana, hora y pista) a partir de este, para «todas las semanas» */
async function franja(db: NonNullable<ReturnType<typeof adminClient>>, e: Ent, todas: boolean): Promise<Ent[]> {
  if (!todas) return [e];
  const { data } = await db.from("entrenamientos").select("id, equipo_id, fecha, lugar").eq("equipo_id", e.equipo_id).gte("fecha", e.fecha).is("anulado_motivo", null).order("fecha");
  const dow = new Date(`${diaInput(e.fecha)}T12:00:00Z`).getUTCDay(), h = horaInput(e.fecha);
  return ((data ?? []) as Ent[]).filter((x) => new Date(`${diaInput(x.fecha)}T12:00:00Z`).getUTCDay() === dow && horaInput(x.fecha) === h && (x.lugar ?? "") === (e.lugar ?? ""));
}

export async function resolverSolicitudPista(id: string, aprobar: boolean, respuesta: string): Promise<R> {
  const { user, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") return { error: "Solo coordinación." };
  const db = adminClient();
  if (!db || !UUID.test(id)) return { error: "No válido." };
  const { data: s } = await db.from("solicitudes_pista").select("*").eq("id", id).maybeSingle();
  if (!s || s.estado !== "pendiente") return { error: "Esta solicitud ya está resuelta." };
  const { data: e } = await db.from("entrenamientos").select("id, equipo_id, fecha, lugar").eq("id", s.entrenamiento_id).maybeSingle();
  if (!e) return { error: "El entreno ya no existe." };
  let otroEquipo: string | null = null;
  let cambiados = 0;
  if (aprobar) {
    if (s.intercambio_id) {
      const { data: x } = await db.from("entrenamientos").select("id, equipo_id, fecha, lugar").eq("id", s.intercambio_id).maybeSingle();
      if (!x) return { error: "El otro entreno ya no existe." };
      otroEquipo = x.equipo_id;
      const [as, bs] = await Promise.all([franja(db, e as Ent, s.todas_semanas), franja(db, x as Ent, s.todas_semanas)]);
      // Se emparejan por semana: el de cada semana de un equipo con el de esa misma semana del otro
      const semana = (f: string) => Math.floor(diasEntre(diaInput(e.fecha), diaInput(f)) / 7);
      for (const a of as) {
        const b = bs.find((y) => Math.floor(diasEntre(diaInput(x.fecha), diaInput(y.fecha)) / 7) === semana(a.fecha));
        if (!b) continue;
        await db.from("entrenamientos").update({ fecha: b.fecha, lugar: b.lugar }).eq("id", a.id);
        await db.from("entrenamientos").update({ fecha: a.fecha, lugar: a.lugar }).eq("id", b.id);
        cambiados++;
      }
    } else {
      const dd = diasEntre(diaInput(e.fecha), diaInput(s.nueva_fecha)), h = horaInput(s.nueva_fecha);
      for (const a of await franja(db, e as Ent, s.todas_semanas)) {
        await db.from("entrenamientos").update({ fecha: aISO(sumarDias(diaInput(a.fecha), dd), h), lugar: s.nuevo_lugar }).eq("id", a.id);
        cambiados++;
      }
    }
  }
  await db.from("solicitudes_pista").update({ estado: aprobar ? "aprobada" : "rechazada", respuesta: respuesta.trim().slice(0, 300) || null, resuelto_por: user.id, resuelto_en: new Date().toISOString() }).eq("id", id);
  const n = await nombresEquipos(db, [e.equipo_id, ...(otroEquipo ? [otroEquipo] : [])]);
  const avisar = [...new Set([...(s.solicitante_id ? [s.solicitante_id as string] : []), ...(aprobar ? await staffDe(db, e.equipo_id) : [])])].filter((p) => p !== user.id);
  await notificarPerfiles(db, avisar, aprobar ? "✅ Cambio de pista aprobado" : "❌ Cambio de pista rechazado",
    `${n.get(e.equipo_id)} · entreno del ${fechaCorta(e.fecha)} ${hora(e.fecha)}${aprobar && cambiados > 1 ? ` (${cambiados} semanas)` : ""}.${respuesta.trim() ? ` ${respuesta.trim()}` : ""}`, `/entrenamientos/${e.id}`, e.equipo_id);
  if (aprobar && otroEquipo) {
    await notificarPerfiles(db, (await staffDe(db, otroEquipo)).filter((p) => p !== user.id), "🔄 Han cambiado tu entreno",
      `Coordinación ha aprobado intercambiar el entreno de ${n.get(otroEquipo)} con ${n.get(e.equipo_id)}${cambiados > 1 ? ` (${cambiados} semanas)` : ""}. Mira la nueva hora y pista.`, "/pistas", otroEquipo);
  }
  revalidatePath("/pistas");
  revalidatePath("/entrenamientos");
  return { ok: true };
}
