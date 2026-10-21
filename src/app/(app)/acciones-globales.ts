"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_EQUIPO } from "@/lib/equipo-activo";

export async function elegirEquipo(formData: FormData) {
  const id = String(formData.get("equipo_id") ?? "");
  const store = await cookies();
  if (id) {
    store.set(COOKIE_EQUIPO, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    store.delete(COOKIE_EQUIPO);
  }
  revalidatePath("/", "layout");
}
