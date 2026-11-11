"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { cancelarSolicitudPista, pedirCambioPista } from "../../pistas/actions";

export type UltimaSolicitud = { id: string; estado: string; texto: string; respuesta: string | null; mia: boolean } | null;

/** Pedir a coordinación cambiar la hora o la pista de un entreno, o intercambiarlo con otro equipo */
export default function CambioPista({ entrenoId, dia, hora, lugar, opciones, ultima }: {
  entrenoId: string; dia: string; hora: string; lugar: string | null; opciones: { id: string; texto: string }[]; ultima: UltimaSolicitud;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"mover" | "intercambio">("mover");
  const [f, setF] = useState({ dia, hora, lugar: lugar ?? "", intercambioId: "", motivo: "", todas: false });
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [pend, start] = useTransition();
  const enviar = () => start(async () => {
    setError(null);
    const r = await pedirCambioPista({ entrenoId, modo, ...f });
    if (r.error) setError(r.error); else { setHecho(true); setAbierto(false); }
  });

  return (
    <div className="mt-2">
      {ultima && ultima.estado === "pendiente" && !hecho && (
        <p className="mb-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">
          ⏳ Cambio pedido a coordinación: {ultima.texto}
          {ultima.mia && <button type="button" onClick={() => start(async () => { await cancelarSolicitudPista(ultima.id); })} className="ml-2 text-xs underline">Cancelar</button>}
        </p>
      )}
      {ultima && ultima.estado !== "pendiente" && ultima.estado !== "cancelada" && !hecho && (
        <p className={`mb-2 rounded-lg p-2.5 text-xs ${ultima.estado === "aprobada" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {ultima.estado === "aprobada" ? "✅ Coordinación aprobó el último cambio pedido" : "❌ Coordinación rechazó el último cambio pedido"}{ultima.respuesta ? `: ${ultima.respuesta}` : "."}
        </p>
      )}
      {hecho && <p className="mb-2 rounded-lg bg-green-50 p-2.5 text-sm text-green-800">Enviado. Coordinación lo verá en una notificación y te avisará cuando lo apruebe.</p>}
      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1 text-sm text-azul hover:underline"><ArrowLeftRight size={14} /> Pedir cambio de hora o pista</button>
      ) : (
        <div className="tarjeta max-w-2xl space-y-3 p-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-suave p-1 text-sm font-semibold">
            <button type="button" onClick={() => setModo("mover")} className={`rounded-md py-1.5 ${modo === "mover" ? "bg-white shadow" : "text-tinta/60"}`}>Mover a otra hora o pista</button>
            <button type="button" onClick={() => setModo("intercambio")} className={`rounded-md py-1.5 ${modo === "intercambio" ? "bg-white shadow" : "text-tinta/60"}`}>Intercambiar con otro equipo</button>
          </div>
          {modo === "mover" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div><label className="etiqueta">Día</label><input type="date" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} className="campo" /></div>
              <div><label className="etiqueta">Hora</label><input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className="campo" /></div>
              <div className="col-span-2 sm:col-span-1"><label className="etiqueta">Pista</label><input list="lista-pistas" value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} className="campo" /></div>
            </div>
          ) : (
            <div>
              <label className="etiqueta">Entreno de otro equipo (esa semana)</label>
              <select value={f.intercambioId} onChange={(e) => setF({ ...f, intercambioId: e.target.value })} className="campo">
                <option value="">Elige…</option>
                {opciones.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
              </select>
              {opciones.length === 0 && <p className="mt-1 text-xs text-tinta/50">No hay otros entrenos esa semana.</p>}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.todas} onChange={(e) => setF({ ...f, todas: e.target.checked })} /> Para todas las semanas siguientes (mismo día, hora y pista)</label>
          <input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} maxLength={300} placeholder="Motivo (opcional): partido, exámenes, hablado con el otro entrenador…" className="campo" />
          <div className="flex gap-2">
            <button type="button" onClick={enviar} disabled={pend} className="btn-primario">{pend && <Loader2 size={15} className="animate-spin" />} Pedir a coordinación</button>
            <button type="button" onClick={() => setAbierto(false)} className="btn-secundario">Cancelar</button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
