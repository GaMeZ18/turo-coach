import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import { EDADES } from "@/lib/edades";
import MiniPizarra from "@/components/pizarra/Mini";
import Enviar from "@/components/Enviar";
import { cargarBibliotecaInicial } from "../ejercicios/actions";
import { SEMILLA } from "@/lib/biblioteca-semilla";
import { Library, Plus, Users, Timer } from "lucide-react";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[]; edades: string[];
  duracion: number | null; jugadores_min: number | null; preview: string | null; pizarra: unknown; descripcion: string | null;
  perfiles: { nombre: string | null } | null;
};

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; edad?: string; tipo?: string }> }) {
  const { q, cat, edad, tipo } = await searchParams;
  const { supabase, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";

  let consulta = supabase
    .from("ejercicios")
    .select("id, titulo, tipo, categoria, etiquetas, edades, duracion, jugadores_min, preview, pizarra, descripcion, perfiles(nombre)")
    .eq("en_biblioteca", true)
    .order("categoria")
    .order("titulo");
  if (cat) consulta = consulta.eq("categoria", cat);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (edad) consulta = consulta.contains("edades", [edad]);
  if (q) {
    const limpio = q.replace(/[%,(){}"]/g, " ").trim();
    consulta = consulta.or(`titulo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%,etiquetas.cs.{"${limpio.toLowerCase()}"}`);
  }
  const { data, error } = await consulta;
  const faltaSQL = error && /en_biblioteca|edades/.test(error.message);
  const lista = (data ?? []) as unknown as Ej[];
  const filtrando = !!(q || cat || edad || tipo);


  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Library className="text-azul" /> Biblioteca de ejercicios</h1>
          <p className="max-w-2xl text-sm text-tinta/60">
            Los ejercicios del club, con su pizarra. Ábrelos para verlos animados, cópialos para adaptarlos o añádelos a un entreno.
            Cualquier entrenador puede publicar los suyos marcando «Publicar en la Biblioteca del club».
          </p>
        </div>
        <Link href="/ejercicios/nuevo" className="btn-primario"><Plus size={16} /> Crear ejercicio</Link>
      </div>

      {faltaSQL ? (
        <p className="tarjeta mt-5 p-4 text-sm text-red-700">Falta preparar la base de datos: ejecuta <code>0007_biblioteca.sql</code> en el SQL Editor de Supabase.</p>
      ) : (
        <>
          <form className="tarjeta mt-5 flex flex-wrap gap-2 p-3">
            <input name="q" defaultValue={q} placeholder="Buscar: entrada, 2c1, zona…" className="campo min-w-48 flex-1" />
            <select name="cat" defaultValue={cat ?? ""} className="campo !w-auto">
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select name="edad" defaultValue={edad ?? ""} className="campo !w-auto">
              <option value="">Todas las edades</option>
              {EDADES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select name="tipo" defaultValue={tipo ?? ""} className="campo !w-auto">
              <option value="">Ejercicios y sistemas</option>
              <option value="ejercicio">Ejercicios</option>
              <option value="sistema">Sistemas</option>
            </select>
            <button className="btn-secundario">Filtrar</button>
            {filtrando && <Link href="/biblioteca" className="self-center px-1 text-sm text-tinta/60 underline">Quitar filtros</Link>}
          </form>

          {esCoord && !filtrando && (
            <form action={cargarBibliotecaInicial} className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-oro/15 p-3 text-sm">
              <span className="flex-1">
                {lista.length ? `Añade los ejercicios iniciales del club que falten (hay ${SEMILLA.length}; no se duplican).` : `La biblioteca está vacía. Carga los ${SEMILLA.length} ejercicios iniciales del club (con pizarra) para empezar.`}
              </span>
              <Enviar className="btn-primario !py-1.5">Cargar ejercicios iniciales</Enviar>
            </form>
          )}

          {/* Una sola rejilla de 3 columnas (ordenada por categoría) para que no queden huecos */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {lista.map((e) => (
              <Link key={e.id} href={`/ejercicios/${e.id}`} className="tarjeta group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex aspect-[15/14] items-center justify-center bg-suave">
                  {e.preview ? <img src={e.preview} alt="" className="h-full w-full object-contain" loading="lazy" />
                    : e.pizarra ? <MiniPizarra pizarra={e.pizarra} className="h-full w-full" />
                    : <span className="text-xs text-tinta/40">Sin pizarra</span>}
                </div>
                <div className="p-2 sm:p-3">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-rojo sm:text-[11px]">{e.tipo === "sistema" ? "Sistema" : e.categoria ?? "Ejercicio"}</p>
                  <h3 className="line-clamp-2 text-xs font-semibold group-hover:text-azul sm:text-sm">{e.titulo}</h3>
                  <p className="mt-1 hidden flex-wrap items-center gap-x-2 text-xs text-tinta/60 sm:flex">
                    {e.duracion ? <span className="inline-flex items-center gap-0.5"><Timer size={11} /> {e.duracion}′</span> : null}
                    {e.jugadores_min ? <span className="inline-flex items-center gap-0.5"><Users size={11} /> {e.jugadores_min}</span> : null}
                  </p>
                  {e.edades?.length > 0 && (
                    <div className="mt-1.5 hidden flex-wrap gap-1 sm:flex">
                      {e.edades.map((x) => <span key={x} className="rounded-full bg-azul/10 px-1.5 py-0.5 text-[10px] font-medium text-azul">{x}</span>)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {lista.length === 0 && (
            <p className="mt-8 text-center text-sm text-tinta/50">
              {filtrando ? "No hay ejercicios con esos filtros." : "Todavía no hay ejercicios en la biblioteca."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
