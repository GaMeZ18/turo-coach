"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Compartir un texto (resumen de temporada) por WhatsApp o donde sea */
export default function Compartir({ texto, etiqueta = "Compartir" }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  const ir = async () => {
    if (navigator.share) { try { await navigator.share({ text: texto }); } catch { /* cancelado */ } return; }
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank"); }
  };
  return <button type="button" onClick={ir} className="fx-btn fx-btn-oro">{copiado ? <Check size={16} /> : <Share2 size={16} />} {copiado ? "Copiado" : etiqueta}</button>;
}
