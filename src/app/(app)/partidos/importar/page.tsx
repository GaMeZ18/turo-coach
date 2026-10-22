import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import Importador from "./Importador";

export default async function ImportarPage() {
  const { supabase } = await requireUser();
  const { data: temporada } = await supabase.from("temporadas").select("id, nombre").eq("actual", true).maybeSingle();
  const { data: equipos } = await supabase
    .from("equipos")
    .select("id, nombre, fcbq_nombre")
    .eq("temporada_id", temporada?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("nombre");
  const ids = (equipos ?? []).map((e) => e.id);
  const { data: existentes } = await supabase
    .from("partidos")
    .select("id, equipo_id, fecha, rival, local, lugar, competicion, fcbq_id")
    .in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div>
      <Link href="/partidos" className="text-sm text-tinta/60 hover:underline">← Partidos</Link>
      <h1 className="mt-1 text-2xl font-semibold">Importar de la FCBQ</h1>
      <p className="mt-1 max-w-3xl text-sm text-tinta/70">
        Trae los partidos de todos los equipos del club desde el <strong>calendario mensual del club</strong> de basquetcatala.cat.
        Puedes repetirlo cuando quieras: los partidos que ya estén se actualizan (hora, pista…) y no se duplican.
      </p>
      <ol className="tarjeta mt-4 max-w-3xl list-inside list-decimal space-y-1 p-4 text-sm text-tinta/80">
        <li>
          Abre{" "}
          <a href="https://www.basquetcatala.cat/partits/calendari_club_mensual/3373" target="_blank" rel="noreferrer" className="font-medium text-azul underline">
            el calendario mensual del club en la FCBQ
          </a>{" "}
          y elige el mes.
        </li>
        <li><strong>Opción A:</strong> pulsa <kbd className="rounded bg-suave px-1">Ctrl+A</kbd> y <kbd className="rounded bg-suave px-1">Ctrl+C</kbd>, y pégalo abajo.</li>
        <li><strong>Opción B (más fiable):</strong> guarda la página con <kbd className="rounded bg-suave px-1">Ctrl+S</kbd> («solo HTML») y súbela abajo.</li>
        <li>Revisa a qué equipo de Turó Coach corresponde cada equipo de la FCBQ y pulsa <strong>Importar</strong>.</li>
      </ol>
      <div className="mt-5">
        <Importador equipos={equipos ?? []} existentes={existentes ?? []} temporada={temporada?.nombre ?? null} />
      </div>
    </div>
  );
}
