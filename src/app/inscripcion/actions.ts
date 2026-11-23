"use server";

import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import { notificarPerfiles } from "@/lib/notificar";
import { CAMPOS_EVENTO, euros, importeDe, motivoCerrado, type Evento, type Persona } from "@/lib/eventos";

const ADMIN = "60fb55be-45e2-4f5d-addc-35aaf44b7610";
const texto = (v: unknown, max = 120) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function db() {
  const d = adminClient();
  if (!d) throw new Error("Falta la configuración del servidor.");
  return d;
}

export type DatosInscripcion = {
  equipo: string; club: string; categoria: string; responsable: string; email: string; telefono: string;
  personas: Persona[]; acepto: boolean; web?: string; // «web» es un campo trampa para robots
};

/** Nueva inscripción de un equipo (pública). Devuelve el código para la página de estado. */
export async function inscribir(slug: string, d: DatosInscripcion): Promise<{ codigo?: string; error?: string }> {
  if (d.web) return { error: "No se ha podido enviar." };
  const { data: ev } = await db().from("club_eventos").select(CAMPOS_EVENTO).eq("slug", slug).maybeSingle();
  if (!ev) return { error: "Este evento ya no existe." };
  const evento = ev as Evento;
  const { count } = await db().from("evento_inscripciones").select("id", { count: "exact", head: true }).eq("evento_id", evento.id).not("estado", "in", "(rechazada,cancelada)");
  const cerrado = motivoCerrado(evento, count ?? 0);
  if (cerrado) return { error: cerrado };
  const equipo = texto(d.equipo, 80), responsable = texto(d.responsable, 80), email = texto(d.email, 120).toLowerCase();
  if (!equipo) return { error: "Pon el nombre del equipo." };
  if (!responsable) return { error: "Pon el nombre de la persona responsable." };
  if (!emailOk(email)) return { error: "El email no es válido: ahí llegarán los pases." };
  if (!d.acepto) return { error: "Tienes que aceptar el tratamiento de datos para inscribirte." };
  const personas: Persona[] = (Array.isArray(d.personas) ? d.personas : []).slice(0, 40)
    .map((p) => ({ nombre: texto(p.nombre, 80), rol: p.rol === "entrenador" ? "entrenador" as const : "jugador" as const, dorsal: texto(p.dorsal, 4) || null, email: emailOk(texto(p.email, 120)) ? texto(p.email, 120).toLowerCase() : null }))
    .filter((p) => p.nombre);
  const jugadores = personas.filter((p) => p.rol === "jugador").length;
  if (jugadores < evento.min_jugadores) return { error: `Hacen falta al menos ${evento.min_jugadores} jugadores.` };
  if (jugadores > evento.max_jugadores) return { error: `Máximo ${evento.max_jugadores} jugadores por equipo.` };
  const importe = importeDe(evento, personas);
  const referencia = `TURO-${randomBytes(3).toString("hex").toUpperCase()}`;
  const { data, error } = await db().from("evento_inscripciones").insert({
    evento_id: evento.id, referencia, equipo, club: texto(d.club, 80) || null, categoria: texto(d.categoria, 40) || null,
    responsable, email, telefono: texto(d.telefono, 30) || null, personas, importe, estado: importe > 0 ? "pendiente_pago" : "pendiente_validacion",
  }).select("codigo").single();
  if (error) return { error: "No se ha podido guardar la inscripción. Prueba otra vez." };
  await notificarPerfiles(db(), [ADMIN], `📝 Nueva inscripción: ${equipo}`, `${evento.nombre} · ${personas.length} personas · ${euros(importe)}`, `/eventos/${evento.id}`).catch(() => {});
  return { codigo: data.codigo as string };
}

async function inscripcionDe(codigo: string) {
  if (!/^[a-f0-9]{32}$/.test(codigo)) return null;
  const { data } = await db().from("evento_inscripciones").select("id, evento_id, equipo, estado, importe, eventos:club_eventos(nombre)").eq("codigo", codigo).maybeSingle();
  return data as unknown as { id: string; evento_id: string; equipo: string; estado: string; importe: number; eventos: { nombre: string } | null } | null;
}

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

/** URL firmada para subir el justificante de la transferencia (foto o PDF, máx. 10 MB) */
export async function urlJustificante(codigo: string, tipo: string, tam: number): Promise<{ ruta?: string; token?: string; error?: string }> {
  const ins = await inscripcionDe(codigo);
  if (!ins) return { error: "Inscripción no encontrada." };
  if (!["pendiente_pago", "pendiente_validacion", "rechazada"].includes(ins.estado)) return { error: "Esta inscripción ya está aprobada." };
  const ext = TIPOS[tipo];
  if (!ext) return { error: "Sube una foto (JPG, PNG) o un PDF." };
  if (tam > 10 * 1024 * 1024) return { error: "El archivo pesa más de 10 MB." };
  const ruta = `${ins.evento_id}/${ins.id}/${Date.now()}.${ext}`;
  const { data, error } = await db().storage.from("eventos-justificantes").createSignedUploadUrl(ruta);
  if (error || !data) return { error: "No se ha podido preparar la subida." };
  return { ruta, token: data.token };
}

/** Tras subirlo: queda pendiente de que el club lo revise */
export async function justificanteSubido(codigo: string, ruta: string): Promise<{ ok?: boolean; error?: string }> {
  const ins = await inscripcionDe(codigo);
  if (!ins || !ruta.startsWith(`${ins.evento_id}/${ins.id}/`)) return { error: "Inscripción no encontrada." };
  if (ins.estado === "aprobada") return { error: "Esta inscripción ya está aprobada." };
  await db().from("evento_inscripciones").update({ comprobante: ruta, metodo: "transferencia", estado: "pendiente_validacion", motivo: null }).eq("id", ins.id);
  await notificarPerfiles(db(), [ADMIN], `🧾 Justificante para revisar: ${ins.equipo}`, `${ins.eventos?.nombre ?? "Evento"} · ${euros(ins.importe)}`, `/eventos/${ins.evento_id}`).catch(() => {});
  return { ok: true };
}
