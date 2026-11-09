"use client";

import { useEffect } from "react";

/** Registra el service worker UNA sola vez por sesión, y sin romper nada si falla. */
export default function RegistrarSW() {
  // Al tocar un aviso con la app ya abierta, el service worker pide ir a su página
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const ir = (ev: MessageEvent) => { if (ev.data?.tipo === "ir" && typeof ev.data.url === "string") window.location.assign(ev.data.url); };
    navigator.serviceWorker.addEventListener("message", ir);
    return () => navigator.serviceWorker.removeEventListener("message", ir);
  }, []);
  useEffect(() => {
    try {
      if (!("serviceWorker" in navigator)) return;
      if ((window as unknown as { __swTuro?: boolean }).__swTuro) return;
      (window as unknown as { __swTuro?: boolean }).__swTuro = true;
      navigator.serviceWorker
        .getRegistration("/")
        .then((r) => (r ? r : navigator.serviceWorker.register("/sw.js")))
        .catch(() => {});
    } catch {
      /* navegadores con el service worker bloqueado: la app funciona igual */
    }
  }, []);
  return null;
}
