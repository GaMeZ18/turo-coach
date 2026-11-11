import { Suspense } from "react";
import Link from "next/link";
import { veFantasy } from "@/lib/fantasy/menu";
import { gestionaMesas, requireUser, veMaterial } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import InstalarApp from "@/components/InstalarApp";
import ProximoRival from "@/components/ProximoRival";
import ModulosInicio, { type Modulo } from "@/components/ModulosInicio";
import Bienvenida from "@/components/Bienvenida";
import Tareas, { type TareaV } from "./reuniones/Tareas";

const MODULOS: Omit<Modulo, "activo">[] = [
  { href: "/equipos", titulo: "Equipos", texto: "Equipos de la temporada y su staff", icono: "Shield" },
  { href: "/jugadores", titulo: "Jugadores", texto: "Plantilla y fichas del equipo activo", icono: "Users" },
  { href: "/entrenamientos", titulo: "Entrenamientos", texto: "Prepara la sesión y pasa lista", icono: "Timer" },
  { href: "/ejercicios", titulo: "Ejercicios y sistemas", texto: "La biblioteca del club y la tuya", icono: "TrafficCone" },
  { href: "/pizarra", titulo: "Pizarra", texto: "Dibuja y anima jugadas al momento", icono: "PenTool" },
  { href: "/playbook", titulo: "Playbook", texto: "Las jugadas del equipo, en PDF, vídeo y enlace", icono: "BookMarked" },
  { href: "/calendario", titulo: "Calendario", texto: "Partidos, entrenos, eventos y cumpleaños", icono: "CalendarDays" },
  { href: "/partidos", titulo: "Partidos", texto: "Resultados y convocatorias", icono: "Trophy" },
  { href: "/pistas", titulo: "Pistas", texto: "Quién entrena en cada pista y a qué hora", icono: "MapPin" },
  { href: "/reuniones", titulo: "Reuniones", texto: "Orden del día, actas y tareas del staff", icono: "CalendarClock" },
  { href: "/planificaciones", titulo: "Planificaciones", texto: "Objetivos de temporada en árbol", icono: "Target" },
  { href: "/scouting", titulo: "Scouting", texto: "Liga, rivales, estadísticas y fichas", icono: "Binoculars" },
  { href: "/video", titulo: "Vídeo", texto: "Etiqueta acciones y revisa los clips", icono: "Video" },
  { href: "/biblioteca", titulo: "Biblioteca", texto: "Ejercicios del club listos para usar", icono: "BookOpen" },
  { href: "/noticias", titulo: "Noticias", texto: "Lo que publica el club", icono: "Newspaper" },
];

export default async function Inicio({ searchParams }: { searchParams: Promise<{ guia?: string }> }) {
  const { supabase, perfil, user } = await requireUser();
  const { guia } = await searchParams;
  const [activo, { data: pref }, { data: ts }, fantasy] = await Promise.all([
    equipoActivo(supabase),
    supabase.from("perfiles").select("bienvenida_vista, inicio").eq("id", user.id).maybeSingle(),
    supabase.from("tareas").select("id, titulo, responsable_id, fecha_limite, hecha, reunion_id, reuniones(titulo)").eq("responsable_id", user.id).eq("hecha", false).order("fecha_limite", { nullsFirst: false }).limit(10),
    veFantasy(perfil.id),
  ]);
  const coord = perfil.rol === "coordinador";
  const todos: Modulo[] = [
    ...(coord ? [{ href: "/coordinacion", titulo: "Coordinación", texto: "Panel con todos los equipos y avisos", icono: "Gauge" as const }] : []),
    ...(gestionaMesas(perfil) ? [{ href: "/mesas", titulo: "Mesas", texto: "Quién hace cada mesa y pagos del mes", icono: "ClipboardCheck" as const }] : []),
    ...(fantasy ? [{ href: "/fantasy", titulo: "Fantasy Turó", texto: "Ficha jugadores del club y suma puntos", icono: "Trophy" as const }] : []),
    ...(veMaterial(perfil) ? [{ href: "/material", titulo: "Material", texto: "Inventario de balones, conos… por sitio", icono: "Package" as const }] : []),
    ...(coord ? [{ href: "/comunicados", titulo: "Comunicados", texto: "Mensajes y noticias a quien elijas", icono: "Megaphone" as const }] : []),
    ...MODULOS,
  ].map((m) => ({ ...m, activo: !(m.href === "/video" && !coord) }));
  const misTareas: TareaV[] = ((ts ?? []) as unknown as { id: string; titulo: string; responsable_id: string | null; fecha_limite: string | null; hecha: boolean; reunion_id: string | null; reuniones: { titulo: string } | null }[])
    .map((t) => ({ id: t.id, titulo: t.titulo, responsable_id: t.responsable_id, responsable: null, fecha_limite: t.fecha_limite, hecha: t.hecha, reunion: t.reuniones?.titulo ?? null, reunion_id: t.reunion_id }));

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
      {activo && <Suspense fallback={null}><ProximoRival supabase={supabase} equipoId={activo.id} /></Suspense>}
      {misTareas.length > 0 && (
        <section className="tarjeta mt-3 p-3">
          <div className="flex items-baseline justify-between"><h2 className="text-sm font-semibold">📝 Tus tareas pendientes</h2><Link href="/reuniones" className="text-xs text-azul underline">Reuniones</Link></div>
          <Tareas tareas={misTareas} yo={user.id} crear={false} verReunion />
        </section>
      )}

      <ModulosInicio todos={todos} elegidos={(pref?.inicio as string[] | null) ?? null} />
      <p className="mt-6 text-center"><Link href="/?guia=1" className="text-xs text-tinta/40 hover:text-tinta">Ver la guía de bienvenida</Link></p>
      <Bienvenida key={guia ?? "0"} abrir={guia === "1" || pref?.bienvenida_vista === false} />
    </div>
  );
}
