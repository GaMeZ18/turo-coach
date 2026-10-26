"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { guardarSuscripcion, quitarSuscripcion } from "./actions";

const b64 = (s: string) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Activa los avisos push en este dispositivo (móvil u ordenador) */
export default function ActivarAvisos({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<"cargando" | "no-soportado" | "denegado" | "activo" | "inactivo">("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado("no-soportado");
      if (Notification.permission === "denied") return setEstado("denegado");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub ? "activo" : "inactivo");
    })().catch(() => setEstado("no-soportado"));
  }, []);

  const activar = async () => {
    setOcupado(true); setMsg(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado("denegado"); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(clavePublica) });
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await guardarSuscripcion({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
      if (r.error) { setMsg(r.error); return; }
      setEstado("activo"); setMsg("Listo: recibirás los avisos en este dispositivo.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se han podido activar.");
    } finally { setOcupado(false); }
  };
  const desactivar = async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await quitarSuscripcion(sub.endpoint); await sub.unsubscribe(); }
      setEstado("inactivo");
    } finally { setOcupado(false); }
  };

  return (
    <div className="tarjeta p-4 text-sm">
      <p className="font-semibold">Avisos en este dispositivo</p>
      {estado === "no-soportado" && <p className="mt-1 text-tinta/60">Este navegador no admite avisos. En iPhone/iPad, primero instala la app (Compartir → Añadir a pantalla de inicio) y ábrela desde el icono.</p>}
      {estado === "denegado" && <p className="mt-1 text-tinta/60">Los avisos están bloqueados para esta web. Permítelos en los ajustes del navegador (icono del candado junto a la dirección).</p>}
      {(estado === "inactivo" || estado === "activo") && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {estado === "inactivo" ? (
            <button type="button" onClick={activar} disabled={ocupado} className="btn-primario">{ocupado ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Activar avisos</button>
          ) : (
            <button type="button" onClick={desactivar} disabled={ocupado} className="btn-secundario"><BellOff size={16} /> Desactivar en este dispositivo</button>
          )}
          <span className="text-xs text-tinta/60">Cambios de horario o de pista, aplazamientos y resultados de tus equipos.</span>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-tinta/70">{msg}</p>}
    </div>
  );
}
