"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/equipos", label: "Equipos" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/calendario", label: "Calendario" },
  { href: "/entrenamientos", label: "Entrenamientos" },
  { href: "/planificaciones", label: "Planificaciones" },
  { href: "/partidos", label: "Partidos" },
  { href: "/pistas", label: "Pistas" },
  { href: "/scouting", label: "Scouting" },
  { href: "/video", label: "Vídeo" },
  { href: "/ejercicios", label: "Ejercicios" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/pizarra", label: "Pizarra" },
  { href: "/playbook", label: "Playbook" },
  { href: "/noticias", label: "Noticias" },
];

export default function NavPrincipal({ rol, mesas = false, material = false }: { rol: "coordinador" | "entrenador" | "gestor_mesas"; mesas?: boolean; material?: boolean }) {
  const rutaReal = usePathname();
  // Al tocar un menú se marca al momento (sin esperar a que cargue la página)
  const [pulsado, setPulsado] = useState<string | null>(null);
  useEffect(() => setPulsado(null), [rutaReal]);
  const ruta = pulsado ?? rutaReal;
  const coordinador = rol === "coordinador";
  // Mesas: para coordinadores y para quien tenga el permiso de gestor de mesas (que además es entrenador)
  const conMesas = mesas || coordinador ? [{ href: "/mesas", label: "Mesas" }] : [];
  const conMaterial = material ? [{ href: "/material", label: "Material" }] : [];
  const items = coordinador ? [{ href: "/coordinacion", label: "Coordinación" }, ...NAV, ...conMesas, ...conMaterial, { href: "/comunicados", label: "Comunicados" }, { href: "/club", label: "Club" }] : [...NAV, ...conMesas, ...conMaterial];
  const activo = (href: string) => (href === "/" ? ruta === "/" : href === "/mesas" ? ruta === "/mesas" || (ruta.startsWith("/mesas") && !items.some((i) => i.href !== "/mesas" && ruta.startsWith(i.href))) : ruta.startsWith(href));

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-1.5 text-sm [scrollbar-width:none] lg:flex-wrap lg:gap-x-0.5 lg:gap-y-2 lg:overflow-visible">
      {items.map((n) => n.href === "/video" && !coordinador ? (
        <span key={n.href} title="Próximamente" className="flex cursor-default items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-white/40">
          {n.label}<span className="rounded bg-white/10 px-1 text-[9px] uppercase tracking-wide">Pronto</span>
        </span>
      ) : (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setPulsado(n.href)}
          className={`relative whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition lg:px-2 ${
            activo(n.href) ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.label}
          <Cargando />
          {activo(n.href) && <span className="absolute inset-x-2.5 -bottom-1.5 h-[3px] rounded-t bg-oro" />}
        </Link>
      ))}
    </nav>
  );
}

/** Puntito que late mientras carga la página del menú tocado */
function Cargando() {
  const { pending } = useLinkStatus();
  return pending ? <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 animate-ping rounded-full bg-oro" /> : null;
}
