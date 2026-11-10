import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { aplicarFiltros } from "@/lib/rasgos-ejercicio";
import FiltrosEjercicios, { type ParamsFiltro } from "@/components/FiltrosEjercicios";
import { Heart, Library, Lock, Plus, Star } from "lucide-react";
import MiniPizarra from "@/components/pizarra/Mini";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[];
  duracion: number | null; preview: string | null; visibilidad: string; autor_id: string; pizarra?: unknown; megusta?: number;
  perfiles: { nombre: string | null } | null;
};

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<ParamsFiltro & { cat?: string; mios?: string; fav?: string }>;
}) {
  const sp = await searchParams;
  const { q, tipo, mios, fav } = sp;
  const foco = sp.foco ?? sp.cat;
  const { supabase, user } = await requireUser();

  const { data: favs } = await supabase.from("ejercicio_favoritos").select("ejercicio_id").eq("perfil_id", user.id);
  const misFavs = new Set((favs ?? []).map((f) => f.ejercicio_id as string));
  let consulta = supabase
    .from("ejercicios")
    .select("id, titulo, tipo, categoria, etiquetas, duracion, preview, visibilidad, autor_id, pizarra, megusta, perfiles(nombre)")
    .order("updated_at", { ascending: false })
    .limit(120);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  consulta = aplicarFiltros(consulta, { ...sp, foco });
  if (mios) consulta = consulta.eq("autor_id", user.id);
  if (fav) consulta = consulta.in("id", misFavs.size ? [...misFavs] : ["00000000-0000-0000-0000-000000000000"]);
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
        <div className="flex gap-2">
          <Link href="/biblioteca" className="btn-secundario"><Library size={16} /> Biblioteca del club</Link>
          <Link href="/ejercicios/nuevo" className="btn-primario"><Plus size={16} /> Nuevo</Link>
        </div>
      </div>

      <form className="tarjeta mt-5 flex flex-wrap gap-2 p-3">
        <FiltrosEjercicios p={{ ...sp, foco }} extra={
          <label className="flex items-center gap-1.5 px-1 text-sm">
            <input type="checkbox" name="mios" value="1" defaultChecked={!!mios} /> Solo míos
          </label>} extra2={
          <label className="flex items-center gap-1.5 px-1 text-sm">
            <input type="checkbox" name="fav" value="1" defaultChecked={!!fav} /> <Star size={14} className="fill-amber-400 text-amber-500" /> Favoritos
          </label>} />
      </form>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {lista.map((e) => (
          <Link key={e.id} href={`/ejercicios/${e.id}`} className="tarjeta overflow-hidden transition hover:shadow-md">
            <div className="flex aspect-[15/14] items-center justify-center bg-suave">
              {e.preview ? (
                <img src={e.preview} alt="" className="h-full w-full object-contain" loading="lazy" />
              ) : e.pizarra ? (
                <MiniPizarra pizarra={e.pizarra} className="h-full w-full" />
              ) : (
                <span className="text-xs text-tinta/40">Sin pizarra</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-1">
                <h2 className="line-clamp-2 text-sm font-medium">{e.titulo}</h2>
                <span className="flex shrink-0 items-center gap-0.5">
                  {misFavs.has(e.id) && <Star size={13} className="mt-0.5 fill-amber-400 text-amber-500" />}
                  {e.visibilidad === "privado" && <Lock size={13} className="mt-0.5 text-tinta/40" />}
                </span>
              </div>
              <p className="mt-1 text-xs text-tinta/60">
                {e.tipo === "sistema" ? "Sistema" : e.tipo === "fisico" ? "Prep. física" : e.categoria ?? "Ejercicio"}
                {e.duracion ? ` · ${e.duracion}′` : ""}
                {e.megusta ? <span className="ml-1 inline-flex items-center gap-0.5 text-rojo"><Heart size={10} className="fill-current" />{e.megusta}</span> : null}
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
