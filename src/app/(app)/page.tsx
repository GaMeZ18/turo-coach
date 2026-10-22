import Link from "next/link";
import {
  Shield, Users, Timer, TrafficCone, PenTool, CalendarDays, Target, Binoculars, Video, BookOpen, Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import InstalarApp from "@/components/InstalarApp";

const MODULOS = [
  { href: "/equipos", titulo: "Equipos", texto: "Equipos de la temporada y su staff", icono: Shield },
  { href: "/jugadores", titulo: "Jugadores", texto: "Plantilla y fichas del equipo activo", icono: Users },
  { href: "/entrenamientos", titulo: "Entrenamientos", texto: "Prepara la sesión y pasa lista", icono: Timer },
  { href: "/ejercicios", titulo: "Ejercicios y sistemas", texto: "La biblioteca del club y la tuya", icono: TrafficCone },
  { href: "/pizarra", titulo: "Pizarra", texto: "Dibuja y anima jugadas al momento", icono: PenTool },
  { href: "/calendario", titulo: "Calendario", texto: "Partidos, entrenos, eventos y cumpleaños", icono: CalendarDays },
  { href: "/partidos", titulo: "Partidos", texto: "Resultados y convocatorias", icono: Trophy },
  { titulo: "Planificaciones", texto: "Objetivos de temporada en árbol", icono: Target },
  { titulo: "Scouting", texto: "Rivales, notas y control de periodos", icono: Binoculars },
  { titulo: "Vídeo", texto: "Etiqueta acciones por categorías", icono: Video },
  { titulo: "Biblioteca", texto: "Libros, artículos y enlaces", icono: BookOpen },
];

export default async function Inicio() {
  const { supabase, perfil } = await requireUser();
  const activo = await equipoActivo(supabase);

  return (
    <div>
      {/* Banda de bienvenida con la imagen de los 10 años */}
      <section className="relative -mx-4 -mt-6 overflow-hidden bg-azul-noche text-white sm:mx-0 sm:mt-0 sm:rounded-2xl">
        <img src="/marca/aniversario-10.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-60 sm:w-2/3" />
        <div className="absolute inset-0 bg-gradient-to-r from-azul-noche via-azul-noche/85 to-transparent" />
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro">Temporada del 10è aniversari</p>
          <h1 className="mt-1 text-3xl !text-white sm:text-4xl">Hola, {perfil.nombre?.split(" ")[0] ?? "entrenador"}</h1>
          <p className="mt-1 text-sm text-white/70">
            {activo ? (
              <>Trabajando con <strong className="text-white">{activo.nombre}</strong></>
            ) : (
              "Elige un equipo arriba para trabajar con él."
            )}
          </p>
        </div>
        <div className="filete relative" />
      </section>

      <div className="mt-4">
        <InstalarApp />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODULOS.map(({ href, titulo, texto, icono: Icono }) => {
          const contenido = (
            <>
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${href ? "bg-azul text-oro ring-2 ring-oro/60 ring-offset-2" : "bg-tinta/5 text-tinta/40"}`}>
                <Icono size={22} />
              </span>
              <span className="mt-3 block font-[family-name:var(--font-titulo)] text-lg font-bold uppercase leading-tight text-azul">{titulo}</span>
              <span className="mt-0.5 block text-xs text-tinta/60">{texto}</span>
              {!href && <span className="mt-2 inline-block rounded bg-tinta/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-tinta/50">Próximamente</span>}
            </>
          );
          return href ? (
            <Link key={titulo} href={href} className="tarjeta border-b-4 !border-b-rojo p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-azul/10">
              {contenido}
            </Link>
          ) : (
            <div key={titulo} className="tarjeta p-4 opacity-70">{contenido}</div>
          );
        })}
      </div>
    </div>
  );
}
