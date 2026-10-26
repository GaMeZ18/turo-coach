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

/** Trae todas las filas de una consulta, de 1000 en 1000 (Supabase devuelve como máximo 1000 por petición). */
export async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, max = 20000): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = [];
  for (let i = 0; i < max; i += 1000) {
    const { data, error } = await consulta(i, i + 999);
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
}
