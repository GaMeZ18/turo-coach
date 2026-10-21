"use client";

import PizarraEditor from "@/components/pizarra";

/** La misma pizarra, para ver y animar. Los cambios aquí no se guardan. */
export default function VisorPizarra({ pizarra }: { pizarra: unknown }) {
  return (
    <div>
      <PizarraEditor valor={pizarra} />
      <p className="mt-1 text-xs text-tinta/40">Puedes probar cambios aquí, pero solo se guardan desde «Editar».</p>
    </div>
  );
}
