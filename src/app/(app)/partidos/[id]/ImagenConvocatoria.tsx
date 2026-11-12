"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, Loader2, Share2 } from "lucide-react";

export type DatosPartido = { equipo: string; rival: string; local: boolean; fecha: string; lugar: string | null };
type Jug = { id: string; nombre: string; dorsal: number | null };

const TZ = "Europe/Madrid";
const DIAS = ["DG", "DL", "DT", "DC", "DJ", "DV", "DS"];
// Posiciones en la plantilla (1199 × 1312): centro vertical de cada fila y columnas
const FILAS = [625, 704, 783, 863, 944, 1024];
const COLS = [{ tab: 127, nombre: 192, max: 368 }, { tab: 663, nombre: 728, max: 372 }];

const partesFecha = (iso: string) => {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { dia: `${DIAS[wd]} ${g("day")}/${g("month")}`, hora: `${g("hour")}:${g("minute")}`, minutos: Number(g("hour")) * 60 + Number(g("minute")) };
};
/** «Marc Puig Soler» → «MARC PUIG» */
const corto = (n: string) => n.trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase();

function ajustar(ctx: CanvasRenderingContext2D, texto: string, fuente: (px: number) => string, px: number, max: number, min = 16) {
  let t = px;
  ctx.font = fuente(t);
  while (ctx.measureText(texto).width > max && t > min) { t -= 1; ctx.font = fuente(t); }
  return t;
}

async function dibujar(c: HTMLCanvasElement, p: DatosPartido, jugadores: Jug[], quedada: string, equipacion: string) {
  const css = getComputedStyle(document.body);
  const cond = css.getPropertyValue("--font-barlow-condensed").trim() || "'Arial Narrow', sans-serif";
  const normal = css.getPropertyValue("--font-barlow").trim() || "sans-serif";
  await Promise.all([document.fonts.load(`italic 700 40px ${cond}`), document.fonts.load(`600 30px ${normal}`)]).catch(() => null);
  const img = new Image();
  img.src = "/plantillas/convocatoria.jpg";
  await img.decode();
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  const sombra = (on: boolean) => { ctx.shadowColor = on ? "rgba(0,0,0,.55)" : "transparent"; ctx.shadowBlur = on ? 6 : 0; ctx.shadowOffsetY = on ? 2 : 0; };
  const f = partesFecha(p.fecha);

  // Debajo del título: equipo, rival y fecha
  sombra(true);
  ctx.textAlign = "center";
  const cab = `${p.equipo.toUpperCase()}  ${p.local ? "VS" : "@"}  ${p.rival.toUpperCase()}  ·  ${f.dia}`;
  ajustar(ctx, cab, (t) => `600 ${t}px ${normal}`, 27, 1000);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
  ctx.fillText(cab, 600, 568);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";

  // Jugadores por dorsal: 1–6 a la izquierda, 7–12 a la derecha
  const lista = [...jugadores].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)).slice(0, 12);
  lista.forEach((j, i) => {
    const col = COLS[i < 6 ? 0 : 1], y = FILAS[i % 6];
    ctx.textAlign = "center";
    ajustar(ctx, String(j.dorsal ?? ""), (t) => `italic 700 ${t}px ${cond}`, 52, 70);
    ctx.fillText(String(j.dorsal ?? "–"), col.tab, y + 2);
    ctx.textAlign = "left";
    const n = corto(j.nombre);
    ajustar(ctx, n, (t) => `italic 700 ${t}px ${cond}`, 40, col.max, 22);
    ctx.fillText(n, col.nombre, y + 2);
  });

  // Abajo, sobre la montaña: pista, hora del partido y equipación
  ctx.textAlign = "center";
  const l1 = p.lugar ? `📍 ${p.lugar.toUpperCase()}` : p.local ? "📍 A CASA" : "";
  const l2 = [quedada ? `🕘 PARTIT A LES ${quedada}H` : "", equipacion.trim() ? `👕 EQUIPACIÓ ${equipacion.trim().toUpperCase()}` : ""].filter(Boolean).join("   ·   ");
  if (l1) { ajustar(ctx, l1, (t) => `600 ${t}px ${normal}`, 30, 1060); ctx.fillText(l1, 600, l2 ? 1228 : 1250); }
  if (l2) { ajustar(ctx, l2, (t) => `600 ${t}px ${normal}`, 28, 1060); ctx.fillText(l2, 600, l1 ? 1272 : 1250); }
  sombra(false);
}

/** Imagen de la convocatoria con la plantilla del club, para compartir en WhatsApp */
export default function ImagenConvocatoria({ partido, jugadores }: { partido: DatosPartido; jugadores: Jug[] }) {
  const [abierto, setAbierto] = useState(false);
  const f = partesFecha(partido.fecha);
  const [quedada, setQuedada] = useState(f.hora);
  const clave = `equipacion-${partido.equipo}`;
  const [equipacion, setEquipacion] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [pend, setPend] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { try { setEquipacion(localStorage.getItem(clave) ?? ""); } catch { /* nada */ } }, [clave]);
  const datos = JSON.stringify([partido, jugadores]);
  useEffect(() => {
    if (!abierto) return;
    const [p, js] = JSON.parse(datos) as [DatosPartido, Jug[]];
    let vivo = true;
    setPend(true);
    const c = canvas.current ?? (canvas.current = document.createElement("canvas"));
    dibujar(c, p, js, quedada, equipacion)
      .then(() => { if (vivo) setUrl(c.toDataURL("image/jpeg", 0.92)); })
      .catch(() => { if (vivo) setUrl(null); })
      .finally(() => vivo && setPend(false));
    return () => { vivo = false; };
  }, [abierto, datos, quedada, equipacion]);

  const nombre = `convocatoria-${partido.equipo}-${f.dia.replace(/\W+/g, "-")}.jpg`.toLowerCase().replace(/\s+/g, "-");
  const blob = () => new Promise<Blob | null>((ok) => canvas.current ? canvas.current.toBlob(ok, "image/jpeg", 0.92) : ok(null));
  const compartir = async () => {
    const b = await blob(); if (!b) return;
    const file = new File([b], nombre, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch { /* cancelado */ } return; }
    descargar();
  };
  const descargar = () => { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = nombre; a.click(); };

  if (!abierto) {
    return <button type="button" onClick={() => setAbierto(true)} disabled={!jugadores.length} className="btn-primario w-full !py-1.5"><ImageIcon size={15} /> Imagen de la convocatoria</button>;
  }
  return (
    <div className="tarjeta space-y-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="etiqueta">Hora del partido</label><input type="time" value={quedada} onChange={(e) => setQuedada(e.target.value)} className="campo" /></div>
        <div><label className="etiqueta">Equipación</label><input value={equipacion} maxLength={30} placeholder="Ej.: vermella" onChange={(e) => { setEquipacion(e.target.value); try { localStorage.setItem(clave, e.target.value); } catch { /* nada */ } }} className="campo" /></div>
      </div>
      {jugadores.length > 12 && <p className="text-xs text-amber-700">La plantilla tiene 12 huecos: salen los 12 primeros por dorsal.</p>}
      <div className="relative overflow-hidden rounded-lg bg-[#0d1424]">
        {url ? <img src={url} alt="Convocatoria" className="w-full" /> : <div className="aspect-[1199/1312]" />}
        {pend && <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"><Loader2 size={16} className="animate-spin" /></span>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={compartir} disabled={!url} className="btn-primario flex-1 !py-1.5"><Share2 size={15} /> Compartir</button>
        <button type="button" onClick={descargar} disabled={!url} className="btn-secundario !py-1.5"><Download size={15} /> Descargar</button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-secundario !py-1.5">Cerrar</button>
      </div>
    </div>
  );
}
