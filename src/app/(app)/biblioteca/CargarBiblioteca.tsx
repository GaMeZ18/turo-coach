"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cargarBibliotecaInicial } from "../ejercicios/actions";

export default function CargarBiblioteca({ texto }: { texto: string }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const cargar = () => start(async () => {
    try {
      // Se carga por tandas (el servidor tiene un tiempo límite por llamada) hasta que no quede ninguno
      // También actualiza los que ya estaban (pizarras nuevas, textos) y quita los retirados
      let total = 0, act = 0, fuera = 0;
      for (let vuelta = 0; vuelta < 20; vuelta++) {
        const r = await cargarBibliotecaInicial();
        if (r.error) { setMsg({ ok: false, t: total || act ? `Añadidos ${total} y actualizados ${act}, pero ha fallado: ${r.error}` : r.error }); router.refresh(); return; }
        total += r.nuevos; act += r.actualizados ?? 0; fuera += r.quitados ?? 0;
        if (!r.quedan) break;
        setMsg({ ok: true, t: `Añadidos ${total}, actualizados ${act}… quedan ${r.quedan}` });
      }
      const partes = [total && `añadidos ${total}`, act && `actualizados ${act}`, fuera && `retirados ${fuera}`].filter(Boolean);
      setMsg({ ok: true, t: partes.length ? `Biblioteca al día: ${partes.join(", ")}.` : "Ya estaba todo al día." });
      router.refresh();
    } catch {
      setMsg({ ok: false, t: "No se ha podido cargar. Recarga la página (Ctrl+Shift+R) y vuelve a probar." });
    }
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-oro/15 p-3 text-sm">
      <span className="flex-1">{texto}</span>
      <button type="button" onClick={cargar} disabled={pendiente} className="btn-primario !py-1.5">
        {pendiente && <Loader2 size={16} className="animate-spin" />} Cargar / actualizar biblioteca
      </button>
      {msg && <p className={`w-full text-sm ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.t}</p>}
    </div>
  );
}
