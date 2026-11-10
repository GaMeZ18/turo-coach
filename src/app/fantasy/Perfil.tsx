"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Pencil, Trash2, X } from "lucide-react";
import { COLORES_AVATAR, EMOJIS_AVATAR } from "@/lib/fantasy/estilo";
import { darmeDeBaja, guardarPerfil, salir } from "./actions";
import { Escudo } from "./ui";
import AvisosFantasy from "./Avisos";

export type AvatarDatos = { emoji: string | null; color: string | null; foto: string | null };

const LADO = 260; // tamaño del círculo en pantalla
const SALIDA = 200; // tamaño de la foto guardada

/** Recortar la foto: mover con el dedo, zoom pellizcando o con la barra; se guarda lo que queda dentro del círculo */
function Recortador({ src, onListo, onCancelar }: { src: string; onListo: (dataUrl: string) => void; onCancelar: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ x: number; y: number; px: number; py: number; dist?: number; zoom: number } | null>(null);
  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      setImg(i);
      const base = Math.max(LADO / i.width, LADO / i.height);
      setPos({ x: (LADO - i.width * base) / 2, y: (LADO - i.height * base) / 2 });
    };
    i.onerror = () => { alert("No se ha podido abrir esa imagen. Prueba con otra (JPG o PNG)."); onCancelar(); };
    i.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  if (!img) return null;
  const base = Math.max(LADO / img.width, LADO / img.height);
  const escala = base * zoom;
  const w = img.width * escala, h = img.height * escala;
  const ajustar = (x: number, y: number, ww = w, hh = h) => ({ x: Math.min(0, Math.max(LADO - ww, x)), y: Math.min(0, Math.max(LADO - hh, y)) });
  /** Zoom manteniendo el centro del círculo en el mismo punto de la foto */
  const cambiarZoom = (z: number) => {
    const nz = Math.min(4, Math.max(1, z));
    const ne = base * nz;
    const cx = (LADO / 2 - pos.x) / escala, cy = (LADO / 2 - pos.y) / escala;
    setZoom(nz);
    setPos(ajustar(LADO / 2 - cx * ne, LADO / 2 - cy * ne, img.width * ne, img.height * ne));
  };
  const distancia = () => { const [a, b] = [...punteros.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const abajo = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesto.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY, dist: punteros.current.size === 2 ? distancia() : undefined, zoom };
  };
  const mover = (e: React.PointerEvent) => {
    if (!gesto.current || !punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2 && gesto.current.dist) { cambiarZoom(gesto.current.zoom * (distancia() / gesto.current.dist)); return; }
    setPos(ajustar(gesto.current.x + e.clientX - gesto.current.px, gesto.current.y + e.clientY - gesto.current.py));
  };
  const arriba = (e: React.PointerEvent) => { punteros.current.delete(e.pointerId); gesto.current = null; };
  const usar = () => {
    const c = document.createElement("canvas");
    c.width = c.height = SALIDA;
    c.getContext("2d")!.drawImage(img, -pos.x / escala, -pos.y / escala, LADO / escala, LADO / escala, 0, 0, SALIDA, SALIDA);
    onListo(c.toDataURL("image/jpeg", 0.82));
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" data-sin-refresco>
      <div className="fx-card w-full max-w-sm space-y-3 p-4 text-center">
        <p className="fx-display text-xl">Recorta tu foto</p>
        <p className="text-xs fx-suave">Mueve la foto con el dedo y haz zoom para dejar dentro del círculo lo que quieras.</p>
        <div className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-black" style={{ width: LADO, height: LADO }}
          onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
          onWheel={(e) => cambiarZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.93))}>
          <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: pos.x, top: pos.y, width: w, height: h }} />
          {/* Fuera del círculo, oscurecido */}
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 999px rgba(0,0,0,.55)" }} />
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--fx-oro)]" />
        </div>
        <label className="flex items-center gap-2 text-xs fx-suave">
          <span>−</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => cambiarZoom(Number(e.target.value))} className="flex-1 accent-[#f6c445]" />
          <span>+</span>
        </label>
        <div className="flex gap-2">
          <button type="button" className="fx-btn-sec flex-1 justify-center" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="fx-btn flex-1 !py-2 !text-base" onClick={usar}>Usar foto</button>
        </div>
      </div>
    </div>
  );
}

/** Elegir emoji + color, o subir una foto */
export function ElegirAvatar({ alias, valor, onChange }: { alias: string; valor: AvatarDatos; onChange: (v: AvatarDatos) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuente, setFuente] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Escudo alias={alias || "?"} emoji={valor.emoji} color={valor.color} foto={valor.foto} size={56} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="fx-btn-sec" onClick={() => input.current?.click()}><Camera size={15} /> {valor.foto ? "Cambiar foto" : "Subir foto"}</button>
          {valor.foto && <button type="button" className="fx-btn-sec" onClick={() => onChange({ ...valor, foto: null })}><Trash2 size={15} /> Quitar foto</button>}
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setError(null);
          if (!f.type.startsWith("image/")) setError("Elige una imagen.");
          else setFuente(URL.createObjectURL(f));
          e.target.value = "";
        }} />
        {fuente && (
          <Recortador src={fuente} onCancelar={() => { URL.revokeObjectURL(fuente); setFuente(null); }}
            onListo={(foto) => { URL.revokeObjectURL(fuente); setFuente(null); onChange({ ...valor, foto }); }} />
        )}
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
export function EditarPerfil({ alias, mostrar, avatar, publico, clavePublica }: { alias: string; mostrar: string; avatar: AvatarDatos; publico: boolean; clavePublica?: string }) {
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
            {publico && clavePublica && <div className="border-t border-[var(--fx-borde)] pt-3"><p className="mb-1 text-xs font-bold uppercase fx-suave">Avisos en el móvil</p><AvisosFantasy clavePublica={clavePublica} siempre /></div>}
            {publico && <button className="w-full text-center text-xs fx-suave underline" onClick={() => start(async () => { await salir(); })}>Salir en este móvil</button>}
            <button className="w-full text-center text-xs text-red-300/80 underline" onClick={() => confirm("¿Seguro que quieres darte de baja del Fantasy? Se borran tu equipo, tus puntos y tus mensajes. No se puede deshacer.") && start(async () => { await darmeDeBaja(); })}>Darme de baja del Fantasy</button>
          </div>
        </div>
      )}
    </>
  );
}
