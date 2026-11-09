import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aISO, fechaCorta, hora, hoyLocal } from "./fechas";
import { lunesDe, sumarDias } from "./pistas";
import { partidosDeCasa, POR_MESA } from "./mesas";
import { notificarPerfiles } from "./notificar";

// Recordatorios automáticos (se lanzan una vez al día desde /api/avisos).
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
  const gestores = perfiles.filter((p) => p.rol === "coordinador" || p.rol === "gestor_mesas" || p.gestor_mesas).map((p) => p.id);
  const ids = equipos.map((e) => e.id);
  const ahora = Date.now();
  const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay(); // 0 domingo … 4 jueves

  // Entrenos desde hace 3 días hasta el final de la semana
  const lunes = lunesDe(hoy);
  const { data: entR } = await db.from("entrenamientos").select("id, equipo_id, fecha, duracion_prevista")
    .in("equipo_id", ids).gte("fecha", aISO(sumarDias(hoy, -3), "00:00")).lt("fecha", aISO(sumarDias(lunes, 7), "00:00")).order("fecha");
  const entrenos = (entR ?? []) as Entreno[];
  const entIds = entrenos.map((e) => e.id);
  const [{ data: asisR }, { data: actR }] = entIds.length
    ? await Promise.all([
        db.from("asistencias").select("entrenamiento_id").in("entrenamiento_id", entIds),
        db.from("entreno_actividades").select("entrenamiento_id").in("entrenamiento_id", entIds),
      ])
    : [{ data: [] }, { data: [] }];
  const conLista = new Set(((asisR ?? []) as { entrenamiento_id: string }[]).map((a) => a.entrenamiento_id));
  const preparado = new Set(((actR ?? []) as { entrenamiento_id: string }[]).map((a) => a.entrenamiento_id));

  // 1) Entreno ya hecho sin pasar lista → al cuerpo técnico del equipo
  for (const e of entrenos) {
    const fin = new Date(e.fecha).getTime() + (e.duracion_prevista ?? 90) * 60000;
    if (fin > ahora || conLista.has(e.id) || !staff(e.equipo_id).length) continue;
    await unaVez(`lista:${e.id}`, () => notificarPerfiles(db, staff(e.equipo_id),
      "Falta pasar lista", `${nombre(e.equipo_id)} · entreno del ${fechaCorta(e.fecha)} a las ${hora(e.fecha)}`, `/entrenamientos/${e.id}`, e.equipo_id));
  }

  // 2) Entreno de mañana sin preparar → al cuerpo técnico del equipo
  const manana = sumarDias(hoy, 1);
  for (const e of entrenos) {
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(e.fecha));
    if (dia !== manana || preparado.has(e.id) || !staff(e.equipo_id).length) continue;
    await unaVez(`preparar:${e.id}`, () => notificarPerfiles(db, staff(e.equipo_id),
      "Entreno de mañana sin preparar", `${nombre(e.equipo_id)} · ${fechaCorta(e.fecha)} a las ${hora(e.fecha)}. Añade los ejercicios.`, `/entrenamientos/${e.id}`, e.equipo_id));
  }

  // 3) Lunes: a coordinación, los equipos con entrenos de esta semana sin preparar
  if (diaSemana === 1) {
    const deLaSemana = entrenos.filter((e) => e.fecha >= aISO(lunes, "00:00") && !preparado.has(e.id));
    const equiposSin = [...new Set(deLaSemana.map((e) => e.equipo_id))].map(nombre).sort();
    if (equiposSin.length) {
      await unaVez(`coordinacion:${lunes}`, () => notificarPerfiles(db, coordinadores,
        `${equiposSin.length} equipo${equiposSin.length > 1 ? "s" : ""} sin entreno preparado esta semana`, equiposSin.join(", "), "/coordinacion"));
    }
  }

  // 4) Jueves y viernes: mesas de los partidos de casa hasta el lunes a las que aún les falta gente
  if (diaSemana === 4 || diaSemana === 5) {
    const partidos = (await partidosDeCasa(db, new Date().toISOString(), aISO(sumarDias(lunes, 7), "00:00"))).filter((p) => !p.federada);
    if (partidos.length) {
      const { data: aR } = await db.from("mesa_asignaciones").select("partido_id").eq("estado", "confirmado").in("partido_id", partidos.map((p) => p.id));
      const conf = (id: string) => ((aR ?? []) as { partido_id: string }[]).filter((a) => a.partido_id === id).length;
      const faltan = partidos.filter((p) => conf(p.id) < POR_MESA);
      if (faltan.length) {
        await unaVez(`mesas:${hoy}`, () => notificarPerfiles(db, gestores,
          `Faltan personas en ${faltan.length} mesa${faltan.length > 1 ? "s" : ""}`,
          faltan.map((p) => `${fechaCorta(p.fecha)} ${hora(p.fecha)} ${p.equipo} (${conf(p.id)}/${POR_MESA})`).join(" · "), `/mesas?semana=${lunes}`));
      }
    }
  }

  return { enviados };
}
