"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, BookOpen, CalendarDays, ClipboardList, MessageCircle, Trophy, Users, Zap } from "lucide-react";

const VISTAS = [
  { v: "equipo", t: "Mi equipo", i: Users },
  { v: "mercado", t: "Mercado", i: ClipboardList },
  { v: "clasificacion", t: "Clasificación", i: Trophy },
  { v: "puntos", t: "Puntos", i: Zap },
  { v: "jornada", t: "Chat", i: MessageCircle },
  { v: "calendario", t: "Calendario", i: CalendarDays },
  { v: "insignias", t: "Insignias", i: Award },
  { v: "reglas", t: "Reglas", i: BookOpen },
] as const;

/** Punto que late en la pestaña mientras carga */
function Cargando() {
  const { pending } = useLinkStatus();
  return pending ? <span className="absolute right-2 top-1 h-1.5 w-1.5 animate-ping rounded-full bg-[var(--fx-oro)]" /> : null;
}

/** Pestañas del Fantasy: se marcan al instante al tocarlas y se precargan en un rato libre */
export default function Pestanas({ vista }: { vista?: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [pulsada, setPulsada] = useState<string | null>(null);
  useEffect(() => setPulsada(null), [ruta, params]);
  const precargar = (v: string) => { try { router.prefetch(`/fantasy?v=${v}`, { kind: "full" } as never); } catch { /* */ } };
  // Las pestañas principales, ya pedidas antes de tocarlas
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (f: () => void) => number };
    const libre = (fn: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(fn) : w.setTimeout(fn, 800));
    const t = window.setTimeout(() => ["equipo", "mercado", "clasificacion", "puntos", "jornada"].filter((v) => v !== vista).forEach((v, i) => window.setTimeout(() => libre(() => precargar(v)), i * 300)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const actual = pulsada ?? vista;
  return (
    <nav className="mx-auto flex max-w-3xl overflow-x-auto [scrollbar-width:none]">
      {VISTAS.map(({ v, t, i: I }) => (
        <Link key={v} href={`/fantasy?v=${v}`} onClick={() => setPulsada(v)} onPointerEnter={() => precargar(v)} onTouchStart={() => precargar(v)}
          className={`relative flex min-w-[56px] flex-1 shrink-0 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold transition-colors sm:text-xs ${actual === v ? "bg-gradient-to-b from-[#f0323f] to-[#a3121e] text-white" : "text-white/70"}`}>
          <I size={18} />{t}
          <Cargando />
        </Link>
      ))}
    </nav>
  );
}
