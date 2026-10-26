import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { colorEquipo } from "@/lib/colores";
import Enviar from "@/components/Enviar";
import { check } from "@/lib/db";
import { alternarAcceso, asignarEquipo, cambiarRol, quitarEquipo } from "./actions";
import { BotonNuevaPassword, NuevaPersona } from "./FormPersona";
import { FUNCIONES } from "@/lib/funciones";
import { AlertTriangle, Ban, Shield, X } from "lucide-react";

async function nuevaTemporada(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  check(await supabase.from("temporadas").update({ actual: false }).eq("actual", true));
  check(await supabase.from("temporadas").insert({ nombre, actual: true }));
  revalidatePath("/", "layout");
}

async function activarTemporada(formData: FormData) {
  "use server";
  const supabase = await createClient();
  check(await supabase.from("temporadas").update({ actual: false }).eq("actual", true));
  check(await supabase.from("temporadas").update({ actual: true }).eq("id", String(formData.get("id"))));
  revalidatePath("/", "layout");
}

type Staff = { equipo_id: string; perfil_id: string; funcion: string };

export default async function ClubPage() {
  const { supabase, perfil, user } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");

  const [{ data: perfiles }, { data: temporadas }, { equipos }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, email, rol").order("nombre"),
    supabase.from("temporadas").select("id, nombre, actual").order("nombre", { ascending: false }),
    equiposDeTemporada(supabase),
  ]);
  const ids = equipos.map((e) => e.id);
  const { data: staffRaw } = await supabase.from("equipo_staff").select("equipo_id, perfil_id, funcion").in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const staff = (staffRaw ?? []) as Staff[];

  // Datos de acceso (último acceso, bloqueados) con la clave de administrador
  const admin = adminClient();
  const accesos = new Map<string, { ultimo: string | null; bloqueado: boolean }>();
  if (admin) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) accesos.set(u.id, { ultimo: u.last_sign_in_at ?? null, bloqueado: !!(u as { banned_until?: string | null }).banned_until && new Date((u as { banned_until?: string }).banned_until!).getTime() > Date.now() });
  }
  const nombreDe = (id: string) => (perfiles ?? []).find((p) => p.id === id)?.nombre ?? "—";
  const cuando = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit", timeZone: "Europe/Madrid" }) : "nunca");
  const Funcion = ({ f }: { f: string }) => <span className="text-[10px] uppercase tracking-wide text-tinta/50">{f}</span>;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Shield className="text-azul" /> Panel del coordinador</h1>
        <p className="text-sm text-tinta/60">Staff de cada equipo, accesos a la app y temporadas. Solo lo ves tú.</p>
        {!admin && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-oro bg-oro/15 p-3 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rojo" />
            <span>Para crear accesos desde aquí, añade en Vercel la variable <code>SUPABASE_SERVICE_ROLE_KEY</code> con la clave <em>secret</em> de Supabase (Project Settings → API Keys) y vuelve a desplegar. Mientras tanto puedes asignar equipos a quien ya tenga cuenta.</span>
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Staff por equipo */}
        <section>
          <h2 className="font-semibold">Staff de cada equipo</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {equipos.map((e) => {
              const suyos = staff.filter((s) => s.equipo_id === e.id);
              const sinEntrenador = !suyos.some((s) => s.funcion === "entrenador");
              return (
                <div key={e.id} className="tarjeta p-3" style={{ borderTop: `4px solid ${colorEquipo(e.id, equipos)}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{e.nombre}</h3>
                    {sinEntrenador && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">Sin entrenador</span>}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {suyos.map((s) => (
                      <li key={s.perfil_id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{nombreDe(s.perfil_id)} <Funcion f={s.funcion} /></span>
                        <form action={quitarEquipo}>
                          <input type="hidden" name="equipo_id" value={e.id} /><input type="hidden" name="perfil_id" value={s.perfil_id} />
                          <Enviar className="rounded p-0.5 text-tinta/35 hover:bg-red-50 hover:text-red-600" title="Quitar del equipo" confirmar={`¿Quitar a ${nombreDe(s.perfil_id)} de ${e.nombre}?`}><X size={14} /></Enviar>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={asignarEquipo} className="mt-2 flex gap-1">
                    <input type="hidden" name="equipo_id" value={e.id} />
                    <select name="perfil_id" className="campo !py-1 text-xs" defaultValue="">
                      <option value="" disabled>Añadir persona…</option>
                      {(perfiles ?? []).filter((p) => !suyos.some((s) => s.perfil_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.nombre ?? p.email}</option>)}
                    </select>
                    <select name="funcion" className="campo !w-auto !py-1 text-xs" defaultValue="entrenador">{FUNCIONES.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                    <Enviar className="btn-secundario !px-2 !py-1 text-xs">+</Enviar>
                  </form>
                </div>
              );
            })}
            {!equipos.length && <p className="text-sm text-tinta/50">Crea primero los equipos de la temporada en Equipos.</p>}
          </div>
        </section>

        <NuevaPersona equipos={equipos.map((e) => ({ id: e.id, nombre: e.nombre }))} />
      </div>

      {/* Personas con acceso */}
      <section>
        <h2 className="font-semibold">Personas con acceso</h2>
        <ul className="tarjeta mt-2 divide-y divide-linea">
          {(perfiles ?? []).map((p) => {
            const a = accesos.get(p.id);
            const suyos = staff.filter((s) => s.perfil_id === p.id);
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm ${a?.bloqueado ? "opacity-60" : ""}`}>
                <div className="min-w-48 flex-1">
                  <div className="font-medium">{p.nombre}{a?.bloqueado && <span className="ml-2 rounded bg-red-50 px-1.5 text-[10px] font-semibold uppercase text-red-700">Sin acceso</span>}</div>
                  <div className="truncate text-xs text-tinta/50">{p.email}{a ? ` · último acceso: ${cuando(a.ultimo)}` : ""}</div>
                  {suyos.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suyos.map((s) => <span key={s.equipo_id} className="rounded-full bg-suave px-2 py-0.5 text-[11px]">{equipos.find((e) => e.id === s.equipo_id)?.nombre} · {s.funcion}</span>)}
                    </div>
                  )}
                </div>
                {p.id === user.id ? (
                  <span className="text-xs text-tinta/50">Coordinador (tú)</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1">
                    <form action={cambiarRol} className="flex gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="rol" defaultValue={p.rol} className="campo !w-auto !py-1 text-xs">
                        <option value="entrenador">Staff</option>
                        <option value="coordinador">Coordinador</option>
                      </select>
                      <Enviar className="btn-secundario !px-2 !py-1 text-xs">OK</Enviar>
                    </form>
                    {admin && <BotonNuevaPassword id={p.id} nombre={p.nombre ?? ""} />}
                    {admin && (
                      <form action={alternarAcceso}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="bloquear" value={a?.bloqueado ? "0" : "1"} />
                        <Enviar className={`!px-2 !py-1 text-xs ${a?.bloqueado ? "btn-secundario" : "btn-peligro"}`} title={a?.bloqueado ? "Devolver el acceso" : "Quitar el acceso"}
                          confirmar={a?.bloqueado ? undefined : `¿Quitar el acceso a ${p.nombre}? Se le quitarán sus equipos; sus ejercicios se quedan en el club.`}>
                          <Ban size={13} /> {a?.bloqueado ? "Devolver acceso" : "Quitar acceso"}
                        </Enviar>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-3xl">
        <h2 className="font-semibold">Temporadas</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(temporadas ?? []).map((t) => (
            <li key={t.id}>
              {t.actual ? (
                <span className="inline-block rounded-full bg-club px-3 py-1 text-sm text-white">{t.nombre} · actual</span>
              ) : (
                <form action={activarTemporada}>
                  <input type="hidden" name="id" value={t.id} />
                  <Enviar className="rounded-full border border-linea bg-white px-3 py-1 text-sm hover:bg-suave" confirmar={`¿Pasar a trabajar con la temporada ${t.nombre}?`}>{t.nombre}</Enviar>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={nuevaTemporada} className="mt-3 flex max-w-sm gap-2">
          <input name="nombre" placeholder="2027-28" className="campo" />
          <Enviar className="btn-secundario shrink-0" confirmar="La nueva temporada pasará a ser la actual. ¿Continuar?">Nueva temporada</Enviar>
        </form>
        <p className="mt-2 text-xs text-tinta/50">
          Al crear una temporada nueva se convierte en la actual. Crea los equipos y usa «Incorporar jugador existente» para pasar jugadores de un año a otro.
        </p>
      </section>
    </div>
  );
}
