import { notFound } from "next/navigation";
import { requireUser, veMaterial } from "@/lib/supabase/server";
import Inventario from "./Inventario";
import type { Lugar, Material } from "./actions";

export const metadata = { title: "Material" };

export default async function MaterialPage() {
  const { supabase, perfil } = await requireUser();
  if (!veMaterial(perfil)) notFound();
  const [{ data: lugares }, { data: items }] = await Promise.all([
    supabase.from("material_lugares").select("id, nombre, orden").order("orden").order("created_at"),
    supabase.from("material").select("id, lugar_id, nombre, categoria, cantidad, rotos, minimo, notas, contado_at").order("nombre"),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Material</h1>
        <p className="text-sm text-tinta/60">Inventario por sitio. Ve a cada sitio, cuenta con + y − y marca lo que esté roto. Solo lo ves tú.</p>
      </div>
      <Inventario lugaresIni={(lugares ?? []) as Lugar[]} itemsIni={(items ?? []) as Material[]} />
    </div>
  );
}
