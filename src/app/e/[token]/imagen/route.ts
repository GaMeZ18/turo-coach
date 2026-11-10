import { adminClient } from "@/lib/supabase/admin";

/** Imagen del ejercicio compartido (la vista previa de WhatsApp necesita una dirección, no un data:) */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = adminClient();
  if (!db || !/^[a-f0-9]{8,40}$/.test(token)) return new Response("No", { status: 404 });
  const { data } = await db.from("ejercicios").select("preview, imagenes").eq("compartir_token", token).maybeSingle();
  const src = (data?.preview as string | null) || ((data?.imagenes as string[] | null) ?? [])[0];
  const m = src?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return Response.redirect("https://coach.cbturo.com/icons/icon-512.png", 302);
  return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": "public, max-age=3600" } });
}
