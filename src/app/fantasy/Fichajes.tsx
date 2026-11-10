"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Lock, Moon, Plus, Search, Star, X } from "lucide-react";
import { guardarEquipo } from "./actions";
import { COMODINES, MAX_POR_EQUIPO, type Comodin } from "@/lib/fantasy/motor";

export type JugadorMercado = {
  id: string; persona: string; nombre: string; dorsal: string; equipo: string; equipoId: string; chica: boolean;
  precio: number; media: number | null; pj: number; tendencia: number; ultimo: number | null; descansa: boolean; bloqueado: boolean;
};
type Actual = { titulares: string[]; suplente: string | null; capitan: string; comodin: Comodin | null } | null;

const n = (v: number) => v.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Fichajes({ jornada, nombre, cierre, mercado, actual, comodinesUsados, presupuesto, cerrada }: {
  jornada: string; nombre: string; cierre: string; mercado: JugadorMercado[]; actual: Actual;
  comodinesUsados: Partial<Record<Comodin, string>>; presupuesto: number; cerrada: boolean;
}) {
  const porId = useMemo(() => new Map(mercado.map((j) => [j.id, j])), [mercado]);
  const [tit, setTit] = useState<string[]>(actual?.titulares.filter((id) => porId.has(id)) ?? []);
  const [sup, setSup] = useState<string | null>(actual?.suplente && porId.has(actual.suplente) ? actual.suplente : null);
  const [cap, setCap] = useState<string | null>(actual?.capitan ?? null);
  const [com, setCom] = useState<Comodin | null>(actual?.comodin ?? null);
  const [q, setQ] = useState("");
  const [eq, setEq] = useState("");
  const [orden, setOrden] = useState<"precio" | "media" | "ultimo" | "nombre">("precio");
  const [msg, setMsg] = useState<{ ok?: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();

  const limite = presupuesto + (com === "presupuesto" ? 10 : 0);
  const elegidos = [...tit, ...(sup ? [sup] : [])];
  const coste = elegidos.reduce((s, id) => s + (porId.get(id)?.precio ?? 0), 0);
  const queda = limite - coste;
  const personas = new Set(elegidos.map((id) => porId.get(id)?.persona));
  const delEquipo = (e: string) => tit.filter((id) => porId.get(id)?.equipoId === e).length;
  const equipos = [...new Map(mercado.map((j) => [j.equipoId, j.equipo])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cerrado = new Date().toISOString() >= cierre || cerrada;
  const fechaCierre = new Date(cierre).toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

  const motivo = (j: JugadorMercado): string | null => {
    if (j.bloqueado) return "Bloqueado (lo fichaste la jornada anterior)";
    if (personas.has(j.persona) && !elegidos.includes(j.id)) return "Ya lo tienes con otro equipo";
    return null;
  };
  const anadir = (j: JugadorMercado) => {
    setMsg(null);
    const m = motivo(j); if (m) return setMsg({ t: m });
    if (tit.length < 5) {
      if (delEquipo(j.equipoId) >= MAX_POR_EQUIPO) return setMsg({ t: `Ya tienes ${MAX_POR_EQUIPO} titulares de ${j.equipo}. Puedes ponerlo de suplente cuando tengas los 5.` });
      setTit([...tit, j.id]); if (!cap) setCap(j.id);
    } else if (!sup) setSup(j.id);
    else setMsg({ t: "Ya tienes los 5 titulares y el suplente. Quita a alguien primero." });
  };
  const quitar = (id: string) => {
    setTit(tit.filter((x) => x !== id)); if (sup === id) setSup(null);
    if (cap === id) setCap(tit.find((x) => x !== id) ?? null);
  };
  const guardar = () => start(async () => {
    setMsg(null);
    if (tit.length !== 5) return setMsg({ t: "Te faltan titulares (son 5)." });
    if (!cap || !tit.includes(cap)) return setMsg({ t: "Elige capitán (toca la C)." });
    if (queda < 0) return setMsg({ t: `Te pasas ${-queda} ⭐ del presupuesto.` });
    const r = await guardarEquipo({ titulares: tit, suplente: sup, capitan: cap, comodin: com });
    setMsg(r.error ? { t: r.error } : { ok: true, t: "¡Equipo guardado! Lo puedes cambiar hasta el cierre." });
  });

  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    return mercado.filter((j) => (!eq || j.equipoId === eq) && (!t || sinAcentos(`${j.nombre} ${j.equipo} ${j.dorsal}`).includes(t)))
      .sort((a, b) => orden === "precio" ? b.precio - a.precio || (b.media ?? 0) - (a.media ?? 0)
        : orden === "media" ? (b.media ?? -99) - (a.media ?? -99)
        : orden === "ultimo" ? (b.ultimo ?? -99) - (a.ultimo ?? -99)
        : a.nombre.localeCompare(b.nombre));
  }, [mercado, q, eq, orden]);

  const Hueco = ({ id, i, suplente }: { id?: string; i: number; suplente?: boolean }) => {
    const j = id ? porId.get(id) : null;
    return (
      <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${j ? "border-linea bg-white" : "border-dashed border-linea text-tinta/40"}`}>
        <span className="w-8 shrink-0 text-center text-[10px] font-bold uppercase text-tinta/50">{suplente ? "SUP" : i + 1}</span>
        {j ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{j.nombre} <span className="text-xs font-normal text-tinta/50">{j.equipo}</span>{j.descansa && <span className="ml-1 text-[10px] font-semibold text-amber-700">DESCANSA</span>}</span>
            <span className="text-xs font-semibold">{j.precio} ⭐</span>
            {!suplente && !cerrado && (
              <button onClick={() => setCap(j.id)} className={`h-6 w-6 rounded text-[11px] font-black ${cap === j.id ? "bg-oro text-tinta" : "bg-suave text-tinta/40"}`} title="Capitán (puntúa doble)">C</button>
            )}
            {!suplente && cerrado && cap === j.id && <span className="h-6 w-6 rounded bg-oro text-center text-[11px] font-black leading-6">C</span>}
            {!cerrado && <button onClick={() => quitar(j.id)} className="text-tinta/40 hover:text-rojo" aria-label="Quitar"><X size={16} /></button>}
          </>
        ) : <span className="flex-1">{suplente ? "Suplente (entra si un titular no juega)" : "Vacío"}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section className="tarjeta space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Tu equipo · {nombre}</h2>
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-sm font-bold ${queda < 0 ? "bg-red-100 text-red-700" : "bg-oro/25"}`}>{queda} ⭐ libres <span className="font-normal text-tinta/60">de {limite}</span></span>
        </div>
        <p className="text-xs text-tinta/60">{cerrado ? "Fichajes cerrados para esta jornada." : <>Puedes cambiarlo hasta el <strong>{fechaCierre}</strong> (empieza el primer partido).</>}</p>
        <div className="grid gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => <Hueco key={i} id={tit[i]} i={i} />)}
          <Hueco id={sup ?? undefined} i={5} suplente />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.keys(COMODINES) as Comodin[]).map((c) => {
            const gastado = !!comodinesUsados[c];
            return (
              <button key={c} disabled={gastado || cerrado} onClick={() => setCom(com === c ? null : c)} title={COMODINES[c].texto}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${com === c ? "border-azul bg-azul text-white" : gastado ? "border-linea text-tinta/30 line-through" : "border-linea bg-white"}`}>
                🃏 {COMODINES[c].nombre}{gastado ? " · gastado" : ""}
              </button>
            );
          })}
        </div>
        {com && <p className="text-xs text-azul">{COMODINES[com].texto} Solo uno por jornada y cada uno una vez por temporada.</p>}
        {!cerrado && (
          <button onClick={guardar} disabled={pend} className="btn-primario w-full justify-center">{pend ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Guardar equipo</button>
        )}
        {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.t}</p>}
      </section>

      {!cerrado && (
        <section className="tarjeta overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-linea p-3">
            <h2 className="w-full font-semibold">Mercado</h2>
            <div className="relative min-w-40 flex-1">
              <Search size={15} className="absolute left-2.5 top-2.5 text-tinta/40" />
              <input className="campo !pl-8" placeholder="Buscar jugador" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="campo !w-auto" value={eq} onChange={(e) => setEq(e.target.value)} aria-label="Equipo">
              <option value="">Todos los equipos</option>
              {equipos.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
            </select>
            <select className="campo !w-auto" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} aria-label="Ordenar">
              <option value="precio">Más caros</option><option value="media">Mejor media</option><option value="ultimo">Última jornada</option><option value="nombre">Nombre</option>
            </select>
          </div>
          <ul className="divide-y divide-linea">
            {lista.map((j) => {
              const dentro = elegidos.includes(j.id);
              const no = motivo(j);
              return (
                <li key={j.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${dentro ? "bg-oro/10" : no ? "opacity-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{j.nombre} <span className="text-xs font-normal text-tinta/50">#{j.dorsal}</span></p>
                    <p className="truncate text-xs text-tinta/55">
                      {j.equipo}
                      {j.media !== null ? ` · media ${n(j.media)}` : " · sin datos"}
                      {j.ultimo !== null ? ` · última ${n(j.ultimo)}` : ""}
                      {j.descansa && <span className="ml-1 font-semibold text-amber-700"><Moon size={10} className="inline" /> descansa</span>}
                      {j.bloqueado && <span className="ml-1 font-semibold text-red-600"><Lock size={10} className="inline" /> bloqueado</span>}
                    </p>
                  </div>
                  <span className="flex w-14 items-center justify-end gap-0.5 font-bold">
                    {j.tendencia > 0 ? <ArrowUp size={12} className="text-green-600" /> : j.tendencia < 0 ? <ArrowDown size={12} className="text-red-600" /> : null}
                    {j.precio}<Star size={12} className="fill-amber-400 text-amber-500" />
                  </span>
                  {dentro ? (
                    <button onClick={() => quitar(j.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-azul text-white" aria-label="Quitar"><Check size={16} /></button>
                  ) : (
                    <button onClick={() => anadir(j)} disabled={!!no} className="flex h-8 w-8 items-center justify-center rounded-lg border border-linea bg-white disabled:opacity-40" aria-label="Fichar"><Plus size={16} /></button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
