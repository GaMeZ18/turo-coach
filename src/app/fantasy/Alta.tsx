"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock, Phone, Shield, User } from "lucide-react";
import { entrar, entrarConCuenta, registrar, unirseStaff } from "./actions";
import { ElegirAvatar, type AvatarDatos } from "./Perfil";

function Premio({ premio }: { premio: string }) {
  return (
    <div className="fx-card-oro flex items-center gap-3 p-3 text-left">
      <img src="/insignias/29-campeon-del-turo.png" alt="" className="h-14 w-14" />
      <div><p className="fx-display text-sm text-[var(--fx-oro)]">Premio</p><p className="fx-display fx-oro-texto text-2xl leading-none">Campeón</p><p className="text-xs text-white/80">{premio}</p></div>
    </div>
  );
}

const Campo = ({ icono: I, ...p }: { icono: typeof User } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="flex items-center gap-2 rounded-lg border border-[#d5dbea] bg-white px-2.5 py-2 text-[#121a33]">
    <I size={16} className="shrink-0 text-[#6b7799]" />
    <input {...p} className="w-full bg-transparent text-sm outline-none placeholder:text-[#8a94b3]" />
  </label>
);

/** Apuntarse: el staff solo pone el nombre de su equipo; el resto se registra con un PIN */
export default function Alta({ staff, abiertoPublico, premio }: { staff: { nombre: string } | null; abiertoPublico: boolean; premio: string | null }) {
  const [modo, setModo] = useState<"registro" | "entrar">("registro");
  const [f, setF] = useState({ alias: "", nombre: "", contacto: "", pin: "", quien: "" });
  const [av, setAv] = useState<AvatarDatos>({ emoji: "🏀", color: "#d81f2f", foto: null });
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  // ¿Tenemos su nombre y apellido? (algunas cuentas solo tienen el email)
  const conNombre = !!staff && !staff.nombre.includes("@") && staff.nombre.trim().split(/\s+/).length >= 2;
  const ir = (fn: () => Promise<{ error?: string }>) => start(async () => { setError(null); const r = await fn(); if (r.error) setError(r.error); });

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <img src="/insignias/29-campeon-del-turo.png" alt="" className="fx-pop mx-auto -mb-2 h-20 w-20" />
      <h1 className="fx-display fx-oro-texto text-4xl">Fantasy Turó</h1>
      <p className="-mt-3 text-sm text-white/80">CB Turó de la Peira</p>
      <p className="text-sm text-white/85">Ficha a 5 jugadores con 50 ⭐, compite jornada a jornada y demuestra que eres el mejor mánager del Turó.</p>
      {premio && <Premio premio={premio} />}

      <div className="overflow-hidden rounded-2xl bg-[#f3f5fb] text-left text-[#121a33] shadow-xl">
        {staff ? (
          <div className="space-y-3 p-4">
            <p className="text-sm">{conNombre ? <>Hola <strong>{staff.nombre}</strong> 👋 </> : null}Ponle nombre a tu equipo y elige tu escudo:</p>
            <Campo icono={Shield} placeholder="Nombre de tu equipo" maxLength={30} value={f.alias} onChange={set("alias")} />
            {!conNombre && <Campo icono={User} placeholder="Tu nombre y apellido" maxLength={60} value={f.nombre} onChange={set("nombre")} autoComplete="name" />}
            <p className="text-[11px] text-[#5b6687]">Los demás verán el nombre de tu equipo en grande y tu nombre con la inicial del apellido (lo puedes cambiar).</p>
            <div className="rounded-xl bg-[#0d1530] p-3"><ElegirAvatar alias={f.alias} valor={av} onChange={setAv} /></div>
            <button className="fx-btn fx-btn-oro w-full" disabled={pend} onClick={() => ir(() => unirseStaff(f.alias, av, conNombre ? undefined : f.nombre))}>{pend && <Loader2 size={16} className="animate-spin" />} ¡Me apunto!</button>
          </div>
        ) : !abiertoPublico ? (
          <p className="p-4 text-center text-sm">Las inscripciones aún no están abiertas.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 text-sm font-bold">
              <button className={`py-2.5 ${modo === "registro" ? "bg-gradient-to-b from-[#f0323f] to-[#b3121f] text-white" : "bg-[#0d1530] text-white/70"}`} onClick={() => setModo("registro")}>Soy nuevo</button>
              <button className={`py-2.5 ${modo === "entrar" ? "bg-gradient-to-b from-[#f0323f] to-[#b3121f] text-white" : "bg-[#0d1530] text-white/70"}`} onClick={() => setModo("entrar")}>Ya tengo equipo</button>
            </div>
            {modo === "registro" ? (
              <div className="space-y-2 p-4">
                <Campo icono={Shield} placeholder="Nombre de tu equipo" maxLength={30} value={f.alias} onChange={set("alias")} />
                <Campo icono={User} placeholder="Tu nombre real (nombre y apellido)" maxLength={60} value={f.nombre} onChange={set("nombre")} autoComplete="name" />
                <Campo icono={Phone} placeholder="Teléfono o email" maxLength={80} value={f.contacto} onChange={set("contacto")} />
                <Campo icono={Lock} placeholder="PIN (4–6 números)" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} />
                <p className="text-[11px] text-[#5b6687]">Los demás verán el nombre de tu equipo en grande y tu nombre con la inicial del apellido (lo puedes cambiar). El teléfono o email solo lo ve el club, por si ganas.</p>
                <div className="rounded-xl bg-[#0d1530] p-3 text-white"><p className="mb-2 text-xs text-white/70">Tu escudo: un emoji o tu foto</p><ElegirAvatar alias={f.alias} valor={av} onChange={setAv} /></div>
                <button className="fx-btn fx-btn-oro w-full" disabled={pend} onClick={() => ir(() => registrar({ ...f, ...av }))}>{pend && <Loader2 size={16} className="animate-spin" />} Crear mi equipo</button>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                <Campo icono={Shield} placeholder="Nombre de tu equipo, teléfono o email" value={f.quien} onChange={set("quien")} />
                <Campo icono={Lock} placeholder="PIN" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} />
                <button className="fx-btn fx-btn-oro w-full" disabled={pend} onClick={() => ir(() => entrar(f.quien, f.pin))}>{pend && <Loader2 size={16} className="animate-spin" />} Entrar</button>
              </div>
            )}
          </>
        )}
      </div>
      {!staff && <CuentaCoach />}
      {error && <p className="rounded-lg bg-red-900/60 p-3 text-sm text-red-100">{error}</p>}
    </div>
  );
}

/** Staff con cuenta de Coach Manager: entrar aquí mismo con su email y contraseña (sin registrarse aparte) */
function CuentaCoach() {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="fx-card flex w-full items-center gap-3 p-3 text-left">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-lg" />
        <span className="flex-1 text-sm"><strong>¿Tienes cuenta de Coach Manager?</strong><br /><span className="fx-suave">Entra con ella, no hace falta registrarse.</span></span>
        <span className="text-[var(--fx-oro)]">›</span>
      </button>
    );
  }
  return (
    <form className="fx-card space-y-2 p-4 text-left" onSubmit={(e) => { e.preventDefault(); start(async () => { setError(null); const r = await entrarConCuenta(email, clave); if (r.error) setError(r.error); }); }}>
      <p className="text-sm font-semibold">Entra con tu cuenta de Coach Manager</p>
      <input className="fx-input" type="email" name="username" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="fx-input" type="password" name="password" autoComplete="current-password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
      <button className="fx-btn w-full" disabled={pend}>{pend && <Loader2 size={16} className="animate-spin" />} Entrar</button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}
