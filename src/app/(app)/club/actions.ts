"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { check } from "@/lib/db";

export type ResultadoPersona = { ok?: boolean; error?: string; email?: string; password?: string; nombre?: string; invitado?: boolean } | null;

const SIN_CLAVE = "Falta la clave de administrador: en Vercel añade la variable SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API Keys → secret) y vuelve a desplegar.";

async function soloCoordinador() {
  const { perfil } = await requireUser();
  if (perfil.rol !== "coordinador") throw new Error("Solo el coordinador puede hacer esto.");
}

/** Contraseña provisional fácil de dictar: Turo-1234-abcd */
function provisional() {
  const n = Math.floor(1000 + Math.random() * 9000);
  const l = Array.from({ length: 4 }, () => "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)]).join("");
  return `Turo-${n}-${l}`;
}

/** Alta de una persona del staff: con contraseña provisional (sin email) o con invitación por email */
export async function crearPersona(_: ResultadoPersona, fd: FormData): Promise<ResultadoPersona> {
  await soloCoordinador();
  const admin = adminClient();
  if (!admin) return { error: SIN_CLAVE };
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const rol = fd.get("rol") === "coordinador" ? "coordinador" : "entrenador";
  const modo = fd.get("modo") === "invitar" ? "invitar" : "password";
  if (!nombre || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe el nombre y un email válido." };

  let id: string | undefined;
  let password: string | undefined;
  if (modo === "invitar") {
    const origen = String(fd.get("origen") ?? "");
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { nombre }, redirectTo: origen ? `${origen}/login` : undefined });
    if (error) return { error: /already|registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese email." : error.message };
    id = data.user?.id;
  } else {
    password = provisional();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } });
    if (error) return { error: /already|registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese email." : error.message };
    id = data.user?.id;
  }
  if (!id) return { error: "No se ha podido crear la cuenta." };

  // El perfil lo crea un disparador; ponemos nombre y rol
  await admin.from("perfiles").update({ nombre, rol }).eq("id", id);
  // Equipos y función
  const equipos = fd.getAll("equipos").map(String).filter(Boolean);
  const funcion = String(fd.get("funcion") ?? "entrenador");
  if (equipos.length) await supabase.from("equipo_staff").upsert(equipos.map((equipo_id) => ({ equipo_id, perfil_id: id, funcion })));
  revalidatePath("/club");
  revalidatePath("/equipos");
  return { ok: true, email, password, nombre, invitado: modo === "invitar" };
}

/** Nueva contraseña provisional para alguien que la ha olvidado */
export async function nuevaPassword(_: ResultadoPersona, fd: FormData): Promise<ResultadoPersona> {
  await soloCoordinador();
  const admin = adminClient();
  if (!admin) return { error: SIN_CLAVE };
  const id = String(fd.get("id"));
  const password = provisional();
  const { data, error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  return { ok: true, email: data.user?.email ?? "", password, nombre: String(fd.get("nombre") ?? "") };
}

/** Quitar o devolver el acceso a la app. No se borra la cuenta: sus ejercicios y plantillas se quedan en el club. */
export async function alternarAcceso(fd: FormData) {
  await soloCoordinador();
  const admin = adminClient();
  if (!admin) throw new Error(SIN_CLAVE);
  const { user } = await requireUser();
  const id = String(fd.get("id"));
  if (id === user.id) throw new Error("No puedes quitarte el acceso a ti mismo.");
  const bloquear = fd.get("bloquear") === "1";
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: bloquear ? "876000h" : "none" });
  if (error) throw new Error(error.message);
  if (bloquear) await admin.from("equipo_staff").delete().eq("perfil_id", id);
  revalidatePath("/club");
  revalidatePath("/equipos");
}

export async function cambiarRol(fd: FormData) {
  await soloCoordinador();
  const supabase = await createClient();
  check(await supabase.from("perfiles").update({ rol: String(fd.get("rol")) }).eq("id", String(fd.get("id"))));
  revalidatePath("/club");
}

export async function asignarEquipo(fd: FormData) {
  await soloCoordinador();
  const supabase = await createClient();
  const perfil = String(fd.get("perfil_id") ?? ""), equipo = String(fd.get("equipo_id") ?? "");
  if (!perfil || !equipo) return;
  check(await supabase.from("equipo_staff").upsert({ equipo_id: equipo, perfil_id: perfil, funcion: String(fd.get("funcion") ?? "entrenador") }));
  revalidatePath("/club");
  revalidatePath("/equipos");
}

export async function quitarEquipo(fd: FormData) {
  await soloCoordinador();
  const supabase = await createClient();
  check(await supabase.from("equipo_staff").delete().eq("equipo_id", String(fd.get("equipo_id"))).eq("perfil_id", String(fd.get("perfil_id"))));
  revalidatePath("/club");
  revalidatePath("/equipos");
}
