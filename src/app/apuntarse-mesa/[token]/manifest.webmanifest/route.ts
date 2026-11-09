import { NextResponse } from "next/server";

/** Manifest del enlace de mesas: instalada en el móvil, se abre en la página para apuntarse */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = `/apuntarse-mesa/${encodeURIComponent(token)}`;
  return NextResponse.json({
    name: "Mesas CB Turó", short_name: "Mesas Turó", id: url, start_url: url, scope: "/apuntarse-mesa/",
    display: "standalone", background_color: "#002b8e", theme_color: "#002b8e", lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
