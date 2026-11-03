"use server";

import { adminClient } from "@/lib/supabase/admin";
import { abierta, normalizarTelefono, partidosDeCasa } from "@/lib/mesas";

export type MiMesa = { id: string; partido_id: string; estado: "candidato" | "confirmado" };
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
  return { mias: (data ?? []) as MiMesa[], nombre: p.nombre };
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
  // y con el plazo abierto (hasta el viernes de la semana del partido)
  const validos = new Set((await partidosDeCasa(c.db, new Date().toISOString(), new Date(Date.now() + 60 * 864e5).toISOString())).filter((p) => !p.federada && abierta(p.fecha)).map((p) => p.id));
  const elegidos = partidos.filter((p) => validos.has(p));
  if (!elegidos.length) return { error: "El plazo para apuntarse a esos partidos ya está cerrado (se cierra el viernes)." };

  let { data: persona } = await c.db.from("mesa_personas").select("id, nombre").eq("telefono", tel).maybeSingle();
  if (!persona) {
    const r = await c.db.from("mesa_personas").insert({ nombre, telefono: tel }).select("id, nombre").single();
    if (r.error || !r.data) return { error: "No se ha podido guardar. Prueba otra vez." };
    persona = r.data;
  } else if (persona.nombre !== nombre) {
    await c.db.from("mesa_personas").update({ nombre, activo: true }).eq("id", persona.id);
  }
  const { error } = await c.db.from("mesa_asignaciones").upsert(
    elegidos.map((partido_id) => ({ partido_id, persona_id: persona!.id, importe: c.importe })),
    { onConflict: "partido_id,persona_id", ignoreDuplicates: true });
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };
  return { ok: true, ...(await misMesas(token, tel)) };
}

/** Desapuntarse de un partido (solo si aún no está confirmado; si lo está, hay que avisar al gestor) */
export async function desapuntarse(token: string, telefono: string, asignacion: string): Promise<Res> {
  const c = await conEnlace(token);
  if (!c) return { error: "Este enlace ya no es válido." };
  const tel = normalizarTelefono(telefono);
  const { data: p } = await c.db.from("mesa_personas").select("id").eq("telefono", tel).maybeSingle();
  if (!p) return { error: "No te encuentro." };
  // Después del viernes ya no se puede borrar uno mismo: solo el gestor, si hay una urgencia
  const { data: a } = await c.db.from("mesa_asignaciones").select("id, partidos(fecha)").eq("id", asignacion).eq("persona_id", p.id).maybeSingle();
  const fecha = (a?.partidos as unknown as { fecha: string } | null)?.fecha;
  if (!a || !fecha) return misMesas(token, tel);
  if (!abierta(fecha)) return { error: "El plazo ya está cerrado: si no puedes ir, avisa al gestor de mesas para que ponga a otra persona.", ...(await misMesas(token, tel)) };
  await c.db.from("mesa_asignaciones").delete().eq("id", asignacion).eq("persona_id", p.id);
  return misMesas(token, tel);
}
