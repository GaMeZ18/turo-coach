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
    .select("id, equipo_id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado, fcbq_id")
    .in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div>
      <Link href="/partidos" className="text-sm text-tinta/60 hover:underline">← Partidos</Link>
      <h1 className="mt-1 text-2xl font-semibold">Importar de la FCBQ</h1>
      <p className="mt-1 max-w-3xl text-sm text-tinta/70">
        Trae a Turó Coach los partidos y los <strong>resultados</strong> de basquetcatala.cat. Puedes repetirlo cuando quieras:
        lo que ya esté se actualiza (hora, pista, marcador…) y no se duplica.
      </p>
      <div className="mt-5">
        <Importador equipos={equipos ?? []} existentes={existentes ?? []} temporada={temporada?.nombre ?? null} />
      </div>
    </div>
  );
}
