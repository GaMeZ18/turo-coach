"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-secundario !py-1.5 text-sm"
      onClick={async () => { try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { window.prompt("Copia el enlace:", texto); } }}>
      {ok ? <Check size={15} /> : <Copy size={15} />} {ok ? "Copiado" : "Copiar enlace"}
    </button>
  );
}
