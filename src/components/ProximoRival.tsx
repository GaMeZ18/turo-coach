import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Binoculars, ChevronRight } from "lucide-react";
import { informeRival } from "@/lib/informe-rival";
import type { ResultadoLiga, TablaFCBQ } from "@/lib/fcbq";
import type { StatsPartido } from "@/lib/stats-fcbq";
import { diaInput, fechaLarga, hora, hoyLocal } from "@/lib/fechas";

/** Tarjeta de Inicio: el próximo partido del equipo con las claves del rival */
export default async function ProximoRival({ supabase, equipoId }: { supabase: SupabaseClient; equipoId: string }) {
  const { data: p } = await supabase.from("partidos").select("id, fecha, rival, local, lugar, estado")
    .eq("equipo_id", equipoId).gte("fecha", new Date(Date.now() - 2 * 3600e3).toISOString()).or("estado.is.null,estado.neq.aplazado")
    .order("fecha").limit(1).maybeSingle();
  if (!p) return null;
  const [{ data: liga }, { data: filas }] = await Promise.all([
    supabase.from("ligas_fcbq").select("resultados, clasificacion").eq("equipo_id", equipoId).maybeSingle(),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipoId),
  ]);
  const resultados = (liga?.resultados ?? []) as ResultadoLiga[];
  const propio = [...resultados.map((r) => r.local), ...resultados.map((r) => r.visitante)].find((n) => /TUR[OÓ]/i.test(n)) ?? null;
  const lineas = informeRival(p.rival as string, {
    resultados, clasificacion: (liga?.clasificacion ?? null) as TablaFCBQ | null,
    stats: ((filas ?? []) as { datos: StatsPartido }[]).map((f) => f.datos), nuestro: propio,
  }).slice(0, 3);
  const dias = Math.round((Date.parse(diaInput(p.fecha as string)) - Date.parse(hoyLocal())) / 864e5);
  const cuando = dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`;
  const tono = { bien: "border-l-green-600", mal: "border-l-rojo", neutro: "border-l-linea" } as const;

  return (
    <Link href={`/partidos/${p.id}`} className="tarjeta mt-3 block overflow-hidden transition hover:shadow-lg">
      <div className="flex items-center gap-3 bg-azul px-4 py-3 text-white">
        <Binoculars size={20} className="shrink-0 text-oro" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-oro">Próximo rival · {cuando}</p>
          <p className="truncate font-[family-name:var(--font-titulo)] text-xl font-bold uppercase">{p.local ? "vs" : "@"} {p.rival}</p>
          <p className="text-xs capitalize text-white/75">{fechaLarga(p.fecha as string)} · {hora(p.fecha as string)}{p.lugar ? ` · ${p.lugar}` : ""}</p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-white/60" />
      </div>
      {lineas.length > 0 && (
        <ul className="grid gap-1.5 p-3 sm:grid-cols-3">
          {lineas.map((l, i) => (
            <li key={i} className={`rounded border-l-4 bg-suave px-2.5 py-1.5 text-sm ${tono[l.tono ?? "neutro"]}`}>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-tinta/50">{l.titulo}</span>
              {l.texto}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
