"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { completarFiltrosEjercicios } from "../ejercicios/actions";

/** Rellena los datos de filtro (para qué sirve, jugadores, material…) de los ejercicios que no los tienen */
export default function CompletarDatos() {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const lanzar = () => start(async () => {
    try {
      let rev = 0, act = 0;
      for (let vuelta = 0; vuelta < 30; vuelta++) {
        const r = await completarFiltrosEjercicios();
        rev += r.revisados; act += r.actualizados;
        if (r.error) { setMsg({ ok: false, t: act ? `Completados ${act}, pero ha fallado: ${r.error}` : r.error }); router.refresh(); return; }
        if (!r.quedan) break;
        setMsg({ ok: true, t: `Completados ${act}… quedan ${r.quedan}` });
      }
      setMsg({ ok: true, t: act ? `Listo: completados ${act} de ${rev} ejercicios revisados.` : `Ya estaban todos al día (${rev} revisados).` });
      router.refresh();
    } catch {
      setMsg({ ok: false, t: "No se ha podido completar. Recarga la página y vuelve a probar." });
    }
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-azul/10 p-3 text-sm">
      <span className="flex-1">Rellena automáticamente los datos para filtrar (para qué sirve, jugadores, posiciones, material) en todos los ejercicios que no los tengan, también los de los entrenadores. No cambia lo que ya esté marcado.</span>
      <button type="button" onClick={lanzar} disabled={pendiente} className="btn-secundario !py-1.5">
        {pendiente && <Loader2 size={16} className="animate-spin" />} Completar datos de los ejercicios
      </button>
      {msg && <p className={`w-full text-sm ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.t}</p>}
    </div>
  );
}
