"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Cambia el tema de la app: claro, oscuro o automático (según el móvil) */
export async function cambiarTema(formData: FormData) {
  const v = String(formData.get("tema"));
  const tema = v === "oscuro" || v === "auto" ? v : "claro";
  (await cookies()).set("tema", tema, { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  revalidatePath("/", "layout");
}
