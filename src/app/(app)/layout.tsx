import Link from "next/link";
import { veFantasy } from "@/lib/fantasy/menu";
import { gestionaMesas, requireUser, veMaterial } from "@/lib/supabase/server";
import { equipoActivo, misEquipos } from "@/lib/equipo-activo";
import SelectorEquipo from "@/components/SelectorEquipo";
import NavPrincipal from "@/components/NavPrincipal";
import RegistrarSW from "@/components/RegistrarSW";
import PedirAvisos from "@/components/PedirAvisos";
import AutoRefresco from "@/components/AutoRefresco";
import { VAPID_PUBLICO } from "@/lib/notificar";
import SelectorTema from "@/components/SelectorTema";
import SelectorIdioma from "@/components/SelectorIdioma";
import { salir } from "@/app/login/actions";
import { Bell, LogOut, UserRound } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, perfil, user } = await requireUser();
  // Todo a la vez (antes, los avisos sin leer esperaban a los equipos)
  const [{ equipos }, activo, { count: sinLeerRaw }, fantasy] = await Promise.all([
    misEquipos(supabase),
    equipoActivo(supabase),
    supabase.from("notificaciones").select("id", { count: "exact", head: true }).eq("perfil_id", user.id).eq("leida", false),
    veFantasy(user.id),
  ]);
  const sinLeer = sinLeerRaw ?? 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-azul text-white shadow-md shadow-azul/20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="CB Turó 10 anys" className="h-10 w-10 rounded-lg shadow ring-1 ring-white/15" />
            <span className="hidden leading-none sm:block">
              <span className="block font-[family-name:var(--font-escudo)] text-lg tracking-wide">Coach Manager CBTuró</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-oro">CB Turó de la Peira</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <SelectorEquipo equipos={equipos} activoId={activo?.id ?? null} />
            <div className="hidden sm:block"><SelectorIdioma oscuro /></div>
            <div className="hidden sm:block"><SelectorTema oscuro /></div>
            <Link href="/notificaciones" className="relative rounded-lg p-1.5 hover:bg-white/10" title="Avisos">
              <Bell size={20} />
              {sinLeer > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rojo px-1 text-[10px] font-bold">{sinLeer > 9 ? "9+" : sinLeer}</span>}
            </Link>
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
        <NavPrincipal rol={perfil.rol} mesas={gestionaMesas(perfil)} material={veMaterial(perfil)} fantasy={fantasy} />
        <div className="filete" />
      </header>
      <PedirAvisos clavePublica={VAPID_PUBLICO} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <RegistrarSW />
      <AutoRefresco />
    </div>
  );
}
