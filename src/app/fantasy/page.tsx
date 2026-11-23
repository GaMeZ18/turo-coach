import Link from "@/components/Enlace";
import type { Metadata, Viewport } from "next";
import { VAPID_PUBLICO } from "@/lib/notificar";
import AvisosFantasy from "./Avisos";
import InstalarFantasy from "./Instalar";
import "./fantasy.css";
import { cargarClasificaciones, cargarLiga, misEspias, posicion, quienSoy, silencio } from "@/lib/fantasy/datos";
import { colorEquipo, sigla } from "@/lib/fantasy/estilo";
import { COMODINES, COSTE_ESPIA, INSIGNIAS, PRESUPUESTO, nombreJornada, type Comodin, type Nivel } from "@/lib/fantasy/motor";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { diaInput, fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import { CalendarDays, ChevronDown, Lock, Star } from "lucide-react";
import Alta from "./Alta";
import Fichajes, { type DuoMercado, type JugadorMercado } from "./Fichajes";
import Chat from "./Chat";
import Espiar from "./Espiar";
import Celebracion from "./Celebracion";
import Compartir from "./Compartir";
import { EditarPerfil } from "./Perfil";
import { MiJornada } from "./Piezas";
import { BarrasPuntos, GraficaPrecio } from "./Bolsa";
import { Camiseta, Escudo, Marco, Nombre, pts } from "./ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fantasy Turó", description: "La liga fantasy del CB Turó de la Peira", robots: { index: false },
  manifest: "/fantasy/manifest.webmanifest", appleWebApp: { capable: true, title: "Fantasy Turó", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/fantasy/favicon-64.png", sizes: "64x64", type: "image/png" }], apple: [{ url: "/fantasy/apple-touch-icon.png", sizes: "180x180" }] },
  openGraph: { title: "Fantasy Turó", description: "Ficha a 5 jugadores del club cada jornada y suma puntos con sus estadísticas", images: [{ url: "https://coach.cbturo.com/insignias/29-campeon-del-turo.png" }] },
};

export const viewport: Viewport = { themeColor: "#0a1024" };

const temporadaDe = (dia: string) => { const y = Number(dia.slice(0, 4)), m = Number(dia.slice(5, 7)); const a = m >= 8 ? y : y - 1; return `${a}/${String(a + 1).slice(2)}`; };
const NIVEL: Record<Nivel, { t: string; color: string; borde: string }> = {
  facil: { t: "Fáciles", color: "#22b04f", borde: "border-[#22b04f]" },
  media: { t: "Medias", color: "#f6c445", borde: "border-[#f6c445]" },
  dificil: { t: "Difíciles", color: "#e5333f", borde: "border-[#e5333f]" },
  legendaria: { t: "Legendarias", color: "#a855f7", borde: "border-[#a855f7]" },
};

function Acordeon({ titulo, children, abierto = false }: { titulo: React.ReactNode; children: React.ReactNode; abierto?: boolean }) {
  return (
    <details className="fx-card group overflow-hidden" open={abierto}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{titulo}</span><ChevronDown size={18} className="transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--fx-borde)] p-3 text-sm">{children}</div>
    </details>
  );
}

export default async function FantasyPage({ searchParams }: { searchParams: Promise<{ v?: string; j?: string; t?: string; i?: string; id?: string }> }) {
  const sp = await searchParams;
  const q = await quienSoy();
  const temporada = temporadaDe(hoyLocal());

  if (!q.acceso) {
    return (
      <div className="fx flex flex-col items-center justify-center px-6 py-10 text-center">
        <img src="/marca/escudo-128.png" alt="CB Turó" className="h-28 w-auto drop-shadow-xl" />
        <h1 className="fx-display mt-4 text-6xl leading-[.9]">Fantasy<br />Turó</h1>
        <p className="fx-display mt-3 -skew-x-6 bg-gradient-to-r from-[#9e1420] via-[#d81f2f] to-[#9e1420] px-4 py-1 text-lg">Temporada {temporada}</p>
        <CalendarDays size={44} className="mt-8 text-white/90" />
        <p className="fx-display mt-2 text-4xl">Próximamente</p>
        <p className="mt-2 max-w-xs text-sm text-white/85">El Fantasy del CB Turó de la Peira llega muy pronto. ¡Prepara tu plantilla!</p>
        {q.perfil && <Link href="/" className="mt-8 text-xs text-white/60 underline">← Volver a la app</Link>}
      </div>
    );
  }
  if (!q.participante) {
    return (
      <Marco perfil={!!q.perfil} esAdmin={q.esAdmin} conMenu={false} temporada={temporada}>
        <Alta staff={q.perfil ? { nombre: q.perfil.nombre ?? "" } : null} abiertoPublico={q.config.abierto} premio={q.config.premio} />
      </Marco>
    );
  }

  const yo = q.participante;
  const { liga, participantes, partidos, equipos } = await cargarLiga(q.config);
  const vista = ["equipo", "mercado", "clasificacion", "manager", "resumen", "puntos", "jornada", "calendario", "insignias", "reglas", "jugador"].includes(sp.v ?? "") ? sp.v! : "equipo";
  const part = new Map(participantes.map((p) => [p.id, p]));
  const jug = (id: string) => liga.jugadores.get(id);
  const general = liga.general;
  const miPos = general.findIndex((x) => x.id === yo.id) + 1;
  const miTotal = general.find((x) => x.id === yo.id)?.total ?? 0;
  const misInsignias = liga.insignias(yo.id);
  const campeon = q.config.cerrada && q.config.campeon ? part.get(q.config.campeon)?.alias ?? null : null;

  const clasif = ["equipo", "mercado", "jornada", "jugador"].includes(vista) ? await cargarClasificaciones() : new Map();
  /** Rival de cada equipo esa semana, con su posición: «vs Nou Barris (5º)» */
  const rivalDe = (equipoId: string, l: string) => {
    const p = partidos.filter((x) => x.equipo_id === equipoId && lunesDe(diaInput(x.fecha)) === l).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    if (!p) return null;
    const pos = posicion(clasif.get(equipoId), p.rival);
    return `${p.local ? "vs" : "@"} ${p.rival ?? "?"}${pos ? ` (${pos.pos}º)` : ""}`;
  };
  const duosDe = (l: string): DuoMercado[] => {
    const pr = liga.precioDuo(l), prAntes = liga.precioDuo(sumarDias(l, -7));
    const ultima = liga.terminadas[liga.terminadas.length - 1] ?? sumarDias(l, -7);
    const semUlt = liga.semanaDuo(ultima), desc = liga.descansan(l), bloq = liga.bloqueados(yo.id, l);
    return [...liga.duos.values()].map((d) => {
      const p = pr.get(d.id)!, a = prAntes.get(d.id);
      return { id: d.id, nombre: d.nombre, equipo: d.equipo, equipoId: d.equipoId, precio: p.precio, media: p.media, tendencia: a ? Math.sign(p.precio - a.precio) : 0,
        ultimo: semUlt.get(d.id)?.jugo ? semUlt.get(d.id)!.puntos : null, descansa: desc.has(d.equipoId), bloqueado: bloq.has(d.id), rival: rivalDe(d.equipoId, l) };
    }).sort((a, b) => b.precio - a.precio);
  };
  // Forma (últimos 3 partidos frente a su media) y rentabilidad (puntos por estrella en la temporada)
  const porJugador = new Map<string, { base: number; fecha: string; lunes: string }[]>();
  for (const a of liga.actuaciones) if (a.jugo) { const x = porJugador.get(a.jugador) ?? []; x.push({ base: a.base, fecha: a.fecha, lunes: a.lunes }); porJugador.set(a.jugador, x); }
  const formaDe = (id: string) => {
    const xs = [...(porJugador.get(id) ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (xs.length < 4) return 0;
    const media = xs.reduce((s, x) => s + x.base, 0) / xs.length, ult = xs.slice(0, 3).reduce((s, x) => s + x.base, 0) / 3;
    return ult >= media + 2 && ult >= media * 1.25 ? 1 : ult <= media - 2 && ult <= media * 0.75 ? -1 : 0;
  };
  const rentables = () => {
    const precios = new Map<string, ReturnType<typeof liga.precio>>();
    const pr = (l: string) => { if (!precios.has(l)) precios.set(l, liga.precio(l)); return precios.get(l)!; };
    const inicioT = q.config.inicio;
    return [...porJugador.entries()].map(([id, xs]) => {
      const temporada = xs.filter((x) => x.lunes >= inicioT);
      const estrellas = temporada.reduce((s, x) => s + (pr(x.lunes).get(id)?.precio ?? 6), 0);
      const puntos = temporada.reduce((s, x) => s + x.base, 0);
      return { id, pj: temporada.length, puntos, ratio: estrellas ? puntos / estrellas : 0 };
    }).filter((x) => x.pj >= 2 && liga.jugadores.has(x.id)).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  };
  const mercadoDe = (l: string): JugadorMercado[] => {
    const pr = liga.precio(l), prAntes = liga.precio(sumarDias(l, -7));
    const ultima = liga.terminadas[liga.terminadas.length - 1] ?? sumarDias(l, -7);
    const semUlt = liga.semana(ultima), desc = liga.descansan(l), bloq = liga.bloqueados(yo.id, l);
    return [...liga.jugadores.values()].map((j) => {
      const p = pr.get(j.id)!, a = prAntes.get(j.id);
      return {
        id: j.id, persona: j.persona, nombre: j.nombre, dorsal: j.dorsal, equipo: j.equipo, equipoId: j.equipoId, chica: j.chica,
        precio: p.precio, media: p.media, pj: p.pj, tendencia: a ? Math.sign(p.precio - a.precio) : 0,
        ultimo: semUlt.get(j.id)?.jugo ? semUlt.get(j.id)!.puntos : null, descansa: desc.has(j.equipoId), bloqueado: bloq.has(j.persona),
        rival: rivalDe(j.equipoId, l), forma: formaDe(j.id),
      };
    });
  };
  const proxima = new Date(liga.proxima).toLocaleString("es-ES", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const Cerrado = ({ breve = false }: { breve?: boolean }) => (
    <section className="fx-card p-5 text-center">
      <Lock size={breve ? 32 : 48} className="mx-auto text-white/90" />
      <p className={`fx-display mt-1 ${breve ? "text-3xl" : "text-4xl"} leading-none`}>{liga.descansoHoy ? "Semana sin Fantasy" : "Fichajes cerrados"}</p>
      <p className="mt-2 text-sm text-white/85">{liga.descansoHoy ? "Esta semana casi no hay partidos, así que no se juega. ¡Descansa tú también! 😴" : liga.enJuego ? `La ${nombreJornada(q.config.inicio, liga.enJuego, q.config.anuladas).toLowerCase()} ya está en juego. No puedes hacer cambios.` : "Ahora mismo no se puede fichar."}</p>
      <p className="text-sm text-white/85">Vuelve el <strong>{proxima}</strong> para preparar la siguiente.</p>
    </section>
  );

  let cuerpo: React.ReactNode = null;

  if (vista === "equipo") {
    const l = liga.abierta;
    const al = l ? liga.alineacion(yo.id, l) : undefined;
    const enJuego = liga.enJuego;
    const resJuego = enJuego ? liga.resultados.get(`${yo.id}|${enJuego}`) : undefined;
    const alJuego = enJuego ? liga.alineacion(yo.id, enJuego) : undefined;
    const ant = liga.terminadas[liga.terminadas.length - 1];
    const resAnt = ant ? liga.resultados.get(`${yo.id}|${ant}`) : undefined;
    const ultJ = enJuego && resJuego ? enJuego : resAnt ? ant : null;
    const ultPts = ultJ === enJuego && resJuego ? resJuego.total : resAnt ? resAnt.total : null;
    const ultNombre = ultJ ? `${nombreJornada(q.config.inicio, ultJ, q.config.anuladas).replace("Jornada", "jornada")}${ultJ === enJuego ? " (en juego)" : ""}` : "última jornada";
    const alAnt = ant ? liga.alineacion(yo.id, ant) : undefined;
    const gastoEspias = l ? (await misEspias(yo.id, l)).size * COSTE_ESPIA : 0;
    cuerpo = (
      <div className="space-y-3">
        <section className="relative overflow-hidden rounded-2xl border-2 border-[var(--fx-oro)] bg-gradient-to-br from-[#1d2f70] via-[#111a3a] to-[#3d0d19] p-4 shadow-[0_0_28px_-10px_rgba(246,196,69,.7)]">
          <img src="/marca/escudo-128.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-4 h-36 w-auto rotate-12 opacity-[0.08]" />
          <div className="absolute right-2 top-2"><EditarPerfil alias={yo.alias} mostrar={yo.mostrar ?? ""} avatar={{ emoji: yo.emoji, color: yo.color, foto: yo.foto }} publico={!yo.perfil_id} clavePublica={VAPID_PUBLICO} /></div>
          <div className="relative flex items-center gap-3 pr-6">
            <Escudo alias={yo.alias} emoji={yo.emoji} color={yo.color} foto={yo.foto} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fx-oro)]">Mi equipo</p>
              <h2 className="fx-display break-words text-[1.7rem] leading-[1.05]">{yo.alias}</h2>
              {yo.mostrar && <p className="mt-0.5 text-sm text-white/70">{yo.mostrar}</p>}
              <Link href={`/fantasy?v=manager&id=${yo.id}`} className="mt-1 inline-block text-xs font-semibold text-[var(--fx-oro)] underline">📊 Mis estadísticas de mánager</Link>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-black/30 px-1 py-2 ring-1 ring-white/10">
              <p className="text-lg leading-none">{miPos === 1 ? "🥇" : miPos === 2 ? "🥈" : miPos === 3 ? "🥉" : "🏅"}</p>
              <p className="fx-display mt-0.5 text-3xl leading-none">{miPos ? `${miPos}º` : "–"}</p>
              <p className="text-[11px] fx-suave">de {general.length}</p>
            </div>
            <div className="rounded-xl bg-black/30 px-1 py-2 ring-1 ring-[var(--fx-oro)]/40">
              <p className="text-lg leading-none">⭐</p>
              <p className="fx-display fx-oro-texto mt-0.5 text-3xl leading-none">{pts(miTotal)}</p>
              <p className="text-[11px] fx-suave">puntos</p>
            </div>
            <div className="rounded-xl bg-black/30 px-1 py-2 ring-1 ring-white/10">
              <p className="text-lg leading-none">{ultPts === null ? "📅" : "🔥"}</p>
              <p className="fx-display mt-0.5 text-3xl leading-none">{ultPts === null ? "–" : pts(ultPts)}</p>
              <p className="text-[11px] fx-suave">{ultNombre}</p>
            </div>
          </div>
        </section>
        {q.config.prueba && <p className="rounded-lg bg-amber-900/50 p-2 text-center text-sm text-amber-100">🧪 Jornada de prueba en marcha (se borra desde el panel).</p>}
        {q.cargaPuntos && (
          <a href="/partidos/importar?auto=1" target="_blank" rel="noopener" className="fx-btn-sec w-full justify-center">🔄 Cargar puntos Fantasy <span className="text-xs fx-suave">(estadísticas de la FCBQ)</span></a>
        )}
        <InstalarFantasy />
        {!yo.perfil_id && <AvisosFantasy clavePublica={VAPID_PUBLICO} />}
        {l ? (
          <Fichajes modo="equipo" jornada={l} nombre={nombreJornada(q.config.inicio, l, q.config.anuladas)} cierre={liga.cierre(l)} mercado={mercadoDe(l)} duos={duosDe(l)}
            actual={al ? { titulares: al.titulares.map((t) => t.id), suplente: al.suplente?.id ?? null, capitan: al.capitan, comodin: (al.comodin as Comodin | null) ?? null, duo: al.duo?.id ?? null } : null}
            comodinesUsados={Object.fromEntries(Object.entries(yo.comodines ?? {}).filter(([, v]) => v !== l)) as Partial<Record<Comodin, string>>} presupuesto={PRESUPUESTO - gastoEspias} />
        ) : <Cerrado />}
        {l && gastoEspias > 0 && <p className="text-center text-xs fx-suave">👀 Has gastado {gastoEspias} ⭐ espiando esta jornada: tu presupuesto es de {PRESUPUESTO - gastoEspias} ⭐.</p>}
        {enJuego && alJuego && resJuego && <MiJornada duos={liga.duos} titulo={`${nombreJornada(q.config.inicio, enJuego, q.config.anuladas)} · en juego`} res={resJuego} al={alJuego} jugador={jug} />}
        {enJuego && !alJuego && <p className="fx-card p-3 text-center text-sm fx-suave">No fichaste equipo para esta jornada.</p>}
        {l && ant && alAnt && resAnt && <MiJornada duos={liga.duos} titulo={`${nombreJornada(q.config.inicio, ant, q.config.anuladas)} · terminada`} res={resAnt} al={alAnt} jugador={jug} />}
      </div>
    );
  }

  if (vista === "mercado") {
    const l = liga.abierta;
    const top = rentables();
    const pl = l ? liga.precio(l) : null;
    const Rentables = top.length > 0 && (
      <details className="fx-card overflow-hidden" open={!l}>
        <summary className="cursor-pointer px-3 py-2.5 fx-display text-lg">💎 Los más rentables de la temporada</summary>
        <p className="px-3 text-xs fx-suave">Los que más puntos dan por cada estrella que cuestan (mínimo 2 partidos).</p>
        <ol className="fx-sep mt-1">
          {top.map((x, i) => {
            const j = liga.jugadores.get(x.id)!;
            return (
              <li key={x.id}>
                <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(x.id)}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5">
                  <span className="w-4 text-center text-sm font-bold">{i + 1}</span>
                  <Camiseta dorsal={j.dorsal} equipo={j.equipo} size={28} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{j.nombre}</span><span className="block text-[11px] fx-suave">{j.equipo} · {x.pj} partidos · {pts(Math.round(x.puntos * 4) / 4)} pts</span></span>
                  <span className="text-right"><span className="block fx-display text-lg leading-none text-[var(--fx-oro)]">{x.ratio.toFixed(2)}</span><span className="block text-[10px] fx-suave">pts/⭐{pl?.get(x.id) ? ` · ahora ${pl.get(x.id)!.precio}⭐` : ""}</span></span>
                </Link>
              </li>
            );
          })}
        </ol>
      </details>
    );
    cuerpo = l ? (<div className="space-y-3">{Rentables}
      <Fichajes modo="mercado" jornada={l} nombre={nombreJornada(q.config.inicio, l, q.config.anuladas)} cierre={liga.cierre(l)} mercado={mercadoDe(l)} duos={duosDe(l)}
        actual={(() => { const al = liga.alineacion(yo.id, l); return al ? { titulares: al.titulares.map((t) => t.id), suplente: al.suplente?.id ?? null, capitan: al.capitan, comodin: (al.comodin as Comodin | null) ?? null, duo: al.duo?.id ?? null } : null; })()}
        comodinesUsados={{}} presupuesto={PRESUPUESTO - (await misEspias(yo.id, l)).size * COSTE_ESPIA} /></div>
    ) : <div className="space-y-3"><Cerrado />{Rentables}</div>;
  }

  if (vista === "clasificacion") {
    const porJornada = sp.t === "jornada";
    // También la jornada que se está fichando: se ven los equipos de los demás antes del cierre
    const chips = [...new Set([...liga.cerradas, ...(liga.abierta ? [liga.abierta] : [])])].sort();
    const jSel = sp.j && chips.includes(sp.j) ? sp.j : (liga.abierta ?? liga.cerradas[liga.cerradas.length - 1]);
    const enCurso = !!jSel && jSel === liga.abierta;
    // Antes del cierre solo se ve tu equipo y los que has espiado (pagando ⭐)
    const espiados = enCurso ? await misEspias(yo.id, jSel) : new Set<string>();
    const miAl = enCurso ? liga.alineacion(yo.id, jSel) : undefined;
    const libres = enCurso ? PRESUPUESTO + (miAl?.comodin === "presupuesto" ? 10 : 0) - (miAl?.coste ?? 0) - espiados.size * COSTE_ESPIA : null;
    const Fila = ({ pos, id, d, children }: { pos: number | string; id: string; d?: React.ReactNode; children: React.ReactNode }) => {
      const p = part.get(id);
      return (
        <div className={`flex items-center gap-2.5 px-3 py-2 ${id === yo.id ? "bg-gradient-to-r from-[#b3121f] to-[#7a0d16]" : ""}`}>
          <span className="w-6 text-center font-bold">{pos === 1 ? "🏆" : pos}</span>
          <Escudo alias={p?.alias ?? "?"} emoji={p?.emoji} color={p?.color} foto={p?.foto} size={30} />
          <Nombre alias={p?.alias ?? "?"} mostrar={p?.mostrar} className="flex-1" />
          {d}
          <span className="w-14 text-right fx-display text-lg">{children}</span>
        </div>
      );
    };
    cuerpo = (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/fantasy?v=clasificacion" className="fx-chip text-center !py-2" data-on={porJornada ? "0" : "1"}>General</Link>
          <Link href="/fantasy?v=clasificacion&t=jornada" className="fx-chip text-center !py-2" data-on={porJornada ? "1" : "0"}>Por jornada</Link>
        </div>
        {campeon && <p className="fx-card-oro p-3 text-center fx-display text-xl">🏆 Campeón {temporada}: {campeon}</p>}
        {!porJornada ? (
          <>
            <section className="fx-card fx-sep overflow-hidden">
              <div className="flex px-3 py-2 text-xs font-bold uppercase fx-suave"><span className="w-6">#</span><span className="ml-10 flex-1">Equipo</span><span className="w-8 text-center">J</span><span className="w-14 text-right">Pts</span></div>
              {general.map((g, i) => <Link key={g.id} href={`/fantasy?v=manager&id=${g.id}`} className="block hover:bg-white/5"><Fila pos={i + 1} id={g.id} d={<span className="w-8 text-center text-sm fx-suave">{g.jornadas}</span>}>{pts(g.total)}</Fila></Link>)}
              {!general.length && <p className="p-3 text-sm fx-suave">Aún no hay nadie.</p>}
            </section>
            <p className="text-center text-xs fx-suave">Toca un equipo para ver su perfil de mánager.</p>
            {miPos > 0 && (
              <div className="fx-card-oro flex items-center justify-center gap-4 p-4 text-center">
                <span className="text-4xl">🌿</span>
                <div><p className="text-sm fx-suave">Tu posición</p><p className="fx-display text-5xl leading-none">{miPos}/{general.length}</p><p className="text-sm">{pts(miTotal)} puntos</p></div>
                <span className="-scale-x-100 text-4xl">🌿</span>
              </div>
            )}
          </>
        ) : !jSel ? <p className="fx-card p-4 text-sm fx-suave">Todavía no se ha jugado ninguna jornada.</p> : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((l) => <Link key={l} href={`/fantasy?v=clasificacion&t=jornada&j=${l}`} className="fx-chip" data-on={l === jSel ? "1" : "0"}>{nombreJornada(q.config.inicio, l, q.config.anuladas).replace("Jornada ", "J")}{l === liga.abierta ? " · fichando" : ""}</Link>)}
            </div>
            {enCurso ? (
              <>
                <p className="text-sm fx-suave">Equipos fichados para la {nombreJornada(q.config.inicio, jSel, q.config.anuladas).toLowerCase()}. Hasta el cierre ({fechaCorta(liga.cierre(jSel))} a las {hora(liga.cierre(jSel))}) son secretos: para ver uno antes, espíalo por {COSTE_ESPIA} ⭐ de tu presupuesto de esta jornada.</p>
                <section className="fx-card fx-sep overflow-hidden">
                  {participantes.filter((p) => liga.alineacion(p.id, jSel)).map((p) => {
                    const al = liga.alineacion(p.id, jSel)!;
                    if (p.id !== yo.id && !espiados.has(p.id)) return (
                      <Fila key={p.id} pos="🔒" id={p.id} d={<Espiar id={p.id} alias={p.alias} libres={libres} />}>✓</Fila>
                    );
                    return (
                      <details key={p.id}>
                        <summary className="list-none [&::-webkit-details-marker]:hidden">
                          <Fila pos="·" id={p.id} d={al.comodin ? <span className="rounded bg-[#3d2a8a] px-1 text-[10px] font-bold text-[var(--fx-oro)]">{al.comodin === "capitan3" ? "C×3" : al.comodin === "banquillo" ? "Supl." : "+10"}</span> : null}>{al.coste}⭐</Fila>
                        </summary>
                        <ul className="fx-sep bg-black/20">
                          {[...al.titulares, ...(al.suplente ? [al.suplente] : [])].map((t, i) => {
                            const j = jug(t.id);
                            return (
                              <li key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                                <Camiseta dorsal={j?.dorsal ?? ""} equipo={j?.equipo ?? ""} size={26} />
                                <span className="min-w-0 flex-1 truncate">{j?.nombre ?? "?"} <span className="text-[11px] fx-suave">{j?.equipo}</span></span>
                                {i === 5 && <span className="text-[10px] font-bold fx-suave">SUP</span>}
                                {t.id === al.capitan && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--fx-oro)] text-[10px] font-black text-black">C</span>}
                                <span className="text-xs">{t.precio}⭐</span>
                              </li>
                            );
                          })}
                        {al.duo && <li className="flex items-center gap-2.5 px-3 py-1.5 text-sm"><span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10 text-xs">📋</span><span className="min-w-0 flex-1 truncate">{liga.duos.get(al.duo.id)?.nombre ?? "Dúo técnico"} <span className="text-[11px] fx-suave">{liga.duos.get(al.duo.id)?.equipo}</span></span><span className="text-[10px] font-bold fx-suave">DÚO</span><span className="text-xs">{al.duo.precio}⭐</span></li>}
                        </ul>
                      </details>
                    );
                  })}
                  {!participantes.some((p) => liga.alineacion(p.id, jSel)) && <p className="p-3 text-sm fx-suave">Nadie ha fichado todavía.</p>}
                </section>
                <p className="text-center text-xs fx-suave">{espiados.size ? `👀 Has espiado ${espiados.size} ${espiados.size === 1 ? "equipo" : "equipos"} (${espiados.size * COSTE_ESPIA} ⭐). ` : ""}Toca tu equipo{espiados.size ? " o uno espiado" : ""} para verlo.</p>
              </>
            ) : (<>
            {q.config.anuladas.includes(jSel) && <p className="rounded-lg bg-amber-900/50 p-2 text-sm text-amber-100">Jornada anulada: no cuenta para la clasificación.</p>}
            <section className="fx-card fx-sep overflow-hidden">
              <div className="flex px-3 py-2 text-xs font-bold uppercase fx-suave"><span className="w-6">#</span><span className="ml-10 flex-1">Equipo</span><span className="w-12 text-center">Comodín</span><span className="w-10 text-center">⭐</span><span className="w-14 text-right">Pts</span></div>
              {participantes.filter((p) => liga.alineacion(p.id, jSel))
                .sort((a, b) => (liga.resultados.get(`${b.id}|${jSel}`)?.total ?? 0) - (liga.resultados.get(`${a.id}|${jSel}`)?.total ?? 0))
                .map((p) => {
                  const r = liga.resultados.get(`${p.id}|${jSel}`)!, al = liga.alineacion(p.id, jSel)!;
                  const pos = (liga.porJornada.get(jSel) ?? []).find((x) => x.id === p.id)?.pos ?? "–";
                  return (
                    <details key={p.id}>
                      <summary className="list-none [&::-webkit-details-marker]:hidden">
                        <Fila pos={pos} id={p.id} d={<>
                          <span className="w-12 text-center">{al.comodin ? <span className="rounded bg-[#3d2a8a] px-1 text-[10px] font-bold text-[var(--fx-oro)]">{al.comodin === "capitan3" ? "C×3" : al.comodin === "banquillo" ? "Supl." : "+10"}</span> : <span className="fx-suave">–</span>}</span>
                          <span className="w-10 text-center text-sm fx-suave">{al.coste}</span>
                        </>}>{pts(r.total)}</Fila>
                      </summary>
                      <div className="bg-black/20 pb-2"><MiJornada duos={liga.duos} res={r} al={al} jugador={jug} compacto /></div>
                    </details>
                  );
                })}
            </section>
            <p className="text-center text-xs fx-suave">Toca un equipo para ver su alineación.</p>
            </>)}
          </>
        )}
      </div>
    );
  }

  if (vista === "jornada") {
    const opciones = [...new Set([...liga.cerradas, ...(liga.abierta ? [liga.abierta] : [])])].sort();
    const jSel = sp.j && opciones.includes(sp.j) ? sp.j : (liga.enJuego ?? liga.abierta ?? liga.cerradas[liga.cerradas.length - 1] ?? liga.lunesHoy);
    const jugada = liga.cerradas.includes(jSel);
    const ideal = jugada ? liga.ideal(jSel) : [];
    const gg = jugada ? liga.ganga(jSel) : null;
    const rev = liga.revelacion(jSel);
    const esp = (q.config.especiales[jSel] ?? []).map((id) => partidos.find((p) => p.id === id)).filter(Boolean) as typeof partidos;
    const eqNom = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";
    const sitios = [[50, 22], [20, 40], [80, 40], [32, 74], [68, 74]];
    cuerpo = (
      <div className="space-y-3">
        {opciones.length > 1 && (
          <div className="flex flex-wrap gap-1.5">{opciones.map((l) => <Link key={l} href={`/fantasy?v=jornada&j=${l}`} className="fx-chip" data-on={l === jSel ? "1" : "0"}>{nombreJornada(q.config.inicio, l, q.config.anuladas)}</Link>)}</div>
        )}
        <h1 className="fx-display text-2xl">{nombreJornada(q.config.inicio, jSel, q.config.anuladas)} · del {fechaCorta(`${jSel}T12:00:00Z`).replace(".", "")} al {fechaCorta(`${sumarDias(jSel, 6)}T12:00:00Z`).replace(".", "")}</h1>
        <p className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${jugada ? "bg-[#5e0f17] text-red-100" : "bg-[#155f2d] text-green-100"}`}>
          {jugada ? (liga.enJuego === jSel ? "🔴 En juego: los puntos se suman en cuanto entran las estadísticas." : "Terminada") : `📅 Fichajes abiertos hasta el ${fechaCorta(liga.cierre(jSel))} a las ${hora(liga.cierre(jSel))}`}
        </p>
        <Chat jornada={jSel} esAdmin={q.esAdmin} silenciado={silencio(yo)} equipos={participantes.filter((p) => p.id !== yo.id).map((p) => p.alias)} />
        {(esp.length > 0 || gg || rev || ideal.length > 0) && <h2 className="fx-display pt-2 text-xl">Resumen de la jornada</h2>}
        {esp.length > 0 && (
          <div className="fx-card-rojo p-3 text-center">
            <p className="fx-display text-xl">⭐ Partido de la jornada</p>
            <p className="text-sm">{esp.map((p) => `${eqNom(p.equipo_id)} ${p.local ? "vs" : "@"} ${p.rival ?? "?"}${posicion(clasif.get(p.equipo_id), p.rival) ? ` (${posicion(clasif.get(p.equipo_id), p.rival)!.pos}º)` : ""} · ${fechaCorta(p.fecha)} ${hora(p.fecha)}`).join(" · ")} puntúa <strong>×1,5</strong></p>
          </div>
        )}
        {(gg || rev) && (
          <div className="grid grid-cols-2 gap-2">
            {gg ? (
              <div className="rounded-xl border-2 border-[#3b82f6] bg-gradient-to-b from-[#1b3a8a] to-[#0f1f52] p-3 text-center">
                <p className="text-xs font-bold">💎 Ganga de la semana</p>
                <p className="mt-1 font-semibold">{jug(gg.id)?.nombre}</p>
                <p className="text-xs">{pts(gg.puntos)} pts por solo {gg.precio} ⭐</p>
              </div>
            ) : <div />}
            {rev ? (
              <div className="rounded-xl border-2 border-[#a855f7] bg-gradient-to-b from-[#4c1d95] to-[#2a0f5a] p-3 text-center">
                <p className="text-xs font-bold">🚀 Revelación del mes</p>
                <p className="mt-1 font-semibold">{jug(rev.id)?.nombre}</p>
                <p className="text-xs">de {rev.antes} ⭐ a {rev.ahora} ⭐</p>
              </div>
            ) : <div />}
          </div>
        )}
        {ideal.length > 0 && (
          <section className="fx-card-oro overflow-hidden">
            <p className="fx-display px-3 py-2 text-xl">⭐ Quinteto ideal</p>
            <div className="fx-pista mx-3 mb-3 aspect-[4/3]">
              {ideal.map((x, i) => {
                const j = jug(x.id);
                return (
                  <div key={x.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${sitios[i][0]}%`, top: `${sitios[i][1]}%` }}>
                    <Camiseta dorsal={j?.dorsal ?? ""} equipo={j?.equipo ?? ""} size={42} />
                    <span className="max-w-24 truncate rounded bg-black/55 px-1 text-[10px] font-semibold">{j?.nombre.split(" ")[0]}</span>
                    <span className="text-[11px] font-black text-black">{pts(x.puntos)} pts</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  /** Estadísticas de un mánager (perfil y resumen de temporada) */
  const statsManager = (pid: string) => {
    const p = part.get(pid)!;
      const jugadas = liga.terminadas.filter((l) => liga.resultados.has(`${pid}|${l}`) && !q.config.anuladas.includes(l));
      const res = jugadas.map((l) => ({ l, r: liga.resultados.get(`${pid}|${l}`)!, al: liga.alineacion(pid, l)!, pos: (liga.porJornada.get(l) ?? []).find((x) => x.id === pid)?.pos ?? null, n: (liga.porJornada.get(l) ?? []).length }));
      const posG = general.findIndex((g) => g.id === pid) + 1;
      const totalG = general.find((g) => g.id === pid)?.total ?? 0;
      const media = res.length ? totalG / res.length : 0;
      const mejor = [...res].sort((a, b) => b.r.total - a.r.total)[0];
      const peor = [...res].sort((a, b) => a.r.total - b.r.total)[0];
      // Capitán: aciertos = el capitán fue el que más puntuó de sus titulares
      const conCap = res.filter((x) => x.r.filas.some((f) => f.capitan && f.jugo));
      const aciertos = conCap.filter((x) => { const c = x.r.filas.find((f) => f.capitan)!; return x.r.filas.every((f) => f.puntos <= c.puntos); }).length;
      const puntosCap = res.reduce((s, x) => s + x.r.filas.filter((f) => f.capitan).reduce((a, f) => a + f.puntos + f.extra, 0), 0);
      // Banquillo: puntos del suplente que jugó pero no entró
      const banquillo = res.reduce((s, x) => s + (x.r.suplente && x.r.suplente.jugo && !x.r.suplente.entro ? x.r.suplente.puntos : 0), 0);
      // Lo que le ha dado cada jugador (titulares, con el extra de capitán y el suplente si entró)
      const aporte = new Map<string, { pts: number; veces: number }>();
      const suma = (id: string, v: number) => { const a = aporte.get(id) ?? { pts: 0, veces: 0 }; a.pts += v; a.veces++; aporte.set(id, a); };
      for (const x of res) {
        for (const f of x.r.filas) suma(f.id, f.puntos + f.extra);
        if (x.r.suplente?.entro) suma(x.r.suplente.id, x.r.suplente.puntos);
        if (x.r.duo) suma(x.r.duo.id, x.r.duo.puntos);
      }
      const nombreDe = (id: string) => liga.jugadores.get(id)?.nombre ?? liga.duos.get(id)?.nombre ?? "?";
      const equipoDe = (id: string) => liga.jugadores.get(id)?.equipo ?? liga.duos.get(id)?.equipo ?? "";
      const mejores = [...aporte.entries()].sort((a, b) => b[1].pts - a[1].pts).slice(0, 3);
      const favorito = [...aporte.entries()].filter(([id]) => !id.startsWith("duo:")).sort((a, b) => b[1].veces - a[1].veces || b[1].pts - a[1].pts)[0];
      const capVeces = new Map<string, number>();
      for (const x of res) capVeces.set(x.al.capitan, (capVeces.get(x.al.capitan) ?? 0) + 1);
      const capFav = [...capVeces.entries()].sort((a, b) => b[1] - a[1])[0];
      // Su mejor fichaje en una sola jornada
      let mejorDia: { id: string; pts: number; l: string } | null = null;
      for (const x of res) for (const f of x.r.filas) if (f.jugo && (!mejorDia || f.puntos + f.extra > mejorDia.pts)) mejorDia = { id: f.id, pts: f.puntos + f.extra, l: x.l };
      const comodines = Object.entries(p.comodines ?? {}) as [Comodin, string][];
      const ins = liga.insignias(pid);
      const conseguidas = INSIGNIAS.filter((i) => ins.has(i.codigo));
    // Equipo del club del que más ha fichado
    const porEquipo = new Map<string, number>();
    for (const x of res) for (const t of x.al.titulares) { const e = liga.jugadores.get(t.id)?.equipo; if (e) porEquipo.set(e, (porEquipo.get(e) ?? 0) + 1); }
    const equipoFav = [...porEquipo.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const estrellas = res.reduce((s, x) => s + x.al.coste, 0);
    return { p, res, posG, totalG, media, mejor, peor, conCap, aciertos, puntosCap, banquillo, mejores, favorito, capFav, mejorDia, comodines, ins, conseguidas, nombreDe, equipoDe, equipoFav, estrellas };
  };

  if (vista === "manager") {
    // Perfil público de cada mánager con sus estadísticas
    const pid = sp.id && part.has(sp.id) ? sp.id : yo.id;
    const { p, res, posG, totalG, media, mejor, peor, conCap, aciertos, puntosCap, banquillo, mejores, favorito, capFav, mejorDia, comodines, conseguidas, nombreDe, equipoDe } = statsManager(pid);
    const J = (l: string) => nombreJornada(q.config.inicio, l, q.config.anuladas);
    const Dato = ({ t, v, s: sub }: { t: string; v: React.ReactNode; s?: React.ReactNode }) => (
      <div className="fx-card p-3"><p className="text-[11px] font-bold uppercase fx-suave">{t}</p><p className="fx-display text-2xl leading-tight">{v}</p>{sub && <p className="text-xs fx-suave">{sub}</p>}</div>
    );
    const maxT = Math.max(1, ...res.map((x) => x.r.total));
    cuerpo = (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/fantasy?v=clasificacion" className="fx-btn-sec">← Clasificación</Link>
          {res.length > 0 && <Link href={`/fantasy?v=resumen&id=${pid}`} className="fx-btn-sec">🎁 Resumen de temporada</Link>}
        </div>
        <section className="fx-card-oro flex items-center gap-4 p-4">
          <Escudo alias={p.alias} emoji={p.emoji} color={p.color} foto={p.foto} size={72} />
          <div className="min-w-0 flex-1">
            <p className="fx-display truncate text-3xl leading-none">{p.alias}</p>
            <p className="text-sm fx-suave">{p.mostrar}{pid === yo.id ? " · tú" : ""}</p>
            <p className="mt-1 text-sm">{posG ? <><strong className="text-[var(--fx-oro)]">{posG}º</strong> de {general.length} · </> : null}{pts(totalG)} pts · {res.length} {res.length === 1 ? "jornada" : "jornadas"}</p>
          </div>
        </section>
        {res.length === 0 ? <p className="fx-card p-4 text-sm fx-suave">Todavía no ha terminado ninguna jornada con equipo. Las estadísticas salen al acabar la primera.</p> : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Dato t="Media por jornada" v={pts(Math.round(media * 4) / 4)} />
              {mejor && <Dato t="Mejor jornada" v={`${pts(mejor.r.total)} pts`} s={`${J(mejor.l)}${mejor.pos ? ` · ${mejor.pos}º` : ""}`} />}
              {peor && res.length > 1 && <Dato t="Peor jornada" v={`${pts(peor.r.total)} pts`} s={J(peor.l)} />}
              <Dato t="Acierto con el capitán" v={conCap.length ? `${Math.round((aciertos * 100) / conCap.length)}%` : "–"} s={`${aciertos} de ${conCap.length} veces fue su mejor jugador`} />
              <Dato t="Puntos del capitán" v={pts(puntosCap)} s="contando el doble (o triple)" />
              <Dato t="Puntos en el banquillo" v={pts(banquillo)} s="del suplente que jugó y no entró" />
            </div>
            <section className="fx-card p-3">
              <p className="text-[11px] font-bold uppercase fx-suave">Puntos por jornada</p>
              <div className="mt-2 flex h-28 items-end gap-1.5">
                {res.map((x) => (
                  <div key={x.l} className="flex flex-1 flex-col items-center gap-1" title={`${J(x.l)}: ${pts(x.r.total)} pts`}>
                    <span className="text-[10px]">{pts(x.r.total)}</span>
                    <div className="w-full rounded-t bg-gradient-to-t from-[#b3121f] to-[#f0323f]" style={{ height: `${Math.max(4, (Math.max(0, x.r.total) / maxT) * 80)}px` }} />
                    <span className="text-[10px] fx-suave">{J(x.l).replace("Jornada ", "J")}{x.pos ? ` · ${x.pos}º` : ""}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="fx-card p-3">
              <p className="text-[11px] font-bold uppercase fx-suave">Los que más puntos le han dado</p>
              <ul className="mt-1 fx-sep">
                {mejores.map(([id, a], i) => (
                  <li key={id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="w-5 text-center">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="min-w-0 flex-1 truncate"><strong>{nombreDe(id)}</strong> <span className="text-xs fx-suave">{equipoDe(id)}</span></span>
                    <span className="text-xs fx-suave">{a.veces}×</span>
                    <span className="fx-pill-verde">{pts(a.pts)} pts</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {favorito && <p>💙 <span className="fx-suave">Jugador favorito:</span> <strong>{nombreDe(favorito[0])}</strong> ({favorito[1].veces} jornadas)</p>}
                {capFav && <p>©️ <span className="fx-suave">Capitán favorito:</span> <strong>{nombreDe(capFav[0])}</strong> ({capFav[1]}×)</p>}
                {mejorDia && <p>💥 <span className="fx-suave">Mejor fichaje en una jornada:</span> <strong>{nombreDe(mejorDia.id)}</strong>, {pts(mejorDia.pts)} pts ({J(mejorDia.l)})</p>}
                <p>🃏 <span className="fx-suave">Comodines usados:</span> {comodines.length ? comodines.map(([c]) => COMODINES[c]?.nombre ?? c).join(", ") : "ninguno"}</p>
              </div>
            </section>
          </>
        )}
        <section className="fx-card p-3">
          <p className="text-[11px] font-bold uppercase fx-suave">Insignias · {conseguidas.length} de {INSIGNIAS.length}</p>
          {conseguidas.length ? (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {conseguidas.map((i) => (
                <Link key={i.codigo} href={`/fantasy?v=insignias&i=${i.codigo}`} className="text-center">
                  <img src={i.img} alt="" className="mx-auto h-14 w-14" loading="lazy" />
                  <span className="block text-[10px] leading-tight">{i.nombre}</span>
                </Link>
              ))}
            </div>
          ) : <p className="mt-1 text-sm fx-suave">Aún ninguna.</p>}
        </section>
      </div>
    );
  }

  if (vista === "resumen") {
    // Resumen de la temporada (hasta ahora), en tarjetas para pasar con el dedo, como un «Wrapped»
    const pid = sp.id && part.has(sp.id) ? sp.id : yo.id;
    const st = statsManager(pid);
    const J = (l: string) => nombreJornada(q.config.inicio, l, q.config.anuladas);
    const tuyo = pid === yo.id;
    const pctCap = st.conCap.length ? Math.round((st.aciertos * 100) / st.conCap.length) : null;
    const estrella = st.mejores.find(([id]) => !id.startsWith("duo:"));
    const tarjetas: { fondo: string; contenido: React.ReactNode }[] = [
      { fondo: "from-[#b3121f] to-[#3d0d19]", contenido: <><Escudo alias={st.p.alias} emoji={st.p.emoji} color={st.p.color} foto={st.p.foto} size={96} /><p className="mt-4 text-sm uppercase tracking-[0.25em] text-[var(--fx-oro)]">{temporada}</p><p className="fx-display mt-1 text-4xl leading-none">{tuyo ? "Tu temporada" : "La temporada de"}</p><p className="fx-display fx-oro-texto mt-1 text-5xl leading-none">{st.p.alias}</p><p className="mt-6 text-sm text-white/70">Desliza →</p></> },
      { fondo: "from-[#1d2f70] to-[#0a1024]", contenido: <><p className="text-lg">{tuyo ? "Has sumado" : "Ha sumado"}</p><p className="fx-display fx-oro-texto text-8xl leading-none">{pts(st.totalG)}</p><p className="text-lg">puntos en {st.res.length} {st.res.length === 1 ? "jornada" : "jornadas"}</p>{st.posG > 0 && <p className="mt-6 fx-display text-3xl">{st.posG}º de {general.length}</p>}<p className="text-sm text-white/70">Media de {pts(Math.round(st.media * 4) / 4)} por jornada</p></> },
      ...(st.mejor ? [{ fondo: "from-[#5e0f17] to-[#1a0a10]", contenido: <><p className="text-lg">{tuyo ? "Tu mejor jornada" : "Su mejor jornada"}</p><p className="fx-display text-4xl">{J(st.mejor.l)}</p><p className="fx-display fx-oro-texto text-8xl leading-none">{pts(st.mejor.r.total)}</p><p className="text-lg">puntos{st.mejor.pos ? ` · ${st.mejor.pos}º de ${st.mejor.n}` : ""}</p>{st.mejor.pos === 1 && <p className="mt-4 text-2xl">👑 ¡Ganó la jornada!</p>}</> }] : []),
      ...(estrella ? [{ fondo: "from-[#155f2d] to-[#06210f]", contenido: <><p className="text-lg">{tuyo ? "Tu jugador estrella" : "Su jugador estrella"}</p><p className="mt-2 text-6xl">⭐</p><p className="fx-display mt-2 text-4xl leading-tight">{st.nombreDe(estrella[0])}</p><p className="text-sm text-white/70">{st.equipoDe(estrella[0])}</p><p className="mt-4 fx-display fx-oro-texto text-5xl">{pts(Math.round(estrella[1].pts * 4) / 4)} pts</p><p className="text-sm">en {estrella[1].veces} {estrella[1].veces === 1 ? "jornada" : "jornadas"}</p></> }] : []),
      ...(st.capFav ? [{ fondo: "from-[#3d2a8a] to-[#120a33]", contenido: <><p className="text-lg">El brazalete</p><p className="mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#ffe27a] to-[#e2a414] text-3xl font-black text-black">C</p><p className="fx-display mt-3 text-3xl leading-tight">{st.nombreDe(st.capFav[0])}</p><p className="text-sm text-white/70">capitán {st.capFav[1]} {st.capFav[1] === 1 ? "vez" : "veces"}</p>{pctCap !== null && <><p className="mt-4 fx-display fx-oro-texto text-7xl leading-none">{pctCap}%</p><p className="text-sm">de acierto con el capitán</p></>}<p className="mt-2 text-sm text-white/70">{pts(st.puntosCap)} pts sumados por {tuyo ? "tus" : "sus"} capitanes</p></> }] : []),
      ...(st.equipoFav ? [{ fondo: "from-[#0f4c75] to-[#071a2b]", contenido: <><p className="text-lg">{tuyo ? "Tu equipo del Turó" : "Su equipo del Turó"}</p><p className="mt-2 text-6xl">🏀</p><p className="fx-display mt-2 text-5xl leading-tight">{st.equipoFav[0]}</p><p className="mt-2 text-lg">{st.equipoFav[1]} fichajes de titular</p></> }] : []),
      { fondo: "from-[#7a5a00] to-[#1f1600]", contenido: <><p className="text-lg">Insignias</p><p className="fx-display fx-oro-texto text-8xl leading-none">{st.conseguidas.length}<span className="text-4xl text-white/60">/{INSIGNIAS.length}</span></p><div className="mt-4 flex max-w-xs flex-wrap justify-center gap-2">{st.conseguidas.slice(0, 8).map((i) => <img key={i.codigo} src={i.img} alt={i.nombre} title={i.nombre} className="h-12 w-12" />)}</div></> },
      { fondo: "from-[#1d2f70] to-[#3d0d19]", contenido: <><p className="fx-display text-3xl">Curiosidades</p><ul className="mt-4 space-y-3 text-left text-base">
        <li>⭐ <strong>{st.estrellas}</strong> estrellas gastadas en fichajes</li>
        <li>🪑 <strong>{pts(st.banquillo)}</strong> pts se quedaron en el banquillo</li>
        {st.mejorDia && <li>💥 Mejor fichaje en una jornada: <strong>{st.nombreDe(st.mejorDia.id)}</strong> con {pts(st.mejorDia.pts)} pts</li>}
        <li>🃏 Comodines usados: <strong>{st.comodines.length}</strong> de 3</li>
        {st.peor && st.res.length > 1 && <li>😅 Peor jornada: {pts(st.peor.r.total)} pts ({J(st.peor.l)})</li>}
      </ul></> },
    ];
    const texto = `🏀 ${tuyo ? "Mi" : "La"} temporada en el Fantasy Turó${tuyo ? "" : ` de ${st.p.alias}`}:\n` +
      `• ${pts(st.totalG)} puntos en ${st.res.length} jornadas${st.posG ? ` (${st.posG}º de ${general.length})` : ""}\n` +
      (st.mejor ? `• Mejor jornada: ${pts(st.mejor.r.total)} pts\n` : "") +
      (estrella ? `• Jugador estrella: ${st.nombreDe(estrella[0])}\n` : "") +
      (pctCap !== null ? `• Acierto con el capitán: ${pctCap}%\n` : "") +
      `• Insignias: ${st.conseguidas.length}/${INSIGNIAS.length}\n¿Te atreves? 👉 coach.cbturo.com/fantasy`;
    cuerpo = st.res.length === 0 ? (
      <div className="space-y-3"><Link href={`/fantasy?v=manager&id=${pid}`} className="fx-btn-sec">← Perfil</Link><p className="fx-card p-4 text-sm fx-suave">El resumen sale cuando termina la primera jornada con equipo.</p></div>
    ) : (
      <div className="space-y-3">
        <Link href={`/fantasy?v=manager&id=${pid}`} className="fx-btn-sec">← Perfil</Link>
        <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {tarjetas.map((t, i) => (
            <section key={i} className={`flex aspect-[9/16] max-h-[70vh] w-[82%] shrink-0 snap-center flex-col items-center justify-center rounded-3xl bg-gradient-to-b ${t.fondo} p-6 text-center shadow-2xl ring-1 ring-white/10 sm:w-80`}>
              {t.contenido}
              <p className="mt-auto pt-4 text-[10px] uppercase tracking-[0.3em] text-white/40">Fantasy Turó · {i + 1}/{tarjetas.length}</p>
            </section>
          ))}
        </div>
        <div className="flex justify-center"><Compartir texto={texto} etiqueta={tuyo ? "Compartir mi resumen" : "Compartir"} /></div>
        <p className="text-center text-xs fx-suave">Es la temporada hasta hoy: se va actualizando cada jornada.</p>
      </div>
    );
  }

  if (vista === "puntos") {
    // Puntos de cada jugador en su partido de la jornada, con el desglose
    const opciones = [...new Set([...liga.cerradas, ...(liga.abierta ? [liga.abierta] : [])])].sort();
    const conDatos = opciones.filter((l) => liga.actuaciones.some((a) => a.lunes === l && a.jugo));
    const jSel = sp.j && opciones.includes(sp.j) ? sp.j : (liga.enJuego ?? [...conDatos].pop() ?? liga.abierta ?? liga.lunesHoy);
    const cerrada = liga.cerradas.includes(jSel);
    // Cuántos lo llevan (solo cuando ya se ven los equipos de los demás)
    const fichado = new Map<string, number>();
    if (cerrada) for (const p of participantes) {
      const al = liga.alineacion(p.id, jSel);
      for (const t of al?.titulares ?? []) fichado.set(t.id, (fichado.get(t.id) ?? 0) + 1);
      if (al?.duo) fichado.set(al.duo.id, (fichado.get(al.duo.id) ?? 0) + 1);
    }
    type Act = (typeof liga.actuaciones)[number];
    const grupos = new Map<string, { eq: string; partidoId: string | null; marcador: string; gana: boolean; especial: boolean; fecha: string; acts: Act[] }>();
    for (const a of liga.actuaciones.filter((x) => x.lunes === jSel)) {
      const j = liga.jugadores.get(a.jugador); if (!j) continue;
      const k = `${j.equipoId}|${a.partido}`;
      const g = grupos.get(k) ?? { eq: j.equipoId, partidoId: a.partidoId, marcador: a.s.marcador, gana: a.s.gana, especial: a.especial, fecha: a.fecha, acts: [] };
      g.acts.push(a); grupos.set(k, g);
    }
    const lista = [...grupos.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const pendientesJ = partidos.filter((p) => lunesDe(diaInput(p.fecha)) === jSel && liga.pool.has(p.equipo_id) && !lista.some((g) => g.partidoId === p.id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const eqNom = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";
    const desglose = (a: Act) => {
      const s = a.s, fallados = Math.max(0, s.tla - s.tlm);
      const partes: [string, number][] = [
        [`${s.pts} puntos`, s.pts * 0.5], ...(s.t3 ? [[`${s.t3} triples`, s.t3 * 0.5] as [string, number]] : []),
        ...(s.tla ? [[`TL ${s.tlm}/${s.tla}`, s.tlm * 0.25 - fallados * 0.5] as [string, number]] : []),
        ...(s.titular ? [["Titular", 1] as [string, number]] : []),
        [`+/- ${s.mm > 0 ? "+" : ""}${s.mm}`, Math.max(-6, Math.min(6, s.mm / 4))],
        ...(s.gana ? [["Victoria", 1] as [string, number]] : []),
        ...(s.fc > 2 ? [[`${s.fc} faltas`, -0.5 * (s.fc - 2) - (s.fc >= 5 ? 2 : 0)] as [string, number]] : []),
      ];
      const sinMin = partes.reduce((x, [, v]) => x + v, 0);
      const minutos = Math.max(0, Math.round((a.base - sinMin) * 4) / 4);
      return [...partes.slice(0, 1), [`${s.min} minutos`, a.base <= -5 ? Math.floor(s.min / 5) : minutos] as [string, number], ...partes.slice(1)];
    };
    const f = (x: number) => `${x > 0 ? "+" : ""}${pts(x)}`;
    cuerpo = (
      <div className="space-y-3">
        {opciones.length > 1 && (
          <div className="flex flex-wrap gap-1.5">{opciones.map((l) => <Link key={l} href={`/fantasy?v=puntos&j=${l}`} className="fx-chip" data-on={l === jSel ? "1" : "0"}>{nombreJornada(q.config.inicio, l, q.config.anuladas)}</Link>)}</div>
        )}
        <h1 className="fx-display text-2xl">Puntos · {nombreJornada(q.config.inicio, jSel, q.config.anuladas)}</h1>
        <p className="text-sm fx-suave">Lo que ha sumado cada jugador en su partido. Toca un jugador para ver de dónde salen sus puntos.</p>
        {lista.length === 0 && <p className="fx-card p-4 text-sm fx-suave">Aún no hay partidos con estadísticas esta jornada. Se cargan solos al poco de acabar cada partido.</p>}
        {lista.map((g) => {
          const pa = g.partidoId ? partidos.find((p) => p.id === g.partidoId) : undefined;
          const duoR = g.partidoId ? liga.resDuo.find((r) => r.partidoId === g.partidoId) : undefined;
          const duo = liga.duos.get(`duo:${g.eq}`);
          const jugaron = g.acts.filter((a) => a.jugo).sort((a, b) => b.puntos - a.puntos);
          const noJugaron = g.acts.filter((a) => !a.jugo);
          return (
            <section key={`${g.eq}|${g.partidoId ?? g.fecha}`} className="fx-card overflow-hidden">
              <div className="fx-cab-rojo flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="fx-display truncate text-lg">{eqNom(g.eq)} {pa?.rival ? <span className="font-normal opacity-80">vs {pa.rival}</span> : null}</p>
                  <p className="text-xs opacity-80">{fechaCorta(g.fecha)} · {g.gana ? "Victoria" : "Derrota"} {g.marcador}</p>
                </div>
                {g.especial && <span className="rounded-full bg-[var(--fx-oro)] px-2 py-0.5 text-xs font-black text-black">×1,5</span>}
              </div>
              <ul className="fx-sep">
                {jugaron.map((a, i) => {
                  const j = liga.jugadores.get(a.jugador)!;
                  const n = fichado.get(a.jugador) ?? 0;
                  return (
                    <li key={a.jugador}>
                      <details>
                        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2">
                          <span className="w-4 text-right text-xs fx-suave">{i + 1}</span>
                          <Camiseta dorsal={j.dorsal} equipo={j.equipo} size={28} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{j.nombre}</span>
                            <span className="block text-[11px] fx-suave">{a.s.pts} pts · {a.s.min}′ · {a.s.mm > 0 ? "+" : ""}{a.s.mm}{n > 0 ? ` · 👥 ${n}` : ""}</span>
                          </span>
                          <span className={a.puntos < 0 ? "fx-pill-rojo" : "fx-pill-verde"}>{pts(a.puntos)} pts</span>
                        </summary>
                        <div className="mx-3 mb-2 rounded-lg bg-white/5 p-2 text-xs">
                          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {desglose(a).map(([t, v]) => <li key={t} className="flex justify-between"><span className="fx-suave">{t}</span><span className={v < 0 ? "text-red-300" : "text-green-300"}>{f(v)}</span></li>)}
                          </ul>
                          <p className="mt-1 flex justify-between border-t border-white/10 pt-1 font-semibold"><span>{a.especial ? `${pts(a.base)} × 1,5 (partido de la jornada)` : "Total"}{a.base <= -5 ? " · mínimo −5" : ""}</span><span>{pts(a.puntos)}</span></p>
                          <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(a.jugador)}`} className="mt-1 inline-block text-[var(--fx-oro)] underline">Ver su ficha →</Link>
                        </div>
                      </details>
                    </li>
                  );
                })}
                {duoR && duo && pa && pa.puntos_favor != null && pa.puntos_contra != null && (() => {
                  const pf = pa.puntos_favor!, pc = pa.puntos_contra!, gana = pf > pc, dif = pf - pc;
                  const margen = Math.max(-4, Math.min(4, Math.trunc(dif / 5)));
                  const bonus = duoR.base - ((gana ? 4 : -1) + margen);
                  const filasD: [string, number][] = [
                    [gana ? "Victoria" : "Derrota", gana ? 4 : -1],
                    [`Diferencia ${dif > 0 ? "+" : ""}${dif} (±1 cada 5, máx. ±4)`, margen],
                    ...(bonus ? [["Gana a un rival mejor clasificado", bonus] as [string, number]] : []),
                  ];
                  const n = fichado.get(duo.id) ?? 0;
                  return (
                    <li>
                      <details>
                        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2">
                          <span className="w-4" />
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">📋</span>
                          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{duo.nombre}</span><span className="block text-[11px] fx-suave">Dúo técnico{n > 0 ? ` · 👥 ${n}` : ""}</span></span>
                          <span className={duoR.puntos < 0 ? "fx-pill-rojo" : "fx-pill-verde"}>{pts(duoR.puntos)} pts</span>
                        </summary>
                        <div className="mx-3 mb-2 rounded-lg bg-white/5 p-2 text-xs">
                          <ul className="space-y-0.5">
                            {filasD.map(([t, v]) => <li key={t} className="flex justify-between"><span className="fx-suave">{t}</span><span className={v < 0 ? "text-red-300" : "text-green-300"}>{f(v)}</span></li>)}
                          </ul>
                          <p className="mt-1 flex justify-between border-t border-white/10 pt-1 font-semibold"><span>{g.especial ? `${pts(duoR.base)} × 1,5 (partido de la jornada)` : "Total"}</span><span>{pts(duoR.puntos)}</span></p>
                          <Link href={`/fantasy?v=jugador&id=${encodeURIComponent(duo.id)}`} className="mt-1 inline-block text-[var(--fx-oro)] underline">Ver su ficha →</Link>
                        </div>
                      </details>
                    </li>
                  );
                })()}
              </ul>
              {noJugaron.length > 0 && <p className="border-t border-white/10 px-3 py-1.5 text-[11px] fx-suave">No jugaron: {noJugaron.map((a) => liga.jugadores.get(a.jugador)?.nombre).filter(Boolean).join(", ")}</p>}
            </section>
          );
        })}
        {pendientesJ.length > 0 && (
          <section className="fx-card p-3 text-sm">
            <p className="font-semibold">Por jugar o sin estadísticas todavía</p>
            <ul className="mt-1 space-y-0.5 fx-suave">{pendientesJ.map((p) => <li key={p.id}>{eqNom(p.equipo_id)}{p.rival ? ` vs ${p.rival}` : ""} · {fechaCorta(p.fecha)} {hora(p.fecha)}</li>)}</ul>
          </section>
        )}
      </div>
    );
  }

  if (vista === "jugador") {
    const id = sp.id ?? "";
    const esDuo = id.startsWith("duo:");
    const j = esDuo ? undefined : liga.jugadores.get(id);
    const d = esDuo ? liga.duos.get(id) : undefined;
    if (!j && !d) {
      cuerpo = <div className="space-y-3"><Link href="/fantasy?v=mercado" className="fx-btn-sec">← Mercado</Link><p className="fx-card p-4 text-sm fx-suave">No encuentro a ese jugador.</p></div>;
    } else {
      const equipoId = j?.equipoId ?? d!.equipoId, equipoNom = j?.equipo ?? d!.equipo, nombre = j?.nombre ?? d!.nombre;
      const precioEn = (l: string) => (esDuo ? liga.precioDuo(l) : liga.precio(l)).get(id);
      const puntosEn = (l: string) => { const x = (esDuo ? liga.semanaDuo(l) : liga.semana(l)).get(id); return x?.jugo ? x.puntos : null; };
      // Semanas desde su primer partido hasta la jornada que se ficha ahora (o la siguiente)
      const fechas = esDuo ? liga.resDuo.filter((r) => r.id === id).map((r) => r.lunes) : liga.actuaciones.filter((a) => a.jugador === id).map((a) => a.lunes);
      const primera = fechas.sort()[0] ?? liga.lunesHoy;
      const hasta = liga.abierta ?? sumarDias(liga.lunesHoy, 7);
      const semanas: string[] = [];
      for (let l = sumarDias(primera, 7); l <= hasta; l = sumarDias(l, 7)) semanas.push(l);
      const etiqueta = (l: string) => new Date(`${l}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
      const serie = semanas.map((l) => ({ etiqueta: etiqueta(l), precio: precioEn(l)?.precio ?? 0 })).filter((x) => x.precio);
      const actual = precioEn(hasta) ?? { precio: 0, media: null, pj: 0 };
      const antes = serie.length > 1 ? serie[serie.length - 2].precio : actual.precio;
      const inicial = serie[0]?.precio ?? actual.precio;
      const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
      const cambio = actual.precio - antes, cambioPct = pct(actual.precio, antes), totalPct = pct(actual.precio, inicial);
      const maxP = serie.length ? Math.max(...serie.map((x) => x.precio)) : actual.precio, minP = serie.length ? Math.min(...serie.map((x) => x.precio)) : actual.precio;
      const puntosSem = [...new Set(fechas)].sort().slice(-10).map((l) => ({ etiqueta: etiqueta(l), puntos: puntosEn(l) }));
      // Popularidad: cuántos lo tienen en la jornada actual
      const jActual = liga.abierta ?? liga.enJuego ?? liga.cerradas[liga.cerradas.length - 1];
      const conEquipo = jActual ? participantes.filter((p) => liga.alineacion(p.id, jActual)) : [];
      const loTienen = jActual ? conEquipo.filter((p) => { const al = liga.alineacion(p.id, jActual)!; return esDuo ? al.duo?.id === id : al.titulares.some((t) => t.id === id) || al.suplente?.id === id; }).length : 0;
      const proximo = rivalDe(equipoId, hasta);
      const partidoDe = new Map(partidos.map((p) => [p.id, p]));
      const lista = esDuo
        ? liga.resDuo.filter((r) => r.id === id).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((r) => {
            const p = partidoDe.get(r.partidoId);
            return { k: r.partidoId, fecha: r.fecha, rival: `${p?.local ? "vs" : "@"} ${p?.rival ?? "?"}`, linea: `${p?.puntos_favor}-${p?.puntos_contra} · ${(p?.puntos_favor ?? 0) > (p?.puntos_contra ?? 0) ? "victoria" : "derrota"}`, puntos: r.puntos as number | null };
          })
        : liga.actuaciones.filter((a) => a.jugador === id).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((a) => {
            const p = a.partidoId ? partidoDe.get(a.partidoId) : undefined;
            return { k: a.partido, fecha: a.fecha, rival: p ? `${p.local ? "vs" : "@"} ${p.rival ?? "?"}` : a.s.marcador, linea: a.jugo ? `${a.s.pts} pts · ${a.s.min}' · ${a.s.mm > 0 ? "+" : ""}${a.s.mm} · ${a.s.fc} F${a.s.titular ? " · titular" : ""}` : "No jugó", puntos: a.jugo ? a.puntos : null };
          });
      cuerpo = (
        <div className="space-y-3">
          <Link href="/fantasy?v=mercado" className="fx-btn-sec">← Mercado</Link>
          <section className="fx-card p-4">
            <div className="flex items-center gap-3">
              {j ? <Camiseta dorsal={j.dorsal} equipo={j.equipo} size={52} /> : <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/10 text-2xl">📋</span>}
              <div className="min-w-0 flex-1">
                <h1 className="fx-display break-words text-2xl leading-tight">{nombre}</h1>
                <p className="text-xs fx-suave">{esDuo ? "Dúo técnico · " : j?.dorsal ? `#${j.dorsal} · ` : ""}{equipoNom}</p>
                {proximo && <p className="text-xs text-white/80">🏀 Próximo: {proximo}</p>}
              </div>
              <div className="text-right">
                <p className="fx-display text-4xl leading-none">{actual.precio}<span className="text-2xl">⭐</span></p>
                <p className={`text-sm font-bold ${cambio > 0 ? "text-green-400" : cambio < 0 ? "text-red-400" : "fx-suave"}`}>{cambio > 0 ? "▲" : cambio < 0 ? "▼" : "="} {cambio > 0 ? "+" : ""}{cambio} ({cambioPct > 0 ? "+" : ""}{cambioPct}%)</p>
                <p className="text-[10px] fx-suave">vs. semana anterior</p>
              </div>
            </div>
            <div className="mt-3"><GraficaPrecio datos={serie} /></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
              {[["Desde el inicio", `${totalPct > 0 ? "+" : ""}${totalPct}%`, totalPct > 0 ? "text-green-400" : totalPct < 0 ? "text-red-400" : ""], ["Máximo", `${maxP}⭐`, ""], ["Mínimo", `${minP}⭐`, ""], ["Media", actual.media !== null ? pts(actual.media) : "–", "text-[var(--fx-oro)]"]].map(([t, v, c]) => (
                <div key={t} className="rounded-lg bg-black/25 px-1 py-1.5"><p className={`text-base font-bold ${c}`}>{v}</p><p className="text-[10px] fx-suave">{t}</p></div>
              ))}
            </div>
            {jActual && conEquipo.length > 0 && <p className="mt-3 text-center text-xs fx-suave">👥 Lo tienen <strong className="text-white">{loTienen} de {conEquipo.length}</strong> equipos esta jornada ({Math.round((loTienen / conEquipo.length) * 100)}%)</p>}
          </section>
          {puntosSem.length > 0 && (
            <section className="fx-card p-3">
              <h2 className="font-semibold">Puntos Fantasy por jornada</h2>
              <BarrasPuntos datos={puntosSem} />
            </section>
          )}
          <section className="fx-card overflow-hidden">
            <h2 className="border-b border-[var(--fx-borde)] px-3 py-2 font-semibold">{esDuo ? "Resultados" : "Partidos"}</h2>
            {lista.length === 0 ? <p className="p-3 text-sm fx-suave">Aún no hay partidos.</p> : (
              <ul className="fx-sep">
                {lista.map((x) => (
                  <li key={x.k} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <span className="w-14 shrink-0 text-[11px] fx-suave">{new Date(x.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}</span>
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.rival}</p><p className="truncate text-[11px] fx-suave">{x.linea}</p></div>
                    {x.puntos === null ? <span className="text-xs fx-suave">—</span> : <span className={x.puntos < 0 ? "fx-pill-rojo" : "fx-pill-verde"}>{pts(x.puntos)} pts</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-center text-[11px] fx-suave">El precio de cada semana sale de la media de sus últimas 4 jornadas. Se fija el lunes a las 9:30.</p>
        </div>
      );
    }
  }

  if (vista === "calendario") {
    const clas = await cargarClasificaciones();
    const ps = partidos.filter((p) => liga.pool.has(p.equipo_id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimo = ps[ps.length - 1]?.fecha;
    const hasta = ultimo ? lunesDe(diaInput(ultimo)) : liga.lunesHoy;
    const semanas: string[] = [];
    for (let l = lunesDe(q.config.inicio); l <= hasta; l = sumarDias(l, 7)) semanas.push(l);
    const eqNom = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "";
    const cuando = (f: string) => new Date(f).toLocaleString("es-ES", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
    const esp = new Set(Object.values(q.config.especiales).flat());
    cuerpo = (
      <div className="space-y-3">
        <h1 className="fx-display text-2xl">📅 Calendario por jornadas</h1>
        <p className="text-xs fx-suave">Partidos de los equipos que puntúan en el Fantasy, con la posición de cada uno en su liga. Si la Federació cambia un partido de día, aquí se actualiza solo.</p>
        {semanas.map((l) => {
          const lista = ps.filter((p) => lunesDe(diaInput(p.fecha)) === l);
          const sin = q.config.anuladas.includes(l);
          const estado = sin ? null : l === liga.abierta ? "Fichando" : l === liga.enJuego ? "En juego" : l < liga.lunesHoy ? "Terminada" : null;
          return (
            <details key={l} open={l >= liga.lunesHoy} className={`fx-card overflow-hidden ${l === liga.lunesHoy ? "!border-[var(--fx-oro)] border-2" : ""} ${sin ? "opacity-60" : ""}`}>
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
                <span className="fx-display text-lg">{sin ? "🚫 Sin Fantasy" : nombreJornada(q.config.inicio, l, q.config.anuladas)}</span>
                <span className="text-xs fx-suave">semana del {fechaCorta(`${l}T12:00:00Z`)}</span>
                {estado && <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${estado === "En juego" ? "bg-[var(--fx-rojo)]" : estado === "Fichando" ? "bg-[var(--fx-verde)]" : "bg-white/15"}`}>{estado}</span>}
              </summary>
              {lista.length === 0 ? <p className="border-t border-[var(--fx-borde)] px-3 py-2 text-sm fx-suave">Sin partidos.</p> : (
                <ul className="fx-sep border-t border-[var(--fx-borde)]">
                  {lista.map((p) => {
                    const c = clas.get(p.equipo_id);
                    const nos = posicion(c, null, true), ellos = posicion(c, p.rival);
                    const jugado = p.puntos_favor != null && p.puntos_contra != null;
                    const gana = jugado && p.puntos_favor! > p.puntos_contra!;
                    return (
                      <li key={p.id} className={`flex items-center gap-2.5 px-3 py-2 text-sm ${esp.has(p.id) ? "bg-[var(--fx-oro)]/10" : ""}`}>
                        <span className="w-[70px] shrink-0 text-[11px] leading-tight fx-suave">{cuando(p.fecha)}</span>
                        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorEquipo(eqNom(p.equipo_id)) }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {sigla(eqNom(p.equipo_id))}{nos && <span className="ml-1 text-[11px] font-normal text-[var(--fx-oro)]">{nos.pos}º</span>}
                            <span className="mx-1.5 text-xs font-normal fx-suave">{p.local ? "vs" : "@"}</span>
                            {p.rival ?? "Rival"}{ellos && <span className="ml-1 text-[11px] font-normal fx-suave">{ellos.pos}º</span>}
                          </p>
                          {esp.has(p.id) && <p className="text-[11px] font-bold text-[var(--fx-oro)]">⭐ Partido de la jornada · ×1,5</p>}
                        </div>
                        {jugado && <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${gana ? "bg-[#155f2d] text-green-100" : "bg-[#5e0f17] text-red-100"}`}>{p.puntos_favor}-{p.puntos_contra}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>
          );
        })}
        <p className="text-center text-[11px] fx-suave">«vs» en casa · «@» fuera · el número pequeño es la posición en su liga</p>
      </div>
    );
  }

  if (vista === "insignias") {
    const todos = participantes.map((p) => liga.insignias(p.id));
    const det = INSIGNIAS.find((x) => x.codigo === sp.i);
    if (det) {
      const tengo = misInsignias.has(det.codigo), cuando = misInsignias.get(det.codigo);
      const cuantos = todos.filter((m) => m.has(det.codigo)).length;
      cuerpo = (
        <div className="space-y-4 text-center">
          <Link href="/fantasy?v=insignias" className="fx-btn-sec">← Insignias</Link>
          <img src={det.img} alt="" className={`fx-pop mx-auto h-56 w-56 ${tengo ? "drop-shadow-[0_0_30px_rgba(246,196,69,.45)]" : "opacity-40 grayscale"}`} />
          <p className="fx-display fx-oro-texto text-4xl">{det.nombre}</p>
          <p className="text-white/85">{det.texto}</p>
          {tengo ? (
            <p className="mx-auto max-w-xs rounded-xl border border-[#22b04f] bg-[#155f2d]/70 p-3 font-semibold">✅ Conseguida{cuando ? ` en la ${nombreJornada(q.config.inicio, cuando, q.config.anuladas)}` : ""}</p>
          ) : <p className="mx-auto max-w-xs rounded-xl border border-[var(--fx-borde)] p-3 fx-suave">🔒 Todavía no la tienes</p>}
          <p className="text-sm fx-suave">👥 <strong className="text-white">{cuantos} de {participantes.length}</strong> participantes la tienen.</p>
        </div>
      );
    } else {
      cuerpo = (
        <div className="space-y-3">
          <div className="text-center">
            <p className="fx-display text-3xl"><Star className="mb-1 inline fill-[var(--fx-oro)] text-[var(--fx-oro)]" size={26} /> Llevas {misInsignias.size} de {INSIGNIAS.length}</p>
            <div className="mx-auto mt-2 h-2.5 max-w-xs overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#22b04f] to-[#f6c445]" style={{ width: `${(misInsignias.size / INSIGNIAS.length) * 100}%` }} /></div>
          </div>
          {(Object.keys(NIVEL) as Nivel[]).map((n) => {
            const lista = INSIGNIAS.filter((x) => x.nivel === n);
            return (
              <details key={n} open className={`overflow-hidden rounded-xl border-2 ${NIVEL[n].borde} bg-[var(--fx-card)]`}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-bold [&::-webkit-details-marker]:hidden">
                  <span className="h-3 w-3 rounded-full" style={{ background: NIVEL[n].color }} /> {NIVEL[n].t} ({lista.length})
                  <span className="ml-auto text-xs fx-suave">{lista.filter((x) => misInsignias.has(x.codigo)).length} conseguidas</span>
                </summary>
                <div className="grid grid-cols-3 gap-2 p-3 pt-0 sm:grid-cols-5">
                  {lista.map((x) => {
                    const tengo = misInsignias.has(x.codigo);
                    return (
                      <Link key={x.codigo} href={`/fantasy?v=insignias&i=${x.codigo}`} className="text-center">
                        <img src={x.img} alt={x.nombre} className={`mx-auto aspect-square w-full max-w-24 ${tengo ? "" : "opacity-30 grayscale"}`} loading="lazy" />
                        <p className={`text-[11px] font-semibold leading-tight ${tengo ? "" : "fx-suave"}`}>{x.nombre}</p>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      );
    }
  }

  if (vista === "reglas") {
    const tabla: [string, string, string][] = [["🏀", "Punto anotado", "+0,50"], ["⭐", "Triple (extra)", "+0,50"], ["FT", "Tiro libre anotado", "+0,25"], ["✖", "Tiro libre fallado", "−0,50"],
      ["⏱", "Cada 5 minutos jugados", "+1,00"], ["👕", "Ser titular", "+1,00"], ["±", "+/- en pista (÷ 4, entre −6 y +6)", "±6"], ["🏆", "Victoria del equipo", "+1,00"],
      ["🟨", "Faltas (desde la 3ª, cada una)", "−0,50"], ["🟥", "Eliminado (5 faltas)", "−2,00"], ["⬇", "Mínimo por jugador y jornada", "−5"]];
    cuerpo = (
      <div className="space-y-2.5">
        {q.config.premio && (
          <div className="fx-card-oro flex items-center gap-3 p-3">
            <img src="/insignias/29-campeon-del-turo.png" alt="" className="h-14 w-14" />
            <div><p className="fx-display text-sm text-[var(--fx-oro)]">Premio</p><p className="fx-display fx-oro-texto text-2xl leading-none">Campeón</p><p className="text-xs text-white/80">{q.config.premio}</p></div>
          </div>
        )}
        <Acordeon titulo="📅 Cada jornada" abierto>
          <ul className="list-disc space-y-1 pl-5">
            <li>Una jornada es cada semana. Los fichajes se abren el <strong>lunes a las 9:30</strong> y se cierran cuando empieza el primer partido.</li>
            <li>Tienes <strong>{PRESUPUESTO} ⭐</strong> para <strong>5 titulares, 1 suplente y 1 dúo técnico</strong>. Cada jugador cuesta de 4 a 15 ⭐ según sus últimas 4 jornadas, y el precio no cambia en toda la semana.</li>
            <li>Máximo <strong>2 titulares del mismo equipo</strong>. El <strong>capitán</strong> puntúa doble.</li>
            <li>El <strong>suplente</strong> entra solo si un titular no juega.</li>
            <li>A quien fiches una jornada no lo puedes fichar la siguiente (el suplente, solo si llegó a entrar).</li>
            <li>Si alguien juega en dos equipos, eliges con cuál puntúa.</li>
            <li>Algunas semanas el club las marca como <strong>«Sin Fantasy»</strong> (por ejemplo, cuando solo juegan uno o dos equipos): esa semana no hay jornada ni cuenta para los bloqueos. Lo verás en el <strong>Calendario</strong>, con el rival y la posición de cada equipo.</li>
            <li><strong>¿Quién se puede fichar?</strong> Los jugadores de los equipos que tienen estadísticas de la Federació en cada partido ({[...new Set([...liga.jugadores.values()].map((j) => j.equipo))].sort().join(", ")}). Los equipos de CEEB, minibásquet y los que no tienen estadísticas no salen porque no hay datos para puntuar.</li>
          </ul>
        </Acordeon>
        <Acordeon titulo="🏀 Puntuación (estadísticas de la FCBQ)">
          <table className="w-full"><tbody className="divide-y divide-[var(--fx-borde)]">
            {tabla.map(([i, a, b]) => <tr key={a}><td className="w-8 py-1.5 text-center">{i}</td><td className="py-1.5">{a}</td><td className={`py-1.5 text-right font-bold ${b.startsWith("−") ? "text-red-300" : "text-green-300"}`}>{b}</td></tr>)}
          </tbody></table>
          <p className="mt-2 fx-suave">Los puntos salen en cuanto entran las estadísticas de cada partido. Cada jornada puede tener un <strong>partido de la jornada</strong>: los jugadores de ese partido puntúan ×1,5.</p>
        </Acordeon>
        <Acordeon titulo="📋 Dúo técnico">
          <p>Además de los jugadores, cada jornada fichas a <strong>un dúo técnico</strong>: el cuerpo técnico de un equipo. Puntúa con el resultado de su partido:</p>
          <table className="mt-2 w-full"><tbody className="divide-y divide-[var(--fx-borde)]">
            {[["Victoria", "+4"], ["Derrota", "−1"], ["Por cada 5 puntos de diferencia (ganando o perdiendo)", "±1 (máx. ±4)"], ["Ganar a un rival mejor clasificado", "+2"]]
              .map(([a, b]) => <tr key={a}><td className="py-1.5">{a}</td><td className={`py-1.5 text-right font-bold ${b.startsWith("−") ? "text-red-300" : "text-green-300"}`}>{b}</td></tr>)}
          </tbody></table>
          <p className="mt-2 fx-suave">Cuesta de 3 a 8 ⭐ según sus últimos resultados, es obligatorio, no puede ser capitán y, como los jugadores, queda bloqueado la jornada siguiente. Si es el partido de la jornada, también puntúa ×1,5.</p>
        </Acordeon>
        <Acordeon titulo="📈 Mercado y fichas">
          <ul className="list-disc space-y-1 pl-5">
            <li>Toca cualquier jugador o dúo en el <strong>Mercado</strong> para ver su ficha <strong>tipo bolsa</strong>: cómo ha subido o bajado su precio, sus puntos jornada a jornada, sus partidos y cuánta gente lo tiene fichado.</li>
            <li>Mientras haces el equipo se guarda un borrador en tu móvil; no cuenta hasta que pulsas <strong>Guardar</strong>.</li>
            <li>En <strong>Clasificación</strong> ves la general y la de cada jornada. Los equipos de los demás son <strong>secretos hasta el cierre de fichajes</strong>; a partir de ahí, se ven todos.</li>
            <li>👀 <strong>Espiar:</strong> durante los fichajes puedes ver el equipo de otro mánager por <strong>{COSTE_ESPIA} ⭐</strong> de tu presupuesto de esa jornada (en Clasificación → Por jornada). Lo verás hasta el cierre aunque lo cambie, y el espiado no se entera.</li>
            <li>Hay <strong>30 insignias</strong> que se ganan solas a lo largo de la temporada (mira cómo conseguir cada una en <strong>Insignias</strong>).</li>
          </ul>
        </Acordeon>
        <Acordeon titulo="🃏 Comodines">
          <ul className="space-y-1">{(Object.keys(COMODINES) as Comodin[]).map((c) => <li key={c}><strong className="text-[var(--fx-oro)]">{COMODINES[c].nombre}:</strong> {COMODINES[c].texto}</li>)}</ul>
          <p className="mt-2 fx-suave">Cada uno se puede usar una vez por temporada, y solo uno por jornada.</p>
        </Acordeon>
        <Acordeon titulo="🔔 Chat y avisos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Escribe <strong>@</strong> y el nombre de un equipo para mencionarlo: le llega un aviso.</li>
            <li>Toca 😊 en cualquier mensaje para <strong>reaccionar</strong> (👍🔥😂😮👏😢).</li>
            <li>Para <strong>responder</strong> a un mensaje, toca ↩ o desliza el mensaje hacia la derecha (como en WhatsApp).</li>
            <li>Con 📷 puedes enviar <strong>fotos</strong> desde el móvil (hasta 15 al día). Nada de fotos de otras personas sin su permiso.</li>
            <li><strong>@all</strong> avisa a todos los participantes. Úsalo para cosas importantes: cada persona puede usarlo <strong>una vez cada 12 horas</strong>.</li>
            <li>Si activas los avisos (en tu perfil) te llegan: un recordatorio el <strong>viernes</strong> y otro <strong>2 horas antes</strong> de que se cierren los fichajes si aún no has hecho equipo, <strong>tus puntos</strong> el lunes, <strong>insignias nuevas</strong>, menciones y un <strong>resumen del chat</strong> por la noche si hay 3 mensajes o más sin leer.</li>
          </ul>
        </Acordeon>
        <Acordeon titulo="💬 Normas del chat">
          <ul className="list-disc space-y-1 pl-5">
            <li>No abuses de <strong>@all</strong>: los avisos a todos, solo para cosas que interesen a todos.</li>
            <li>Si alguien se pasa, el administrador puede mandarle un <strong>aviso</strong> o <strong>silenciarle en el chat</strong> unas horas, unos días o indefinidamente.</li>
            <li>Respeto siempre: <strong>sin insultos</strong>, sin burlas ni comentarios ofensivos.</li>
            <li>No se habla mal de jugadores, entrenadores, familias, árbitros ni rivales.</li>
            <li>No compartas datos personales (teléfonos, direcciones…) ni fotos de otras personas.</li>
            <li>Habla del juego, de los partidos y anima al club 💪.</li>
          </ul>
          <p className="mt-2 fx-suave">El club puede borrar mensajes y silenciar o dar de baja a quien no cumpla las normas.</p>
        </Acordeon>
      </div>
    );
  }

  return (
    <Marco perfil={!!q.perfil} esAdmin={q.esAdmin} vista={vista === "jugador" ? "mercado" : vista === "manager" || vista === "resumen" ? "clasificacion" : vista} temporada={temporada}>
      {cuerpo}
      <Celebracion pid={`${yo.id}-${q.config.inicio}`} temporada={temporada} campeon={campeon}
        insignias={INSIGNIAS.filter((x) => misInsignias.has(x.codigo)).map(({ codigo, nombre, texto, img }) => ({ codigo, nombre, texto, img }))} />
    </Marco>
  );
}
