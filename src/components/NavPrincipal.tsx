"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/equipos", label: "Equipos" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/calendario", label: "Calendario" },
  { href: "/entrenamientos", label: "Entrenamientos" },
  { href: "/planificaciones", label: "Planificaciones" },
  { href: "/partidos", label: "Partidos" },
  { href: "/ejercicios", label: "Ejercicios" },
  { href: "/pizarra", label: "Pizarra" },
];

export default function NavPrincipal({ coordinador }: { coordinador: boolean }) {
  const ruta = usePathname();
  const items = coordinador ? [...NAV, { href: "/club", label: "Club" }] : NAV;
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-1.5 text-sm [scrollbar-width:none]">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`relative whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition ${
            activo(n.href) ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.label}
          {activo(n.href) && <span className="absolute inset-x-2.5 -bottom-1.5 h-[3px] rounded-t bg-oro" />}
        </Link>
      ))}
    </nav>
  );
}
