import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: el middleware ya refresca la sesión.
          }
        },
      },
    }
  );
}

export type Perfil = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: "coordinador" | "entrenador" | "gestor_mesas";
  /** Permiso extra: gestiona las mesas de los partidos (además de su rol) */
  gestor_mesas?: boolean;
};

/** ¿Puede entrar en Mesas? (coordinadores y quien tenga el permiso de gestor de mesas) */
export const gestionaMesas = (p: Perfil) => p.rol === "coordinador" || p.rol === "gestor_mesas" || !!p.gestor_mesas;

/** Devuelve el cliente, el usuario y su perfil. Redirige a /login si no hay sesión.
 *  Con cache(): layout y página comparten la misma consulta en cada petición. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  // La sesión de la cookie da el id al momento: el perfil se pide a la vez que se comprueba el usuario (más rápido)
  const { data: { session } } = await supabase.auth.getSession();
  const idSesion = session?.user?.id;
  const [{ data: { user } }, pre] = await Promise.all([
    supabase.auth.getUser(),
    idSesion ? supabase.from("perfiles").select("id, nombre, email, rol, gestor_mesas").eq("id", idSesion).single() : Promise.resolve(null),
  ]);
  if (!user) redirect("/login");
  let { data: perfil, error } = pre && idSesion === user.id ? pre : await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, gestor_mesas")
    .eq("id", user.id)
    .single();
  // Si aún no existe la columna gestor_mesas (migración 0024), se lee sin ella
  if (error && /gestor_mesas/.test(error.message)) ({ data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("id", user.id).single());
  return {
    supabase,
    user,
    perfil: (perfil ?? {
      id: user.id,
      nombre: user.email,
      email: user.email,
      rol: "entrenador",
    }) as Perfil,
  };
});
