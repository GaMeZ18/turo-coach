"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import PizarraEditor from "@/components/pizarra";
import type { Pizarra } from "@/components/pizarra/modelo";
import { CATEGORIAS } from "@/lib/categorias";
import { guardarEjercicio, type DatosEjercicio } from "./actions";


export const CLAVE_BORRADOR = "turo-pizarra-borrador";

export default function FormEjercicio({
  inicial, desdePizarra = false, entrenoId,
}: {
  inicial?: Partial<DatosEjercicio> & { id?: string };
  desdePizarra?: boolean;
  /** Si se crea desde un entrenamiento: al guardar se añade a la sesión y se vuelve a ella */
  entrenoId?: string;
}) {
  const [d, setD] = useState<DatosEjercicio>({
    id: inicial?.id,
    tipo: inicial?.tipo ?? "ejercicio",
    titulo: inicial?.titulo ?? "",
    descripcion: inicial?.descripcion ?? "",
    correcciones: inicial?.correcciones ?? "",
    categoria: inicial?.categoria ?? "",
    etiquetas: inicial?.etiquetas ?? [],
    jugadores_min: inicial?.jugadores_min ?? null,
    duracion: inicial?.duracion ?? null,
    video_url: inicial?.video_url ?? "",
    visibilidad: inicial?.visibilidad ?? "club",
    pizarra: inicial?.pizarra ?? null,
    preview: inicial?.preview ?? null,
  });
  const [etiquetasTxt, setEtiquetasTxt] = useState((inicial?.etiquetas ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const pizarraRef = useRef<Pizarra | null>(null);
  const [listo, setListo] = useState(!desdePizarra);
  useEffect(() => {
    if (!desdePizarra) return;
    try {
      const b = localStorage.getItem(CLAVE_BORRADOR);
      if (b) setD((x) => ({ ...x, pizarra: JSON.parse(b) }));
    } catch {}
    setListo(true);
  }, [desdePizarra]);
  const capturaRef = useRef<(() => Promise<string>) | null>(null);

  const set = <K extends keyof DatosEjercicio>(k: K, v: DatosEjercicio[K]) => setD((x) => ({ ...x, [k]: v }));
  const registrarCaptura = useCallback((fn: () => Promise<string>) => { capturaRef.current = fn; }, []);
  const onPizarra = useCallback((p: Pizarra) => { pizarraRef.current = p; }, []);

  const guardar = async () => {
    setError(null);
    const pizarra = pizarraRef.current;
    const tieneDibujo = !!pizarra && pizarra.elementos.length > 0;
    const preview = tieneDibujo && capturaRef.current ? await capturaRef.current() : null;
    start(async () => {
      const r = await guardarEjercicio({
        ...d,
        etiquetas: etiquetasTxt.split(","),
        pizarra: tieneDibujo ? pizarra : null,
        preview,
      }, entrenoId);
      if (r?.error) setError(r.error);
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        {listo && <PizarraEditor valor={d.pizarra ?? undefined} onChange={onPizarra} registrarCaptura={registrarCaptura} titulo={d.titulo || "Ejercicio"} />}
      </div>

      <div className="space-y-3">
        <div className="flex rounded-lg border border-linea bg-white p-0.5 text-sm">
          {(["ejercicio", "sistema"] as const).map((t) => (
            <button key={t} type="button" onClick={() => set("tipo", t)}
              className={`flex-1 rounded-md py-1.5 ${d.tipo === t ? "bg-club text-white" : "text-tinta/70"}`}>
              {t === "ejercicio" ? "Ejercicio" : "Sistema de juego"}
            </button>
          ))}
        </div>
        <div>
          <label className="etiqueta">Título</label>
          <input value={d.titulo} onChange={(e) => set("titulo", e.target.value)} className="campo" placeholder="1c1 desde medio campo" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3">
            <label className="etiqueta">Categoría</label>
            <select value={d.categoria} onChange={(e) => set("categoria", e.target.value)} className="campo">
              <option value="">—</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta">Minutos</label>
            <input type="number" min={0} value={d.duracion ?? ""} onChange={(e) => set("duracion", e.target.value ? Number(e.target.value) : null)} className="campo" />
          </div>
          <div>
            <label className="etiqueta">Jugadores</label>
            <input type="number" min={0} value={d.jugadores_min ?? ""} onChange={(e) => set("jugadores_min", e.target.value ? Number(e.target.value) : null)} className="campo" />
          </div>
          <div>
            <label className="etiqueta">Visible</label>
            <select value={d.visibilidad} onChange={(e) => set("visibilidad", e.target.value as DatosEjercicio["visibilidad"])} className="campo">
              <option value="club">Club</option>
              <option value="privado">Solo yo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="etiqueta">Descripción</label>
          <textarea value={d.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={5} className="campo" placeholder="Organización, desarrollo, reglas…" />
        </div>
        <div>
          <label className="etiqueta">Correcciones / puntos clave</label>
          <textarea value={d.correcciones} onChange={(e) => set("correcciones", e.target.value)} rows={3} className="campo" />
        </div>
        <div>
          <label className="etiqueta">Etiquetas (separadas por comas)</label>
          <input value={etiquetasTxt} onChange={(e) => setEtiquetasTxt(e.target.value)} className="campo" placeholder="toma de decisiones, 1c1, mini" />
        </div>
        <div>
          <label className="etiqueta">Vídeo (YouTube o Vimeo)</label>
          <input value={d.video_url} onChange={(e) => set("video_url", e.target.value)} className="campo" placeholder="https://youtu.be/…" />
        </div>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={guardar} disabled={pendiente} className="btn-primario w-full">
          {pendiente ? "Guardando…" : entrenoId ? "Guardar y añadir al entreno" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
