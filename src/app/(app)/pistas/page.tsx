import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equiposDeTemporada, misEquipos } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { aISO, diaInput, hora, hoyLocal, TZ } from "@/lib/fechas";
import { lunesDe, normPista, solapes, sumarDias, type Ocupacion, type Pista } from "@/lib/pistas";
import Enviar from "@/components/Enviar";
import { borrarPista, guardarPista } from "./actions";
import { AlertTriangle, ChevronLeft, ChevronRight, MapPin, Settings2, Trash2 } from "lucide-react";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function PistasPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const { supabase, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";
  const lunes = lunesDe(/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? semana! : hoyLocal());
  const desde = aISO(lunes, "00:00"), hasta = aISO(sumarDias(lunes, 7), "00:00");

  const [{ data: pistasRaw, error }, { data: ocupRaw }, { equipos }, { equipos: mios }] = await Promise.all([
    supabase.from("pistas").select("id, nombre, capacidad, orden, notas").order("orden").order("nombre"),
    supabase.rpc("ocupacion_pistas", { desde, hasta }),
    equiposDeTemporada(supabase),
    misEquipos(supabase),
  ]);
  const pistas = (pistasRaw ?? []) as Pista[];
  const ocup = (ocupRaw ?? []) as Ocupacion[];
  const conflictos = solapes(ocup, pistas);
  const nombreEq = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "Otro equipo";
  const mioIds = new Set(mios.map((e) => e.id));
  // Pistas escritas en algún entreno que no están dadas de alta
  const conocidas = new Set(pistas.map((p) => normPista(p.nombre)));
  const otras = [...new Set(ocup.map((o) => normPista(o.lugar)).filter((k) => k && !conocidas.has(k)))];
  const filas: { clave: string; nombre: string; capacidad: number; notas: string | null }[] = [
    ...pistas.map((p) => ({ clave: normPista(p.nombre), nombre: p.nombre, capacidad: p.capacidad, notas: p.notas })),
    ...otras.map((k) => ({ clave: k, nombre: k, capacidad: 1, notas: "No está dada de alta" })),
  ];
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: TZ });

  const Bloque = ({ o }: { o: Ocupacion }) => {
    const fin = new Date(new Date(o.fecha).getTime() + (o.duracion || 90) * 60000);
    const choca = conflictos.has(o.id);
    const contenido = (
      <>
        <span className="block font-semibold tabular-nums">{hora(o.fecha)}–{hora(fin)}</span>
        <span className="block truncate">{nombreEq(o.equipo_id)}</span>
        {choca && <span className="mt-0.5 flex items-center gap-0.5 font-bold"><AlertTriangle size={11} /> Coincide</span>}
      </>
    );
    const clase = `block rounded-md border-l-4 px-1.5 py-1 text-[11px] leading-tight ${choca ? "bg-red-50 text-red-800 ring-2 ring-red-500" : "bg-suave"}`;
    return mioIds.has(o.equipo_id) || esCoord
      ? <Link href={`/entrenamientos/${o.id}`} className={`${clase} hover:brightness-95`} style={{ borderLeftColor: colorEquipo(o.equipo_id, equipos) }}>{contenido}</Link>
      : <div className={clase} style={{ borderLeftColor: colorEquipo(o.equipo_id, equipos) }}>{contenido}</div>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><MapPin className="text-azul" /> Reparto de pistas</h1>
          <p className="text-sm text-tinta/60">Qué equipo entrena en cada pista y a qué hora. Los bloques en rojo coinciden en la misma pista.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pistas?semana=${sumarDias(lunes, -7)}`} className="btn-secundario !px-2.5" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
          <div className="min-w-36 text-center text-sm font-semibold">{fmt(lunes)} – {fmt(sumarDias(lunes, 6))}</div>
          <Link href={`/pistas?semana=${sumarDias(lunes, 7)}`} className="btn-secundario !px-2.5" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
        </div>
      </div>

      {error && /pistas/.test(error.message) && <p className="tarjeta mt-4 p-3 text-sm text-red-700">Falta preparar la base de datos (0014_pistas.sql).</p>}

      {conflictos.size > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>Esta semana hay <strong>{conflictos.size} entrenos</strong> que coinciden en la misma pista con más equipos de los que caben. Cambia la hora o la pista de alguno.</span>
        </div>
      )}

      <div className="tarjeta mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-suave text-left text-xs uppercase text-tinta/60">
              <th className="w-36 p-2">Pista</th>
              {dias.map((d, i) => (
                <th key={d} className={`p-2 ${d === hoyLocal() ? "text-azul" : ""}`}>{DIAS[i].slice(0, 3)} <span className="font-normal">{fmt(d)}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-linea align-top">
                <td className="p-2">
                  <div className="font-semibold">{f.nombre}</div>
                  <div className="text-[11px] text-tinta/50">{f.capacidad === 1 ? "1 equipo a la vez" : `${f.capacidad} equipos a la vez`}</div>
                  {f.notas && <div className="text-[11px] text-tinta/50">{f.notas}</div>}
                </td>
                {dias.map((d) => {
                  const del = ocup.filter((o) => normPista(o.lugar) === f.clave && diaInput(o.fecha) === d).sort((a, b) => a.fecha.localeCompare(b.fecha));
                  return <td key={d} className="space-y-1 p-1.5">{del.map((o) => <Bloque key={o.id} o={o} />)}</td>;
                })}
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-tinta/50">Todavía no hay pistas. {esCoord ? "Añádelas abajo." : "Pide al coordinador que las dé de alta."}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Leyenda de equipos */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {equipos.filter((e) => ocup.some((o) => o.equipo_id === e.id)).map((e) => (
          <span key={e.id} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorEquipo(e.id, equipos) }} />{e.nombre}</span>
        ))}
      </div>

      {esCoord && (
        <details className="mt-6">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-azul hover:underline [&::-webkit-details-marker]:hidden"><Settings2 size={14} /> Gestionar pistas</summary>
          <div className="mt-2 space-y-2">
            {pistas.map((p) => (
              <div key={p.id} className="tarjeta flex flex-wrap items-end gap-2 p-3">
                <form action={guardarPista} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="min-w-40 flex-1"><label className="etiqueta">Nombre</label><input name="nombre" defaultValue={p.nombre} required className="campo" /></div>
                  <div className="w-36"><label className="etiqueta">Equipos a la vez</label><input name="capacidad" type="number" min={1} max={6} defaultValue={p.capacidad} className="campo" /></div>
                  <div className="w-20"><label className="etiqueta">Orden</label><input name="orden" type="number" defaultValue={p.orden} className="campo" /></div>
                  <div className="min-w-40 flex-1"><label className="etiqueta">Notas</label><input name="notas" defaultValue={p.notas ?? ""} placeholder="Dirección, media pista…" className="campo" /></div>
                  <Enviar className="btn-secundario">Guardar</Enviar>
                </form>
                <form action={borrarPista}>
                  <input type="hidden" name="id" value={p.id} />
                  <Enviar className="btn-peligro" confirmar={`¿Quitar la pista «${p.nombre}»? Los entrenos no se borran.`}><Trash2 size={15} /></Enviar>
                </form>
              </div>
            ))}
            <form action={guardarPista} className="tarjeta flex flex-wrap items-end gap-2 border-dashed p-3">
              <div className="min-w-40 flex-1"><label className="etiqueta">Nueva pista</label><input name="nombre" required placeholder="Ej.: VELÒDROM" className="campo" /></div>
              <div className="w-36"><label className="etiqueta">Equipos a la vez</label><input name="capacidad" type="number" min={1} max={6} defaultValue={1} className="campo" /></div>
              <div className="min-w-40 flex-1"><label className="etiqueta">Notas</label><input name="notas" className="campo" /></div>
              <Enviar>Añadir</Enviar>
            </form>
            <p className="text-xs text-tinta/50">«Equipos a la vez»: si en una pista caben dos equipos (media pista cada uno), pon 2 y solo avisará cuando haya tres.</p>
          </div>
        </details>
      )}
    </div>
  );
}
