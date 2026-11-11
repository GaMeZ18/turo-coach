"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

/** Barra fija arriba con «volver» e «imprimir o guardar en PDF» (debajo de la muesca en el iPhone) */
export default function BotonImprimir({ volver, texto = "← Volver al entreno" }: { volver: string; texto?: string }) {
  return (
    <div className="sticky z-20 -mx-6 mb-4 flex items-center justify-between gap-2 border-b border-linea bg-white/95 px-6 py-2 backdrop-blur print:hidden max-sm:-mx-3 max-sm:px-3" style={{ top: "env(safe-area-inset-top)" }}>
      <Link href={volver} className="min-w-0 truncate text-sm text-tinta/60 hover:underline">{texto}</Link>
      <button type="button" onClick={() => window.print()} className="btn-primario shrink-0"><Printer size={16} /> <span className="max-sm:hidden">Imprimir o guardar en</span> PDF</button>
    </div>
  );
}
