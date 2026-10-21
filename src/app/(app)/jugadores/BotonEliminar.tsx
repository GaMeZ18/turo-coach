"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { eliminarJugador } from "./actions";

export default function BotonEliminar({ equipoId, jugadorId, nombre }: { equipoId: string; jugadorId: string; nombre: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      title={`Eliminar a ${nombre}`}
      aria-label={`Eliminar a ${nombre}`}
      onClick={() => {
        if (!confirm(`¿Eliminar a ${nombre} del equipo?`)) return;
        start(async () => {
          const r = await eliminarJugador(equipoId, jugadorId);
          if (r.error) alert(`No se ha podido eliminar: ${r.error}`);
        });
      }}
      className="rounded p-1.5 text-tinta/35 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
    >
      <Trash2 size={16} className={pendiente ? "animate-pulse" : ""} />
    </button>
  );
}
