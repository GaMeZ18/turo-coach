"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, veEventos } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { aISO, fechaLarga, hora } from "@/lib/fechas";
import { enviarEmail, esc, plantillaEmail, type Adjunto } from "@/lib/email";
import { CAMPOS_EVENTO, CAMPOS_INSCRIPCION, euros, qrGifBase64, urlEstado, urlPase, type Evento, type Inscripcion, type Pase } from "@/lib/eventos";

type R = { ok?: boolean; error?: string; aviso?: string };

async function cliente() {
  const { supabase, perfil } = await requireUser();
  if (!veEventos(perfil)) throw new Error("Sin permiso");
  return supabase;
}
const texto = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max) || null;
const centimos = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0; };
const entero = (v: unknown, min: number, max: number, def: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
/** «2026-12-05T10:00» (hora de Barcelona) → ISO */
const local = (v: unknown) => { const s = String(v ?? ""); const [d, h] = s.split("T"); return d && h ? aISO(d, h.slice(0, 5)) : null; };
const refrescar = (id?: string) => { revalidatePath("/eventos"); if (id) revalidatePath(`/eventos/${id}`); };

// ---------- Eventos ----------
function datosEvento(f: FormData) {
  const slug = String(f.get("slug") ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return {
    nombre: texto(f.get("nombre")) ?? "Evento",
    ...(slug.length >= 4 ? { slug } : {}),
    descripcion: texto(f.get("descripcion"), 3000),
    fecha: local(f.get("fecha")),
    fecha_fin: local(f.get("fecha_fin")),
    lugar: texto(f.get("lugar")),
    precio_jugador: centimos(f.get("precio_jugador")),
    precio_entrenador: centimos(f.get("precio_entrenador")),
    min_jugadores: entero(f.get("min_jugadores"), 1, 30, 5),
    max_jugadores: entero(f.get("max_jugadores"), 1, 40, 15),
    max_equipos: f.get("max_equipos") ? entero(f.get("max_equipos"), 1, 500, 16) : null,
    fecha_limite: local(f.get("fecha_limite")),
    pago_transferencia: f.get("pago_transferencia") === "on",
    pago_tpv: f.get("pago_tpv") === "on",
    iban: texto(f.get("iban"), 40)?.replace(/\s+/g, "").toUpperCase() ?? null,
    titular: texto(f.get("titular"), 80),
    torneo_id: texto(f.get("torneo_id"), 40),
  };
}

export async function crearEvento(f: FormData) {
  const supabase = await cliente();
  const { data, error } = await supabase.from("eventos").insert(datosEvento(f)).select("id").single();
  if (error) throw new Error(error.message.includes("slug") ? "Esa dirección ya la usa otro evento." : error.message);
  refrescar();
  redirect(`/eventos/${data.id}?v=ajustes`);
}

export async function editarEvento(id: string, f: FormData): Promise<R> {
  const supabase = await cliente();
  const { error } = await supabase.from("eventos").update(datosEvento(f)).eq("id", id);
  refrescar(id);
  return error ? { error: error.message.includes("slug") ? "Esa dirección ya la usa otro evento." : error.message } : { ok: true };
}

export async function abrirEvento(id: string, abierto: boolean): Promise<R> {
  const supabase = await cliente();
  if (abierto) {
    const { data } = await supabase.from("eventos").select("pago_transferencia, iban").eq("id", id).single();
    if (data?.pago_transferencia && !data.iban) return { error: "Pon el IBAN del club antes de abrir las inscripciones." };
  }
  const { error } = await supabase.from("eventos").update({ abierto }).eq("id", id);
  refrescar(id);
  return error ? { error: error.message } : { ok: true };
}

export async function borrarEvento(id: string) {
  const supabase = await cliente();
  const { data } = await supabase.from("evento_inscripciones").select("comprobante").eq("evento_id", id).not("comprobante", "is", null);
  const rutas = (data ?? []).map((x) => x.comprobante as string);
  if (rutas.length) await adminClient()?.storage.from("eventos-justificantes").remove(rutas);
  await supabase.from("eventos").delete().eq("id", id);
  refrescar();
  redirect("/eventos");
}

// ---------- Inscripciones ----------
async function cargarInscripcion(supabase: Awaited<ReturnType<typeof cliente>>, id: string) {
  const { data: i } = await supabase.from("evento_inscripciones").select(CAMPOS_INSCRIPCION).eq("id", id).single();
  if (!i) throw new Error("Inscripción no encontrada");
  const { data: e } = await supabase.from("eventos").select(CAMPOS_EVENTO).eq("id", i.evento_id).single();
  return { ins: i as Inscripcion, ev: e as Evento };
}

/** Ver el justificante (URL firmada de 10 minutos) */
export async function verJustificante(id: string): Promise<{ url?: string; error?: string }> {
  const supabase = await cliente();
  const { data } = await supabase.from("evento_inscripciones").select("comprobante").eq("id", id).single();
  if (!data?.comprobante) return { error: "No hay justificante." };
  const { data: u } = await adminClient()!.storage.from("eventos-justificantes").createSignedUrl(data.comprobante, 600);
  return u ? { url: u.signedUrl } : { error: "No se ha podido abrir." };
}

/** Email con los pases: al responsable todos, y a cada jugador con email el suyo */
async function enviarPases(ev: Evento, ins: Inscripcion, pases: Pase[]): Promise<string | null> {
  const cuando = ev.fecha ? `${fechaLarga(ev.fecha)} a las ${hora(ev.fecha)}` : "";
  const bloque = (p: Pase, cid: string) => `<div style="border:1px solid #e3e6ef;border-radius:12px;padding:12px;margin:10px 0;text-align:center">
    <img src="cid:${cid}" width="180" height="180" alt="QR" style="display:block;margin:0 auto"/>
    <div style="font-weight:700;font-size:17px;margin-top:6px">${p.dorsal ? `#${esc(p.dorsal)} ` : ""}${esc(p.nombre)}</div>
    <div style="font-size:13px;color:#667">${p.rol === "entrenador" ? "Entrenador/a" : "Jugador/a"} · ${esc(ins.equipo)}</div>
    <a href="${urlPase(p.codigo)}" style="display:inline-block;margin-top:8px;font-size:13px;color:#1d4ed8">Abrir el pase en el móvil</a></div>`;
  const adj = (p: Pase, i: number): Adjunto => ({ filename: `pase-${i + 1}.gif`, content: qrGifBase64(urlPase(p.codigo), 6), content_id: `qr${i}` });
  const intro = `<p>¡Inscripción confirmada! El equipo <strong>${esc(ins.equipo)}</strong> ya está inscrito en <strong>${esc(ev.nombre)}</strong>${cuando ? ` (${esc(cuando)}${ev.lugar ? `, ${esc(ev.lugar)}` : ""})` : ""}.</p>
    <p>Aquí tenéis un <strong>pase con QR para cada persona</strong>. Hay que enseñarlo en la entrada (en el móvil o impreso). Cada QR solo vale para una entrada.</p>`;
  const errores: string[] = [];
  const r = await enviarEmail({
    para: ins.email,
    asunto: `🎟️ Pases para ${ev.nombre} · ${ins.equipo}`,
    html: plantillaEmail("Inscripción confirmada", `${intro}${pases.map((p, i) => bloque(p, `qr${i}`)).join("")}<p style="font-size:13px;color:#667">También los tenéis todos en <a href="${urlEstado(ins.codigo)}">esta página</a>.</p>`),
    adjuntos: pases.map(adj),
  });
  if (r.error) errores.push(r.error);
  for (const [i, p] of pases.entries()) {
    const email = ins.personas.find((x) => x.nombre === p.nombre && x.email)?.email;
    if (!email || email === ins.email) continue;
    const r2 = await enviarEmail({
      para: email,
      asunto: `🎟️ Tu pase para ${ev.nombre}`,
      html: plantillaEmail("Tu pase", `<p>Hola, ${esc(p.nombre.split(" ")[0])}. Este es tu pase para <strong>${esc(ev.nombre)}</strong>${cuando ? ` (${esc(cuando)})` : ""}.</p>${bloque(p, "qr0")}`),
      adjuntos: [{ ...adj(p, i), content_id: "qr0" }],
    });
    if (r2.error) errores.push(r2.error);
  }
  return errores[0] ?? null;
}

/** Aprobar: crea los pases (uno por persona), alta en el torneo si lo hay y email con los QR */
export async function aprobar(id: string): Promise<R> {
  const supabase = await cliente();
  const { ins, ev } = await cargarInscripcion(supabase, id);
  if (ins.estado === "cancelada") return { error: "Esta inscripción está cancelada." };
  const { data: ya } = await supabase.from("evento_pases").select("id").eq("inscripcion_id", id).limit(1);
  if (!ya?.length) {
    const filas = ins.personas.map((p) => ({ evento_id: ev.id, inscripcion_id: id, codigo: randomBytes(16).toString("hex"), nombre: p.nombre, rol: p.rol, dorsal: p.dorsal || null }));
    const { error } = await supabase.from("evento_pases").insert(filas);
    if (error) return { error: error.message };
  }
  let torneoEquipo: string | null = null;
  if (ev.torneo_id) {
    const { data: t } = await supabase.from("evento_inscripciones").select("torneo_equipo_id").eq("id", id).single();
    torneoEquipo = t?.torneo_equipo_id ?? null;
    if (!torneoEquipo) {
      const { data: te } = await adminClient()!.from("torneo_equipos").insert({ torneo_id: ev.torneo_id, nombre: ins.equipo, club: ins.club }).select("id").single();
      torneoEquipo = te?.id ?? null;
    }
  }
  const ahora = new Date().toISOString();
  await supabase.from("evento_inscripciones").update({ estado: "aprobada", aprobada_at: ahora, pagado_at: ins.pagado_at ?? ahora, motivo: null, ...(torneoEquipo ? { torneo_equipo_id: torneoEquipo } : {}) }).eq("id", id);
  const { data: pases } = await supabase.from("evento_pases").select("id, codigo, nombre, rol, dorsal, anulado, usado_at, inscripcion_id").eq("inscripcion_id", id).eq("anulado", false);
  const fallo = await enviarPases(ev, { ...ins, estado: "aprobada" }, (pases ?? []) as Pase[]);
  refrescar(ev.id);
  if (ev.torneo_id) revalidatePath(`/torneos/${ev.torneo_id}`);
  return fallo ? { ok: true, aviso: `Aprobada, pero el email no ha salido: ${fallo}` } : { ok: true };
}

export async function reenviarPases(id: string): Promise<R> {
  const supabase = await cliente();
  const { ins, ev } = await cargarInscripcion(supabase, id);
  if (ins.estado !== "aprobada") return { error: "Solo se reenvían los pases de inscripciones aprobadas." };
  const { data: pases } = await supabase.from("evento_pases").select("id, codigo, nombre, rol, dorsal, anulado, usado_at, inscripcion_id").eq("inscripcion_id", id).eq("anulado", false);
  const fallo = await enviarPases(ev, ins, (pases ?? []) as Pase[]);
  return fallo ? { error: fallo } : { ok: true };
}

export async function rechazar(id: string, motivo: string): Promise<R> {
  const supabase = await cliente();
  const { ins, ev } = await cargarInscripcion(supabase, id);
  const m = texto(motivo, 300) ?? "No hemos podido comprobar el pago";
  await supabase.from("evento_inscripciones").update({ estado: "rechazada", motivo: m }).eq("id", id);
  await supabase.from("evento_pases").update({ anulado: true }).eq("inscripcion_id", id);
  const r = await enviarEmail({
    para: ins.email,
    asunto: `Inscripción pendiente · ${ev.nombre}`,
    html: plantillaEmail("Revisa tu inscripción", `<p>No hemos podido validar la inscripción de <strong>${esc(ins.equipo)}</strong> en <strong>${esc(ev.nombre)}</strong>.</p><p><strong>Motivo:</strong> ${esc(m)}</p><p>Puedes revisarlo y volver a subir el justificante desde <a href="${urlEstado(ins.codigo)}">esta página</a>.</p>`),
  });
  refrescar(ev.id);
  return r.error ? { ok: true, aviso: `Rechazada, pero el email no ha salido: ${r.error}` } : { ok: true };
}

export async function cancelar(id: string): Promise<R> {
  const supabase = await cliente();
  const { ev } = await cargarInscripcion(supabase, id);
  await supabase.from("evento_inscripciones").update({ estado: "cancelada" }).eq("id", id);
  await supabase.from("evento_pases").update({ anulado: true }).eq("inscripcion_id", id);
  refrescar(ev.id);
  return { ok: true };
}

// ---------- Entrada (escáner) ----------
export type Lectura = { estado: "ok" | "usado" | "anulado" | "otro_evento" | "invalido"; nombre?: string; equipo?: string; rol?: string; dorsal?: string | null; usado_at?: string | null; paseId?: string };

/** Lee un QR en la puerta: si es válido, registra la entrada (solo una vez) */
export async function validarPase(eventoId: string, leido: string): Promise<Lectura> {
  const supabase = await cliente();
  const codigo = (leido.match(/[a-f0-9]{32}/) ?? [])[0];
  if (!codigo) return { estado: "invalido" };
  const { data } = await supabase.from("evento_pases").select("id, evento_id, nombre, rol, dorsal, anulado, usado_at, evento_inscripciones(equipo, estado)").eq("codigo", codigo).maybeSingle();
  const p = data as unknown as { id: string; evento_id: string; nombre: string; rol: string; dorsal: string | null; anulado: boolean; usado_at: string | null; evento_inscripciones: { equipo: string; estado: string } | null } | null;
  if (!p) return { estado: "invalido" };
  const base = { nombre: p.nombre, equipo: p.evento_inscripciones?.equipo, rol: p.rol, dorsal: p.dorsal, paseId: p.id };
  if (p.evento_id !== eventoId) return { ...base, estado: "otro_evento" };
  if (p.anulado || p.evento_inscripciones?.estado !== "aprobada") return { ...base, estado: "anulado" };
  if (p.usado_at) return { ...base, estado: "usado", usado_at: p.usado_at };
  // Solo marca si sigue sin usar (dos lectores a la vez: entra uno)
  const { data: marcado } = await supabase.from("evento_pases").update({ usado_at: new Date().toISOString() }).eq("id", p.id).is("usado_at", null).select("id");
  if (!marcado?.length) return { ...base, estado: "usado", usado_at: new Date().toISOString() };
  revalidatePath(`/eventos/${eventoId}`);
  return { ...base, estado: "ok" };
}

/** Deshacer una entrada (por si se ha leído por error) */
export async function deshacerEntrada(paseId: string): Promise<R> {
  const supabase = await cliente();
  const { data } = await supabase.from("evento_pases").update({ usado_at: null }).eq("id", paseId).select("evento_id").single();
  if (data) refrescar(data.evento_id);
  return { ok: true };
}
