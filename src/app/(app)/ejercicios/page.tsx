import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import CamposFiltro from "@/components/CamposFiltro";
import { AVISO_MIGRACION, PARAMS_FILTRO, RE_COLUMNAS_NUEVAS, filtrarEjercicios, usaColumnasNuevas, type FiltrosEjercicio } from "@/lib/ejercicio-filtros";
import { Library, Lock, Plus } from "lucide-react";
import MiniPizarra from "@/components/pizarra/Mini";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[];
  duracion: number | null; preview: string | null; visibilidad: string; autor_id: string; pizarra?: unknown;
  perfiles: { nombre: string | null } | null;
};

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; mios?: string } & FiltrosEjercicio>;
}) {
  const sp = await searchParams;
  const { q, tipo, mios } = sp;
  const filtros: FiltrosEjercicio = Object.fromEntries(PARAMS_FILTRO.map((k) => [k, sp[k]])) as FiltrosEjercicio;
  const { supabase, user } = await requireUser();

  let consulta = supabase
    .from("ejercicios")
    .select("id, titulo, tipo, categoria, etiquetas, duracion, preview, visibilidad, autor_id, pizarra, perfiles(nombre)")
    .order("updated_at", { ascending: false })
    .limit(120);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (mios) consulta = consulta.eq("autor_id", user.id);
  if (q) {
    const limpio = q.replace(/[%,(){}"]/g, " ").trim();
    consulta = consulta.or(`titulo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%,etiquetas.cs.{"${limpio.toLowerCase()}"}`);
  }
  const { data: d1, error } = await filtrarEjercicios(consulta, filtros);
  let data = d1, avisoSQL = false;
  if (error && RE_COLUMNAS_NUEVAS.test(error.message) && usaColumnasNuevas(filtros)) {
    // Aún no se ha ejecutado 0025: se enseña la lista sin esos filtros y se avisa
    avisoSQL = true;
    let sin = supabase
      .from("ejercicios")
      .select("id, titulo, tipo, categoria, etiquetas, duracion, preview, visibilidad, autor_id, pizarra, perfiles(nombre)")
      .order("updated_at", { ascending: false })
      .limit(120);
    if (tipo) sin = sin.eq("tipo", tipo);
    if (filtros.cat) sin = sin.eq("categoria", filtros.cat);
    if (mios) sin = sin.eq("autor_id", user.id);
    data = (await sin).data;
  }
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
        <input name="q" defaultValue={q} placeholder="Buscar por título, texto o etiqueta" className="campo min-w-48 flex-1" />
        <select name="tipo" defaultValue={tipo ?? ""} className="campo !w-auto">
          <option value="">Todo</option>
          <option value="ejercicio">Ejercicios</option>
          <option value="sistema">Sistemas</option>
        </select>
        <CamposFiltro f={filtros} />
        <label className="flex items-center gap-1.5 px-1 text-sm">
          <input type="checkbox" name="mios" value="1" defaultChecked={!!mios} /> Solo míos
        </label>
        <button className="btn-secundario">Filtrar</button>
      </form>
      {avisoSQL && <p className="mt-2 text-sm text-red-700">{AVISO_MIGRACION}</p>}

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
