import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
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

  const path = request.nextUrl.pathname;
  const publica = path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/cal/") || path.startsWith("/apuntarse-mesa") || path.startsWith("/api/avisos") || path.startsWith("/e/") || path.startsWith("/jugadas/");

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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|sw.js|offline.html|icons/|marca/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
