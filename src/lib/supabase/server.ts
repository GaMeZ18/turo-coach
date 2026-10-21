import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  rol: "coordinador" | "entrenador";
};

/** Devuelve el cliente, el usuario y su perfil. Redirige a /login si no hay sesión.
 *  Con cache(): layout y página comparten la misma consulta en cada petición. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol")
    .eq("id", user.id)
    .single();
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
