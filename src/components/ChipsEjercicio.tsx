import { MODALIDADES, textoJugadores, textoMaterial, type ClaveMaterial } from "@/lib/ejercicio-filtros";

type Datos = {
  enfoques?: string[] | null; posiciones?: string[] | null; modalidad?: string | null;
  jugadores_min?: number | null; jugadores_max?: number | null;
} & Partial<Record<ClaveMaterial, number | null>>;

/** Resumen en chips de los datos de filtro de un ejercicio (ficha del ejercicio) */
export default function ChipsEjercicio({ e }: { e: Datos }) {
  const jug = textoJugadores(e.jugadores_min, e.jugadores_max);
  const mat = textoMaterial(e);
  const mod = MODALIDADES.find((m) => m.v === e.modalidad)?.t;
  const filas: { t: string; items: string[] }[] = [
    { t: "Para qué sirve", items: e.enfoques ?? [] },
    { t: "Jugadores", items: jug ? [`${jug} jugadores`] : [] },
    { t: "Cómo se trabaja", items: mod ? [mod] : [] },
    { t: "Posiciones", items: e.posiciones ?? [] },
    { t: "Material necesario", items: mat },
  ].filter((x) => x.items.length > 0);
  if (!filas.length) return null;
  return (
    <section className="space-y-2 rounded-lg bg-suave p-3">
      {filas.map((x) => (
        <div key={x.t}>
          <h2 className="etiqueta">{x.t}</h2>
          <div className="flex flex-wrap gap-1.5">
            {x.items.map((i) => <span key={i} className="rounded-full bg-white px-2 py-0.5 text-xs">{i}</span>)}
          </div>
        </div>
      ))}
    </section>
  );
}
