import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { requireUser, veTorneos } from "@/lib/supabase/server";
import { CAMPOS_EQUIPO, CAMPOS_PARTIDO, CAMPOS_TORNEO, FORMATOS, type EquipoT, type PartidoT, type Torneo } from "@/lib/torneos";
import { Clasificaciones, Cuadro } from "../Vista";
import Equipos from "./Equipos";
import Calendario from "./Calendario";
import Ajustes from "./Ajustes";

export const metadata = { title: "Torneo" };

const PESTANAS = [["equipos", "Equipos"], ["partidos", "Partidos"], ["clasificacion", "Clasificación"], ["cuadro", "Cuadro"], ["ajustes", "Ajustes"]] as const;

export default async function TorneoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, perfil } = await requireUser();
  if (!veTorneos(perfil)) notFound();
  const [t, e, p] = await Promise.all([
    supabase.from("torneos").select(CAMPOS_TORNEO).eq("id", id).maybeSingle(),
    supabase.from("torneo_equipos").select(CAMPOS_EQUIPO).eq("torneo_id", id).order("created_at"),
    supabase.from("torneo_partidos").select(CAMPOS_PARTIDO).eq("torneo_id", id),
  ]);
  if (!t.data) notFound();
  const torneo = t.data as Torneo, equipos = (e.data ?? []) as EquipoT[], partidos = (p.data ?? []) as PartidoT[];
  const pestanas = PESTANAS.filter(([k]) => !(k === "clasificacion" && torneo.formato === "eliminatoria") && !(k === "cuadro" && torneo.formato === "liga" && !partidos.some((x) => x.fase === "eliminatoria")));
  const v = pestanas.some(([k]) => k === sp.v) ? sp.v! : equipos.length < 2 ? "equipos" : "partidos";
  return (
    <div className="max-w-5xl">
      <Link href="/torneos" className="inline-flex items-center gap-1 text-sm text-azul"><ArrowLeft size={14} /> Torneos</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Trophy className="text-azul" /> {torneo.nombre}</h1>
      <p className="text-sm text-tinta/60">{[torneo.categoria, torneo.lugar, FORMATOS[torneo.formato], `${equipos.length} equipos`, `${partidos.filter((x) => x.puntos_local !== null).length}/${partidos.length} partidos jugados`].filter(Boolean).join(" · ")}</p>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-linea">
        {pestanas.map(([k, n]) => (
          <Link key={k} href={`/torneos/${id}?v=${k}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${v === k ? "border-azul text-azul" : "border-transparent text-tinta/60"}`}>{n}</Link>
        ))}
      </nav>
      <div className="mt-4">
        {v === "equipos" && <Equipos torneo={torneo} equipos={equipos} />}
        {v === "partidos" && <Calendario torneo={torneo} equipos={equipos} partidos={partidos} />}
        {v === "clasificacion" && <Clasificaciones torneo={torneo} equipos={equipos} partidos={partidos} />}
        {v === "cuadro" && <Cuadro equipos={equipos} partidos={partidos} />}
        {v === "ajustes" && <Ajustes torneo={torneo} />}
      </div>
    </div>
  );
}
