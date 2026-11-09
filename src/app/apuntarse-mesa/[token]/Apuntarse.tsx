"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Clock, Loader2, X } from "lucide-react";
import { apuntarse, desapuntarse, misMesas, type MiMesa } from "./actions";

type P = { id: string; fecha: string; equipo: string; rival: string; lugar: string | null; confirmados: number; plazo: string; plazas: number; manual: boolean };
const TZ = "Europe/Madrid";
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const CLAVE = "mesas-turo-yo";

export default function Apuntarse({ token, partidos }: { token: string; partidos: P[] }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [mias, setMias] = useState<MiMesa[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendiente, start] = useTransition();

  // Recordar quién soy en este móvil y cargar lo que ya tengo apuntado
  useEffect(() => {
    try {
      const yo = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
      if (yo?.telefono) { setNombre(yo.nombre ?? ""); setTelefono(yo.telefono); misMesas(token, yo.telefono).then((r) => setMias(r.mias ?? [])); }
    } catch {}
  }, [token]);

  const mia = (id: string) => mias.find((m) => m.partido_id === id);
  const enviar = () => start(async () => {
    setMsg(null);
    const r = await apuntarse(token, nombre, telefono, [...marcados]);
    if (r.error) { setMsg({ ok: false, t: r.error }); return; }
    try { localStorage.setItem(CLAVE, JSON.stringify({ nombre, telefono })); } catch {}
    setMias(r.mias ?? []); setMarcados(new Set());
    setMsg({ ok: true, t: "¡Apuntado! Te confirmará el gestor de mesas." });
  });
  const quitar = (id: string) => start(async () => {
    if (!confirm("¿Te borras de esta mesa?")) return;
    const r = await desapuntarse(token, telefono, id);
    if (r.mias) setMias(r.mias);
    if (r.error) setMsg({ ok: false, t: r.error });
  });
  const ahora = new Date().toISOString();

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="etiqueta">Nombre y apellido</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Marta López" autoComplete="name" /></div>
        <div><label className="etiqueta">Teléfono</label><input value={telefono} onChange={(e) => setTelefono(e.target.value)} onBlur={() => telefono && misMesas(token, telefono).then((r) => setMias(r.mias ?? []))} className="campo" placeholder="600 000 000" inputMode="tel" autoComplete="tel" /></div>
      </div>

      {partidos.length === 0 && <p className="tarjeta p-4 text-sm text-tinta/60">Ahora mismo no hay partidos de casa pendientes de mesa.</p>}
      <ul className="space-y-2">
        {partidos.map((p) => {
          const m = mia(p.id), llena = p.confirmados >= p.plazas, cerrada = ahora >= p.plazo;
          return (
            <li key={p.id} className={`tarjeta flex items-center gap-3 p-3 ${marcados.has(p.id) ? "ring-2 ring-azul" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="text-xs capitalize text-tinta/60">{dia(p.fecha)} · {hora(p.fecha)}</p>
                <p className="font-semibold">{p.equipo} <span className="font-normal text-tinta/60">vs</span> {p.rival}</p>
                {p.manual && <p className="text-[11px] font-semibold text-azul">1 persona · la pagan los jugadores en efectivo</p>}
                {p.lugar && <p className="truncate text-xs text-tinta/50">{p.lugar}</p>}
                <p className={`text-[11px] ${cerrada ? "text-red-700" : "text-tinta/50"}`}>{cerrada ? "Plazo cerrado" : `Puedes apuntarte o borrarte hasta el ${dia(p.plazo)} a las ${hora(p.plazo)}`}</p>
              </div>
              {m ? (
                <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${m.estado === "confirmado" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {m.estado === "confirmado" ? <Check size={14} /> : <Clock size={14} />} {m.estado === "confirmado" ? "Confirmado" : "Pendiente"}
                  {!cerrada && <button type="button" onClick={() => quitar(m.id)} title="Borrarme" className="ml-1"><X size={14} /></button>}
                </span>
              ) : llena || cerrada ? (
                <span className="text-xs text-tinta/50">{llena ? "Completa" : "Cerrado"}</span>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={marcados.has(p.id)} onChange={(e) => setMarcados((s) => { const n = new Set(s); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })} />
                  Puedo
                </label>
              )}
            </li>
          );
        })}
      </ul>

      {partidos.length > 0 && (
        <button type="button" onClick={enviar} disabled={pendiente || !marcados.size} className="btn-primario w-full justify-center">
          {pendiente && <Loader2 size={16} className="animate-spin" />} Apuntarme {marcados.size ? `a ${marcados.size} partido${marcados.size > 1 ? "s" : ""}` : ""}
        </button>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
      <p className="text-xs text-tinta/50">Hasta el viernes te puedes borrar tú (también si ya estás confirmado). Después del viernes, si te surge una urgencia, avisa al gestor de mesas para que ponga a otra persona.</p>
    </div>
  );
}
