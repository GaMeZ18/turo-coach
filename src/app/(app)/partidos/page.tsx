import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { equipoActivo } from "@/lib/equipo-activo";
import { fechaCorta, hora, hoyLocal } from "@/lib/fechas";
import SinEquipo from "@/components/SinEquipo";
import Enviar from "@/components/Enviar";
import { crearPartido } from "./actions";
import { Resultado, type Partido } from "./comun";

export default async function PartidosPage() {
  const { supabase } = await requireUser();
  const equipo = await equipoActivo(supabase);
  if (!equipo) {
    return (
      <div className="space-y-3">
        <SinEquipo que="sus partidos" />
        <p className="text-center text-sm"><Link href="/partidos/importar" className="font-medium text-azul underline">o importa los partidos de todo el club desde la FCBQ</Link></p>
      </div>
    );
  }

  const { data } = await supabase
    .from("partidos")
    .select("id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado")
    .eq("equipo_id", equipo.id)
    .order("fecha", { ascending: true });
  const lista = (data ?? []) as Partido[];
  const ahora = Date.now() - 3 * 3600 * 1000;
  const proximos = lista.filter((p) => p.estado !== "jugado" && new Date(p.fecha).getTime() >= ahora);
  const anteriores = lista.filter((p) => !proximos.includes(p)).reverse();

  const jugados = lista.filter((p) => p.estado === "jugado" && p.puntos_favor !== null && p.puntos_contra !== null);
  const victorias = jugados.filter((p) => p.puntos_favor! > p.puntos_contra!).length;
  const derrotas = jugados.filter((p) => p.puntos_favor! < p.puntos_contra!).length;
  const pf = jugados.reduce((s, p) => s + p.puntos_favor!, 0);
  const pc = jugados.reduce((s, p) => s + p.puntos_contra!, 0);

  const Fila = ({ p }: { p: Partido }) => (
    <Link href={`/partidos/${p.id}`} className="tarjeta flex items-center gap-3 p-3 transition hover:shadow-md">
      <div className="w-16 shrink-0 text-center">
        <div className="text-xs uppercase text-tinta/50">{fechaCorta(p.fecha).split(",")[0]}</div>
        <div className="text-lg font-semibold leading-tight">{hora(p.fecha)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.local ? "bg-azul text-white" : "bg-oro text-tinta"}`}>{p.local ? "Casa" : "Fuera"}</span>
          {p.local ? `${equipo.nombre} – ${p.rival}` : `${p.rival} – ${equipo.nombre}`}
        </div>
        <div className="truncate text-xs text-tinta/60">
          {fechaCorta(p.fecha)}
          {p.competicion ? ` · ${p.competicion}` : ""}{p.jornada ? ` · J${p.jornada}` : ""}{p.lugar ? ` · ${p.lugar}` : ""}
        </div>
      </div>
      <Resultado p={p} />
    </Link>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Partidos</h1>
          <p className="text-sm text-tinta/60">{equipo.nombre}</p>
          <Link href="/partidos/importar" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-azul hover:underline">⇣ Importar de la FCBQ</Link>
        </div>
        {jugados.length > 0 && (
          <div className="flex gap-4 text-center">
            <div><div className="text-2xl font-bold text-azul">{victorias}-{derrotas}</div><div className="text-[11px] uppercase text-tinta/50">Balance</div></div>
            <div><div className="text-2xl font-bold text-azul">{(pf / jugados.length).toFixed(1)}</div><div className="text-[11px] uppercase text-tinta/50">PF/partido</div></div>
            <div><div className="text-2xl font-bold text-azul">{(pc / jugados.length).toFixed(1)}</div><div className="text-[11px] uppercase text-tinta/50">PC/partido</div></div>
          </div>
        )}
      </div>

      {!equipo.congelado && (
        <form action={crearPartido} className="tarjeta mt-5 grid grid-cols-2 gap-2 p-4 sm:grid-cols-6 sm:items-end">
          <input type="hidden" name="equipo_id" value={equipo.id} />
          <div><label className="etiqueta">Día</label><input name="dia" type="date" required defaultValue={hoyLocal()} className="campo" /></div>
          <div><label className="etiqueta">Hora</label><input name="hora" type="time" defaultValue="12:00" className="campo" /></div>
          <div className="col-span-2"><label className="etiqueta">Rival</label><input name="rival" required placeholder="CB Rival" className="campo" /></div>
          <div>
            <label className="etiqueta">Dónde</label>
            <select name="local" className="campo"><option value="casa">En casa</option><option value="fuera">Fuera</option></select>
          </div>
          <Enviar>Añadir</Enviar>
          <div className="col-span-2"><input name="competicion" placeholder="Competición (Liga, Copa…)" className="campo" /></div>
          <div><input name="jornada" type="number" min={1} placeholder="Jornada" className="campo" /></div>
          <div className="col-span-2 sm:col-span-3"><input name="lugar" placeholder="Pista / dirección (opcional)" className="campo" /></div>
        </form>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Próximos</h2>
      <div className="mt-2 space-y-2">
        {proximos.map((p) => <Fila key={p.id} p={p} />)}
        {proximos.length === 0 && <p className="text-sm text-tinta/50">No hay partidos programados.</p>}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-tinta/60">Jugados</h2>
      <div className="mt-2 space-y-2">
        {anteriores.map((p) => <Fila key={p.id} p={p} />)}
        {anteriores.length === 0 && <p className="text-sm text-tinta/50">Todavía no hay partidos jugados.</p>}
      </div>
    </div>
  );
}
