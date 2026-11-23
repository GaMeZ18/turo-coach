"use client";

import { diaInput, horaInput } from "@/lib/fechas";
import type { Evento } from "@/lib/eventos";

const aInput = (iso: string | null | undefined) => (iso ? `${diaInput(iso)}T${horaInput(iso)}` : "");
const aEuros = (c: number | undefined, def: string) => (c === undefined ? def : (c / 100).toString().replace(".", ","));

/** Campos del formulario de evento (crear y ajustes) */
export default function CamposEvento({ e, torneos }: { e?: Evento; torneos: { id: string; nombre: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <div className="sm:col-span-4"><label className="etiqueta">Nombre</label><input name="nombre" required defaultValue={e?.nombre} placeholder="Ej.: Torneo de Navidad 2026" className="campo" /></div>
      <div className="sm:col-span-2"><label className="etiqueta">Empieza</label><input name="fecha" type="datetime-local" defaultValue={aInput(e?.fecha)} className="campo" /></div>
      <div className="sm:col-span-2"><label className="etiqueta">Termina</label><input name="fecha_fin" type="datetime-local" defaultValue={aInput(e?.fecha_fin)} className="campo" /></div>
      <div className="sm:col-span-4"><label className="etiqueta">Lugar</label><input name="lugar" defaultValue={e?.lugar ?? ""} placeholder="Pavelló…" className="campo" /></div>
      <div className="sm:col-span-4"><label className="etiqueta">Descripción (sale en la página de inscripción)</label><textarea name="descripcion" rows={3} defaultValue={e?.descripcion ?? ""} placeholder="Categorías, formato, normas…" className="campo" /></div>
      <div><label className="etiqueta">€ por jugador</label><input name="precio_jugador" inputMode="decimal" defaultValue={aEuros(e?.precio_jugador, "15")} className="campo" /></div>
      <div><label className="etiqueta">€ por entrenador</label><input name="precio_entrenador" inputMode="decimal" defaultValue={aEuros(e?.precio_entrenador, "0")} className="campo" /></div>
      <div><label className="etiqueta">Mín. jugadores</label><input name="min_jugadores" type="number" min={1} max={30} defaultValue={e?.min_jugadores ?? 5} className="campo" /></div>
      <div><label className="etiqueta">Máx. jugadores</label><input name="max_jugadores" type="number" min={1} max={40} defaultValue={e?.max_jugadores ?? 15} className="campo" /></div>
      <div><label className="etiqueta">Máx. equipos</label><input name="max_equipos" type="number" min={1} defaultValue={e?.max_equipos ?? ""} placeholder="Sin límite" className="campo" /></div>
      <div className="sm:col-span-2"><label className="etiqueta">Inscripciones hasta</label><input name="fecha_limite" type="datetime-local" defaultValue={aInput(e?.fecha_limite)} className="campo" /></div>
      <div><label className="etiqueta">Torneo (alta automática)</label>
        <select name="torneo_id" defaultValue={e?.torneo_id ?? ""} className="campo"><option value="">— Ninguno —</option>{torneos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
      </div>
      <fieldset className="rounded-lg border border-linea p-3 sm:col-span-4">
        <legend className="px-1 text-sm font-semibold">Pago</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pago_transferencia" defaultChecked={e?.pago_transferencia ?? true} /> Transferencia con justificante (lo validas tú)</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div><label className="etiqueta">IBAN del club</label><input name="iban" defaultValue={e?.iban ?? ""} placeholder="ES00 0000 0000 0000 0000 0000" className="campo font-mono" /></div>
          <div><label className="etiqueta">Titular</label><input name="titular" defaultValue={e?.titular ?? "C.B. Turó de la Peira"} className="campo" /></div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-tinta/50"><input type="checkbox" name="pago_tpv" defaultChecked={e?.pago_tpv} disabled /> Bizum o tarjeta (TPV del banco): disponible cuando esté contratado</label>
      </fieldset>
      {e && <div className="sm:col-span-4"><label className="etiqueta">Dirección de la página (coach.cbturo.com/inscripcion/…)</label><input name="slug" defaultValue={e.slug} className="campo font-mono" /></div>}
    </div>
  );
}
