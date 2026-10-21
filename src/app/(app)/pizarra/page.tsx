"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import PizarraEditor from "@/components/pizarra";
import { pizarraVacia, type Pizarra } from "@/components/pizarra/modelo";
import { CLAVE_BORRADOR } from "../ejercicios/FormEjercicio";
import { Save, Eraser } from "lucide-react";

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

  const guardarBorrador = useCallback((p: Pizarra) => {
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(p)); } catch {}
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Pizarra</h1>
          <p className="text-sm text-tinta/60">Lo que dibujes se queda en este dispositivo hasta que lo guardes como ejercicio.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => {
              if (!confirm("¿Empezar una pizarra en blanco?")) return;
              try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(pizarraVacia())); } catch {}
              setClave((k) => k + 1);
            }}
          >
            <Eraser size={16} /> Limpiar
          </button>
          <Link href="/ejercicios/nuevo?desde=pizarra" className="btn-primario"><Save size={16} /> Guardar como ejercicio</Link>
        </div>
      </div>
      <div className="mx-auto max-w-3xl">
        <PizarraEditor key={clave} valor={clave ? pizarraVacia() : inicial} onChange={guardarBorrador} altoMax={760} />
      </div>
    </div>
  );
}
