"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

export default function BotonImprimir({ volver, texto = "← Volver al entreno" }: { volver: string; texto?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
      <Link href={volver} className="text-sm text-tinta/60 hover:underline">{texto}</Link>
      <button type="button" onClick={() => window.print()} className="btn-primario"><Printer size={16} /> Imprimir o guardar en PDF</button>
    </div>
  );
}
