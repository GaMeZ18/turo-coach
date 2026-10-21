"use client";

import dynamic from "next/dynamic";

// Konva necesita el navegador: se carga solo en cliente.
const PizarraEditor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[15/14] w-full items-center justify-center rounded-xl border border-linea bg-white text-sm text-tinta/50">
      Cargando pizarra…
    </div>
  ),
});

export default PizarraEditor;
