import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import Enviar from "@/components/Enviar";

const volver = (q: string) => redirect(`/cuenta?${q}`);

/** Solo el nombre: sin campos de contraseña, para que el gestor de contraseñas del navegador no intervenga. */
async function guardarNombre(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 60);
  if (!nombre) volver("error=" + encodeURIComponent("Escribe un nombre."));
  const { error } = await supabase.from("perfiles").update({ nombre }).eq("id", user.id);
  if (error) volver("error=" + encodeURIComponent("No se ha podido guardar el nombre: " + error.message));
  revalidatePath("/", "layout");
  volver("ok=nombre");
}

/** Contraseña, en un formulario aparte y con el formato que esperan los gestores de contraseñas. */
async function guardarPassword(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const password = String(formData.get("password") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  if (password.length < 8) volver("error=" + encodeURIComponent("La contraseña debe tener al menos 8 caracteres."));
  if (password !== repetir) volver("error=" + encodeURIComponent("Las dos contraseñas no coinciden."));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) volver("error=" + encodeURIComponent(error.message));
  volver("ok=password");
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; ok?: string; error?: string }>;
}) {
  const { nuevo, ok, error } = await searchParams;
  const { perfil, user } = await requireUser();
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p className="text-sm text-tinta/60">{user.email} · {perfil.rol}</p>
      {nuevo && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">¡Bienvenido! Ponte una contraseña para entrar la próxima vez.</p>}
      {ok === "nombre" && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Nombre guardado.</p>}
      {ok === "password" && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Contraseña cambiada.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={guardarNombre} className="tarjeta mt-5 space-y-3 p-4" autoComplete="off">
        <h2 className="font-medium">Nombre</h2>
        <input name="nombre" defaultValue={perfil.nombre ?? ""} required maxLength={60} autoComplete="off" className="campo" aria-label="Nombre" />
        <Enviar>Guardar nombre</Enviar>
      </form>

      <form action={guardarPassword} className="tarjeta mt-4 space-y-3 p-4">
        <h2 className="font-medium">Cambiar contraseña</h2>
        {/* Campo oculto con el usuario: así el gestor de contraseñas sabe a qué cuenta pertenece */}
        <input type="email" name="username" value={user.email ?? ""} autoComplete="username" readOnly hidden />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Nueva contraseña (mín. 8 caracteres)" className="campo" aria-label="Nueva contraseña" />
        <input name="repetir" type="password" required minLength={8} autoComplete="new-password" placeholder="Repite la contraseña" className="campo" aria-label="Repite la contraseña" />
        <Enviar className="btn-secundario">Cambiar contraseña</Enviar>
      </form>

      <div className="tarjeta mt-4 p-4 text-sm">
        <h2 className="mb-2 font-medium">Instalar la app</h2>
        <ul className="space-y-1 text-xs text-tinta/60">
          <li><strong>iPhone / iPad:</strong> Safari → Compartir → «Añadir a pantalla de inicio».</li>
          <li><strong>Android:</strong> Chrome → menú ⋮ → «Instalar aplicación».</li>
          <li><strong>Windows:</strong> Edge o Chrome → icono de instalar en la barra de direcciones. Queda en el menú Inicio.</li>
          <li><strong>Mac:</strong> Safari → Archivo → «Añadir al Dock», o Chrome → instalar.</li>
        </ul>
      </div>
    </div>
  );
}
