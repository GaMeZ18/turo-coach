"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Cambia el idioma de la interfaz (es / ca) */
export async function cambiarIdioma(formData: FormData) {
  const idioma = formData.get("idioma") === "ca" ? "ca" : "es";
  (await cookies()).set("idioma", idioma, { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  revalidatePath("/", "layout");
}
