"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { quitarSuscripcion } from "./actions";
import { activarPush, ayudaPush, estadoPush, type EstadoPush } from "@/lib/push-cliente";

/** Activa los avisos push en este dispositivo (móvil u ordenador, también Safari) */
export default function ActivarAvisos({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<EstadoPush | "cargando">("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { estadoPush().then(setEstado).catch(() => setEstado("no-soportado")); }, []);

  const activar = async () => {
    setOcupado(true); setMsg(null);
    const r = await activarPush(clavePublica);
    if (r.estado) setEstado(r.estado);
    setMsg(r.ok ? "Listo: recibirás los avisos en este dispositivo." : r.error ?? null);
    setOcupado(false);
  };
  const desactivar = async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await quitarSuscripcion(sub.endpoint); await sub.unsubscribe(); }
      setEstado("inactivo");
    } finally { setOcupado(false); }
  };
  const ayuda = estado !== "cargando" ? ayudaPush(estado) : null;

  return (
    <div className="tarjeta p-4 text-sm">
      <p className="font-semibold">Avisos en este dispositivo</p>
      {ayuda && <div className="mt-1 text-tinta/70"><p className="font-semibold text-tinta">{ayuda.titulo}</p><p>{ayuda.texto}</p></div>}
      {(estado === "inactivo" || estado === "activo" || estado === "denegado") && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {estado === "activo" ? (
            <button type="button" onClick={desactivar} disabled={ocupado} className="btn-secundario"><BellOff size={16} /> Desactivar en este dispositivo</button>
          ) : (
            <button type="button" onClick={activar} disabled={ocupado} className="btn-primario">{ocupado ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} {estado === "denegado" ? "Probar otra vez" : "Activar avisos"}</button>
          )}
          <span className="text-xs text-tinta/60">Lista sin pasar, entreno sin montar, cambios de horario o de pista, aplazamientos y resultados de tus equipos.</span>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-tinta/70">{msg}</p>}
    </div>
  );
}
