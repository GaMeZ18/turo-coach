import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { misEquipos } from "@/lib/equipo-activo";
import Enviar from "@/components/Enviar";
import Copiar from "./Copiar";
import { borrarEnlaceCalendario, crearEnlaceCalendario } from "../actions";
import { Apple, CalendarPlus, Smartphone, Trash2 } from "lucide-react";

type Enlace = { token: string; alcance: "mios" | "equipo" | "club"; equipo_id: string | null; created_at: string; equipos: { nombre: string } | null };

export default async function CalendarioMovil() {
  const { supabase } = await requireUser();
  const [{ equipos }, { data, error }, h] = await Promise.all([
    misEquipos(supabase),
    supabase.from("calendario_enlaces").select("token, alcance, equipo_id, created_at, equipos(nombre)").order("created_at"),
    headers(),
  ]);
  const enlaces = (data ?? []) as unknown as Enlace[];
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "coach.cbturo.com";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const nombre = (e: Enlace) => e.alcance === "club" ? "Partidos de todo el club" : e.alcance === "equipo" ? `Equipo ${e.equipos?.nombre ?? ""}` : "Mis equipos (entrenos, partidos y eventos)";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/calendario" className="text-sm text-tinta/60 hover:underline">← Calendario</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Smartphone className="text-azul" /> El calendario en tu móvil</h1>
      <p className="mt-1 text-sm text-tinta/70">
        Suscríbete una vez y los entrenos, partidos y eventos aparecerán en el calendario del móvil (iPhone o Android) y se
        actualizarán solos: si se cambia una hora, un pabellón o se aplaza un partido, también cambia allí.
      </p>

      {error && /calendario_enlaces/.test(error.message) && (
        <p className="tarjeta mt-4 p-3 text-sm text-red-700">Falta preparar la base de datos (0013_calendario_enlaces.sql).</p>
      )}

      <form action={crearEnlaceCalendario} className="tarjeta mt-5 grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="etiqueta">¿Qué quieres ver?</label>
          <select name="alcance" className="campo" defaultValue="mios">
            <option value="mios">Mis equipos (todo)</option>
            <option value="equipo">Un solo equipo</option>
            <option value="club">Partidos de todo el club</option>
          </select>
        </div>
        <div>
          <label className="etiqueta">Equipo (si eliges uno solo)</label>
          <select name="equipo_id" className="campo">
            {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <Enviar className="btn-primario"><CalendarPlus size={16} /> Crear calendario</Enviar>
      </form>

      <div className="mt-5 space-y-3">
        {enlaces.map((e) => {
          const https = `${proto}://${host}/cal/${e.token}.ics`;
          const webcal = https.replace(/^https?:/, "webcal:");
          const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
          return (
            <div key={e.token} className="tarjeta p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{nombre(e)}</p>
                <form action={borrarEnlaceCalendario}>
                  <input type="hidden" name="token" value={e.token} />
                  <Enviar className="btn-peligro !px-2 !py-1" title="Dejar de compartir este calendario" confirmar="¿Desactivar este enlace? Los móviles suscritos dejarán de recibir los cambios."><Trash2 size={14} /></Enviar>
                </form>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={webcal} className="btn-primario !py-1.5 text-sm"><Apple size={15} /> iPhone / iPad / Mac</a>
                <a href={google} target="_blank" rel="noopener" className="btn-primario !py-1.5 text-sm"><Smartphone size={15} /> Android / Google Calendar</a>
                <Copiar texto={https} />
              </div>
              <p className="mt-2 break-all text-[11px] text-tinta/40">{https}</p>
            </div>
          );
        })}
        {enlaces.length === 0 && !error && <p className="text-sm text-tinta/50">Todavía no has creado ningún calendario. Elige qué quieres ver y pulsa «Crear calendario».</p>}
      </div>

      <section className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="tarjeta p-4">
          <h2 className="flex items-center gap-1.5 font-semibold"><Apple size={16} /> iPhone</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-tinta/80">
            <li>Abre esta página en el iPhone y pulsa <strong>«iPhone / iPad / Mac»</strong>.</li>
            <li>Confirma <strong>«Suscribirse»</strong> y después <strong>«Añadir»</strong>.</li>
            <li>Listo: lo verás en la app Calendario con el nombre «CB Turó».</li>
          </ol>
        </div>
        <div className="tarjeta p-4">
          <h2 className="flex items-center gap-1.5 font-semibold"><Smartphone size={16} /> Android</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-tinta/80">
            <li>Pulsa <strong>«Android / Google Calendar»</strong> (con tu cuenta de Google) y confirma <strong>«Añadir»</strong>.</li>
            <li>En la app Google Calendar: menú ☰ → Ajustes → activa <strong>«Sincronizar»</strong> en el calendario «CB Turó».</li>
            <li>Si no se abre, copia el enlace y en calendar.google.com → «Otros calendarios» → «+» → «Desde URL».</li>
          </ol>
          <p className="mt-2 text-xs text-tinta/50">Google actualiza los calendarios suscritos cada pocas horas; el iPhone, según su ajuste de «Obtener datos».</p>
        </div>
      </section>
      <p className="mt-4 text-xs text-tinta/50">El enlace es secreto: quien lo tenga puede ver ese calendario (no puede cambiar nada). Si lo compartes por error, bórralo y crea otro.</p>
    </div>
  );
}
