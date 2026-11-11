"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2 } from "lucide-react";
import { marcarNoDisponible } from "../../acciones-asistencia";
import { MOTIVOS_NO_DISP } from "@/lib/asistencia";

const fecha = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

/** Marcar al jugador como «no disponible hasta…» (sale en gris en la asistencia y la convocatoria) */
export default function NoDisponible({ jugadorId, hasta, motivo, hoy }: { jugadorId: string; hasta: string | null; motivo: string | null; hoy: string }) {
  const activo = !!hasta && hasta >= hoy;
  const [editando, setEditando] = useState(false);
  const [h, setH] = useState(hasta ?? "");
  const [m, setM] = useState(motivo ?? "lesion");
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const guardar = (valor: string | null) => start(async () => {
    setError(null);
    const r = await marcarNoDisponible(jugadorId, valor, valor ? m : null);
    if (r.error) setError(r.error); else setEditando(false);
  });

  return (
    <div className={`mt-3 rounded-lg p-3 text-sm ${activo ? "bg-red-50 text-red-900" : "bg-suave"}`}>
      {activo && !editando ? (
        <div className="flex flex-wrap items-center gap-2">
          <Ban size={16} />
          <span className="flex-1"><strong>No disponible</strong> hasta el {fecha(hasta!)} ({MOTIVOS_NO_DISP[motivo as keyof typeof MOTIVOS_NO_DISP] ?? "otros"})</span>
          <button type="button" onClick={() => setEditando(true)} className="text-xs underline">Cambiar</button>
          <button type="button" onClick={() => guardar(null)} disabled={pend} className="btn-secundario !py-1 text-xs">Ya está disponible</button>
        </div>
      ) : editando ? (
        <div className="flex flex-wrap items-end gap-2">
          <div><label className="etiqueta">No disponible hasta</label><input type="date" min={hoy} value={h} onChange={(e) => setH(e.target.value)} className="campo" /></div>
          <div>
            <label className="etiqueta">Motivo</label>
            <select value={m} onChange={(e) => setM(e.target.value)} className="campo">
              {Object.entries(MOTIVOS_NO_DISP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => guardar(h || null)} disabled={pend || !h} className="btn-primario">{pend && <Loader2 size={15} className="animate-spin" />} Guardar</button>
          <button type="button" onClick={() => setEditando(false)} className="btn-secundario">Cancelar</button>
          <p className="w-full text-xs text-tinta/60">Sin detalles médicos: solo el motivo general. Saldrá en gris en la asistencia y la convocatoria hasta esa fecha.</p>
        </div>
      ) : (
        <button type="button" onClick={() => setEditando(true)} className="inline-flex items-center gap-1.5 text-tinta/70 hover:text-tinta"><Ban size={15} /> Marcar como no disponible (lesión, viaje…)</button>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
