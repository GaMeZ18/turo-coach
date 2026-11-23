import type { Metadata } from "next";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import Cabecera from "@/components/publico/Cabecera";
import { CAMPOS_EVENTO, euros, motivoCerrado, type Evento } from "@/lib/eventos";
import { fechaLarga, hora } from "@/lib/fechas";
import Formulario from "./Formulario";

export const dynamic = "force-dynamic";

const cargar = cache(async (slug: string) => {
  const db = adminClient();
  if (!db || !/^[a-z0-9-]{4,40}$/.test(slug)) return null;
  const { data } = await db.from("eventos").select(CAMPOS_EVENTO).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const { count } = await db.from("evento_inscripciones").select("id", { count: "exact", head: true }).eq("evento_id", data.id).not("estado", "in", "(rechazada,cancelada)");
  return { evento: data as Evento, ocupadas: count ?? 0 };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await cargar((await params).slug);
  return { title: d ? `Inscripción · ${d.evento.nombre}` : "Inscripción", robots: { index: false } };
}

export default async function InscripcionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await cargar(slug);
  if (!d) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Evento no encontrado</h1><p className="mt-2 text-sm text-tinta/60">Revisa el enlace que te han pasado.</p></main>;
  const { evento: ev, ocupadas } = d;
  const cerrado = motivoCerrado(ev, ocupadas);
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub="Inscripción" />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="tarjeta p-4">
          <h1 className="text-2xl font-bold">{ev.nombre}</h1>
          <p className="mt-1 text-sm capitalize text-tinta/70">{[ev.fecha ? `${fechaLarga(ev.fecha)} · ${hora(ev.fecha)}` : null, ev.lugar].filter(Boolean).join(" · ")}</p>
          {ev.descripcion && <p className="mt-3 whitespace-pre-line text-sm">{ev.descripcion}</p>}
          <ul className="mt-3 space-y-0.5 text-sm">
            <li>💶 <strong>{euros(ev.precio_jugador)}</strong> por jugador{ev.precio_entrenador ? ` · ${euros(ev.precio_entrenador)} por entrenador` : " · entrenadores gratis"}</li>
            <li>👥 De {ev.min_jugadores} a {ev.max_jugadores} jugadores por equipo{ev.max_equipos ? ` · quedan ${Math.max(0, ev.max_equipos - ocupadas)} plazas` : ""}</li>
            {ev.fecha_limite && <li>⏳ Inscripciones hasta el {fechaLarga(ev.fecha_limite)} a las {hora(ev.fecha_limite)}</li>}
            <li>🎟️ Cada jugador y entrenador recibe su pase con código QR para entrar.</li>
          </ul>
        </section>
        {cerrado ? <p className="tarjeta p-4 text-center font-semibold">{cerrado}</p> : <Formulario slug={slug} evento={ev} />}
      </main>
    </div>
  );
}
