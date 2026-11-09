import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import CamposFiltro from "@/components/CamposFiltro";
import { AVISO_MIGRACION, PARAMS_FILTRO, RE_COLUMNAS_NUEVAS, filtrarEjercicios, textoJugadores, usaColumnasNuevas, type FiltrosEjercicio } from "@/lib/ejercicio-filtros";
import MiniPizarra from "@/components/pizarra/Mini";
import CargarBiblioteca from "./CargarBiblioteca";
import CompletarDatos from "./CompletarDatos";
import { SEMILLA } from "@/lib/biblioteca-semilla";
import { Library, Plus, Users, Timer } from "lucide-react";

type Ej = {
  id: string; titulo: string; tipo: string; categoria: string | null; etiquetas: string[]; edades: string[];
  duracion: number | null; jugadores_min: number | null; jugadores_max?: number | null; preview: string | null; pizarra: unknown; descripcion: string | null;
  perfiles: { nombre: string | null } | null;
};

const POR_PAGINA = 60;

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; p?: string } & FiltrosEjercicio> }) {
  const sp = await searchParams;
  const { q, tipo, p } = sp;
  const filtros: FiltrosEjercicio = Object.fromEntries(PARAMS_FILTRO.map((k) => [k, sp[k]])) as FiltrosEjercicio;
  const { cat } = filtros;
  const pagina = Math.max(1, Number(p) || 1);
  const { supabase, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";

  const columnas = "id, titulo, tipo, categoria, etiquetas, edades, duracion, jugadores_min, preview, pizarra, descripcion, perfiles(nombre)";
  const construir = (cols: string, f: FiltrosEjercicio) => {
    let c = supabase.from("ejercicios").select(cols, { count: "exact" }).eq("en_biblioteca", true).order("categoria").order("titulo");
    if (tipo) c = c.eq("tipo", tipo);
    if (q) {
      const limpio = q.replace(/[%,(){}"]/g, " ").trim();
      c = c.or(`titulo.ilike.%${limpio}%,descripcion.ilike.%${limpio}%,etiquetas.cs.{"${limpio.toLowerCase()}"}`);
    }
    return filtrarEjercicios(c, f);
  };
  // Con más de 1000 ejercicios, por páginas (y mucho más rápido)
  const rango = [(pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1] as const;
  let { data, error, count } = await construir(`${columnas.replace("jugadores_min,", "jugadores_min, jugadores_max,")}`, filtros).range(...rango);
  let avisoSQL = false;
  if (error && RE_COLUMNAS_NUEVAS.test(error.message)) {
    // Aún no se ha ejecutado 0025: lista sin los filtros nuevos (solo edad y categoría de siempre) y aviso
    avisoSQL = usaColumnasNuevas(filtros);
    const r = await construir(columnas, { edad: filtros.edad }).range(...rango);
    ({ data, error, count } = r);
    if (cat && !error) {
      const r2 = await construir(columnas, { edad: filtros.edad }).eq("categoria", cat).range(...rango);
      ({ data, error, count } = r2);
    }
  }
  const total = count ?? 0, paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const base = (extra: Record<string, string>, sinCat = false) => new URLSearchParams({
    ...(q ? { q } : {}), ...(tipo ? { tipo } : {}),
    ...Object.fromEntries(PARAMS_FILTRO.filter((k) => filtros[k] && !(sinCat && k === "cat")).map((k) => [k, filtros[k] as string])),
    ...extra,
  });
  const enlace = (n: number) => `/biblioteca?${base({ p: String(n) })}`;
  const enlaceCat = (c: string) => `/biblioteca?${base({ cat: c }, true)}`;
  const faltaSQL = error && /en_biblioteca|edades/.test(error.message);
  const lista = (data ?? []) as unknown as Ej[];
  const filtrando = !!(q || tipo || PARAMS_FILTRO.some((k) => filtros[k]));


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
            <CamposFiltro f={filtros} />
            <select name="tipo" defaultValue={tipo ?? ""} className="campo !w-auto">
              <option value="">Ejercicios y sistemas</option>
              <option value="ejercicio">Ejercicios</option>
              <option value="sistema">Sistemas</option>
            </select>
            <button className="btn-secundario">Filtrar</button>
            {filtrando && <Link href="/biblioteca" className="self-center px-1 text-sm text-tinta/60 underline">Quitar filtros</Link>}
          </form>
          {avisoSQL && <p className="mt-2 text-sm text-red-700">{AVISO_MIGRACION}</p>}

          {/* Accesos rápidos por categoría */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <Link key={c} href={enlaceCat(c)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${cat === c ? "bg-azul text-white" : "bg-suave hover:bg-linea"}`}>{c}</Link>
            ))}
          </div>
          {total > 0 && <p className="mt-3 text-sm text-tinta/60">{total} {total === 1 ? "resultado" : "resultados"}{paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}</p>}

          {esCoord && !filtrando && <CompletarDatos />}
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
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-rojo sm:text-[11px]">{e.tipo === "sistema" ? "Sistema" : e.categoria ?? "Ejercicio"}</p>
                  <h3 className="line-clamp-2 text-xs font-semibold group-hover:text-azul sm:text-sm">{e.titulo}</h3>
                  <p className="mt-1 hidden flex-wrap items-center gap-x-2 text-xs text-tinta/60 sm:flex">
                    {e.duracion ? <span className="inline-flex items-center gap-0.5"><Timer size={11} /> {e.duracion}′</span> : null}
                    {textoJugadores(e.jugadores_min, e.jugadores_max) ? <span className="inline-flex items-center gap-0.5"><Users size={11} /> {textoJugadores(e.jugadores_min, e.jugadores_max)}</span> : null}
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
