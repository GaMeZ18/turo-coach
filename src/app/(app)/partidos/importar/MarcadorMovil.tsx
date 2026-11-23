"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Marcador de Safari: carga fcbq-movil.js dentro de basquetcatala.cat (siempre la última versión)
const MARCADOR = "javascript:(function(){var s=document.createElement('script');s.src='https://coach.cbturo.com/fcbq-movil.js?v='+Date.now();document.body.appendChild(s)})()";

export default function MarcadorMovil() {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(MARCADOR); } catch {
      const t = document.createElement("textarea"); t.value = MARCADOR; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  return (
    <div className="mt-2 space-y-2">
      <button type="button" onClick={copiar} className="btn-primario">
        {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado" : "Copiar el marcador"}
      </button>
      <code className="block break-all rounded bg-suave p-2 text-[11px] text-tinta/60">{MARCADOR}</code>
    </div>
  );
}
