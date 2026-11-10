"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Loader2, Play, Square, X } from "lucide-react";
import PizarraEditor from "@/components/pizarra";
import type { ControlPizarra } from "./Editor";

export type JugadaSeguida = { id: string; titulo: string; notas?: string | null; pizarra: unknown };

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Todas las jugadas una detrás de otra: para verlas seguidas o para grabarlas en un solo vídeo
 * (con el nombre de cada jugada antes de que empiece).
 */
export default function TodasSeguidas({ jugadas, nombre }: { jugadas: JugadaSeguida[]; nombre: string }) {
  const lista = jugadas.filter((j) => j.pizarra);
  const [abierto, setAbierto] = useState(false);
  const [idx, setIdx] = useState(0);
  const [estado, setEstado] = useState<null | "viendo" | "grabando">(null);
  const [rotulo, setRotulo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const api = useRef<ControlPizarra | null>(null);
  const cancelado = useRef(false);
  const control = useCallback((a: ControlPizarra | null) => { api.current = a; }, []);

  // Espera a que la pizarra de la jugada i esté cargada
  const idxRef = useRef(0);
  idxRef.current = idx;
  const lista_ = async (i: number) => {
    if (i !== idxRef.current) { api.current = null; setIdx(i); }
    for (let t = 0; t < 100 && !api.current; t++) await dormir(100);
    await dormir(300);
    return api.current;
  };

  /** Recorre todas; en cada una, antes, `antes(i)` y después de reproducirla, una pausa */
  const recorrer = async (alEmpezar?: (i: number) => Promise<void>) => {
    for (let i = 0; i < lista.length && !cancelado.current; i++) {
      const a = await lista_(i);
      if (!a || cancelado.current) break;
      if (alEmpezar) await alEmpezar(i);
      setRotulo(null);
      await a.reproducir();
      await dormir(900);
    }
  };

  const ver = async () => {
    cancelado.current = false;
    setEstado("viendo");
    await recorrer(async (i) => { setRotulo(`${i + 1}/${lista.length} · ${lista[i].titulo}`); await dormir(1500); });
    setRotulo(null);
    setEstado(null);
  };

  const parar = () => { cancelado.current = true; api.current?.parar(); setEstado(null); setRotulo(null); };

  /** Un solo vídeo: se compone en un lienzo propio (rótulo de cada jugada + la pizarra) y se graba */
  const grabar = async () => {
    if (typeof MediaRecorder === "undefined") { setAviso("Este navegador no permite grabar vídeo. Prueba con Chrome o Safari actualizados."); return; }
    cancelado.current = false;
    setEstado("grabando");
    setAviso(null);
    const W = 1280, H = 720, BARRA = 64;
    const lienzo = document.createElement("canvas");
    lienzo.width = W; lienzo.height = H;
    const ctx = lienzo.getContext("2d")!;
    const stream = (lienzo as HTMLCanvasElement & { captureStream: (f: number) => MediaStream }).captureStream(30);
    const tipos = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const mime = tipos.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 5_000_000 });
    const trozos: Blob[] = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) trozos.push(ev.data); };
    const fin = new Promise<void>((r) => { rec.onstop = () => r(); });

    let portada: { titulo: string; sub: string } | null = { titulo: nombre, sub: `${lista.length} jugadas · CB Turó de la Peira` };
    let actual = "";
    let raf = 0;
    const pintar = () => {
      ctx.fillStyle = "#002b8e"; ctx.fillRect(0, 0, W, H);
      if (portada) {
        ctx.fillStyle = "#fde302"; ctx.fillRect(W / 2 - 60, H / 2 - 70, 120, 6);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.font = "bold 64px system-ui, sans-serif"; ctx.fillText(portada.titulo, W / 2, H / 2 + 10, W - 120);
        ctx.font = "28px system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillText(portada.sub, W / 2, H / 2 + 60, W - 120);
      } else {
        const src = api.current?.canvas();
        ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = "bold 30px system-ui, sans-serif";
        ctx.fillText(actual, 24, 42, W - 48);
        if (src && src.width && src.height) {
          const esc = Math.min((W - 24) / src.width, (H - BARRA - 12) / src.height);
          const w = src.width * esc, h = src.height * esc;
          ctx.fillStyle = "#fff"; ctx.fillRect((W - w) / 2 - 2, BARRA + (H - BARRA - 12 - h) / 2 - 2, w + 4, h + 4);
          ctx.drawImage(src, (W - w) / 2, BARRA + (H - BARRA - 12 - h) / 2, w, h);
        }
      }
      raf = requestAnimationFrame(pintar);
    };
    raf = requestAnimationFrame(pintar);
    rec.start(250);
    await dormir(2200); // portada
    await recorrer(async (i) => {
      actual = `${i + 1}/${lista.length} · ${lista[i].titulo}`;
      portada = { titulo: lista[i].titulo, sub: `Jugada ${i + 1} de ${lista.length}${lista[i].notas ? ` · ${lista[i].notas}` : ""}` };
      await dormir(1600);
      portada = null;
    });
    await dormir(500);
    rec.stop();
    await fin;
    cancelAnimationFrame(raf);
    setEstado(null);
    if (cancelado.current) return;
    const tipo = (mime || "video/webm").split(";")[0];
    const ext = tipo === "video/mp4" ? "mp4" : "webm";
    const archivo = new File([new Blob(trozos, { type: tipo })], `${nombre.replace(/[\\/:*?"<>|]+/g, " ").trim() || "jugadas"}.${ext}`, { type: tipo });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [archivo] })) {
      try { await nav.share({ files: [archivo], title: nombre }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(archivo);
    a.download = archivo.name;
    a.click();
    setAviso(ext === "webm" ? "Vídeo descargado (.webm). Si WhatsApp no lo acepta, usa Safari o Chrome actualizado." : "Vídeo descargado.");
  };

  useEffect(() => () => { cancelado.current = true; }, []);

  if (!lista.length) return null;
  if (!abierto) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secundario" onClick={() => setAbierto(true)}><Play size={16} /> Ver todas seguidas / vídeo</button>
      </div>
    );
  }
  const j = lista[idx];
  return (
    <section className="tarjeta space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">Todas seguidas · {idx + 1}/{lista.length}</p>
        <div className="ml-auto flex flex-wrap gap-2">
          {estado ? (
            <button type="button" className="btn-secundario" onClick={parar}><Square size={14} /> Parar</button>
          ) : (
            <>
              <button type="button" className="btn-primario" onClick={() => void ver()}><Play size={16} /> Ver todas</button>
              <button type="button" className="btn-secundario" onClick={() => void grabar()} title="Un solo vídeo con todas las jugadas (para WhatsApp)"><Film size={16} /> Vídeo con todas</button>
            </>
          )}
          <button type="button" className="rounded p-1.5 text-tinta/50 hover:bg-suave" onClick={() => { parar(); setAbierto(false); }} aria-label="Cerrar"><X size={16} /></button>
        </div>
      </div>
      {estado === "grabando" && <p className="flex items-center gap-1.5 rounded-lg bg-rojo/10 px-3 py-2 text-sm font-semibold text-rojo"><Loader2 size={14} className="animate-spin" /> Grabando el vídeo… no cambies de pantalla ni bloquees el móvil.</p>}
      {aviso && <p className="text-sm text-tinta/70">{aviso}</p>}
      <div className="flex flex-wrap gap-1">
        {lista.map((x, i) => (
          <button key={x.id} type="button" disabled={!!estado} onClick={() => setIdx(i)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${i === idx ? "bg-azul text-white" : "bg-suave hover:bg-linea"}`}>{i + 1}. {x.titulo}</button>
        ))}
      </div>
      <div className="relative">
        <PizarraEditor key={j.id} valor={j.pizarra} soloVer titulo={j.titulo} control={control} />
        {rotulo && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-azul/85 p-4 text-center text-xl font-bold text-white">{rotulo}</div>
        )}
      </div>
      {j.notas && <p className="rounded-lg bg-oro/15 p-2 text-sm font-medium">{j.notas}</p>}
    </section>
  );
}
