"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearJugador, type ResultadoAlta } from "./actions";

export default function FormNuevoJugador({ equipoId }: { equipoId: string }) {
  const [estado, accion, pendiente] = useActionState<ResultadoAlta, FormData>(crearJugador, { ok: false, n: 0 });
  const form = useRef<HTMLFormElement>(null);
  const nombre = useRef<HTMLInputElement>(null);

  // Tras cada alta correcta: vaciar el formulario y volver al nombre para añadir otro
  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      nombre.current?.focus();
    }
  }, [estado]);

  return (
    <form ref={form} action={accion} className="tarjeta space-y-3 p-4">
      <h2 className="font-medium">Nuevo jugador</h2>
      <input type="hidden" name="equipo_id" value={equipoId} />
      <div className="grid grid-cols-2 gap-2">
        <input ref={nombre} name="nombre" required placeholder="Nombre" className="campo" />
        <input name="apellidos" placeholder="Apellidos" className="campo" />
        <input name="dorsal" type="number" inputMode="numeric" min={0} max={99} placeholder="Dorsal" className="campo" />
        <input name="posicion" placeholder="Posición (base, alero…)" className="campo" />
        <div className="col-span-2">
          <label className="etiqueta">Fecha de nacimiento</label>
          <input name="fecha_nacimiento" type="date" className="campo" />
        </div>
      </div>
      {estado.error && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {estado.error}
          {estado.duplicado && (
            <label className="mt-1 flex items-center gap-1.5 text-tinta/70">
              <input type="checkbox" name="forzar" value="1" /> Es otra persona con el mismo nombre: añadir igualmente
            </label>
          )}
        </div>
      )}
      {estado.ok && <p className="text-sm text-green-700">Añadido ✓ Puedes añadir el siguiente.</p>}
      <button disabled={pendiente} className="btn-primario">{pendiente ? "Guardando…" : "Añadir"}</button>
    </form>
  );
}
