"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { crearComunicado } from "./actions";

type Persona = { id: string; nombre: string; rol: string; mesas: boolean };
type EquipoStaff = { id: string; nombre: string; perfiles: string[] };

/** Formulario: título, mensaje, enlace opcional, a quién y cuándo */
export default function NuevoComunicado({ personas, equipos }: { personas: Persona[]; equipos: EquipoStaff[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [programar, setProgramar] = useState(false);
  const [res, setRes] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const poner = (ids: string[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  const grupo = (ids: string[]) => ({ ids, on: ids.length > 0 && ids.every((id) => sel.has(id)) });
  const grupos = [
    { t: "Todos", ...grupo(personas.map((p) => p.id)) },
    { t: "Coordinadores", ...grupo(personas.filter((p) => p.rol === "coordinador").map((p) => p.id)) },
    { t: "Entrenadores", ...grupo(personas.filter((p) => p.rol !== "coordinador").map((p) => p.id)) },
    { t: "Gestor de mesas", ...grupo(personas.filter((p) => p.mesas).map((p) => p.id)) },
  ].filter((g) => g.ids.length);

  const enviar = (fd: FormData) => start(async () => {
    sel.forEach((id) => fd.append("perfil", id));
    if (!programar) { fd.delete("dia"); fd.delete("hora"); }
    const r = await crearComunicado(fd);
    setRes(r);
    if (r.ok) { form.current?.reset(); setSel(new Set()); setProgramar(false); }
  });

  return (
    <form ref={form} action={enviar} className="tarjeta space-y-3 p-4">
      <div><label className="etiqueta">Título</label><input name="titulo" required maxLength={120} className="campo" placeholder="Reunión de entrenadores el jueves" /></div>
      <div><label className="etiqueta">Mensaje</label><textarea name="cuerpo" rows={4} maxLength={2000} className="campo" placeholder="Escribe lo que quieras comunicar…" /></div>
      <div><label className="etiqueta">Enlace al tocar el aviso (opcional)</label>
        <select name="url" className="campo" defaultValue="">
          <option value="">Página de Avisos</option>
          <option value="/calendario">Calendario</option>
          <option value="/entrenamientos">Entrenamientos</option>
          <option value="/partidos">Partidos</option>
          <option value="/planificaciones">Planificaciones</option>
          <option value="/biblioteca">Biblioteca</option>
          <option value="/mesas">Mesas</option>
        </select>
      </div>

      <div>
        <label className="etiqueta">Para quién ({sel.size})</label>
        <div className="flex flex-wrap gap-1.5">
          {grupos.map((g) => (
            <button key={g.t} type="button" onClick={() => poner(g.ids, !g.on)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${g.on ? "border-azul bg-azul text-white" : "border-linea bg-white"}`}>{g.t}</button>
          ))}
          {sel.size > 0 && <button type="button" onClick={() => setSel(new Set())} className="px-2 text-xs text-tinta/60 underline">Quitar todos</button>}
        </div>
        {equipos.length > 0 && (
          <>
            <p className="mt-2 text-[11px] uppercase text-tinta/50">Por equipo (su cuerpo técnico)</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {equipos.map((e) => { const g = grupo(e.perfiles); return (
                <button key={e.id} type="button" onClick={() => poner(e.perfiles, !g.on)} className={`rounded-full border px-2.5 py-0.5 text-xs ${g.on ? "border-azul bg-azul/10 text-azul" : "border-linea bg-white"}`}>{e.nombre}</button>
              ); })}
            </div>
          </>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-azul">Elegir personas una a una</summary>
          <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-suave">
                <input type="checkbox" checked={sel.has(p.id)} onChange={(ev) => poner([p.id], ev.target.checked)} />
                <span className="truncate">{p.nombre}</span>
                <span className="text-[10px] uppercase text-tinta/40">{p.rol === "coordinador" ? "coord." : ""}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={programar} onChange={(e) => setProgramar(e.target.checked)} /> Programar para más tarde</label>
        {programar && (
          <>
            <div><label className="etiqueta">Día</label><input type="date" name="dia" required className="campo" /></div>
            <div><label className="etiqueta">Hora</label><input type="time" name="hora" required className="campo" /></div>
          </>
        )}
        <button disabled={pendiente || !sel.size} className="btn-primario ml-auto">{pendiente ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {programar ? "Programar" : "Enviar ahora"}</button>
      </div>
      {res && <p className={`text-sm ${res.ok ? "text-green-700" : "text-red-700"}`}>{res.ok ?? res.error}</p>}
      <p className="text-xs text-tinta/50">Los programados se envían en los 15 minutos siguientes a la hora elegida.</p>
    </form>
  );
}
