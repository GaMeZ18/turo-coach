import { normalizar } from "@/components/pizarra/modelo";
import qrcode from "qrcode-generator";

/** Pasos para el PDF: un dibujo por fotograma (si hay muchos, se juntan de 2 en 2 o más para que quepan en 9) */
export function pasosDe(pizarra: unknown, max = 9): [number, number][] {
  if (!pizarra) return [];
  const n = normalizar(pizarra).fotogramas.length;
  if (n < 2) return [];
  const grupo = Math.ceil(n / max);
  const r: [number, number][] = [];
  for (let i = 0; i < n; i += grupo) r.push([i, Math.min(n, i + grupo)]);
  return r;
}

/** Código QR (SVG) para abrir un enlace con el móvil desde el papel */
export function qrSvg(url: string) {
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); } catch { return ""; }
}
