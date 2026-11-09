import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { gestionaMesas, requireUser } from "@/lib/supabase/server";
import { aISO, fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import { lunesDe, sumarDias } from "@/lib/pistas";
import { partidosDeCasa, euros, POR_MESA, textoPartido, detalleMesa, type Asignacion } from "@/lib/mesas";
import Enviar from "@/components/Enviar";
import Copiar from "./Copiar";
import { alternarFederada, asignar, borrarPartidoManual, confirmar, crearPartidoManual, desconfirmar, guardarImporte, nuevoEnlace, quitar } from "./actions";
import { ChevronLeft, ChevronRight, ClipboardCheck, Link2, Settings, Wallet, X, Check, Undo2, Plus, Trash2 } from "lucide-react";

export default async function Mesas({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { supabase, perfil } = await requireUser();
  if (!gestionaMesas(perfil)) redirect("/");
  const { semana } = await searchParams;
  const lunes = lunesDe(semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : hoyLocal());
  const desde = aISO(lunes, "00:00"), hasta = aISO(sumarDias(lunes, 7), "00:00");

  const partidos = await partidosDeCasa(supabase, desde, hasta);
  const [{ data: asigR }, { data: personasR }, { data: cfg }, { data: t }, { data: pistasR }] = await Promise.all([
    partidos.length ? supabase.from("mesa_asignaciones").select("id, partido_id, persona_id, estado, importe, created_at, mesa_personas(nombre, telefono)").in("partido_id", partidos.map((p) => p.id)).order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("mesa_personas").select("id, nombre, telefono").eq("activo", true).order("nombre"),
    supabase.from("mesa_config").select("token, importe").maybeSingle(),
    supabase.from("temporadas").select("id").eq("actual", true).maybeSingle(),
    supabase.from("pistas").select("nombre").order("orden"),
  ]);
  if (!cfg) {
    return <p className="tarjeta p-4 text-sm">Falta preparar la base de datos de mesas (migración 0023_mesas.sql).</p>;
  }
  const { data: equiposR } = t ? await supabase.from("equipos").select("id, nombre, mesa_federada").eq("temporada_id", t.id).order("nombre") : { data: [] };
  const asig = (asigR ?? []) as unknown as Asignacion[];
  const personas = (personasR ?? []) as { id: string; nombre: string; telefono: string | null }[];
  const h = await headers();
  const enlace = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/apuntarse-mesa/${cfg.token}`;

  const deClub = partidos.filter((p) => !p.federada);
  const conf = (id: string) => asig.filter((a) => a.partido_id === id && a.estado === "confirmado");
  const cand = (id: string) => asig.filter((a) => a.partido_id === id && a.estado === "candidato");
  const completas = deClub.filter((p) => conf(p.id).length >= p.plazas).length;
  const resumen = [`🏀 Mesas CB Turó · semana del ${fechaCorta(desde)}`, "",
    ...deClub.map((p) => `${fechaCorta(p.fecha)} ${hora(p.fecha)} · ${p.equipo} vs ${p.rival}\n   👉 ${conf(p.id).map((a) => a.mesa_personas?.nombre).join(" y ") || "¡FALTA GENTE!"}`)].join("\n");
  // Mensaje de la semana que se está viendo: solo esos partidos, y el enlace abre esa semana
  const enlaceSemana = `${enlace}?semana=${lunes}`;
  const pendientes = deClub.filter((p) => conf(p.id).length < p.plazas && p.fecha > new Date().toISOString());
  const invitacion = [`🏀 Mesas CB Turó · semana del ${fechaCorta(desde)}`, "",
    pendientes.length ? "Necesitamos gente para estas mesas:" : "Partidos de casa de la semana:",
    ...(pendientes.length ? pendientes : deClub).map((p) => `• ${textoPartido(p)}${p.manual ? " (1 persona, la pagan los jugadores)" : ""}`), "",
    `Mesas del club: ${euros(Number(cfg.importe))} por persona y partido. Apúntate a las que puedas (hasta el viernes):`, enlaceSemana].join("\n");
  const whatsapp = (tel: string, nombre: string, p: { fecha: string; equipo: string; rival: string; lugar: string | null }) =>
    `https://wa.me/${tel.replace(/[^\d]/g, "").replace(/^(?!34)(\d{9})$/, "34$1")}?text=${encodeURIComponent(`Hola ${nombre.split(" ")[0]}! Te confirmo la mesa:\n${detalleMesa(p)}\n¡Gracias!`)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><ClipboardCheck className="text-azul" /> Mesas</h1>
          <p className="text-sm text-tinta/60">Partidos de casa · {POR_MESA} personas por mesa · {euros(Number(cfg.importe))} por persona · Los añadidos a mano: 1 persona, la pagan los jugadores</p>
        </div>
        <Link href="/mesas/pagos" className="btn-secundario"><Wallet size={16} /> Pagos del mes</Link>
      </div>

      <section className="tarjeta flex flex-wrap items-center gap-2 p-3 text-sm">
        <Link2 size={18} className="text-azul" />
        <span className="font-semibold">Enlace para apuntarse:</span>
        <code className="min-w-0 flex-1 truncate rounded bg-suave px-2 py-1 text-xs">{enlace}</code>
        <Copiar texto={enlace} etiqueta="Copiar enlace" />
        <Copiar texto={invitacion} etiqueta="Mensaje de esta semana para WhatsApp" />
        <form action={nuevoEnlace}><Enviar className="btn-secundario !py-1 text-xs">Cambiar enlace</Enviar></form>
      </section>

      <div className="flex items-center gap-2">
        <Link href={`?semana=${sumarDias(lunes, -7)}`} className="btn-secundario !px-2" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
        <div className="flex-1 text-center">
          <p className="font-semibold capitalize">Semana del {fechaCorta(desde)}</p>
          <p className="text-xs text-tinta/60">{deClub.length} mesas del club · {completas} completas · {partidos.length - deClub.length} federadas</p>
        </div>
        <Link href={`?semana=${sumarDias(lunes, 7)}`} className="btn-secundario !px-2" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
      </div>

      <details className="tarjeta p-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-azul"><Plus size={16} /> Añadir partido a mano (no federado)</summary>
        <p className="mt-1 text-xs text-tinta/60">Para partidos que no vienen de la federación: mesa de 1 persona y sin importe (la pagan los jugadores en efectivo). Saldrá también en el enlace para apuntarse.</p>
        <form action={crearPartidoManual} className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <label className="etiqueta">Equipo</label>
            <select name="equipo_id" className="campo" defaultValue="">
              <option value="">— Otro (escríbelo) —</option>
              {((equiposR ?? []) as { id: string; nombre: string }[]).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <input name="equipo_nombre" placeholder="Si es otro: nombre del equipo" className="campo mt-1" />
          </div>
          <div><label className="etiqueta">Rival</label><input name="rival" required className="campo" placeholder="Escola …" /></div>
          <div>
            <label className="etiqueta">Pista</label>
            <input name="lugar" list="pistas-mesa" className="campo" placeholder="Pista o pabellón" />
            <datalist id="pistas-mesa">{((pistasR ?? []) as { nombre: string }[]).map((x) => <option key={x.nombre} value={x.nombre} />)}</datalist>
          </div>
          <div><label className="etiqueta">Día</label><input type="date" name="dia" required defaultValue={lunes} className="campo" /></div>
          <div><label className="etiqueta">Hora</label><input type="time" name="hora" required className="campo" /></div>
          <div className="flex items-end"><Enviar className="btn-primario w-full justify-center">Añadir partido</Enviar></div>
        </form>
      </details>

      {partidos.length === 0 && <p className="tarjeta p-4 text-sm text-tinta/60">No hay partidos de casa esta semana.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {partidos.map((p) => {
          const c = conf(p.id), k = cand(p.id), llena = c.length >= p.plazas;
          return (
            <article key={p.id} className={`tarjeta p-3 ${p.federada ? "opacity-70" : llena ? "ring-1 ring-green-400" : "ring-1 ring-amber-300"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs capitalize text-tinta/60">{fechaCorta(p.fecha)} · {hora(p.fecha)}{p.lugar ? ` · ${p.lugar}` : ""}</p>
                  <p className="font-semibold">{p.equipo} <span className="font-normal text-tinta/60">vs</span> {p.rival}</p>
                  {p.manual && <p className="text-[11px] font-semibold text-azul">Añadido a mano · 1 persona · la pagan los jugadores</p>}
                </div>
                {p.federada ? <span className="rounded bg-suave px-2 py-0.5 text-[11px] font-semibold uppercase text-tinta/60">Mesa federada</span>
                  : <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${llena ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{c.length}/{p.plazas}</span>}
                {p.manual && <form action={borrarPartidoManual}><input type="hidden" name="id" value={p.id} /><Enviar className="text-tinta/40 hover:text-red-700" title="Borrar este partido" confirmar={`¿Borrar ${p.equipo} vs ${p.rival}?`}><Trash2 size={15} /></Enviar></form>}
              </div>
              {!p.federada && (
                <div className="mt-2 space-y-2 text-sm">
                  <ul className="space-y-1">
                    {c.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded bg-green-50 px-2 py-1">
                        <Check size={14} className="text-green-700" />
                        <span className="flex-1">{a.mesa_personas?.nombre} {a.mesa_personas?.telefono && <a href={`tel:${a.mesa_personas.telefono}`} className="text-xs text-tinta/50">{a.mesa_personas.telefono}</a>}</span>
                        {a.mesa_personas?.telefono && <a href={whatsapp(a.mesa_personas.telefono, a.mesa_personas.nombre, p)} target="_blank" rel="noopener noreferrer" title="Avisarle por WhatsApp" className="rounded bg-green-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">WhatsApp</a>}
                        <form action={desconfirmar}><input type="hidden" name="id" value={a.id} /><button title="Quitar la confirmación" className="text-tinta/50 hover:text-tinta"><Undo2 size={15} /></button></form>
                        <form action={quitar}><input type="hidden" name="id" value={a.id} /><button title="Quitar de la mesa" className="text-tinta/50 hover:text-red-700"><X size={15} /></button></form>
                      </li>
                    ))}
                  </ul>
                  {k.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-tinta/50">Apuntados ({k.length})</p>
                      <ul className="mt-1 space-y-1">
                        {k.map((a) => (
                          <li key={a.id} className="flex items-center gap-2 rounded border border-linea px-2 py-1">
                            <span className="flex-1">{a.mesa_personas?.nombre} {a.mesa_personas?.telefono && <span className="text-xs text-tinta/50">{a.mesa_personas.telefono}</span>}</span>
                            {!llena && <form action={confirmar}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="partido_id" value={p.id} /><Enviar className="btn-primario !px-2 !py-0.5 text-xs">Confirmar</Enviar></form>}
                            <form action={quitar}><input type="hidden" name="id" value={a.id} /><button title="Quitar" className="text-tinta/50 hover:text-red-700"><X size={15} /></button></form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!llena && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-azul">+ Poner a alguien</summary>
                      <form action={asignar} className="mt-2 grid gap-1.5 sm:grid-cols-[1fr_auto]">
                        <input type="hidden" name="partido_id" value={p.id} />
                        <select name="persona_id" className="campo !py-1 text-sm" defaultValue="">
                          <option value="">— Persona nueva (escribe abajo) —</option>
                          {personas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                        </select>
                        <span />
                        <input name="nombre" placeholder="Nombre (si es nueva)" className="campo !py-1 text-sm" />
                        <input name="telefono" placeholder="Teléfono" className="campo !py-1 text-sm sm:w-32" />
                        <Enviar className="btn-primario !py-1 text-xs sm:col-span-2">Añadir y confirmar</Enviar>
                      </form>
                    </details>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {deClub.length > 0 && (
        <section className="tarjeta p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Mesas de la semana para mandar al grupo</p>
            <Copiar texto={resumen} etiqueta="Copiar para WhatsApp" />
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-suave p-2 text-xs">{resumen}</pre>
        </section>
      )}

      <details className="tarjeta p-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Settings size={16} /> Ajustes de mesas</summary>
        <form action={guardarImporte} className="mt-3 flex items-end gap-2">
          <div><label className="etiqueta">Importe por persona y mesa (€)</label><input name="importe" defaultValue={String(cfg.importe)} className="campo !w-28" inputMode="decimal" /></div>
          <Enviar className="btn-secundario">Guardar</Enviar>
        </form>
        <p className="mt-1 text-xs text-tinta/50">Se aplica a las mesas que se asignen a partir de ahora.</p>
        <p className="mt-3 font-semibold">Equipos con mesa federada (no necesitan gente del club)</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {((equiposR ?? []) as { id: string; nombre: string; mesa_federada: boolean }[]).map((e) => (
            <li key={e.id}>
              <form action={alternarFederada}>
                <input type="hidden" name="id" value={e.id} /><input type="hidden" name="valor" value={e.mesa_federada ? "0" : "1"} />
                <button className={`rounded-full border px-3 py-1 text-xs ${e.mesa_federada ? "border-azul bg-azul text-white" : "border-linea bg-white"}`}>{e.nombre}{e.mesa_federada ? " · federada" : ""}</button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
