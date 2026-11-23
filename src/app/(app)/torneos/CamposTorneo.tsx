"use client";

import { useState } from "react";
import { FORMATOS, type Formato, type Torneo } from "@/lib/torneos";

/** Campos del formulario de torneo (crear y ajustes) */
export default function CamposTorneo({ t }: { t?: Torneo }) {
  const [formato, setFormato] = useState<Formato>(t?.formato ?? "grupos");
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <div className="sm:col-span-3"><label className="etiqueta">Nombre</label><input name="nombre" required defaultValue={t?.nombre} placeholder="Ej.: Torneo de Navidad Turó" className="campo" /></div>
      <div><label className="etiqueta">Categoría</label><input name="categoria" defaultValue={t?.categoria ?? ""} placeholder="U12 Mixto" className="campo" /></div>
      <div><label className="etiqueta">Desde</label><input name="fecha_inicio" type="date" defaultValue={t?.fecha_inicio ?? ""} className="campo" /></div>
      <div><label className="etiqueta">Hasta</label><input name="fecha_fin" type="date" defaultValue={t?.fecha_fin ?? ""} className="campo" /></div>
      <div className="sm:col-span-2"><label className="etiqueta">Lugar</label><input name="lugar" defaultValue={t?.lugar ?? ""} placeholder="Pavelló…" className="campo" /></div>
      <div className="sm:col-span-2">
        <label className="etiqueta">Formato</label>
        <select name="formato" value={formato} onChange={(e) => setFormato(e.target.value as Formato)} className="campo">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => <option key={f} value={f}>{FORMATOS[f]}</option>)}
        </select>
      </div>
      {formato === "grupos" && <>
        <div><label className="etiqueta">Grupos</label><input name="num_grupos" type="number" min={1} max={16} defaultValue={t?.num_grupos ?? 2} className="campo" /></div>
        <div><label className="etiqueta">Pasan por grupo</label><input name="clasifican" type="number" min={1} max={16} defaultValue={t?.clasifican ?? 2} className="campo" /></div>
      </>}
      {formato === "liga" && <div className="sm:col-span-2"><label className="etiqueta">Pasan a la eliminatoria (opcional)</label><input name="clasifican" type="number" min={1} max={16} defaultValue={t?.clasifican ?? 4} className="campo" /></div>}
      <div><label className="etiqueta">Pts victoria</label><input name="puntos_victoria" type="number" min={0} max={10} defaultValue={t?.puntos_victoria ?? 2} className="campo" /></div>
      <div><label className="etiqueta">Pts derrota</label><input name="puntos_derrota" type="number" min={0} max={10} defaultValue={t?.puntos_derrota ?? 1} className="campo" /></div>
      <div><label className="etiqueta">Min. por partido</label><input name="duracion" type="number" min={10} max={240} defaultValue={t?.duracion ?? 60} className="campo" /></div>
      <div className="flex flex-col justify-end gap-1 text-sm">
        {formato !== "eliminatoria" && <label className="flex items-center gap-1.5"><input type="checkbox" name="ida_vuelta" defaultChecked={t?.ida_vuelta} /> Ida y vuelta</label>}
        <label className="flex items-center gap-1.5"><input type="checkbox" name="tercer_puesto" defaultChecked={t?.tercer_puesto ?? true} /> 3.er y 4.º puesto</label>
      </div>
      <div className="sm:col-span-4"><label className="etiqueta">Notas (normas, contacto…; salen en la página pública)</label><textarea name="notas" rows={2} defaultValue={t?.notas ?? ""} className="campo" /></div>
    </div>
  );
}
