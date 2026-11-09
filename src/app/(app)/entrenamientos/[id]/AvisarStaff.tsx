"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2, X } from "lucide-react";
import { avisarStaff } from "../actions";

/** Botón para avisar al resto del cuerpo técnico de que el entreno está listo */
export default function AvisarStaff({ entrenoId, completo }: { entrenoId: string; completo: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [res, setRes] = useState<{ ok?: number; error?: string } | null>(null);
  const [pendiente, start] = useTransition();
  const enviar = () => start(async () => { setRes(await avisarStaff(entrenoId, mensaje)); });

  if (res?.ok) return <span className="btn-secundario !cursor-default text-green-700"><Check size={16} /> Avisado{res.ok > 1 ? ` (${res.ok})` : ""}</span>;
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((a) => !a)} className={completo ? "btn-primario" : "btn-secundario"} title="Manda un aviso al resto del cuerpo técnico del equipo">
        <BellRing size={16} /> Avisar a mi staff
      </button>
      {abierto && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-linea bg-white p-3 text-sm shadow-lg">
          <div className="flex items-center justify-between"><p className="font-semibold">Avisar al cuerpo técnico</p><button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={16} /></button></div>
          {!completo && <p className="mt-1 text-xs text-amber-700">Aún no has completado el tiempo previsto del entreno.</p>}
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} maxLength={300} className="campo mt-2 text-sm" placeholder="Mensaje (opcional): p. ej. «He metido trabajo de rebote, ¿lo veis bien?»" />
          <button type="button" onClick={enviar} disabled={pendiente} className="btn-primario mt-2 w-full justify-center">{pendiente ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />} Enviar aviso</button>
          {res?.error && <p className="mt-1 text-xs text-red-700">{res.error}</p>}
        </div>
      )}
    </div>
  );
}
