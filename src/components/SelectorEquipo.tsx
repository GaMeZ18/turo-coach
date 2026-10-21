"use client";

import { useTransition } from "react";
import { elegirEquipo } from "@/app/(app)/acciones-globales";

export default function SelectorEquipo({
  equipos,
  activoId,
}: {
  equipos: { id: string; nombre: string }[];
  activoId: string | null;
}) {
  const [pendiente, start] = useTransition();
  return (
    <select
      aria-label="Equipo activo"
      className="max-w-44 rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white outline-none [&>option]:text-tinta"
      value={activoId ?? ""}
      disabled={pendiente}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("equipo_id", e.target.value);
        start(() => elegirEquipo(fd));
      }}
    >
      <option value="">— Elige equipo —</option>
      {equipos.map((e) => (
        <option key={e.id} value={e.id}>
          {e.nombre}
        </option>
      ))}
    </select>
  );
}
