import type { Metadata } from "next";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import Cabecera from "@/components/publico/Cabecera";
import AutoRefresco from "@/components/AutoRefresco";
import { CAMPOS_EQUIPO, CAMPOS_PARTIDO, CAMPOS_TORNEO, type EquipoT, type PartidoT, type Torneo } from "@/lib/torneos";
import { Clasificaciones, Cuadro, Partidos } from "@/app/(app)/torneos/Vista";

export const dynamic = "force-dynamic";

// Página pública de un torneo (solo si está marcado como público)
const cargar = cache(async (token: string) => {
  const db = adminClient();
  if (!db || !/^[a-f0-9]{10,40}$/.test(token)) return null;
  const { data: t } = await db.from("torneos").select(CAMPOS_TORNEO).eq("token", token).eq("publico", true).maybeSingle();
  if (!t) return null;
  const [{ data: e }, { data: p }] = await Promise.all([
    db.from("torneo_equipos").select(CAMPOS_EQUIPO).eq("torneo_id", t.id).order("nombre"),
    db.from("torneo_partidos").select(CAMPOS_PARTIDO).eq("torneo_id", t.id),
  ]);
  return { torneo: t as Torneo, equipos: (e ?? []) as EquipoT[], partidos: (p ?? []) as PartidoT[] };
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const d = await cargar((await params).token);
  return { title: d ? `${d.torneo.nombre} · CB Turó` : "Torneo", robots: { index: false } };
}

export default async function TorneoPublico({ params }: { params: Promise<{ token: string }> }) {
  const d = await cargar((await params).token);
  if (!d) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Torneo no disponible</h1><p className="mt-2 text-sm text-tinta/60">El enlace no es válido o el torneo ya no es público.</p></main>;
  const { torneo, equipos, partidos } = d;
  const fechas = [torneo.fecha_inicio, torneo.fecha_fin].filter(Boolean).map((x) => new Date(`${x}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long" }));
  const conCuadro = partidos.some((p) => p.fase === "eliminatoria");
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub="Torneo" />
      <AutoRefresco />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5">
        <div>
          <h1 className="text-2xl font-bold">{torneo.nombre}</h1>
          <p className="text-sm text-tinta/60">{[torneo.categoria, [...new Set(fechas)].join(" – "), torneo.lugar].filter(Boolean).join(" · ")}</p>
          {torneo.notas && <p className="mt-2 whitespace-pre-line text-sm">{torneo.notas}</p>}
        </div>
        {conCuadro && <section><h2 className="mb-2 text-lg font-semibold">Cuadro</h2><Cuadro equipos={equipos} partidos={partidos} /></section>}
        {torneo.formato !== "eliminatoria" && <section><h2 className="mb-2 text-lg font-semibold">Clasificación</h2><Clasificaciones torneo={torneo} equipos={equipos} partidos={partidos} /></section>}
        <section><h2 className="mb-2 text-lg font-semibold">Partidos</h2><Partidos torneo={torneo} equipos={equipos} partidos={partidos} /></section>
      </main>
    </div>
  );
}
