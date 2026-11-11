import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { VAPID_PUBLICO } from "@/lib/notificar";
import AvisosFantasy from "./Avisos";
import InstalarFantasy from "./Instalar";
import "./fantasy.css";
import { cargarClasificaciones, cargarLiga, posicion, quienSoy } from "@/lib/fantasy/datos";
import { colorEquipo, sigla } from "@/lib/fantasy/estilo";
import { COMODINES, INSIGNIAS, PRESUPUESTO, nombreJornada, type Comodin, type Nivel } from "@/lib/fantasy/motor";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { diaInput, fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import { CalendarDays, ChevronDown, Lock, Star } from "lucide-react";
import Alta from "./Alta";
import Fichajes, { type DuoMercado, type JugadorMercado } from "./Fichajes";
import Chat from "./Chat";
import Celebracion from "./Celebracion";
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
  const vista = ["equipo", "mercado", "clasificacion", "jornada", "calendario", "insignias", "reglas", "jugador"].includes(sp.v ?? "") ? sp.v! : "equipo";
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
        rival: rivalDe(j.equipoId, l),
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
            comodinesUsados={Object.fromEntries(Object.entries(yo.comodines ?? {}).filter(([, v]) => v !== l)) as Partial<Record<Comodin, string>>} presupuesto={PRESUPUESTO} />
        ) : <Cerrado />}
        {enJuego && alJuego && resJuego && <MiJornada duos={liga.duos} titulo={`${nombreJornada(q.config.inicio, enJuego, q.config.anuladas)} · en juego`} res={resJuego} al={alJuego} jugador={jug} />}
        {enJuego && !alJuego && <p className="fx-card p-3 text-center text-sm fx-suave">No fichaste equipo para esta jornada.</p>}
        {l && ant && alAnt && resAnt && <MiJornada duos={liga.duos} titulo={`${nombreJornada(q.config.inicio, ant, q.config.anuladas)} · terminada`} res={resAnt} al={alAnt} jugador={jug} />}
      </div>
    );
  }

  if (vista === "mercado") {
    const l = liga.abierta;
    cuerpo = l ? (
      <Fichajes modo="mercado" jornada={l} nombre={nombreJornada(q.config.inicio, l, q.config.anuladas)} cierre={liga.cierre(l)} mercado={mercadoDe(l)} duos={duosDe(l)}
        actual={(() => { const al = liga.alineacion(yo.id, l); return al ? { titulares: al.titulares.map((t) => t.id), suplente: al.suplente?.id ?? null, capitan: al.capitan, comodin: (al.comodin as Comodin | null) ?? null, duo: al.duo?.id ?? null } : null; })()}
        comodinesUsados={{}} presupuesto={PRESUPUESTO} />
    ) : <Cerrado />;
  }

  if (vista === "clasificacion") {
    const porJornada = sp.t === "jornada";
    // También la jornada que se está fichando: se ven los equipos de los demás antes del cierre
    const chips = [...new Set([...liga.cerradas, ...(liga.abierta ? [liga.abierta] : [])])].sort();
    const jSel = sp.j && chips.includes(sp.j) ? sp.j : (liga.abierta ?? liga.cerradas[liga.cerradas.length - 1]);
    const enCurso = !!jSel && jSel === liga.abierta;
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
              {general.map((g, i) => <Fila key={g.id} pos={i + 1} id={g.id} d={<span className="w-8 text-center text-sm fx-suave">{g.jornadas}</span>}>{pts(g.total)}</Fila>)}
              {!general.length && <p className="p-3 text-sm fx-suave">Aún no hay nadie.</p>}
            </section>
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
                <p className="text-sm fx-suave">Equipos fichados para la {nombreJornada(q.config.inicio, jSel, q.config.anuladas).toLowerCase()} (se pueden cambiar hasta el cierre).</p>
                <section className="fx-card fx-sep overflow-hidden">
                  {participantes.filter((p) => liga.alineacion(p.id, jSel)).map((p) => {
                    const al = liga.alineacion(p.id, jSel)!;
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
                <p className="text-center text-xs fx-suave">Toca un equipo para ver a quién ha fichado.</p>
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
        <Chat jornada={jSel} esAdmin={q.esAdmin} silenciado={yo.silenciado} equipos={participantes.filter((p) => p.id !== yo.id).map((p) => p.alias)} />
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
        <Acordeon titulo="🃏 Comodines">
          <ul className="space-y-1">{(Object.keys(COMODINES) as Comodin[]).map((c) => <li key={c}><strong className="text-[var(--fx-oro)]">{COMODINES[c].nombre}:</strong> {COMODINES[c].texto}</li>)}</ul>
          <p className="mt-2 fx-suave">Cada uno se puede usar una vez por temporada, y solo uno por jornada.</p>
        </Acordeon>
        <Acordeon titulo="💬 Normas del chat">
          <ul className="list-disc space-y-1 pl-5">
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
    <Marco perfil={!!q.perfil} esAdmin={q.esAdmin} vista={vista} temporada={temporada}>
      {cuerpo}
      <Celebracion pid={`${yo.id}-${q.config.inicio}`} temporada={temporada} campeon={campeon}
        insignias={INSIGNIAS.filter((x) => misInsignias.has(x.codigo)).map(({ codigo, nombre, texto, img }) => ({ codigo, nombre, texto, img }))} />
    </Marco>
  );
}
