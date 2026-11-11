"use client";

import { useEffect, useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { guardarAsistencia, todosPresentes } from "../actions";
import { guardarVariasAsistencias } from "../../acciones-asistencia";
import { propuesta, textoRespuesta, MOTIVOS_NO_DISP, type NoDisponible, type Respuesta } from "@/lib/asistencia";
import EnlaceAsistencia from "@/components/EnlaceAsistencia";

type Registro = { jugador_id: string; estado: string; motivo: string | null };

const ESTADOS = [
  { v: "presente", corto: "P", clase: "bg-green-600 text-white" },
  { v: "tarde", corto: "T", clase: "bg-amber-500 text-white" },
  { v: "justificado", corto: "J", clase: "bg-sky-600 text-white" },
  { v: "lesionado", corto: "L", clase: "bg-violet-600 text-white" },
  { v: "ausente", corto: "A", clase: "bg-red-600 text-white" },
];
const fecha = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

export default function Asistencia({
  entrenoId, jugadores, registros, respuestas = {}, noDisp = {}, equipoId, equipo,
}: {
  entrenoId: string;
  jugadores: { id: string; nombre: string; dorsal: number | null }[];
  registros: Registro[];
  respuestas?: Record<string, Respuesta>;
  noDisp?: Record<string, NoDisponible>;
  equipoId?: string;
  equipo?: string;
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
  const nResp = jugadores.filter((j) => respuestas[j.id]).length;
  const hayInfo = nResp > 0 || jugadores.some((j) => noDisp[j.id]);
  const sinMarcar = jugadores.filter((j) => !estado[j.id]);
  // Con lo que han respondido: viene → presente, lesión → lesionado, otro motivo → justificado, sin respuesta → ausente
  const rellenar = () => {
    const filas = sinMarcar.map((j) => ({ jugador_id: j.id, ...propuesta(respuestas[j.id], noDisp[j.id]) }));
    setEstado((s) => ({ ...s, ...aMapa(filas) }));
    start(() => guardarVariasAsistencias(entrenoId, filas));
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Asistencia</h2>
        <span className="text-sm text-tinta/60">{presentes}/{jugadores.length}{pendiente ? " · guardando…" : ""}</span>
      </div>
      {equipoId && equipo && <div className="mt-2"><EnlaceAsistencia equipoId={equipoId} equipo={equipo} /></div>}
      {nResp > 0 && (
        <p className="mt-2 rounded-lg bg-suave px-3 py-2 text-xs">
          Enlace: <strong className="text-green-700">{jugadores.filter((j) => respuestas[j.id]?.va).length} vienen</strong> ·{" "}
          <strong className="text-red-700">{jugadores.filter((j) => respuestas[j.id] && !respuestas[j.id].va).length} no</strong> ·{" "}
          {jugadores.length - nResp} sin contestar
        </p>
      )}
      <div className="mt-2 flex gap-2">
        {hayInfo && sinMarcar.length > 0 && (
          <button onClick={rellenar} className="btn-primario flex-1 !py-1.5" title="Marca a los que faltan según lo que han respondido; luego puedes cambiar a quien quieras">
            <Wand2 size={15} /> Rellenar con las respuestas
          </button>
        )}
        <button
          onClick={() => {
            const ids = jugadores.map((j) => j.id);
            setEstado(Object.fromEntries(ids.map((id) => [id, { jugador_id: id, estado: "presente", motivo: null }])));
            start(() => todosPresentes(entrenoId, ids));
          }}
          className="btn-secundario flex-1 !py-1.5"
        >
          Todos presentes
        </button>
      </div>
      <ul className="tarjeta mt-2 divide-y divide-linea">
        {jugadores.map((j) => {
          const r = estado[j.id];
          const resp = respuestas[j.id];
          const nd = noDisp[j.id];
          const necesitaMotivo = r && r.estado !== "presente";
          return (
            <li key={j.id} className={`px-3 py-2 ${nd && !r ? "bg-suave" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-semibold text-club">{j.dorsal ?? ""}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${nd ? "text-tinta/50" : ""}`}>{j.nombre}</span>
                  {nd ? <span className="block text-[11px] text-tinta/60">🚫 No disponible hasta el {fecha(nd.hasta)} ({MOTIVOS_NO_DISP[nd.motivo as keyof typeof MOTIVOS_NO_DISP] ?? "otros"})</span>
                    : resp ? <span className={`block truncate text-[11px] ${resp.va ? "text-green-700" : "text-red-700"}`} title={textoRespuesta(resp)}>{resp.va ? "✅" : "❌"} {textoRespuesta(resp)}</span>
                    : nResp > 0 ? <span className="block text-[11px] text-tinta/40">Sin contestar</span> : null}
                </span>
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
                  key={r.motivo ?? ""}
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
      <p className="mt-2 text-xs text-tinta/50">P presente · T tarde · J justificado · L lesionado · A ausente. Si alguien llega tarde, toca la T.</p>
    </section>
  );
}
