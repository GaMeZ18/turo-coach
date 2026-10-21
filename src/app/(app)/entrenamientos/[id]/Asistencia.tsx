"use client";

import { useEffect, useState, useTransition } from "react";
import { guardarAsistencia, todosPresentes } from "../actions";

type Registro = { jugador_id: string; estado: string; motivo: string | null };

const ESTADOS = [
  { v: "presente", corto: "P", clase: "bg-green-600 text-white" },
  { v: "tarde", corto: "T", clase: "bg-amber-500 text-white" },
  { v: "justificado", corto: "J", clase: "bg-sky-600 text-white" },
  { v: "lesionado", corto: "L", clase: "bg-violet-600 text-white" },
  { v: "ausente", corto: "A", clase: "bg-red-600 text-white" },
];

export default function Asistencia({
  entrenoId, jugadores, registros,
}: {
  entrenoId: string;
  jugadores: { id: string; nombre: string; dorsal: number | null }[];
  registros: Registro[];
}) {
  const aMapa = (r: Registro[]) => Object.fromEntries(r.map((x) => [x.jugador_id, x]));
  const [estado, setEstado] = useState<Record<string, Registro>>(aMapa(registros));
  const [pendiente, start] = useTransition();
  useEffect(() => setEstado(aMapa(registros)), [registros]);

  const marcar = (j: string, v: string, motivo?: string | null) => {
    const m = motivo !== undefined ? motivo : estado[j]?.motivo ?? null;
    setEstado((s) => ({ ...s, [j]: { jugador_id: j, estado: v, motivo: m } }));
    start(() => guardarAsistencia(entrenoId, j, v, m));
  };

  const presentes = Object.values(estado).filter((r) => r.estado === "presente" || r.estado === "tarde").length;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Asistencia</h2>
        <span className="text-sm text-tinta/60">{presentes}/{jugadores.length}{pendiente ? " · guardando…" : ""}</span>
      </div>
      <button
        onClick={() => {
          const ids = jugadores.map((j) => j.id);
          setEstado(Object.fromEntries(ids.map((id) => [id, { jugador_id: id, estado: "presente", motivo: null }])));
          start(() => todosPresentes(entrenoId, ids));
        }}
        className="btn-secundario mt-2 w-full !py-1.5"
      >
        Todos presentes
      </button>
      <ul className="tarjeta mt-2 divide-y divide-linea">
        {jugadores.map((j) => {
          const r = estado[j.id];
          const necesitaMotivo = r && r.estado !== "presente";
          return (
            <li key={j.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-semibold text-club">{j.dorsal ?? ""}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{j.nombre}</span>
                <div className="flex gap-1">
                  {ESTADOS.map((s) => (
                    <button
                      key={s.v}
                      title={s.v}
                      onClick={() => marcar(j.id, s.v)}
                      className={`h-7 w-7 rounded-md text-xs font-semibold transition ${r?.estado === s.v ? s.clase : "bg-suave text-tinta/50 hover:bg-linea"}`}
                    >
                      {s.corto}
                    </button>
                  ))}
                </div>
              </div>
              {necesitaMotivo && (
                <input
                  defaultValue={r.motivo ?? ""}
                  placeholder="Motivo"
                  className="campo mt-1.5 !py-1 text-xs"
                  onBlur={(e) => e.target.value !== (r.motivo ?? "") && marcar(j.id, r.estado, e.target.value || null)}
                />
              )}
            </li>
          );
        })}
        {jugadores.length === 0 && <li className="px-3 py-4 text-sm text-tinta/50">El equipo no tiene jugadores.</li>}
      </ul>
      <p className="mt-2 text-xs text-tinta/50">P presente · T tarde · J justificado · L lesionado · A ausente</p>
    </section>
  );
}
