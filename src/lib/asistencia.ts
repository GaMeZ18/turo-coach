// Cálculo del % de asistencia, el mismo en todas las pantallas.
//
// Presente y tarde cuentan como asistencia. Las faltas JUSTIFICADAS no cuentan
// ni a favor ni en contra: se quitan del cálculo (no bajan el %).
// Para que otro estado tampoco baje el %, basta con añadirlo a esta lista
// (por ejemplo "lesionado").
export const NO_BAJAN_EL_PORCENTAJE: readonly string[] = ["justificado"];

export const asiste = (estado: string) => estado === "presente" || estado === "tarde";
export const cuentaParaPorcentaje = (estado: string) => !NO_BAJAN_EL_PORCENTAJE.includes(estado);

export type ResumenAsistencia = {
  /** Registros totales (incluidos los justificados) */
  total: number;
  /** Registros que cuentan para el % (sin los justificados) */
  validos: number;
  /** Presentes + tarde */
  asistidos: number;
  /** Registros que no cuentan para el % */
  excluidos: number;
  /** Porcentaje (0-100) o null si no hay ningún registro que cuente */
  pct: number | null;
};

export function resumenAsistencia(registros: { estado: string }[]): ResumenAsistencia {
  const validos = registros.filter((r) => cuentaParaPorcentaje(r.estado));
  const asistidos = validos.filter((r) => asiste(r.estado)).length;
  return {
    total: registros.length,
    validos: validos.length,
    asistidos,
    excluidos: registros.length - validos.length,
    pct: validos.length ? Math.round((asistidos * 100) / validos.length) : null,
  };
}
