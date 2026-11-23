import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

const esPublica = (path: string) => path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/cal/") || path.startsWith("/apuntarse-mesa") || path.startsWith("/api/avisos") || path.startsWith("/api/fcbq/pendiente") || path.startsWith("/api/fcbq/stats-faltan") || path.startsWith("/e/") || path.startsWith("/jugadas/") || path.startsWith("/a/") || path.startsWith("/t/") || path.startsWith("/inscripcion/") || path.startsWith("/pase/") || path === "/fantasy" || path.startsWith("/fantasy/");

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Páginas públicas (Fantasy, enlaces de asistencia, pases…): no hace falta mirar la sesión de Supabase.
  // Es la mayor parte del tráfico y así el middleware no gasta CPU en Vercel.
  if (esPublica(path) && !path.startsWith("/login") && !path.startsWith("/auth")) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Solo para decidir si mandar al login: se lee la sesión de la cookie (sin ir al servidor de Supabase,
  // así cada cambio de menú es más rápido). La comprobación de verdad la hacen requireUser y la seguridad de la base de datos.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const publica = esPublica(path);

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|sw.js|fcbq-movil.js|offline.html|icons/|marca/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
