"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(texto).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })} className="text-tinta/50 hover:text-azul" aria-label="Copiar">
      {ok ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}
