import Link from "next/link";
import type { CSSProperties } from "react";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo, equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import { TZ, diaInput, hora, hoyLocal } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { borrarEvento, crearEvento } from "./actions";
import { ChevronLeft, ChevronRight, Smartphone, Trash2 } from "lucide-react";

type Item = {
  id: string;
  dia: string;           // YYYY-MM-DD (hora de Barcelona)
  hora: string | null;
  titulo: string;
  tipo: "entreno" | "partido" | "evento" | "cumple";
  href?: string;
  detalle?: string;
  borrable?: boolean;
  color?: string;        // color del equipo (vista de todo el club)
};

const ESTILO: Record<Item["tipo"], { chip: string; punto: string; nombre: string }> = {
  entreno: { chip: "bg-azul/10 text-azul", punto: "bg-azul", nombre: "Entreno" },
  partido: { chip: "bg-rojo text-white", punto: "bg-rojo", nombre: "Partido" },
  evento: { chip: "bg-oro/40 text-tinta", punto: "bg-oro", nombre: "Evento" },
  cumple: { chip: "bg-pink-100 text-pink-800", punto: "bg-pink-400", nombre: "Cumpleaños" },
};
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; todo?: string; eq?: string; entrenos?: string }>;
}) {
  const { mes: mesParam, todo, eq, entrenos: conEntrenos } = await searchParams;
  const { supabase, perfil } = await requireUser();
  const [equipo, { equipos: delClub }] = await Promise.all([equipoActivo(supabase), equiposDeTemporada(supabase)]);
  const verTodo = todo === "1" || !equipo;
  // Vista del club: todos los equipos (o uno, con ?eq=) con su color
  const filtro = verTodo && eq && delClub.some((e) => e.id === eq) ? eq : null;
  const mostrarEntrenos = !verTodo || !!filtro || conEntrenos === "1";
  const color = (id: string | null | undefined) => (verTodo && id ? colorEquipo(id, delClub) : undefined);
  const esCoord = perfil.rol === "coordinador";

  // Mes visible (YYYY-MM)
  const hoy = hoyLocal();
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : hoy.slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const mesAnterior = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const mesSiguiente = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const nombreMes = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

  // Rango amplio (con margen) para las consultas
  const desde = new Date(Date.UTC(y, m - 1, 1) - 8 * 864e5).toISOString();
  const hasta = new Date(Date.UTC(y, m, 1) + 8 * 864e5).toISOString();

  let qEntrenos = supabase.from("entrenamientos").select("id, fecha, titulo, equipo_id, equipos(nombre)").gte("fecha", desde).lt("fecha", hasta);
  let qPartidos = supabase.from("partidos").select("id, fecha, rival, local, puntos_favor, puntos_contra, estado, equipo_id, equipos(nombre)").gte("fecha", desde).lt("fecha", hasta);
  const soloEquipo = !verTodo && equipo ? equipo.id : filtro;
  if (soloEquipo) {
    qEntrenos = qEntrenos.eq("equipo_id", soloEquipo);
    qPartidos = qPartidos.eq("equipo_id", soloEquipo);
  }

  const [entrenos, partidos, eventos, plantilla] = await Promise.all([
    mostrarEntrenos ? qEntrenos : Promise.resolve({ data: [] as unknown[] }),
    qPartidos,
    supabase.from("eventos").select("id, fecha, titulo, tipo, lugar, descripcion, equipo_id, equipos(nombre)").gte("fecha", desde).lt("fecha", hasta),
    equipo && !verTodo
      ? supabase.from("equipo_jugadores").select("jugadores(id, nombre, apellidos, fecha_nacimiento)").eq("equipo_id", equipo.id)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const items: Item[] = [];
  type ConEquipo = { equipos: { nombre: string } | null };
  for (const e of (entrenos.data ?? []) as unknown as ({ id: string; fecha: string; titulo: string | null; equipo_id: string } & ConEquipo)[]) {
    items.push({
      id: e.id, dia: diaInput(e.fecha), hora: hora(e.fecha), tipo: "entreno", href: `/entrenamientos/${e.id}`, color: color(e.equipo_id),
      titulo: `${verTodo && e.equipos ? e.equipos.nombre + " · " : ""}${e.titulo ?? "Entreno"}`,
    });
  }
  for (const p of (partidos.data ?? []) as unknown as ({ id: string; fecha: string; rival: string; local: boolean; puntos_favor: number | null; puntos_contra: number | null; estado: string; equipo_id: string } & ConEquipo)[]) {
    const jugado = p.puntos_favor !== null && p.puntos_contra !== null;
    const res = jugado ? ` ${p.puntos_favor! > p.puntos_contra! ? "✓" : p.puntos_favor! < p.puntos_contra! ? "✗" : "="} ${p.local ? `${p.puntos_favor}-${p.puntos_contra}` : `${p.puntos_contra}-${p.puntos_favor}`}` : p.estado === "aplazado" ? " (aplazado)" : "";
    items.push({
      id: p.id, dia: diaInput(p.fecha), hora: hora(p.fecha), tipo: "partido", href: `/partidos/${p.id}`, color: color(p.equipo_id),
      titulo: `${verTodo && p.equipos ? p.equipos.nombre + " " : ""}${p.local ? "vs" : "@"} ${p.rival}${res}`,
    });
  }
  for (const ev of (eventos.data ?? []) as unknown as ({ id: string; fecha: string; titulo: string; tipo: string; lugar: string | null; descripcion: string | null; equipo_id: string | null } & ConEquipo)[]) {
    if (!verTodo && ev.equipo_id && ev.equipo_id !== equipo?.id) continue; // eventos de otros equipos
    if (filtro && ev.equipo_id && ev.equipo_id !== filtro) continue;
    items.push({
      id: ev.id, dia: diaInput(ev.fecha), hora: hora(ev.fecha), tipo: "evento", color: color(ev.equipo_id),
      titulo: `${ev.equipo_id ? (verTodo && ev.equipos ? ev.equipos.nombre + " · " : "") : "🏀 Club · "}${ev.titulo}`,
      detalle: [ev.lugar, ev.descripcion].filter(Boolean).join(" · ") || undefined,
      borrable: ev.equipo_id ? true : esCoord,
    });
  }
  for (const x of (plantilla.data ?? []) as unknown as { jugadores: { id: string; nombre: string; apellidos: string | null; fecha_nacimiento: string | null } | null }[]) {
    const f = x.jugadores?.fecha_nacimiento;
    if (!f || Number(f.slice(5, 7)) !== m) continue;
    const anos = y - Number(f.slice(0, 4));
    items.push({ id: `c-${x.jugadores!.id}`, dia: `${mes}-${f.slice(8, 10)}`, hora: null, tipo: "cumple", titulo: `🎂 ${x.jugadores!.nombre} (${anos})` });
  }
  items.sort((a, b) => (a.dia + (a.hora ?? "")).localeCompare(b.dia + (b.hora ?? "")));
  const porDia = new Map<string, Item[]>();
  for (const it of items) porDia.set(it.dia, [...(porDia.get(it.dia) ?? []), it]);

  // Cuadrícula (semanas de lunes a domingo)
  const primero = new Date(Date.UTC(y, m - 1, 1));
  const desfase = (primero.getUTCDay() + 6) % 7;
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const celdas = Math.ceil((desfase + diasMes) / 7) * 7;
  const dias = Array.from({ length: celdas }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 + i - desfase));
    return { clave: d.toISOString().slice(0, 10), num: d.getUTCDate(), delMes: d.getUTCMonth() === m - 1 };
  });
  const agenda = items.filter((i) => i.dia.startsWith(mes));
  // Estilo de un elemento: con color de equipo (vista del club) o el de su tipo
  const estilo = (it: Item): { className: string; style?: CSSProperties } => {
    if (!it.color) return { className: ESTILO[it.tipo].chip };
    if (it.tipo === "partido") return { className: "font-semibold text-white", style: { background: it.color } };
    return { className: "", style: { background: `${it.color}1f`, color: it.color, boxShadow: `inset 3px 0 0 ${it.color}` } };
  };
  const q = (extra: Record<string, string>) => {
    const sp = new URLSearchParams({ mes, ...(verTodo && equipo ? { todo: "1" } : {}), ...(filtro ? { eq: filtro } : {}), ...(conEntrenos === "1" ? { entrenos: "1" } : {}), ...extra });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    return `/calendario?${sp.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-tinta/60">{verTodo ? (filtro ? delClub.find((e) => e.id === filtro)?.nombre : "Todo el club · partidos de todos los equipos") : equipo?.nombre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/calendario/movil" className="btn-secundario !py-1.5 text-sm"><Smartphone size={16} /> En mi móvil</Link>
          {equipo && (
            <div className="flex overflow-hidden rounded-lg border border-linea text-xs font-semibold uppercase">
              <Link href={`/calendario?mes=${mes}`} className={`px-3 py-1.5 ${!verTodo ? "bg-azul text-white" : "bg-white hover:bg-suave"}`}>{equipo.nombre}</Link>
              <Link href={`/calendario?mes=${mes}&todo=1`} className={`px-3 py-1.5 ${verTodo ? "bg-azul text-white" : "bg-white hover:bg-suave"}`}>Todo el club</Link>
            </div>
          )}
        </div>
      </div>

      {/* Cabecera del mes */}
      <div className="mt-5 flex items-center justify-between">
        <Link href={q({ mes: mesAnterior })} className="btn-secundario !px-2.5" aria-label="Mes anterior"><ChevronLeft size={18} /></Link>
        <div className="text-center">
          <div className="font-[family-name:var(--font-titulo)] text-xl font-bold uppercase text-azul">{nombreMes}</div>
          {mes !== hoy.slice(0, 7) && <Link href={q({ mes: hoy.slice(0, 7) })} className="text-xs text-rojo hover:underline">Volver a hoy</Link>}
        </div>
        <Link href={q({ mes: mesSiguiente })} className="btn-secundario !px-2.5" aria-label="Mes siguiente"><ChevronRight size={18} /></Link>
      </div>

      {/* Cuadrícula */}
      <div className="tarjeta mt-3 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-linea bg-suave text-center text-[11px] font-semibold uppercase text-tinta/50">
          {DIAS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const delDia = porDia.get(d.clave) ?? [];
            const esHoy = d.clave === hoy;
            return (
              <div key={d.clave} className={`min-h-16 border-b border-r border-linea p-1 sm:min-h-24 ${d.delMes ? "" : "bg-suave/60 text-tinta/30"}`}>
                <div className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${esHoy ? "bg-rojo text-white" : ""}`}>{d.num}</div>
                {/* Móvil: puntos de color */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {delDia.map((it) => <span key={it.id} className={`rounded-full ${it.tipo === "partido" ? "h-2 w-2" : "h-1.5 w-1.5"} ${it.color ? "" : ESTILO[it.tipo].punto}`} style={it.color ? { background: it.color, opacity: it.tipo === "partido" ? 1 : 0.45 } : undefined} />)}
                </div>
                {/* Ordenador: chips con texto */}
                <div className="hidden space-y-0.5 sm:block">
                  {delDia.slice(0, 4).map((it) => {
                    const contenido = <>{it.hora && <span className="opacity-70">{it.hora} </span>}{it.titulo}</>;
                    const e = estilo(it);
                    const cls = `block truncate rounded px-1 py-0.5 text-[11px] leading-tight ${e.className}`;
                    return it.href
                      ? <Link key={it.id} href={it.href} className={`${cls} hover:brightness-95`} style={e.style} title={it.titulo}>{contenido}</Link>
                      : <span key={it.id} className={cls} style={e.style} title={it.detalle ? `${it.titulo} · ${it.detalle}` : it.titulo}>{contenido}</span>;
                  })}
                  {delDia.length > 4 && <span className="block px-1 text-[11px] text-tinta/50">+{delDia.length - 4} más</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {verTodo ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-tinta/50">Equipos:</span>
          <Link href={q({ eq: "" })} className={`rounded-full border px-2.5 py-1 font-semibold ${!filtro ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:bg-suave"}`}>Todos</Link>
          {delClub.map((e) => {
            const c = colorEquipo(e.id, delClub);
            const activo = filtro === e.id;
            return (
              <Link key={e.id} href={q({ eq: activo ? "" : e.id })} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold"
                style={activo ? { background: c, borderColor: c, color: "white" } : { borderColor: `${c}66`, color: c, background: "white" }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: activo ? "white" : c }} />{e.nombre}
              </Link>
            );
          })}
          {!filtro && (
            <Link href={q({ entrenos: conEntrenos === "1" ? "" : "1" })} className="ml-auto text-tinta/60 underline hover:text-azul">
              {conEntrenos === "1" ? "Ocultar entrenos" : "Mostrar también entrenos"}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-tinta/60">
          {(Object.keys(ESTILO) as Item["tipo"][]).map((t) => (
            <span key={t} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${ESTILO[t].punto}`} />{ESTILO[t].nombre}</span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Agenda del mes */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Agenda del mes</h2>
          <ul className="tarjeta mt-2 divide-y divide-linea">
            {agenda.map((it) => {
              const fecha = new Date(`${it.dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", timeZone: "UTC" });
              const cuerpo = (
                <>
                  <span className="w-20 shrink-0 text-xs capitalize text-tinta/60">{fecha}{it.hora ? ` · ${it.hora}` : ""}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${estilo(it).className}`} style={estilo(it).style}>{ESTILO[it.tipo].nombre}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{it.titulo}</span>
                    {it.detalle && <span className="block truncate text-xs text-tinta/50">{it.detalle}</span>}
                  </span>
                </>
              );
              return (
                <li key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {it.href ? <Link href={it.href} className="flex min-w-0 flex-1 items-center gap-2 hover:text-azul">{cuerpo}</Link> : <div className="flex min-w-0 flex-1 items-center gap-2">{cuerpo}</div>}
                  {it.tipo === "evento" && it.borrable && (
                    <form action={borrarEvento}>
                      <input type="hidden" name="id" value={it.id} />
                      <Enviar className="rounded p-1 text-tinta/35 hover:bg-red-50 hover:text-red-600" title="Borrar evento" confirmar="¿Borrar este evento?"><Trash2 size={15} /></Enviar>
                    </form>
                  )}
                </li>
              );
            })}
            {agenda.length === 0 && <li className="px-3 py-4 text-sm text-tinta/50">Nada programado este mes.</li>}
          </ul>
        </section>

        {/* Nuevo evento */}
        <form action={crearEvento} className="tarjeta h-fit space-y-2 p-4">
          <h2 className="font-semibold">Nuevo evento</h2>
          <input type="hidden" name="equipo_id" value={equipo?.id ?? ""} />
          <input name="titulo" required placeholder="Reunión de padres, torneo, foto oficial…" className="campo" />
          <div className="grid grid-cols-2 gap-2">
            <input name="dia" type="date" required defaultValue={mes === hoy.slice(0, 7) ? hoy : `${mes}-01`} className="campo" />
            <input name="hora" type="time" defaultValue="10:00" className="campo" />
            <select name="tipo" className="campo">
              <option value="evento">Evento</option>
              <option value="reunion">Reunión</option>
              <option value="torneo">Torneo</option>
              <option value="otro">Otro</option>
            </select>
            <select name="ambito" className="campo" defaultValue={equipo ? "equipo" : "club"}>
              {equipo && <option value="equipo">{equipo.nombre}</option>}
              {esCoord && <option value="club">Todo el club</option>}
            </select>
          </div>
          <input name="lugar" placeholder="Lugar (opcional)" className="campo" />
          <textarea name="descripcion" rows={2} placeholder="Detalles (opcional)" className="campo" />
          <Enviar>Añadir al calendario</Enviar>
          {!equipo && !esCoord && <p className="text-xs text-tinta/50">Elige un equipo arriba para crear eventos.</p>}
        </form>
      </div>
      <p className="mt-3 text-xs text-tinta/40">Horas en hora de Barcelona ({TZ}).</p>
    </div>
  );
}
