"use client";

// Asistencia en la hoja del entreno: se marca aquí mismo (se guarda en la app) y sale impresa en el PDF.
import { useState, useTransition } from "react";
import { guardarAsistencia, todosPresentes } from "@/app/(app)/entrenamientos/actions";

type Registro = { jugador_id: string; estado: string; motivo: string | null };
const ESTADOS = [
  { v: "presente", corto: "P", largo: "Presente", on: "bg-green-600 text-white border-green-600", print: "text-green-700" },
  { v: "ausente", corto: "A", largo: "Ausente", on: "bg-red-600 text-white border-red-600", print: "text-red-700" },
  { v: "justificado", corto: "J", largo: "Justificado", on: "bg-sky-600 text-white border-sky-600", print: "text-sky-700" },
  { v: "tarde", corto: "T", largo: "Tarde", on: "bg-amber-500 text-white border-amber-500", print: "text-amber-700" },
  { v: "lesionado", corto: "L", largo: "Lesionado", on: "bg-violet-600 text-white border-violet-600", print: "text-violet-700" },
];

export default function AsistenciaHoja({ entrenoId, jugadores, registros }: {
  entrenoId: string;
  jugadores: { id: string; nombre: string; dorsal: number | null }[];
  registros: Registro[];
}) {
  const [estado, setEstado] = useState<Record<string, Registro>>(Object.fromEntries(registros.map((r) => [r.jugador_id, r])));
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const marcar = (j: string, v: string, motivo?: string | null) => {
    const m = motivo !== undefined ? motivo : estado[j]?.motivo ?? null;
    setEstado((s) => ({ ...s, [j]: { jugador_id: j, estado: v, motivo: m } }));
    start(async () => {
      try { await guardarAsistencia(entrenoId, j, v, m); setError(null); }
      catch { setError("No se ha podido guardar. Revisa la conexión."); }
    });
  };
  const cuenta = (v: string) => Object.values(estado).filter((r) => r.estado === v).length;
  const presentes = cuenta("presente") + cuenta("tarde");

  return (
    <section className="mt-5 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Asistencia</h2>
        <p className="text-xs text-tinta/60">
          {presentes}/{jugadores.length} presentes
          {cuenta("ausente") ? ` · ${cuenta("ausente")} ausentes` : ""}
          {cuenta("justificado") ? ` · ${cuenta("justificado")} justificados` : ""}
          {cuenta("lesionado") ? ` · ${cuenta("lesionado")} lesionados` : ""}
          <span className="print:hidden">{pendiente ? " · guardando…" : Object.keys(estado).length ? " · guardado ✓" : ""}</span>
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 print:hidden">
        <p className="flex-1 text-xs text-tinta/50">Márcala aquí: se guarda en el entreno y sale en el PDF. Las casillas vacías se pueden rellenar a mano.</p>
        <button type="button" className="btn-secundario !py-1 text-xs" onClick={() => {
          const ids = jugadores.map((j) => j.id);
          setEstado((s) => ({ ...s, ...Object.fromEntries(ids.filter((id) => !s[id]).map((id) => [id, { jugador_id: id, estado: "presente", motivo: null }])) }));
          start(() => todosPresentes(entrenoId, ids.filter((id) => !estado[id])));
        }}>Resto presentes</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700 print:hidden">{error}</p>}
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-tinta/30 text-left text-[11px] uppercase tracking-wide text-tinta/60">
            <th className="w-8 py-1">#</th>
            <th className="py-1">Jugador</th>
            {ESTADOS.slice(0, 3).map((s) => <th key={s.v} className="w-9 py-1 text-center">{s.corto}</th>)}
            <th className="py-1 pl-2">Estado / motivo</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j) => {
            const r = estado[j.id];
            const e = ESTADOS.find((s) => s.v === r?.estado);
            return (
              <tr key={j.id} className="border-b border-linea align-middle">
                <td className="py-1 text-xs font-semibold text-azul">{j.dorsal ?? ""}</td>
                <td className="py-1 pr-2">{j.nombre}</td>
                {ESTADOS.slice(0, 3).map((s) => (
                  <td key={s.v} className="py-1 text-center">
                    <button type="button" onClick={() => marcar(j.id, s.v)} title={s.largo}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded border text-xs font-bold ${r?.estado === s.v ? s.on : "border-tinta/40 text-transparent print:text-transparent"} print:pointer-events-none`}>
                      {r?.estado === s.v ? "✓" : s.corto}
                    </button>
                  </td>
                ))}
                <td className="py-1 pl-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex gap-1 print:hidden">
                      {ESTADOS.slice(3).map((s) => (
                        <button key={s.v} type="button" onClick={() => marcar(j.id, s.v)} title={s.largo}
                          className={`h-6 rounded border px-1.5 text-[11px] font-semibold ${r?.estado === s.v ? s.on : "border-linea text-tinta/50"}`}><span className="sm:hidden">{s.corto}</span><span className="hidden sm:inline">{s.largo}</span></button>
                      ))}
                    </span>
                    {e && <span className={`hidden text-xs font-semibold print:inline ${e.print}`}>{e.largo}</span>}
                    {r && r.estado !== "presente" ? (
                      <input defaultValue={r.motivo ?? ""} placeholder="Motivo" key={`${j.id}-${r.estado}`}
                        onBlur={(ev) => ev.target.value !== (r.motivo ?? "") && marcar(j.id, r.estado, ev.target.value || null)}
                        className="min-w-0 flex-1 rounded border border-linea px-1.5 py-0.5 text-xs print:border-0 print:p-0" />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-tinta/50">P presente · A ausente · J justificado{` `}<span className="print:hidden">· también puedes marcar Tarde o Lesionado</span></p>
    </section>
  );
}
