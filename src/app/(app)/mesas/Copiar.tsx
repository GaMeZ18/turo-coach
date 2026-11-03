"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Botón para copiar un texto (enlace o mensaje para WhatsApp) */
export default function Copiar({ texto, etiqueta, className = "btn-secundario !py-1 text-xs" }: { texto: string; etiqueta: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={className} onClick={async () => { try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} }}>
      {ok ? <Check size={14} /> : <Copy size={14} />} {ok ? "Copiado" : etiqueta}
    </button>
  );
}
