"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { EMOJIS_REACCION } from "@/lib/noticias";

/** Poner o quitar mi reacción */
export async function reaccionar(noticiaId: string, emoji: string) {
  if (!EMOJIS_REACCION.includes(emoji)) return;
  const { supabase, user } = await requireUser();
  const { data: ya } = await supabase.from("noticia_reacciones").select("emoji").eq("noticia_id", noticiaId).eq("perfil_id", user.id).eq("emoji", emoji).maybeSingle();
  if (ya) await supabase.from("noticia_reacciones").delete().eq("noticia_id", noticiaId).eq("perfil_id", user.id).eq("emoji", emoji);
  else await supabase.from("noticia_reacciones").insert({ noticia_id: noticiaId, perfil_id: user.id, emoji });
  revalidatePath(`/noticias/${noticiaId}`);
  revalidatePath("/noticias");
}

/** GIF válido: un enlace https a una imagen GIF (Giphy, Tenor…) o un GIF subido (data URL, máx. ~1 MB) */
const gifValido = (g: string) =>
  (/^https:\/\/\S+$/i.test(g) && g.length < 600) || (/^data:image\/(gif|webp);base64,/.test(g) && g.length < 1_400_000);

export async function comentar(noticiaId: string, texto: string, gif: string | null): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const t = texto.trim().slice(0, 500);
  const g = gif?.trim() || null;
  if (!t && !g) return { error: "Escribe un comentario." };
  if (g && !gifValido(g)) return { error: "Ese GIF no vale: pega el enlace de la imagen (.gif) o sube uno de menos de 1 MB." };
  const { error } = await supabase.from("noticia_comentarios").insert({ noticia_id: noticiaId, perfil_id: user.id, texto: t, gif: g });
  if (error) return { error: "No se ha podido publicar. Prueba otra vez." };
  revalidatePath(`/noticias/${noticiaId}`);
  revalidatePath("/noticias");
  return {};
}

export async function borrarComentario(noticiaId: string, id: string) {
  const { supabase } = await requireUser();
  await supabase.from("noticia_comentarios").delete().eq("id", id);
  revalidatePath(`/noticias/${noticiaId}`);
  revalidatePath("/noticias");
}
