import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { guardarJugador, quitarDelEquipo } from "../actions";
import Enviar from "@/components/Enviar";
import EstadisticasJugador from "./EstadisticasJugador";
import VideoJugador from "./VideoJugador";

const ESTADOS: Record<string, string> = {
  presente: "Presente", ausente: "Ausente", justificado: "Justificado", lesionado: "Lesionado", tarde: "Tarde",
};

export default async function FichaJugador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);

  const [{ data: j }, { data: rel }, { data: historial }] = await Promise.all([
    supabase.from("jugadores").select("*").eq("id", id).maybeSingle(),
    equipo
      ? supabase.from("equipo_jugadores").select("dorsal, posicion").eq("equipo_id", equipo.id).eq("jugador_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("asistencias")
      .select("estado, motivo, entrenamientos(fecha, titulo)")
      .eq("jugador_id", id)
      .limit(60),
  ]);
  if (!j) notFound();

  const hist = ((historial ?? []) as unknown as {
    estado: string; motivo: string | null; entrenamientos: { fecha: string; titulo: string | null } | null;
  }[]).sort((a, b) => (b.entrenamientos?.fecha ?? "").localeCompare(a.entrenamientos?.fecha ?? ""));

  return (
    <div className="max-w-3xl">
      <Link href="/jugadores" className="text-sm text-tinta/60 hover:underline">← Jugadores</Link>
      <h1 className="mt-1 text-2xl font-semibold">{j.nombre} {j.apellidos}</h1>

      <form action={guardarJugador} className="tarjeta mt-5 grid gap-3 p-4 sm:grid-cols-2">
        <input type="hidden" name="jugador_id" value={j.id} />
        <input type="hidden" name="equipo_id" value={rel ? equipo?.id ?? "" : ""} />
        <div><label className="etiqueta">Nombre</label><input name="nombre" defaultValue={j.nombre} required className="campo" /></div>
        <div><label className="etiqueta">Apellidos</label><input name="apellidos" defaultValue={j.apellidos ?? ""} className="campo" /></div>
        <div><label className="etiqueta">Fecha de nacimiento</label><input name="fecha_nacimiento" type="date" defaultValue={j.fecha_nacimiento ?? ""} className="campo" /></div>
        <div><label className="etiqueta">Contacto (familia)</label><input name="contacto" defaultValue={j.contacto ?? ""} placeholder="Teléfono o email" className="campo" /></div>
        {rel && (
          <>
            <div><label className="etiqueta">Dorsal</label><input name="dorsal" type="number" defaultValue={rel.dorsal ?? ""} className="campo" /></div>
            <div><label className="etiqueta">Posición</label><input name="posicion" defaultValue={rel.posicion ?? ""} className="campo" /></div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="etiqueta">Notas técnicas</label>
          <textarea name="notas" rows={5} defaultValue={j.notas ?? ""} className="campo" placeholder="Puntos fuertes, a mejorar, objetivos…" />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Enviar>Guardar</Enviar>
        </div>
      </form>

      {rel && equipo && (
        <form action={quitarDelEquipo} className="mt-2">
          <input type="hidden" name="equipo_id" value={equipo.id} />
          <input type="hidden" name="jugador_id" value={j.id} />
          <Enviar className="btn-peligro !px-0" confirmar={`¿Quitar a ${j.nombre} de ${equipo.nombre}?`}>Quitar de {equipo.nombre}</Enviar>
        </form>
      )}

      <EstadisticasJugador supabase={supabase} jugador={{ id: j.id, nombre: j.nombre, apellidos: j.apellidos }} />

      <VideoJugador supabase={supabase} jugadorId={j.id} />

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Asistencia reciente</h2>
        {hist.length > 0 && (() => {
          const ok = hist.filter((h) => h.estado === "presente" || h.estado === "tarde").length;
          const pc = Math.round((ok * 100) / hist.length);
          return <span className={`text-sm font-semibold ${pc >= 85 ? "text-green-700" : pc >= 65 ? "text-amber-600" : "text-rojo"}`}>{pc}% de asistencia ({ok} de {hist.length}) · <Link href="/entrenamientos/asistencia" className="font-normal text-azul underline">ver equipo</Link></span>;
        })()}
      </div>
      <ul className="tarjeta mt-2 divide-y divide-linea text-sm">
        {hist.map((h, i) => (
          <li key={i} className="flex justify-between gap-2 px-3 py-2">
            <span>
              {h.entrenamientos ? new Date(h.entrenamientos.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}
              <span className="text-tinta/50"> · {h.entrenamientos?.titulo ?? "Entreno"}</span>
            </span>
            <span className={h.estado === "presente" ? "text-green-700" : h.estado === "tarde" ? "text-amber-700" : "text-red-700"}>
              {ESTADOS[h.estado]}{h.motivo ? ` (${h.motivo})` : ""}
            </span>
          </li>
        ))}
        {hist.length === 0 && <li className="px-3 py-4 text-tinta/50">Sin registros todavía.</li>}
      </ul>
    </div>
  );
}
