import Link from "next/link";
import "../fantasy.css";
import { Escudo } from "../ui";
import { redirect } from "next/navigation";
import { cargarLiga, db, quienSoy } from "@/lib/fantasy/datos";
import { nombreJornada } from "@/lib/fantasy/motor";
import { aISO, fechaCorta, hora } from "@/lib/fechas";
import { sumarDias } from "@/lib/pistas";
import { Interruptor, Premio, Inicio, Especial, Anular, Silenciar, Borrar, CerrarTemporada, CopiarEnlace, QuitarFoto } from "./Controles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fantasy · Administrar", robots: { index: false } };

export default async function AdminFantasy() {
  const q = await quienSoy();
  if (!q.esAdmin) redirect("/fantasy");
  const { liga, participantes, partidos, equipos } = await cargarLiga(q.config);
  const { data: ult } = await db().from("fcbq_stats").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const nombreEq = new Map(equipos.map((e) => [e.id, e.nombre]));
  const jornadas = [...new Set([...liga.cerradas, liga.lunesHoy, ...[7, 14, 21, 28].map((d) => sumarDias(liga.lunesHoy, d))])].sort().reverse();
  const totalDe = new Map(liga.general.map((g) => [g.id, g]));

  return (
    <div className="fx">
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5">
        <Link href="/fantasy" className="fx-btn-sec">← Fantasy</Link>
        <h1 className="fx-cab-rojo fx-display rounded-xl px-3 py-2 text-2xl">⚙️ Admin · Gestión</h1>

        <section className="fx-card space-y-3 p-4">
          <h2 className="font-semibold">Estado</h2>
          <Interruptor abierto={q.config.abierto} />
          <p className="text-xs text-white/60">{q.config.abierto ? "Abierto: cualquiera con el enlace puede apuntarse (el staff, con su cuenta; el resto, registrándose)." : "En pruebas: solo entras tú. Cuando lo abras, comparte el enlace."}</p>
          <CopiarEnlace url="https://coach.cbturo.com/fantasy" />
          <Premio valor={q.config.premio ?? ""} />
          <Inicio valor={q.config.inicio} />
          <p className="text-xs text-white/60">Últimas estadísticas cargadas de la FCBQ: <strong>{ult?.created_at ? `${fechaCorta(ult.created_at)} ${hora(ult.created_at)}` : "nunca"}</strong>. Los puntos salen en cuanto se cargan (botón «Actualizar desde la FCBQ» en Partidos).</p>
        </section>

        <section className="fx-card overflow-hidden">
          <h2 className="border-b border-[var(--fx-borde)] px-4 py-2 font-semibold">Participantes ({participantes.length})</h2>
          <ul className="divide-y divide-[var(--fx-borde)] text-sm">
            {participantes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <Escudo alias={p.alias} emoji={p.emoji} color={p.color} foto={p.foto} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.alias} <span className="text-xs font-normal text-white/60">({p.mostrar ?? "–"})</span></p>
                  <p className="text-xs text-white/60">{p.nombre} · {p.perfil_id ? "staff (cuenta de la app)" : p.contacto}</p>
                </div>
                {p.foto && <QuitarFoto id={p.id} />}
                <span className="text-xs text-white/60">{totalDe.get(p.id)?.jornadas ?? 0} j. · {totalDe.get(p.id)?.total ?? 0} pts</span>
                <Silenciar id={p.id} silenciado={p.silenciado} />
                <Borrar id={p.id} alias={p.alias} />
              </li>
            ))}
            {!participantes.length && <li className="px-4 py-3 text-white/60">Nadie todavía.</li>}
          </ul>
        </section>

        <section className="fx-card overflow-hidden">
          <h2 className="border-b border-[var(--fx-borde)] px-4 py-2 font-semibold">Jornadas</h2>
          <p className="px-4 pt-2 text-xs text-white/60">Marca un partido como <strong>especial</strong> (derbi) para que puntúe ×1,5. Anula una jornada si faltan estadísticas o hubo algún problema.</p>
          <ul className="divide-y divide-[var(--fx-borde)]">
            {jornadas.map((l) => {
              const ini = aISO(l, "00:00"), fin = aISO(sumarDias(l, 7), "00:00");
              const ps = partidos.filter((p) => liga.pool.has(p.equipo_id) && p.fecha >= ini && p.fecha < fin).sort((a, b) => a.fecha.localeCompare(b.fecha));
              const jugada = liga.cerradas.includes(l);
              return (
                <li key={l} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{nombreJornada(q.config.inicio, l)}</span>
                    <span className="text-xs text-white/60">{fechaCorta(`${l}T12:00:00Z`)} · cierre {fechaCorta(liga.cierre(l))} {hora(liga.cierre(l))} · {(liga.porJornada.get(l) ?? []).length} equipos fantasy</span>
                    {jugada && <span className="ml-auto"><Anular lunes={l} anulada={q.config.anuladas.includes(l)} /></span>}
                  </div>
                  {ps.length === 0 ? <p className="text-xs text-white/50">Sin partidos.</p> : (
                    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                      {ps.map((p) => (
                        <li key={p.id}><Especial lunes={l} partidoId={p.id} activo={(q.config.especiales[l] ?? []).includes(p.id)} texto={`${nombreEq.get(p.equipo_id) ?? ""} · ${fechaCorta(p.fecha)} ${hora(p.fecha)}`} /></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="fx-card space-y-2 p-4">
          <h2 className="font-semibold">Final de temporada</h2>
          <p className="text-xs text-white/60">Al cerrar, el primero de la general es el campeón: se le da la insignia «Campeón del Turó» (y «Incondicional» a quien jugó todas) y se publica en Noticias.</p>
          <CerrarTemporada cerrada={q.config.cerrada} lider={liga.general[0]?.alias ?? null} />
        </section>
      </main>
    </div>
  );
}
