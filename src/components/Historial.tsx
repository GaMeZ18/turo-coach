import { createClient } from "@/lib/supabase/server";
import { fechaCorta, hora } from "@/lib/fechas";
import { History } from "lucide-react";

type Fila = { id: number; accion: string; detalle: string | null; created_at: string; perfiles: { nombre: string | null } | null };

/** Historial de cambios de un ejercicio o entreno (solo coordinadores: la base de datos no se lo da a nadie más) */
export default async function Historial({ registroId }: { registroId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("historial_cambios")
    .select("id, accion, detalle, created_at, perfiles(nombre)")
    .eq("registro_id", registroId)
    .order("created_at", { ascending: false })
    .limit(50);
  const filas = (data ?? []) as unknown as Fila[];
  return (
    <details className="tarjeta mt-6 p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold [&::-webkit-details-marker]:hidden">
        <History size={16} className="text-azul" /> Historial de cambios <span className="font-normal text-tinta/50">({filas.length}{filas.length === 50 ? "+" : ""}) · solo coordinadores</span>
      </summary>
      {filas.length === 0 ? (
        <p className="mt-2 text-tinta/60">Sin cambios registrados todavía (se guardan desde hoy).</p>
      ) : (
        <ul className="mt-2 divide-y divide-linea">
          {filas.map((f) => (
            <li key={f.id} className="flex flex-wrap gap-x-2 py-1.5">
              <span className="shrink-0 tabular-nums text-tinta/50">{fechaCorta(f.created_at)} {hora(f.created_at)}</span>
              <span className="font-semibold">{f.perfiles?.nombre ?? "Alguien"}</span>
              <span className="text-tinta/80">
                {f.accion === "crear" ? "lo creó" : f.accion === "borrar" ? `borró ${f.detalle ?? ""}` : `cambió: ${f.detalle ?? ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
