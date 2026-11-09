import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { LLEGAR_ANTES, partidoMesa, plazoMesa } from "@/lib/mesas";
import { lunesDe } from "@/lib/pistas";
import { Check, Clock, MapPin, Users, CalendarDays, AlarmClock, X } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi mesa · CB Turó", robots: { index: false } };

const TZ = "Europe/Madrid";
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hora = (iso: string | Date) => new Date(iso).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Ficha de una mesa (se abre desde el aviso): partido, si estás confirmado y con quién la haces */
export default async function MiMesa({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const db = adminClient();
  const { data: cfg } = db ? await db.from("mesa_config").select("token").maybeSingle() : { data: null };
  const malo = <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Mesa no encontrada</h1><p className="mt-2 text-sm text-tinta/60">Puede que te hayan quitado de esta mesa o que el enlace ya no sea válido.</p></main>;
  if (!db || !cfg || cfg.token !== token || !/^[0-9a-f-]{36}$/i.test(id)) return malo;
  const { data: a } = await db.from("mesa_asignaciones").select("id, partido_id, persona_id, estado, mesa_personas(nombre)").eq("id", id).maybeSingle();
  if (!a) return malo;
  const p = await partidoMesa(db, a.partido_id);
  if (!p) return malo;
  const { data: otrosR } = await db.from("mesa_asignaciones").select("estado, mesa_personas(nombre, telefono)").eq("partido_id", a.partido_id).neq("id", a.id);
  const otros = ((otrosR ?? []) as unknown as { estado: string; mesa_personas: { nombre: string; telefono: string | null } | null }[]);
  const companeros = otros.filter((o) => o.estado === "confirmado");
  const confirmado = a.estado === "confirmado";
  const llegada = new Date(new Date(p.fecha).getTime() - LLEGAR_ANTES * 60000);
  const semana = lunesDe(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(p.fecha)));
  const yo = (a.mesa_personas as unknown as { nombre: string } | null)?.nombre ?? "";

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-lg" />
        <div>
          <h1 className="text-xl font-semibold">Mi mesa</h1>
          <p className="text-sm text-tinta/60">{yo}</p>
        </div>
      </div>

      <div className={`flex items-center gap-2 rounded-xl p-3 font-semibold ${confirmado ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
        {confirmado ? <><Check size={20} /> Estás confirmado/a: haces esta mesa</> : <><Clock size={20} /> Estás apuntado/a, pendiente de que el gestor te confirme</>}
      </div>

      <section className="tarjeta space-y-2 p-4">
        <p className="text-lg font-semibold">{p.equipo} <span className="font-normal text-tinta/60">vs</span> {p.rival}</p>
        <p className="flex items-center gap-2 text-sm capitalize"><CalendarDays size={16} className="text-azul" /> {dia(p.fecha)} · empieza a las {hora(p.fecha)}</p>
        <p className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-azul" /> {p.lugar || "Pista por confirmar"}</p>
        {confirmado && <p className="flex items-center gap-2 text-sm font-semibold"><AlarmClock size={16} className="text-rojo" /> Tienes que estar a las {hora(llegada)} ({LLEGAR_ANTES} min antes)</p>}
      </section>

      <section className="tarjeta p-4">
        <p className="flex items-center gap-2 font-semibold"><Users size={16} className="text-azul" /> Con quién la haces</p>
        {companeros.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {companeros.map((c, i) => (
              <li key={i} className="flex items-center gap-2"><Check size={15} className="text-green-700" /> {c.mesa_personas?.nombre}
                {c.mesa_personas?.telefono && <a href={`tel:${c.mesa_personas.telefono}`} className="text-xs text-azul underline">{c.mesa_personas.telefono}</a>}</li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-tinta/60">Todavía no hay nadie más confirmado (o esta mesa es de 1 persona).</p>}
      </section>

      <p className="text-xs text-tinta/50">{new Date().toISOString() < plazoMesa(p.fecha) ? "Hasta el miércoles a las 15:00 te puedes borrar desde el enlace de mesas." : "El plazo ya está cerrado: si tienes algún problema, escríbelo en el grupo de WhatsApp de mesas."}</p>
      <Link href={`/apuntarse-mesa/${token}?semana=${semana}`} className="btn-secundario w-full justify-center"><X size={15} className="hidden" /> Ver todas las mesas de esa semana</Link>
    </main>
  );
}
