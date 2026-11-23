import type { Metadata } from "next";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import Cabecera from "@/components/publico/Cabecera";
import AutoRefresco from "@/components/AutoRefresco";
import { CAMPOS_EVENTO, CAMPOS_INSCRIPCION, ESTADOS, euros, ibanBonito, type Evento, type Inscripcion, type Pase } from "@/lib/eventos";
import { fechaLarga, hora } from "@/lib/fechas";
import Justificante from "./Justificante";
import Copiar from "./Copiar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu inscripción", robots: { index: false } };

export default async function EstadoInscripcion({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const db = adminClient();
  const { data: ins } = db && /^[a-f0-9]{32}$/.test(codigo) ? await db.from("evento_inscripciones").select(CAMPOS_INSCRIPCION).eq("codigo", codigo).maybeSingle() : { data: null };
  if (!db || !ins) return <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-semibold">Inscripción no encontrada</h1><p className="mt-2 text-sm text-tinta/60">Revisa el enlace del email.</p></main>;
  const i = ins as Inscripcion;
  const [{ data: ev }, { data: ps }] = await Promise.all([
    db.from("club_eventos").select(CAMPOS_EVENTO).eq("id", i.evento_id).single(),
    i.estado === "aprobada" ? db.from("evento_pases").select("id, codigo, nombre, rol, dorsal, anulado, usado_at, inscripcion_id").eq("inscripcion_id", i.id).order("rol", { ascending: false }).order("nombre") : Promise.resolve({ data: [] }),
  ]);
  const evento = ev as Evento, pases = (ps ?? []) as Pase[];
  const e = ESTADOS[i.estado];
  const pagar = i.estado === "pendiente_pago" || i.estado === "rechazada" || i.estado === "pendiente_validacion";
  return (
    <div className="min-h-dvh bg-suave">
      <Cabecera sub="Inscripción" />
      <AutoRefresco />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="tarjeta p-4">
          <p className="text-xs uppercase tracking-wide text-tinta/50">{evento.nombre}{evento.fecha ? ` · ${fechaLarga(evento.fecha)}` : ""}</p>
          <h1 className="mt-1 text-2xl font-bold">{i.equipo}</h1>
          <p className="text-sm text-tinta/60">{i.personas.length} personas · {euros(i.importe)} · Ref. {i.referencia}</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-sm font-semibold ${e.c}`}>{e.t}</span>
          {i.estado === "rechazada" && i.motivo && <p className="mt-2 rounded-lg bg-red-500/10 p-2 text-sm text-red-700">Motivo: {i.motivo}. Revisa el pago y vuelve a subir el justificante.</p>}
          {i.estado === "pendiente_validacion" && <p className="mt-2 text-sm text-tinta/70">Hemos recibido el justificante. El club lo revisará y, al aprobarlo, recibiréis los pases por email en {i.email}.</p>}
          <p className="mt-3 text-xs text-tinta/50">Guarda esta página: es tu enlace para ver el estado y los pases.</p>
        </section>

        {pagar && evento.pago_transferencia && i.importe > 0 && (
          <section className="tarjeta space-y-3 p-4">
            <h2 className="font-semibold">Pagar por transferencia</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-suave p-2"><dt className="text-tinta/60">IBAN</dt><dd className="flex items-center gap-2 font-mono font-semibold">{ibanBonito(evento.iban)}<Copiar texto={(evento.iban ?? "").replace(/\s+/g, "")} /></dd></div>
              {evento.titular && <div className="flex items-center justify-between gap-2 rounded-lg bg-suave p-2"><dt className="text-tinta/60">Titular</dt><dd className="font-semibold">{evento.titular}</dd></div>}
              <div className="flex items-center justify-between gap-2 rounded-lg bg-suave p-2"><dt className="text-tinta/60">Importe</dt><dd className="flex items-center gap-2 font-semibold">{euros(i.importe)}<Copiar texto={(i.importe / 100).toFixed(2).replace(".", ",")} /></dd></div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-suave p-2"><dt className="text-tinta/60">Concepto</dt><dd className="flex items-center gap-2 font-mono font-semibold">{i.referencia}<Copiar texto={i.referencia} /></dd></div>
            </dl>
            <p className="text-xs text-tinta/60">Pon el concepto exacto para que podamos identificar el pago. Después, sube aquí la captura o el PDF del justificante.</p>
            <Justificante codigo={codigo} yaSubido={!!i.comprobante && i.estado === "pendiente_validacion"} />
          </section>
        )}

        {i.estado === "aprobada" && (
          <section className="tarjeta p-4">
            <h2 className="font-semibold">🎟️ Pases del equipo</h2>
            <p className="text-xs text-tinta/60">Cada persona enseña su QR en la entrada{evento.fecha ? ` el ${fechaLarga(evento.fecha)} a partir de las ${hora(evento.fecha)}` : ""}. Puedes reenviar a cada uno su enlace.</p>
            <ul className="mt-3 divide-y divide-linea">
              {pases.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{p.dorsal ? `#${p.dorsal} ` : ""}{p.nombre} <span className="text-xs text-tinta/50">{p.rol === "entrenador" ? "· Entrenador" : ""}</span></span>
                  {p.usado_at ? <span className="text-xs text-green-700">Ha entrado</span> : <Link href={`/pase/${p.codigo}`} className="btn-secundario !py-1 text-xs">Ver pase</Link>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
