import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Buscador de GIFs (Giphy) para los comentarios de las noticias.
 * La clave va en Vercel (GIPHY_API_KEY) y nunca llega al navegador: el móvil pide aquí y aquí se pregunta a Giphy.
 * Sin búsqueda, devuelve los GIFs de moda (en español).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const clave = process.env.GIPHY_API_KEY?.trim();
  if (!clave) return NextResponse.json({ sinClave: true, gifs: [] });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const url = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${clave}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=es`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${clave}&limit=24&rating=pg-13`;
  try {
    const r = await fetch(url, { next: { revalidate: 600 } });
    if (!r.ok) return NextResponse.json({ error: "Giphy no responde ahora mismo.", gifs: [] }, { status: 502 });
    const j = (await r.json()) as { data: { id: string; title: string; images: { fixed_width_small?: { url: string }; fixed_width?: { url: string }; downsized?: { url: string } } }[] };
    const gifs = j.data.map((g) => ({
      id: g.id, titulo: g.title,
      mini: g.images.fixed_width_small?.url ?? g.images.fixed_width?.url ?? "",
      url: g.images.downsized?.url ?? g.images.fixed_width?.url ?? "",
    })).filter((g) => g.mini && g.url);
    return NextResponse.json({ gifs });
  } catch {
    return NextResponse.json({ error: "Giphy no responde ahora mismo.", gifs: [] }, { status: 502 });
  }
}
