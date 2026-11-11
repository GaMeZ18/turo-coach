"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import PizarraEditor from "@/components/pizarra";
import { pizarraVacia, type Pizarra } from "@/components/pizarra/modelo";
import { CLAVE_BORRADOR } from "../ejercicios/FormEjercicio";
import { guardarEjercicio } from "../ejercicios/actions";
import { Save, Eraser, Loader2, X } from "lucide-react";

/** Pizarra libre: para explicar algo al momento. Se guarda como borrador en este dispositivo. */
export default function PizarraLibre() {
  const [inicial] = useState<unknown>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const b = localStorage.getItem(CLAVE_BORRADOR);
      return b ? JSON.parse(b) : undefined;
    } catch {
      return undefined;
    }
  });
  const [clave, setClave] = useState(0);
  const actual = useRef<Pizarra | null>(null);
  const captura = useRef<(() => Promise<string>) | null>(null);
  const registrarCaptura = useCallback((fn: () => Promise<string>) => { captura.current = fn; }, []);
  // Guardar como sistema directamente (sin pasar por el formulario)
  const [sistema, setSistema] = useState<{ titulo: string; visibilidad: "club" | "privado" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, start] = useTransition();

  const guardarBorrador = useCallback((p: Pizarra) => {
    actual.current = p;
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(p)); } catch {}
  }, []);

  const guardarSistema = async () => {
    if (!sistema) return;
    setError(null);
    const p = actual.current ?? (inicial as Pizarra | undefined) ?? null;
    if (!p || !p.elementos?.length) { setError("La pizarra está vacía: dibuja el sistema antes de guardarlo."); return; }
    if (!sistema.titulo.trim()) { setError("Ponle un nombre al sistema."); return; }
    let preview: string | null = null;
    try { preview = captura.current ? await captura.current() : null; } catch {}
    start(async () => {
      const r = await guardarEjercicio({
        tipo: "sistema", titulo: sistema.titulo, descripcion: "", correcciones: "", categoria: "Sistema de juego", etiquetas: ["sistema"],
        jugadores_min: 5, duracion: null, video_url: "", visibilidad: sistema.visibilidad, pizarra: p, preview,
      });
      if (r?.error) setError(r.error);
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Pizarra</h1>
          <p className="text-sm text-tinta/60">Lo que dibujes se queda en este dispositivo hasta que lo guardes como sistema o como ejercicio.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => {
              if (!confirm("¿Empezar una pizarra en blanco?")) return;
              actual.current = pizarraVacia();
              try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(pizarraVacia())); } catch {}
              setClave((k) => k + 1);
            }}
          >
            <Eraser size={16} /> Limpiar
          </button>
          <button type="button" className="btn-primario" onClick={() => { setError(null); setSistema({ titulo: "", visibilidad: "club" }); }}>
            <Save size={16} /> Guardar sistema
          </button>
          <Link href="/ejercicios/nuevo?desde=pizarra" className="btn-secundario"><Save size={16} /> Guardar como ejercicio</Link>
        </div>
      </div>
      {sistema && (
        <div className="zona-segura fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !guardando && setSistema(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Guardar sistema</h2>
              <button type="button" onClick={() => setSistema(null)} className="text-tinta/50 hover:text-tinta" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <label className="etiqueta">Nombre del sistema</label>
            <input autoFocus value={sistema.titulo} onChange={(e) => setSistema({ ...sistema, titulo: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") guardarSistema(); }} className="campo" placeholder="Cuernos 1, saque de fondo caja…" />
            <label className="etiqueta mt-3">Quién lo ve</label>
            <select value={sistema.visibilidad} onChange={(e) => setSistema({ ...sistema, visibilidad: e.target.value as "club" | "privado" })} className="campo">
              <option value="club">Todo el club</option>
              <option value="privado">Solo yo</option>
            </select>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <button type="button" onClick={guardarSistema} disabled={guardando} className="btn-primario mt-4 w-full justify-center">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
            </button>
            <p className="mt-2 text-xs text-tinta/50">Se guarda en Ejercicios como sistema de juego. Luego puedes añadirle descripción y vídeo.</p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl">
        <PizarraEditor key={clave} valor={clave ? pizarraVacia() : inicial} onChange={guardarBorrador} registrarCaptura={registrarCaptura} titulo={sistema?.titulo || "Pizarra"} altoMax={760} />
      </div>
    </div>
  );
}
