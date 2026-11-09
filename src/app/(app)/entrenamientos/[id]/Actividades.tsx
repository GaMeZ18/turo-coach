"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, GripVertical, PenTool, Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  actualizarActividad, anadirActividad, borrarActividad, reordenarActividades,
} from "../actions";
import Enviar from "@/components/Enviar";
import FichaEjercicio, { useFicha } from "@/components/FichaEjercicio";
import SelectorEjercicios, { type EjercicioLista } from "./SelectorEjercicios";

type Actividad = {
  id: string; orden: number; tipo: string; titulo: string | null; duracion: number; notas: string | null;
  ejercicio_id: string | null;
  objetivos?: string | null; descripcion?: string | null; // cambiados solo para este entreno
  hecho?: boolean; // tic de «ya hecho» durante el entreno
  ejercicios: { titulo: string; preview: string | null; descripcion: string | null } | null;
};

/** Ejercicio dentro del entreno: pizarra animada aquí mismo y objetivos/descripción editables solo para esta sesión */
function EjercicioDelEntreno({ entrenoId, a, onCambio }: { entrenoId: string; a: Actividad; onCambio: (c: Partial<Actividad>) => void }) {
  const { ficha } = useFicha(a.ejercicio_id);
  const [editando, setEditando] = useState(false);
  const [obj, setObj] = useState("");
  const [desc, setDesc] = useState("");
  const [, start] = useTransition();
  const cambiado = a.objetivos != null || a.descripcion != null;
  const abrir = () => { setObj(a.objetivos ?? ficha?.objetivos ?? ""); setDesc(a.descripcion ?? ficha?.descripcion ?? ""); setEditando(true); };
  const guardar = () => {
    const c = { objetivos: obj.trim() === (ficha?.objetivos ?? "").trim() ? null : obj, descripcion: desc.trim() === (ficha?.descripcion ?? "").trim() ? null : desc };
    onCambio(c); setEditando(false);
    start(() => actualizarActividad(entrenoId, a.id, c));
  };
  const original = () => { onCambio({ objetivos: null, descripcion: null }); setEditando(false); start(() => actualizarActividad(entrenoId, a.id, { objetivos: null, descripcion: null })); };
  return (
    <div className="space-y-2">
      {editando ? (
        <div className="space-y-2 rounded-lg border border-azul/30 bg-azul/5 p-3">
          <p className="text-xs text-tinta/70">Los cambios son <strong>solo para este entreno</strong>: el ejercicio de la biblioteca no se toca.</p>
          <div><label className="etiqueta">Objetivos (hoy)</label><textarea value={obj} onChange={(e) => setObj(e.target.value)} rows={3} className="campo text-sm" placeholder="Un objetivo por línea" /></div>
          <div><label className="etiqueta">Descripción (hoy)</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} className="campo text-sm" /></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={guardar} className="btn-primario !py-1.5 text-sm">Guardar para este entreno</button>
            <button type="button" onClick={() => setEditando(false)} className="btn-secundario !py-1.5 text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={abrir} disabled={!ficha} className="btn-secundario !py-1 text-xs"><Pencil size={13} /> Cambiar objetivos o descripción para hoy</button>
          {cambiado && <><span className="rounded-full bg-oro/30 px-2 py-0.5 text-[11px] font-semibold">Modificado para este entreno</span>
            <button type="button" onClick={original} className="inline-flex items-center gap-1 text-xs text-tinta/60 hover:text-tinta"><RotateCcw size={12} /> Volver al original</button></>}
        </div>
      )}
      <FichaEjercicio id={a.ejercicio_id!} compacta reproductor propios={{ objetivos: a.objetivos, descripcion: a.descripcion }} />
    </div>
  );
}

const TIPOS: Record<string, { label: string; color: string }> = {
  ejercicio: { label: "Ejercicio", color: "bg-club/10 text-club" },
  calentamiento: { label: "Calentamiento", color: "bg-amber-100 text-amber-800" },
  prep_fisica: { label: "Prep. física", color: "bg-orange-100 text-orange-800" },
  estiramientos: { label: "Estiramientos", color: "bg-emerald-100 text-emerald-800" },
  series: { label: "Series", color: "bg-violet-100 text-violet-800" },
  agua: { label: "Agua", color: "bg-sky-100 text-sky-800" },
  nota: { label: "Nota", color: "bg-tinta/5 text-tinta/70" },
};

const TZ = "Europe/Madrid";
const hhmm = (d: Date) => d.toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export default function Actividades({
  entrenoId, inicio, prevista, actividades, ejercicios, yo, edadEquipo, fisicoIni = 0, fisicoFin = 0,
}: {
  entrenoId: string; inicio: string; prevista: number; actividades: Actividad[]; ejercicios: EjercicioLista[]; yo: string; edadEquipo?: string | null;
  fisicoIni?: number; fisicoFin?: number; // minutos de físico puestos a mano en «Editar»
}) {
  const [lista, setLista] = useState(actividades);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [, start] = useTransition();
  const formAlta = useRef<HTMLFormElement>(null);
  const [tipoAlta, setTipoAlta] = useState("ejercicio");
  useEffect(() => setLista(actividades), [actividades]);

  const total = lista.reduce((s, a) => s + (a.duracion || 0), 0);
  const exceso = total > prevista;

  const mover = (de: number, a: number) => {
    if (a < 0 || a >= lista.length || de === a) return;
    const nueva = [...lista];
    const [item] = nueva.splice(de, 1);
    nueva.splice(a, 0, item);
    setLista(nueva);
    start(() => reordenarActividades(entrenoId, nueva.map((x) => x.id)));
  };

  let acumulado = 0;
  const t0 = new Date(inicio).getTime();

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Sesión</h2>
        <span className={`text-sm tabular-nums ${exceso ? "font-semibold text-red-700" : "text-tinta/60"}`}>
          {total} / {prevista} min {exceso && `· te pasas ${total - prevista}′`}
        </span>
      </div>
      {(() => {
        // Pista ocupada: desde el primer ejercicio que no es de prep. física hasta el último
        const fis = (x: Actividad) => x.tipo === "prep_fisica";
        const primero = lista.findIndex((x) => !fis(x));
        if (primero < 0 && lista.length) return null;
        let ultimo = lista.length - 1;
        while (ultimo > primero && fis(lista[ultimo])) ultimo--;
        // Lo que sea mayor: la prep. física de la sesión o los minutos puestos a mano
        const ini = Math.max(fisicoIni, primero < 0 ? 0 : lista.slice(0, primero).reduce((s2, x) => s2 + (x.duracion || 0), 0));
        const fin = Math.max(fisicoFin, primero < 0 ? 0 : lista.slice(ultimo + 1).reduce((s2, x) => s2 + (x.duracion || 0), 0));
        if (!ini && !fin) return null;
        const pistaHasta = t0 + (prevista - fin) * 60000;
        return <p className="mt-1 text-xs text-orange-800">🏟️ Pista ocupada de {hhmm(new Date(t0 + ini * 60000))} a {hhmm(new Date(pistaHasta))} · prep. física fuera: {ini ? `${ini}′ al empezar` : ""}{ini && fin ? " y " : ""}{fin ? `${fin}′ al acabar` : ""}</p>;
      })()}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-linea">
        <div className={`h-full ${exceso ? "bg-red-600" : "bg-club"}`} style={{ width: `${Math.min(100, (total / Math.max(prevista, 1)) * 100)}%` }} />
      </div>

      <ol className="mt-3 space-y-2">
        {lista.map((a, i) => {
          const desde = new Date(t0 + acumulado * 60000);
          acumulado += a.duracion || 0;
          const tipo = TIPOS[a.tipo] ?? TIPOS.nota;
          const titulo = a.titulo ?? a.ejercicios?.titulo ?? tipo.label;
          return (
            <li
              key={a.id}
              draggable
              onDragStart={() => setArrastrando(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (arrastrando !== null) mover(arrastrando, i); setArrastrando(null); }}
              className={`tarjeta p-3 ${arrastrando === i ? "opacity-50" : ""} ${a.hecho ? "bg-green-50 ring-1 ring-green-300" : ""}`}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="hidden shrink-0 cursor-grab text-tinta/30 sm:block" />
                <button
                  type="button" aria-pressed={!!a.hecho} title={a.hecho ? "Hecho (toca para desmarcar)" : "Marcar como hecho"}
                  onClick={() => { const v = !a.hecho; setLista((l) => l.map((x) => (x.id === a.id ? { ...x, hecho: v } : x))); start(() => actualizarActividad(entrenoId, a.id, { hecho: v })); }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${a.hecho ? "border-green-600 bg-green-600 text-white" : "border-linea text-transparent hover:border-green-500"}`}
                ><Check size={16} strokeWidth={3} /></button>
                <span className="w-11 shrink-0 text-xs tabular-nums text-tinta/50">{hhmm(desde)}</span>
                <button onClick={() => setAbierta(abierta === a.id ? null : a.id)} className="min-w-0 flex-1 text-left">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tipo.color}`}>{tipo.label}</span>
                  <span className={`font-medium ${a.hecho ? "text-tinta/50 line-through" : ""}`}>{titulo}</span>
                  {!a.ejercicio_id && a.notas && abierta !== a.id && <span className="mt-0.5 block truncate text-xs text-tinta/60">{a.notas}</span>}
                </button>
                <input
                  type="number" min={0} defaultValue={a.duracion} aria-label="Minutos"
                  className="campo !w-16 !px-2 !py-1 text-right tabular-nums"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v === a.duracion) return;
                    setLista((l) => l.map((x) => (x.id === a.id ? { ...x, duracion: v } : x)));
                    start(() => actualizarActividad(entrenoId, a.id, { duracion: v }));
                  }}
                />
                <span className="text-xs text-tinta/50">′</span>
                <div className="flex shrink-0 flex-col">
                  <button onClick={() => mover(i, i - 1)} className="text-tinta/40 hover:text-tinta" aria-label="Subir"><ArrowUp size={14} /></button>
                  <button onClick={() => mover(i, i + 1)} className="text-tinta/40 hover:text-tinta" aria-label="Bajar"><ArrowDown size={14} /></button>
                </div>
              </div>

              {abierta === a.id && (
                <div className="mt-3 space-y-2 border-t border-linea pt-3">
                  {a.ejercicio_id && <EjercicioDelEntreno entrenoId={entrenoId} a={a} onCambio={(c) => setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ...c } : x)))} />}
                  {a.ejercicio_id && <label className="etiqueta !mb-0">Variantes y notas para este entreno</label>}
                  <textarea
                    defaultValue={a.notas ?? ""} rows={a.ejercicio_id ? 3 : 2} placeholder={a.ejercicio_id ? "Variantes, progresiones, cambios de reglas, a quién vigilar…" : "Notas para este entreno…"} className="campo"
                    onBlur={(e) => start(() => actualizarActividad(entrenoId, a.id, { notas: e.target.value }))}
                  />
                  <div className="flex justify-between">
                    <span />
                    <button
                      onClick={() => { setLista((l) => l.filter((x) => x.id !== a.id)); start(() => borrarActividad(entrenoId, a.id)); }}
                      className="btn-peligro !px-2 !py-1"
                    >
                      <Trash2 size={14} /> Quitar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {lista.length === 0 && <li className="text-sm text-tinta/50">Añade ejercicios o actividades abajo.</li>}
      </ol>

      <div className="mt-3">
        <SelectorEjercicios entrenoId={entrenoId} ejercicios={ejercicios} yo={yo} edadEquipo={edadEquipo} />
      </div>
      <form
        ref={formAlta}
        action={async (fd) => { await anadirActividad(fd); formAlta.current?.reset(); setTipoAlta("ejercicio"); }}
        className="tarjeta mt-2 space-y-2 p-3"
      >
        <input type="hidden" name="entrenamiento_id" value={entrenoId} />
        <p className="text-xs font-medium text-tinta/60">Añadir rápido (sin pizarra): ejercicio, calentamiento, series, agua, nota…</p>
        <div className="flex flex-wrap gap-2">
          <select name="tipo" value={tipoAlta} onChange={(e) => setTipoAlta(e.target.value)} className="campo !w-auto">
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input name="titulo" required={tipoAlta === "ejercicio"} placeholder={tipoAlta === "ejercicio" ? "Título del ejercicio" : "Título (opcional)"} className="campo min-w-32 flex-1" />
          <input name="duracion" type="number" min={0} placeholder="Min" className="campo !w-20" />
          <Enviar className="btn-secundario shrink-0">Añadir</Enviar>
        </div>
        <textarea name="notas" rows={tipoAlta === "ejercicio" || tipoAlta === "prep_fisica" ? 2 : 1} placeholder={tipoAlta === "ejercicio" ? "Breve descripción: organización, reglas, qué corregir… (opcional)" : tipoAlta === "prep_fisica" ? "Qué se hace: ejercicios, series, repeticiones, descanso… (fuera de pista)" : "Descripción (opcional)"} className="campo text-sm" />
      </form>
      <Link
        href={`/ejercicios/nuevo?entreno=${entrenoId}`}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-azul/30 p-3 text-sm font-medium text-azul transition hover:border-azul hover:bg-azul/5"
      >
        <PenTool size={16} /> Crear ejercicio nuevo con la pizarra
      </Link>
    </section>
  );
}
