import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las miniaturas de la pizarra viajan en el guardado del ejercicio
  // staleTimes: al volver a un menú visitado hace poco se ve al instante (los datos se refrescan al guardar
  // cambios y al volver a la app, y cada minuto)
  experimental: { serverActions: { bodySizeLimit: "4mb" }, staleTimes: { dynamic: 30, static: 180 } },
  // El service worker siempre se revisa, para que las actualizaciones lleguen al momento
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Konva intenta cargar "canvas" de Node en el servidor; no lo necesitamos.
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;
