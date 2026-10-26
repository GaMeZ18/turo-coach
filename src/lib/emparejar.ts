// Emparejar un jugador de Coach Manager CBTuró con su nombre en las actas de la FCBQ (nombre + dorsal)
export const tokens = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1);

/** Puntos de parecido: palabras del nombre en común (+2 si coincide el dorsal). 2 o más = es el mismo jugador */
export function parecido(nombreApp: string, dorsalApp: number | string | null, nombreFcbq: string, dorsalFcbq: string) {
  const tf = new Set(tokens(nombreFcbq));
  const comunes = tokens(nombreApp).filter((t) => tf.has(t)).length;
  return comunes + (dorsalApp !== null && dorsalApp !== "" && String(dorsalApp) === String(dorsalFcbq) ? 2 : 0);
}

const PARTICULAS = new Set(["I", "Y", "DE", "DEL", "LA", "LAS", "LOS", "DA", "DOS", "VAN", "VON"]);
const capital = (w: string) => {
  const l = w.toLowerCase();
  if (["i", "y", "de", "del", "la", "las", "los"].includes(l)) return l;
  return l.replace(/(^|[-'’])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
};

/** "AINHOA PADRÓS I ZABALETA" → { nombre: "Ainhoa", apellidos: "Padrós i Zabaleta" } (dos apellidos, con sus partículas) */
export function separarNombre(completo: string) {
  const t = completo.trim().split(/\s+/).filter(Boolean);
  if (t.length <= 1) return { nombre: capital(t[0] ?? ""), apellidos: "" };
  if (t.length === 2) return { nombre: capital(t[0]), apellidos: capital(t[1]) };
  // Recogemos dos apellidos desde el final, arrastrando partículas (de, la, i…)
  let i = t.length - 1, apellidos = 0;
  while (i > 0 && apellidos < 2) {
    apellidos++;
    i--;
    while (i > 0 && PARTICULAS.has(t[i].toUpperCase())) i--;
  }
  const corte = Math.max(1, i + 1);
  return { nombre: t.slice(0, corte).map(capital).join(" "), apellidos: t.slice(corte).map(capital).join(" ") };
}
