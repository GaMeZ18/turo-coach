"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, BookMarked, BookOpen, Binoculars, CalendarClock, CalendarDays, ClipboardCheck, Eye, EyeOff, Gauge, Loader2, MapPin, Megaphone, Newspaper,
  Package, PenTool, RotateCcw, Settings2, Shield, Target, Timer, TrafficCone, Trophy, Users, Video,
} from "lucide-react";
import { guardarInicio } from "@/app/(app)/inicio-acciones";

const ICONOS = { Package, BookMarked, Shield, Users, Timer, TrafficCone, PenTool, CalendarDays, Target, Binoculars, Video, BookOpen, Trophy, MapPin, Gauge, ClipboardCheck, Megaphone, Newspaper, CalendarClock } as const;
export type Modulo = { href: string; titulo: string; texto: string; icono: keyof typeof ICONOS; activo: boolean };

function Tarjeta({ m }: { m: Modulo }) {
  const Icono = ICONOS[m.icono] ?? Shield;
  const contenido = (
    <>
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${m.activo ? "bg-azul text-oro ring-2 ring-oro/60 ring-offset-2" : "bg-tinta/5 text-tinta/40"}`}><Icono size={22} /></span>
      <span className="mt-3 block font-[family-name:var(--font-titulo)] text-lg font-bold uppercase leading-tight text-azul">{m.titulo}</span>
      <span className="mt-0.5 block text-xs text-tinta/60">{m.texto}</span>
      {!m.activo && <span className="mt-2 inline-block rounded bg-tinta/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-tinta/50">Próximamente</span>}
    </>
  );
  return m.activo
    ? <Link href={m.href} className="tarjeta border-b-4 !border-b-rojo p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-azul/10">{contenido}</Link>
    : <div className="tarjeta p-4 opacity-70">{contenido}</div>;
}

/** Los botones de Inicio: cada uno elige cuáles ve y en qué orden */
export default function ModulosInicio({ todos, elegidos }: { todos: Modulo[]; elegidos: string[] | null }) {
  const orden = (sel: string[] | null) => sel
    ? [...sel.map((h) => todos.find((m) => m.href === h)).filter(Boolean) as Modulo[], ...todos.filter((m) => !sel.includes(m.href))]
    : todos;
  const [editando, setEditando] = useState(false);
  const [lista, setLista] = useState(orden(elegidos));
  const [visibles, setVisibles] = useState(new Set(elegidos ?? todos.map((m) => m.href)));
  const [pend, start] = useTransition();
  const mostrar = lista.filter((m) => visibles.has(m.href));
  const mover = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= lista.length) return; const n = [...lista]; [n[i], n[j]] = [n[j], n[i]]; setLista(n); };
  const guardar = () => start(async () => { await guardarInicio(lista.filter((m) => visibles.has(m.href)).map((m) => m.href)); setEditando(false); });
  const restablecer = () => start(async () => { await guardarInicio(null); setLista(todos); setVisibles(new Set(todos.map((m) => m.href))); setEditando(false); });

  return (
    <div className="mt-2">
      {editando ? (
        <div className="tarjeta p-3">
          <p className="mb-2 text-sm text-tinta/70">Elige qué botones quieres ver en Inicio y ordénalos con las flechas.</p>
          <ul className="divide-y divide-linea">
            {lista.map((m, i) => {
              const Icono = ICONOS[m.icono] ?? Shield;
              const on = visibles.has(m.href);
              return (
                <li key={m.href} className={`flex items-center gap-2 py-1.5 ${on ? "" : "opacity-50"}`}>
                  <button type="button" onClick={() => setVisibles((v) => { const n = new Set(v); if (n.has(m.href)) n.delete(m.href); else n.add(m.href); return n; })} className="text-tinta/60" aria-label={on ? "Ocultar" : "Mostrar"}>{on ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                  <Icono size={16} className="text-azul" />
                  <span className="flex-1 text-sm font-medium">{m.titulo}</span>
                  <button type="button" onClick={() => mover(i, -1)} className="p-1 text-tinta/50" aria-label="Subir"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => mover(i, 1)} className="p-1 text-tinta/50" aria-label="Bajar"><ArrowDown size={15} /></button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={guardar} disabled={pend} className="btn-primario">{pend && <Loader2 size={15} className="animate-spin" />} Guardar</button>
            <button type="button" onClick={() => { setLista(orden(elegidos)); setVisibles(new Set(elegidos ?? todos.map((m) => m.href))); setEditando(false); }} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={restablecer} disabled={pend} className="btn-secundario"><RotateCcw size={14} /> Como al principio</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{mostrar.map((m) => <Tarjeta key={m.href || m.titulo} m={m} />)}</div>
          <button type="button" onClick={() => setEditando(true)} className="mt-3 inline-flex items-center gap-1 text-xs text-tinta/50 hover:text-tinta"><Settings2 size={13} /> Personalizar Inicio</button>
        </>
      )}
    </div>
  );
}
