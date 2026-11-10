"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { entrar, registrar, unirseStaff } from "./actions";

/** Apuntarse: el staff solo pone el nombre de su equipo; el resto se registra con un PIN */
export default function Alta({ staff, abiertoPublico, premio }: { staff: { nombre: string } | null; abiertoPublico: boolean; premio: string | null }) {
  const [modo, setModo] = useState<"registro" | "entrar">("registro");
  const [f, setF] = useState({ alias: "", nombre: "", contacto: "", pin: "", quien: "" });
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const ir = (fn: () => Promise<{ error?: string }>) => start(async () => { setError(null); const r = await fn(); if (r.error) setError(r.error); });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="tarjeta p-5 text-center">
        <img src="/insignias/29-campeon-del-turo.png" alt="" className="mx-auto h-24 w-24" />
        <h1 className="mt-1 text-2xl font-bold">Fantasy Turó</h1>
        <p className="mt-1 text-sm text-tinta/70">Cada jornada fichas a 5 jugadores del club con 50 ⭐ y sumas puntos con sus estadísticas de la federación.</p>
        {premio && <p className="mt-2 rounded-lg bg-oro/20 p-2 text-sm font-semibold">🏆 Premio: {premio}</p>}
      </div>

      {staff ? (
        <div className="tarjeta space-y-3 p-4">
          <p className="text-sm">Hola <strong>{staff.nombre}</strong>. Solo tienes que ponerle nombre a tu equipo:</p>
          <input className="campo" placeholder="Ej.: Los Triples de la Peira" maxLength={30} value={f.alias} onChange={set("alias")} />
          <button className="btn-primario w-full justify-center" disabled={pend} onClick={() => ir(() => unirseStaff(f.alias))}>{pend && <Loader2 size={16} className="animate-spin" />} ¡Me apunto!</button>
        </div>
      ) : !abiertoPublico ? (
        <p className="tarjeta p-4 text-center text-sm text-tinta/60">Las inscripciones aún no están abiertas.</p>
      ) : (
        <div className="tarjeta p-4">
          <div className="mb-3 flex overflow-hidden rounded-lg border border-linea text-sm font-semibold">
            <button className={`flex-1 py-2 ${modo === "registro" ? "bg-azul text-white" : ""}`} onClick={() => setModo("registro")}>Soy nuevo</button>
            <button className={`flex-1 py-2 ${modo === "entrar" ? "bg-azul text-white" : ""}`} onClick={() => setModo("entrar")}>Ya tengo equipo</button>
          </div>
          {modo === "registro" ? (
            <div className="space-y-2">
              <label className="etiqueta">Nombre de tu equipo (lo ven todos)</label>
              <input className="campo" placeholder="Ej.: Los Triples de la Peira" maxLength={30} value={f.alias} onChange={set("alias")} />
              <label className="etiqueta">Tu nombre y apellido (solo lo ve el club)</label>
              <input className="campo" maxLength={60} value={f.nombre} onChange={set("nombre")} autoComplete="name" />
              <label className="etiqueta">Teléfono o email (por si ganas el premio)</label>
              <input className="campo" maxLength={80} value={f.contacto} onChange={set("contacto")} />
              <label className="etiqueta">Elige un PIN de 4 a 6 números (para entrar desde otro móvil)</label>
              <input className="campo" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} />
              <button className="btn-primario w-full justify-center" disabled={pend} onClick={() => ir(() => registrar(f))}>{pend && <Loader2 size={16} className="animate-spin" />} Crear mi equipo</button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="etiqueta">Nombre de tu equipo, teléfono o email</label>
              <input className="campo" value={f.quien} onChange={set("quien")} />
              <label className="etiqueta">PIN</label>
              <input className="campo" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} />
              <button className="btn-primario w-full justify-center" disabled={pend} onClick={() => ir(() => entrar(f.quien, f.pin))}>{pend && <Loader2 size={16} className="animate-spin" />} Entrar</button>
            </div>
          )}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
