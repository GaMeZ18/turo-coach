import { createClient } from "@/lib/supabase/server";

/** Sugerencias de pista para los campos «Pista» (input list="lista-pistas") */
export default async function ListaPistas() {
  const supabase = await createClient();
  const { data } = await supabase.from("pistas").select("nombre").order("orden").order("nombre");
  return <datalist id="lista-pistas">{(data ?? []).map((p) => <option key={p.nombre} value={p.nombre} />)}</datalist>;
}
