import { requireUser } from "@/lib/supabase/server";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { todas } from "@/lib/db";
import { crearXlsx, type Celda, type Hoja } from "@/lib/xlsx";
import { diaInput, hora } from "@/lib/fechas";
import type { StatsPartido } from "@/lib/stats-fcbq";

export const dynamic = "force-dynamic";

const r1 = (n: number) => Math.round(n * 10) / 10;
const pc = (a: number, b: number) => (b ? Math.round((a * 1000) / b) / 10 : null);
const ESTADOS = ["presente", "tarde", "justificado", "lesionado", "ausente"] as const;

/** Exportar a Excel: estadísticas, partidos y asistencia de un equipo (o de todo el club, para coordinación) */
export async function GET(req: Request) {
  const { supabase, perfil } = await requireUser();
  const q = new URL(req.url).searchParams.get("equipo") ?? "";
  const { equipos, temporada } = await equiposDeTemporada(supabase);
  const club = q === "todos";
  if (club && perfil.rol !== "coordinador") return new Response("Solo coordinación", { status: 403 });
  const lista = club ? equipos : equipos.filter((e) => e.id === q);
  if (!lista.length) return new Response("Equipo no encontrado", { status: 404 });
  if (!club && perfil.rol !== "coordinador") {
    const { data: st } = await supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", q).eq("perfil_id", perfil.id).maybeSingle();
    if (!st) return new Response("Solo el cuerpo técnico del equipo", { status: 403 });
  }
  const ids = lista.map((e) => e.id);
  const nombreEq = new Map(lista.map((e) => [e.id, e.nombre as string]));
  const ahora = new Date().toISOString();

  const [{ data: pts }, { data: stats }, { data: plant }, { data: ents }, { data: asis }] = await Promise.all([
    supabase.from("partidos").select("equipo_id, fecha, rival, local, competicion, jornada, puntos_favor, puntos_contra, estado").in("equipo_id", ids).order("fecha"),
    todas((a, b) => supabase.from("fcbq_stats").select("equipo_id, datos").in("equipo_id", ids).or("local.ilike.%tur%,visitante.ilike.%tur%").order("fecha").range(a, b)),
    supabase.from("equipo_jugadores").select("equipo_id, dorsal, jugadores(id, nombre, apellidos)").in("equipo_id", ids),
    supabase.from("entrenamientos").select("id, equipo_id, fecha").in("equipo_id", ids).is("anulado_motivo", null).lte("fecha", ahora).order("fecha"),
    todas((a, b) => supabase.from("asistencias").select("entrenamiento_id, jugador_id, estado, motivo, entrenamientos!inner(equipo_id, fecha)").in("entrenamientos.equipo_id", ids).order("entrenamiento_id").order("jugador_id").range(a, b)),
  ]);
  const conEq = (f: Celda[], eq: string) => (club ? [nombreEq.get(eq) ?? "", ...f] : f);
  const cab = (f: string[]) => (club ? ["Equipo", ...f] : f);

  // Partidos
  const hPartidos: Hoja = { nombre: "Partidos", filas: [cab(["Fecha", "Hora", "Rival", "Dónde", "Competición", "Jornada", "Nosotros", "Rival", "Resultado"])] };
  for (const p of (pts ?? []) as { equipo_id: string; fecha: string; rival: string; local: boolean; competicion: string | null; jornada: number | null; puntos_favor: number | null; puntos_contra: number | null; estado: string | null }[]) {
    const res = p.estado === "aplazado" ? "Aplazado" : p.puntos_favor === null || p.puntos_contra === null ? "" : p.puntos_favor > p.puntos_contra ? "Victoria" : p.puntos_favor < p.puntos_contra ? "Derrota" : "Empate";
    hPartidos.filas.push(conEq([diaInput(p.fecha), hora(p.fecha), p.rival, p.local ? "Casa" : "Fuera", p.competicion, p.jornada, p.puntos_favor, p.puntos_contra, res], p.equipo_id));
  }

  // Estadísticas por jugador (FCBQ)
  type Acum = { eq: string; nombre: string; dorsal: string; pj: number; tit: number; seg: number; pts: number; t2: number; t3: number; tlm: number; tla: number; fc: number; mm: number };
  const acum = new Map<string, Acum>();
  for (const f of (stats ?? []) as { equipo_id: string; datos: StatsPartido }[]) {
    const st = f.datos; if (!st?.local) continue;
    const yo = /TUR[OÓ]/i.test(st.local.nombre) ? st.local : /TUR[OÓ]/i.test(st.visitante.nombre) ? st.visitante : null;
    if (!yo) continue;
    for (const j of yo.jugadores) {
      if (!j.seg) continue;
      const k = `${f.equipo_id}|${j.uuid ?? j.nombre}`;
      const a = acum.get(k) ?? { eq: f.equipo_id, nombre: j.nombre, dorsal: j.dorsal, pj: 0, tit: 0, seg: 0, pts: 0, t2: 0, t3: 0, tlm: 0, tla: 0, fc: 0, mm: 0 };
      a.pj++; if (j.titular) a.tit++; a.seg += j.seg; a.pts += j.pts; a.t2 += j.t2; a.t3 += j.t3; a.tlm += j.tlm; a.tla += j.tla; a.fc += j.fc; a.mm += j.mm;
      acum.set(k, a);
    }
  }
  const hStats: Hoja = { nombre: "Estadísticas", filas: [cab(["Jugador", "Dorsal", "PJ", "Titular", "Minutos", "Min/PJ", "Puntos", "Pts/PJ", "T2", "T3", "TL anot.", "TL int.", "% TL", "Faltas", "Faltas/PJ", "+/-", "+/- por PJ"])] };
  for (const a of [...acum.values()].sort((x, y) => (nombreEq.get(x.eq) ?? "").localeCompare(nombreEq.get(y.eq) ?? "") || y.pts - x.pts)) {
    hStats.filas.push(conEq([a.nombre, a.dorsal, a.pj, a.tit, Math.round(a.seg / 60), r1(a.seg / 60 / a.pj), a.pts, r1(a.pts / a.pj), a.t2, a.t3, a.tlm, a.tla, pc(a.tlm, a.tla), a.fc, r1(a.fc / a.pj), a.mm, r1(a.mm / a.pj)], a.eq));
  }

  // Asistencia
  const nombreJ = new Map<string, string>();
  for (const x of (plant ?? []) as unknown as { equipo_id: string; dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } | null }[])
    if (x.jugadores) nombreJ.set(`${x.equipo_id}|${x.jugadores.id}`, `${x.jugadores.nombre} ${x.jugadores.apellidos ?? ""}`.trim());
  const filasA = (asis ?? []) as unknown as { entrenamiento_id: string; jugador_id: string; estado: string; motivo: string | null; entrenamientos: { equipo_id: string; fecha: string } }[];
  const porJ = new Map<string, Record<string, number>>();
  for (const a of filasA) {
    const k = `${a.entrenamientos.equipo_id}|${a.jugador_id}`;
    const c = porJ.get(k) ?? {}; c[a.estado] = (c[a.estado] ?? 0) + 1; porJ.set(k, c);
  }
  const hAsis: Hoja = { nombre: "Asistencia", filas: [cab(["Jugador", "Entrenos con lista", "Presente", "Tarde", "Justificado", "Lesionado", "Ausente", "% asistencia"])] };
  for (const [k, nom] of [...nombreJ.entries()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))) {
    const c = porJ.get(k) ?? {};
    const tot = ESTADOS.reduce((s, e) => s + (c[e] ?? 0), 0);
    const base = tot - (c.justificado ?? 0);
    hAsis.filas.push(conEq([nom, tot, ...ESTADOS.map((e) => c[e] ?? 0), pc((c.presente ?? 0) + (c.tarde ?? 0), base)], k.split("|")[0]));
  }
  const NOMBRE_ESTADO: Record<string, string> = { presente: "Presente", tarde: "Tarde", justificado: "Justificado", lesionado: "Lesionado", ausente: "Ausente" };
  const hDet: Hoja = { nombre: "Asistencia detalle", filas: [cab(["Fecha", "Jugador", "Estado", "Motivo"])] };
  for (const a of [...filasA].sort((x, y) => x.entrenamientos.fecha.localeCompare(y.entrenamientos.fecha))) {
    const eq = a.entrenamientos.equipo_id;
    hDet.filas.push(conEq([diaInput(a.entrenamientos.fecha), nombreJ.get(`${eq}|${a.jugador_id}`) ?? "", NOMBRE_ESTADO[a.estado] ?? a.estado, a.motivo], eq));
  }
  const hEnt: Hoja = { nombre: "Entrenos", filas: [cab(["Fecha", "Hora", "Con lista"])] };
  const conLista = new Set(filasA.map((a) => a.entrenamiento_id));
  for (const e of (ents ?? []) as { id: string; equipo_id: string; fecha: string }[]) hEnt.filas.push(conEq([diaInput(e.fecha), hora(e.fecha), conLista.has(e.id) ? "Sí" : "No"], e.equipo_id));

  const xlsx = crearXlsx([hStats, hPartidos, hAsis, hDet, hEnt]);
  const base = (club ? "CB Turo - club" : `CB Turo - ${lista[0].nombre}`).replace(/[^\w .-]+/g, "");
  const archivo = `${base} - ${(temporada?.nombre ?? "temporada").replace(/[^\w-]+/g, "-")}.xlsx`;
  return new Response(xlsx as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
