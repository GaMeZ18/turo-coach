import "server-only";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import { ADMIN_FANTASY } from "./datos";

/** ¿Sale «Fantasy» en el menú? Al administrador siempre; al resto, cuando esté abierto */
export const veFantasy = cache(async (perfilId: string) => {
  if (perfilId === ADMIN_FANTASY) return true;
  try {
    const { data } = await adminClient()!.from("fantasy_config").select("abierto").eq("id", 1).maybeSingle();
    return !!data?.abierto;
  } catch { return false; }
});
