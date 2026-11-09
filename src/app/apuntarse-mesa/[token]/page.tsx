import { adminClient } from "@/lib/supabase/admin";
import { partidosDeCasa, euros, plazoMesa, rangoPublico } from "@/lib/mesas";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import { VAPID_PUBLICO } from "@/lib/notificar";
import type { Metadata } from "next";
import Apuntarse from "./Apuntarse";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  // Manifest propio: al instalarla en el móvil se abre directamente en esta página (no en el login)
  return { title: "Mesas CB Turó", robots: { index: false }, manifest: `/apuntarse-mesa/${encodeURIComponent(token)}/manifest.webmanifest`, appleWebApp: { capable: true, title: "Mesas CB Turó" } };
}

/** Página pública (sin cuenta) para apuntarse a hacer mesa en los partidos de casa */
export default async function ApuntarseMesa({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ semana?: string }> }) {
  const { token } = await params;
  const { semana } = await searchParams;
  const db = adminClient();
  const { data: cfg } = db ? await db.from("mesa_config").select("token, importe").maybeSingle() : { data: null };
  if (!db || !cfg || cfg.token !== token) {
    return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-tinta/60">Pide el enlace nuevo al gestor de mesas del CB Turó.</p></main>;
  }
  // Solo la semana del mensaje (o la actual; desde el sábado también la siguiente), y lo que aún no se ha jugado
  const r = rangoPublico(semana, hoyLocal(), lunesDe, sumarDias);
  const ahora = new Date().toISOString();
  const partidos = (await partidosDeCasa(db, r.desde > ahora ? r.desde : ahora, r.hasta)).filter((p) => !p.federada);
  const { data: asig } = partidos.length ? await db.from("mesa_asignaciones").select("partido_id, estado").in("partido_id", partidos.map((p) => p.id)) : { data: [] };
  const confirmados = Object.fromEntries(partidos.map((p) => [p.id, (asig ?? []).filter((a) => a.partido_id === p.id && a.estado === "confirmado").length]));
  return (
    <main className="mx-auto max-w-lg p-4">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-lg" />
        <div>
          <h1 className="text-xl font-semibold">Mesas de los partidos de casa</h1>
          <p className="text-sm text-tinta/60">CB Turó de la Peira · {euros(Number(cfg.importe))} por persona y partido</p>
          <p className="text-xs font-semibold capitalize text-azul">Semana del {fechaCorta(r.desde)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-tinta/70">Marca los partidos en los que puedes hacer la mesa (cada mesa son 2 personas; las marcadas «1 persona» son de 1 persona y la pagan los jugadores en efectivo). Quedas <strong>pendiente</strong> hasta que el gestor de mesas te confirme. Puedes apuntarte o borrarte <strong>hasta el miércoles a las 15:00</strong> de la semana del partido; después, si tienes algún problema, escribe en el <strong>grupo de WhatsApp</strong> de mesas.</p>
      <Apuntarse token={token} clavePublica={VAPID_PUBLICO} partidos={partidos.map((p) => ({ id: p.id, fecha: p.fecha, equipo: p.equipo, rival: p.rival, lugar: p.lugar, confirmados: confirmados[p.id] ?? 0, plazo: plazoMesa(p.fecha), plazas: p.plazas, manual: p.efectivo }))} />
    </main>
  );
}
