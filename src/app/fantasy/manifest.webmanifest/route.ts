import { NextResponse } from "next/server";

/** Manifest propio: instalada en el móvil, se abre directamente en el Fantasy (no en el login de la app) */
export function GET() {
  return NextResponse.json({
    name: "Fantasy Turó", short_name: "Fantasy Turó", id: "/fantasy", start_url: "/fantasy", scope: "/fantasy",
    display: "standalone", background_color: "#070c1c", theme_color: "#0a1024", lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
