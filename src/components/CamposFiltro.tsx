import { EDADES } from "@/lib/edades";
import { ENFOQUES, FILTROS_MATERIAL, MODALIDADES, POSICIONES, type FiltrosEjercicio } from "@/lib/ejercicio-filtros";

/** Los desplegables de filtro de ejercicios (para qué sirve, jugadores, edad, posición, cómo se trabaja, material) */
export default function CamposFiltro({ f }: { f: FiltrosEjercicio }) {
  return (
    <>
      <select name="cat" defaultValue={f.cat ?? ""} className="campo !w-auto" aria-label="Para qué sirve">
        <option value="">Para qué sirve (todo)</option>
        {ENFOQUES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input name="jug" type="number" min={1} max={30} defaultValue={f.jug ?? ""} placeholder="Nº jugadores" className="campo !w-32" aria-label="Número de jugadores" />
      <select name="edad" defaultValue={f.edad ?? ""} className="campo !w-auto" aria-label="Edad">
        <option value="">Todas las edades</option>
        {EDADES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select name="pos" defaultValue={f.pos ?? ""} className="campo !w-auto" aria-label="Posición">
        <option value="">Cualquier posición</option>
        {POSICIONES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select name="mod" defaultValue={f.mod ?? ""} className="campo !w-auto" aria-label="Cómo se trabaja">
        <option value="">Individual, grupos o equipo</option>
        {MODALIDADES.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
      </select>
      <select name="mat" defaultValue={f.mat ?? ""} className="campo !w-auto" aria-label="Material">
        <option value="">Cualquier material</option>
        {FILTROS_MATERIAL.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
      </select>
    </>
  );
}
