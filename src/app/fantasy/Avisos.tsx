"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { activarPush, ayudaPush, estadoPush, type EstadoPush } from "@/lib/push-cliente";
import { guardarAvisoFantasy } from "./actions";

/** Avisos del Fantasy en este móvil (para quien no tiene cuenta de la app): viernes «haz tu equipo» y lunes «tus puntos» */
export default function AvisosFantasy({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("fx-avisos-oculto")) setOculto(true); } catch { /* */ }
    estadoPush().then(async (e) => {
      // Si este móvil ya tiene permiso, se asocia sin preguntar
      if (e === "activo" || (e === "inactivo" && Notification.permission === "granted")) {
        const r = await activarPush(clavePublica, false, guardarAvisoFantasy);
        setEstado(r.ok ? "activo" : e);
      } else setEstado(e);
    }).catch(() => setEstado("no-soportado"));
  }, [clavePublica]);
  if (!estado || estado === "activo" || estado === "no-soportado" || oculto) return null;
  const activar = async () => {
    setOcupado(true); setMsg(null);
    const r = await activarPush(clavePublica, true, guardarAvisoFantasy);
    setOcupado(false);
    if (r.estado) setEstado(r.estado);
    setMsg(r.ok ? "¡Listo! Te avisaremos en este móvil." : r.error ?? null);
  };
  const ayuda = ayudaPush(estado);
  return (
    <div className="fx-card relative flex items-start gap-3 p-3 text-sm">
      <Bell size={20} className="mt-0.5 shrink-0 text-[var(--fx-oro)]" />
      <div className="min-w-0 flex-1 pr-5">
        {estado === "inactivo" || estado === "denegado" ? (
          <>
            <p className="font-semibold">¿Te avisamos en el móvil?</p>
            <p className="fx-suave">El viernes para que hagas tu equipo y el lunes con tus puntos.</p>
            <button type="button" onClick={activar} disabled={ocupado} className="fx-btn mt-2 !py-1.5 !text-base">{ocupado ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Activar avisos</button>
            {estado === "denegado" && ayuda && <p className="mt-1 text-xs fx-suave">{ayuda.texto}</p>}
          </>
        ) : ayuda && (
          <>
            <p className="font-semibold">{ayuda.titulo}</p>
            <p className="fx-suave">{ayuda.texto.replace("activa los avisos", "pulsa «Activar avisos» aquí")}</p>
          </>
        )}
        {msg && <p className="mt-1 text-xs">{msg}</p>}
      </div>
      <button type="button" className="absolute right-2 top-2 fx-suave" aria-label="Ocultar" onClick={() => { setOculto(true); try { localStorage.setItem("fx-avisos-oculto", "1"); } catch { /* */ } }}><X size={16} /></button>
    </div>
  );
}
