import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import { Lock, Plus } from "lucide-react";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[];
  duracion: number | null; preview: string | null; visibilidad: string; autor_id: string;
  perfiles: { nombre: string | null } | null;
};

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; cat?: string; mios?: string }>;
}) {
  const { q, tipo, cat, mios } = await searchParams;
  const { supabase, user } = await requireUser();

  let consulta = supabase
    .from("ejercicios")
    .select("id, titulo, tipo, categoria, etiquetas, duracion, preview, visibilidad, autor_id, perfiles(nombre)")
    .order("updated_at", { ascending: false })
    .limit(120);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (cat) consulta = consulta.eq("categoria", cat);
  if (mios) consulta = consulta.eq("autor_id", user.id);
  if (q) {
    const limpio = q.replace(/[%,(){}"]/g, " ").trim();
    consulta = consulta.or(`titulo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%,etiquetas.cs.{"${limpio.toLowerCase()}"}`);
  }
  const { data } = await consulta;
  const lista = (data ?? []) as unknown as Ej[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Ejercicios y sistemas</h1>
        <Link href="/ejercicios/nuevo" className="btn-primario"><Plus size={16} /> Nuevo</Link>
      </div>

      <form className="tarjeta mt-5 flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Buscar por título, texto o etiqueta" className="campo min-w-48 flex-1" />
        <select name="tipo" defaultValue={tipo ?? ""} className="campo !w-auto">
          <option value="">Todo</option>
          <option value="ejercicio">Ejercicios</option>
          <option value="sistema">Sistemas</option>
        </select>
        <select name="cat" defaultValue={cat ?? ""} className="campo !w-auto">
          <option value="">Cualquier categoría</option>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 px-1 text-sm">
          <input type="checkbox" name="mios" value="1" defaultChecked={!!mios} /> Solo míos
        </label>
        <button className="btn-secundario">Filtrar</button>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((e) => (
          <Link key={e.id} href={`/ejercicios/${e.id}`} className="tarjeta overflow-hidden transition hover:shadow-md">
            <div className="flex aspect-[15/14] items-center justify-center bg-suave">
              {e.preview ? (
                <img src={e.preview} alt="" className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <span className="text-xs text-tinta/40">Sin pizarra</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-1">
                <h2 className="line-clamp-2 text-sm font-medium">{e.titulo}</h2>
                {e.visibilidad === "privado" && <Lock size={13} className="mt-0.5 shrink-0 text-tinta/40" />}
              </div>
              <p className="mt-1 text-xs text-tinta/60">
                {e.tipo === "sistema" ? "Sistema" : e.categoria ?? "Ejercicio"}
                {e.duracion ? ` · ${e.duracion}′` : ""}
              </p>
              <p className="mt-0.5 truncate text-xs text-tinta/40">{e.perfiles?.nombre}</p>
            </div>
          </Link>
        ))}
      </div>
      {lista.length === 0 && (
        <p className="mt-8 text-center text-sm text-tinta/50">
          No hay resultados. <Link href="/ejercicios/nuevo" className="text-club underline">Crea el primero</Link>.
        </p>
      )}
    </div>
  );
}
