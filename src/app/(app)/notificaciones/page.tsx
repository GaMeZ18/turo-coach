import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { VAPID_PUBLICO } from "@/lib/notificar";
import Enviar from "@/components/Enviar";
import ActivarAvisos from "./ActivarAvisos";
import { marcarLeidas } from "./actions";

export default async function NotificacionesPage() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("notificaciones").select("id, titulo, cuerpo, url, leida, created_at").eq("perfil_id", user.id).order("created_at", { ascending: false }).limit(100);
  const lista = data ?? [];
  const sinLeer = lista.filter((n) => !n.leida).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Avisos</h1>
        {sinLeer > 0 && <form action={marcarLeidas}><Enviar className="btn-secundario !py-1.5 text-sm">Marcar todo como leído</Enviar></form>}
      </div>
      <div className="mt-4"><ActivarAvisos clavePublica={VAPID_PUBLICO} /></div>
      {error && /notificaciones/.test(error.message) && <p className="tarjeta mt-4 p-3 text-sm text-red-700">Ejecuta <code>0010_notificaciones.sql</code> en Supabase.</p>}
      <ul className="tarjeta mt-4 divide-y divide-linea">
        {lista.map((n) => {
          const cuerpo = (
            <>
              <p className={`text-sm ${n.leida ? "" : "font-semibold"}`}>{!n.leida && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rojo" />}{n.titulo}</p>
              {n.cuerpo && <p className="text-sm text-tinta/70">{n.cuerpo}</p>}
              <p className="text-xs text-tinta/40">{new Date(n.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </>
          );
          return <li key={n.id} className="px-3 py-2">{n.url ? <Link href={n.url} className="block hover:text-azul">{cuerpo}</Link> : cuerpo}</li>;
        })}
        {!lista.length && <li className="px-3 py-4 text-sm text-tinta/50">No hay avisos. Llegarán cuando la FCBQ cambie un horario, una pista, aplace un partido o publique un resultado.</li>}
      </ul>
    </div>
  );
}
