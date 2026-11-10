import Link from "next/link";
import type { Metadata } from "next";
import { cargarLiga, quienSoy } from "@/lib/fantasy/datos";
import { COMODINES, INSIGNIAS, PRESUPUESTO, nombreJornada, type Comodin } from "@/lib/fantasy/motor";
import { sumarDias } from "@/lib/pistas";
import { fechaCorta, hora } from "@/lib/fechas";
import { Trophy, Users, MessageCircle, Award, BookOpen, Settings } from "lucide-react";
import Alta from "./Alta";
import Fichajes, { type JugadorMercado } from "./Fichajes";
import Chat from "./Chat";
import { Pts, MiJornada } from "./Piezas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fantasy Turó", description: "La liga fantasy del CB Turó de la Peira", robots: { index: false },
  openGraph: { title: "Fantasy Turó", description: "Ficha a 5 jugadores del club cada jornada y suma puntos con sus estadísticas", images: [{ url: "https://coach.cbturo.com/insignias/29-campeon-del-turo.png" }] },
};

const VISTAS = [
  { v: "equipo", t: "Mi equipo", i: Users },
  { v: "clasificacion", t: "Clasificación", i: Trophy },
  { v: "jornada", t: "Jornada", i: MessageCircle },
  { v: "insignias", t: "Insignias", i: Award },
  { v: "reglas", t: "Reglas", i: BookOpen },
] as const;

function Marco({ children, perfil, esAdmin, vista, conMenu }: { children: React.ReactNode; perfil: boolean; esAdmin: boolean; vista?: string; conMenu: boolean }) {
  return (
    <div className="min-h-dvh bg-suave">
      <header className="sticky top-0 z-20 bg-azul text-white shadow" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <img src="/icons/icon-192.png" alt="CB Turó" className="h-9 w-9 rounded-lg" />
          <div className="flex-1 leading-tight">
            <p className="font-[family-name:var(--font-escudo)] text-lg tracking-wide">Fantasy Turó</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-oro">CB Turó de la Peira</p>
          </div>
          {esAdmin && <Link href="/fantasy/admin" className="rounded-lg p-1.5 hover:bg-white/10" title="Administrar"><Settings size={20} /></Link>}
          {perfil && <Link href="/" className="text-xs text-white/80 hover:underline">← App</Link>}
        </div>
        {conMenu && (
          <nav className="mx-auto flex max-w-4xl overflow-x-auto px-2 pb-1 text-sm [scrollbar-width:none]">
            {VISTAS.map(({ v, t, i: I }) => (
              <Link key={v} href={`/fantasy?v=${v}`} className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${vista === v ? "bg-white/15 text-white" : "text-white/70 hover:text-white"}`}><I size={15} /> {t}</Link>
            ))}
          </nav>
        )}
        <div className="filete" />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5">{children}</main>
    </div>
  );
}

export default async function FantasyPage({ searchParams }: { searchParams: Promise<{ v?: string; j?: string }> }) {
  const sp = await searchParams;
  const q = await quienSoy();
  if (!q.acceso) {
    return (
      <Marco perfil={!!q.perfil} esAdmin={false} conMenu={false}>
        <div className="tarjeta mx-auto max-w-md p-6 text-center">
          <img src="/insignias/29-campeon-del-turo.png" alt="" className="mx-auto h-28 w-28" />
          <h1 className="mt-2 text-xl font-bold">Fantasy Turó</h1>
          <p className="mt-1 text-sm text-tinta/60">¡Muy pronto! Ficha a jugadores del club cada jornada, suma puntos con sus estadísticas y gana premios del Turó.</p>
        </div>
      </Marco>
    );
  }
  if (!q.participante) {
    return (
      <Marco perfil={!!q.perfil} esAdmin={q.esAdmin} conMenu={false}>
        <Alta staff={q.perfil ? { nombre: q.perfil.nombre ?? "" } : null} abiertoPublico={q.config.abierto} premio={q.config.premio} />
      </Marco>
    );
  }

  const yo = q.participante;
  const { liga, participantes, partidos, equipos } = await cargarLiga(q.config);
  const vista = VISTAS.some((x) => x.v === sp.v) ? sp.v! : "equipo";
  const alias = new Map(participantes.map((p) => [p.id, p.alias]));
  const nombreJ = (id: string) => liga.jugadores.get(id)?.nombre ?? "?";
  const equipoJ = (id: string) => liga.jugadores.get(id)?.equipo ?? "";
  const general = liga.general;
  const miPos = general.findIndex((x) => x.id === yo.id) + 1;
  const miTotal = general.find((x) => x.id === yo.id)?.total ?? 0;

  let cuerpo: React.ReactNode = null;

  if (vista === "equipo") {
    const l = liga.abierta;
    const pr = liga.precio(l), prAntes = liga.precio(sumarDias(l, -7));
    const ultima = liga.terminadas[liga.terminadas.length - 1] ?? sumarDias(l, -7);
    const semUlt = liga.semana(ultima);
    const desc = liga.descansan(l), bloq = liga.bloqueados(yo.id, l);
    const mercado: JugadorMercado[] = [...liga.jugadores.values()].map((j) => {
      const p = pr.get(j.id)!, a = prAntes.get(j.id);
      return {
        id: j.id, persona: j.persona, nombre: j.nombre, dorsal: j.dorsal, equipo: j.equipo, equipoId: j.equipoId, chica: j.chica,
        precio: p.precio, media: p.media, pj: p.pj, tendencia: a ? Math.sign(p.precio - a.precio) : 0,
        ultimo: semUlt.get(j.id)?.jugo ? semUlt.get(j.id)!.puntos : null, descansa: desc.has(j.equipoId), bloqueado: bloq.has(j.persona),
      };
    });
    const al = liga.alineacion(yo.id, l);
    const enJuego = liga.enJuego;
    const resJuego = enJuego ? liga.resultados.get(`${yo.id}|${enJuego}`) : undefined;
    const alJuego = enJuego ? liga.alineacion(yo.id, enJuego) : undefined;
    cuerpo = (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="tarjeta p-3"><p className="text-2xl font-bold">{miPos || "–"}<span className="text-sm font-normal text-tinta/50">/{general.length}</span></p><p className="text-xs text-tinta/60">posición</p></div>
          <div className="tarjeta p-3"><p className="text-2xl font-bold"><Pts v={miTotal} /></p><p className="text-xs text-tinta/60">puntos</p></div>
          <div className="tarjeta p-3"><p className="truncate text-base font-bold">{yo.alias}</p><p className="text-xs text-tinta/60">tu equipo</p></div>
        </div>
        {enJuego && alJuego && resJuego && (
          <MiJornada titulo={`${nombreJornada(q.config.inicio, enJuego)} · en juego`} res={resJuego} al={alJuego} nombre={nombreJ} equipo={equipoJ} />
        )}
        <Fichajes
          jornada={l} nombre={nombreJornada(q.config.inicio, l)} cierre={liga.cierre(l)} mercado={mercado}
          actual={al ? { titulares: al.titulares.map((t) => t.id), suplente: al.suplente?.id ?? null, capitan: al.capitan, comodin: (al.comodin as Comodin | null) ?? null } : null}
          comodinesUsados={Object.fromEntries(Object.entries(yo.comodines ?? {}).filter(([, v]) => v !== l)) as Partial<Record<Comodin, string>>}
          presupuesto={PRESUPUESTO} cerrada={q.config.cerrada}
        />
      </div>
    );
  }

  if (vista === "clasificacion") {
    const jSel = sp.j && liga.cerradas.includes(sp.j) ? sp.j : liga.cerradas[liga.cerradas.length - 1];
    const ranking = jSel ? liga.porJornada.get(jSel) ?? [] : [];
    cuerpo = (
      <div className="space-y-4">
        <section className="tarjeta overflow-hidden">
          <h2 className="border-b border-linea px-3 py-2 font-semibold">Clasificación general</h2>
          {general.length === 0 ? <p className="p-3 text-sm text-tinta/60">Aún no hay nadie.</p> : (
            <ol className="divide-y divide-linea">
              {general.map((g, i) => (
                <li key={g.id} className={`flex items-center gap-3 px-3 py-2 ${g.id === yo.id ? "bg-oro/15" : ""}`}>
                  <span className="w-6 text-center font-bold tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{g.alias}{q.config.campeon === g.id && " 🏆"}</span>
                  <span className="text-xs text-tinta/50">{g.jornadas} j.</span>
                  <span className="w-16 text-right font-bold tabular-nums"><Pts v={g.total} /></span>
                </li>
              ))}
            </ol>
          )}
        </section>
        {liga.cerradas.length > 0 && jSel && (
          <section className="tarjeta overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-linea px-3 py-2">
              <h2 className="font-semibold">Por jornada</h2>
              <div className="ml-auto flex flex-wrap gap-1">
                {liga.cerradas.map((l) => (
                  <Link key={l} href={`/fantasy?v=clasificacion&j=${l}`} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${l === jSel ? "bg-azul text-white" : "bg-suave"}`}>{nombreJornada(q.config.inicio, l).replace("Jornada ", "J")}</Link>
                ))}
              </div>
            </div>
            {q.config.anuladas.includes(jSel) && <p className="px-3 py-2 text-sm text-amber-700">Jornada anulada: no cuenta para la clasificación.</p>}
            <ol className="divide-y divide-linea">
              {participantes.filter((p) => liga.alineacion(p.id, jSel)).sort((a, b) => (liga.resultados.get(`${b.id}|${jSel}`)?.total ?? 0) - (liga.resultados.get(`${a.id}|${jSel}`)?.total ?? 0)).map((p) => {
                const r = liga.resultados.get(`${p.id}|${jSel}`)!;
                const al = liga.alineacion(p.id, jSel)!;
                const pos = ranking.find((x) => x.id === p.id)?.pos;
                return (
                  <li key={p.id}>
                    <details>
                      <summary className={`flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden ${p.id === yo.id ? "bg-oro/15" : ""}`}>
                        <span className="w-6 text-center font-bold">{pos ?? "–"}</span>
                        <span className="min-w-0 flex-1 truncate">{p.alias}{al.comodin && <span className="ml-1 rounded bg-azul/10 px-1 text-[10px] font-semibold text-azul">{COMODINES[al.comodin as Comodin].nombre}</span>}</span>
                        <span className="text-xs text-tinta/50">{al.coste} ⭐</span>
                        <span className="w-14 text-right font-bold tabular-nums"><Pts v={r.total} /></span>
                      </summary>
                      <div className="px-3 pb-3"><MiJornada res={r} al={al} nombre={nombreJ} equipo={equipoJ} compacto /></div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    );
  }

  if (vista === "jornada") {
    const opciones = [...new Set([...liga.cerradas, liga.abierta])].sort();
    const jSel = sp.j && opciones.includes(sp.j) ? sp.j : (liga.enJuego ?? liga.cerradas[liga.cerradas.length - 1] ?? liga.abierta);
    const jugada = liga.cerradas.includes(jSel);
    const ideal = jugada ? liga.ideal(jSel) : [];
    const gg = jugada ? liga.ganga(jSel) : null;
    const rev = liga.revelacion(jSel);
    const esp = (q.config.especiales[jSel] ?? []).map((id) => partidos.find((p) => p.id === id)).filter(Boolean) as typeof partidos;
    cuerpo = (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {opciones.map((l) => (
            <Link key={l} href={`/fantasy?v=jornada&j=${l}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${l === jSel ? "bg-azul text-white" : "bg-white"}`}>{nombreJornada(q.config.inicio, l)}</Link>
          ))}
        </div>
        <section className="tarjeta p-3 text-sm">
          <h2 className="font-semibold">{nombreJornada(q.config.inicio, jSel)} · del {fechaCorta(`${jSel}T12:00:00Z`)} al {fechaCorta(`${sumarDias(jSel, 6)}T12:00:00Z`)}</h2>
          <p className="text-tinta/60">{jugada ? (liga.enJuego === jSel ? "En juego: los puntos se suman en cuanto entran las estadísticas de cada partido." : "Terminada.") : `Fichajes abiertos hasta el ${fechaCorta(liga.cierre(jSel))} a las ${hora(liga.cierre(jSel))}.`}</p>
          {esp.length > 0 && <p className="mt-1 font-semibold text-rojo">🔥 Jornada especial: {esp.map((p) => `${equipos.find((e) => e.id === p.equipo_id)?.nombre ?? ""} (${fechaCorta(p.fecha)})`).join(", ")} puntúa ×1,5</p>}
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          {gg && (
            <section className="tarjeta p-3">
              <h3 className="text-xs font-bold uppercase text-amber-700">💎 Ganga de la semana</h3>
              <p className="mt-1 font-semibold">{nombreJ(gg.id)} <span className="text-xs font-normal text-tinta/60">{equipoJ(gg.id)}</span></p>
              <p className="text-sm"><Pts v={gg.puntos} /> puntos por solo {gg.precio} ⭐</p>
            </section>
          )}
          {rev && (
            <section className="tarjeta p-3">
              <h3 className="text-xs font-bold uppercase text-green-700">🚀 Revelación del mes</h3>
              <p className="mt-1 font-semibold">{nombreJ(rev.id)} <span className="text-xs font-normal text-tinta/60">{equipoJ(rev.id)}</span></p>
              <p className="text-sm">Ha pasado de {rev.antes} ⭐ a {rev.ahora} ⭐</p>
            </section>
          )}
        </div>
        {ideal.length > 0 && (
          <section className="tarjeta p-3">
            <h3 className="font-semibold">⭐ Quinteto ideal</h3>
            <ol className="mt-1 divide-y divide-linea text-sm">
              {ideal.map((x) => <li key={x.id} className="flex justify-between py-1.5"><span>{nombreJ(x.id)} <span className="text-xs text-tinta/50">{equipoJ(x.id)}</span></span><span className="font-bold"><Pts v={x.puntos} /></span></li>)}
            </ol>
          </section>
        )}
        <Chat jornada={jSel} esAdmin={q.esAdmin} silenciado={yo.silenciado} />
      </div>
    );
  }

  if (vista === "insignias") {
    const mias = liga.insignias(yo.id);
    const todos = participantes.map((p) => liga.insignias(p.id));
    const nivel = { facil: "Fáciles", media: "Medias", dificil: "Difíciles", legendaria: "Legendarias" } as const;
    cuerpo = (
      <div className="space-y-5">
        <p className="text-sm text-tinta/70">Llevas <strong>{mias.size}</strong> de {INSIGNIAS.length}. Toca una para ver cómo se consigue.</p>
        {(Object.keys(nivel) as (keyof typeof nivel)[]).map((n) => (
          <section key={n}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-tinta/60">{nivel[n]}</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {INSIGNIAS.filter((x) => x.nivel === n).map((x) => {
                const tengo = mias.has(x.codigo);
                const cuantos = todos.filter((m) => m.has(x.codigo)).length;
                return (
                  <details key={x.codigo} className="group text-center">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <img src={x.img} alt={x.nombre} className={`mx-auto aspect-square w-full max-w-28 ${tengo ? "" : "opacity-30 grayscale"}`} loading="lazy" />
                      <p className={`mt-1 text-xs font-semibold ${tengo ? "" : "text-tinta/40"}`}>{x.nombre}</p>
                    </summary>
                    <p className="mt-1 rounded-lg bg-white p-2 text-[11px] leading-snug text-tinta/70 shadow-sm">
                      {x.texto}{tengo && mias.get(x.codigo) ? <><br /><strong className="text-green-700">Conseguida en {nombreJornada(q.config.inicio, mias.get(x.codigo)!)}</strong></> : tengo ? <><br /><strong className="text-green-700">¡Conseguida!</strong></> : null}
                      <br /><span className="text-tinta/45">La tiene{cuantos === 1 ? "" : "n"} {cuantos} {cuantos === 1 ? "participante" : "participantes"}</span>
                    </p>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (vista === "reglas") {
    cuerpo = (
      <article className="tarjeta space-y-4 p-4 text-sm leading-relaxed">
        <h1 className="text-xl font-bold">Reglas del Fantasy Turó</h1>
        {q.config.premio && <p className="rounded-lg bg-oro/20 p-3 font-semibold">🏆 Premio para el campeón: {q.config.premio}</p>}
        <section><h2 className="font-semibold">Cada jornada</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Una jornada es cada semana (de lunes a domingo). Fichas hasta que empieza el primer partido del fin de semana.</li>
            <li>Tienes <strong>{PRESUPUESTO} ⭐</strong> para fichar <strong>5 titulares y 1 suplente</strong>. Los jugadores cuestan entre 4 y 15 ⭐ según cómo vienen jugando (últimas 4 jornadas). El precio no cambia durante la semana.</li>
            <li>Máximo <strong>2 titulares del mismo equipo</strong>.</li>
            <li>Eliges un <strong>capitán</strong>: sus puntos cuentan doble.</li>
            <li>El <strong>suplente</strong> entra solo si un titular no juega.</li>
            <li>Quien fiches una jornada queda <strong>bloqueado la siguiente</strong> (el suplente, solo si llegó a entrar). ¡Toca rotar!</li>
            <li>Si alguien juega en dos equipos, eliges con cuál puntúa.</li>
            <li>Los equipos que descansan esa jornada salen marcados al fichar.</li>
          </ul>
        </section>
        <section><h2 className="font-semibold">Puntos (de las estadísticas de la FCBQ)</h2>
          <table className="mt-1 w-full text-left text-sm"><tbody className="divide-y divide-linea">
            {[["Cada punto anotado", "+0,5"], ["Triple", "+0,5 extra"], ["Tiro libre anotado / fallado", "+0,25 / −0,5"], ["Cada 5 minutos en pista", "+1"], ["Titular", "+1"],
              ["+/- con él en pista", "÷ 4 (entre −6 y +6)"], ["Victoria de su equipo", "+1"], ["Faltas a partir de la 3ª", "−0,5 cada una"], ["Eliminado por 5 faltas", "−2"], ["Mínimo por jugador y jornada", "−5"]]
              .map(([a, b]) => <tr key={a}><td className="py-1">{a}</td><td className="py-1 text-right font-semibold">{b}</td></tr>)}
          </tbody></table>
          <p className="mt-1 text-tinta/60">Los puntos aparecen en cuanto entran las estadísticas de cada partido. En jornadas especiales (derbis), ese partido puntúa ×1,5.</p>
        </section>
        <section><h2 className="font-semibold">Comodines (uno de cada por temporada)</h2>
          <ul className="list-disc space-y-1 pl-5">{(Object.keys(COMODINES) as Comodin[]).map((c) => <li key={c}><strong>{COMODINES[c].nombre}</strong>: {COMODINES[c].texto}</li>)}</ul>
        </section>
        <section><h2 className="font-semibold">Chat</h2><p>Respeto siempre. El club puede borrar mensajes y silenciar a quien no cumpla.</p></section>
      </article>
    );
  }

  return <Marco perfil={!!q.perfil} esAdmin={q.esAdmin} vista={vista} conMenu>{cuerpo}</Marco>;
}
