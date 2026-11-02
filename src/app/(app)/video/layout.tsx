import { requireUser } from "@/lib/supabase/server";
import { Clapperboard } from "lucide-react";

// De momento el vídeo solo lo usa el coordinador (en pruebas); los entrenadores ven «Próximamente»
export default async function VideoLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireUser();
  if (perfil.rol === "coordinador") return <>{children}</>;
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <Clapperboard size={44} className="mx-auto text-azul/40" />
      <h1 className="mt-3 text-2xl font-semibold">Vídeo · Próximamente</h1>
      <p className="mt-2 text-sm text-tinta/60">
        Estamos preparando el análisis de vídeo: subir el partido, detectar los tiros automáticamente y sacar la estadística de cada jugador.
        Muy pronto estará disponible para todos los entrenadores.
      </p>
    </div>
  );
}
