import Link from "@/components/Enlace";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireUser, veTorneos } from "@/lib/supabase/server";
import { FORMATOS, type Formato } from "@/lib/torneos";
import Enviar from "@/components/Enviar";
import { crearTorneo } from "./actions";
import CamposTorneo from "./CamposTorneo";

export const metadata = { title: "Torneos" };

export default async function TorneosPage() {
  const { supabase, perfil } = await requireUser();
  if (!veTorneos(perfil)) notFound();
  const { data } = await supabase.from("torneos").select("id, nombre, categoria, fecha_inicio, lugar, formato, publico, torneo_equipos(count)").order("fecha_inicio", { ascending: false, nullsFirst: true });
  const torneos = (data ?? []) as unknown as { id: string; nombre: string; categoria: string | null; fecha_inicio: string | null; lugar: string | null; formato: Formato; publico: boolean; torneo_equipos: { count: number }[] }[];
  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><Trophy className="text-azul" /> Torneos</h1>
      <p className="text-sm text-tinta/60">Crea torneos del club: equipos, grupos, calendario con horario, resultados, clasificación y cuadro. Solo lo ves tú; si quieres, cada torneo tiene un enlace público para compartirlo.</p>

      <details className="tarjeta mt-5 p-4">
        <summary className="cursor-pointer font-semibold text-azul">+ Nuevo torneo</summary>
        <form action={crearTorneo} className="mt-3">
          <CamposTorneo />
          <div className="mt-3"><Enviar>Crear torneo</Enviar></div>
        </form>
      </details>

      <ul className="mt-5 space-y-2">
        {torneos.map((t) => (
          <li key={t.id}>
            <Link href={`/torneos/${t.id}`} className="tarjeta flex items-center gap-3 p-3 hover:shadow-md">
              <Trophy size={20} className="shrink-0 text-azul" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.nombre}{t.categoria ? ` · ${t.categoria}` : ""}</span>
                <span className="block text-xs text-tinta/60">{[t.fecha_inicio ? new Date(`${t.fecha_inicio}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : null, t.lugar, FORMATOS[t.formato], `${t.torneo_equipos[0]?.count ?? 0} equipos`].filter(Boolean).join(" · ")}</span>
              </span>
              {t.publico && <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-bold text-green-700">PÚBLICO</span>}
            </Link>
          </li>
        ))}
        {!torneos.length && <li className="text-sm text-tinta/50">Aún no has creado ningún torneo.</li>}
      </ul>
    </div>
  );
}
