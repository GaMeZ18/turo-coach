"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Trash2 } from "lucide-react";
import { LETRAS, type EquipoT, type Torneo } from "@/lib/torneos";
import { anadirEquipos, borrarEquipo, editarEquipo, sortearGrupos } from "../actions";

export default function Equipos({ torneo, equipos }: { torneo: Torneo; equipos: EquipoT[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [nuevos, setNuevos] = useState("");
  const [msg, setMsg] = useState("");
  const hacer = (f: () => Promise<{ error?: string }>, ok?: () => void) => empezar(async () => {
    setMsg("");
    const r = await f();
    if (r.error) setMsg(r.error); else { ok?.(); router.refresh(); }
  });
  const conGrupos = torneo.formato === "grupos";
  const letras = LETRAS.slice(0, torneo.num_grupos).split("");
  return (
    <div className="space-y-4">
      <section className="tarjeta p-4">
        <h2 className="font-semibold">Añadir equipos</h2>
        <p className="text-xs text-tinta/60">Uno por línea. Si quieres, el club detrás de una coma: «Turó U12 A, C.B. Turó».</p>
        <textarea value={nuevos} onChange={(e) => setNuevos(e.target.value)} rows={4} className="campo mt-2" placeholder={"Turó U12 A, C.B. Turó\nSant Andreu\nGràcia"} />
        <button type="button" disabled={pendiente || !nuevos.trim()} onClick={() => hacer(() => anadirEquipos(torneo.id, nuevos), () => setNuevos(""))} className="btn-primario mt-2">Añadir</button>
      </section>

      <section className="tarjeta p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Equipos ({equipos.length})</h2>
          {conGrupos && equipos.length > 1 && (
            <button type="button" disabled={pendiente} onClick={() => { if (!equipos.some((e) => e.grupo) || confirm("¿Volver a sortear los grupos? Se cambian los que ya estén puestos.")) hacer(() => sortearGrupos(torneo.id)); }} className="btn-secundario"><Shuffle size={15} /> Sortear grupos</button>
          )}
        </div>
        {conGrupos && <p className="mt-1 text-xs text-tinta/60">El sorteo reparte primero las cabezas de serie (1 = la mejor) en zigzag y el resto al azar. También puedes elegir el grupo a mano.</p>}
        {torneo.formato === "eliminatoria" && <p className="mt-1 text-xs text-tinta/60">La cabeza de serie decide el cuadro (1 y 2 solo se cruzan en la final). Sin cabeza, al azar.</p>}
        <ul className="mt-3 divide-y divide-linea">
          {equipos.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
              <input defaultValue={e.nombre} onBlur={(x) => x.target.value !== e.nombre && hacer(() => editarEquipo(torneo.id, e.id, { nombre: x.target.value }))} className="campo min-w-40 flex-1" />
              <input defaultValue={e.club ?? ""} placeholder="Club" onBlur={(x) => x.target.value !== (e.club ?? "") && hacer(() => editarEquipo(torneo.id, e.id, { club: x.target.value }))} className="campo w-36" />
              {conGrupos && (
                <select value={e.grupo ?? ""} onChange={(x) => hacer(() => editarEquipo(torneo.id, e.id, { grupo: x.target.value || null }))} className="campo w-24" title="Grupo">
                  <option value="">Grupo</option>{letras.map((l) => <option key={l} value={l}>Grupo {l}</option>)}
                </select>
              )}
              {torneo.formato !== "liga" && (
                <input type="number" min={1} defaultValue={e.cabeza ?? ""} placeholder="Cabeza" title="Cabeza de serie" onBlur={(x) => String(e.cabeza ?? "") !== x.target.value && hacer(() => editarEquipo(torneo.id, e.id, { cabeza: x.target.value ? Number(x.target.value) : null }))} className="campo w-20" />
              )}
              <button type="button" onClick={() => confirm(`¿Quitar ${e.nombre}? Sus partidos se quedan sin ese equipo.`) && hacer(() => borrarEquipo(torneo.id, e.id))} className="p-1.5 text-tinta/40 hover:text-red-600" title="Quitar"><Trash2 size={16} /></button>
            </li>
          ))}
          {!equipos.length && <li className="py-2 text-sm text-tinta/50">Aún no hay equipos.</li>}
        </ul>
        {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
      </section>
    </div>
  );
}
