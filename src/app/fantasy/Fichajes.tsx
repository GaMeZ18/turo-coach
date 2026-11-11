"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Filter, Loader2, Lock, Moon, Plus, Search, X } from "lucide-react";
import { guardarEquipo } from "./actions";
import { COMODINES, MAX_POR_EQUIPO, type Comodin } from "@/lib/fantasy/motor";
import { Camiseta, Sigla } from "./ui";

export type JugadorMercado = {
  id: string; persona: string; nombre: string; dorsal: string; equipo: string; equipoId: string; chica: boolean;
  precio: number; media: number | null; pj: number; tendencia: number; ultimo: number | null; descansa: boolean; bloqueado: boolean; rival: string | null;
};
export type DuoMercado = { id: string; nombre: string; equipo: string; equipoId: string; precio: number; media: number | null; tendencia: number; ultimo: number | null; descansa: boolean; bloqueado: boolean; rival: string | null };
type Equipo = { titulares: string[]; suplente: string | null; capitan: string | null; comodin: Comodin | null; duo?: string | null };

const n = (v: number) => v.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ICONO_COMODIN: Record<Comodin, string> = { capitan3: "C×3", banquillo: "SUP", presupuesto: "+10⭐" };

/** El equipo que estás montando se guarda en el móvil mientras pasas de «Mi equipo» al «Mercado» */
function useBorrador(jornada: string, inicial: Equipo) {
  const clave = `fx-borrador-${jornada}`;
  const [e, setE] = useState<Equipo>(inicial);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    try { const g = localStorage.getItem(clave); if (g) setE(JSON.parse(g)); } catch { /* sin almacenamiento */ }
    setListo(true);
  }, [clave]);
  const cambiar = (nuevo: Equipo) => { setE(nuevo); try { localStorage.setItem(clave, JSON.stringify(nuevo)); } catch { /* */ } };
  const limpiar = () => { try { localStorage.removeItem(clave); } catch { /* */ } };
  return { e, cambiar, limpiar, listo };
}

export default function Fichajes({ modo, jornada, nombre, cierre, mercado, duos = [], actual, comodinesUsados, presupuesto }: {
  modo: "equipo" | "mercado"; jornada: string; nombre: string; cierre: string; mercado: JugadorMercado[]; duos?: DuoMercado[];
  actual: Equipo | null; comodinesUsados: Partial<Record<Comodin, string>>; presupuesto: number;
}) {
  const porId = useMemo(() => new Map(mercado.map((j) => [j.id, j])), [mercado]);
  const guardado: Equipo = actual ?? { titulares: [], suplente: null, capitan: null, comodin: null, duo: null };
  const duoPorId = useMemo(() => new Map(duos.map((d) => [d.id, d])), [duos]);
  const { e, cambiar, limpiar } = useBorrador(jornada, guardado);
  const tit = e.titulares.filter((id) => porId.has(id)), sup = e.suplente && porId.has(e.suplente) ? e.suplente : null;
  const [q, setQ] = useState(""); const [eq, setEq] = useState(""); const [orden, setOrden] = useState<"media" | "precio" | "ultimo" | "nombre">("media");
  const [msg, setMsg] = useState<{ ok?: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();

  const limite = presupuesto + (e.comodin === "presupuesto" ? 10 : 0);
  const elegidos = [...tit, ...(sup ? [sup] : [])];
  const duo = e.duo && duoPorId.has(e.duo) ? duoPorId.get(e.duo)! : null;
  const coste = elegidos.reduce((s, id) => s + (porId.get(id)?.precio ?? 0), 0) + (duo?.precio ?? 0);
  const queda = limite - coste;
  const personas = new Set(elegidos.map((id) => porId.get(id)?.persona));
  const sinGuardar = JSON.stringify({ titulares: tit, suplente: sup, capitan: e.capitan, comodin: e.comodin, duo: duo?.id ?? null }) !== JSON.stringify({ titulares: guardado.titulares, suplente: guardado.suplente, capitan: guardado.capitan, comodin: guardado.comodin, duo: guardado.duo ?? null });
  const elegirDuo = (d: DuoMercado) => {
    setMsg(null);
    if (d.bloqueado) return setMsg({ t: "Ese dúo técnico está bloqueado: lo fichaste la jornada anterior." });
    cambiar({ ...e, duo: e.duo === d.id ? null : d.id });
    if (e.duo !== d.id) setMsg({ ok: true, t: `Dúo técnico: ${d.nombre}.` });
  };
  const fechaCierre = new Date(cierre).toLocaleString("es-ES", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

  const motivo = (j: JugadorMercado): string | null => {
    if (j.bloqueado) return "Bloqueado: lo fichaste la jornada anterior";
    if (personas.has(j.persona) && !elegidos.includes(j.id)) return "Ya lo tienes con otro equipo";
    return null;
  };
  const anadir = (j: JugadorMercado) => {
    setMsg(null);
    const m = motivo(j); if (m) return setMsg({ t: m });
    if (tit.length < 5) {
      if (tit.filter((id) => porId.get(id)?.equipoId === j.equipoId).length >= MAX_POR_EQUIPO) return setMsg({ t: `Ya tienes ${MAX_POR_EQUIPO} titulares de ${j.equipo}. Ponlo de suplente cuando tengas los 5.` });
      cambiar({ ...e, titulares: [...tit, j.id], capitan: e.capitan ?? j.id });
      setMsg({ ok: true, t: `${j.nombre} fichado (${tit.length + 1}/5).` });
    } else if (!sup) { cambiar({ ...e, suplente: j.id }); setMsg({ ok: true, t: `${j.nombre} de suplente.` }); }
    else setMsg({ t: "Ya tienes los 5 titulares y el suplente. Quita a alguien primero." });
  };
  const quitar = (id: string) => {
    const t2 = tit.filter((x) => x !== id);
    cambiar({ ...e, titulares: t2, suplente: sup === id ? null : sup, capitan: e.capitan === id ? t2[0] ?? null : e.capitan });
  };
  const guardar = () => start(async () => {
    setMsg(null);
    if (tit.length !== 5) return setMsg({ t: `Te faltan ${5 - tit.length} titulares.` });
    if (!e.capitan || !tit.includes(e.capitan)) return setMsg({ t: "Elige capitán (toca la C)." });
    if (!duo) return setMsg({ t: "Te falta el dúo técnico (está arriba del todo en el mercado)." });
    if (queda < 0) return setMsg({ t: `Te pasas ${-queda} ⭐ del presupuesto.` });
    const r = await guardarEquipo({ titulares: tit, suplente: sup, capitan: e.capitan, comodin: e.comodin, duo: duo.id });
    if (r.error) setMsg({ t: r.error }); else { limpiar(); setMsg({ ok: true, t: "¡Equipo guardado! Lo puedes cambiar hasta el cierre." }); }
  });

  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    return mercado.filter((j) => (!eq || j.equipoId === eq) && (!t || sinAcentos(`${j.nombre} ${j.equipo} ${j.dorsal}`).includes(t)))
      .sort((a, b) => orden === "precio" ? b.precio - a.precio || (b.media ?? 0) - (a.media ?? 0)
        : orden === "media" ? (b.media ?? -99) - (a.media ?? -99) || b.precio - a.precio
        : orden === "ultimo" ? (b.ultimo ?? -99) - (a.ultimo ?? -99)
        : a.nombre.localeCompare(b.nombre));
  }, [mercado, q, eq, orden]);
  const equipos = [...new Map(mercado.map((j) => [j.equipoId, j.equipo])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const Estrellas = (
    <div className="fx-card flex items-center gap-2 px-3 py-2">
      <span className="text-sm">⭐ <strong className={queda < 0 ? "text-red-400" : "text-[var(--fx-oro)]"}>{queda}</strong> libres de {limite}</span>
      <span className="ml-auto text-xs fx-suave">{tit.length}/5 + {sup ? 1 : 0} sup. + {duo ? 1 : 0} dúo</span>
      {sinGuardar && <span className="rounded bg-[var(--fx-oro)] px-1.5 py-0.5 text-[10px] font-bold text-black">SIN GUARDAR</span>}
    </div>
  );
  const Mensaje = msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-900/50 text-green-100" : "bg-red-900/60 text-red-100"}`}>{msg.t}</p>;

  if (modo === "mercado") {
    return (
      <div className="space-y-3">
        <h1 className="fx-display text-2xl">📋 Mercado · {nombre}</h1>
        {Estrellas}
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={16} className="absolute left-2.5 top-2.5 fx-suave" /><input className="fx-input !pl-8" placeholder="Buscar jugador…" value={q} onChange={(ev) => setQ(ev.target.value)} /></div>
          <span className="flex items-center rounded-lg border border-[var(--fx-borde)] px-2"><Filter size={16} /></span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="fx-input" value={eq} onChange={(ev) => setEq(ev.target.value)} aria-label="Equipo"><option value="">Equipo: Todos</option>{equipos.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}</select>
          <select className="fx-input" value={orden} onChange={(ev) => setOrden(ev.target.value as typeof orden)} aria-label="Orden">
            <option value="media">Orden: Mejor media</option><option value="precio">Orden: Más caros</option><option value="ultimo">Orden: Última jornada</option><option value="nombre">Orden: Nombre</option>
          </select>
        </div>
        {Mensaje}
        {duos.length > 0 && (
          <section className="fx-card overflow-hidden">
            <p className="flex items-center gap-2 border-b border-[var(--fx-borde)] px-3 py-2 font-semibold">📋 Dúo técnico <span className="text-xs font-normal fx-suave">· elige uno · puntúa con el resultado del partido</span></p>
            <ul className="fx-sep">
              {duos.map((d) => {
                const on = duo?.id === d.id;
                return (
                  <li key={d.id} className={`flex items-center gap-2.5 px-3 py-2 ${on ? "bg-[var(--fx-oro)]/10" : d.bloqueado ? "opacity-55" : ""}`}>
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">📋</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(d.id)}`} className="block truncate font-semibold underline-offset-2 hover:underline">{d.nombre} <span className="text-[11px] font-normal text-[var(--fx-oro)]">📈</span></Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-[11px] fx-suave"><Sigla equipo={d.equipo} /><span>Media {d.media !== null ? n(d.media) : "–"}</span><span>Últ: {d.ultimo !== null ? n(d.ultimo) : "–"}</span></p>
                      {d.descansa ? <p className="text-[11px] font-semibold text-amber-300"><Moon size={10} className="inline" /> Descansa</p> : d.rival && <p className="truncate text-[11px] text-white/80">🏀 {d.rival}</p>}
                      {d.bloqueado && <p className="text-[11px] font-semibold text-red-400"><Lock size={10} className="inline" /> Bloqueado</p>}
                    </div>
                    <span className="flex items-center gap-0.5 text-lg font-bold">
                      {d.tendencia > 0 ? <span className="text-xs text-green-400">▲</span> : d.tendencia < 0 ? <span className="text-xs text-red-400">▼</span> : null}
                      {d.precio}<span className="text-base">⭐</span>
                    </span>
                    {on ? (
                      <button onClick={() => elegirDuo(d)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fx-oro)] text-black" aria-label="Quitar"><Check size={18} /></button>
                    ) : d.bloqueado ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Lock size={15} /></span>
                    ) : (
                      <button onClick={() => elegirDuo(d)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fx-verde)] text-white shadow" aria-label="Fichar dúo"><Plus size={18} /></button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <p className="pt-1 text-xs font-bold uppercase fx-suave">Jugadores</p>
        <ul className="fx-card fx-sep overflow-hidden">
          {lista.map((j) => {
            const dentro = elegidos.includes(j.id), no = motivo(j);
            return (
              <li key={j.id} className={`flex items-center gap-2.5 px-3 py-2 ${dentro ? "bg-[var(--fx-oro)]/10" : no ? "opacity-55" : ""}`}>
                <Camiseta dorsal={j.dorsal} equipo={j.equipo} size={34} />
                <div className="min-w-0 flex-1">
                  <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(j.id)}`} className="block truncate font-semibold underline-offset-2 hover:underline">{j.nombre} <span className="text-[11px] font-normal text-[var(--fx-oro)]">📈</span></Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] fx-suave">
                    <Sigla equipo={j.equipo} />
                    <span>Media {j.media !== null ? n(j.media) : "–"}</span>
                    <span>Últ: {j.ultimo !== null ? n(j.ultimo) : "–"}</span>
                  </p>
                  {j.rival && <p className="truncate text-[11px] text-white/80">🏀 {j.rival}</p>}
                  {(j.descansa || j.bloqueado) && (
                    <p className="text-[11px] font-semibold">
                      {j.descansa && <span className="mr-2 text-amber-300"><Moon size={10} className="inline" /> Descansa</span>}
                      {j.bloqueado && <span className="text-red-400"><Lock size={10} className="inline" /> Bloqueado</span>}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-0.5 text-lg font-bold">
                  {j.tendencia > 0 ? <span className="text-xs text-green-400">▲</span> : j.tendencia < 0 ? <span className="text-xs text-red-400">▼</span> : null}
                  {j.precio}<span className="text-base">⭐</span>
                </span>
                {dentro ? (
                  <button onClick={() => quitar(j.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fx-oro)] text-black" aria-label="Quitar"><Check size={18} /></button>
                ) : j.bloqueado ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Lock size={15} /></span>
                ) : (
                  <button onClick={() => anadir(j)} disabled={!!no} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fx-verde)] text-white shadow disabled:opacity-40" aria-label="Fichar"><Plus size={18} /></button>
                )}
              </li>
            );
          })}
        </ul>
        <div className="sticky bottom-3 flex gap-2">
          <Link href="/fantasy?v=equipo" className="fx-btn flex-1">Ver mi equipo ({tit.length}/5)</Link>
        </div>
      </div>
    );
  }

  const Fila = ({ id, i, suplente }: { id?: string | null; i: number; suplente?: boolean }) => {
    const j = id ? porId.get(id) : null;
    if (!j) return (
      <Link href="/fantasy?v=mercado" className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--fx-borde)] px-3 py-2.5 text-sm fx-suave">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5"><Plus size={16} /></span>
        {suplente ? "Elige suplente (entra si un titular no juega)" : `Fichar titular ${i + 1}`}
      </Link>
    );
    const esCap = e.capitan === j.id;
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-[#0c1430] px-2.5 py-2">
        <Camiseta dorsal={j.dorsal} equipo={j.equipo} size={32} />
        <div className="min-w-0 flex-1">
          <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(j.id)}`} className="block truncate font-semibold">{j.nombre}</Link>
          <p className="flex min-w-0 gap-2 text-[11px] fx-suave"><Sigla equipo={j.equipo} /> {j.descansa ? <span className="font-semibold text-amber-300">Descansa</span> : j.rival && <span className="truncate text-white/80">{j.rival}</span>}</p>
        </div>
        <span className="text-sm font-bold">{j.precio}⭐</span>
        {!suplente && (
          <button onClick={() => cambiar({ ...e, capitan: j.id })} title="Capitán (puntúa doble)"
            className={`h-7 w-7 rounded-full text-xs font-black ${esCap ? "bg-gradient-to-b from-[#ffe27a] to-[#e2a414] text-black shadow" : "border border-white/30 text-white/50"}`}>C</button>
        )}
        <button onClick={() => quitar(j.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fx-rojo)] text-white" aria-label="Quitar"><X size={15} /></button>
      </div>
    );
  };

  return (
    <section className="space-y-2.5">
      <div className="fx-cab-rojo flex items-center rounded-xl px-3 py-2">
        <p className="fx-display text-lg">Tu equipo · {nombre}</p>
      </div>
      <p className="text-xs fx-suave">ⓘ Puedes cambiarlo hasta el <strong className="text-white">{fechaCierre}</strong> (empieza el primer partido).</p>
      {Estrellas}
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((i) => <Fila key={i} id={tit[i]} i={i} />)}
        <p className="pt-1 text-xs font-bold uppercase fx-suave">Suplente</p>
        <Fila id={sup} i={5} suplente />
        <p className="pt-1 text-xs font-bold uppercase fx-suave">Dúo técnico</p>
        {duo ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#0c1430] px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">📋</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{duo.nombre}</p>
              <p className="flex min-w-0 gap-2 text-[11px] fx-suave"><Sigla equipo={duo.equipo} /> {duo.descansa ? <span className="font-semibold text-amber-300">Descansa</span> : duo.rival && <span className="truncate text-white/80">{duo.rival}</span>}</p>
            </div>
            <span className="text-sm font-bold">{duo.precio}⭐</span>
            <button onClick={() => cambiar({ ...e, duo: null })} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fx-rojo)] text-white" aria-label="Quitar"><X size={15} /></button>
          </div>
        ) : (
          <Link href="/fantasy?v=mercado" className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--fx-borde)] px-3 py-2.5 text-sm fx-suave">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5"><Plus size={16} /></span>
            Elige tu dúo técnico (puntúa con el resultado del partido)
          </Link>
        )}
      </div>
      <p className="pt-1 text-xs font-bold uppercase fx-suave">Comodines</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(COMODINES) as Comodin[]).map((c) => {
          const gastado = !!comodinesUsados[c], on = e.comodin === c;
          return (
            <button key={c} disabled={gastado} onClick={() => cambiar({ ...e, comodin: on ? null : c })} title={COMODINES[c].texto}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center ${on ? "border-[var(--fx-oro)] bg-[#3b2d0b]" : gastado ? "border-white/10 bg-white/5 opacity-50" : "border-[#6d4fd8] bg-gradient-to-b from-[#3d2a8a] to-[#1d1450]"}`}>
              <span className="fx-display text-xl text-[var(--fx-oro)]">{ICONO_COMODIN[c]}</span>
              <span className="text-[10px] font-semibold leading-tight">{COMODINES[c].nombre}</span>
              <span className={`rounded px-1.5 text-[9px] font-bold uppercase ${on ? "bg-[var(--fx-oro)] text-black" : gastado ? "bg-white/20" : "bg-[var(--fx-verde)]"}`}>{on ? "Activado" : gastado ? "Gastado" : "Disponible"}</span>
            </button>
          );
        })}
      </div>
      {e.comodin && <p className="text-xs text-[var(--fx-oro)]">{COMODINES[e.comodin].texto} Cada comodín se puede usar una vez por temporada.</p>}
      {Mensaje}
      <button onClick={guardar} disabled={pend} className="fx-btn w-full">{pend ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Guardar equipo</button>
      <Link href="/fantasy?v=mercado" className="fx-btn-sec w-full justify-center">Ir al mercado</Link>
    </section>
  );
}
