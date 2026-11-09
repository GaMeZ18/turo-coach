"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { activarPush, ayudaPush, estadoPush, type EstadoPush } from "@/lib/push-cliente";

const CLAVE = "avisos-ahora-no";
const DIAS = 3;
const leer = () => { try { return Number(localStorage.getItem(CLAVE) ?? 0); } catch { return 0; } };
const posponer = () => { try { localStorage.setItem(CLAVE, String(Date.now() + DIAS * 86400000)); } catch {} };

/**
 * Pide activar los avisos al entrar, sin tener que ir a la página de Avisos.
 * Si el permiso ya está dado, se suscribe solo; si dice «Ahora no», vuelve a preguntar en unos días.
 * En iPhone sin la app instalada, explica cómo instalarla (es la única forma de recibir avisos allí).
 */
export default function PedirAvisos({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const e = await estadoPush();
      if (e === "activo" || e === "no-soportado" || e === "denegado") return;
      if (e === "inactivo" && Notification.permission === "granted") { await activarPush(clavePublica, false); return; } // permiso dado: se activa solo
      if (leer() < Date.now()) setEstado(e);
    })().catch(() => {});
  }, [clavePublica]);

  if (!estado) return null;
  const cerrar = () => { posponer(); setEstado(null); };
  const activar = async () => {
    setOcupado(true); setError(null);
    const r = await activarPush(clavePublica);
    setOcupado(false);
    if (r.ok) { setEstado(null); return; }
    if (r.estado === "denegado") { setEstado(null); return; }
    setError(r.error ?? null);
  };
  const ayuda = ayudaPush(estado);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3">
      <div className="flex items-start gap-3 rounded-xl border border-oro bg-oro/15 p-3 text-sm shadow-sm">
        <Bell className="mt-0.5 shrink-0 text-azul" size={20} />
        <div className="min-w-0 flex-1">
          {estado === "inactivo" ? (
            <>
              <p className="font-semibold">Activa los avisos en este móvil</p>
              <p className="text-tinta/70">Te avisaremos si te falta pasar lista o montar el entreno, y de los cambios de partidos.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={activar} disabled={ocupado} className="btn-primario !py-1.5">
                  {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Activar avisos
                </button>
                <button type="button" onClick={cerrar} className="btn-secundario !py-1.5">Ahora no</button>
              </div>
              {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
            </>
          ) : ayuda && (
            <>
              <p className="font-semibold">{ayuda.titulo}</p>
              <p className="text-tinta/70">{ayuda.texto}</p>
            </>
          )}
        </div>
        <button type="button" onClick={cerrar} className="text-tinta/50 hover:text-tinta" aria-label="Cerrar"><X size={18} /></button>
      </div>
    </div>
  );
}
