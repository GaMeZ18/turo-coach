import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";

async function cambiarRol(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("perfiles").update({ rol: String(formData.get("rol")) }).eq("id", String(formData.get("id")));
  revalidatePath("/club");
}

async function nuevaTemporada(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  await supabase.from("temporadas").update({ actual: false }).eq("actual", true);
  await supabase.from("temporadas").insert({ nombre, actual: true });
  revalidatePath("/", "layout");
}

async function activarTemporada(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("temporadas").update({ actual: false }).eq("actual", true);
  await supabase.from("temporadas").update({ actual: true }).eq("id", String(formData.get("id")));
  revalidatePath("/", "layout");
}

export default async function ClubPage() {
  const { supabase, perfil, user } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");

  const [{ data: perfiles }, { data: temporadas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, email, rol").order("nombre"),
    supabase.from("temporadas").select("id, nombre, actual").order("nombre", { ascending: false }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Club</h1>
        <p className="text-sm text-tinta/60">Solo visible para coordinadores.</p>
      </section>

      <section>
        <h2 className="font-semibold">Entrenadores</h2>
        <p className="mt-1 text-sm text-tinta/60">
          Para dar acceso a alguien: Supabase → Authentication → Users → <em>Invite user</em>. Le llegará un email
          y aparecerá aquí. Luego asígnale equipos desde <strong>Equipos</strong>.
        </p>
        <ul className="tarjeta mt-3 divide-y divide-linea">
          {(perfiles ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.nombre}</div>
                <div className="truncate text-xs text-tinta/50">{p.email}</div>
              </div>
              {p.id === user.id ? (
                <span className="text-xs text-tinta/50">{p.rol} (tú)</span>
              ) : (
                <form action={cambiarRol} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="rol" defaultValue={p.rol} className="campo !w-auto !py-1 text-xs">
                    <option value="entrenador">Entrenador</option>
                    <option value="coordinador">Coordinador</option>
                  </select>
                  <button className="btn-secundario !px-2 !py-1 text-xs">OK</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Temporadas</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(temporadas ?? []).map((t) => (
            <li key={t.id}>
              {t.actual ? (
                <span className="inline-block rounded-full bg-club px-3 py-1 text-sm text-white">{t.nombre} · actual</span>
              ) : (
                <form action={activarTemporada}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="rounded-full border border-linea bg-white px-3 py-1 text-sm hover:bg-suave">{t.nombre}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={nuevaTemporada} className="mt-3 flex max-w-sm gap-2">
          <input name="nombre" placeholder="2027-28" className="campo" />
          <button className="btn-secundario shrink-0">Nueva temporada</button>
        </form>
        <p className="mt-2 text-xs text-tinta/50">
          Al crear una temporada nueva se convierte en la actual. Crea los equipos y usa «Incorporar jugador existente» para pasar jugadores de un año a otro.
        </p>
      </section>
    </div>
  );
}
