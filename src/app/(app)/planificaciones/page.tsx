import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo, equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import Enviar from "@/components/Enviar";
import { crearPlanificacion } from "./actions";
import { Building2, ListTree } from "lucide-react";

type Plan = { id: string; nombre: string; descripcion: string | null; equipo_id: string | null; temporada_id: string | null; objetivos: { count: number }[] };

export default async function PlanificacionesPage() {
  const { supabase, user, perfil } = await requireUser();
  const esCoord = perfil.rol === "coordinador";
  const [{ temporada, equipos }, activo] = await Promise.all([equiposDeTemporada(supabase), equipoActivo(supabase)]);

  const [{ data, error }, { data: staff }] = await Promise.all([
    supabase.from("planificaciones").select("id, nombre, descripcion, equipo_id, temporada_id, objetivos(count)").order("created_at"),
    supabase.from("equipo_staff").select("equipo_id").eq("perfil_id", user.id),
  ]);

  if (error && /planificaciones/.test(error.message)) {
    return (
      <div className="tarjeta max-w-2xl p-4 text-sm">
        <h1 className="text-xl font-semibold">Planificaciones</h1>
        <p className="mt-2">Falta crear las tablas: ejecuta <code className="rounded bg-suave px-1">supabase/migrations/0005_planificaciones.sql</code> en el SQL Editor de Supabase.</p>
      </div>
    );
  }

  // De esta temporada (o sin temporada)
  const planes = ((data ?? []) as unknown as Plan[]).filter((p) => !p.temporada_id || p.temporada_id === temporada?.id);
  const mios = new Set((staff ?? []).map((s) => s.equipo_id as string));
  const editables = esCoord ? equipos : equipos.filter((e) => mios.has(e.id));
  const delClub = planes.filter((p) => !p.equipo_id);
  const porEquipo = equipos
    .map((e) => ({ equipo: e, planes: planes.filter((p) => p.equipo_id === e.id) }))
    .filter((g) => g.planes.length)
    .sort((a, b) => (a.equipo.id === activo?.id ? -1 : b.equipo.id === activo?.id ? 1 : 0));

  const Tarjeta = ({ p }: { p: Plan }) => (
    <Link href={`/planificaciones/${p.id}`} className="tarjeta flex items-start gap-3 p-3 transition hover:shadow-md">
      <ListTree size={20} className="mt-0.5 shrink-0 text-azul" />
      <div className="min-w-0">
        <div className="truncate font-medium">{p.nombre}</div>
        <div className="truncate text-xs text-tinta/60">{p.objetivos?.[0]?.count ?? 0} objetivos{p.descripcion ? ` · ${p.descripcion}` : ""}</div>
      </div>
    </Link>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Planificaciones</h1>
      <p className="max-w-3xl text-sm text-tinta/60">
        Árbol de objetivos de la temporada{temporada ? ` ${temporada.nombre}` : ""}. Marca en cada entreno qué objetivos trabajas y aquí verás cuándo se ha trabajado cada uno.
      </p>

      {(esCoord || editables.length > 0) && (
        <form action={crearPlanificacion} className="tarjeta mt-5 grid max-w-3xl gap-2 p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <div><label className="etiqueta">Nueva planificación</label><input name="nombre" required placeholder="Fundamentos individuales, Defensa, Temporada U14…" className="campo" /></div>
          <div>
            <label className="etiqueta">Para</label>
            <select name="ambito" className="campo" defaultValue={activo && editables.some((e) => e.id === activo.id) ? activo.id : esCoord ? "club" : editables[0]?.id}>
              {esCoord && <option value="club">Todo el club</option>}
              {editables.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <Enviar>Crear</Enviar>
        </form>
      )}

      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-tinta/60"><Building2 size={16} /> Del club</h2>
      <p className="text-xs text-tinta/50">Las puede usar cualquier equipo en sus entrenos, o copiarlas para adaptarlas.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {delClub.map((p) => <Tarjeta key={p.id} p={p} />)}
        {delClub.length === 0 && <p className="text-sm text-tinta/50">Todavía no hay planificaciones del club.</p>}
      </div>

      {porEquipo.map(({ equipo, planes: ps }) => (
        <section key={equipo.id}>
          <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: colorEquipo(equipo.id, equipos) }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorEquipo(equipo.id, equipos) }} /> {equipo.nombre}
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ps.map((p) => <Tarjeta key={p.id} p={p} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
