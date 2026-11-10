"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

/** Reduce una foto en el propio móvil (máx. 1000 px, JPEG) para guardarla sin ocupar mucho */
async function reducir(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const k = Math.min(1, 1000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let q = 0.8, out = c.toDataURL("image/jpeg", q);
    while (out.length > 450_000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/** Hasta 4 fotos (de la galería o la cámara), con su miniatura y botón para quitarlas */
export default function SubirImagenes({ valor, onChange, max = 4 }: { valor: string[]; onChange: (v: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elegir = async (files: FileList | null) => {
    if (!files?.length) return;
    setCargando(true); setError(null);
    try {
      const nuevas: string[] = [];
      for (const f of Array.from(files).slice(0, max - valor.length)) {
        if (!f.type.startsWith("image/")) continue;
        nuevas.push(await reducir(f));
      }
      onChange([...valor, ...nuevas].slice(0, max));
    } catch { setError("No se ha podido leer alguna imagen."); }
    finally { setCargando(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {valor.map((src, i) => (
          <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-linea bg-suave">
            <img src={src} alt={`Imagen ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(valor.filter((_, j) => j !== i))} aria-label="Quitar imagen"
              className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-tinta shadow"><X size={14} /></button>
          </div>
        ))}
        {valor.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={cargando}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-linea text-xs text-tinta/60 hover:border-azul hover:text-azul">
            {cargando ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />} Añadir foto
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => elegir(e.target.files)} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
