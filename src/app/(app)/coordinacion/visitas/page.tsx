import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { equiposDeTemporada } from "@/lib/equipo-activo";
import { fechaCorta, hora } from "@/lib/fechas";
import { Eye, MessageSquare } from "lucide-react";

type Fila = {
  id: string; texto: string; visita: boolean; created_at: string; autor_id: string;
  perfiles: { nombre: string | null } | null;
  entrenamientos: { id: string; fecha: string; equipo_id: string } | null;
};

/** Visitas en directo y comentarios de coordinación a los entrenos */
export default async function VisitasPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const { supabase, perfil } = await requireUser();
  if (perfil.rol !== "coordinador") redirect("/");
  const { equipos } = await equiposDeTemporada(supabase);
  const soloVisitas = ver !== "todo";
  let q = supabase.from("entreno_comentarios")
    .select("id, texto, visita, created_at, autor_id, perfiles!entreno_comentarios_autor_id_fkey(nombre), entrenamientos!inner(id, fecha, equipo_id)")
    .order("created_at", { ascending: false }).limit(300);
  if (soloVisitas) q = q.eq("visita", true);
  const { data } = await q;
  const filas = (data ?? []) as unknown as Fila[];
  const visitas = filas.filter((f) => f.visita);
  const nombreEq = (id?: string) => equipos.find((e) => e.id === id)?.nombre ?? "Otro equipo";
  // Por equipo: cuántas visitas y cuándo fue la última
  const porEquipo = equipos.map((eq) => {
    const v = visitas.filter((f) => f.entrenamientos?.equipo_id === eq.id);
    return { id: eq.id, nombre: eq.nombre, n: v.length, ultima: v[0]?.entrenamientos?.fecha ?? null };
  }).sort((a, b) => (a.ultima ?? "").localeCompare(b.ultima ?? "") || a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <Link href="/coordinacion" className="text-sm text-tinta/60 hover:underline">← Coordinación</Link>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Eye className="text-azul" /> Visitas a entrenos</h1>
      <p className="text-sm text-tinta/60">Para apuntar una visita, abre el entreno y en «Comentarios» marca «Lo he visto en directo». Arriba salen primero los equipos que hace más que no se visitan.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {porEquipo.map((e) => (
          <div key={e.id} className={`tarjeta p-3 ${e.n === 0 ? "border-amber-300" : ""}`}>
            <p className="truncate font-semibold">{e.nombre}</p>
            <p className="text-xs text-tinta/60">{e.n === 0 ? <span className="font-semibold text-amber-700">Sin visitas</span> : <>{e.n} {e.n === 1 ? "visita" : "visitas"} · última {fechaCorta(e.ultima!)}</>}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <h2 className="font-semibold">{soloVisitas ? "Últimas visitas" : "Todos los comentarios"}</h2>
        <Link href={soloVisitas ? "/coordinacion/visitas?ver=todo" : "/coordinacion/visitas"} className="ml-auto text-sm text-azul hover:underline">
          {soloVisitas ? "Ver también los comentarios" : "Ver solo visitas"}
        </Link>
      </div>
      {filas.length === 0 && <p className="mt-2 text-sm text-tinta/60">Todavía no hay nada.</p>}
      <ul className="mt-2 space-y-2">
        {filas.map((f) => (
          <li key={f.id} className={`tarjeta p-3 text-sm ${f.visita ? "border-green-200" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-2 text-xs">
              {f.visita ? <Eye size={13} className="text-green-700" /> : <MessageSquare size={13} className="text-azul" />}
              <Link href={`/entrenamientos/${f.entrenamientos?.id}#comentarios`} className="font-semibold text-azul hover:underline">
                {nombreEq(f.entrenamientos?.equipo_id)} · {f.entrenamientos ? `${fechaCorta(f.entrenamientos.fecha)} ${hora(f.entrenamientos.fecha)}` : ""}
              </Link>
              <span className="text-tinta/60">{f.perfiles?.nombre ?? ""}</span>
            </div>
            <p className="mt-1 whitespace-pre-line">{f.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
