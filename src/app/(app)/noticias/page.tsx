import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/fechas";
import { Newspaper } from "lucide-react";

/** Noticias del club: lo que publica coordinación, para consultarlo cuando se quiera */
export default async function Noticias() {
  const { supabase, perfil } = await requireUser();
  const ahora = new Date().toISOString();
  const r1 = await supabase.from("noticias").select("id, titulo, resumen, contenido, publicada_en, perfiles!noticias_autor_id_fkey(nombre), noticia_comentarios(count), noticia_reacciones(count)").lte("publicada_en", ahora).order("publicada_en", { ascending: false }).limit(100);
  // Si los contadores fallan por lo que sea, las noticias se enseñan igual (sin contadores)
  const data: unknown[] | null = r1.error
    ? (await supabase.from("noticias").select("id, titulo, resumen, contenido, publicada_en, perfiles!noticias_autor_id_fkey(nombre)").lte("publicada_en", ahora).order("publicada_en", { ascending: false }).limit(100)).data
    : r1.data;
  const lista = (data ?? []) as unknown as { id: string; titulo: string; resumen: string; contenido: string; publicada_en: string; perfiles: { nombre: string | null } | null; noticia_comentarios?: { count: number }[]; noticia_reacciones?: { count: number }[] }[];
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Newspaper className="text-azul" /> Noticias del club</h1>
        {perfil.rol === "coordinador" && <Link href="/comunicados" className="btn-secundario !py-1.5 text-sm">Publicar una noticia</Link>}
      </div>
      <ul className="space-y-3">
        {lista.map((n) => (
          <li key={n.id}>
            <Link href={`/noticias/${n.id}`} className="tarjeta block p-4 transition hover:shadow-md">
              <p className="text-xs capitalize text-tinta/50">{fechaLarga(n.publicada_en)}{n.perfiles?.nombre ? ` · ${n.perfiles.nombre}` : ""}</p>
              <p className="mt-0.5 text-lg font-semibold">{n.titulo}</p>
              <p className="mt-1 line-clamp-3 text-sm text-tinta/70">{n.resumen || n.contenido.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "")}</p>
              {((n.noticia_reacciones?.[0]?.count ?? 0) > 0 || (n.noticia_comentarios?.[0]?.count ?? 0) > 0) && (
                <p className="mt-2 flex gap-3 text-xs text-tinta/50">
                  {(n.noticia_reacciones?.[0]?.count ?? 0) > 0 && <span>❤️ {n.noticia_reacciones![0].count}</span>}
                  {(n.noticia_comentarios?.[0]?.count ?? 0) > 0 && <span>💬 {n.noticia_comentarios![0].count}</span>}
                </p>
              )}
            </Link>
          </li>
        ))}
        {!lista.length && <li className="tarjeta p-4 text-sm text-tinta/50">Todavía no hay noticias.</li>}
      </ul>
    </div>
  );
}
