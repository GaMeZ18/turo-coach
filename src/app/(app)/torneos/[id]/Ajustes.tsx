"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Globe, Trash2 } from "lucide-react";
import type { Torneo } from "@/lib/torneos";
import CamposTorneo from "../CamposTorneo";
import { borrarTorneo, editarTorneo, hacerPublico } from "../actions";

export default function Ajustes({ torneo }: { torneo: Torneo }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState("");
  const enlace = `https://coach.cbturo.com/t/${torneo.token}`;
  return (
    <div className="space-y-4">
      <section className="tarjeta p-4">
        <h2 className="flex items-center gap-2 font-semibold"><Globe size={18} /> Página pública</h2>
        <p className="mt-1 text-sm text-tinta/60">Una página sin contraseña con la clasificación, los partidos y el cuadro, que se actualiza sola. Para pasarla a los equipos o ponerla en un QR.</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={torneo.publico} disabled={pendiente} onChange={(e) => empezar(async () => { await hacerPublico(torneo.id, e.target.checked); router.refresh(); })} />
          Publicada
        </label>
        {torneo.publico && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a href={enlace} target="_blank" rel="noopener" className="break-all text-sm text-azul underline">{enlace}</a>
            <button type="button" onClick={() => navigator.clipboard?.writeText(enlace).then(() => setMsg("Enlace copiado"))} className="btn-secundario !py-1"><Copy size={14} /> Copiar</button>
          </div>
        )}
      </section>

      <form className="tarjeta p-4" action={(f) => empezar(async () => { const r = await editarTorneo(torneo.id, f); setMsg(r.error ?? "Guardado"); router.refresh(); })}>
        <h2 className="mb-2 font-semibold">Datos del torneo</h2>
        <CamposTorneo t={torneo} />
        <p className="mt-2 text-xs text-tinta/60">Si cambias el formato o los grupos con partidos ya generados, vuelve a generarlos en Partidos.</p>
        <button disabled={pendiente} className="btn-primario mt-3">Guardar cambios</button>
      </form>
      {msg && <p className="text-sm text-tinta/60">{msg}</p>}

      <section className="tarjeta p-4">
        <button type="button" disabled={pendiente} onClick={() => confirm(`¿Borrar «${torneo.nombre}» con todos sus equipos y partidos? No se puede deshacer.`) && empezar(() => borrarTorneo(torneo.id))} className="btn-peligro"><Trash2 size={15} /> Borrar torneo</button>
      </section>
    </div>
  );
}
