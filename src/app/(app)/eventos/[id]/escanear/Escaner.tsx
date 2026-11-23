"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/Enlace";
import { ArrowLeft, Keyboard } from "lucide-react";
import { hora } from "@/lib/fechas";
import { validarPase, type Lectura } from "../../actions";

type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const COLORES: Record<Lectura["estado"], string> = { ok: "bg-green-600", usado: "bg-amber-500", anulado: "bg-red-600", otro_evento: "bg-red-600", invalido: "bg-red-600" };
const TITULOS: Record<Lectura["estado"], string> = { ok: "✅ Puede entrar", usado: "⚠️ Ya ha entrado", anulado: "⛔ Pase anulado", otro_evento: "⛔ Es de otro evento", invalido: "⛔ QR no válido" };

/** Pitido corto (agudo si vale, grave si no) */
function pitar(bien: boolean) {
  try {
    const a = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = bien ? 1100 : 300; g.gain.value = 0.15;
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (bien ? 0.15 : 0.4));
  } catch { /* */ }
  try { navigator.vibrate?.(bien ? 80 : [200, 100, 200]); } catch { /* */ }
}

export default function Escaner({ eventoId, nombre }: { eventoId: string; nombre: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [cuenta, setCuenta] = useState(0);
  const [manual, setManual] = useState("");
  const ocupado = useRef(false), ultimo = useRef({ t: "", ms: 0 });

  const leer = useCallback(async (texto: string) => {
    const ahora = Date.now();
    if (ocupado.current || (texto === ultimo.current.t && ahora - ultimo.current.ms < 4000)) return;
    ocupado.current = true; ultimo.current = { t: texto, ms: ahora };
    try {
      const r = await validarPase(eventoId, texto);
      setLectura(r); pitar(r.estado === "ok");
      if (r.estado === "ok") setCuenta((c) => c + 1);
      setTimeout(() => setLectura((l) => (l === r ? null : l)), r.estado === "ok" ? 2200 : 4000);
    } catch { setError("Sin conexión: no se ha podido comprobar el pase."); }
    finally { setTimeout(() => { ocupado.current = false; }, 1200); }
  }, [eventoId]);

  useEffect(() => {
    let flujo: MediaStream | null = null, parar = false, timer = 0;
    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
        const v = video.current!; v.srcObject = flujo; await v.play();
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = BD ? new BD({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;
        const ciclo = async () => {
          if (parar) return;
          if (v.readyState >= 2 && !ocupado.current) {
            try {
              if (detector) {
                const r = await detector.detect(v);
                if (r[0]?.rawValue) leer(r[0].rawValue);
              } else if (jsQR && lienzo.current) {
                const c = lienzo.current, w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
                c.width = w; c.height = h;
                const ctx = c.getContext("2d", { willReadFrequently: true })!;
                ctx.drawImage(v, 0, 0, w, h);
                const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
                if (r?.data) leer(r.data);
              }
            } catch { /* fotograma sin QR */ }
          }
          timer = window.setTimeout(ciclo, 180);
        };
        ciclo();
      } catch {
        setError("No se puede abrir la cámara. Da permiso a la cámara para coach.cbturo.com (en el iPhone: Ajustes › Safari › Cámara) o mete el código a mano.");
      }
    })();
    return () => { parar = true; clearTimeout(timer); flujo?.getTracks().forEach((t) => t.stop()); };
  }, [leer]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Link href={`/eventos/${eventoId}?v=entrada`} className="flex items-center gap-1 text-sm"><ArrowLeft size={16} /> Salir</Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{nombre}</p>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{cuenta} entradas</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={lienzo} className="hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-60 w-60 rounded-3xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" /></div>
        {lectura && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center ${COLORES[lectura.estado]}`} onClick={() => setLectura(null)}>
            <p className="text-3xl font-black">{TITULOS[lectura.estado]}</p>
            {lectura.nombre && <p className="mt-3 text-2xl font-bold">{lectura.dorsal ? `#${lectura.dorsal} ` : ""}{lectura.nombre}</p>}
            {lectura.equipo && <p className="text-lg opacity-90">{lectura.equipo}{lectura.rol === "entrenador" ? " · Entrenador/a" : ""}</p>}
            {lectura.estado === "usado" && lectura.usado_at && <p className="mt-2 text-lg">Entró a las {hora(lectura.usado_at)}</p>}
            <p className="mt-6 text-sm opacity-70">Toca para seguir</p>
          </div>
        )}
        {error && <p className="absolute inset-x-3 bottom-3 rounded-lg bg-red-600/90 p-3 text-sm">{error}</p>}
      </div>
      <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { ultimo.current = { t: "", ms: 0 }; leer(manual.trim()); setManual(""); } }}>
        <Keyboard size={18} className="mt-2.5 shrink-0 opacity-60" />
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Si no lee: pega el enlace o el código del pase" className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none" />
        <button className="rounded-lg bg-white px-3 text-sm font-semibold text-black">OK</button>
      </form>
    </div>
  );
}
