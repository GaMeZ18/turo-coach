"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function entrar(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
  });
  if (error) {
    const msg =
      error.code === "invalid_credentials"
        ? "Email o contraseña incorrectos"
        : error.code === "email_not_confirmed"
          ? "Este email aún no está confirmado"
          : `No se ha podido entrar (${error.code ?? error.status ?? "?"}: ${error.message})`;
    redirect("/login?error=" + encodeURIComponent(msg));
  }
  redirect("/");
}

export async function enviarEnlace(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signInWithOtp({
    email: String(formData.get("email")),
    // shouldCreateUser: false → solo pueden entrar usuarios invitados
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=" + encodeURIComponent("Ese email no tiene acceso. Pide invitación al coordinador."));
  redirect("/login?enviado=1");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
