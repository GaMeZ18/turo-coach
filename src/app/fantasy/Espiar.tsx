"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { espiar } from "./actions";
import { COSTE_ESPIA } from "@/lib/fantasy/motor";

/** Botón para ver la alineación de otro equipo antes del cierre (cuesta ⭐ de esta jornada) */
export default function Espiar({ id, alias, libres }: { id: string; alias: string; libres: number | null }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState("");
  const pulsar = () => {
    setError("");
    if (!confirm(`¿Espiar a ${alias}? Te cuesta ${COSTE_ESPIA} ⭐ de tu presupuesto de esta jornada${libres !== null ? ` (te quedan ${libres} ⭐ libres)` : ""}. Verás su equipo hasta el cierre, aunque lo cambie.`)) return;
    empezar(async () => {
      const r = await espiar(id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };
  return (
    <span className="flex flex-col items-end">
      <button type="button" onClick={pulsar} disabled={pendiente} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50">
        {pendiente ? "…" : `👀 Espiar · ${COSTE_ESPIA}⭐`}
      </button>
      {error && <span className="mt-1 max-w-48 text-right text-[10px] text-red-300">{error}</span>}
    </span>
  );
}
