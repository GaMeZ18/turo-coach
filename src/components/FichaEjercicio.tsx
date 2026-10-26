"use client";

// Ficha completa de un ejercicio: pizarra, objetivos, descripción, correcciones y material.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Target, Timer, Users } from "lucide-react";
import MiniPizarra from "@/components/pizarra/Mini";
import { fichaEjercicio, type FichaEjercicio as Ficha } from "@/app/(app)/entrenamientos/actions";

const cache = new Map<string, Ficha | null>();

export function useFicha(id: string | null) {
  const [ficha, setFicha] = useState<Ficha | null>(id ? cache.get(id) ?? null : null);
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    if (!id) { setFicha(null); return; }
    if (cache.has(id)) { setFicha(cache.get(id)!); return; }
    let vivo = true;
    setCargando(true);
    fichaEjercicio(id).then((f) => { cache.set(id, f); if (vivo) setFicha(f); }).finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [id]);
  return { ficha, cargando };
}

const puntos = (t: string) => t.split(/\s*·\s*|\n+/).map((x) => x.trim()).filter(Boolean);

export default function FichaEjercicio({ id, compacta = false }: { id: string; compacta?: boolean }) {
  const { ficha: f, cargando } = useFicha(id);
  if (cargando || !f) {
    return <div className="flex items-center gap-2 p-4 text-sm text-tinta/50">{cargando ? <><Loader2 size={16} className="animate-spin" /> Cargando ejercicio…</> : "No se ha encontrado el ejercicio."}</div>;
  }
  return (
    <div className={compacta ? "space-y-3" : "space-y-4"}>
      {(f.preview || f.pizarra) ? (
        <div className="overflow-hidden rounded-lg border border-linea bg-suave">
          {f.preview ? <img src={f.preview} alt="" className="mx-auto max-h-80 w-full object-contain" /> : <MiniPizarra pizarra={f.pizarra} className="mx-auto max-h-80 w-full" />}
        </div>
      ) : null}
      {!compacta && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rojo">{f.tipo === "sistema" ? "Sistema" : f.categoria ?? "Ejercicio"}</p>
          <h3 className="text-lg font-semibold leading-tight">{f.titulo}</h3>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta/70">
        {f.duracion ? <span className="inline-flex items-center gap-1"><Timer size={12} /> {f.duracion} min</span> : null}
        {f.jugadores_min ? <span className="inline-flex items-center gap-1"><Users size={12} /> {f.jugadores_min} jugadores</span> : null}
        {(f.edades ?? []).map((x) => <span key={x} className="rounded-full bg-azul/10 px-1.5 py-0.5 font-medium text-azul">{x}</span>)}
      </div>
      {f.objetivos ? (
        <section className="rounded-lg bg-azul/5 p-3">
          <h4 className="etiqueta flex items-center gap-1"><Target size={13} /> Objetivos</h4>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">{puntos(f.objetivos).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      ) : f.etiquetas?.length ? (
        <section className="rounded-lg bg-azul/5 p-3">
          <h4 className="etiqueta flex items-center gap-1"><Target size={13} /> Trabaja</h4>
          <p className="text-sm">{f.etiquetas.join(" · ")}</p>
        </section>
      ) : null}
      {f.descripcion && (
        <section>
          <h4 className="etiqueta">Descripción</h4>
          <p className="whitespace-pre-line text-sm">{f.descripcion}</p>
        </section>
      )}
      {f.correcciones && (
        <section>
          <h4 className="etiqueta">Correcciones / puntos clave</h4>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">{puntos(f.correcciones).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
      {f.material && (
        <section>
          <h4 className="etiqueta">Material</h4>
          <p className="text-sm">{f.material}</p>
        </section>
      )}
      <Link href={`/ejercicios/${f.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-azul hover:underline">
        <ExternalLink size={14} /> Ver la pizarra animada
      </Link>
    </div>
  );
}
