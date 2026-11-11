"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ImageIcon, Loader2, Share2, Sparkles } from "lucide-react";
import type { InformePartido as Informe } from "@/lib/informe-partido";

const CAT: Record<string, string> = {
  "MVP": "MVP", "Máximo anotador": "MÀXIM ANOTADOR", "Desde el triple": "DES DEL TRIPLE", "Mejor +/-": "MILLOR +/-", "Seguro en el tiro libre": "DES DE LA LÍNIA",
};

async function dibujar(c: HTMLCanvasElement, inf: Informe, equipo: string, fecha: string) {
  const css = getComputedStyle(document.body);
  const cond = css.getPropertyValue("--font-barlow-condensed").trim() || "sans-serif";
  const normal = css.getPropertyValue("--font-barlow").trim() || "sans-serif";
  await Promise.all([document.fonts.load(`italic 700 40px ${cond}`), document.fonts.load(`600 30px ${normal}`)]).catch(() => null);
  const W = 1080, H = 1350;
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b1530"); g.addColorStop(1, "#050a18");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Franjas del club
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#d81f2f"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, 0); ctx.lineTo(0, 200); ctx.fill();
  ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W - 300, H); ctx.lineTo(W, H - 230); ctx.fill();
  ctx.restore();
  const logo = new Image(); logo.src = "/icons/icon-512.png";
  await logo.decode().catch(() => null);
  if (logo.naturalWidth) ctx.drawImage(logo, W / 2 - 70, 50, 140, 140);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
  ctx.font = `600 28px ${normal}`;
  ctx.fillText(`${equipo.toUpperCase()}  ·  ${fecha.toUpperCase()}`, W / 2, 225);
  ctx.font = `italic 700 120px ${cond}`;
  ctx.fillStyle = inf.gana ? "#f5c518" : "#ffffff";
  ctx.fillText(inf.gana ? "VICTÒRIA" : "DERROTA", W / 2, 320);
  // Marcador
  const [ll, vv] = inf.local ? [inf.nuestro, inf.rival] : [inf.rival, inf.nuestro];
  const [pl, pv] = inf.local ? [inf.pf, inf.pc] : [inf.pc, inf.pf];
  ctx.fillStyle = "#fff";
  ctx.font = `italic 700 150px ${cond}`;
  ctx.fillText(`${pl} - ${pv}`, W / 2, 470);
  const fit = (t: string, px: number, max: number) => { let s = px; ctx.font = `600 ${s}px ${normal}`; while (ctx.measureText(t).width > max && s > 16) ctx.font = `600 ${--s}px ${normal}`; };
  fit(ll.toUpperCase(), 30, 440); ctx.textAlign = "right"; ctx.fillText(ll.toUpperCase(), W / 2 - 40, 575);
  fit(vv.toUpperCase(), 30, 440); ctx.textAlign = "left"; ctx.fillText(vv.toUpperCase(), W / 2 + 40, 575);
  ctx.textAlign = "center"; ctx.font = `600 30px ${normal}`; ctx.fillText("·", W / 2, 575);
  // Parciales
  const n = inf.parciales.length, ancho = 150, x0 = W / 2 - (n * ancho) / 2;
  inf.parciales.forEach((p, i) => {
    const x = x0 + i * ancho + ancho / 2;
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(x - 65, 625, 130, 70);
    ctx.fillStyle = p.a > p.b ? "#f5c518" : "rgba(255,255,255,.75)";
    ctx.font = `600 18px ${normal}`; ctx.fillText(`Q${p.n}`, x, 645);
    ctx.font = `italic 700 34px ${cond}`; ctx.fillText(inf.local ? `${p.a}-${p.b}` : `${p.b}-${p.a}`, x, 675);
  });
  // Destacados
  let y = 760;
  for (const d of inf.destacados.slice(0, 4)) {
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(110, y - 50, W - 220, 100);
    ctx.fillStyle = "#d81f2f"; ctx.fillRect(110, y - 50, 110, 100);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `italic 700 54px ${cond}`; ctx.fillText(d.dorsal, 165, y + 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f5c518"; ctx.font = `600 20px ${normal}`; ctx.fillText(CAT[d.titulo] ?? d.titulo.toUpperCase(), 245, y - 22);
    ctx.fillStyle = "#fff"; ctx.font = `italic 700 42px ${cond}`; ctx.fillText(d.nombre.toUpperCase(), 245, y + 16);
    ctx.textAlign = "right"; ctx.font = `600 26px ${normal}`; ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText(d.dato.replace("puntos", "punts").replace("triples", "triples").replace("en pista", "en pista"), W - 140, y + 2);
    y += 120;
  }
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 24px ${normal}`;
  ctx.fillText("CB TURÓ DE LA PEIRA", W / 2, H - 60);
}

/** Informe automático del partido (con las estadísticas de la FCBQ), con crónica para copiar e imagen para redes */
export default function InformePartido({ inf, equipo, fecha }: { inf: Informe; equipo: string; fecha: string }) {
  const [copiado, setCopiado] = useState(false);
  const [img, setImg] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const datos = JSON.stringify([inf, equipo, fecha]);
  useEffect(() => {
    if (!img) return;
    const [i, e, f] = JSON.parse(datos) as [Informe, string, string];
    const c = canvas.current ?? (canvas.current = document.createElement("canvas"));
    dibujar(c, i, e, f).then(() => setUrl(c.toDataURL("image/jpeg", 0.92))).catch(() => setUrl(null));
  }, [img, datos]);

  const texto = `${inf.gana ? "✅" : "❌"} ${inf.local ? `${inf.nuestro} ${inf.pf}-${inf.pc} ${inf.rival}` : `${inf.rival} ${inf.pc}-${inf.pf} ${inf.nuestro}`}\n\n${inf.cronica}\n\n${inf.destacados.map((d) => `⭐ ${d.titulo}: ${d.nombre} (${d.dato})`).join("\n")}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* nada */ } };
  const nombre = `resultado-${equipo}.jpg`.toLowerCase().replace(/\s+/g, "-");
  const compartir = async () => {
    const b = await new Promise<Blob | null>((ok) => canvas.current ? canvas.current.toBlob(ok, "image/jpeg", 0.92) : ok(null));
    if (!b) return;
    const file = new File([b], nombre, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: texto }); } catch { /* cancelado */ } return; }
    descargar();
  };
  const descargar = () => { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = nombre; a.click(); };

  return (
    <section className="tarjeta mt-5 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-oro" /> Informe del partido</h2>
      <p className="mt-2 text-sm">{inf.cronica}</p>
      {inf.destacados.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {inf.destacados.map((d) => (
            <li key={d.titulo} className="flex items-center gap-2 rounded-lg bg-suave px-3 py-2 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rojo text-sm font-bold text-white">{d.dorsal}</span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-tinta/50">{d.titulo}</span><span className="font-medium">{d.nombre}</span></span>
              <span className="text-xs text-tinta/70">{d.dato}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-tinta/80">{inf.claves.map((k) => <li key={k}>{k}</li>)}</ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copiar} className="btn-secundario !py-1.5">{copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar crónica"}</button>
        <button type="button" onClick={() => setImg(!img)} className="btn-secundario !py-1.5"><ImageIcon size={15} /> Imagen para redes</button>
      </div>
      {img && (
        <div className="mt-3 max-w-sm space-y-2">
          <div className="relative overflow-hidden rounded-lg bg-[#0b1530]">
            {url ? <img src={url} alt="Resultado" className="w-full" /> : <div className="flex aspect-[4/5] items-center justify-center text-white/60"><Loader2 className="animate-spin" /></div>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={compartir} disabled={!url} className="btn-primario flex-1 !py-1.5"><Share2 size={15} /> Compartir</button>
            <button type="button" onClick={descargar} disabled={!url} className="btn-secundario !py-1.5"><Download size={15} /> Descargar</button>
          </div>
        </div>
      )}
    </section>
  );
}
