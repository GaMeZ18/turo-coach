// Emparejar un jugador de Turó Coach con su nombre en las actas de la FCBQ (nombre + dorsal)
export const tokens = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1);

/** Puntos de parecido: palabras del nombre en común (+2 si coincide el dorsal). 2 o más = es el mismo jugador */
export function parecido(nombreApp: string, dorsalApp: number | string | null, nombreFcbq: string, dorsalFcbq: string) {
  const tf = new Set(tokens(nombreFcbq));
  const comunes = tokens(nombreApp).filter((t) => tf.has(t)).length;
  return comunes + (dorsalApp !== null && dorsalApp !== "" && String(dorsalApp) === String(dorsalFcbq) ? 2 : 0);
}
