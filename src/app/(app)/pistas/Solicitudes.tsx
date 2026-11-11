"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cancelarSolicitudPista, resolverSolicitudPista } from "./actions";

export type SolicitudVista = {
  id: string; estado: string; equipo: string; antes: string; despues: string; todas: boolean; motivo: string | null;
  quien: string | null; cuando: string; respuesta: string | null; aviso: string | null; mia: boolean;
};

function Fila({ s, coordinador }: { s: SolicitudVista; coordinador: boolean }) {
  const [resp, setResp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const resolver = (ok: boolean) => start(async () => { const r = await resolverSolicitudPista(s.id, ok, resp); if (r.error) setError(r.error); });
  const pendiente = s.estado === "pendiente";
  return (
    <li className={`p-3 text-sm ${pendiente ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{s.equipo}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pendiente ? "bg-amber-100 text-amber-900" : s.estado === "aprobada" ? "bg-green-100 text-green-800" : "bg-tinta/10 text-tinta/60"}`}>
          {pendiente ? "Pendiente" : s.estado === "aprobada" ? "Aprobada" : s.estado === "rechazada" ? "Rechazada" : "Cancelada"}
        </span>
      </div>
      <p className="mt-1"><span className="text-tinta/60">{s.antes}</span> → <strong>{s.despues}</strong>{s.todas && <span className="ml-1 rounded bg-azul/10 px-1.5 text-[11px] font-semibold text-azul">todas las semanas</span>}</p>
      {s.motivo && <p className="text-xs text-tinta/70">Motivo: {s.motivo}</p>}
      <p className="text-[11px] text-tinta/50">Pedido por {s.quien ?? "—"} · {s.cuando}</p>
      {s.aviso && pendiente && <p className="mt-1 text-xs font-semibold text-red-700">⚠ {s.aviso}</p>}
      {s.respuesta && <p className="mt-1 text-xs">Respuesta: {s.respuesta}</p>}
      {pendiente && coordinador && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={resp} onChange={(e) => setResp(e.target.value)} maxLength={300} placeholder="Comentario (opcional)" className="campo min-w-40 flex-1 !py-1.5" />
          <button type="button" disabled={pend} onClick={() => resolver(true)} className="btn-primario !bg-green-600 !py-1.5">{pend ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar</button>
          <button type="button" disabled={pend} onClick={() => resolver(false)} className="btn-peligro !py-1.5"><X size={15} /> Rechazar</button>
        </div>
      )}
      {pendiente && !coordinador && s.mia && <button type="button" disabled={pend} onClick={() => start(async () => { await cancelarSolicitudPista(s.id); })} className="mt-1 text-xs text-tinta/60 underline">Cancelar mi solicitud</button>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </li>
  );
}

/** Cambios de pista pedidos por los entrenadores (coordinación los aprueba o rechaza) */
export default function Solicitudes({ lista, coordinador }: { lista: SolicitudVista[]; coordinador: boolean }) {
  if (!lista.length) return null;
  const pendientes = lista.filter((s) => s.estado === "pendiente").length;
  return (
    <section id="solicitudes" className="mt-4 scroll-mt-28">
      <h2 className="font-semibold">Cambios de pista pedidos {pendientes > 0 && <span className="ml-1 rounded-full bg-rojo px-2 text-xs text-white">{pendientes}</span>}</h2>
      <ul className="tarjeta mt-2 divide-y divide-linea">{lista.map((s) => <Fila key={s.id} s={s} coordinador={coordinador} />)}</ul>
    </section>
  );
}
