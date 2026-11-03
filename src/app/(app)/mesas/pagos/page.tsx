import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { aISO, fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import { partidosDeCasa, euros } from "@/lib/mesas";
import Enviar from "@/components/Enviar";
import Copiar from "../Copiar";
import { editarPersona, marcarPagado } from "../actions";
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet } from "lucide-react";

const sumarMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const nombreMes = (mes: string) => new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

/** Recuento del mes: cuántas mesas ha hecho cada persona y cuánto se le debe */
export default async function PagosMesas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { supabase, perfil } = await requireUser();
  if (perfil.rol !== "coordinador" && perfil.rol !== "gestor_mesas") redirect("/");
  const { mes: m } = await searchParams;
  const mes = m && /^\d{4}-\d{2}$/.test(m) ? m : hoyLocal().slice(0, 7);
  const desde = aISO(`${mes}-01`, "00:00"), hasta = aISO(`${sumarMes(mes, 1)}-01`, "00:00");
  const ahora = new Date().toISOString();

  const partidos = (await partidosDeCasa(supabase, desde, hasta)).filter((p) => !p.federada);
  const [{ data: asigR }, { data: pagosR }, { data: personasR }] = await Promise.all([
    partidos.length ? supabase.from("mesa_asignaciones").select("id, partido_id, persona_id, importe").eq("estado", "confirmado").in("partido_id", partidos.map((p) => p.id)) : Promise.resolve({ data: [] }),
    supabase.from("mesa_pagos").select("persona_id, importe, pagado_en").eq("mes", mes),
    supabase.from("mesa_personas").select("id, nombre, telefono, activo").order("nombre"),
  ]);
  const asig = (asigR ?? []) as { id: string; partido_id: string; persona_id: string; importe: number }[];
  const pagos = new Map(((pagosR ?? []) as { persona_id: string; importe: number; pagado_en: string }[]).map((p) => [p.persona_id, p]));
  const personas = (personasR ?? []) as { id: string; nombre: string; telefono: string | null; activo: boolean }[];
  const partido = (id: string) => partidos.find((p) => p.id === id)!;

  const filas = personas.map((pe) => {
    const suyas = asig.filter((a) => a.persona_id === pe.id).map((a) => ({ ...a, p: partido(a.partido_id) })).sort((a, b) => a.p.fecha.localeCompare(b.p.fecha));
    const hechas = suyas.filter((a) => a.p.fecha <= ahora), previstas = suyas.filter((a) => a.p.fecha > ahora);
    return { pe, hechas, previstas, total: hechas.reduce((s, a) => s + Number(a.importe), 0), pago: pagos.get(pe.id) };
  }).filter((f) => f.hechas.length || f.previstas.length || f.pago);
  const total = filas.reduce((s, f) => s + f.total, 0), pagado = filas.reduce((s, f) => s + (f.pago ? Number(f.pago.importe) : 0), 0);
  const sinGente = partidos.filter((p) => p.fecha <= ahora && asig.filter((a) => a.partido_id === p.id).length < 2);
  const texto = [`Mesas CB Turó · ${nombreMes(mes)}`, "", ...filas.filter((f) => f.hechas.length).map((f) => `${f.pe.nombre}: ${f.hechas.length} mesa${f.hechas.length > 1 ? "s" : ""} → ${euros(f.total)}${f.pago ? " (pagado)" : ""}`), "", `Total: ${euros(total)}`].join("\n");

  return (
    <div className="space-y-5">
      <Link href="/mesas" className="inline-flex items-center gap-1 text-sm text-tinta/60 hover:text-tinta"><ArrowLeft size={15} /> Mesas</Link>
      <div className="flex items-center gap-2">
        <Link href={`?mes=${sumarMes(mes, -1)}`} className="btn-secundario !px-2" aria-label="Mes anterior"><ChevronLeft size={18} /></Link>
        <h1 className="flex flex-1 items-center justify-center gap-2 text-xl font-semibold capitalize"><Wallet className="text-azul" /> Pagos de mesas · {nombreMes(mes)}</h1>
        <Link href={`?mes=${sumarMes(mes, 1)}`} className="btn-secundario !px-2" aria-label="Mes siguiente"><ChevronRight size={18} /></Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="tarjeta p-3"><div className="text-xl font-bold">{euros(total)}</div><div className="text-[11px] uppercase text-tinta/60">A pagar (mesas hechas)</div></div>
        <div className="tarjeta p-3"><div className="text-xl font-bold text-green-700">{euros(pagado)}</div><div className="text-[11px] uppercase text-tinta/60">Pagado</div></div>
        <div className="tarjeta p-3"><div className={`text-xl font-bold ${total - pagado > 0 ? "text-red-700" : ""}`}>{euros(Math.max(0, total - pagado))}</div><div className="text-[11px] uppercase text-tinta/60">Pendiente</div></div>
      </div>

      <section className="tarjeta overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-suave text-left text-[11px] uppercase text-tinta/60">
            <tr><th className="p-2">Persona</th><th className="p-2">Mesas hechas</th><th className="p-2 text-center">Importe</th><th className="p-2 text-center">Estado</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.pe.id} className="border-t border-linea align-top">
                <td className="p-2"><p className="font-semibold">{f.pe.nombre}</p>{f.pe.telefono && <a href={`tel:${f.pe.telefono}`} className="text-xs text-tinta/50">{f.pe.telefono}</a>}</td>
                <td className="p-2 text-xs">
                  {f.hechas.map((a) => <p key={a.id} className="capitalize">{fechaCorta(a.p.fecha)} · {a.p.equipo} vs {a.p.rival}</p>)}
                  {f.previstas.length > 0 && <p className="text-tinta/50">+ {f.previstas.length} prevista{f.previstas.length > 1 ? "s" : ""} este mes</p>}
                </td>
                <td className="p-2 text-center font-semibold">{f.hechas.length} × → {euros(f.total)}</td>
                <td className="p-2 text-center">
                  <form action={marcarPagado}>
                    <input type="hidden" name="persona_id" value={f.pe.id} /><input type="hidden" name="mes" value={mes} />
                    <input type="hidden" name="importe" value={f.total} /><input type="hidden" name="pagado" value={f.pago ? "0" : "1"} />
                    {f.pago
                      ? <Enviar className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800" title="Pulsa para desmarcar">Pagado {euros(Number(f.pago.importe))}</Enviar>
                      : f.total > 0 ? <Enviar className="btn-primario !py-1 text-xs">Marcar pagado</Enviar> : <span className="text-xs text-tinta/40">—</span>}
                  </form>
                  {f.pago && Number(f.pago.importe) !== f.total && <p className="mt-1 text-[11px] text-amber-700">Ha cambiado: ahora son {euros(f.total)}</p>}
                </td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={4} className="p-3 text-center text-tinta/50">Nadie ha hecho mesas este mes.</td></tr>}
          </tbody>
        </table>
      </section>
      {filas.length > 0 && <Copiar texto={texto} etiqueta="Copiar resumen del mes" />}

      {sinGente.length > 0 && (
        <section className="tarjeta p-3 text-sm">
          <p className="font-semibold text-amber-800">Partidos ya jugados sin las 2 personas confirmadas</p>
          <ul className="mt-1 text-xs">{sinGente.map((p) => <li key={p.id} className="capitalize">{fechaCorta(p.fecha)} {hora(p.fecha)} · {p.equipo} vs {p.rival}</li>)}</ul>
          <p className="mt-1 text-xs text-tinta/50">Si alguien la hizo, ponle en la semana de ese partido en Mesas para que cuente.</p>
        </section>
      )}

      <details className="tarjeta p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Personas que hacen mesa ({personas.length})</summary>
        <ul className="mt-2 space-y-1.5">
          {personas.map((p) => (
            <li key={p.id}>
              <form action={editarPersona} className="flex flex-wrap items-center gap-1.5">
                <input type="hidden" name="id" value={p.id} />
                <input name="nombre" defaultValue={p.nombre} className="campo !w-48 !py-1 text-sm" />
                <input name="telefono" defaultValue={p.telefono ?? ""} placeholder="Teléfono" className="campo !w-32 !py-1 text-sm" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activo" defaultChecked={p.activo} /> Activa</label>
                <Enviar className="btn-secundario !py-1 text-xs">Guardar</Enviar>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
