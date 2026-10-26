import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coach Manager CBTuró",
    short_name: "Coach Manager",
    description: "Ejercicios, pizarra y entrenamientos del CB Turó de la Peira",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "es",
    categories: ["sports", "education", "productivity"],
    display: "standalone",
    orientation: "any",
    background_color: "#002b8e",
    theme_color: "#002b8e",
    shortcuts: [
      { name: "Pizarra", url: "/pizarra", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Entrenamientos", url: "/entrenamientos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Ejercicios", url: "/ejercicios", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
