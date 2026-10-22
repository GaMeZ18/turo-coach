// Un color distinto para cada equipo del club (según su orden alfabético en la temporada)
export const PALETA = [
  "#002b8e", // azul Turó
  "#d6001c", // rojo Turó
  "#0f9d58", // verde
  "#ef7d00", // naranja
  "#7b1fa2", // morado
  "#00838f", // turquesa
  "#c2185b", // fucsia
  "#6d4c41", // marrón
  "#3949ab", // índigo
  "#558b2f", // oliva
  "#b8860b", // dorado
  "#455a64", // gris azulado
];

export function colorEquipo(id: string, equipos: { id: string; nombre: string }[]) {
  const orden = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const i = orden.findIndex((e) => e.id === id);
  if (i >= 0) return PALETA[i % PALETA.length];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETA[Math.abs(h) % PALETA.length];
}
