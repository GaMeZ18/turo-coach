"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/** Accesos de Inicio elegidos por cada uno (en su orden). null = todos, como al principio */
export async function guardarInicio(hrefs: string[] | null): Promise<{ error?: string }> {
  const { user } = await requireUser();
  const db = adminClient();
  if (!db) return { error: "Falta la configuración del servidor." };
  const limpio = hrefs ? [...new Set(hrefs.filter((h) => /^\/[a-z0-9/-]*$/.test(h)))].slice(0, 40) : null;
  const { error } = await db.from("perfiles").update({ inicio: limpio }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

/** La guía de bienvenida ya se ha visto */
export async function bienvenidaVista() {
  const { user } = await requireUser();
  const db = adminClient();
  if (db) await db.from("perfiles").update({ bienvenida_vista: true }).eq("id", user.id);
}
