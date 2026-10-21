import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo, equiposDeTemporada } from "@/lib/equipo-activo";
import SelectorEquipo from "@/components/SelectorEquipo";
import NavPrincipal from "@/components/NavPrincipal";
import RegistrarSW from "@/components/RegistrarSW";
import { salir } from "@/app/login/actions";
import { LogOut, UserRound } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, perfil } = await requireUser();
  const [{ equipos }, activo] = await Promise.all([
    equiposDeTemporada(supabase),
    equipoActivo(supabase),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-azul text-white shadow-md shadow-azul/20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/marca/escudo-128.png" alt="CB Turó" className="h-10 w-auto drop-shadow" />
            <span className="hidden leading-none sm:block">
              <span className="block font-[family-name:var(--font-escudo)] text-lg tracking-wide">Turó Coach</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-oro">CB Turó de la Peira</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <SelectorEquipo equipos={equipos} activoId={activo?.id ?? null} />
            <Link href="/cuenta" className="rounded-lg p-1.5 hover:bg-white/10" title={perfil.nombre ?? "Cuenta"}>
              <UserRound size={20} />
            </Link>
            <form action={salir}>
              <button className="rounded-lg p-1.5 hover:bg-white/10" title="Salir">
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </div>
        <NavPrincipal coordinador={perfil.rol === "coordinador"} />
        <div className="filete" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <RegistrarSW />
    </div>
  );
}
