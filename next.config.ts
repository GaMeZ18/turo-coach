import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las miniaturas de la pizarra viajan en el guardado del ejercicio
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
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
