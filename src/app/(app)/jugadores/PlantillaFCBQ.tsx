"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { importarPlantillaFCBQ, type JugadorFCBQ } from "./actions";

import type { Candidato, CambioDorsal } from "@/lib/plantilla-fcbq";

export default function PlantillaFCBQ({ equipoId, candidatos, cambios }: { equipoId: string; candidatos: Candidato[]; cambios: CambioDorsal[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(candidatos.map((c) => ({ ...c, marcado: true })));
  const [conDorsales, setConDorsales] = useState(true);
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!candidatos.length && !cambios.length) return null;

  const set = (i: number, k: keyof JugadorFCBQ, v: string) =>
    setLista((l) => l.map((x, j) => (j === i ? { ...x, [k]: k === "dorsal" ? (v === "" ? null : Number(v)) : v } : x)));
  const importar = () => start(async () => {
    try {
      const r = await importarPlantillaFCBQ(equipoId, lista.filter((x) => x.marcado).map(({ nombre, apellidos, dorsal }) => ({ nombre, apellidos, dorsal })), conDorsales ? cambios.map((c) => ({ jugadorId: c.jugadorId, dorsal: c.dorsal })) : []);
      setMsg([r.altas ? `${r.altas} jugadores añadidos` : "", r.dorsales ? `${r.dorsales} dorsales actualizados` : ""].filter(Boolean).join(" y ") || "No había nada que cambiar.");
      setAbierto(false);
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "No se ha podido importar."); }
  });

  return (
    <div className="tarjeta mt-4 border-l-4 !border-l-oro p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <strong>En las actas de la FCBQ</strong> hay {candidatos.length ? `${candidatos.length} jugadores que no están en esta plantilla` : ""}
          {candidatos.length && cambios.length ? " y " : ""}{cambios.length ? `${cambios.length} dorsales distintos` : ""}.
        </p>
        {!abierto && <button type="button" className="btn-primario !py-1.5 text-sm" onClick={() => setAbierto(true)}><Download size={16} /> Revisar e importar</button>}
      </div>
      {msg && <p className="mt-2 flex items-center gap-1.5 text-sm text-green-800"><CheckCircle2 size={16} /> {msg}</p>}

      {abierto && (
        <div className="mt-3 space-y-3">
          {lista.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-tinta/50"><tr><th /><th className="text-left font-normal">Nombre</th><th className="text-left font-normal">Apellidos</th><th className="w-16 font-normal">Dorsal</th><th className="text-left font-normal">En el acta</th></tr></thead>
                <tbody>
                  {lista.map((c, i) => (
                    <tr key={i} className={`border-t border-linea ${c.marcado ? "" : "opacity-50"}`}>
                      <td className="py-1 pr-2"><input type="checkbox" checked={c.marcado} onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, marcado: e.target.checked } : x)))} className="h-4 w-4" /></td>
                      <td className="py-1 pr-1"><input value={c.nombre} onChange={(e) => set(i, "nombre", e.target.value)} className="campo !py-1 text-sm" /></td>
                      <td className="py-1 pr-1"><input value={c.apellidos} onChange={(e) => set(i, "apellidos", e.target.value)} className="campo !py-1 text-sm" /></td>
                      <td className="py-1 pr-1"><input value={c.dorsal ?? ""} onChange={(e) => set(i, "dorsal", e.target.value)} type="number" className="campo !py-1 text-center text-sm" /></td>
                      <td className="py-1 text-xs text-tinta/50" data-no-traducir>{c.completo} · {c.partidos} partidos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-tinta/50">Revisa cómo ha separado nombre y apellidos. Si el jugador ya existe en el club (otra temporada), se vincula en lugar de duplicarlo.</p>
            </div>
          )}
          {cambios.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={conDorsales} onChange={(e) => setConDorsales(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>Actualizar dorsales según la FCBQ: {cambios.map((c) => `${c.nombre} ${c.antes ?? "–"} → ${c.dorsal}`).join(" · ")}</span>
            </label>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-primario" onClick={importar} disabled={pendiente}>{pendiente && <Loader2 size={16} className="animate-spin" />} {lista.some((x) => x.marcado) ? `Importar ${lista.filter((x) => x.marcado).length} jugadores` : "Actualizar dorsales"}</button>
            <button type="button" className="btn-secundario" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
