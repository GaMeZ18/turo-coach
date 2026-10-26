import { entrar, enviarEnlace } from "./actions";
import SesionDesdeEnlace from "./SesionDesdeEnlace";
import Enviar from "@/components/Enviar";
import SelectorIdioma from "@/components/SelectorIdioma";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>;
}) {
  const { error, enviado } = await searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col bg-azul-noche text-white lg:flex-row">
      {/* Imagen del 10º aniversario */}
      <div className="relative h-56 shrink-0 overflow-hidden sm:h-72 lg:h-auto lg:flex-1">
        <img src="/marca/aniversario-10.jpg" alt="CB Turó · 10 anys · 2017–2027" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-azul-noche lg:bg-gradient-to-r lg:via-transparent" />
      </div>

      <div className="relative flex flex-1 items-start justify-center px-4 pb-10 lg:max-w-lg lg:items-center lg:px-10">
        <div className="-mt-16 w-full max-w-sm lg:mt-0">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src="/marca/escudo.png" alt="Escudo CB Turó" className="h-28 w-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]" />
            <h1 className="mt-4 !font-[family-name:var(--font-escudo)] text-3xl !normal-case !text-white">Turó Coach</h1>
            <p className="mt-1 text-sm text-white/60">Àrea d&apos;entrenadors · CB Turó de la Peira</p>
          </div>

          <div className="rounded-2xl bg-white p-5 text-tinta shadow-2xl shadow-black/40">
            <div className="filete -mx-5 -mt-5 mb-5 rounded-t-2xl" />
            <SesionDesdeEnlace />
            {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {enviado && (
              <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Te hemos enviado un enlace de acceso al correo.
              </p>
            )}

            <form className="space-y-3">
              <div>
                <label className="etiqueta" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
              </div>
              <div>
                <label className="etiqueta" htmlFor="password">Contraseña</label>
                <input id="password" name="password" type="password" autoComplete="current-password" className="campo" />
              </div>
              <Enviar formAction={entrar} className="btn-primario w-full !py-2.5">Entrar</Enviar>
              <Enviar formAction={enviarEnlace} className="btn-secundario w-full">
                Enviarme un enlace (sin contraseña)
              </Enviar>
            </form>
          </div>
          <p className="mt-4 text-center text-xs text-white/40">
            Acceso solo por invitación del coordinador del club.
          </p>
          <div className="mt-3 flex justify-center"><SelectorIdioma oscuro /></div>
        </div>
      </div>
    </main>
  );
}
