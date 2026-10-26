"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Plataforma = "ios" | "mac-safari" | "chromium" | "otro";

function detectar(): Plataforma {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  if (/Macintosh/.test(ua) && safari) return "mac-safari";
  if (/Chrome|Chromium|Edg/.test(ua)) return "chromium";
  return "otro";
}

const yaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Registra el service worker y ofrece instalar la app según el dispositivo. */
export default function InstalarApp({ variante = "aviso" }: { variante?: "aviso" | "tarjeta" }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma>("otro");
  const [instalada, setInstalada] = useState(true);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    setPlataforma(detectar());
    setInstalada(yaInstalada());
    try { setOculto(localStorage.getItem("instalar-oculto") === "1"); } catch { setOculto(false); }

    const antes = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const hecha = () => { setInstalada(true); setEvento(null); };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", hecha);
    return () => {
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", hecha);
    };
  }, []);

  if (instalada) {
    return variante === "tarjeta" ? <p className="text-sm text-green-700">Ya la estás usando como app instalada.</p> : null;
  }

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  };

  const instrucciones =
    plataforma === "ios" ? (
      <>En Safari: botón <Share size={14} className="inline -mt-0.5" /> <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>.</>
    ) : plataforma === "mac-safari" ? (
      <>En Safari: menú <strong>Archivo → Añadir al Dock</strong>.</>
    ) : plataforma === "chromium" ? (
      <>En Chrome o Edge: icono de instalar en la barra de direcciones, o menú ⋮ → <strong>Instalar Coach Manager CBTuró</strong>.</>
    ) : (
      <>Abre esta web en Chrome, Edge o Safari para instalarla.</>
    );

  if (variante === "tarjeta") {
    return (
      <div className="space-y-2 text-sm">
        {evento ? (
          <button onClick={instalar} className="btn-primario"><Download size={16} /> Instalar Coach Manager CBTuró</button>
        ) : (
          <p className="text-tinta/70">{instrucciones}</p>
        )}
        <p className="text-xs text-tinta/50">Se abre en su propia ventana, con el escudo como icono, en el móvil, la tablet o el ordenador.</p>
      </div>
    );
  }

  // Aviso discreto en la portada (solo si se puede instalar con un clic o en iPhone/iPad)
  if (oculto || (!evento && plataforma !== "ios")) return null;
  return (
    <div className="tarjeta mb-4 flex items-center gap-3 border-l-4 !border-l-oro p-3">
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-azul">Instala Coach Manager CBTuró</p>
        <p className="text-tinta/70">{evento ? "Tenla a mano como una app más, con su icono." : instrucciones}</p>
      </div>
      {evento && <button onClick={instalar} className="btn-primario shrink-0 !py-1.5"><Download size={16} /> Instalar</button>}
      <button
        onClick={() => { setOculto(true); try { localStorage.setItem("instalar-oculto", "1"); } catch {} }}
        className="shrink-0 rounded p-1 text-tinta/40 hover:text-tinta"
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
