"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Pencil, Trash2, X } from "lucide-react";
import { COLORES_AVATAR, EMOJIS_AVATAR } from "@/lib/fantasy/estilo";
import { guardarPerfil, salir } from "./actions";
import { Escudo } from "./ui";

export type AvatarDatos = { emoji: string | null; color: string | null; foto: string | null };

/** Reduce la foto a 160×160 (recortada al centro) para que pese muy poco */
async function reducir(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(file); });
  const lado = Math.min(img.width, img.height), c = document.createElement("canvas");
  c.width = c.height = 160;
  c.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 160, 160);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Elegir emoji + color, o subir una foto */
export function ElegirAvatar({ alias, valor, onChange }: { alias: string; valor: AvatarDatos; onChange: (v: AvatarDatos) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Escudo alias={alias || "?"} emoji={valor.emoji} color={valor.color} foto={valor.foto} size={56} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="fx-btn-sec" onClick={() => input.current?.click()}><Camera size={15} /> {valor.foto ? "Cambiar foto" : "Subir foto"}</button>
          {valor.foto && <button type="button" className="fx-btn-sec" onClick={() => onChange({ ...valor, foto: null })}><Trash2 size={15} /> Quitar foto</button>}
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          try { setError(null); onChange({ ...valor, foto: await reducir(f) }); } catch { setError("No se ha podido leer la foto."); }
          e.target.value = "";
        }} />
      </div>
      {!valor.foto && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS_AVATAR.map((em) => (
              <button key={em} type="button" onClick={() => onChange({ ...valor, emoji: valor.emoji === em ? null : em })}
                className={`h-9 w-9 rounded-lg text-xl ${valor.emoji === em ? "bg-[var(--fx-oro)]/30 ring-2 ring-[var(--fx-oro)]" : "bg-[#121a36]"}`}>{em}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLORES_AVATAR.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => onChange({ ...valor, color: c })}
                className={`h-7 w-7 rounded-full border-2 ${valor.color === c ? "border-[var(--fx-oro)] scale-110" : "border-white/20"}`} style={{ background: c }} />
            ))}
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

/** Botón «Editar» de mi equipo: nombre, cómo me ven y avatar */
export function EditarPerfil({ alias, mostrar, avatar, publico }: { alias: string; mostrar: string; avatar: AvatarDatos; publico: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ alias, mostrar, ...avatar });
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="rounded-md p-1 text-[var(--fx-suave)] hover:text-white" aria-label="Editar mi equipo"><Pencil size={14} /></button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setAbierto(false)}>
          <div className="fx-card w-full max-w-md space-y-3 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><p className="fx-display text-xl">Mi equipo</p><button onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={18} /></button></div>
            <label className="block text-xs fx-suave">Nombre del equipo (en grande)<input className="fx-input mt-1" maxLength={30} value={f.alias} onChange={(e) => setF({ ...f, alias: e.target.value })} /></label>
            <label className="block text-xs fx-suave">Cómo te ven los demás (en pequeño)<input className="fx-input mt-1" maxLength={30} value={f.mostrar} onChange={(e) => setF({ ...f, mostrar: e.target.value })} /></label>
            <ElegirAvatar alias={f.alias} valor={f} onChange={(v) => setF({ ...f, ...v })} />
            <button className="fx-btn w-full" disabled={pend} onClick={() => start(async () => {
              setError(null); const r = await guardarPerfil(f); if (r.error) setError(r.error); else setAbierto(false);
            })}>{pend && <Loader2 size={16} className="animate-spin" />} Guardar</button>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {publico && <button className="w-full text-center text-xs fx-suave underline" onClick={() => start(async () => { await salir(); })}>Salir en este móvil</button>}
          </div>
        </div>
      )}
    </>
  );
}
