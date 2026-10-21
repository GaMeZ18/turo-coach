import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import Enviar from "@/components/Enviar";

async function guardarCuenta(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (nombre) await supabase.from("perfiles").update({ nombre }).eq("id", user.id);
  if (password) {
    if (password.length < 8) redirect("/cuenta?error=" + encodeURIComponent("La contraseña debe tener al menos 8 caracteres"));
    const { error } = await supabase.auth.updateUser({ password });
    if (error) redirect("/cuenta?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/", "layout");
  redirect("/cuenta?ok=1");
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
      {ok && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Guardado.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form action={guardarCuenta} className="tarjeta mt-5 space-y-3 p-4">
        <div><label className="etiqueta">Nombre</label><input name="nombre" defaultValue={perfil.nombre ?? ""} className="campo" /></div>
        <div><label className="etiqueta">Nueva contraseña</label><input name="password" type="password" autoComplete="new-password" placeholder="Déjalo vacío para no cambiarla" className="campo" /></div>
        <Enviar>Guardar</Enviar>
      </form>

      <div className="tarjeta mt-5 p-4 text-sm">
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
