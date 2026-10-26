"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GripVertical, PenTool, Trash2 } from "lucide-react";
import {
  actualizarActividad, anadirActividad, borrarActividad, reordenarActividades,
} from "../actions";
import Enviar from "@/components/Enviar";
import FichaEjercicio from "@/components/FichaEjercicio";
import SelectorEjercicios, { type EjercicioLista } from "./SelectorEjercicios";

type Actividad = {
  id: string; orden: number; tipo: string; titulo: string | null; duracion: number; notas: string | null;
  ejercicio_id: string | null;
  ejercicios: { titulo: string; preview: string | null; descripcion: string | null } | null;
};

const TIPOS: Record<string, { label: string; color: string }> = {
  ejercicio: { label: "Ejercicio", color: "bg-club/10 text-club" },
  calentamiento: { label: "Calentamiento", color: "bg-amber-100 text-amber-800" },
  estiramientos: { label: "Estiramientos", color: "bg-emerald-100 text-emerald-800" },
  series: { label: "Series", color: "bg-violet-100 text-violet-800" },
  agua: { label: "Agua", color: "bg-sky-100 text-sky-800" },
  nota: { label: "Nota", color: "bg-tinta/5 text-tinta/70" },
};

const TZ = "Europe/Madrid";
const hhmm = (d: Date) => d.toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export default function Actividades({
  entrenoId, inicio, prevista, actividades, ejercicios, yo, edadEquipo,
}: {
  entrenoId: string; inicio: string; prevista: number; actividades: Actividad[]; ejercicios: EjercicioLista[]; yo: string; edadEquipo?: string | null;
}) {
  const [lista, setLista] = useState(actividades);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [, start] = useTransition();
  const formAlta = useRef<HTMLFormElement>(null);
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
              className={`tarjeta p-3 ${arrastrando === i ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="hidden shrink-0 cursor-grab text-tinta/30 sm:block" />
                <span className="w-11 shrink-0 text-xs tabular-nums text-tinta/50">{hhmm(desde)}</span>
                <button onClick={() => setAbierta(abierta === a.id ? null : a.id)} className="min-w-0 flex-1 text-left">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tipo.color}`}>{tipo.label}</span>
                  <span className="font-medium">{titulo}</span>
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
                  {a.ejercicio_id && <FichaEjercicio id={a.ejercicio_id} compacta />}
                  <textarea
                    defaultValue={a.notas ?? ""} rows={2} placeholder="Notas para este entreno…" className="campo"
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
        action={async (fd) => { await anadirActividad(fd); formAlta.current?.reset(); }}
        className="tarjeta mt-2 space-y-2 p-3"
      >
        <input type="hidden" name="entrenamiento_id" value={entrenoId} />
        <p className="text-xs font-medium text-tinta/60">Otra actividad (calentamiento, agua, nota…)</p>
        <div className="flex flex-wrap gap-2">
          <select name="tipo" className="campo !w-auto">
            {Object.entries(TIPOS).filter(([k]) => k !== "ejercicio").map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input name="titulo" placeholder="Título (opcional)" className="campo min-w-32 flex-1" />
          <input name="duracion" type="number" min={0} placeholder="Min" className="campo !w-20" />
          <Enviar className="btn-secundario shrink-0">Añadir</Enviar>
        </div>
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
