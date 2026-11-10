"use client";

import { useEffect, useState } from "react";

type Ins = { codigo: string; nombre: string; texto: string; img: string };

const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };

/** Pantallas de celebración: insignia nueva y campeón (cada una se ve una sola vez en cada móvil) */
export default function Celebracion({ pid, insignias, campeon, temporada }: { pid: string; insignias: Ins[]; campeon: string | null; temporada: string }) {
  const [nueva, setNueva] = useState<Ins | null>(null);
  const [verCampeon, setVerCampeon] = useState(false);
  useEffect(() => {
    const k = `fx-insignias-${pid}`;
    const vistas = leer(k);
    const codigos = insignias.map((x) => x.codigo);
    if (vistas === null) guardar(k, JSON.stringify(codigos)); // primera vez: no se celebran las que ya tenía
    else {
      const ya = new Set(JSON.parse(vistas) as string[]);
      const n = insignias.find((x) => !ya.has(x.codigo));
      if (n) setNueva(n);
    }
    if (campeon && !leer(`fx-campeon-${temporada}`)) setVerCampeon(true);
  }, [pid, insignias, campeon, temporada]);

  const cerrarInsignia = () => {
    const k = `fx-insignias-${pid}`;
    const ya = new Set(JSON.parse(leer(k) ?? "[]") as string[]);
    if (nueva) ya.add(nueva.codigo);
    guardar(k, JSON.stringify([...ya]));
    const sig = insignias.find((x) => !ya.has(x.codigo));
    setNueva(sig ?? null);
  };

  if (verCampeon && campeon) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#070c1c]/95 p-6 text-center" onClick={() => { guardar(`fx-campeon-${temporada}`, "1"); setVerCampeon(false); }}>
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} className="pointer-events-none absolute top-[-10%] h-3 w-2 rounded-sm"
            style={{ left: `${(i * 37) % 100}%`, background: ["#f6c445", "#d81f2f", "#1d4ed8", "#22b04f", "#fff"][i % 5], animation: `fx-confeti ${2.5 + (i % 7) * 0.4}s linear ${(i % 10) * 0.25}s infinite` }} />
        ))}
        <div className="fx-pop relative">
          <img src="/insignias/29-campeon-del-turo.png" alt="" className="mx-auto h-44 w-44" />
          <p className="fx-display fx-oro-texto mt-2 text-5xl leading-none">Campeón<br />del Turó</p>
          <p className="fx-display mt-1 text-2xl">{temporada}</p>
          <p className="fx-card-oro fx-display mt-4 inline-block px-5 py-2 text-2xl">🏆 {campeon}</p>
          <p className="fx-display mt-4 text-2xl">¡Enhorabuena!</p>
          <p className="mt-6 text-xs text-white/50">Toca para cerrar</p>
        </div>
      </div>
    );
  }
  if (!nueva) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070c1c]/95 p-6 text-center">
      <div className="fx-pop max-w-sm">
        <p className="fx-display fx-oro-texto text-4xl">¡Nueva insignia!</p>
        <img src={nueva.img} alt="" className="mx-auto my-3 h-48 w-48 drop-shadow-[0_0_30px_rgba(246,196,69,.5)]" />
        <p className="text-lg font-semibold">¡Has conseguido</p>
        <p className="fx-display fx-oro-texto text-3xl">{nueva.nombre}!</p>
        <p className="mt-1 text-sm text-white/80">{nueva.texto}</p>
        <button onClick={cerrarInsignia} className="fx-btn fx-btn-oro mt-5 w-full">¡Genial!</button>
      </div>
    </div>
  );
}
