// Detalles visuales del fantasy (se pueden usar en servidor y en el navegador)
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** «SENIOR A MASC» → SAM, «SENIOR B FEM» → SBF, «U18 A» → U18A, «U25 MASC» → U25 */
export function sigla(equipo: string) {
  const s = sinAcentos(equipo);
  const sen = s.match(/SENIOR\s*([A-Z])?\s*(MASC|FEM)?/);
  if (sen) return `S${sen[1] ?? ""}${sen[2] ? sen[2][0] : ""}`;
  return s.replace(/\b(MASC|MASCULI|MASCULINO|FEM|FEMENI|FEMENINO)\b/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 5) || s.slice(0, 4);
}

const COLORES = ["#1d4ed8", "#d81f2f", "#0f9d58", "#7c3aed", "#e08a00", "#0891b2", "#db2777", "#4b5563"];
/** Color de camiseta fijo por equipo */
export function colorEquipo(equipo: string) {
  const s = sinAcentos(equipo);
  if (/SENIOR A MASC/.test(s)) return "#1d4ed8";
  if (/SENIOR A FEM/.test(s)) return "#d81f2f";
  if (/SENIOR B FEM/.test(s)) return "#7c3aed";
  if (/U25/.test(s)) return "#0f9d58";
  if (/U18 ?A/.test(s)) return "#e08a00";
  if (/U18 ?B/.test(s)) return "#0891b2";
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES[h % COLORES.length];
}

export const EMOJIS_AVATAR = ["🏀", "🔥", "🦅", "⭐", "👑", "🚀", "⚡", "🐺", "🦁", "🐯", "🐉", "💎", "🎯", "🥇", "😎", "🤘", "🍀", "🌪️", "🧱", "🎩"];
export const COLORES_AVATAR = ["#d81f2f", "#1d4ed8", "#0f9d58", "#7c3aed", "#e08a00", "#0891b2", "#db2777", "#111827"];

/** Reacciones del chat del Fantasy */
export const REACCIONES = ["👍", "🔥", "😂", "😮", "👏", "😢"] as const;
