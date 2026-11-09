import { adminClient } from "@/lib/supabase/admin";
import { partidosDeCasa, euros, plazoMesa } from "@/lib/mesas";
import Apuntarse from "./Apuntarse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesas · CB Turó de la Peira", robots: { index: false } };

/** Página pública (sin cuenta) para apuntarse a hacer mesa en los partidos de casa */
export default async function ApuntarseMesa({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = adminClient();
  const { data: cfg } = db ? await db.from("mesa_config").select("token, importe").maybeSingle() : { data: null };
  if (!db || !cfg || cfg.token !== token) {
    return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-tinta/60">Pide el enlace nuevo al gestor de mesas del CB Turó.</p></main>;
  }
  const partidos = (await partidosDeCasa(db, new Date().toISOString(), new Date(Date.now() + 28 * 864e5).toISOString())).filter((p) => !p.federada);
  const { data: asig } = partidos.length ? await db.from("mesa_asignaciones").select("partido_id, estado").in("partido_id", partidos.map((p) => p.id)) : { data: [] };
  const confirmados = Object.fromEntries(partidos.map((p) => [p.id, (asig ?? []).filter((a) => a.partido_id === p.id && a.estado === "confirmado").length]));
  return (
    <main className="mx-auto max-w-lg p-4">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-lg" />
        <div>
          <h1 className="text-xl font-semibold">Mesas de los partidos de casa</h1>
          <p className="text-sm text-tinta/60">CB Turó de la Peira · {euros(Number(cfg.importe))} por persona y partido</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-tinta/70">Marca los partidos en los que puedes hacer la mesa (cada mesa son 2 personas; las marcadas «1 persona» son de 1 persona y la pagan los jugadores en efectivo). Quedas <strong>pendiente</strong> hasta que el gestor de mesas te confirme. Puedes apuntarte o borrarte <strong>hasta el viernes</strong> de la semana del partido; después, solo el gestor puede cambiar la mesa.</p>
      <Apuntarse token={token} partidos={partidos.map((p) => ({ id: p.id, fecha: p.fecha, equipo: p.equipo, rival: p.rival, lugar: p.lugar, confirmados: confirmados[p.id] ?? 0, plazo: plazoMesa(p.fecha), plazas: p.plazas, manual: p.manual }))} />
    </main>
  );
}
