"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import PizarraEditor from "@/components/pizarra";
import type { Pizarra } from "@/components/pizarra/modelo";
import { CATEGORIAS } from "@/lib/categorias";
import { EDADES } from "@/lib/edades";
import { FOCOS, FORMATOS, POSICIONES } from "@/lib/rasgos-ejercicio";
import { Library } from "lucide-react";
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
    en_biblioteca: inicial?.en_biblioteca ?? false,
    edades: inicial?.edades ?? [],
    material: inicial?.material ?? "",
    objetivos: inicial?.objetivos ?? "",
    balones: inicial?.balones ?? null,
    canastas: inicial?.canastas ?? null,
    conos: inicial?.conos ?? null,
    focos: inicial?.focos ?? [],
    posiciones: inicial?.posiciones ?? [],
    formato: inicial?.formato ?? "",
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
  const alternar = (k: "focos" | "posiciones", v: string) => setD((x) => {
    const l = x[k] ?? [];
    return { ...x, [k]: l.includes(v) ? l.filter((y) => y !== v) : [...l, v] };
  });
  const numero = (k: "balones" | "canastas" | "conos") => (
    <div>
      <label className="etiqueta">{k === "balones" ? "Balones" : k === "canastas" ? "Canastas" : "Conos"}</label>
      <input type="number" min={0} value={d[k] ?? ""} placeholder="auto" onChange={(e) => set(k, e.target.value ? Number(e.target.value) : null)} className="campo" />
    </div>
  );
  const chip = (on: boolean) => `rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-azul bg-azul text-white" : "border-linea bg-white text-tinta/70"}`;
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
            <select value={d.en_biblioteca ? "club" : d.visibilidad} disabled={d.en_biblioteca} onChange={(e) => set("visibilidad", e.target.value as DatosEjercicio["visibilidad"])} className="campo">
              <option value="club">Club</option>
              <option value="privado">Solo yo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="etiqueta">Edades</label>
          <div className="flex flex-wrap gap-1">
            {EDADES.map((x) => {
              const on = d.edades?.includes(x);
              return (
                <button key={x} type="button" onClick={() => set("edades", on ? (d.edades ?? []).filter((y) => y !== x) : [...(d.edades ?? []), x])}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-azul bg-azul text-white" : "border-linea bg-white text-tinta/70"}`}>{x}</button>
              );
            })}
          </div>
        </div>
        <fieldset className="space-y-2 rounded-lg border border-linea p-2.5">
          <legend className="px-1 text-xs font-semibold text-tinta/70">Datos para buscarlo (si lo dejas vacío se rellena solo)</legend>
          <div className="grid grid-cols-3 gap-2">{numero("balones")}{numero("canastas")}{numero("conos")}</div>
          <div>
            <label className="etiqueta">Tipo de trabajo</label>
            <select value={d.formato ?? ""} onChange={(e) => set("formato", e.target.value)} className="campo">
              <option value="">Automático</option>
              {FORMATOS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta">Qué se trabaja (puedes marcar varios)</label>
            <div className="flex flex-wrap gap-1">
              {FOCOS.map((x) => <button key={x} type="button" onClick={() => alternar("focos", x)} className={chip(!!d.focos?.includes(x))}>{x}</button>)}
            </div>
          </div>
          <div>
            <label className="etiqueta">Posiciones</label>
            <div className="flex flex-wrap gap-1">
              {POSICIONES.map((x) => <button key={x} type="button" onClick={() => alternar("posiciones", x)} className={chip(!!d.posiciones?.includes(x))}>{x}</button>)}
            </div>
          </div>
        </fieldset>
        <div>
          <label className="etiqueta">Material</label>
          <input value={d.material ?? ""} onChange={(e) => set("material", e.target.value)} className="campo" placeholder="1 balón por jugador, 6 conos…" />
        </div>
        <div>
          <label className="etiqueta">Objetivos</label>
          <textarea value={d.objetivos ?? ""} onChange={(e) => set("objetivos", e.target.value)} rows={2} className="campo" placeholder="Qué se trabaja: p. ej. Tiro tras bloqueo indirecto · Lectura de la ayuda" />
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
        <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${d.en_biblioteca ? "border-oro bg-oro/15" : "border-linea bg-white"}`}>
          <input type="checkbox" checked={!!d.en_biblioteca} onChange={(e) => set("en_biblioteca", e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="flex items-center gap-1.5 font-semibold"><Library size={15} /> Publicar en la Biblioteca del club</span>
            <span className="block text-xs text-tinta/60">Lo verán todos los entrenadores en la Biblioteca y podrán copiarlo o usarlo en sus entrenos.</span>
          </span>
        </label>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={guardar} disabled={pendiente} className="btn-primario w-full">
          {pendiente ? "Guardando…" : entrenoId ? "Guardar y añadir al entreno" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
