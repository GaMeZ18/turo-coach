import { requireUser } from "@/lib/supabase/server";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import {
  crearEquipo, borrarEquipo, alternarCongelado, asignarStaff, quitarStaff, trabajarCon,
} from "./actions";
import { Lock, LockOpen, Trash2, X } from "lucide-react";

export default async function EquiposPage() {
  const { supabase, perfil, user } = await requireUser();
  const esCoord = perfil.rol === "coordinador";
  const { temporada, equipos } = await equiposDeTemporada(supabase);

  const ids = equipos.map((e) => e.id);
  const [{ data: staff }, { data: perfiles }, { data: plantillas }] = await Promise.all([
    supabase.from("equipo_staff").select("equipo_id, perfil_id, funcion, perfiles(nombre)").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("perfiles").select("id, nombre").order("nombre"),
    supabase.from("equipo_jugadores").select("equipo_id").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const staffDe = (id: string) =>
    (staff ?? []).filter((s) => s.equipo_id === id) as unknown as {
      equipo_id: string; perfil_id: string; funcion: string; perfiles: { nombre: string | null } | null;
    }[];
  const numJugadores = (id: string) => (plantillas ?? []).filter((p) => p.equipo_id === id).length;

  // Primero los equipos donde soy staff
  const ordenados = [...equipos].sort((a, b) => {
    const mia = (id: string) => (staffDe(id).some((s) => s.perfil_id === user.id) ? 0 : 1);
    return mia(a.id) - mia(b.id);
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Equipos</h1>
          <p className="text-sm text-tinta/60">Temporada {temporada?.nombre ?? "—"}</p>
        </div>
      </div>

      {esCoord && temporada && (
        <form action={crearEquipo} className="tarjeta mt-5 flex flex-wrap items-end gap-3 p-4">
          <input type="hidden" name="temporada_id" value={temporada.id} />
          <div className="min-w-48 flex-1">
            <label className="etiqueta">Nombre</label>
            <input name="nombre" required placeholder="Infantil A" className="campo" />
          </div>
          <div className="min-w-36">
            <label className="etiqueta">Categoría</label>
            <input name="categoria" placeholder="Infantil" className="campo" />
          </div>
          <button className="btn-primario">Añadir equipo</button>
        </form>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {ordenados.map((e) => (
          <div key={e.id} className="tarjeta p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  {e.nombre}
                  {e.congelado && <Lock size={14} className="text-tinta/50" aria-label="Congelado" />}
                </h2>
                <p className="text-xs text-tinta/60">
                  {e.categoria ?? "Sin categoría"} · {numJugadores(e.id)} jugadores
                </p>
              </div>
              <form action={trabajarCon}>
                <input type="hidden" name="id" value={e.id} />
                <button className="btn-secundario !py-1.5">Trabajar con este</button>
              </form>
            </div>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {staffDe(e.id).map((s) => (
                <li key={s.perfil_id} className="flex items-center gap-1 rounded-full bg-suave px-2.5 py-1 text-xs">
                  {s.perfiles?.nombre ?? "—"} <span className="text-tinta/50">· {s.funcion}</span>
                  {esCoord && (
                    <form action={quitarStaff}>
                      <input type="hidden" name="equipo_id" value={e.id} />
                      <input type="hidden" name="perfil_id" value={s.perfil_id} />
                      <button className="ml-0.5 text-tinta/40 hover:text-red-600" title="Quitar"><X size={12} /></button>
                    </form>
                  )}
                </li>
              ))}
              {staffDe(e.id).length === 0 && <li className="text-xs text-tinta/50">Sin entrenador asignado</li>}
            </ul>

            {esCoord && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-linea pt-3">
                <form action={asignarStaff} className="flex flex-1 gap-2">
                  <input type="hidden" name="equipo_id" value={e.id} />
                  <select name="perfil_id" className="campo !py-1.5">
                    <option value="">Asignar entrenador…</option>
                    {(perfiles ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <select name="funcion" className="campo !w-auto !py-1.5">
                    <option value="entrenador">Entrenador</option>
                    <option value="ayudante">Ayudante</option>
                    <option value="delegado">Delegado</option>
                  </select>
                  <button className="btn-secundario !py-1.5">+</button>
                </form>
                <form action={alternarCongelado}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="congelado" value={String(e.congelado)} />
                  <button className="btn-secundario !px-2.5 !py-1.5" title={e.congelado ? "Descongelar" : "Congelar"}>
                    {e.congelado ? <LockOpen size={16} /> : <Lock size={16} />}
                  </button>
                </form>
                <form action={borrarEquipo}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-peligro !px-2.5 !py-1.5" title="Borrar equipo"><Trash2 size={16} /></button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
      {equipos.length === 0 && (
        <p className="mt-6 text-sm text-tinta/60">
          {esCoord ? "Aún no hay equipos esta temporada. Crea el primero arriba." : "El coordinador aún no ha creado equipos."}
        </p>
      )}
    </div>
  );
}
