import type { SupabaseClient } from "@supabase/supabase-js";
import { informeRival } from "@/lib/informe-rival";
import type { ResultadoLiga, TablaFCBQ } from "@/lib/fcbq";
import type { StatsPartido } from "@/lib/stats-fcbq";
import { Sparkles } from "lucide-react";

/** Informe automático de un equipo con los datos de la FCBQ guardados para nuestro equipo */
export default async function InformeRival({ supabase, equipoId, nombre, nuestro }: { supabase: SupabaseClient; equipoId: string; nombre: string; nuestro?: string | null }) {
  const [{ data: liga }, { data: filas }] = await Promise.all([
    supabase.from("ligas_fcbq").select("resultados, clasificacion").eq("equipo_id", equipoId).maybeSingle(),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipoId),
  ]);
  const stats = ((filas ?? []) as { datos: StatsPartido }[]).map((f) => f.datos);
  const resultados = (liga?.resultados ?? []) as ResultadoLiga[];
  // Nuestro nombre en la FCBQ: el equipo del Turó que aparece en la liga
  const propio = nuestro ?? [...resultados.map((r) => r.local), ...resultados.map((r) => r.visitante)].find((n) => /TUR[OÓ]/i.test(n)) ?? null;
  const lineas = informeRival(nombre, { resultados, clasificacion: (liga?.clasificacion ?? null) as TablaFCBQ | null, stats, nuestro: propio });
  const tono = { bien: "border-l-green-600", mal: "border-l-rojo", neutro: "border-l-linea" } as const;

  return (
    <div className="rounded-lg bg-suave p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-tinta/60"><Sparkles size={14} className="text-oro" /> Informe automático (datos FCBQ)</p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {lineas.map((l, i) => (
          <li key={i} className={`rounded border-l-4 bg-white px-2.5 py-1.5 text-sm ${tono[l.tono ?? "neutro"]}`}>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-tinta/50">{l.titulo}</span>
            {l.texto}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-tinta/50">Verde: punto débil del rival. Rojo: peligro.</p>
    </div>
  );
}
