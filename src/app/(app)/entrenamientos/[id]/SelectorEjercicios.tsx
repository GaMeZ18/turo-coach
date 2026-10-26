"use client";

// Elegir ejercicios para el entreno viendo su ficha completa (pizarra, objetivos, correcciones…)
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, Library, Loader2, Plus, Search, X } from "lucide-react";
import { anadirActividad } from "../actions";
import FichaEjercicio from "@/components/FichaEjercicio";
import { CATEGORIAS } from "@/lib/categorias";
import { EDADES } from "@/lib/edades";

export type EjercicioLista = {
  id: string; titulo: string; tipo: string; categoria: string | null; duracion: number | null;
  edades?: string[] | null; etiquetas?: string[] | null; en_biblioteca?: boolean | null; autor_id?: string | null;
};

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function SelectorEjercicios({ entrenoId, ejercicios, yo, edadEquipo }: {
  entrenoId: string; ejercicios: EjercicioLista[]; yo: string; edadEquipo?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [edad, setEdad] = useState(edadEquipo ?? "");
  const [origen, setOrigen] = useState<"todos" | "biblioteca" | "mios">("todos");
  const [sel, setSel] = useState<string | null>(null);
  const [minutos, setMinutos] = useState<string>("");
  const [anadidos, setAnadidos] = useState<string[]>([]);
  const [pendiente, start] = useTransition();

  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    return ejercicios.filter((e) => {
      if (origen === "biblioteca" && !e.en_biblioteca) return false;
      if (origen === "mios" && e.autor_id !== yo) return false;
      if (cat && (cat === "Sistema de juego" ? e.tipo !== "sistema" && e.categoria !== cat : e.categoria !== cat)) return false;
      if (edad && e.edades?.length && !e.edades.includes(edad)) return false;
      if (t && !sinAcentos(`${e.titulo} ${e.categoria ?? ""} ${(e.etiquetas ?? []).join(" ")}`).includes(t)) return false;
      return true;
    });
  }, [ejercicios, q, cat, edad, origen, yo]);

  const elegido = ejercicios.find((e) => e.id === sel) ?? null;

  const anadir = () => {
    if (!elegido) return;
    const fd = new FormData();
    fd.set("entrenamiento_id", entrenoId);
    fd.set("ejercicio_id", elegido.id);
    if (minutos) fd.set("duracion", minutos);
    start(async () => {
      await anadirActividad(fd);
      setAnadidos((a) => [...a, elegido.id]);
    });
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-primario w-full">
        <Library size={16} /> Elegir ejercicio de la biblioteca
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:p-4" onClick={() => setAbierto(false)}>
      <div className="flex w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-linea p-3">
          <Library size={18} className="text-azul" />
          <h2 className="flex-1 font-semibold">Elegir ejercicios</h2>
          {anadidos.length > 0 && <span className="text-sm text-green-700">{anadidos.length} añadido{anadidos.length > 1 ? "s" : ""}</span>}
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg p-1.5 hover:bg-suave" aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Lista */}
          <div className={`flex min-h-0 flex-col border-linea md:border-r ${sel ? "hidden md:flex" : "flex"}`}>
            <div className="space-y-2 border-b border-linea p-3">
              <div className="relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta/40" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: tiro, 2c1, ayudas…" className="campo !pl-8" autoFocus />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="campo !w-auto flex-1 !py-1 text-sm">
                  <option value="">Todas las categorías</option>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={edad} onChange={(e) => setEdad(e.target.value)} className="campo !w-auto !py-1 text-sm">
                  <option value="">Todas las edades</option>
                  {EDADES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex rounded-lg border border-linea p-0.5 text-xs">
                {([["todos", "Todos"], ["biblioteca", "Biblioteca del club"], ["mios", "Míos"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setOrigen(k)} className={`flex-1 rounded-md py-1 ${origen === k ? "bg-azul text-white" : "text-tinta/70"}`}>{l}</button>
                ))}
              </div>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-linea overflow-y-auto">
              {lista.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => { setSel(e.id); setMinutos(e.duracion ? String(e.duracion) : ""); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-suave ${sel === e.id ? "bg-azul/10" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{e.titulo}</span>
                      <span className="block truncate text-[11px] text-tinta/55">
                        {e.tipo === "sistema" ? "Sistema" : e.categoria ?? "Ejercicio"}{e.duracion ? ` · ${e.duracion}′` : ""}{e.edades?.length ? ` · ${e.edades.join(", ")}` : ""}
                      </span>
                    </span>
                    {anadidos.includes(e.id) && <Check size={16} className="shrink-0 text-green-700" />}
                  </button>
                </li>
              ))}
              {lista.length === 0 && <li className="p-4 text-sm text-tinta/50">No hay ejercicios con esos filtros.</li>}
            </ul>
            <p className="border-t border-linea px-3 py-1.5 text-[11px] text-tinta/50">{lista.length} ejercicios</p>
          </div>

          {/* Ficha */}
          <div className={`min-h-0 flex-col ${sel ? "flex" : "hidden md:flex"}`}>
            {elegido ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <button type="button" onClick={() => setSel(null)} className="mb-2 inline-flex items-center gap-1 text-sm text-tinta/60 md:hidden"><ArrowLeft size={14} /> Volver a la lista</button>
                  <FichaEjercicio key={elegido.id} id={elegido.id} />
                </div>
                <div className="flex items-center gap-2 border-t border-linea bg-suave/60 p-3">
                  <label className="text-sm text-tinta/70">Minutos</label>
                  <input type="number" min={0} value={minutos} onChange={(e) => setMinutos(e.target.value)} className="campo !w-20 !py-1.5 text-right" />
                  <button type="button" onClick={anadir} disabled={pendiente} className="btn-primario ml-auto">
                    {pendiente ? <Loader2 size={16} className="animate-spin" /> : anadidos.includes(elegido.id) ? <Check size={16} /> : <Plus size={16} />}
                    {anadidos.includes(elegido.id) ? "Añadir otra vez" : "Añadir al entreno"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-tinta/50">
                Toca un ejercicio para ver su pizarra, objetivos, descripción y correcciones.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
