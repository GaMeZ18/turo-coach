"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { leerCalendarioFCBQ, sugerirEquipo, type PartidoFCBQ } from "@/lib/fcbq";
import { importarFCBQ, type ResultadoImportacion } from "./actions";

type Equipo = { id: string; nombre: string; fcbq_nombre: string | null };
type Existente = { id: string; equipo_id: string; fecha: string; rival: string; local: boolean; lugar: string | null; competicion: string | null; fcbq_id: string | null };

const TZ = "Europe/Madrid";
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const horaLocal = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const fechaBonita = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function Importador({ equipos, existentes, temporada }: { equipos: Equipo[]; existentes: Existente[]; temporada: string | null }) {
  const [texto, setTexto] = useState("");
  const [partidos, setPartidos] = useState<PartidoFCBQ[] | null>(null);
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const leer = (entrada: string) => {
    setResultado(null);
    setError(null);
    const lista = leerCalendarioFCBQ(entrada);
    if (!lista.length) {
      setPartidos(null);
      setError("No he encontrado partidos. Comprueba que es el «Calendari Mensual Club» de basquetcatala.cat.");
      return;
    }
    setPartidos(lista);
    const nombres = [...new Set(lista.map((p) => p.nuestro))];
    setAsignacion(Object.fromEntries(nombres.map((n) => [n, sugerirEquipo(n, equipos) ?? ""])));
  };

  const subir = async (f: File | undefined) => {
    if (!f) return;
    const contenido = await f.text();
    setTexto("");
    leer(contenido);
  };

  const nombresFCBQ = useMemo(() => [...new Set((partidos ?? []).map((p) => p.nuestro))].sort(), [partidos]);
  const idFCBQ = (nombre: string) => (partidos ?? []).find((p) => p.nuestro === nombre && p.nuestroId)?.nuestroId ?? null;

  const estado = (p: PartidoFCBQ): "sin equipo" | "nuevo" | "actualizar" | "igual" => {
    const eq = asignacion[p.nuestro];
    if (!eq) return "sin equipo";
    const ya = (p.fcbqId && existentes.find((x) => x.fcbq_id === p.fcbqId)) ||
      existentes.find((x) => x.equipo_id === eq && diaLocal(x.fecha) === p.dia && norm(x.rival) === norm(p.rival));
    if (!ya) return "nuevo";
    const igual = horaLocal(ya.fecha) === p.hora && diaLocal(ya.fecha) === p.dia && ya.local === p.local &&
      (ya.lugar ?? "") === (p.lugar ?? "") && (ya.competicion ?? "") === (p.categoria ?? "") && (!p.fcbqId || ya.fcbq_id === p.fcbqId);
    return igual ? "igual" : "actualizar";
  };

  const conEstado = (partidos ?? []).map((p) => ({ p, e: estado(p) })).sort((a, b) => (a.p.dia + a.p.hora).localeCompare(b.p.dia + b.p.hora));
  const cuenta = (e: string) => conEstado.filter((x) => x.e === e).length;
  const aImportar = conEstado.filter((x) => x.e === "nuevo" || x.e === "actualizar").length;

  const importar = () => {
    if (!partidos) return;
    const asignaciones = Object.entries(asignacion)
      .filter(([, id]) => id)
      .map(([nombre, equipoId]) => ({ nombre, equipoId, fcbqEquipoId: idFCBQ(nombre) }));
    start(async () => {
      try {
        setResultado(await importarFCBQ(partidos, asignaciones));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido importar.");
      }
    });
  };

  const ESTILO: Record<string, string> = {
    nuevo: "bg-green-100 text-green-800",
    actualizar: "bg-oro/40 text-tinta",
    igual: "bg-suave text-tinta/50",
    "sin equipo": "bg-red-50 text-red-700",
  };

  if (!equipos.length) {
    return <p className="tarjeta p-4 text-sm text-tinta/70">Primero crea los equipos de la temporada{temporada ? ` ${temporada}` : ""} en <Link href="/equipos" className="text-azul underline">Equipos</Link>.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Entrada */}
      <div className="tarjeta max-w-3xl space-y-3 p-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder="Pega aquí el calendario copiado de la FCBQ…"
          className="campo font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => leer(texto)} disabled={!texto.trim()} className="btn-primario">Leer partidos</button>
          <span className="text-sm text-tinta/50">o</span>
          <label className="btn-secundario cursor-pointer">
            <FileUp size={16} /> Subir página guardada (.html)
            <input type="file" accept=".html,.htm,.txt,text/html,text/plain" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      </div>

      {partidos && (
        <>
          {/* Equipos */}
          <section className="tarjeta max-w-3xl p-4">
            <h2 className="font-semibold">¿Qué equipo es cada uno?</h2>
            <p className="text-xs text-tinta/60">La próxima vez se acordará. Deja «No importar» para saltar un equipo.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {nombresFCBQ.map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0 truncate font-medium" title={n}>{n}</span>
                  <span className="text-tinta/40">→</span>
                  <select value={asignacion[n] ?? ""} onChange={(e) => setAsignacion((a) => ({ ...a, [n]: e.target.value }))} className="campo !py-1.5">
                    <option value="">No importar</option>
                    {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          {/* Vista previa */}
          <section>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <h2 className="mr-2 font-semibold">{partidos.length} partidos leídos</h2>
              {(["nuevo", "actualizar", "igual", "sin equipo"] as const).map((e) => cuenta(e) > 0 && (
                <span key={e} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO[e]}`}>{cuenta(e)} {e === "igual" ? "sin cambios" : e === "actualizar" ? "a actualizar" : e === "nuevo" ? "nuevos" : "sin equipo"}</span>
              ))}
            </div>
            <div className="tarjeta mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-suave text-left text-xs uppercase tracking-wide text-tinta/60">
                  <tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Equipo</th><th className="px-3 py-2">Partido</th><th className="hidden px-3 py-2 md:table-cell">Pista</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {conEstado.map(({ p, e }) => (
                    <tr key={p.clave} className={`border-t border-linea ${e === "igual" || e === "sin equipo" ? "text-tinta/45" : ""}`}>
                      <td className="whitespace-nowrap px-3 py-1.5 capitalize">{fechaBonita(p.dia)} · {p.hora}</td>
                      <td className="whitespace-nowrap px-3 py-1.5">{equipos.find((x) => x.id === asignacion[p.nuestro])?.nombre ?? p.nuestro}</td>
                      <td className="px-3 py-1.5">
                        <span className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-bold uppercase ${p.local ? "bg-azul text-white" : "bg-oro text-tinta"}`}>{p.local ? "Casa" : "Fuera"}</span>
                        {p.rival}
                        <span className="block text-xs text-tinta/50">{p.categoria}</span>
                      </td>
                      <td className="hidden px-3 py-1.5 text-xs text-tinta/60 md:table-cell">{p.lugar}</td>
                      <td className="px-3 py-1.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTILO[e]}`}>{e === "igual" ? "sin cambios" : e}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {resultado ? (
            <div className="tarjeta flex max-w-3xl items-start gap-3 border-green-200 bg-green-50 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={20} />
              <div>
                <p className="font-semibold text-green-800">Importación hecha: {resultado.nuevos} nuevos, {resultado.actualizados} actualizados, {resultado.iguales} sin cambios.</p>
                {resultado.errores.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-red-700">{resultado.errores.map((x, i) => <li key={i}>{x}</li>)}</ul>
                )}
                <div className="mt-2 flex gap-3">
                  <Link href="/partidos" className="font-medium text-azul underline">Ver partidos</Link>
                  <Link href="/calendario?todo=1" className="font-medium text-azul underline">Ver calendario del club</Link>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={importar} disabled={pendiente || aImportar === 0} className="btn-primario">
              {pendiente ? <><Loader2 size={16} className="animate-spin" /> Importando…</> : aImportar ? `Importar ${aImportar} partidos` : "Nada que importar"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
