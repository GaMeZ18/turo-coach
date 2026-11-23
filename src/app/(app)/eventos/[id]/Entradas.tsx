"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Undo2 } from "lucide-react";
import type { Inscripcion, Pase } from "@/lib/eventos";
import { hora } from "@/lib/fechas";
import { deshacerEntrada } from "../actions";

export default function Entradas({ inscripciones, pases }: { inscripciones: Inscripcion[]; pases: Pase[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [q, setQ] = useState("");
  const equipo = new Map(inscripciones.map((i) => [i.id, i.equipo]));
  const validos = pases.filter((p) => !p.anulado);
  const lista = validos.filter((p) => !q || `${p.nombre} ${equipo.get(p.inscripcion_id)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (equipo.get(a.inscripcion_id) ?? "").localeCompare(equipo.get(b.inscripcion_id) ?? "") || a.nombre.localeCompare(b.nombre));
  const csv = () => {
    const filas = [["Equipo", "Nombre", "Rol", "Dorsal", "Entrada"], ...validos.map((p) => [equipo.get(p.inscripcion_id) ?? "", p.nombre, p.rol, p.dorsal ?? "", p.usado_at ? new Date(p.usado_at).toLocaleString("es-ES") : ""])];
    const txt = "﻿" + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv" })); a.download = "asistentes.csv"; a.click();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona o equipo" className="campo flex-1" />
        <button type="button" onClick={csv} className="btn-secundario"><Download size={15} /> Excel (CSV)</button>
      </div>
      <p className="text-sm text-tinta/60">{validos.filter((p) => p.usado_at).length} de {validos.length} han entrado. Si un QR no se lee, búscalo aquí.</p>
      <ul className="tarjeta divide-y divide-linea">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.usado_at ? "bg-green-500" : "bg-tinta/20"}`} />
            <span className="min-w-0 flex-1 truncate">{p.dorsal ? `#${p.dorsal} ` : ""}{p.nombre} <span className="text-xs text-tinta/50">· {equipo.get(p.inscripcion_id)}{p.rol === "entrenador" ? " · entr." : ""}</span></span>
            {p.usado_at ? (
              <>
                <span className="text-xs text-green-700">{hora(p.usado_at)}</span>
                <button type="button" disabled={pendiente} onClick={() => confirm(`¿Deshacer la entrada de ${p.nombre}?`) && empezar(async () => { await deshacerEntrada(p.id); router.refresh(); })} className="p-1 text-tinta/40 hover:text-tinta" title="Deshacer"><Undo2 size={14} /></button>
              </>
            ) : <span className="text-xs text-tinta/40">—</span>}
          </li>
        ))}
        {!lista.length && <li className="px-3 py-2 text-sm text-tinta/50">Aún no hay pases (se crean al aprobar cada inscripción).</li>}
      </ul>
    </div>
  );
}
