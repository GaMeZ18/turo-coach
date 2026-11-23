"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { euros, importeDe, type Evento, type Persona } from "@/lib/eventos";
import { inscribir } from "../actions";

const vacia = (rol: Persona["rol"] = "jugador"): Persona => ({ nombre: "", rol, dorsal: "", email: "" });

export default function Formulario({ slug, evento }: { slug: string; evento: Evento }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState("");
  const [d, setD] = useState({ equipo: "", club: "", categoria: "", responsable: "", email: "", telefono: "", web: "" });
  const [personas, setPersonas] = useState<Persona[]>([...Array.from({ length: Math.max(evento.min_jugadores, 5) }, () => vacia()), vacia("entrenador")]);
  const [acepto, setAcepto] = useState(false);
  const validas = personas.filter((p) => p.nombre.trim());
  const jugadores = validas.filter((p) => p.rol === "jugador").length;
  const total = importeDe(evento, validas);
  const cambiar = (i: number, c: Partial<Persona>) => setPersonas((ps) => ps.map((p, j) => (j === i ? { ...p, ...c } : p)));
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    empezar(async () => {
      const r = await inscribir(slug, { ...d, personas: validas, acepto });
      if (r.error) setError(r.error);
      else router.push(`/inscripcion/estado/${r.codigo}`);
    });
  };
  const campo = (k: keyof typeof d, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="etiqueta">{label}</label><input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} className="campo" {...props} /></div>
  );
  return (
    <form onSubmit={enviar} className="space-y-4">
      <section className="tarjeta grid gap-2 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Equipo</h2>
        {campo("equipo", "Nombre del equipo", { required: true, placeholder: "Ej.: Sant Andreu U14 A" })}
        {campo("club", "Club", { placeholder: "Ej.: C.B. Sant Andreu" })}
        {campo("categoria", "Categoría", { placeholder: "U14 Masculino" })}
        <div className="hidden" aria-hidden><input tabIndex={-1} autoComplete="off" value={d.web} onChange={(e) => setD({ ...d, web: e.target.value })} name="web" /></div>
      </section>
      <section className="tarjeta grid gap-2 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Persona responsable</h2>
        <p className="-mt-1 text-xs text-tinta/60 sm:col-span-2">A este email llegarán los pases de todo el equipo.</p>
        {campo("responsable", "Nombre y apellidos", { required: true, autoComplete: "name" })}
        {campo("telefono", "Teléfono", { type: "tel", autoComplete: "tel" })}
        <div className="sm:col-span-2">{campo("email", "Email", { required: true, type: "email", autoComplete: "email" })}</div>
      </section>
      <section className="tarjeta p-4">
        <h2 className="font-semibold">Jugadores y entrenadores</h2>
        <p className="text-xs text-tinta/60">Cada uno recibe su propio pase QR. El email de cada jugador es opcional (si lo pones, le llega también a él).</p>
        <ul className="mt-3 space-y-2">
          {personas.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select value={p.rol} onChange={(e) => cambiar(i, { rol: e.target.value as Persona["rol"] })} className="campo w-32" aria-label="Rol">
                <option value="jugador">Jugador/a</option><option value="entrenador">Entrenador/a</option>
              </select>
              <input value={p.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} placeholder="Nombre y apellidos" className="campo min-w-40 flex-1" />
              {p.rol === "jugador" && <input value={p.dorsal ?? ""} onChange={(e) => cambiar(i, { dorsal: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="Dorsal" inputMode="numeric" className="campo w-20" />}
              <input value={p.email ?? ""} onChange={(e) => cambiar(i, { email: e.target.value })} placeholder="Email (opcional)" type="email" className="campo w-48" />
              <button type="button" onClick={() => setPersonas((ps) => ps.filter((_, j) => j !== i))} className="p-1.5 text-tinta/40 hover:text-red-600" aria-label="Quitar"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setPersonas((ps) => [...ps, vacia()])} className="btn-secundario"><Plus size={15} /> Jugador</button>
          <button type="button" onClick={() => setPersonas((ps) => [...ps, vacia("entrenador")])} className="btn-secundario"><Plus size={15} /> Entrenador</button>
        </div>
      </section>
      <section className="tarjeta space-y-3 p-4">
        <div className="flex items-end justify-between gap-2">
          <div className="text-sm text-tinta/70">{jugadores} jugadores{validas.length > jugadores ? ` y ${validas.length - jugadores} entrenadores` : ""}{(jugadores < evento.min_jugadores || jugadores > evento.max_jugadores) && <span className="block text-amber-700">De {evento.min_jugadores} a {evento.max_jugadores} jugadores</span>}</div>
          <div className="text-right"><p className="text-xs text-tinta/60">Total a pagar</p><p className="text-2xl font-bold">{euros(total)}</p></div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-1" />
          <span>Acepto que el C.B. Turó de la Peira trate estos datos solo para gestionar la inscripción y el acceso al evento. Declaro que tengo el consentimiento de los jugadores (o de sus familias si son menores) para facilitarlos.</span>
        </label>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button disabled={pendiente || !acepto} className="btn-primario w-full justify-center">{pendiente ? "Enviando…" : "Inscribir al equipo"}</button>
        <p className="text-center text-xs text-tinta/50">En el siguiente paso verás cómo pagar.</p>
      </section>
    </form>
  );
}
