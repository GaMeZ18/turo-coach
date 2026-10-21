import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino de los enlaces de email (invitación, enlace mágico, recuperar contraseña).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("El enlace ha caducado. Pide otro.")}`);
  }
  // Los invitados van a su cuenta para ponerse contraseña
  const destino = type === "invite" || type === "recovery" ? "/cuenta?nuevo=1" : "/";
  return NextResponse.redirect(`${origin}${destino}`);
}
