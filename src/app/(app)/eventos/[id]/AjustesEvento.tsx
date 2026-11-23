"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { urlInscripcion, type Evento } from "@/lib/eventos";
import CamposEvento from "../CamposEvento";
import { abrirEvento, borrarEvento, editarEvento } from "../actions";

export default function AjustesEvento({ evento, torneos }: { evento: Evento; torneos: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-4">
      <section className="tarjeta p-4">
        <h2 className="font-semibold">Inscripciones</h2>
        <label className="mt-2 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={evento.abierto} disabled={pendiente} onChange={(e) => empezar(async () => { const r = await abrirEvento(evento.id, e.target.checked); setMsg(r.error ?? ""); router.refresh(); })} />
          Abiertas (la página de inscripción acepta equipos)
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <a href={urlInscripcion(evento.slug)} target="_blank" rel="noopener" className="break-all text-azul underline">{urlInscripcion(evento.slug)}</a>
          <button type="button" onClick={() => navigator.clipboard?.writeText(urlInscripcion(evento.slug)).then(() => setMsg("Enlace copiado"))} className="btn-secundario !py-1"><Copy size={14} /> Copiar</button>
        </div>
      </section>
      <form className="tarjeta p-4" action={(f) => empezar(async () => { const r = await editarEvento(evento.id, f); setMsg(r.error ?? "Guardado"); router.refresh(); })}>
        <h2 className="mb-2 font-semibold">Datos del evento</h2>
        <CamposEvento e={evento} torneos={torneos} />
        <button disabled={pendiente} className="btn-primario mt-3">Guardar cambios</button>
      </form>
      {msg && <p className="text-sm text-tinta/70">{msg}</p>}
      <section className="tarjeta p-4">
        <button type="button" disabled={pendiente} onClick={() => confirm(`¿Borrar «${evento.nombre}» con todas sus inscripciones, justificantes y pases? No se puede deshacer.`) && empezar(() => borrarEvento(evento.id))} className="btn-peligro"><Trash2 size={15} /> Borrar evento</button>
      </section>
    </div>
  );
}
