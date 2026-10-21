import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import FormEjercicio from "../FormEjercicio";

export default async function NuevoEjercicio({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  await requireUser();
  const { desde } = await searchParams;
  return (
    <div>
      <Link href="/ejercicios" className="text-sm text-tinta/60 hover:underline">← Ejercicios</Link>
      <h1 className="mb-5 mt-1 text-2xl font-semibold">Nuevo ejercicio</h1>
      {/* ?desde=pizarra → la página carga el borrador guardado en la pizarra libre */}
      <FormEjercicio desdePizarra={desde === "pizarra"} />
    </div>
  );
}
