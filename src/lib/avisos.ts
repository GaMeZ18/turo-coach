import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aISO, fechaCorta, hora, hoyLocal } from "./fechas";
import { lunesDe, sumarDias } from "./pistas";
import { companerosMesa, detalleMesa, partidosDeCasa } from "./mesas";
import { notificarPerfiles, notificarPersonasMesa } from "./notificar";
import { validarAlineacion } from "./minibasquet";

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
  const { data: entR } = await db.from("entrenamientos").select("id, equipo_id, fecha, duracion_prevista").is("anulado_motivo", null)
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

  // 0) A la hora de empezar el entreno → «pasa lista», que abre directamente la asistencia
  for (const e of entrenos) {
    if (ahora < inicio(e) || ahora > inicio(e) + 30 * MIN || conLista.has(e.id) || !staff(e.equipo_id).length) continue;
    await unaVez(`pasalista:${e.id}`, () => notificarPerfiles(db, staff(e.equipo_id),
      `📋 Pasa lista · ${nombre(e.equipo_id)}`, `Empieza el entreno de las ${hora(e.fecha)}. Toca aquí para marcar quién ha venido.`, `/entrenamientos/${e.id}#asistencia`, e.equipo_id, true));
  }

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

  // 4) Miércoles a las 15:00 (al cerrarse las inscripciones) → gestor de mesas: cuánta gente falta esta semana
  if (diaSemana === 3 && horaLocal >= 15) {
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

  // 6) Minibàsquet: 3 horas antes del partido, si la alineación falta o no cumple la normativa del CEEB → entrenadores
  const { data: miniR } = await db.from("equipos").select("id").eq("temporada_id", t.id).eq("minibasquet", true);
  const mini = ((miniR ?? []) as { id: string }[]).map((e) => e.id);
  if (mini.length) {
    const { data: ppR } = await db.from("partidos").select("id, equipo_id, fecha, rival").in("equipo_id", mini)
      .gte("fecha", new Date(ahora).toISOString()).lt("fecha", new Date(ahora + 180 * MIN).toISOString());
    for (const pt of (ppR ?? []) as { id: string; equipo_id: string; fecha: string; rival: string }[]) {
      if (!staff(pt.equipo_id).length) continue;
      const [{ data: cv }, { data: pe }] = await Promise.all([
        db.from("convocatorias").select("jugador_id, jugadores(nombre, apellidos)").eq("partido_id", pt.id),
        db.from("partido_periodos").select("jugador_id, periodos").eq("partido_id", pt.id),
      ]);
      const js = ((cv ?? []) as unknown as { jugador_id: string; jugadores: { nombre: string; apellidos: string | null } | null }[])
        .map((c) => ({ id: c.jugador_id, nombre: `${c.jugadores?.nombre ?? ""} ${c.jugadores?.apellidos ?? ""}`.trim() }));
      const marcas = Object.fromEntries(((pe ?? []) as { jugador_id: string; periodos: number[] }[]).map((x) => [x.jugador_id, x.periodos ?? []]));
      const errores = validarAlineacion(js, marcas).filter((a) => a.nivel === "error");
      if (!errores.length) continue;
      const vacia = !Object.keys(marcas).length;
      await unaVez(`alineacion:${pt.id}`, () => notificarPerfiles(db, staff(pt.equipo_id),
        vacia ? "Falta la alineación del partido" : "La alineación no cumple la normativa",
        `${nombre(pt.equipo_id)} vs ${pt.rival} a las ${hora(pt.fecha)}. ${vacia ? "Marca la convocatoria y los períodos." : errores.slice(0, 2).map((e) => e.texto).join(" ")}`,
        `/partidos/${pt.id}`, pt.equipo_id));
    }
  }

  // 7) Día antes del partido (a partir de las 19:00) → entrenadores del equipo: rival, hora y lugar
  if (horaLocal >= 19) {
    const manana = sumarDias(hoy, 1);
    const { data: pmR } = await db.from("partidos").select("id, equipo_id, fecha, rival, local, lugar")
      .in("equipo_id", ids).gte("fecha", aISO(manana, "00:00")).lt("fecha", aISO(sumarDias(manana, 1), "00:00"));
    for (const pt of (pmR ?? []) as { id: string; equipo_id: string; fecha: string; rival: string; local: boolean; lugar: string | null }[]) {
      if (!staff(pt.equipo_id).length) continue;
      await unaVez(`partidomanana:${pt.id}`, () => notificarPerfiles(db, staff(pt.equipo_id),
        `🏀 Mañana tenéis partido · ${nombre(pt.equipo_id)}`,
        `vs ${pt.rival} (${pt.local ? "en casa" : "fuera"}) · ${fechaCorta(pt.fecha)} a las ${hora(pt.fecha)}\n📍 ${pt.lugar || "Pista por confirmar"}\nToca para ver el partido, la convocatoria y cómo llegar.`,
        `/partidos/${pt.id}`, pt.equipo_id, true));
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
      await unaVez(`mesa1h:${a.id}`, async () => notificarPersonasMesa(db, [a.persona_id], `Hoy haces la mesa de ${p.equipo} a las ${hora(p.fecha)}`,
        `${detalleMesa(p, await companerosMesa(db, p.id, a.persona_id))}\n¡Gracias por echar una mano!`, cfg?.token ? `/apuntarse-mesa/${cfg.token}/mesa/${a.id}` : "/"));
    }
  }

  // 8) Fantasy Turó: viernes «haz tu equipo», 2 h antes del cierre, lunes «tus puntos», insignias nuevas y resumen del chat
  try {
    const { leerConfig, cargarLiga, ADMIN_FANTASY } = await import("./fantasy/datos");
    const { nombreJornada, INSIGNIAS } = await import("./fantasy/motor");
    const { notificarFantasy } = await import("./notificar");
    const cfg = await leerConfig();
    const { liga, participantes } = await cargarLiga(cfg);
    const activos = participantes.filter((p) => cfg.abierto || p.perfil_id === ADMIN_FANTASY);
    const ya = new Date(ahora).toISOString();
    const l = liga.abierta, cierre = l ? liga.cierre(l) : "";
    // Viernes desde las 19:00: a quien aún no tiene equipo
    if (diaSemana === 5 && horaLocal >= 19 && l && cierre > ya && !cfg.cerrada) {
      for (const p of activos) {
        if (liga.alineacion(p.id, l)) continue;
        await unaVez(`fantasy-equipo:${l}:${p.id}`, () => notificarFantasy(db, [p], "🏆 Fantasy: ¡haz tu equipo!",
          `${nombreJornada(cfg.inicio, l, cfg.anuladas)}: los fichajes cierran el ${fechaCorta(cierre)} a las ${hora(cierre)}. Tienes 54 ⭐.`, "/fantasy"));
      }
    }
    // 2 horas antes del cierre: último aviso a quien aún no tiene equipo
    if (l && cierre > ya && Date.parse(cierre) - ahora <= 2 * 3600e3 && !cfg.cerrada) {
      for (const p of activos) {
        if (liga.alineacion(p.id, l)) continue;
        await unaVez(`fantasy-2h:${l}:${p.id}`, () => notificarFantasy(db, [p], "⏰ Fantasy: ¡quedan menos de 2 horas!",
          `Los fichajes de la ${nombreJornada(cfg.inicio, l, cfg.anuladas).toLowerCase()} cierran a las ${hora(cierre)} y aún no tienes equipo.`, "/fantasy"));
      }
    }
    // Lunes desde las 12:00: puntos de la jornada que acaba de terminar
    if (diaSemana === 1 && horaLocal >= 12) {
      const t = liga.terminadas[liga.terminadas.length - 1];
      const ranking = t ? liga.porJornada.get(t) ?? [] : [];
      for (const p of activos) {
        const r = ranking.find((x) => x.id === p.id);
        if (!t || !r) continue;
        const pos = liga.general.findIndex((g) => g.id === p.id) + 1;
        await unaVez(`fantasy-puntos:${t}:${p.id}`, () => notificarFantasy(db, [p], `🏆 Fantasy: ${r.total.toLocaleString("es-ES")} puntos`,
          `${nombreJornada(cfg.inicio, t, cfg.anuladas)}: quedaste ${r.pos}º de ${ranking.length}. En la general vas ${pos}º. ¡Ya puedes fichar para la próxima!`, "/fantasy?v=clasificacion"));
      }
    }
    // Insignias nuevas (en cuanto se consiguen; se apuntan para no repetir el aviso)
    const { data: avisadas } = await db.from("fantasy_insignias_avisadas").select("participante_id, codigo");
    const hechas = new Set((avisadas ?? []).map((a) => `${a.participante_id}|${a.codigo}`));
    for (const p of activos) {
      const nuevas = INSIGNIAS.filter((x) => liga.insignias(p.id).has(x.codigo) && !hechas.has(`${p.id}|${x.codigo}`));
      if (!nuevas.length) continue;
      const { error } = await db.from("fantasy_insignias_avisadas").insert(nuevas.map((x) => ({ participante_id: p.id, codigo: x.codigo })));
      if (error) continue;
      await notificarFantasy(db, [p],
        nuevas.length === 1 ? `🏅 ¡Has conseguido «${nuevas[0].nombre}»!` : `🏅 ¡Has conseguido ${nuevas.length} insignias!`,
        nuevas.length === 1 ? nuevas[0].texto : nuevas.map((x) => x.nombre).join(", "),
        nuevas.length === 1 ? `/fantasy?v=insignias&i=${nuevas[0].codigo}` : "/fantasy?v=insignias");
    }
    // Resumen del chat (20:00): solo si hay 3 mensajes o más de otros que aún no has visto
    if (horaLocal >= 20) {
      const desde = new Date(ahora - 24 * 3600e3).toISOString();
      const { data: msgs } = await db.from("fantasy_mensajes").select("participante_id, created_at").eq("borrado", false).gte("created_at", desde);
      const { data: vistos } = await db.from("fantasy_participantes").select("id, chat_visto");
      const visto = new Map((vistos ?? []).map((v) => [v.id as string, (v.chat_visto as string | null) ?? desde]));
      for (const p of activos) {
        const n = (msgs ?? []).filter((m) => m.participante_id !== p.id && (m.created_at as string) > (visto.get(p.id) ?? desde)).length;
        if (n < 3) continue;
        await unaVez(`fantasy-chat:${hoy}:${p.id}`, () => notificarFantasy(db, [p], "💬 Fantasy: mensajes nuevos en el chat", `Hay ${n} mensajes nuevos en el chat de la jornada.`, "/fantasy?v=jornada"));
      }
    }
  } catch { /* el fantasy no debe romper el resto de avisos */ }

  return { enviados };
}
