"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share, Smartphone, X } from "lucide-react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const URL_FANTASY = "https://coach.cbturo.com/fantasy";

/**
 * Botón para poner el Fantasy como icono propio en la pantalla de inicio:
 * - Android (en el navegador): el aviso de instalar de Chrome.
 * - Android (dentro de la app Coach Manager): abrirlo en Chrome para instalarlo, o el acceso directo del icono de la app.
 * - iPhone: los pasos de Safari (Compartir → Añadir a pantalla de inicio).
 */
export default function InstalarFantasy() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [plat, setPlat] = useState<{ ios: boolean; android: boolean; dentroApp: boolean; safari: boolean } | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setPlat({ ios, android: /Android/i.test(ua), dentroApp: standalone, safari: ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua) });
    try { if (localStorage.getItem("fx-instalado")) setOculto(true); } catch { /* */ }
    // Abierto ya desde el icono del Fantasy (la app empezó directamente en /fantasy): no hace falta el botón
    const inicial = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.name ?? "";
    if (standalone && /\/fantasy/.test(new URL(inicial || location.href).pathname)) setOculto(true);
    const antes = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const hecho = () => { try { localStorage.setItem("fx-instalado", "1"); } catch { /* */ } setOculto(true); };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", hecho);
    return () => { window.removeEventListener("beforeinstallprompt", antes); window.removeEventListener("appinstalled", hecho); };
  }, []);

  if (!plat || oculto || (!plat.ios && !plat.android && !evento)) return null;

  const instalar = async () => {
    if (evento) {
      await evento.prompt();
      const r = await evento.userChoice;
      if (r.outcome === "accepted") { try { localStorage.setItem("fx-instalado", "1"); } catch { /* */ } setOculto(true); }
      setEvento(null);
      return;
    }
    setAbierto(true);
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(URL_FANTASY); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ } };
  // Desde la app instalada en Android: abrir esta página en Chrome (allí sí se puede instalar)
  const enChrome = `intent://coach.cbturo.com/fantasy#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(URL_FANTASY)};end`;

  return (
    <>
      <div className="fx-card relative flex items-center gap-3 p-3">
        <Smartphone size={22} className="shrink-0 text-[var(--fx-oro)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Ten el Fantasy en tu pantalla de inicio</p>
          <p className="text-xs fx-suave">Con su propio icono, se abre directo en el juego.</p>
        </div>
        <button type="button" onClick={instalar} className="fx-btn !px-3 !py-1.5 !text-sm">📲 Añadir</button>
        <button type="button" className="absolute right-1.5 top-1.5 fx-suave" aria-label="Ocultar" onClick={() => { setOculto(true); try { localStorage.setItem("fx-instalado", "1"); } catch { /* */ } }}><X size={14} /></button>
      </div>

      {abierto && (
        <div className="zona-segura fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => setAbierto(false)}>
          <div className="fx-card w-full max-w-md space-y-3 p-4 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><p className="fx-display text-xl">📲 Añadir a la pantalla de inicio</p><button onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={18} /></button></div>

            {plat.ios ? (
              plat.dentroApp || !plat.safari ? (
                <>
                  <p>En iPhone solo se puede desde <strong>Safari</strong>:</p>
                  <ol className="list-decimal space-y-1.5 pl-5">
                    <li>Copia el enlace: <button onClick={copiar} className="fx-btn-sec ml-1 !py-0.5">{copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}</button></li>
                    <li>Abre <strong>Safari</strong>, pégalo en la barra de arriba y entra.</li>
                    <li>Pulsa <strong>Compartir</strong> <Share size={14} className="inline" /> (el cuadrado con la flecha).</li>
                    <li>Elige <strong>«Añadir a pantalla de inicio»</strong> y pulsa <strong>Añadir</strong>.</li>
                  </ol>
                </>
              ) : (
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>Pulsa <strong>Compartir</strong> <Share size={14} className="inline" /> abajo (el cuadrado con la flecha).</li>
                  <li>Baja y elige <strong>«Añadir a pantalla de inicio»</strong>.</li>
                  <li>Pulsa <strong>Añadir</strong>: te saldrá el icono «Fantasy Turó».</li>
                </ol>
              )
            ) : plat.dentroApp ? (
              <>
                <p><strong>Opción 1 (la más rápida):</strong> ábrelo en Chrome y allí pulsa «Instalar» o, en el menú ⋮, «Añadir a pantalla de inicio».</p>
                <a href={enChrome} className="fx-btn w-full !py-2 !text-base">Abrir en Chrome</a>
                <p><strong>Opción 2:</strong> en tu pantalla de inicio, <strong>mantén pulsado el icono de Coach Manager</strong>: saldrá «Fantasy Turó». Arrástralo a la pantalla y se queda como acceso directo.</p>
              </>
            ) : (
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Abre el menú <strong>⋮</strong> del navegador (arriba a la derecha).</li>
                <li>Pulsa <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.</li>
                <li>Confirma: te saldrá el icono «Fantasy Turó».</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
