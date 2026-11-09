"use client";

import { useRef, useState, useTransition, type FocusEvent } from "react";
import { Loader2, Megaphone, Newspaper, Send, Smile } from "lucide-react";
import { crearComunicado } from "./actions";

type Persona = { id: string; nombre: string; rol: string; mesas: boolean };
const EMOJIS = "🏀 ⛹️ 🏆 🥇 🔥 💪 👏 🙌 👍 ✅ ❌ ⚠️ 📢 📣 📰 📅 🗓️ ⏰ 📍 🏟️ 🚌 🎉 🥳 ❤️ 💙 💛 😀 😉 🙏 👀 ✍️ 📝 📎 🔗 ☎️ 💬 ℹ️ ❗ ⭐ 🎯".split(" ");
type EquipoStaff = { id: string; nombre: string; perfiles: string[] };

/** Formulario: título, mensaje, enlace opcional, a quién y cuándo */
export default function NuevoComunicado({ personas, equipos }: { personas: Persona[]; equipos: EquipoStaff[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [programar, setProgramar] = useState(false);
  const [res, setRes] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<"comunicado" | "noticia">("comunicado");
  const [emojis, setEmojis] = useState(false);
  const ultimo = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const foco = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { ultimo.current = e.currentTarget; };
  /** Mete el emoji donde está el cursor (en el último campo usado) */
  const meter = (em: string) => {
    const c = ultimo.current ?? (form.current?.elements.namedItem("cuerpo") as HTMLTextAreaElement | null);
    if (!c) return;
    const i = c.selectionStart ?? c.value.length, f = c.selectionEnd ?? i;
    c.value = c.value.slice(0, i) + em + c.value.slice(f);
    c.focus(); c.setSelectionRange(i + em.length, i + em.length);
  };

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
    fd.set("tipo", tipo);
    if (!programar) { fd.delete("dia"); fd.delete("hora"); }
    const r = await crearComunicado(fd);
    setRes(r);
    if (r.ok) { form.current?.reset(); setSel(new Set()); setProgramar(false); setEmojis(false); }
  });

  return (
    <form ref={form} action={enviar} className="tarjeta space-y-3 p-4">
      <div className="flex rounded-lg border border-linea p-0.5 text-sm">
        {([["comunicado", "Comunicado", "Se ve una vez en Avisos y en el móvil"], ["noticia", "Noticia del club", "Además se guarda en Noticias para consultarla"]] as const).map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => setTipo(k)} title={d} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${tipo === k ? "bg-azul text-white" : "text-tinta/70"}`}>
            {k === "noticia" ? <Newspaper size={15} /> : <Megaphone size={15} />} {t}
          </button>
        ))}
      </div>
      <p className="text-xs text-tinta/60">{tipo === "noticia" ? "La noticia se guarda en el apartado Noticias (todos la pueden consultar cuando quieran) y avisa a quien elijas." : "El comunicado llega a Avisos y al móvil. Al leerlo, desaparece de Avisos."}</p>
      <div><label className="etiqueta">Título</label><input name="titulo" required maxLength={120} onFocus={foco} className="campo" placeholder={tipo === "noticia" ? "El Infantil A, campeón del torneo de Nadal 🏆" : "Reunión de entrenadores el jueves"} /></div>
      <div><label className="etiqueta">{tipo === "noticia" ? "Resumen (lo que sale en el aviso)" : "Mensaje"}</label><textarea name="cuerpo" rows={tipo === "noticia" ? 2 : 4} maxLength={2000} onFocus={foco} className="campo" placeholder="Escribe lo que quieras comunicar…" /></div>
      {tipo === "noticia" && (
        <div>
          <label className="etiqueta">Texto de la noticia</label>
          <textarea name="contenido" rows={10} maxLength={20000} onFocus={foco} className="campo font-[inherit]" placeholder={"Escribe la noticia completa.\n\nDeja una línea en blanco entre párrafos.\n**Negrita** con dos asteriscos.\n- Listas empezando con guion\n[Texto del enlace](https://cbturo.com) o pega el enlace tal cual."} />
          <p className="mt-1 text-[11px] text-tinta/50">Formato: línea en blanco = párrafo nuevo · **negrita** · «- » para listas · [texto](enlace) · los enlaces pegados se pueden tocar.</p>
        </div>
      )}
      <div>
        <button type="button" onClick={() => setEmojis((v) => !v)} className="inline-flex items-center gap-1 text-sm text-azul"><Smile size={16} /> Emojis</button>
        {emojis && (
          <div className="mt-1 flex flex-wrap gap-1 rounded-lg border border-linea bg-suave p-1.5">
            {EMOJIS.map((e) => <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => meter(e)} className="h-8 w-8 rounded text-lg hover:bg-white">{e}</button>)}
          </div>
        )}
      </div>
      {tipo === "comunicado" && <div><label className="etiqueta">Enlace al tocar el aviso (opcional)</label>
        <select name="url" className="campo" defaultValue="">
          <option value="">Página de Avisos</option>
          <option value="/calendario">Calendario</option>
          <option value="/entrenamientos">Entrenamientos</option>
          <option value="/partidos">Partidos</option>
          <option value="/planificaciones">Planificaciones</option>
          <option value="/biblioteca">Biblioteca</option>
          <option value="/mesas">Mesas</option>
          <option value="/noticias">Noticias</option>
        </select>
      </div>}

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
        <button disabled={pendiente || !sel.size} className="btn-primario ml-auto">{pendiente ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {programar ? "Programar" : tipo === "noticia" ? "Publicar y avisar" : "Enviar ahora"}</button>
      </div>
      {res && <p className={`text-sm ${res.ok ? "text-green-700" : "text-red-700"}`}>{res.ok ?? res.error}</p>}
      <p className="text-xs text-tinta/50">Los programados se envían en los 15 minutos siguientes a la hora elegida.</p>
    </form>
  );
}
