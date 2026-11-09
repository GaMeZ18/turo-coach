import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import { aplicarFiltros } from "@/lib/rasgos-ejercicio";
import FiltrosEjercicios, { type ParamsFiltro } from "@/components/FiltrosEjercicios";
import MiniPizarra from "@/components/pizarra/Mini";
import CargarBiblioteca from "./CargarBiblioteca";
import { SEMILLA } from "@/lib/biblioteca-semilla";
import { Library, Plus, Users, Timer } from "lucide-react";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[]; edades: string[];
  duracion: number | null; jugadores_min: number | null; preview: string | null; pizarra: unknown; descripcion: string | null;
  perfiles: { nombre: string | null } | null;
};

const POR_PAGINA = 60;

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<ParamsFiltro & { cat?: string; p?: string; autor?: string }> }) {
  const sp = await searchParams;
  const { q, edad, tipo, p } = sp;
  const cat = sp.foco ?? sp.cat;
  const pagina = Math.max(1, Number(p) || 1);
  const { supabase, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";

  // Por creador: se ven todos sus ejercicios visibles (estén o no en la biblioteca), para poder copiarle alguno
  const autor = sp.autor && /^[0-9a-f-]{36}$/i.test(sp.autor) ? sp.autor : "";
  let consulta = supabase
    .from("ejercicios")
    .select("id, titulo, tipo, categoria, etiquetas, edades, duracion, jugadores_min, preview, pizarra, descripcion, perfiles(nombre)", { count: "exact" })
    .order("categoria")
    .order("titulo");
  consulta = autor ? consulta.eq("autor_id", autor) : consulta.eq("en_biblioteca", true);
  const { data: autoresR } = await supabase.from("ejercicios").select("autor_id, perfiles(nombre)").not("autor_id", "is", null).limit(5000);
  const autores = [...((autoresR ?? []) as unknown as { autor_id: string; perfiles: { nombre: string | null } | null }[]).reduce((m, x) => {
    const a = m.get(x.autor_id) ?? { id: x.autor_id, nombre: x.perfiles?.nombre?.trim() || "Sin nombre", n: 0 };
    a.n++; return m.set(x.autor_id, a);
  }, new Map<string, { id: string; nombre: string; n: number }>()).values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (tipo) consulta = consulta.eq("tipo", tipo);
  consulta = aplicarFiltros(consulta, { ...sp, foco: cat });
  if (q) {
    const limpio = q.replace(/[%,(){}"]/g, " ").trim();
    consulta = consulta.or(`titulo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%,etiquetas.cs.{"${limpio.toLowerCase()}"}`);
  }
  // Con más de 1000 ejercicios, por páginas (y mucho más rápido)
  const { data, error, count } = await consulta.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const total = count ?? 0, paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtros = Object.fromEntries(Object.entries({ q, foco: cat, edad, tipo, pos: sp.pos, formato: sp.formato, jug: sp.jug, balones: sp.balones, autor }).filter(([, v]) => v)) as Record<string, string>;
  const enlace = (n: number) => `/biblioteca?${new URLSearchParams({ ...filtros, p: String(n) })}`;
  const enlaceCat = (c: string) => `/biblioteca?${new URLSearchParams({ ...filtros, foco: c })}`;
  const faltaSQL = error && /en_biblioteca|edades/.test(error.message);
  const lista = (data ?? []) as unknown as Ej[];
  const filtrando = Object.keys(filtros).length > 0;


  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Library className="text-azul" /> Biblioteca de ejercicios</h1>
          <p className="max-w-2xl text-sm text-tinta/60">
            Los ejercicios del club, con su pizarra. Ábrelos para verlos animados, cópialos para adaptarlos o añádelos a un entreno.
            Cualquier entrenador puede publicar los suyos marcando «Publicar en la Biblioteca del club».
          </p>
          {autor && <p className="mt-1 text-sm font-semibold text-azul">Ejercicios de {autores.find((x) => x.id === autor)?.nombre ?? "este entrenador"} (también los que no ha publicado en la biblioteca)</p>}
        </div>
        <Link href="/ejercicios/nuevo" className="btn-primario"><Plus size={16} /> Crear ejercicio</Link>
      </div>

      {faltaSQL ? (
        <p className="tarjeta mt-5 p-4 text-sm text-red-700">Falta preparar la base de datos: ejecuta <code>0007_biblioteca.sql</code> en el SQL Editor de Supabase.</p>
      ) : (
        <>
          <form className="tarjeta mt-5 flex flex-wrap gap-2 p-3">
            <FiltrosEjercicios p={{ ...sp, foco: cat }} extra={
              <select name="autor" defaultValue={autor} className="campo !w-auto" aria-label="Creador">
                <option value="">Todos los creadores</option>
                {autores.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.n}</option>)}
              </select>} />
            {filtrando && <Link href="/biblioteca" className="self-center px-1 text-sm text-tinta/60 underline">Quitar filtros</Link>}
          </form>

          {/* Accesos rápidos por categoría */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <Link key={c} href={enlaceCat(c)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${cat === c ? "bg-azul text-white" : "bg-suave hover:bg-linea"}`}>{c}</Link>
            ))}
          </div>
          {total > 0 && <p className="mt-3 text-sm text-tinta/60">{total} {total === 1 ? "resultado" : "resultados"}{paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}</p>}

          {esCoord && !filtrando && (
            <CargarBiblioteca texto={lista.length ? `Añade los ejercicios iniciales del club que falten y pone al día los ya cargados (pizarras, textos y vídeos). Hay ${SEMILLA.length} entre ejercicios y sistemas; no se duplican.` : `La biblioteca está vacía. Carga los ${SEMILLA.length} ejercicios iniciales del club (con pizarra) para empezar.`} />
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
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-rojo sm:text-[11px]">{e.tipo === "sistema" ? "Sistema" : e.tipo === "fisico" ? "Físico" : e.categoria ?? "Ejercicio"}</p>
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
          {paginas > 1 && (
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm">
              {pagina > 1 && <Link href={enlace(pagina - 1)} className="btn-secundario !px-3 !py-1.5">← Anterior</Link>}
              {Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => n === 1 || n === paginas || Math.abs(n - pagina) <= 2).map((n, i, l) => (
                <span key={n} className="flex items-center gap-1.5">
                  {i > 0 && n - l[i - 1] > 1 && <span className="text-tinta/40">…</span>}
                  <Link href={enlace(n)} className={`rounded-md px-2.5 py-1.5 ${n === pagina ? "bg-azul font-semibold text-white" : "hover:bg-suave"}`}>{n}</Link>
                </span>
              ))}
              {pagina < paginas && <Link href={enlace(pagina + 1)} className="btn-secundario !px-3 !py-1.5">Siguiente →</Link>}
            </nav>
          )}
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
