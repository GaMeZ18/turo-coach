import { EDADES } from "@/lib/edades";
import { FOCOS, FORMATOS, POSICIONES, RANGOS_JUGADORES } from "@/lib/rasgos-ejercicio";

export type ParamsFiltro = { q?: string; tipo?: string; foco?: string; edad?: string; pos?: string; formato?: string; jug?: string; balones?: string };

/** Filtros de búsqueda de ejercicios: qué se trabaja, edad, jugadores, tipo de trabajo, posición y material */
export default function FiltrosEjercicios({ p, extra, extra2 }: { p: ParamsFiltro; extra?: React.ReactNode; extra2?: React.ReactNode }) {
  return (
    <>
      <input name="q" defaultValue={p.q} placeholder="Buscar por título, texto o etiqueta" className="campo min-w-48 flex-1" />
      <select name="foco" defaultValue={p.foco ?? ""} className="campo !w-auto" aria-label="Qué se trabaja">
        <option value="">Qué se trabaja</option>
        {FOCOS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select name="tipo" defaultValue={p.tipo ?? ""} className="campo !w-auto" aria-label="Ejercicio o sistema">
        <option value="">Ejercicios y sistemas</option>
        <option value="ejercicio">Ejercicios</option>
        <option value="sistema">Sistemas</option>
        <option value="fisico">Prep. física</option>
      </select>
      <select name="edad" defaultValue={p.edad ?? ""} className="campo !w-auto" aria-label="Edad">
        <option value="">Cualquier edad</option>
        {EDADES.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <select name="jug" defaultValue={p.jug ?? ""} className="campo !w-auto" aria-label="Jugadores">
        <option value="">Cualquier nº de jugadores</option>
        {RANGOS_JUGADORES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
      </select>
      <select name="formato" defaultValue={p.formato ?? ""} className="campo !w-auto" aria-label="Tipo de trabajo">
        <option value="">Cualquier tipo de trabajo</option>
        {FORMATOS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
      </select>
      <select name="pos" defaultValue={p.pos ?? ""} className="campo !w-auto" aria-label="Posición">
        <option value="">Cualquier posición</option>
        {POSICIONES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <label className="flex items-center gap-1.5 px-1 text-sm"><input type="checkbox" name="balones" value="1" defaultChecked={p.balones === "1"} /> Con 1 balón</label>
      {extra}
      {extra2}
      <button className="btn-secundario">Filtrar</button>
    </>
  );
}
