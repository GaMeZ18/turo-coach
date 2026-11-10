"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * Mantiene la app al día sin tener que recargar:
 * - al volver a la app (o a la pestaña) y cada minuto mientras se ve, pide los datos nuevos;
 * - en el móvil, deslizando hacia abajo desde arriba del todo se actualiza (como en otras apps).
 */
export default function AutoRefresco({ oscuro = false }: { oscuro?: boolean }) {
  const router = useRouter();
  const [refrescando, empezar] = useTransition();
  const ultimo = useRef(Date.now());
  const [tirando, setTirando] = useState(0);
  const [cargando, setCargando] = useState(false);
  const UMBRAL = 70;

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultimo.current < 5000) return;
      ultimo.current = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", refrescar);
    window.addEventListener("focus", refrescar);
    window.addEventListener("pageshow", refrescar);
    const cada = window.setInterval(() => {
      // No se refresca mientras se escribe (para no perder lo que se está tecleando)
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) return;
      if (Date.now() - ultimo.current >= 60000) refrescar();
    }, 15000);
    return () => {
      document.removeEventListener("visibilitychange", refrescar);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("pageshow", refrescar);
      window.clearInterval(cada);
    };
  }, [router]);

  // Deslizar para actualizar (solo con el dedo, arriba del todo y fuera de la pizarra/ventanas)
  useEffect(() => {
    let y0: number | null = null, d = 0, listoAntes = false;
    const inicio = (e: TouchEvent) => {
      const t = e.target as HTMLElement | null;
      if (window.scrollY > 2 || e.touches.length !== 1 || t?.closest("canvas, [data-sin-refresco], .fixed, input, textarea, select")) { y0 = null; return; }
      y0 = e.touches[0].clientY; d = 0; listoAntes = false;
    };
    const mover = (e: TouchEvent) => {
      if (y0 === null) return;
      d = e.touches[0].clientY - y0;
      if (d > 0 && window.scrollY <= 2) {
        setTirando(Math.min(d * 0.6, UMBRAL * 1.5)); // con resistencia, como en las apps
        if (d * 0.6 >= UMBRAL && !listoAntes) { listoAntes = true; try { navigator.vibrate?.(10); } catch { /* */ } }
      } else setTirando(0);
    };
    const fin = () => {
      if (y0 !== null && d * 0.6 >= UMBRAL && window.scrollY <= 2) {
        setCargando(true);
        ultimo.current = Date.now();
        // El círculo gira hasta que han llegado los datos nuevos (y como mínimo medio segundo)
        const t0 = Date.now();
        empezar(() => router.refresh());
        const esperar = () => window.setTimeout(() => setCargando(false), Math.max(0, 500 - (Date.now() - t0)));
        window.setTimeout(esperar, 50);
      }
      y0 = null; d = 0; setTirando(0);
    };
    window.addEventListener("touchstart", inicio, { passive: true });
    window.addEventListener("touchmove", mover, { passive: true });
    window.addEventListener("touchend", fin);
    window.addEventListener("touchcancel", fin);
    return () => {
      window.removeEventListener("touchstart", inicio);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", fin);
      window.removeEventListener("touchcancel", fin);
    };
  }, [router]);

  const girando = cargando || refrescando;
  if (!tirando && !girando) return null;
  const listo = tirando >= UMBRAL;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center" style={{ transform: `translateY(${girando ? 70 : Math.max(0, tirando - 10)}px)`, transition: tirando ? "none" : "transform .2s", paddingTop: "env(safe-area-inset-top)" }}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 ${oscuro ? "bg-[#16203f] text-[#f6c445] ring-[#26335e]" : "bg-white text-azul ring-linea"}`}>
        {girando ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} style={{ transform: `rotate(${tirando * 3}deg)`, opacity: listo ? 1 : 0.5 }} />}
      </span>
    </div>
  );
}
