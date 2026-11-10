"use client";

import { useState, useTransition } from "react";
import { Check, Heart, Link2, Share2, Star, X } from "lucide-react";
import { alternarFavorito, alternarMegusta, enlaceCompartir } from "../actions";

/** Favorito, «me gusta» y compartir por WhatsApp */
export default function Social({ id, titulo, favorito, megusta, total }: { id: string; titulo: string; favorito: boolean; megusta: boolean; total: number }) {
  const [fav, setFav] = useState(favorito);
  const [mg, setMg] = useState({ yo: megusta, n: total });
  const [, start] = useTransition();
  const [compartir, setCompartir] = useState<{ url?: string; error?: string; cargando?: boolean; copiado?: boolean } | null>(null);

  const cambiarFav = () => { const v = !fav; setFav(v); start(async () => { const r = await alternarFavorito(id, v); if (r.error) setFav(!v); }); };
  const cambiarMg = () => {
    const v = !mg.yo; setMg({ yo: v, n: Math.max(0, mg.n + (v ? 1 : -1)) });
    start(async () => { const r = await alternarMegusta(id, v); if (r.error) setMg({ yo: !v, n: mg.n }); else if (r.total !== undefined) setMg({ yo: v, n: r.total }); });
  };
  const abrirCompartir = async () => {
    setCompartir({ cargando: true });
    const r = await enlaceCompartir(id);
    if (!r.url) return setCompartir({ error: r.error ?? "No se ha podido crear el enlace." });
    // En el móvil, la hoja de compartir del sistema (WhatsApp, etc.)
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: titulo, text: `🏀 ${titulo}`, url: r.url }); setCompartir(null); return; } catch { /* cancelado: se muestran las opciones */ }
    }
    setCompartir({ url: r.url });
  };
  const copiar = async (url: string) => { try { await navigator.clipboard.writeText(url); setCompartir({ url, copiado: true }); } catch { /* sin permiso */ } };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button type="button" onClick={cambiarFav} className={`btn-secundario ${fav ? "!border-amber-300 !text-amber-700" : ""}`} aria-pressed={fav} title={fav ? "Quitar de favoritos" : "Añadir a favoritos"}>
        <Star size={16} className={fav ? "fill-amber-400 text-amber-500" : ""} /> {fav ? "Favorito" : "Favorito"}
      </button>
      <button type="button" onClick={cambiarMg} className={`btn-secundario ${mg.yo ? "!text-rojo" : ""}`} aria-pressed={mg.yo} title="Me gusta">
        <Heart size={16} className={mg.yo ? "fill-current" : ""} /> {mg.n > 0 ? mg.n : ""} <span className="sr-only">Me gusta</span>
      </button>
      <button type="button" onClick={abrirCompartir} className="btn-secundario" title="Compartir por WhatsApp"><Share2 size={16} /> Compartir</button>
      {compartir && !compartir.cargando && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-linea bg-white p-3 text-sm shadow-lg">
          <div className="flex items-center justify-between"><p className="font-semibold">Compartir ejercicio</p><button type="button" onClick={() => setCompartir(null)} aria-label="Cerrar"><X size={16} /></button></div>
          {compartir.error ? <p className="mt-2 text-red-700">{compartir.error}</p> : compartir.url && (
            <>
              <p className="mt-1 text-xs text-tinta/60">Cualquiera con el enlace podrá verlo (sin cuenta), con la pizarra animada.</p>
              <a href={`https://wa.me/?text=${encodeURIComponent(`🏀 ${titulo}\n${compartir.url}`)}`} target="_blank" rel="noopener" className="btn-primario mt-2 w-full justify-center !bg-[#25d366]">WhatsApp</a>
              <button type="button" onClick={() => copiar(compartir.url!)} className="btn-secundario mt-2 w-full justify-center">{compartir.copiado ? <><Check size={16} /> Copiado</> : <><Link2 size={16} /> Copiar enlace</>}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
