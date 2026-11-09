"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import PizarraEditor from "@/components/pizarra";
import type { Pizarra } from "@/components/pizarra/modelo";
import { EDADES } from "@/lib/edades";
import { ENFOQUES, MATERIALES, MODALIDADES, POSICIONES } from "@/lib/ejercicio-filtros";
import { Library } from "lucide-react";
import { guardarEjercicio, type DatosEjercicio } from "./actions";


export const CLAVE_BORRADOR = "turo-pizarra-borrador";

/** Botones para marcar varias opciones (para qué sirve, posiciones, edades) */
function Chips({ opciones, valor, onChange }: { opciones: readonly string[]; valor: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {opciones.map((x) => {
        const on = valor.includes(x);
        return (
          <button key={x} type="button" onClick={() => onChange(on ? valor.filter((y) => y !== x) : [...valor, x])}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-azul bg-azul text-white" : "border-linea bg-white text-tinta/70"}`}>{x}</button>
        );
      })}
    </div>
  );
}
const aNumero = (v: string) => (v === "" ? null : Math.max(0, Number(v)));

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
    // Si el ejercicio aún no tiene «para qué sirve», se parte de su categoría de siempre
    enfoques: inicial?.enfoques?.length ? inicial.enfoques : inicial?.categoria ? [inicial.categoria] : [],
    posiciones: inicial?.posiciones ?? [],
    modalidad: inicial?.modalidad ?? null,
    jugadores_max: inicial?.jugadores_max ?? null,
    balones: inicial?.balones ?? null,
    canastas: inicial?.canastas ?? null,
    conos: inicial?.conos ?? null,
    petos: inicial?.petos ?? null,
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
        <div>
          <label className="etiqueta">Para qué sirve (elige uno o varios)</label>
          <Chips opciones={ENFOQUES} valor={d.enfoques ?? []} onChange={(v) => setD((x) => ({ ...x, enfoques: v, categoria: v[0] ?? "" }))} />
          <p className="mt-1 text-[11px] text-tinta/50">El primero que marques es el principal. Con esto se busca luego: calentamiento, tiro, rebote, defensa…</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="etiqueta">Minutos</label>
            <input type="number" min={0} value={d.duracion ?? ""} onChange={(e) => set("duracion", e.target.value ? Number(e.target.value) : null)} className="campo" />
          </div>
          <div>
            <label className="etiqueta">Jugadores (mín.)</label>
            <input type="number" min={0} value={d.jugadores_min ?? ""} onChange={(e) => set("jugadores_min", aNumero(e.target.value))} className="campo" />
          </div>
          <div>
            <label className="etiqueta">Jugadores (máx.)</label>
            <input type="number" min={0} value={d.jugadores_max ?? ""} onChange={(e) => set("jugadores_max", aNumero(e.target.value))} className="campo" />
          </div>
          <div className="col-span-3">
            <label className="etiqueta">Visible</label>
            <select value={d.en_biblioteca ? "club" : d.visibilidad} disabled={d.en_biblioteca} onChange={(e) => set("visibilidad", e.target.value as DatosEjercicio["visibilidad"])} className="campo">
              <option value="club">Club</option>
              <option value="privado">Solo yo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="etiqueta">Cómo se trabaja</label>
          <select value={d.modalidad ?? ""} onChange={(e) => set("modalidad", e.target.value || null)} className="campo">
            <option value="">Sin indicar</option>
            {MODALIDADES.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
          </select>
        </div>
        <div>
          <label className="etiqueta">Posiciones que lo usan</label>
          <Chips opciones={POSICIONES} valor={d.posiciones ?? []} onChange={(v) => set("posiciones", v)} />
          <p className="mt-1 text-[11px] text-tinta/50">Si no marcas ninguna, vale para todas.</p>
        </div>
        <div>
          <label className="etiqueta">Edades</label>
          <Chips opciones={EDADES} valor={d.edades ?? []} onChange={(v) => set("edades", v)} />
        </div>
        <div>
          <label className="etiqueta">Material necesario</label>
          <div className="grid grid-cols-4 gap-2">
            {MATERIALES.map((m) => (
              <div key={m.k}>
                <label className="block text-[11px] text-tinta/60">{m.t}</label>
                <input type="number" min={0} value={d[m.k] ?? ""} onChange={(e) => set(m.k, aNumero(e.target.value))} className="campo" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="etiqueta">Otro material</label>
          <input value={d.material ?? ""} onChange={(e) => set("material", e.target.value)} className="campo" placeholder="Aros, vallas, cuerda… (o notas: 1 balón por jugador)" />
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
