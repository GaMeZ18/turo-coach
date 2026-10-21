"use client";

import { useEffect } from "react";

/** Registra el service worker UNA sola vez por sesión, y sin romper nada si falla. */
export default function RegistrarSW() {
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
