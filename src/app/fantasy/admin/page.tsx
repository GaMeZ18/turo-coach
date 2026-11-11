import Link from "next/link";
import "../fantasy.css";
import { Escudo } from "../ui";
import { redirect } from "next/navigation";
import { cargarClasificaciones, cargarLiga, db, posicion, quienSoy } from "@/lib/fantasy/datos";
import { nombreJornada } from "@/lib/fantasy/motor";
import { aISO, diaInput, fechaCorta, hora } from "@/lib/fechas";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { Interruptor, Premio, Inicio, Especial, Anular, Silenciar, Borrar, CerrarTemporada, CopiarEnlace, QuitarFoto, Prueba, NombreDuo } from "./Controles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fantasy · Administrar", robots: { index: false } };

export default async function AdminFantasy() {
  const q = await quienSoy();
  if (!q.esAdmin) redirect("/fantasy");
  const { liga, participantes, partidos, equipos } = await cargarLiga(q.config);
  const clas = await cargarClasificaciones();
  const { data: ult } = await db().from("fcbq_stats").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const nombreEq = new Map(equipos.map((e) => [e.id, e.nombre]));
  // Todas las semanas de la temporada: desde el inicio hasta la del último partido del calendario (como mínimo 10 semanas)
  const ultimo = partidos.filter((p) => liga.pool.has(p.equipo_id)).map((p) => p.fecha).sort().pop();
  const hasta = ultimo && lunesDe(diaInput(ultimo)) > sumarDias(liga.lunesHoy, 70) ? lunesDe(diaInput(ultimo)) : sumarDias(liga.lunesHoy, 70);
  const jornadas: string[] = [];
  for (let l = lunesDe(q.config.inicio); l <= hasta; l = sumarDias(l, 7)) jornadas.push(l);
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

        <section className="fx-card space-y-2 p-4">
          <h2 className="font-semibold">📋 Dúos técnicos</h2>
          <p className="text-xs text-white/60">El nombre que sale en el Fantasy para el cuerpo técnico de cada equipo. Cámbialo cuando cambie el entrenador.</p>
          {[...liga.duos.values()].sort((a, b) => a.equipo.localeCompare(b.equipo)).map((d) => (
            <NombreDuo key={d.id} equipoId={d.equipoId} equipo={d.equipo} valor={q.config.duos[d.equipoId] ?? ""} />
          ))}
        </section>

        <section className="fx-card space-y-2 p-4">
          <h2 className="font-semibold">🔄 Cargar puntos</h2>
          <p className="text-xs text-white/60">Trae las estadísticas de la FCBQ (lo mismo que «Actualizar desde la FCBQ» en Partidos). Necesita la extensión instalada en el ordenador. Los coordinadores también lo ven.</p>
          <a href="/partidos/importar?auto=1" target="_blank" rel="noopener" className="fx-btn w-full">🔄 Cargar puntos Fantasy</a>
        </section>

        <section className="fx-card space-y-2 p-4">
          <h2 className="font-semibold">🧪 Jornada de prueba</h2>
          <p className="text-xs text-white/60">Crea 4 equipos automáticos y te pone uno a ti con los partidos de la semana pasada, para ver puntos, clasificación, quinteto ideal, chat e insignias funcionando con datos reales. Luego se borra todo con un botón.</p>
          <Prueba activa={!!q.config.prueba} jornada={q.config.prueba?.jornada ?? null} />
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
          <p className="px-4 pt-2 text-xs text-white/60">Elige el <strong>partido de la jornada</strong> (el que quieras, uno por jornada): sus jugadores puntúan ×1,5. Marca <strong>«Sin Fantasy»</strong> las semanas con pocos partidos (o si hubo algún problema): esa semana no se ficha ni se puntúa, no cuenta en la numeración y el bloqueo de jugadores pasa a la siguiente.</p>
          <ul className="divide-y divide-[var(--fx-borde)]">
            {jornadas.map((l) => {
              const ini = aISO(l, "00:00"), fin = aISO(sumarDias(l, 7), "00:00");
              const ps = partidos.filter((p) => liga.pool.has(p.equipo_id) && p.fecha >= ini && p.fecha < fin).sort((a, b) => a.fecha.localeCompare(b.fecha));
              const sin = q.config.anuladas.includes(l);
              const equiposQueJuegan = new Set(ps.map((p) => p.equipo_id)).size;
              return (
                <li key={l} className={`px-4 py-3 text-sm ${sin ? "bg-white/5 opacity-70" : ""} ${l === liga.lunesHoy ? "border-l-4 border-[var(--fx-oro)]" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{sin ? "🚫 Sin Fantasy" : nombreJornada(q.config.inicio, l, q.config.anuladas)}</span>
                    <span className="text-xs text-white/60">semana del {fechaCorta(`${l}T12:00:00Z`)} · {ps.length} {ps.length === 1 ? "partido" : "partidos"} de {equiposQueJuegan} {equiposQueJuegan === 1 ? "equipo" : "equipos"}{!sin && ps.length > 0 ? ` · cierre ${fechaCorta(liga.cierre(l))} ${hora(liga.cierre(l))}` : ""}{(liga.porJornada.get(l) ?? []).length ? ` · ${(liga.porJornada.get(l) ?? []).length} equipos fantasy` : ""}</span>
                    {equiposQueJuegan > 0 && equiposQueJuegan <= 2 && !sin && <span className="rounded bg-amber-900/60 px-1.5 text-[10px] font-bold text-amber-100">POCOS PARTIDOS</span>}
                    <span className="ml-auto"><Anular lunes={l} anulada={sin} /></span>
                  </div>
                  {sin ? null : ps.length === 0 ? <p className="text-xs text-white/50">Sin partidos.</p> : (
                    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                      {ps.map((p) => (
                        <li key={p.id}><Especial lunes={l} partidoId={p.id} activo={(q.config.especiales[l] ?? []).includes(p.id)} texto={`${nombreEq.get(p.equipo_id) ?? ""}${posicion(clas.get(p.equipo_id), null, true) ? ` (${posicion(clas.get(p.equipo_id), null, true)!.pos}º)` : ""} ${p.local ? "vs" : "@"} ${p.rival ?? "?"}${posicion(clas.get(p.equipo_id), p.rival) ? ` (${posicion(clas.get(p.equipo_id), p.rival)!.pos}º)` : ""} · ${fechaCorta(p.fecha)} ${hora(p.fecha)}`} /></li>
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
