"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Link2, Mail, X } from "lucide-react";
import { ESTADOS, euros, urlEstado, type Estado, type Inscripcion, type Pase } from "@/lib/eventos";
import { fechaCorta, hora } from "@/lib/fechas";
import { aprobar, cancelar, rechazar, reenviarPases, verJustificante } from "../actions";

const FILTROS: [Estado | "todas", string][] = [["todas", "Todas"], ["pendiente_validacion", "Por revisar"], ["pendiente_pago", "Sin pagar"], ["aprobada", "Aprobadas"], ["rechazada", "Rechazadas"]];

export default function Inscripciones({ inscripciones, pases }: { inscripciones: Inscripcion[]; pases: Pase[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [filtro, setFiltro] = useState<Estado | "todas">(inscripciones.some((i) => i.estado === "pendiente_validacion") ? "pendiente_validacion" : "todas");
  const [msg, setMsg] = useState<{ id: string; t: string; ok?: boolean } | null>(null);
  const hacer = (id: string, f: () => Promise<{ error?: string; aviso?: string }>, ok: string) => empezar(async () => {
    setMsg(null);
    const r = await f();
    setMsg({ id, t: r.error ?? r.aviso ?? ok, ok: !r.error && !r.aviso });
    router.refresh();
  });
  const lista = inscripciones.filter((i) => filtro === "todas" || i.estado === filtro);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(([k, t]) => {
          const n = k === "todas" ? inscripciones.length : inscripciones.filter((i) => i.estado === k).length;
          return <button key={k} type="button" onClick={() => setFiltro(k)} className={`rounded-full px-3 py-1 text-sm ${filtro === k ? "bg-azul text-white" : "bg-suave text-tinta/70"}`}>{t} ({n})</button>;
        })}
      </div>
      {!lista.length && <p className="text-sm text-tinta/50">No hay inscripciones aquí.</p>}
      {lista.map((i) => {
        const e = ESTADOS[i.estado];
        const misPases = pases.filter((p) => p.inscripcion_id === i.id && !p.anulado);
        return (
          <article key={i.id} className="tarjeta p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{i.equipo}{i.club ? <span className="font-normal text-tinta/60"> · {i.club}</span> : null}{i.categoria ? <span className="font-normal text-tinta/60"> · {i.categoria}</span> : null}</h3>
                <p className="text-xs text-tinta/60">{i.responsable} · <a href={`mailto:${i.email}`} className="underline">{i.email}</a>{i.telefono ? <> · <a href={`tel:${i.telefono}`} className="underline">{i.telefono}</a></> : null}</p>
                <p className="text-xs text-tinta/50">Ref. {i.referencia} · {fechaCorta(i.created_at)} {hora(i.created_at)}</p>
              </div>
              <div className="text-right"><p className="text-lg font-bold">{euros(i.importe)}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.c}`}>{e.t}</span></div>
            </div>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-tinta/70">{i.personas.filter((p) => p.rol === "jugador").length} jugadores · {i.personas.filter((p) => p.rol === "entrenador").length} entrenadores{misPases.length ? ` · ${misPases.filter((p) => p.usado_at).length}/${misPases.length} han entrado` : ""}</summary>
              <ul className="mt-1 columns-1 text-tinta/80 sm:columns-2">
                {i.personas.map((p, k) => <li key={k}>{p.dorsal ? `#${p.dorsal} ` : ""}{p.nombre}{p.rol === "entrenador" ? " (entr.)" : ""}</li>)}
              </ul>
            </details>
            {i.motivo && i.estado === "rechazada" && <p className="mt-1 text-xs text-red-700">Motivo: {i.motivo}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {i.comprobante && <button type="button" onClick={() => empezar(async () => { const r = await verJustificante(i.id); if (r.url) window.open(r.url, "_blank"); else setMsg({ id: i.id, t: r.error ?? "Error" }); })} className="btn-secundario"><FileText size={15} /> Justificante</button>}
              {i.estado !== "aprobada" && i.estado !== "cancelada" && (
                <button type="button" disabled={pendiente} onClick={() => confirm(`¿Aprobar a ${i.equipo}${i.comprobante ? "" : " sin justificante (pago en mano, etc.)"}? Se crean ${i.personas.length} pases y se envían por email.`) && hacer(i.id, () => aprobar(i.id), "✅ Aprobada y pases enviados")} className="btn-primario"><Check size={15} /> Aprobar</button>
              )}
              {(i.estado === "pendiente_validacion" || i.estado === "pendiente_pago") && (
                <button type="button" disabled={pendiente} onClick={() => { const m = prompt("Motivo del rechazo (se le envía por email):", "No encontramos la transferencia con ese concepto"); if (m !== null) hacer(i.id, () => rechazar(i.id, m), "Rechazada y avisada"); }} className="btn-secundario"><X size={15} /> Rechazar</button>
              )}
              {i.estado === "aprobada" && <button type="button" disabled={pendiente} onClick={() => hacer(i.id, () => reenviarPases(i.id), "📧 Pases reenviados")} className="btn-secundario"><Mail size={15} /> Reenviar pases</button>}
              <button type="button" onClick={() => navigator.clipboard?.writeText(urlEstado(i.codigo)).then(() => setMsg({ id: i.id, t: "Enlace de su inscripción copiado (para WhatsApp)", ok: true }))} className="btn-secundario"><Link2 size={15} /> Enlace</button>
              {i.estado !== "cancelada" && <button type="button" disabled={pendiente} onClick={() => confirm(`¿Cancelar la inscripción de ${i.equipo}? Sus pases dejan de valer. (La devolución del dinero se hace aparte.)`) && hacer(i.id, () => cancelar(i.id), "Cancelada")} className="ml-auto text-xs text-tinta/40 hover:text-red-600">Cancelar</button>}
            </div>
            {msg?.id === i.id && <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-amber-700"}`}>{msg.t}</p>}
          </article>
        );
      })}
    </div>
  );
}
