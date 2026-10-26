"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
import { crearPersona, nuevaPassword, type ResultadoPersona } from "./actions";
import { FUNCIONES } from "@/lib/funciones";


function Boton({ children, className = "btn-primario" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />}{children}</button>;
}

/** Recuadro con los datos de acceso para copiar y mandar por WhatsApp */
export function Credenciales({ r }: { r: NonNullable<ResultadoPersona> }) {
  const [copiado, setCopiado] = useState(false);
  const [web, setWeb] = useState("");
  useEffect(() => setWeb(location.origin), []);
  if (r.error) return <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{r.error}</p>;
  if (r.invitado) return <p className="rounded-lg bg-green-50 p-2 text-sm text-green-800">Invitación enviada a {r.email}. Le llegará un correo para entrar y ponerse contraseña.</p>;
  const texto = `Hola ${r.nombre?.split(" ")[0] ?? ""}! Ya tienes acceso a Coach Manager CBTuró, la app de entrenadores del CB Turó de la Peira.\n\n👉 ${web}\n📧 Usuario: ${r.email}\n🔑 Contraseña provisional: ${r.password}\n\nAl entrar, cámbiala en «Mi cuenta». Puedes instalarla en el móvil como una app.`;
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-semibold text-green-800"><Check size={16} /> Listo. Datos de acceso (solo se muestran ahora):</p>
      <p className="mt-1">Usuario: <strong>{r.email}</strong></p>
      <p>Contraseña provisional: <strong className="font-mono" translate="no">{r.password}</strong></p>
      <button type="button" className="btn-secundario mt-2 !py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} }}>
        <Copy size={14} /> {copiado ? "Copiado" : "Copiar mensaje para WhatsApp"}
      </button>
    </div>
  );
}

export function NuevaPersona({ equipos }: { equipos: { id: string; nombre: string }[] }) {
  const [r, accion] = useActionState(crearPersona, null);
  const [modo, setModo] = useState("password");
  const [origen, setOrigen] = useState("");
  useEffect(() => setOrigen(location.origin), []);
  return (
    <form action={accion} className="tarjeta space-y-3 p-4" key={r?.ok ? r.email : "form"}>
      <h2 className="flex items-center gap-2 font-semibold"><UserPlus size={18} className="text-azul" /> Añadir persona al staff</h2>
      <input type="hidden" name="origen" value={origen} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className="etiqueta">Nombre y apellidos</label><input name="nombre" required className="campo" placeholder="Laura Martí" /></div>
        <div><label className="etiqueta">Email</label><input name="email" type="email" required className="campo" placeholder="laura@gmail.com" autoComplete="off" /></div>
        <div>
          <label className="etiqueta">Función</label>
          <select name="funcion" className="campo capitalize" defaultValue="entrenador">{FUNCIONES.map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}</select>
        </div>
        <div>
          <label className="etiqueta">Permisos</label>
          <select name="rol" className="campo" defaultValue="entrenador">
            <option value="entrenador">Staff (solo sus equipos)</option>
            <option value="coordinador">Coordinador (todo el club)</option>
          </select>
        </div>
      </div>
      <div>
        <span className="etiqueta">Equipos</span>
        <div className="flex flex-wrap gap-1.5">
          {equipos.map((e) => (
            <label key={e.id} className="cursor-pointer">
              <input type="checkbox" name="equipos" value={e.id} className="peer sr-only" />
              <span className="block rounded-full border border-linea bg-white px-3 py-1 text-sm peer-checked:border-azul peer-checked:bg-azul peer-checked:text-white">{e.nombre}</span>
            </label>
          ))}
          {!equipos.length && <span className="text-sm text-tinta/50">Crea antes los equipos en Equipos.</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name="modo" value="password" checked={modo === "password"} onChange={() => setModo("password")} /> Crear con contraseña provisional (se la mandas tú por WhatsApp)</label>
        <label className="flex items-center gap-1.5"><input type="radio" name="modo" value="invitar" checked={modo === "invitar"} onChange={() => setModo("invitar")} /> Enviar invitación por email</label>
      </div>
      <Boton>Crear acceso</Boton>
      {r && <Credenciales r={r} />}
    </form>
  );
}

export function BotonNuevaPassword({ id, nombre }: { id: string; nombre: string }) {
  const [r, accion] = useActionState(nuevaPassword, null);
  return (
    <form action={accion} className="contents">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="nombre" value={nombre} />
      <Boton className="btn-secundario !px-2 !py-1 text-xs"><KeyRound size={13} /> Nueva contraseña</Boton>
      {r && <div className="w-full"><Credenciales r={r} /></div>}
    </form>
  );
}
