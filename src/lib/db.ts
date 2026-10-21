/**
 * Lanza un error si la operación de Supabase ha fallado, para que la app lo muestre
 * (pantalla de error con el motivo) en lugar de fallar en silencio.
 */
export function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(traducir(res.error.message));
  return res;
}

function traducir(m: string) {
  if (/row-level security|permission denied/i.test(m)) return "No tienes permiso para hacer esto en este equipo.";
  if (/duplicate key/i.test(m)) return "Ya existe un registro igual.";
  if (/violates foreign key/i.test(m)) return "No se puede: hay otros datos que dependen de este.";
  if (/fetch failed|network/i.test(m)) return "No hay conexión con la base de datos. Inténtalo de nuevo.";
  return m;
}
