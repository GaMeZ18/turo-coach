import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { fechaCorta } from "@/lib/fechas";
import { ArrowLeft, BellRing, BellOff, Smartphone } from "lucide-react";

const servicio = (endpoint: string) => {
  const h = new URL(endpoint).host;
  return h.includes("apple") ? "Apple (iPhone/iPad/Mac)" : h.includes("fcm") || h.includes("google") ? "Google (Android/Chrome)" : h.includes("mozilla") ? "Firefox" : h.includes("windows") ? "Edge" : h;
};

/** Quién tiene los avisos activados en el móvil y en qué dispositivos (solo coordinadores) */
export default async function AvisosActivados() {
  const { perfil } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");
  const db = adminClient();
  if (!db) return <p className="tarjeta p-4 text-sm">Falta la clave de servicio en el servidor.</p>;
  const [{ data: perfR }, { data: subR }] = await Promise.all([
    db.from("perfiles").select("id, nombre, email, rol").order("nombre"),
    db.from("push_suscripciones").select("perfil_id, endpoint, dispositivo, created_at").order("created_at"),
  ]);
  const subs = (subR ?? []) as { perfil_id: string; endpoint: string; dispositivo: string | null; created_at: string }[];
  const personas = ((perfR ?? []) as { id: string; nombre: string | null; email: string | null; rol: string }[])
    .map((p) => ({ ...p, subs: subs.filter((s) => s.perfil_id === p.id) }))
    .sort((a, b) => (a.subs.length ? 0 : 1) - (b.subs.length ? 0 : 1) || (a.nombre ?? "").localeCompare(b.nombre ?? ""));
  const con = personas.filter((p) => p.subs.length).length;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/coordinacion" className="inline-flex items-center gap-1 text-sm text-tinta/60 hover:text-tinta"><ArrowLeft size={15} /> Coordinación</Link>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><BellRing className="text-azul" /> Avisos activados</h1>
        <p className="text-sm text-tinta/60"><strong>{con}</strong> de {personas.length} personas reciben los avisos en algún dispositivo. Los que no, solo los ven al abrir la app.</p>
      </div>
      <ul className="tarjeta divide-y divide-linea">
        {personas.map((p) => (
          <li key={p.id} className="flex items-start gap-3 p-3 text-sm">
            {p.subs.length ? <BellRing size={18} className="mt-0.5 shrink-0 text-green-700" /> : <BellOff size={18} className="mt-0.5 shrink-0 text-tinta/30" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.nombre ?? "Sin nombre"} <span className="text-xs font-normal text-tinta/50">{p.rol === "coordinador" ? "· coordinador" : ""}</span></p>
              {p.subs.length ? (
                <ul className="mt-0.5 space-y-0.5 text-xs text-tinta/70">
                  {p.subs.map((s) => (
                    <li key={s.endpoint} className="flex items-center gap-1"><Smartphone size={12} /> {s.dispositivo ?? servicio(s.endpoint)} <span className="text-tinta/40">· desde {fechaCorta(s.created_at)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-xs text-tinta/50">Sin avisos en el móvil</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-tinta/50">Si alguien desinstala la app o quita el permiso, desaparece de aquí al siguiente aviso que no le pueda llegar. Los dispositivos activados antes de hoy salen con el nombre del servicio hasta que esa persona vuelva a abrir la app.</p>
    </div>
  );
}
