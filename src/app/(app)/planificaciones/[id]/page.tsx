import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo, misEquipos } from "@/lib/equipo-activo";
import { aplanar, arbol, conDescendientes, COLORES_OBJETIVO, type Nodo, type Objetivo } from "@/lib/objetivos";
import { diaInput, hoyLocal } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import {
  borrarObjetivo, borrarPlanificacion, crearObjetivo, duplicarPlanificacion, editarObjetivo, editarPlanificacion, moverObjetivo,
} from "../actions";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";

type Trabajo = { objetivo_id: string; entrenamientos: { id: string; fecha: string; titulo: string | null; equipo_id: string } };

export default async function PlanificacionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ eq?: string }> }) {
  const { id } = await params;
  const { eq } = await searchParams;
  const { supabase, user, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";

  const { data: plan } = await supabase.from("planificaciones").select("*, equipos(nombre)").eq("id", id).maybeSingle();
  if (!plan) notFound();

  const [{ data: objs }, { equipos }, activo, { data: staff }] = await Promise.all([
    supabase.from("objetivos").select("id, planificacion_id, padre_id, nombre, descripcion, color, orden").eq("planificacion_id", id),
    misEquipos(supabase),
    equipoActivo(supabase),
    supabase.from("equipo_staff").select("equipo_id").eq("perfil_id", user.id),
  ]);
  const mios = new Set((staff ?? []).map((s) => s.equipo_id as string));
  const puedeEditar = plan.equipo_id ? esCoord || mios.has(plan.equipo_id) : esCoord;
  const destinos = esCoord ? equipos : equipos.filter((e) => mios.has(e.id));

  const nodos = arbol((objs ?? []) as Objetivo[]);
  const lista = aplanar(nodos);

  // Equipo del que se muestra el seguimiento
  const equipoVer = plan.equipo_id ?? (eq && equipos.some((e) => e.id === eq) ? eq : activo?.id ?? null);
  const ids = lista.map((o) => o.id);
  const { data: trabajos } = ids.length
    ? await (() => {
        let q = supabase.from("entreno_objetivos").select("objetivo_id, entrenamientos!inner(id, fecha, titulo, equipo_id)").in("objetivo_id", ids);
        if (equipoVer) q = q.eq("entrenamientos.equipo_id", equipoVer);
        return q;
      })()
    : { data: [] };
  const hechos = (trabajos ?? []) as unknown as Trabajo[];

  // Semanas de la temporada (de septiembre a junio)
  const hoy = hoyLocal();
  const [ay, am] = hoy.split("-").map(Number);
  const inicioAno = am >= 8 ? ay : ay - 1;
  const lunes = (d: Date) => new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5);
  const inicio = lunes(new Date(Date.UTC(inicioAno, 8, 1)));
  const fin = new Date(Date.UTC(inicioAno + 1, 5, 30));
  const semanas: { clave: string; mes: string | null }[] = [];
  for (let d = inicio; d <= fin; d = new Date(d.getTime() + 7 * 864e5)) {
    const prev = semanas.length ? new Date(Date.parse(semanas[semanas.length - 1].clave)).getUTCMonth() : -1;
    semanas.push({ clave: d.toISOString().slice(0, 10), mes: d.getUTCMonth() !== prev ? d.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }) : null });
  }
  const semanaDe = (iso: string) => lunes(new Date(`${diaInput(iso)}T00:00:00Z`)).toISOString().slice(0, 10);
  const semanaHoy = lunes(new Date(`${hoy}T00:00:00Z`)).toISOString().slice(0, 10);

  // Para cada objetivo: entrenos propios y de sus subobjetivos, por semana
  const porObjetivo = new Map<string, Trabajo["entrenamientos"][]>();
  for (const t of hechos) porObjetivo.set(t.objetivo_id, [...(porObjetivo.get(t.objetivo_id) ?? []), t.entrenamientos]);
  const seguimiento = (n: Nodo) => {
    const propios = porObjetivo.get(n.id) ?? [];
    const todos = conDescendientes(n).flatMap((x) => porObjetivo.get(x) ?? []);
    const unicos = [...new Map(todos.map((e) => [e.id, e])).values()];
    const semProp = new Map<string, number>(), semTodos = new Map<string, string[]>();
    for (const e of propios) semProp.set(semanaDe(e.fecha), (semProp.get(semanaDe(e.fecha)) ?? 0) + 1);
    for (const e of unicos) semTodos.set(semanaDe(e.fecha), [...(semTodos.get(semanaDe(e.fecha)) ?? []), `${new Date(e.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })} ${e.titulo ?? "Entreno"}`]);
    const ultimo = unicos.map((e) => e.fecha).sort().pop();
    return { total: unicos.length, semProp, semTodos, ultimo };
  };

  const Hidden = ({ o }: { o: Nodo }) => (<><input type="hidden" name="id" value={o.id} /><input type="hidden" name="planificacion_id" value={id} /></>);

  return (
    <div>
      <Link href="/planificaciones" className="text-sm text-tinta/60 hover:underline">← Planificaciones</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{plan.nombre}</h1>
          <p className="text-sm text-tinta/60">{plan.equipo_id ? (plan.equipos as { nombre: string } | null)?.nombre : "Del club"} · {lista.length} objetivos</p>
          {plan.descripcion && <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-tinta/80">{plan.descripcion}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {destinos.length > 0 && (
            <form action={duplicarPlanificacion} className="flex gap-1">
              <input type="hidden" name="id" value={id} />
              <select name="ambito" className="campo !w-auto !py-1.5 text-sm" defaultValue={activo && destinos.some((e) => e.id === activo.id) ? activo.id : destinos[0]?.id}>
                {esCoord && <option value="club">Club</option>}
                {destinos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <Enviar className="btn-secundario" title="Hacer una copia con todos los objetivos"><Copy size={16} /> Copiar a</Enviar>
            </form>
          )}
          {puedeEditar && (
            <form action={borrarPlanificacion}>
              <input type="hidden" name="id" value={id} />
              <Enviar className="btn-peligro" title="Borrar planificación" confirmar={`¿Borrar «${plan.nombre}» con todos sus objetivos? Se quitarán también de los entrenos.`}><Trash2 size={16} /></Enviar>
            </form>
          )}
        </div>
      </div>

      {puedeEditar && (
        <details className="mt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-azul hover:underline [&::-webkit-details-marker]:hidden"><Pencil size={14} /> Editar nombre y descripción</summary>
          <form action={editarPlanificacion} className="tarjeta mt-2 grid max-w-2xl gap-2 p-4">
            <input type="hidden" name="id" value={id} />
            <input name="nombre" required defaultValue={plan.nombre} className="campo" />
            <textarea name="descripcion" rows={2} defaultValue={plan.descripcion ?? ""} placeholder="Para qué es, a qué edades, criterios…" className="campo" />
            <Enviar>Guardar</Enviar>
          </form>
        </details>
      )}

      {/* Árbol de objetivos */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Objetivos</h2>
        <div className="tarjeta mt-2 divide-y divide-linea">
          {lista.map((o) => {
            const s = seguimiento(o);
            const hermanos = o.padre_id ? lista.filter((x) => x.padre_id === o.padre_id) : nodos;
            const pos = hermanos.findIndex((x) => x.id === o.id);
            return (
              <div key={o.id} className="px-3 py-2" style={{ paddingLeft: `${0.75 + o.nivel * 1.5}rem` }}>
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded-full ${o.nivel === 0 ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`} style={{ background: o.colorFinal }} />
                  <div className="min-w-0 flex-1">
                    <span className={o.nivel === 0 ? "font-semibold" : ""}>{o.nombre}</span>
                    {o.descripcion && <span className="block text-xs text-tinta/60">{o.descripcion}</span>}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-tinta/50" title={s.ultimo ? `Último: ${new Date(s.ultimo).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}` : "Sin trabajar"}>
                    {s.total ? `${s.total} entreno${s.total === 1 ? "" : "s"}` : "—"}
                  </span>
                  {puedeEditar && (
                    <div className="flex shrink-0 items-center">
                      <form action={moverObjetivo}><Hidden o={o} /><input type="hidden" name="dir" value="-1" /><Enviar className="rounded p-1 text-tinta/40 hover:bg-suave hover:text-tinta disabled:opacity-20" disabled={pos === 0} title="Subir"><ArrowUp size={14} /></Enviar></form>
                      <form action={moverObjetivo}><Hidden o={o} /><input type="hidden" name="dir" value="1" /><Enviar className="rounded p-1 text-tinta/40 hover:bg-suave hover:text-tinta disabled:opacity-20" disabled={pos === hermanos.length - 1} title="Bajar"><ArrowDown size={14} /></Enviar></form>
                      <form action={borrarObjetivo}><Hidden o={o} /><Enviar className="rounded p-1 text-tinta/35 hover:bg-red-50 hover:text-red-600" title="Borrar" confirmar={`¿Borrar «${o.nombre}»${o.hijos.length ? " y sus subobjetivos" : ""}?`}><Trash2 size={14} /></Enviar></form>
                    </div>
                  )}
                </div>
                {puedeEditar && (
                  <div className="mt-1 flex flex-wrap gap-3 pl-5 text-xs">
                    <details>
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-azul hover:underline [&::-webkit-details-marker]:hidden"><Plus size={12} /> Subobjetivo</summary>
                      <form action={crearObjetivo} className="mt-1 flex flex-wrap items-start gap-2">
                        <input type="hidden" name="planificacion_id" value={id} />
                        <input type="hidden" name="padre_id" value={o.id} />
                        <textarea name="nombre" required rows={2} placeholder={"Uno por línea:\nEntrada por la derecha\nEntrada por la izquierda"} className="campo !w-72 !py-1 text-sm" />
                        <Enviar className="btn-primario !py-1 text-xs">Añadir</Enviar>
                      </form>
                    </details>
                    <details>
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-tinta/60 hover:underline [&::-webkit-details-marker]:hidden"><Pencil size={12} /> Editar</summary>
                      <form action={editarObjetivo} className="mt-1 grid max-w-md gap-1.5">
                        <Hidden o={o} />
                        <input name="nombre" required defaultValue={o.nombre} className="campo !py-1 text-sm" />
                        <textarea name="descripcion" rows={2} defaultValue={o.descripcion ?? ""} placeholder="Descripción, criterios de éxito…" className="campo !py-1 text-sm" />
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1">Color <input type="color" name="color" defaultValue={o.colorFinal} className="h-7 w-10 cursor-pointer rounded border border-linea" /></label>
                          {o.nivel > 0 && <label className="flex items-center gap-1"><input type="checkbox" name="heredar" value="1" defaultChecked={!o.color} /> el del objetivo padre</label>}
                          <Enviar className="btn-primario !py-1 text-xs">Guardar</Enviar>
                        </div>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
          {lista.length === 0 && <p className="px-3 py-4 text-sm text-tinta/50">Sin objetivos todavía.</p>}
        </div>

        {puedeEditar && (
          <form action={crearObjetivo} className="tarjeta mt-2 flex max-w-2xl flex-wrap items-start gap-2 p-3">
            <input type="hidden" name="planificacion_id" value={id} />
            <textarea name="nombre" required rows={2} placeholder={"Objetivo principal (uno por línea):\nTiro\nPase\nDefensa individual"} className="campo min-w-60 flex-1 !py-1.5 text-sm" />
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Color">
              {COLORES_OBJETIVO.slice(0, 6).map((c, i) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="color" value={c} defaultChecked={i === nodos.length % 6} className="peer sr-only" />
                  <span className="block h-6 w-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-tinta" style={{ background: c }} />
                </label>
              ))}
            </div>
            <Enviar>Añadir objetivo</Enviar>
          </form>
        )}
      </section>

      {/* Seguimiento: cuándo se ha trabajado cada objetivo */}
      {lista.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta/60">Cuándo se ha trabajado</h2>
              <p className="text-xs text-tinta/50">Cada casilla es una semana. Color fuerte: el objetivo; claro: alguno de sus subobjetivos.</p>
            </div>
            {!plan.equipo_id && (
              <div className="flex flex-wrap gap-1 text-xs">
                {equipos.map((e) => (
                  <Link key={e.id} href={`/planificaciones/${id}?eq=${e.id}`} className={`rounded-full border px-2.5 py-1 font-semibold ${equipoVer === e.id ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}>{e.nombre}</Link>
                ))}
              </div>
            )}
          </div>
          {!equipoVer ? (
            <p className="tarjeta mt-2 p-3 text-sm text-tinta/60">Elige un equipo para ver su seguimiento.</p>
          ) : (
            <div className="tarjeta mt-2 overflow-x-auto p-3">
              <table className="border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white" />
                    {semanas.map((s) => <th key={s.clave} className="h-5 w-3.5 p-0 text-left align-bottom font-normal capitalize text-tinta/50"><span className="block w-0 overflow-visible whitespace-nowrap">{s.mes ?? ""}</span></th>)}
                    <th className="pl-2 text-right font-normal text-tinta/50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((o) => {
                    const s = seguimiento(o);
                    return (
                      <tr key={o.id}>
                        <td className="sticky left-0 z-10 max-w-48 truncate bg-white py-0.5 pr-3" style={{ paddingLeft: `${o.nivel * 0.75}rem` }} title={o.nombre}>
                          <span className={o.nivel === 0 ? "font-semibold" : "text-tinta/80"}>{o.nombre}</span>
                        </td>
                        {semanas.map((w) => {
                          const propio = s.semProp.get(w.clave);
                          const alguno = s.semTodos.get(w.clave);
                          return (
                            <td key={w.clave} className="p-[1px]">
                              <div
                                className={`h-4 w-3 rounded-[2px] ${w.clave === semanaHoy ? "ring-1 ring-rojo" : ""}`}
                                style={{ background: alguno ? o.colorFinal : "#eef0f5", opacity: alguno && !propio ? 0.35 : 1 }}
                                title={alguno ? alguno.join("\n") : undefined}
                              />
                            </td>
                          );
                        })}
                        <td className="pl-2 text-right tabular-nums text-tinta/70">{s.total || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-tinta/50">Los objetivos se marcan dentro de cada entrenamiento, en «Objetivos del entreno».</p>
        </section>
      )}
    </div>
  );
}
