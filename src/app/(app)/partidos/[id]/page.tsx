import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { diaInput, fechaLarga, hora, horaInput } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import { anadirSistemaPartido, borrarPartido, editarPartido, guardarPrevia, guardarResultado, quitarSistemaPartido } from "../actions";
import BoxScore, { Parciales } from "@/components/BoxScore";
import MiniPizarra from "@/components/pizarra/Mini";
import InformeRival from "@/components/InformeRival";
import { Resultado, type Partido } from "../comun";
import Convocatoria from "./Convocatoria";
import Periodos from "./Periodos";
import type { StatsPartido } from "@/lib/stats-fcbq";
import { Binoculars, Clapperboard, ClipboardList, FileText, MapPin, Pencil, Trash2, X } from "lucide-react";

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, perfil } = await requireUser();
  const { data } = await supabase.from("partidos").select("*, equipos(nombre)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Partido & { equipo_id: string; notas: string | null; equipos: { nombre: string } | null; fcbq_stats_id?: string | null; num_periodos?: number | null; previa?: string | null };
  const equipo = p.equipos?.nombre ?? "Equipo";

  const [{ data: plantilla }, { data: conv }, { data: staff }, { data: periodos }, { data: stats }] = await Promise.all([
    supabase.from("equipo_jugadores").select("dorsal, jugadores(id, nombre, apellidos)").eq("equipo_id", p.equipo_id),
    supabase.from("convocatorias").select("jugador_id").eq("partido_id", id),
    supabase.from("equipo_staff").select("perfil_id").eq("equipo_id", p.equipo_id).eq("perfil_id", user.id).maybeSingle(),
    supabase.from("partido_periodos").select("jugador_id, periodos").eq("partido_id", id),
    p.fcbq_stats_id
      ? supabase.from("fcbq_stats").select("datos").eq("equipo_id", p.equipo_id).eq("stats_id", p.fcbq_stats_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const esStaff = perfil.rol === "coordinador" || !!staff;
  const { data: videoPartido } = esStaff ? await supabase.from("videos").select("id").eq("partido_id", p.id).order("created_at").limit(1).maybeSingle() : { data: null };
  // Previa: ficha del rival (scouting), sistemas elegidos y lista de ejercicios para añadir
  const [{ data: ficha }, { data: sistemas }, { data: ejercicios }] = esStaff
    ? await Promise.all([
        supabase.from("scouting_rivales").select("notas, caracteristicas").eq("equipo_id", p.equipo_id).ilike("nombre", p.rival).maybeSingle(),
        supabase.from("partido_ejercicios").select("ejercicio_id, orden, ejercicios(titulo, tipo, pizarra, preview)").eq("partido_id", id).order("orden"),
        supabase.from("ejercicios").select("id, titulo, tipo, categoria").order("tipo", { ascending: false }).order("titulo").limit(400),
      ])
    : [{ data: null }, { data: null }, { data: null }];
  const listaSistemas = (sistemas ?? []) as unknown as { ejercicio_id: string; ejercicios: { titulo: string; tipo: string; pizarra: unknown; preview: string | null } | null }[];
  const caract = ((ficha as { caracteristicas?: Record<string, unknown> } | null)?.caracteristicas ?? {}) as Record<string, string | string[]>;
  const st = (stats as { datos: StatsPartido } | null)?.datos ?? null;
  const nuestroLado = st ? (/TUR[OÓ]/i.test(st.local.nombre) ? st.local : st.visitante) : null;
  const jugadores = ((plantilla ?? []) as unknown as { dorsal: number | null; jugadores: { id: string; nombre: string; apellidos: string | null } }[])
    .map((x) => ({ id: x.jugadores.id, nombre: `${x.jugadores.nombre} ${x.jugadores.apellidos ?? ""}`.trim(), dorsal: x.dorsal }))
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const convocados = (conv ?? []).map((c) => c.jugador_id);

  const local = p.local ? equipo : p.rival;
  const visitante = p.local ? p.rival : equipo;

  return (
    <div>
      <Link href="/partidos" className="text-sm text-tinta/60 hover:underline">← Partidos</Link>

      {/* Marcador */}
      <div className="tarjeta mt-2 overflow-hidden">
        <div className="bg-azul px-4 py-2 text-xs font-semibold uppercase tracking-wide text-oro">
          {p.competicion ?? "Partido"}{p.jornada ? ` · Jornada ${p.jornada}` : ""}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 text-center">
          <div className={`font-[family-name:var(--font-titulo)] text-xl font-bold uppercase ${p.local ? "text-azul" : ""}`}>{local}</div>
          <div className="text-3xl font-bold tabular-nums text-tinta">
            {p.puntos_favor !== null && p.puntos_contra !== null
              ? p.local ? `${p.puntos_favor} – ${p.puntos_contra}` : `${p.puntos_contra} – ${p.puntos_favor}`
              : <span className="text-base font-medium text-tinta/50">vs</span>}
          </div>
          <div className={`font-[family-name:var(--font-titulo)] text-xl font-bold uppercase ${!p.local ? "text-azul" : ""}`}>{visitante}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-linea px-4 py-2 text-sm text-tinta/70">
          <span className="capitalize">{fechaLarga(p.fecha)} · {hora(p.fecha)}</span>
          {p.lugar && <span className="flex items-center gap-1"><MapPin size={14} /> {p.lugar}</span>}
          <Resultado p={p} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/imprimir/partido/${p.id}`} className="btn-secundario"><FileText size={16} /> Informe PDF</Link>
        {esStaff && <Link href={`/scouting/equipo?nombre=${encodeURIComponent(p.rival)}`} className="btn-secundario"><Binoculars size={16} /> Scouting del rival</Link>}
        {esStaff && <Link href={videoPartido ? `/video/${videoPartido.id}` : `/video?partido=${p.id}`} className="btn-secundario"><Clapperboard size={16} /> {videoPartido ? "Vídeo del partido" : "Añadir vídeo"}</Link>}
      </div>

      {/* Previa del partido (solo cuerpo técnico) */}
      {esStaff && (
        <section className="tarjeta mt-5 p-4">
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardList size={18} className="text-azul" /> Previa del partido</h2>
          <div className="mt-2"><InformeRival supabase={supabase} equipoId={p.equipo_id} nombre={p.rival} /></div>
          {(ficha && (Object.keys(caract).length > 0 || (ficha as { notas?: string | null }).notas)) ? (
            <div className="mt-2 rounded-lg bg-suave p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">Ficha de {p.rival}</p>
              <dl className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {Object.entries(caract).map(([k, v]) => (
                  <div key={k} className="flex gap-1"><dt className="capitalize text-tinta/60">{k}:</dt><dd className="font-medium">{Array.isArray(v) ? v.join(", ") : v}</dd></div>
                ))}
              </dl>
              {(ficha as { notas?: string | null }).notas && <p className="mt-1 whitespace-pre-line">{(ficha as { notas?: string | null }).notas}</p>}
            </div>
          ) : (
            <p className="mt-1 text-xs text-tinta/50">Sin ficha manual del rival (se rellena en Scouting).</p>
          )}
          <form action={guardarPrevia} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={p.id} />
            <label className="etiqueta">Plan de partido</label>
            <textarea name="previa" rows={4} defaultValue={p.previa ?? ""} className="campo" placeholder="Defensa, emparejamientos, ritmo, claves en ataque, a quién no dejar tirar…" />
            <Enviar>Guardar plan</Enviar>
          </form>
          <div className="mt-4">
            <p className="etiqueta">Sistemas y ejercicios para el partido</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {listaSistemas.map((x) => (
                <div key={x.ejercicio_id} className="relative overflow-hidden rounded-lg border border-linea">
                  <Link href={`/ejercicios/${x.ejercicio_id}`} className="block">
                    <div className="aspect-[15/14] bg-suave">{x.ejercicios?.preview ? <img src={x.ejercicios.preview} alt="" className="h-full w-full object-contain" /> : x.ejercicios?.pizarra ? <MiniPizarra pizarra={x.ejercicios.pizarra} className="h-full w-full" /> : null}</div>
                    <p className="truncate px-1.5 py-1 text-xs font-medium">{x.ejercicios?.titulo}</p>
                  </Link>
                  <form action={quitarSistemaPartido} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="ejercicio_id" value={x.ejercicio_id} />
                    <Enviar className="rounded-full bg-white/90 p-0.5 text-tinta/60 shadow hover:text-rojo" title="Quitar"><X size={14} /></Enviar>
                  </form>
                </div>
              ))}
            </div>
            <form action={anadirSistemaPartido} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={p.id} />
              <select name="ejercicio_id" className="campo" defaultValue="">
                <option value="" disabled>Añadir sistema o ejercicio…</option>
                {(ejercicios ?? []).map((e) => <option key={e.id} value={e.id}>{e.tipo === "sistema" ? "Sistema · " : ""}{e.titulo}</option>)}
              </select>
              <Enviar className="btn-secundario">Añadir</Enviar>
            </form>
          </div>
        </section>
      )}

      {/* Estadísticas de la FCBQ */}
      {st && (
        <section className="tarjeta mt-5 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Estadísticas (FCBQ)</h2>
            <Parciales local={st.local} visitante={st.visitante} />
          </div>
          <BoxScore eq={st.local} destacar={/TUR[OÓ]/i.test(st.local.nombre)} />
          <BoxScore eq={st.visitante} destacar={/TUR[OÓ]/i.test(st.visitante.nombre)} />
          <p className="text-[11px] text-tinta/50">* titular · T2 y T3: canastas anotadas · TL: anotados/intentados</p>
        </section>
      )}

      {esStaff ? (
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Resultado y notas */}
          <form action={guardarResultado} className="tarjeta space-y-3 p-4">
            <input type="hidden" name="id" value={p.id} />
            <h2 className="font-semibold">Resultado</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="etiqueta">{equipo}</label><input name="puntos_favor" type="number" min={0} defaultValue={p.puntos_favor ?? ""} className="campo !w-24 text-center text-lg font-bold" /></div>
              <div><label className="etiqueta">{p.rival}</label><input name="puntos_contra" type="number" min={0} defaultValue={p.puntos_contra ?? ""} className="campo !w-24 text-center text-lg font-bold" /></div>
              <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" name="aplazado" value="1" defaultChecked={p.estado === "aplazado"} /> Aplazado</label>
            </div>
            <div>
              <label className="etiqueta">Notas del partido</label>
              <textarea name="notas" rows={4} defaultValue={p.notas ?? ""} className="campo" placeholder="Qué funcionó, qué hay que trabajar, incidencias…" />
            </div>
            <Enviar>Guardar</Enviar>
          </form>

          {/* Datos del partido */}
          <details className="tarjeta p-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-azul [&::-webkit-details-marker]:hidden">
              <Pencil size={15} /> Editar datos del partido
            </summary>
            <form action={editarPartido} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input type="hidden" name="id" value={p.id} />
              <div><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={diaInput(p.fecha)} className="campo" /></div>
              <div><label className="etiqueta">Hora</label><input name="hora" type="time" required defaultValue={horaInput(p.fecha)} className="campo" /></div>
              <div className="col-span-2"><label className="etiqueta">Rival</label><input name="rival" required defaultValue={p.rival} className="campo" /></div>
              <div>
                <label className="etiqueta">Dónde</label>
                <select name="local" defaultValue={p.local ? "casa" : "fuera"} className="campo"><option value="casa">En casa</option><option value="fuera">Fuera</option></select>
              </div>
              <div><label className="etiqueta">Jornada</label><input name="jornada" type="number" min={1} defaultValue={p.jornada ?? ""} className="campo" /></div>
              <div className="col-span-2"><label className="etiqueta">Competición</label><input name="competicion" defaultValue={p.competicion ?? ""} className="campo" /></div>
              <div className="col-span-2 sm:col-span-3"><label className="etiqueta">Pista</label><input name="lugar" defaultValue={p.lugar ?? ""} className="campo" /></div>
              <div className="flex items-end"><Enviar>Guardar</Enviar></div>
            </form>
            <form action={borrarPartido} className="mt-4 border-t border-linea pt-3">
              <input type="hidden" name="id" value={p.id} />
              <Enviar className="btn-peligro !px-0" confirmar="¿Borrar este partido y su convocatoria? No se puede deshacer."><Trash2 size={15} /> Borrar partido</Enviar>
            </form>
          </details>
        </div>

        <Convocatoria partidoId={p.id} jugadores={jugadores} convocados={convocados} />
      </div>
      ) : (
        p.notas ? <p className="tarjeta mt-5 whitespace-pre-line p-4 text-sm">{p.notas}</p> : null
      )}

      {esStaff && (
        <div className="mt-5">
          <Periodos
            partidoId={p.id}
            jugadores={convocados.length ? jugadores.filter((j) => convocados.includes(j.id)) : jugadores}
            inicial={Object.fromEntries((periodos ?? []).map((x) => [x.jugador_id as string, (x.periodos as number[]) ?? []]))}
            numInicial={p.num_periodos ?? st?.numPeriodos ?? 4}
            fcbq={nuestroLado ? nuestroLado.jugadores.map((j) => ({ nombre: j.nombre, dorsal: j.dorsal, periodos: j.periodos })) : null}
          />
        </div>
      )}
    </div>
  );
}
