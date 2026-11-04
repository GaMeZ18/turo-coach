"use client";

import { useState } from "react";
import { ClipboardCheck, Shield, UserPlus, X } from "lucide-react";
import { NuevaPersona } from "../club/FormPersona";

/** Botones «+ Staff» y «+ Coordinador» del panel: abren el alta de la persona con los permisos ya elegidos */
export default function AltaRapida({ equipos }: { equipos: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState<"entrenador" | "coordinador" | "gestor_mesas" | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primario" onClick={() => setAbierto("entrenador")}><UserPlus size={16} /> Staff</button>
        <button type="button" className="btn-secundario" onClick={() => setAbierto("coordinador")}><Shield size={16} /> Coordinador</button>
        <button type="button" className="btn-secundario" onClick={() => setAbierto("gestor_mesas")}><ClipboardCheck size={16} /> Gestor de mesas</button>
      </div>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onClick={() => setAbierto(null)}>
          <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setAbierto(null)} className="absolute right-3 top-3 z-10 text-tinta/50 hover:text-tinta" aria-label="Cerrar"><X size={18} /></button>
            <NuevaPersona key={abierto} equipos={equipos} rol={abierto === "coordinador" ? "coordinador" : "entrenador"} mesas={abierto === "gestor_mesas"}
              titulo={abierto === "coordinador" ? "Nuevo coordinador (ve todo el club)" : abierto === "gestor_mesas" ? "Nuevo gestor de mesas" : "Nueva persona del staff"} />
            {abierto === "gestor_mesas" && (
              <p className="mt-2 rounded-lg bg-white/90 p-2 text-xs text-tinta/70">El gestor de mesas tiene además el apartado Mesas: asigna las mesas de los partidos de casa, confirma y lleva la cuenta de lo que se paga a cada persona. Si también entrena, márcale sus equipos y verá todo lo de un entrenador.</p>
            )}
            {abierto === "coordinador" && (
              <p className="mt-2 rounded-lg bg-white/90 p-2 text-xs text-tinta/70">Los coordinadores entran a este panel: ven todos los equipos, la asistencia general y pueden dar de alta a otras personas. No hace falta marcarle equipos.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
