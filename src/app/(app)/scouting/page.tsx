import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { calcularClasificacion, type ResultadoLiga } from "@/lib/fcbq";
import { media, mismoEquipo, pct, resumenEquipo, type StatsPartido } from "@/lib/stats-fcbq";
import { esTuro, puedeVerScouting } from "@/lib/scouting";
import { fechaCorta } from "@/lib/fechas";
import SinEquipo from "@/components/SinEquipo";
import ActualizarFCBQ from "../partidos/importar/ActualizarFCBQ";
import { Binoculars, Lock, NotebookPen } from "lucide-react";

export default async function ScoutingPage() {
  const { supabase, user, perfil } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) return <SinEquipo que="su scouting" />;
  if (!(await puedeVerScouting(supabase, equipo, user.id, perfil.rol))) {
    return (
      <div className="tarjeta mx-auto mt-8 max-w-lg p-6 text-center">
        <Lock className="mx-auto text-tinta/40" />
        <p className="mt-2 font-semibold">El scouting de {equipo.nombre} solo lo ve su cuerpo técnico.</p>
        <p className="mt-1 text-sm text-tinta/60">Elige arriba uno de tus equipos.</p>
      </div>
    );
  }

  const [{ data: liga }, { data: filas, error }, { data: fichas }, { data: proximo }, { data: eqFcbq }] = await Promise.all([
    supabase.from("ligas_fcbq").select("nombre, resultados").eq("equipo_id", equipo.id).maybeSingle(),
    supabase.from("fcbq_stats").select("datos").eq("equipo_id", equipo.id),
    supabase.from("scouting_rivales").select("nombre, notas, caracteristicas").eq("equipo_id", equipo.id),
    supabase.from("partidos").select("fecha, rival, local").eq("equipo_id", equipo.id).neq("estado", "jugado").gte("fecha", new Date(Date.now() - 3 * 3600e3).toISOString()).order("fecha").limit(1).maybeSingle(),
    supabase.from("equipos").select("id, nombre, fcbq_nombre").eq("temporada_id", equipo.temporada_id).order("nombre"),
  ]);
  const faltaSQL = error && /fcbq_stats|scouting/.test(error.message);
  const stats = ((filas ?? []) as { datos: StatsPartido }[]).map((f) => f.datos);
  const resultados = ((liga?.resultados ?? []) as ResultadoLiga[]);
  const clasif = calcularClasificacion(resultados);

  // Todos los equipos de la liga (de los resultados y de las estadísticas)
  const nombres = [...new Set([...clasif.map((c) => c.equipo), ...stats.flatMap((s) => [s.local.nombre, s.visitante.nombre])])];
  const equiposLiga = nombres.map((nombre) => {
    const c = clasif.find((x) => mismoEquipo(x.equipo, nombre));
    const r = resumenEquipo(nombre, stats).equipo;
    const ficha = (fichas ?? []).find((f) => mismoEquipo(f.nombre, nombre));
    return { nombre, c, r, ficha: !!ficha && (!!ficha.notas || Object.keys(ficha.caracteristicas ?? {}).length > 0) };
  }).sort((a, b) => (b.c?.pts ?? 0) - (a.c?.pts ?? 0) || ((b.c ? b.c.pf - b.c.pc : 0) - (a.c ? a.c.pf - a.c.pc : 0)));
  const rivalProximo = proximo ? equiposLiga.find((e) => mismoEquipo(e.nombre, proximo.rival)) : null;
  const url = (n: string) => `/scouting/equipo?nombre=${encodeURIComponent(n)}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Binoculars className="text-azul" /> Scouting</h1>
          <p className="text-sm text-tinta/60">{equipo.nombre}{liga?.nombre ? ` · ${liga.nombre}` : ""} · solo lo ve el cuerpo técnico del equipo</p>
        </div>
        <ActualizarFCBQ equipos={eqFcbq ?? []} />
      </div>

      {faltaSQL && (
        <p className="tarjeta mt-4 p-3 text-sm text-red-700">Falta crear las tablas de scouting: ejecuta <code>0006_scouting.sql</code> en el SQL Editor de Supabase.</p>
      )}

      {proximo && (
        <Link href={url(rivalProximo?.nombre ?? proximo.rival)} className="tarjeta mt-5 flex items-center gap-4 border-l-4 !border-l-rojo p-4 transition hover:shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wide text-rojo">Próximo rival</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{proximo.rival}</div>
            <div className="text-xs capitalize text-tinta/60">{fechaCorta(proximo.fecha)} · {proximo.local ? "en casa" : "fuera"}</div>
          </div>
          <span className="text-sm font-medium text-azul">Ver scouting →</span>
        </Link>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Equipos de la liga</h2>
      {equiposLiga.length === 0 ? (
        <p className="tarjeta mt-2 p-4 text-sm text-tinta/60">
          Aún no hay datos de la liga. Pulsa <strong>Actualizar desde la FCBQ</strong>: trae los resultados, la clasificación y las estadísticas de cada partido (puntos, triples, tiros libres, faltas y minutos de cada jugador).
        </p>
      ) : (
        <div className="tarjeta mt-2 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-suave text-xs uppercase tracking-wide text-tinta/60">
              <tr>
                <th className="px-2 py-2 text-left">Equipo</th>
                <th className="px-2 py-2 text-center">PJ</th><th className="px-2 py-2 text-center">V-D</th>
                <th className="px-2 py-2 text-center" title="Puntos a favor por partido">PF</th><th className="px-2 py-2 text-center" title="Puntos en contra por partido">PC</th>
                <th className="hidden px-2 py-2 text-center sm:table-cell" title="Triples por partido">T3</th>
                <th className="hidden px-2 py-2 text-center sm:table-cell" title="% de tiros libres">TL%</th>
                <th className="hidden px-2 py-2 text-center sm:table-cell" title="Faltas por partido">Faltas</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {equiposLiga.map(({ nombre, c, r, ficha }) => (
                <tr key={nombre} className={`border-t border-linea ${esTuro(nombre) ? "bg-azul/10 font-semibold text-azul" : ""}`}>
                  <td className="px-2 py-1.5"><Link href={url(nombre)} className="hover:underline">{nombre}</Link></td>
                  <td className="px-2 py-1.5 text-center">{c?.pj ?? r.pj}</td>
                  <td className="px-2 py-1.5 text-center">{c ? `${c.g}-${c.p}` : `${r.g}-${r.p}`}</td>
                  <td className="px-2 py-1.5 text-center">{c ? media(c.pf, c.pj) : media(r.pf, r.pj)}</td>
                  <td className="px-2 py-1.5 text-center">{c ? media(c.pc, c.pj) : media(r.pc, r.pj)}</td>
                  <td className="hidden px-2 py-1.5 text-center sm:table-cell">{media(r.t3, r.pj)}</td>
                  <td className="hidden px-2 py-1.5 text-center sm:table-cell">{pct(r.tlm, r.tla)}</td>
                  <td className="hidden px-2 py-1.5 text-center sm:table-cell">{media(r.fc, r.pj)}</td>
                  <td className="px-2 py-1.5 text-right">{ficha && <NotebookPen size={14} className="inline text-oro" aria-label="Tiene ficha" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-tinta/50">
        PJ, V-D, PF y PC salen de los resultados; T3, TL% y faltas, de las estadísticas de la FCBQ ({stats.length} partidos descargados). La FCBQ no da los tiros de 2 y de 3 intentados, solo los anotados.
      </p>
    </div>
  );
}
