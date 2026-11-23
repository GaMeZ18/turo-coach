"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ListOrdered, Trash2 } from "lucide-react";
import { jugado, nombreRonda, type EquipoT, type PartidoT, type Torneo } from "@/lib/torneos";
import { diaInput, horaInput } from "@/lib/fechas";
import { borrarFase, generarEliminatoria, generarFaseGrupos, guardarPartido, ponerHorario } from "../actions";

const aInput = (iso: string | null) => (iso ? `${diaInput(iso)}T${horaInput(iso)}` : "");

function Fila({ torneo, p, etiqueta, nombre, hacer }: { torneo: Torneo; p: PartidoT; etiqueta: string; nombre: (id: string | null) => string; hacer: (f: () => Promise<{ error?: string }>) => void }) {
  const [l, setL] = useState(p.puntos_local?.toString() ?? "");
  const [v, setV] = useState(p.puntos_visitante?.toString() ?? "");
  const [fecha, setFecha] = useState(aInput(p.fecha));
  const [pista, setPista] = useState(p.pista ?? "");
  const cambiado = l !== (p.puntos_local?.toString() ?? "") || v !== (p.puntos_visitante?.toString() ?? "") || fecha !== aInput(p.fecha) || pista !== (p.pista ?? "");
  const listo = !!p.local_id && !!p.visitante_id;
  return (
    <li className={`flex flex-wrap items-center gap-2 py-2 ${jugado(p) ? "" : ""}`}>
      <div className="w-full text-[11px] font-semibold uppercase text-tinta/50 sm:w-28">{etiqueta}</div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-right text-sm">{nombre(p.local_id)}</span>
        <input inputMode="numeric" value={l} onChange={(e) => setL(e.target.value.replace(/\D/g, ""))} disabled={!listo} className="campo w-14 text-center" aria-label="Puntos local" />
        <span className="text-tinta/40">–</span>
        <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} disabled={!listo} className="campo w-14 text-center" aria-label="Puntos visitante" />
        <span className="min-w-0 flex-1 truncate text-sm">{nombre(p.visitante_id)}</span>
      </div>
      <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo w-48" aria-label="Día y hora" />
      <input value={pista} onChange={(e) => setPista(e.target.value)} placeholder="Pista" className="campo w-24" />
      <button type="button" disabled={!cambiado} onClick={() => hacer(() => guardarPartido(torneo.id, p.id, { local: l, visitante: v, fecha, pista }))} className="btn-primario !px-2.5 disabled:opacity-30" title="Guardar"><Check size={16} /></button>
    </li>
  );
}

export default function Calendario({ torneo, equipos, partidos }: { torneo: Torneo; equipos: EquipoT[]; partidos: PartidoT[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState("");
  const [inicio, setInicio] = useState(torneo.fecha_inicio ? `${torneo.fecha_inicio}T09:00` : "");
  const [pistas, setPistas] = useState("1");
  const [pausa, setPausa] = useState("10");
  const hacer = (f: () => Promise<{ error?: string }>) => empezar(async () => {
    setMsg("");
    const r = await f();
    if (r.error) setMsg(r.error); else router.refresh();
  });
  const nom = new Map(equipos.map((e) => [e.id, e.nombre]));
  const nombre = (id: string | null) => (id ? nom.get(id) ?? "?" : "Por decidir");
  const deGrupos = partidos.filter((p) => p.fase === "grupo");
  const elim = partidos.filter((p) => p.fase === "eliminatoria");
  const total = Math.max(0, ...elim.map((p) => p.ronda));
  const orden = (a: PartidoT, b: PartidoT) => (a.fecha ?? "9").localeCompare(b.fecha ?? "9") || a.ronda - b.ronda || (a.grupo ?? "").localeCompare(b.grupo ?? "") || a.orden - b.orden;
  const etiqueta = (p: PartidoT) => p.fase === "grupo" ? (torneo.formato === "liga" ? `Jornada ${p.ronda}` : `Grupo ${p.grupo} · J${p.ronda}`) : nombreRonda(p.ronda, total, p.tercer_puesto);

  return (
    <div className="space-y-4">
      <section className="tarjeta space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><ListOrdered size={18} /> Calendario</h2>
        <div className="flex flex-wrap gap-2">
          {torneo.formato !== "eliminatoria" && (
            <button type="button" disabled={pendiente} onClick={() => (!deGrupos.length || confirm("¿Volver a generar la fase de grupos? Se borran sus partidos (sin resultados).")) && hacer(() => generarFaseGrupos(torneo.id))} className="btn-primario">
              {deGrupos.length ? "Regenerar" : "Generar"} {torneo.formato === "liga" ? "la liga" : "la fase de grupos"}
            </button>
          )}
          {(torneo.formato !== "liga" || deGrupos.length > 0) && (
            <button type="button" disabled={pendiente} onClick={() => (!elim.length || confirm("¿Volver a generar la eliminatoria? Se borra el cuadro actual.")) && hacer(() => generarEliminatoria(torneo.id))} className={torneo.formato === "eliminatoria" ? "btn-primario" : "btn-secundario"}>
              {elim.length ? "Regenerar" : "Generar"} la eliminatoria{torneo.formato === "eliminatoria" ? "" : ` (pasan ${torneo.clasifican}${torneo.formato === "grupos" ? " por grupo" : ""})`}
            </button>
          )}
          {deGrupos.length > 0 && <button type="button" disabled={pendiente} onClick={() => confirm("¿Borrar todos los partidos de la fase de grupos, con sus resultados?") && hacer(() => borrarFase(torneo.id, "grupo"))} className="btn-secundario"><Trash2 size={15} /> Grupos</button>}
          {elim.length > 0 && <button type="button" disabled={pendiente} onClick={() => confirm("¿Borrar el cuadro de eliminatoria, con sus resultados?") && hacer(() => borrarFase(torneo.id, "eliminatoria"))} className="btn-secundario"><Trash2 size={15} /> Eliminatoria</button>}
        </div>
        {torneo.formato === "grupos" && !deGrupos.length && <p className="text-xs text-tinta/60">Antes, en Equipos, sortea los grupos o asígnalos a mano. La eliminatoria se genera cuando están todos los resultados de grupos.</p>}
        {partidos.length > 0 && (
          <details className="rounded-lg border border-linea p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><CalendarClock size={16} /> Horario automático</summary>
            <p className="mt-1 text-xs text-tinta/60">Reparte los partidos sin resultado desde la hora de inicio, con {torneo.duracion} min por partido. Cada ronda empieza en una franja nueva. Luego puedes retocar cada partido.</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div><label className="etiqueta">Primer partido</label><input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo" /></div>
              <div><label className="etiqueta">Pistas a la vez</label><input type="number" min={1} max={12} value={pistas} onChange={(e) => setPistas(e.target.value)} className="campo w-24" /></div>
              <div><label className="etiqueta">Descanso (min)</label><input type="number" min={0} max={120} value={pausa} onChange={(e) => setPausa(e.target.value)} className="campo w-24" /></div>
              <button type="button" disabled={pendiente || !inicio} onClick={() => hacer(() => ponerHorario(torneo.id, inicio, Number(pistas), Number(pausa)))} className="btn-primario">Poner horario</button>
            </div>
          </details>
        )}
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {pendiente && <p className="text-sm text-tinta/50">Guardando…</p>}
      </section>

      {[["Fase de grupos", deGrupos], ["Eliminatoria", elim]].filter(([, l]) => (l as PartidoT[]).length).map(([t, l]) => (
        <section key={t as string} className="tarjeta p-4">
          <h2 className="font-semibold">{torneo.formato === "liga" && t === "Fase de grupos" ? "Liga" : t as string}</h2>
          <ul className="mt-2 divide-y divide-linea">
            {[...(l as PartidoT[])].sort(orden).map((p) => <Fila key={`${p.id}|${p.local_id}|${p.visitante_id}|${p.fecha}|${p.puntos_local}|${p.puntos_visitante}`} torneo={torneo} p={p} etiqueta={etiqueta(p)} nombre={nombre} hacer={hacer} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
