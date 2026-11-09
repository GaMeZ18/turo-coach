import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aISO, fechaCorta, hora, hoyLocal } from "./fechas";
import { lunesDe, sumarDias } from "./pistas";
import { partidosDeCasa } from "./mesas";
import { notificarPerfiles, notificarPersonasMesa } from "./notificar";

// Recordatorios automáticos (Supabase llama a /api/avisos cada 15 minutos).
// Cada aviso tiene una clave: si ya se mandó, no se repite aunque se vuelva a lanzar.

type Entreno = { id: string; equipo_id: string; fecha: string; duracion_prevista: number | null };

export async function enviarAvisos(db: SupabaseClient, hoy = hoyLocal()) {
  const enviados: string[] = [];
  const unaVez = async (clave: string, enviar: () => Promise<void>) => {
    const { error } = await db.from("avisos_enviados").insert({ clave });
    if (error) return; // ya enviado (o falta la tabla)
    await enviar();
    enviados.push(clave);
  };

  const { data: t } = await db.from("temporadas").select("id").eq("actual", true).maybeSingle();
  if (!t) return { enviados };
  const [{ data: eqR }, { data: staffR }, { data: perfR }] = await Promise.all([
    db.from("equipos").select("id, nombre").eq("temporada_id", t.id),
    db.from("equipo_staff").select("equipo_id, perfil_id"),
    db.from("perfiles").select("id, rol, gestor_mesas"),
  ]);
  const equipos = (eqR ?? []) as { id: string; nombre: string }[];
  if (!equipos.length) return { enviados };
  const nombre = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "Equipo";
  const staff = (eq: string) => ((staffR ?? []) as { equipo_id: string; perfil_id: string }[]).filter((s) => s.equipo_id === eq).map((s) => s.perfil_id);
  const perfiles = (perfR ?? []) as { id: string; rol: string; gestor_mesas: boolean | null }[];
  const coordinadores = perfiles.filter((p) => p.rol === "coordinador").map((p) => p.id);
  // Mesas: al gestor de mesas (si no hay ninguno, a coordinación)
  const soloGestores = perfiles.filter((p) => p.rol === "gestor_mesas" || p.gestor_mesas).map((p) => p.id);
  const gestores = soloGestores.length ? soloGestores : coordinadores;
  const ids = equipos.map((e) => e.id);
  const ahora = Date.now();
  const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay(); // 0 domingo … 4 jueves, 5 viernes
  const horaLocal = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(new Date(ahora)));
  const MIN = 60000;

  // Entrenos desde el domingo anterior hasta dentro de 3 horas
  const lunes = lunesDe(hoy);
  const { data: entR } = await db.from("entrenamientos").select("id, equipo_id, fecha, duracion_prevista")
    .in("equipo_id", ids).gte("fecha", aISO(sumarDias(lunes, -1), "00:00")).lt("fecha", new Date(ahora + 180 * MIN).toISOString()).order("fecha");
  const entrenos = (entR ?? []) as Entreno[];
  const entIds = entrenos.map((e) => e.id);
  const [{ data: asisR }, { data: actR }] = entIds.length
    ? await Promise.all([
        db.from("asistencias").select("entrenamiento_id").in("entrenamiento_id", entIds),
        db.from("entreno_actividades").select("entrenamiento_id").in("entrenamiento_id", entIds),
      ])
    : [{ data: [] }, { data: [] }];
  const conLista = new Set(((asisR ?? []) as { entrenamiento_id: string }[]).map((a) => a.entrenamiento_id));
  const montado = new Set(((actR ?? []) as { entrenamiento_id: string }[]).map((a) => a.entrenamiento_id));
  const inicio = (e: Entreno) => new Date(e.fecha).getTime();
  const fin = (e: Entreno) => inicio(e) + (e.duracion_prevista ?? 90) * MIN;

  // 1) 1 hora después de acabar el entreno, si no se ha pasado lista → entrenadores del equipo
  for (const e of entrenos) {
    if (ahora < fin(e) + 60 * MIN || ahora > fin(e) + 12 * 60 * MIN || conLista.has(e.id) || !staff(e.equipo_id).length) continue;
    await unaVez(`lista:${e.id}`, () => notificarPerfiles(db, staff(e.equipo_id),
      "Falta pasar lista", `${nombre(e.equipo_id)} · entreno de hoy a las ${hora(e.fecha)}`, `/entrenamientos/${e.id}`, e.equipo_id));
  }

  // 2) 2 horas antes de empezar, si el entreno está sin montar → entrenadores del equipo
  for (const e of entrenos) {
    if (ahora < inicio(e) - 120 * MIN || ahora >= inicio(e) || montado.has(e.id) || !staff(e.equipo_id).length) continue;
    await unaVez(`montar:${e.id}`, () => notificarPerfiles(db, staff(e.equipo_id),
      "Entreno sin montar", `${nombre(e.equipo_id)} · hoy a las ${hora(e.fecha)}. Añade los ejercicios.`, `/entrenamientos/${e.id}`, e.equipo_id));
  }

  // 3) Viernes por la noche → coordinadores: quién no ha montado entrenos o pasado lista esta semana
  if (diaSemana === 5 && horaLocal >= 21) {
    const semana = entrenos.filter((e) => e.fecha >= aISO(lunes, "00:00") && fin(e) <= ahora);
    const lineas = equipos.map((eq) => {
      const suyos = semana.filter((e) => e.equipo_id === eq.id);
      const sinMontar = suyos.filter((e) => !montado.has(e.id)).length, sinLista = suyos.filter((e) => !conLista.has(e.id)).length;
      if (!sinMontar && !sinLista) return null;
      return `${eq.nombre}: ${[sinMontar && `${sinMontar} sin montar`, sinLista && `${sinLista} sin lista`].filter(Boolean).join(", ")}`;
    }).filter(Boolean) as string[];
    await unaVez(`coordinacion:${lunes}`, () => notificarPerfiles(db, coordinadores,
      lineas.length ? `Resumen de la semana: ${lineas.length} equipo${lineas.length > 1 ? "s" : ""} con entrenos pendientes` : "Resumen de la semana: todo al día",
      lineas.length ? lineas.join(" · ") : "Todos los equipos han montado sus entrenos y pasado lista.", "/coordinacion/asistencia"));
  }

  // 4) Jueves por la noche → gestor de mesas: cuánta gente falta en las mesas del fin de semana
  if (diaSemana === 4 && horaLocal >= 21) {
    const partidos = (await partidosDeCasa(db, new Date(ahora).toISOString(), aISO(sumarDias(lunes, 7), "00:00"))).filter((p) => !p.federada);
    if (partidos.length) {
      const { data: aR } = await db.from("mesa_asignaciones").select("partido_id").eq("estado", "confirmado").in("partido_id", partidos.map((p) => p.id));
      const conf = (id: string) => ((aR ?? []) as { partido_id: string }[]).filter((a) => a.partido_id === id).length;
      const faltan = partidos.filter((p) => conf(p.id) < p.plazas);
      const personas = faltan.reduce((s, p) => s + p.plazas - conf(p.id), 0);
      await unaVez(`mesas:${lunes}`, () => notificarPerfiles(db, gestores,
        faltan.length ? `Faltan ${personas} persona${personas > 1 ? "s" : ""} para las mesas del finde` : "Mesas del finde completas",
        faltan.length ? faltan.map((p) => `${fechaCorta(p.fecha)} ${hora(p.fecha)} ${p.equipo} (${conf(p.id)}/${p.plazas})`).join(" · ") : `Las ${partidos.length} mesas tienen a su gente.`,
        `/mesas?semana=${lunes}`));
    }
  }

  // 5) 1 hora antes de cada partido → a quien hace la mesa (si activó los avisos desde el enlace)
  const enUnaHora = await partidosDeCasa(db, new Date(ahora).toISOString(), new Date(ahora + 65 * MIN).toISOString());
  if (enUnaHora.length) {
    const [{ data: aR }, { data: cfg }] = await Promise.all([
      db.from("mesa_asignaciones").select("id, partido_id, persona_id").eq("estado", "confirmado").in("partido_id", enUnaHora.map((p) => p.id)),
      db.from("mesa_config").select("token").maybeSingle(),
    ]);
    for (const a of (aR ?? []) as { id: string; partido_id: string; persona_id: string }[]) {
      const p = enUnaHora.find((x) => x.id === a.partido_id)!;
      await unaVez(`mesa1h:${a.id}`, () => notificarPersonasMesa(db, [a.persona_id], `Mesa a las ${hora(p.fecha)}`,
        `${p.equipo} vs ${p.rival}${p.lugar ? ` · ${p.lugar}` : ""}. ¡Gracias por echar una mano!`, cfg?.token ? `/apuntarse-mesa/${cfg.token}` : "/"));
    }
  }

  return { enviados };
}
