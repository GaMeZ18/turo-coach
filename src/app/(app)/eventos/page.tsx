import Link from "next/link";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";
import { requireUser, veEventos } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { crearEvento } from "./actions";
import CamposEvento from "./CamposEvento";

export const metadata = { title: "Eventos" };

export default async function EventosPage() {
  const { supabase, perfil } = await requireUser();
  if (!veEventos(perfil)) notFound();
  const [{ data }, { data: ts }, { data: ins }] = await Promise.all([
    supabase.from("club_eventos").select("id, nombre, fecha, lugar, abierto").order("fecha", { ascending: false, nullsFirst: true }),
    supabase.from("torneos").select("id, nombre").order("created_at", { ascending: false }),
    supabase.from("evento_inscripciones").select("evento_id, estado"),
  ]);
  const eventos = (data ?? []) as { id: string; nombre: string; fecha: string | null; lugar: string | null; abierto: boolean }[];
  const cuenta = (id: string, est?: string) => (ins ?? []).filter((x) => x.evento_id === id && (est ? x.estado === est : !["rechazada", "cancelada"].includes(x.estado))).length;
  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><Ticket className="text-azul" /> Eventos</h1>
      <p className="text-sm text-tinta/60">Inscripción de equipos con pago y un pase QR por persona para la entrada. Solo lo ves tú.</p>
      <details className="tarjeta mt-5 p-4">
        <summary className="cursor-pointer font-semibold text-azul">+ Nuevo evento</summary>
        <form action={crearEvento} className="mt-3">
          <CamposEvento torneos={(ts ?? []) as { id: string; nombre: string }[]} />
          <div className="mt-3"><Enviar>Crear evento</Enviar></div>
        </form>
      </details>
      <ul className="mt-5 space-y-2">
        {eventos.map((e) => {
          const revisar = cuenta(e.id, "pendiente_validacion");
          return (
            <li key={e.id}>
              <Link href={`/eventos/${e.id}`} className="tarjeta flex items-center gap-3 p-3 hover:shadow-md">
                <Ticket size={20} className="shrink-0 text-azul" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.nombre}</span>
                  <span className="block text-xs capitalize text-tinta/60">{[e.fecha ? fechaLarga(e.fecha) : null, e.lugar, `${cuenta(e.id)} equipos`].filter(Boolean).join(" · ")}</span>
                </span>
                {revisar > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{revisar} por revisar</span>}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${e.abierto ? "bg-green-500/15 text-green-700" : "bg-tinta/10 text-tinta/50"}`}>{e.abierto ? "ABIERTO" : "CERRADO"}</span>
              </Link>
            </li>
          );
        })}
        {!eventos.length && <li className="text-sm text-tinta/50">Aún no hay eventos.</li>}
      </ul>
    </div>
  );
}
