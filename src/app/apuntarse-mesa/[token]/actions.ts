"use server";

import { adminClient } from "@/lib/supabase/admin";
import { abierta, fechaPartidoMesa, normalizarTelefono, partidosDeCasa } from "@/lib/mesas";
import { notificarPerfiles } from "@/lib/notificar";
import { lunesDe } from "@/lib/pistas";

export type MiMesa = { id: string; partido_id: string; estado: "candidato" | "confirmado"; con?: string[] };
type Res = { ok?: boolean; error?: string; mias?: MiMesa[]; nombre?: string };

/** Cliente con permisos, solo si el enlace (token) es el bueno */
async function conEnlace(token: string) {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from("mesa_config").select("token, importe").maybeSingle();
  return data && data.token === token ? { db, importe: Number(data.importe) } : null;
}

/** Lo que ya tiene apuntado esa persona (por su teléfono) */
export async function misMesas(token: string, telefono: string): Promise<Res> {
  const c = await conEnlace(token);
  if (!c) return { error: "Este enlace ya no es válido. Pide el nuevo al gestor de mesas." };
  const tel = normalizarTelefono(telefono);
  if (tel.length < 9) return { mias: [] };
  const { data: p } = await c.db.from("mesa_personas").select("id, nombre").eq("telefono", tel).maybeSingle();
  if (!p) return { mias: [] };
  const { data } = await c.db.from("mesa_asignaciones").select("id, partido_id, estado").eq("persona_id", p.id);
  const mias = (data ?? []) as MiMesa[];
  // Con quién hace cada mesa (los otros confirmados)
  if (mias.length) {
    const { data: otros } = await c.db.from("mesa_asignaciones").select("partido_id, mesa_personas(nombre)").eq("estado", "confirmado").neq("persona_id", p.id).in("partido_id", mias.map((m) => m.partido_id));
    const lista = (otros ?? []) as unknown as { partido_id: string; mesa_personas: { nombre: string } | null }[];
    for (const m of mias) m.con = lista.filter((o) => o.partido_id === m.partido_id).map((o) => o.mesa_personas?.nombre ?? "").filter(Boolean);
  }
  return { mias, nombre: p.nombre };
}

/** Apuntarse a varios partidos: queda «pendiente» hasta que el gestor confirma */
export async function apuntarse(token: string, nombre: string, telefono: string, partidos: string[]): Promise<Res> {
  const c = await conEnlace(token);
  if (!c) return { error: "Este enlace ya no es válido. Pide el nuevo al gestor de mesas." };
  const tel = normalizarTelefono(telefono);
  nombre = nombre.trim().slice(0, 80);
  if (!nombre || tel.length < 9) return { error: "Escribe tu nombre y tu teléfono." };
  if (!partidos.length) return { error: "Marca al menos un partido." };
  // Solo partidos de casa, sin mesa federada y que aún no se han jugado
  // y con el plazo abierto (hasta el miércoles a las 15:00 de la semana del partido)
  const lista = (await partidosDeCasa(c.db, new Date().toISOString(), new Date(Date.now() + 60 * 864e5).toISOString())).filter((p) => !p.federada && abierta(p.fecha));
  const validos = new Map(lista.map((p) => [p.id, p]));
  const elegidos = partidos.filter((p) => validos.has(p));
  if (!elegidos.length) return { error: "El plazo para apuntarse a esos partidos ya está cerrado (se cierra el miércoles a las 15:00). Si tienes algún problema, escribe en el grupo de WhatsApp de mesas." };

  let { data: persona } = await c.db.from("mesa_personas").select("id, nombre").eq("telefono", tel).maybeSingle();
  if (!persona) {
    const r = await c.db.from("mesa_personas").insert({ nombre, telefono: tel }).select("id, nombre").single();
    if (r.error || !r.data) return { error: "No se ha podido guardar. Prueba otra vez." };
    persona = r.data;
  } else if (persona.nombre !== nombre) {
    await c.db.from("mesa_personas").update({ nombre, activo: true }).eq("id", persona.id);
  }
  const { data: yaEstaba } = await c.db.from("mesa_asignaciones").select("partido_id").eq("persona_id", persona!.id).in("partido_id", elegidos);
  const nuevos = elegidos.filter((id) => !((yaEstaba ?? []) as { partido_id: string }[]).some((y) => y.partido_id === id));
  const { error } = await c.db.from("mesa_asignaciones").upsert(
    elegidos.map((partido_id) => ({ partido_id, persona_id: persona!.id, importe: validos.get(partido_id)!.efectivo ? 0 : c.importe })),
    { onConflict: "partido_id,persona_id", ignoreDuplicates: true });
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };
  // Aviso al gestor de mesas (si no hay ninguno, a coordinación) de quién se ha apuntado y a qué
  if (nuevos.length) {
    try {
      const { data: pf } = await c.db.from("perfiles").select("id, rol, gestor_mesas");
      const todos = (pf ?? []) as { id: string; rol: string; gestor_mesas: boolean | null }[];
      const gestores = todos.filter((p) => p.rol === "gestor_mesas" || p.gestor_mesas).map((p) => p.id);
      const destino = gestores.length ? gestores : todos.filter((p) => p.rol === "coordinador").map((p) => p.id);
      const ps = nuevos.map((id) => validos.get(id)!).sort((a, b) => a.fecha.localeCompare(b.fecha));
      const cuando = (f: string) => new Date(f).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(ps[0].fecha));
      await notificarPerfiles(c.db, destino, `🙋 ${nombre} se ha apuntado a ${ps.length} mesa${ps.length > 1 ? "s" : ""}`,
        ps.map((p) => `${cuando(p.fecha)} · ${p.equipo} vs ${p.rival}`).join("\n"), `/mesas?semana=${lunesDe(dia)}`, null, true);
    } catch {}
  }
  return { ok: true, ...(await misMesas(token, tel)) };
}

/** Desapuntarse de un partido (solo si aún no está confirmado; si lo está, hay que avisar al gestor) */
export async function desapuntarse(token: string, telefono: string, asignacion: string): Promise<Res> {
  const c = await conEnlace(token);
  if (!c) return { error: "Este enlace ya no es válido." };
  const tel = normalizarTelefono(telefono);
  const { data: p } = await c.db.from("mesa_personas").select("id").eq("telefono", tel).maybeSingle();
  if (!p) return { error: "No te encuentro." };
  // Después del miércoles a las 15:00 ya no se puede borrar uno mismo: hay que hablarlo por el grupo de WhatsApp
  const { data: a } = await c.db.from("mesa_asignaciones").select("id, partido_id").eq("id", asignacion).eq("persona_id", p.id).maybeSingle();
  const fecha = a ? (await fechaPartidoMesa(c.db, a.partido_id))?.fecha : undefined;
  if (!a || !fecha) return misMesas(token, tel);
  if (!abierta(fecha)) return { error: "El plazo ya está cerrado: si no puedes ir, avísalo en el grupo de WhatsApp de mesas.", ...(await misMesas(token, tel)) };
  await c.db.from("mesa_asignaciones").delete().eq("id", asignacion).eq("persona_id", p.id);
  return misMesas(token, tel);
}

/** Activar avisos en este móvil para esa persona (se identifica por su teléfono) */
export async function guardarAvisoMesa(token: string, telefono: string, sub: { endpoint: string; p256dh: string; auth: string }): Promise<{ error?: string }> {
  const c = await conEnlace(token);
  if (!c) return { error: "Este enlace ya no es válido." };
  const tel = normalizarTelefono(telefono);
  const { data: p } = await c.db.from("mesa_personas").select("id").eq("telefono", tel).maybeSingle();
  if (!p) return { error: "Primero apúntate a algún partido con tu teléfono." };
  const { error } = await c.db.from("mesa_push").upsert({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, persona_id: p.id });
  return error ? { error: "No se ha podido guardar. Prueba otra vez." } : {};
}
