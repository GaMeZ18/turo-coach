import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScanLine, Ticket } from "lucide-react";
import { requireUser, veEventos } from "@/lib/supabase/server";
import { CAMPOS_EVENTO, CAMPOS_INSCRIPCION, euros, urlInscripcion, type Evento, type Inscripcion, type Pase } from "@/lib/eventos";
import { emailConfigurado } from "@/lib/email";
import { fechaLarga, hora } from "@/lib/fechas";
import Inscripciones from "./Inscripciones";
import AjustesEvento from "./AjustesEvento";
import Entradas from "./Entradas";

export const metadata = { title: "Evento" };
const PESTANAS = [["inscripciones", "Inscripciones"], ["entrada", "Entrada"], ["ajustes", "Ajustes"]] as const;

export default async function EventoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, perfil } = await requireUser();
  if (!veEventos(perfil)) notFound();
  const [e, i, p, t] = await Promise.all([
    supabase.from("club_eventos").select(CAMPOS_EVENTO).eq("id", id).maybeSingle(),
    supabase.from("evento_inscripciones").select(CAMPOS_INSCRIPCION).eq("evento_id", id).order("created_at", { ascending: false }),
    supabase.from("evento_pases").select("id, codigo, nombre, rol, dorsal, anulado, usado_at, inscripcion_id").eq("evento_id", id).order("nombre"),
    supabase.from("torneos").select("id, nombre").order("created_at", { ascending: false }),
  ]);
  if (!e.data) notFound();
  const ev = e.data as Evento, ins = (i.data ?? []) as Inscripcion[], pases = (p.data ?? []) as Pase[];
  const activas = ins.filter((x) => !["rechazada", "cancelada"].includes(x.estado));
  const cobrado = ins.filter((x) => x.estado === "aprobada").reduce((s, x) => s + x.importe, 0);
  const v = PESTANAS.some(([k]) => k === sp.v) ? sp.v! : "inscripciones";
  const validos = pases.filter((x) => !x.anulado);
  return (
    <div className="max-w-5xl">
      <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-azul"><ArrowLeft size={14} /> Eventos</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Ticket className="text-azul" /> {ev.nombre}</h1>
      <p className="text-sm capitalize text-tinta/60">{[ev.fecha ? `${fechaLarga(ev.fecha)} · ${hora(ev.fecha)}` : null, ev.lugar].filter(Boolean).join(" · ")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["Equipos", `${activas.length}${ev.max_equipos ? `/${ev.max_equipos}` : ""}`], ["Por revisar", String(ins.filter((x) => x.estado === "pendiente_validacion").length)], ["Cobrado", euros(cobrado)], ["Han entrado", `${validos.filter((x) => x.usado_at).length}/${validos.length}`]].map(([t, n]) => (
          <div key={t} className="tarjeta p-3 text-center"><p className="text-xl font-bold">{n}</p><p className="text-xs text-tinta/60">{t}</p></div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${ev.abierto ? "bg-green-500/15 text-green-700" : "bg-tinta/10 text-tinta/50"}`}>{ev.abierto ? "INSCRIPCIONES ABIERTAS" : "INSCRIPCIONES CERRADAS"}</span>
        <a href={urlInscripcion(ev.slug)} target="_blank" rel="noopener" className="break-all text-azul underline">{urlInscripcion(ev.slug)}</a>
        <Link href={`/eventos/${id}/escanear`} className="btn-primario ml-auto"><ScanLine size={16} /> Escanear entrada</Link>
      </div>
      {!emailConfigurado() && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-800">⚠️ El email aún no está configurado: al aprobar se crean los pases, pero no se envían. Mientras tanto, el equipo los ve en su página de inscripción (botón «Enlace» de cada inscripción).</p>}
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-linea">
        {PESTANAS.map(([k, n]) => <Link key={k} href={`/eventos/${id}?v=${k}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${v === k ? "border-azul text-azul" : "border-transparent text-tinta/60"}`}>{n}</Link>)}
      </nav>
      <div className="mt-4">
        {v === "inscripciones" && <Inscripciones inscripciones={ins} pases={pases} />}
        {v === "entrada" && <Entradas inscripciones={ins} pases={pases} />}
        {v === "ajustes" && <AjustesEvento evento={ev} torneos={(t.data ?? []) as { id: string; nombre: string }[]} />}
      </div>
    </div>
  );
}
