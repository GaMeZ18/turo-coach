import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import FormEjercicio from "../FormEjercicio";

export default async function NuevoEjercicio({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; entreno?: string }>;
}) {
  const { supabase } = await requireUser();
  const { desde, entreno } = await searchParams;

  // ?entreno=<id> → se crea desde un entrenamiento y se añade a él al guardar
  const { data: e } = entreno
    ? await supabase.from("entrenamientos").select("id, titulo").eq("id", entreno).maybeSingle()
    : { data: null };

  return (
    <div>
      {e ? (
        <Link href={`/entrenamientos/${e.id}`} className="text-sm text-tinta/60 hover:underline">← {e.titulo ?? "Entrenamiento"}</Link>
      ) : (
        <Link href="/ejercicios" className="text-sm text-tinta/60 hover:underline">← Ejercicios</Link>
      )}
      <h1 className="mb-1 mt-1 text-2xl font-semibold">Nuevo ejercicio</h1>
      {e && <p className="mb-4 text-sm text-tinta/60">Al guardarlo se añadirá a «{e.titulo ?? "este entrenamiento"}».</p>}
      {!e && <div className="mb-4" />}
      {/* ?desde=pizarra → carga el borrador de la pizarra libre */}
      <FormEjercicio desdePizarra={desde === "pizarra"} entrenoId={e?.id} />
    </div>
  );
}
