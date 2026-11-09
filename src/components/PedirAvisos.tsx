"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Share, X } from "lucide-react";
import { guardarSuscripcion } from "@/app/(app)/notificaciones/actions";

const b64 = (s: string) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const CLAVE = "avisos-ahora-no";
const DIAS = 3;
const leer = () => { try { return Number(localStorage.getItem(CLAVE) ?? 0); } catch { return 0; } };
const posponer = () => { try { localStorage.setItem(CLAVE, String(Date.now() + DIAS * 86400000)); } catch {} };

/** Suscribe este dispositivo a los avisos y lo guarda en el servidor */
async function suscribir(clavePublica: string) {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(clavePublica) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return guardarSuscripcion({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
}

/**
 * Pide activar los avisos al entrar, sin tener que ir a la página de Avisos.
 * Si el permiso ya está dado, se suscribe solo; si dice «Ahora no», vuelve a preguntar en unos días.
 * En iPhone sin la app instalada, explica cómo instalarla (es la única forma de recibir avisos allí).
 */
export default function PedirAvisos({ clavePublica }: { clavePublica: string }) {
  const [modo, setModo] = useState<null | "pedir" | "instalar">(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!soporta) { if (ios && !instalada && leer() < Date.now()) setModo("instalar"); return; }
      if (Notification.permission === "denied") return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (await reg?.pushManager.getSubscription()) return; // ya activos
      if (Notification.permission === "granted") { await suscribir(clavePublica); return; } // permiso dado: se activa solo
      if (leer() < Date.now()) setModo("pedir");
    })().catch(() => {});
  }, [clavePublica]);

  if (!modo) return null;
  const cerrar = () => { posponer(); setModo(null); };
  const activar = async () => {
    setOcupado(true); setError(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setModo(null); return; }
      const r = await suscribir(clavePublica);
      if (r?.error) { setError(r.error); return; }
      setModo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se han podido activar.");
    } finally { setOcupado(false); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3">
      <div className="flex items-start gap-3 rounded-xl border border-oro bg-oro/15 p-3 text-sm shadow-sm">
        <Bell className="mt-0.5 shrink-0 text-azul" size={20} />
        <div className="min-w-0 flex-1">
          {modo === "pedir" ? (
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
          ) : (
            <>
              <p className="font-semibold">Instala la app para recibir avisos</p>
              <p className="text-tinta/70">En iPhone los avisos solo llegan con la app instalada: pulsa <Share size={14} className="inline align-text-bottom" /> Compartir → «Añadir a pantalla de inicio» y ábrela desde el icono.</p>
            </>
          )}
        </div>
        <button type="button" onClick={cerrar} className="text-tinta/50 hover:text-tinta" aria-label="Cerrar"><X size={18} /></button>
      </div>
    </div>
  );
}
