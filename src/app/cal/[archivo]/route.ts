// Calendario para suscribirse (iPhone, Android/Google, Outlook): /cal/<token>.ics
// Es público a propósito (los calendarios no pueden iniciar sesión): solo lo abre quien tiene el enlace secreto.
import { adminClient } from "@/lib/supabase/admin";
import { generarICS, type EventoICS } from "@/lib/ical";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const token = (await params).archivo.replace(/\.ics$/i, "");
  const db = adminClient();
  if (!db || !/^[a-f0-9]{32,80}$/.test(token)) return new Response("No encontrado", { status: 404 });

  const { data: enlace } = await db.from("calendario_enlaces").select("alcance, equipo_id, perfil_id, perfiles(rol, nombre)").eq("token", token).maybeSingle();
  if (!enlace) return new Response("Este enlace de calendario ya no existe.", { status: 404 });
  const perfil = enlace.perfiles as unknown as { rol: string; nombre: string | null } | null;

  const { data: temporada } = await db.from("temporadas").select("id").eq("actual", true).maybeSingle();
  const { data: equiposTemp } = temporada ? await db.from("equipos").select("id, nombre").eq("temporada_id", temporada.id) : { data: [] };
  const todos = (equiposTemp ?? []) as { id: string; nombre: string }[];
  let equipos = todos;
  if (enlace.alcance === "equipo") equipos = todos.filter((e) => e.id === enlace.equipo_id);
  else if (enlace.alcance === "mios" && perfil?.rol !== "coordinador") {
    const { data: staff } = await db.from("equipo_staff").select("equipo_id").eq("perfil_id", enlace.perfil_id);
    const mios = new Set((staff ?? []).map((s) => s.equipo_id as string));
    equipos = todos.filter((e) => mios.has(e.id));
  }
  const ids = equipos.length ? equipos.map((e) => e.id) : ["00000000-0000-0000-0000-000000000000"];
  const nombreDe = (id: string | null) => equipos.find((e) => e.id === id)?.nombre ?? "";
  const varios = equipos.length > 1;

  const desde = new Date(Date.now() - 90 * 86400000).toISOString();
  const hasta = new Date(Date.now() + 400 * 86400000).toISOString();
  const origen = new URL(req.url).origin;

  const [entrenos, partidos, eventos] = await Promise.all([
    enlace.alcance === "club" ? Promise.resolve({ data: [] }) :
      db.from("entrenamientos").select("id, equipo_id, fecha, titulo, duracion_prevista, lugar, notas").in("equipo_id", ids).gte("fecha", desde).lt("fecha", hasta),
    db.from("partidos").select("id, equipo_id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado").in("equipo_id", ids).gte("fecha", desde).lt("fecha", hasta),
    db.from("eventos").select("id, equipo_id, fecha, titulo, tipo, lugar, descripcion").or(`equipo_id.is.null,equipo_id.in.(${ids.join(",")})`).gte("fecha", desde).lt("fecha", hasta),
  ]);

  const lista: EventoICS[] = [];
  for (const e of (entrenos.data ?? []) as { id: string; equipo_id: string; fecha: string; titulo: string | null; duracion_prevista: number; lugar: string | null; notas: string | null }[]) {
    lista.push({
      uid: `entreno-${e.id}`, inicio: e.fecha, minutos: e.duracion_prevista || 90,
      titulo: `🏀 Entreno${varios ? ` ${nombreDe(e.equipo_id)}` : ""}${e.titulo ? ` · ${e.titulo}` : ""}`,
      lugar: e.lugar, descripcion: e.notas, url: `${origen}/entrenamientos/${e.id}`,
    });
  }
  for (const p of (partidos.data ?? []) as { id: string; equipo_id: string; fecha: string; rival: string; local: boolean; lugar: string | null; competicion: string | null; jornada: number | null; puntos_favor: number | null; puntos_contra: number | null; estado: string }[]) {
    const res = p.puntos_favor !== null && p.puntos_contra !== null ? ` (${p.puntos_favor}-${p.puntos_contra})` : "";
    const aplazado = /aplaz|suspend|cancel/i.test(p.estado ?? "");
    lista.push({
      uid: `partido-${p.id}`, inicio: p.fecha, minutos: 105,
      titulo: `🆚 ${nombreDe(p.equipo_id) || "Partido"} ${p.local ? "vs" : "@"} ${p.rival}${res}${aplazado ? " · APLAZADO" : ""}`,
      lugar: p.lugar, cancelado: aplazado,
      descripcion: [p.competicion, p.jornada ? `Jornada ${p.jornada}` : null, p.local ? "En casa" : "Fuera"].filter(Boolean).join(" · "),
      url: `${origen}/partidos/${p.id}`,
    });
  }
  for (const v of (eventos.data ?? []) as { id: string; equipo_id: string | null; fecha: string; titulo: string; tipo: string | null; lugar: string | null; descripcion: string | null }[]) {
    lista.push({
      uid: `evento-${v.id}`, inicio: v.fecha, minutos: 60,
      titulo: `📌 ${v.titulo}${varios && v.equipo_id ? ` (${nombreDe(v.equipo_id)})` : ""}`,
      lugar: v.lugar, descripcion: v.descripcion, url: `${origen}/calendario`,
    });
  }

  const nombre = enlace.alcance === "club" ? "CB Turó · Partidos del club"
    : enlace.alcance === "equipo" ? `CB Turó · ${equipos[0]?.nombre ?? "Equipo"}`
    : "CB Turó · Mis equipos";
  return new Response(generarICS(nombre, lista), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="cbturo.ics"`,
      "Cache-Control": "public, max-age=900",
    },
  });
}
