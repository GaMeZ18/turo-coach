import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { qrSvg, urlPase } from "@/lib/eventos";
import { fechaLarga, hora } from "@/lib/fechas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pase · CB Turó", robots: { index: false } };

// Pase de entrada con el QR (se enseña en la puerta). El QR lleva la URL de esta página con un código secreto.
export default async function PasePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const db = adminClient();
  const { data } = db && /^[a-f0-9]{32}$/.test(codigo)
    ? await db.from("evento_pases").select("nombre, rol, dorsal, anulado, usado_at, evento_inscripciones(equipo, estado), eventos(nombre, fecha, lugar)").eq("codigo", codigo).maybeSingle()
    : { data: null };
  const p = data as unknown as { nombre: string; rol: string; dorsal: string | null; anulado: boolean; usado_at: string | null; evento_inscripciones: { equipo: string; estado: string } | null; eventos: { nombre: string; fecha: string | null; lugar: string | null } | null } | null;
  const valido = !!p && !p.anulado && p.evento_inscripciones?.estado === "aprobada";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-azul p-5 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-tinta shadow-2xl">
        <div className="bg-[#0d1b3e] px-5 py-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e7b53c]">CB Turó de la Peira · Pase</p>
          <p className="mt-1 text-lg font-bold leading-tight">{p?.eventos?.nombre ?? "Pase no válido"}</p>
          {p?.eventos?.fecha && <p className="text-sm capitalize text-white/70">{fechaLarga(p.eventos.fecha)} · {hora(p.eventos.fecha)}{p.eventos.lugar ? ` · ${p.eventos.lugar}` : ""}</p>}
        </div>
        {p && valido ? (
          <div className="p-5 text-center">
            <div className="mx-auto w-64 max-w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg(urlPase(codigo), 8) }} />
            <p className="mt-3 text-2xl font-bold leading-tight">{p.dorsal ? `#${p.dorsal} ` : ""}{p.nombre}</p>
            <p className="text-sm text-tinta/60">{p.evento_inscripciones?.equipo} · {p.rol === "entrenador" ? "Entrenador/a" : "Jugador/a"}</p>
            {p.usado_at && <p className="mt-2 rounded-lg bg-green-500/10 p-2 text-sm text-green-700">Entrada registrada el {fechaLarga(p.usado_at)} a las {hora(p.usado_at)}</p>}
            <p className="mt-3 text-xs text-tinta/50">Enseña este QR en la entrada. Sube el brillo de la pantalla. Es personal: no lo compartas.</p>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-5xl">⛔</p>
            <p className="mt-2 font-semibold">{p?.anulado ? "Este pase está anulado." : p ? "La inscripción de este pase no está aprobada." : "Este pase no existe."}</p>
            <p className="mt-1 text-sm text-tinta/60">Si crees que es un error, contacta con el club.</p>
          </div>
        )}
      </div>
    </main>
  );
}
