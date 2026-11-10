"use client";

import PizarraEditor from "@/components/pizarra";

/** Pizarra solo para ver (play, pausa, fotogramas), para las páginas públicas */
export default function VisorPublico({ pizarra, titulo }: { pizarra: unknown; titulo: string }) {
  return <PizarraEditor valor={pizarra} soloVer titulo={titulo} />;
}
