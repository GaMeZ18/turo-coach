"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw, Send } from "lucide-react";
import { enlaceAsistencia } from "@/app/(app)/acciones-asistencia";

/** Botón para mandar al grupo de WhatsApp el enlace donde cada jugador dice si viene */
export default function EnlaceAsistencia({ equipoId, equipo, compacto = false }: { equipoId: string; equipo: string; compacto?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const texto = (u: string) => `📋 *Asistencia · ${equipo}*\nMarca si vienes a los entrenos y partidos de esta semana. Si no puedes venir, dinos por qué 👇\n${u}`;

  const obtener = (nuevo = false) => start(async () => {
    setError(null);
    const r = await enlaceAsistencia(equipoId, nuevo);
    if (r.error || !r.url) { setError(r.error ?? "No se ha podido crear el enlace."); return; }
    setUrl(r.url); setAbierto(true);
  });
  const compartir = async () => {
    if (!url) return;
    if (navigator.share) { try { await navigator.share({ text: texto(url) }); return; } catch { /* cancelado */ return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto(url))}`, "_blank");
  };
  const copiar = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(texto(url)); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles */ }
  };

  return (
    <div className={compacto ? "" : "w-full"}>
      <button type="button" onClick={() => (abierto ? setAbierto(false) : obtener())} className={`btn-secundario ${compacto ? "" : "w-full"} !py-1.5`} disabled={pend}>
        {pend ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enlace de asistencia (WhatsApp)
      </button>
      {abierto && url && (
        <div className="tarjeta mt-2 space-y-2 p-3 text-sm">
          <p className="text-xs text-tinta/70">Mándalo al grupo del equipo cada semana. Cada uno toca su nombre y dice si viene a los entrenos y al partido; el motivo solo lo ves tú.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={compartir} className="btn-primario !py-1.5"><Send size={15} /> Compartir</button>
            <button type="button" onClick={copiar} className="btn-secundario !py-1.5">{copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar mensaje"}</button>
          </div>
          <p className="break-all text-xs text-tinta/50">{url}</p>
          <button type="button" onClick={() => { if (confirm("¿Cambiar el enlace? El anterior dejará de funcionar.")) obtener(true); }} className="inline-flex items-center gap-1 text-xs text-tinta/50 underline"><RefreshCw size={11} /> Cambiar el enlace (si se ha compartido donde no toca)</button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
