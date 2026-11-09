import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fechaCorta, hora } from "@/lib/fechas";
import Enviar from "@/components/Enviar";
import NuevoComunicado from "./NuevoComunicado";
import { borrarComunicado } from "./actions";
import { Megaphone, Clock, CheckCircle2, Trash2 } from "lucide-react";

/** Comunicados de coordinación: mensajes a quien elijas, ahora o programados (solo coordinadores) */
export default async function Comunicados() {
  const { supabase, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");
  const [{ data: perfR }, { data: staffR }, { data: t }, { data: comR }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, rol, gestor_mesas").order("nombre"),
    supabase.from("equipo_staff").select("equipo_id, perfil_id"),
    supabase.from("temporadas").select("id").eq("actual", true).maybeSingle(),
    supabase.from("comunicados").select("id, titulo, cuerpo, destinatarios, programado_para, enviado_en, created_at, perfiles(nombre)").order("created_at", { ascending: false }).limit(50),
  ]);
  const { data: eqR } = t ? await supabase.from("equipos").select("id, nombre").eq("temporada_id", t.id).order("nombre") : { data: [] };
  const personas = ((perfR ?? []) as { id: string; nombre: string | null; rol: string; gestor_mesas: boolean | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Sin nombre", rol: p.rol, mesas: !!p.gestor_mesas || p.rol === "gestor_mesas" }));
  const staff = (staffR ?? []) as { equipo_id: string; perfil_id: string }[];
  const equipos = ((eqR ?? []) as { id: string; nombre: string }[]).map((e) => ({ ...e, perfiles: staff.filter((s) => s.equipo_id === e.id).map((s) => s.perfil_id) })).filter((e) => e.perfiles.length);
  const nombreDe = (id: string) => personas.find((p) => p.id === id)?.nombre ?? "—";
  const lista = (comR ?? []) as unknown as { id: string; titulo: string; cuerpo: string; destinatarios: string[]; programado_para: string | null; enviado_en: string | null; created_at: string; perfiles: { nombre: string | null } | null }[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Megaphone className="text-azul" /> Comunicados</h1>
        <p className="text-sm text-tinta/60">Manda un mensaje a todo el club o a quien elijas. Les llega a «Avisos» y al móvil (si tienen los avisos activados). Puedes programarlo para más tarde.</p>
      </div>
      <NuevoComunicado personas={personas} equipos={equipos} />

      <section>
        <h2 className="font-semibold">Enviados y programados</h2>
        <ul className="mt-2 space-y-2">
          {lista.map((c) => (
            <li key={c.id} className="tarjeta p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{c.titulo}</p>
                  {c.cuerpo && <p className="whitespace-pre-line text-tinta/70">{c.cuerpo}</p>}
                  <p className="mt-1 text-xs text-tinta/50">
                    Para {c.destinatarios.length} persona{c.destinatarios.length === 1 ? "" : "s"}: {c.destinatarios.slice(0, 6).map(nombreDe).join(", ")}{c.destinatarios.length > 6 ? "…" : ""} · por {c.perfiles?.nombre ?? "—"}
                  </p>
                </div>
                {c.enviado_en ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"><CheckCircle2 size={13} /> {fechaCorta(c.enviado_en)} {hora(c.enviado_en)}</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"><Clock size={13} /> {c.programado_para ? `${fechaCorta(c.programado_para)} ${hora(c.programado_para)}` : "pendiente"}</span>
                    <form action={borrarComunicado}><input type="hidden" name="id" value={c.id} /><Enviar className="text-tinta/40 hover:text-red-700" title="Cancelar" confirmar="¿Cancelar este comunicado programado?"><Trash2 size={15} /></Enviar></form>
                  </div>
                )}
              </div>
            </li>
          ))}
          {!lista.length && <li className="text-sm text-tinta/50">Todavía no has mandado ningún comunicado.</li>}
        </ul>
      </section>
    </div>
  );
}
