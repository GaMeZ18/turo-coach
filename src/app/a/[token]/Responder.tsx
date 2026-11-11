"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { MOTIVOS, type MotivoTipo } from "@/lib/asistencia";
import { misRespuestas, responder } from "../actions";

export type Evento = { clave: string; tipo: "e" | "p"; fecha: string; titulo: string; lugar: string | null; anulado: string | null };
type Jugador = { id: string; nombre: string; dorsal: number | null };
type Mia = { va: boolean; motivo_tipo: MotivoTipo | null };

const TZ = "Europe/Madrid";
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

function Tarjeta({ ev, mia, token, yo, respondidos, jugadores, onGuardado }: {
  ev: Evento; mia: Mia | undefined; token: string; yo: string; respondidos: string[]; jugadores: Jugador[]; onGuardado: (m: Mia) => void;
}) {
  const [noVoy, setNoVoy] = useState(false);
  const [tipo, setTipo] = useState<MotivoTipo | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verLista, setVerLista] = useState(false);
  const [pend, start] = useTransition();
  const empezado = new Date(ev.fecha).getTime() < Date.now();
  const enviar = (va: boolean) => start(async () => {
    setError(null);
    const r = await responder(token, yo, ev.clave, va, va ? null : tipo, va ? null : texto);
    if (r.error) setError(r.error);
    else { onGuardado({ va, motivo_tipo: va ? null : tipo ?? "otro" }); setNoVoy(false); }
  });
  const hechos = new Set(respondidos);
  return (
    <li className={`tarjeta overflow-hidden ${ev.anulado ? "opacity-60" : ""}`}>
      <div className={`flex items-center gap-2 px-3 py-2 text-white ${ev.tipo === "p" ? "bg-rojo" : "bg-azul"}`}>
        <span className="text-lg">{ev.tipo === "p" ? "🏆" : "🏀"}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold">{ev.titulo}</p>
          <p className="text-xs capitalize text-white/85">{dia(ev.fecha)} · {hora(ev.fecha)}</p>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {ev.lugar && <p className="flex items-center gap-1 text-xs text-tinta/60"><MapPin size={13} /> {ev.lugar}</p>}
        {ev.anulado ? <p className="text-sm font-semibold text-red-700">Anulado{ev.anulado ? ` · ${ev.anulado}` : ""}</p>
          : empezado ? <p className="text-sm text-tinta/60">Ya ha empezado.{mia ? (mia.va ? " Dijiste que venías ✅" : " Dijiste que no venías ❌") : ""}</p>
          : (
            <>
              {mia && !noVoy && (
                <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${mia.va ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  {mia.va ? "✅ Has dicho que vienes" : `❌ Has dicho que no vienes${mia.motivo_tipo ? ` (${MOTIVOS[mia.motivo_tipo].toLowerCase()})` : ""}`}
                  <span className="block text-xs font-normal opacity-70">Puedes cambiarlo hasta que empiece.</span>
                </p>
              )}
              {noVoy ? (
                <div className="space-y-2 rounded-lg border border-linea p-3">
                  <p className="text-sm font-semibold">¿Por qué no puedes venir?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(MOTIVOS) as MotivoTipo[]).map((m) => (
                      <button key={m} type="button" onClick={() => setTipo(m)} className={`rounded-full border px-3 py-1 text-sm ${tipo === m ? "border-azul bg-azul text-white" : "border-linea bg-white"}`}>{MOTIVOS[m]}</button>
                    ))}
                  </div>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Algo más que quieras decir (opcional)" className="campo text-sm" />
                  <div className="flex gap-2">
                    <button type="button" disabled={pend || !tipo} onClick={() => enviar(false)} className="btn-primario flex-1 !bg-red-600">{pend ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Enviar</button>
                    <button type="button" onClick={() => setNoVoy(false)} className="btn-secundario">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={pend} onClick={() => enviar(true)} className={`flex items-center justify-center gap-1.5 rounded-xl py-3 font-semibold transition ${mia?.va ? "bg-green-600 text-white" : "border-2 border-green-600 text-green-700"}`}>{pend ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />} Voy</button>
                  <button type="button" disabled={pend} onClick={() => { setTipo(mia?.motivo_tipo ?? null); setNoVoy(true); }} className={`flex items-center justify-center gap-1.5 rounded-xl py-3 font-semibold transition ${mia && !mia.va ? "bg-red-600 text-white" : "border-2 border-red-600 text-red-700"}`}><X size={18} /> No voy</button>
                </div>
              )}
              {error && <p className="text-sm text-red-700">{error}</p>}
            </>
          )}
        {!ev.anulado && (
          <div>
            <button type="button" onClick={() => setVerLista(!verLista)} className="text-xs text-tinta/60 underline">
              {hechos.size} de {jugadores.length} han respondido
            </button>
            {verLista && (
              <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
                {jugadores.map((j) => <li key={j.id} className={hechos.has(j.id) ? "text-green-700" : "text-tinta/40"}>{hechos.has(j.id) ? "✓" : "·"} {j.nombre}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function Responder({ token, equipo, jugadores, eventos, respondidos }: {
  token: string; equipo: string; jugadores: Jugador[]; eventos: Evento[]; respondidos: Record<string, string[]>;
}) {
  const clave = `asis-${token}`;
  const [yo, setYo] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [mias, setMias] = useState<Record<string, Mia> | null>(null);
  const [resp, setResp] = useState(respondidos);
  useEffect(() => {
    try { const g = localStorage.getItem(clave); if (g && jugadores.some((j) => j.id === g)) setYo(g); } catch { /* sin almacenamiento */ }
    setListo(true);
  }, [clave, jugadores]);
  useEffect(() => {
    if (!yo) return;
    setMias(null);
    misRespuestas(token, yo).then(setMias).catch(() => setMias({}));
  }, [yo, token]);
  const elegir = (id: string | null) => { setYo(id); try { if (id) localStorage.setItem(clave, id); else localStorage.removeItem(clave); } catch { /* nada */ } };

  if (!listo) return <p className="flex items-center gap-1 text-sm text-tinta/60"><Loader2 size={14} className="animate-spin" /> Cargando…</p>;
  const j = jugadores.find((x) => x.id === yo);
  if (!j) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">¿Quién eres?</h1>
        <p className="mt-1 text-sm text-tinta/60">Toca tu nombre para decir si vienes a los entrenos y partidos de {equipo}. En este móvil se recordará.</p>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {jugadores.map((x) => (
            <li key={x.id}><button type="button" onClick={() => elegir(x.id)} className="tarjeta flex w-full items-center gap-2 p-3 text-left hover:shadow-md">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul text-sm font-bold text-white">{x.dorsal ?? "·"}</span>
              <span className="truncate font-medium">{x.nombre}</span>
            </button></li>
          ))}
        </ul>
        {jugadores.length === 0 && <p className="mt-4 text-sm text-tinta/60">El equipo aún no tiene jugadores.</p>}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Hola, {j.nombre.split(" ")[0]} 👋</h1>
        <button type="button" onClick={() => elegir(null)} className="text-sm text-azul underline">No soy {j.nombre.split(" ")[0]}</button>
      </div>
      <p className="mt-1 text-sm text-tinta/60">Dinos si vienes. Si no puedes, el motivo solo lo ve tu entrenador.</p>
      {eventos.length === 0 ? <p className="tarjeta mt-4 p-4 text-sm text-tinta/60">No hay entrenos ni partidos en los próximos días.</p> : mias === null ? (
        <p className="mt-4 flex items-center gap-1 text-sm text-tinta/60"><Loader2 size={14} className="animate-spin" /> Cargando…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {eventos.map((ev) => (
            <Tarjeta key={ev.clave} ev={ev} mia={mias[ev.clave]} token={token} yo={j.id} jugadores={jugadores} respondidos={resp[ev.clave] ?? []}
              onGuardado={(m) => { setMias({ ...mias, [ev.clave]: m }); setResp((r) => ({ ...r, [ev.clave]: [...new Set([...(r[ev.clave] ?? []), j.id])] })); }} />
          ))}
        </ul>
      )}
    </div>
  );
}
