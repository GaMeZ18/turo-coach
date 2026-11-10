"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_FANTASY, cargarLiga, db, hashPin, hashSesion, leerConfig, nombreCorto, nuevaSesion, pinOk, quienSoy } from "@/lib/fantasy/datos";
import { MAX_POR_EQUIPO, PRESUPUESTO, type Comodin } from "@/lib/fantasy/motor";

type R = { ok?: boolean; error?: string };
export type Avatar = { emoji?: string | null; color?: string | null; foto?: string | null };
/** Emoji corto, color #rrggbb y foto JPEG/PNG/WebP pequeña (ya reducida en el móvil) */
function avatarValido(a?: Avatar) {
  if (!a) return {};
  const emoji = a.emoji && [...a.emoji].length <= 4 && !/[<>]/.test(a.emoji) ? a.emoji : null;
  const color = a.color && /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : null;
  const foto = a.foto && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.foto) && a.foto.length < 90_000 ? a.foto : null;
  return { emoji, color, foto };
}
const limpiar = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const aliasValido = (a: string) => a.length >= 3 && a.length <= 30;
const guardarCookie = async (t: string) => (await cookies()).set(COOKIE_FANTASY, t, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });

async function aliasLibre(alias: string, excepto?: string) {
  const { data } = await db().from("fantasy_participantes").select("id").ilike("alias", alias.replace(/[%_]/g, "\\$&"));
  return !(data ?? []).some((x) => x.id !== excepto);
}

/** Staff con cuenta: solo elige el nombre de su equipo */
export async function unirseStaff(alias: string, avatar?: Avatar, nombreReal?: string): Promise<R> {
  const q = await quienSoy();
  if (!q.perfil) return { error: "Tienes que entrar con tu cuenta del club." };
  if (!q.acceso) return { error: "El fantasy aún no está abierto." };
  if (q.participante) return { ok: true };
  const a = limpiar(alias, 30);
  if (!aliasValido(a)) return { error: "El nombre del equipo debe tener entre 3 y 30 letras." };
  if (!(await aliasLibre(a))) return { error: "Ese nombre de equipo ya existe. Elige otro." };
  const guardado = q.perfil.nombre && !q.perfil.nombre.includes("@") ? q.perfil.nombre.trim() : "";
  const nombre = limpiar(nombreReal, 60) || guardado;
  if (nombre.split(" ").filter(Boolean).length < 2) return { error: "Pon tu nombre y apellido." };
  // Si en la app no teníamos su nombre, se guarda también en su perfil
  if (!guardado) await db().from("perfiles").update({ nombre }).eq("id", q.perfil.id);
  const { error } = await db().from("fantasy_participantes").insert({ perfil_id: q.perfil.id, alias: a, nombre, mostrar: nombreCorto(nombre), ...avatarValido(avatar) });
  if (error) return { error: error.message };
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Registro sin cuenta (jugadores, familias, socios) */
export async function registrar(d: { alias: string; nombre: string; contacto: string; pin: string } & Avatar): Promise<R> {
  const config = await leerConfig();
  if (!config.abierto) return { error: "El fantasy aún no está abierto." };
  const alias = limpiar(d.alias, 30), nombre = limpiar(d.nombre, 60), contacto = limpiar(d.contacto, 80), pin = String(d.pin ?? "").trim();
  if (!aliasValido(alias)) return { error: "El nombre del equipo debe tener entre 3 y 30 letras." };
  if (nombre.length < 3) return { error: "Pon tu nombre y apellido (solo lo ve el club)." };
  if (contacto.length < 6) return { error: "Pon un teléfono o un email (por si ganas el premio)." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "El PIN debe tener de 4 a 6 números." };
  if (!(await aliasLibre(alias))) return { error: "Ese nombre de equipo ya existe. Elige otro." };
  const t = nuevaSesion();
  const { error } = await db().from("fantasy_participantes").insert({ alias, nombre, mostrar: nombreCorto(nombre), contacto, pin_hash: hashPin(pin), sesion_hash: hashSesion(t), ...avatarValido(d) });
  if (error) return { error: error.message };
  await guardarCookie(t);
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Volver a entrar en otro móvil: nombre del equipo (o teléfono/email) + PIN */
export async function entrar(quien: string, pin: string): Promise<R> {
  const q = limpiar(quien, 80);
  if (!q || !/^\d{4,6}$/.test(String(pin ?? "").trim())) return { error: "Escribe tu equipo (o teléfono/email) y tu PIN." };
  const d = db();
  const esc = q.replace(/[%_,()"\\]/g, " ").trim();
  const { data } = await d.from("fantasy_participantes").select("id, pin_hash").or(`alias.ilike."${esc}",contacto.ilike."${esc}"`).not("pin_hash", "is", null).limit(3);
  const p = (data ?? []).find((x) => pinOk(String(pin).trim(), x.pin_hash as string));
  if (!p) { await new Promise((r) => setTimeout(r, 800)); return { error: "No coincide. Revisa el nombre y el PIN." }; }
  const t = nuevaSesion();
  await d.from("fantasy_participantes").update({ sesion_hash: hashSesion(t) }).eq("id", p.id);
  await guardarCookie(t);
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Darse de baja: borra su equipo, sus alineaciones y sus mensajes */
export async function darmeDeBaja(): Promise<R> {
  const q = await quienSoy();
  if (!q.participante) return { error: "No estás apuntado." };
  await db().from("fantasy_participantes").delete().eq("id", q.participante.id);
  (await cookies()).delete(COOKIE_FANTASY);
  revalidatePath("/fantasy");
  return { ok: true };
}

export async function salir() {
  (await cookies()).delete(COOKIE_FANTASY);
  revalidatePath("/fantasy");
}

/** Cambiar el nombre del equipo, el nombre visible y el avatar */
export async function guardarPerfil(d: { alias: string; mostrar: string } & Avatar): Promise<R> {
  const q = await quienSoy();
  if (!q.participante) return { error: "No estás apuntado." };
  const a = limpiar(d.alias, 30), m = limpiar(d.mostrar, 30);
  if (!aliasValido(a)) return { error: "El nombre del equipo debe tener entre 3 y 30 letras." };
  if (m.length < 2) return { error: "Pon cómo quieres que te vean (p. ej. Juan G.)." };
  if (!(await aliasLibre(a, q.participante.id))) return { error: "Ese nombre de equipo ya existe." };
  await db().from("fantasy_participantes").update({ alias: a, mostrar: m, ...avatarValido(d) }).eq("id", q.participante.id);
  revalidatePath("/fantasy");
  return { ok: true };
}

/** Guarda el equipo de la jornada abierta, comprobando todas las reglas */
export async function guardarEquipo(d: { titulares: string[]; suplente: string | null; capitan: string; comodin: Comodin | null }): Promise<R> {
  const q = await quienSoy();
  if (!q.acceso || !q.participante) return { error: "No estás apuntado." };
  if (q.config.cerrada) return { error: "La temporada ya ha terminado." };
  const { liga } = await cargarLiga(q.config);
  const l = liga.abierta;
  if (!l || new Date().toISOString() >= liga.cierre(l)) return { error: "Los fichajes están cerrados. Se abren el lunes a las 9:30." };
  const precios = liga.precio(l);
  const ids = [...new Set(d.titulares)];
  if (ids.length !== 5) return { error: "Elige 5 titulares." };
  const todos = [...ids, ...(d.suplente ? [d.suplente] : [])];
  const js = todos.map((id) => liga.jugadores.get(id));
  if (js.some((j) => !j)) return { error: "Algún jugador ya no está disponible. Recarga la página." };
  const personas = js.map((j) => j!.persona);
  if (new Set(personas).size !== personas.length) return { error: "No puedes fichar dos veces a la misma persona (aunque juegue en dos equipos)." };
  const porEq = new Map<string, number>();
  for (const id of ids) { const e = liga.jugadores.get(id)!.equipoId; porEq.set(e, (porEq.get(e) ?? 0) + 1); }
  if ([...porEq.values()].some((n) => n > MAX_POR_EQUIPO)) return { error: `Máximo ${MAX_POR_EQUIPO} titulares del mismo equipo.` };
  if (!ids.includes(d.capitan)) return { error: "Elige un capitán entre tus titulares." };
  const bloq = liga.bloqueados(q.participante.id, l);
  const bloqueado = js.find((j) => bloq.has(j!.persona));
  if (bloqueado) return { error: `${bloqueado!.nombre} está bloqueado esta jornada (lo fichaste la anterior).` };
  // Comodín: uno por jornada y cada uno una vez por temporada
  const usados = q.participante.comodines ?? {};
  if (d.comodin && usados[d.comodin] && usados[d.comodin] !== l) return { error: "Ese comodín ya lo has gastado esta temporada." };
  const presupuesto = PRESUPUESTO + (d.comodin === "presupuesto" ? 10 : 0);
  const coste = todos.reduce((s, id) => s + (precios.get(id)?.precio ?? 6), 0);
  if (coste > presupuesto) return { error: `Te pasas del presupuesto: ${coste} ⭐ de ${presupuesto} ⭐.` };
  const ficha = (id: string) => ({ id, precio: precios.get(id)?.precio ?? 6 });
  const { error } = await db().from("fantasy_alineaciones").upsert({
    participante_id: q.participante.id, jornada: l, titulares: ids.map(ficha), suplente: d.suplente ? ficha(d.suplente) : null,
    capitan: d.capitan, comodin: d.comodin, coste, updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  // Apuntar el comodín gastado (o liberarlo si se ha quitado en esta misma jornada)
  const nuevos = { ...usados };
  for (const k of Object.keys(nuevos) as Comodin[]) if (nuevos[k] === l && k !== d.comodin) delete nuevos[k];
  if (d.comodin) nuevos[d.comodin] = l;
  await db().from("fantasy_participantes").update({ comodines: nuevos }).eq("id", q.participante.id);
  revalidatePath("/fantasy");
  return { ok: true };
}

// ---------- Chat ----------
export async function enviarMensaje(jornada: string, texto: string): Promise<R> {
  const q = await quienSoy();
  if (!q.acceso || !q.participante) return { error: "No estás apuntado." };
  if (q.participante.silenciado) return { error: "El administrador te ha silenciado en el chat." };
  const t = limpiar(texto, 500);
  if (!t) return { error: "Escribe algo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jornada)) return { error: "Jornada no válida." };
  const { error } = await db().from("fantasy_mensajes").insert({ jornada, participante_id: q.participante.id, texto: t });
  if (error) return { error: error.message };
  revalidatePath("/fantasy");
  return { ok: true };
}

export async function leerMensajes(jornada: string) {
  const q = await quienSoy();
  if (!q.acceso || !q.participante) return [];
  const { data } = await db().from("fantasy_mensajes").select("id, texto, created_at, participante_id, borrado, fantasy_participantes(alias, mostrar, emoji, color, foto)")
    .eq("jornada", jornada).order("created_at").limit(300);
  type P = { alias: string; mostrar: string | null; emoji: string | null; color: string | null; foto: string | null };
  return ((data ?? []) as unknown as { id: string; texto: string; created_at: string; participante_id: string; borrado: boolean; fantasy_participantes: P | null }[])
    .map((m) => ({ id: m.id, texto: m.borrado ? "" : m.texto, borrado: m.borrado, fecha: m.created_at, yo: m.participante_id === q.participante!.id,
      alias: m.fantasy_participantes?.alias ?? "?", mostrar: m.fantasy_participantes?.mostrar ?? "", emoji: m.fantasy_participantes?.emoji ?? null, color: m.fantasy_participantes?.color ?? null, foto: m.fantasy_participantes?.foto ?? null }));
}

export async function borrarMensaje(id: string): Promise<R> {
  const q = await quienSoy();
  if (!q.participante && !q.esAdmin) return { error: "Sin permiso." };
  const d = db();
  const { data: m } = await d.from("fantasy_mensajes").select("participante_id").eq("id", id).maybeSingle();
  if (!m) return { error: "No existe." };
  if (!q.esAdmin && m.participante_id !== q.participante?.id) return { error: "Solo puedes borrar tus mensajes." };
  await d.from("fantasy_mensajes").update({ borrado: true }).eq("id", id);
  revalidatePath("/fantasy");
  return { ok: true };
}

// ---------- Administración (solo Gámez) ----------
async function admin() {
  const q = await quienSoy();
  if (!q.esAdmin) throw new Error("Solo el administrador.");
  return q;
}
export async function adminConfig(c: { abierto?: boolean; premio?: string; inicio?: string }): Promise<R> {
  await admin();
  const fila: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (c.abierto !== undefined) fila.abierto = c.abierto;
  if (c.premio !== undefined) fila.premio = limpiar(c.premio, 200) || null;
  if (c.inicio && /^\d{4}-\d{2}-\d{2}$/.test(c.inicio)) fila.inicio = c.inicio;
  const { error } = await db().from("fantasy_config").update(fila).eq("id", 1);
  revalidatePath("/fantasy", "layout");
  return error ? { error: error.message } : { ok: true };
}
export async function adminEspecial(lunes: string, partidoId: string, poner: boolean): Promise<R> {
  const q = await admin();
  const esp = { ...q.config.especiales };
  const lista = new Set(esp[lunes] ?? []);
  if (poner) lista.add(partidoId); else lista.delete(partidoId);
  esp[lunes] = [...lista];
  if (!esp[lunes].length) delete esp[lunes];
  await db().from("fantasy_config").update({ especiales: esp }).eq("id", 1);
  revalidatePath("/fantasy", "layout");
  return { ok: true };
}
export async function adminAnular(lunes: string, anular: boolean): Promise<R> {
  const q = await admin();
  const s = new Set(q.config.anuladas);
  if (anular) s.add(lunes); else s.delete(lunes);
  await db().from("fantasy_config").update({ anuladas: [...s] }).eq("id", 1);
  revalidatePath("/fantasy", "layout");
  return { ok: true };
}
export async function adminSilenciar(id: string, silenciar: boolean): Promise<R> {
  await admin();
  await db().from("fantasy_participantes").update({ silenciado: silenciar }).eq("id", id);
  revalidatePath("/fantasy", "layout");
  return { ok: true };
}
export async function adminQuitarFoto(id: string): Promise<R> {
  await admin();
  await db().from("fantasy_participantes").update({ foto: null }).eq("id", id);
  revalidatePath("/fantasy", "layout");
  return { ok: true };
}
export async function adminBorrarParticipante(id: string): Promise<R> {
  await admin();
  await db().from("fantasy_participantes").delete().eq("id", id);
  revalidatePath("/fantasy", "layout");
  return { ok: true };
}
/** Cerrar la temporada: el primero de la general es el campeón (y sale en Noticias) */
export async function adminCerrarTemporada(cerrar: boolean): Promise<R> {
  const q = await admin();
  if (!cerrar) { await db().from("fantasy_config").update({ cerrada: false, campeon: null }).eq("id", 1); revalidatePath("/fantasy", "layout"); return { ok: true }; }
  const { liga } = await cargarLiga(q.config);
  const campeon = liga.general[0];
  if (!campeon) return { error: "No hay participantes." };
  const d = db();
  await d.from("fantasy_config").update({ cerrada: true, campeon: campeon.id }).eq("id", 1);
  await d.from("noticias").insert({
    titulo: `🏆 ¡${campeon.alias} gana el Fantasy Turó!`,
    contenido: `${campeon.alias} es el campeón del Fantasy Turó con ${campeon.total} puntos.${q.config.premio ? `\n\nPremio: ${q.config.premio}` : ""}\n\n¡Enhorabuena y gracias a todos por participar!`,
    resumen: `${campeon.alias} gana el Fantasy Turó con ${campeon.total} puntos.`,
    autor_id: q.perfil!.id, publicada_en: new Date().toISOString(),
  });
  revalidatePath("/fantasy", "layout");
  revalidatePath("/noticias");
  return { ok: true };
}
