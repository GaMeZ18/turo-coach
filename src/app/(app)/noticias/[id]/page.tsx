import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/fechas";
import TextoRico from "@/components/TextoRico";
import Enviar from "@/components/Enviar";
import { borrarNoticia } from "../../comunicados/actions";
import { Trash2 } from "lucide-react";
import Interaccion from "./Interaccion";

export default async function Noticia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil, user } = await requireUser();
  const [{ data }, { data: reR }, { data: coR }] = await Promise.all([
    supabase.from("noticias").select("id, titulo, resumen, contenido, publicada_en, perfiles(nombre)").eq("id", id).maybeSingle(),
    supabase.from("noticia_reacciones").select("emoji, perfil_id, perfiles(nombre)").eq("noticia_id", id),
    supabase.from("noticia_comentarios").select("id, perfil_id, texto, gif, created_at, perfiles(nombre)").eq("noticia_id", id).order("created_at"),
  ]);
  type ConPerfil = { perfiles: { nombre: string | null } | null };
  const reacciones = ((reR ?? []) as unknown as ({ emoji: string; perfil_id: string } & ConPerfil)[]).map((r) => ({ emoji: r.emoji, perfil_id: r.perfil_id, nombre: r.perfiles?.nombre ?? "—" }));
  const comentarios = ((coR ?? []) as unknown as ({ id: string; perfil_id: string; texto: string; gif: string | null; created_at: string } & ConPerfil)[]).map((c) => ({ ...c, nombre: c.perfiles?.nombre ?? "—" }));
  if (!data) notFound();
  const n = data as unknown as { id: string; titulo: string; resumen: string; contenido: string; publicada_en: string; perfiles: { nombre: string | null } | null };
  return (
    <article className="max-w-3xl">
      <Link href="/noticias" className="text-sm text-tinta/60 hover:underline">← Noticias</Link>
      <p className="mt-2 text-xs capitalize text-tinta/50">{fechaLarga(n.publicada_en)}{n.perfiles?.nombre ? ` · ${n.perfiles.nombre}` : ""}</p>
      <h1 className="mt-1 text-2xl font-semibold">{n.titulo}</h1>
      {n.resumen && <p className="mt-2 text-tinta/70">{n.resumen}</p>}
      <TextoRico texto={n.contenido} className="tarjeta mt-4 p-5 leading-relaxed" />
      <Interaccion noticiaId={n.id} yo={user.id} coordinador={perfil.rol === "coordinador"} reacciones={reacciones} comentarios={comentarios} />
      {perfil.rol === "coordinador" && (
        <form action={borrarNoticia} className="mt-4">
          <input type="hidden" name="id" value={n.id} />
          <Enviar className="btn-peligro !py-1.5 text-sm" confirmar="¿Borrar esta noticia? No se puede deshacer."><Trash2 size={15} /> Borrar noticia</Enviar>
        </form>
      )}
    </article>
  );
}
