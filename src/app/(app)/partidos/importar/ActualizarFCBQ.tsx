"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { leerCalendarioFCBQ, leerLigaFCBQ, sugerirEquipo, unirResultados, type LigaFCBQ, type PartidoFCBQ } from "@/lib/fcbq";
import { importarFCBQ, type ResultadoImportacion } from "./actions";
import { guardarStatsFCBQ, statsPendientes } from "../../scouting/actions";
import { compactarStats, type StatsPartido } from "@/lib/stats-fcbq";

type Equipo = { id: string; nombre: string; fcbq_nombre: string | null };
type Pagina = { url: string; html: string };
type Leido = { partidos: PartidoFCBQ[]; ligas: LigaFCBQ[]; nombres: string[]; ids: Record<string, string | null> };

const CLUB = "3373";

/** Convierte las páginas de la FCBQ en partidos (calendario + resultados) y ligas */
function procesar(paginas: Pagina[]): Leido {
  const rango = (u: string) => (/calendari_club/.test(u) ? 0 : /\/competicions\/resultats/.test(u) ? 1 : 2);
  const orden = [...paginas].sort((a, b) => rango(a.url) - rango(b.url));
  const partidos: PartidoFCBQ[] = [];
  const vistos = new Set<string>();
  const ligas = new Map<string, LigaFCBQ>();
  const ids: Record<string, string | null> = {};

  for (const p of orden) {
    if (rango(p.url) < 2) {
      for (const x of leerCalendarioFCBQ(p.html)) {
        if (vistos.has(x.clave)) continue;
        vistos.add(x.clave);
        partidos.push(x);
        if (x.nuestroId) ids[x.nuestro] = x.nuestroId;
      }
    }
    if (rango(p.url) > 0) {
      const l = leerLigaFCBQ(p.html, p.url);
      if (!l) continue;
      const ya = ligas.get(l.nuestro);
      ligas.set(l.nuestro, ya ? {
        ...ya,
        nombre: ya.nombre || l.nombre,
        url: ya.url || l.url,
        nuestroId: ya.nuestroId || l.nuestroId,
        resultados: unirResultados(ya.resultados, l.resultados),
        clasificacion: ya.clasificacion ?? l.clasificacion,
      } : l);
    }
  }
  const nombres = [...new Set([...partidos.map((p) => p.nuestro), ...ligas.keys()])].sort();
  return { partidos, ligas: [...ligas.values()], nombres, ids };
}

export default function ActualizarFCBQ({ equipos }: { equipos: Equipo[] }) {
  const router = useRouter();
  const [instalada, setInstalada] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<"listo" | "trabajando" | "asignar" | "hecho" | "error">("listo");
  const [texto, setTexto] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [leido, setLeido] = useState<Leido | null>(null);
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [numStats, setNumStats] = useState(0);
  const equipoDeStats = useRef(new Map<string, string>());
  const equiposRef = useRef(equipos);
  equiposRef.current = equipos;

  const importar = async (l: Leido, asig: Record<string, string>) => {
    setEstado("trabajando");
    setTexto("Guardando en Turó Coach…");
    try {
      const asignaciones = Object.entries(asig).filter(([, id]) => id).map(([nombre, equipoId]) => ({ nombre, equipoId, fcbqEquipoId: l.ids[nombre] ?? l.ligas.find((x) => x.nuestro === nombre)?.nuestroId ?? null }));
      const r = await importarFCBQ(l.partidos, asignaciones, l.ligas);
      setResultado(r);
      // Fase 2: estadísticas de los partidos jugados que aún no tenemos
      const pares = l.ligas
        .filter((x) => asig[x.nuestro])
        .map((x) => ({ equipoId: asig[x.nuestro], ids: [...new Set(x.resultados.filter((y) => y.statsId && y.pl !== null).map((y) => y.statsId!))] }));
      const { pendientes, error } = await statsPendientes(pares);
      if (error) setAvisos((a) => [...a, error]);
      if (pendientes.length) {
        equipoDeStats.current = new Map(pendientes.map((x) => [x.id, x.equipoId]));
        setTexto(`Descargando estadísticas de ${pendientes.length} partidos…`);
        window.postMessage({ tipo: "turo-fcbq-inicio" }, location.origin);
        window.postMessage({ tipo: "turo-fcbq-pedir-stats", ids: pendientes.map((x) => x.id) }, location.origin);
        return;
      }
      setEstado("hecho");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setTexto(e instanceof Error ? e.message : "No se ha podido guardar.");
    }
  };
  const importarRef = useRef(importar);
  importarRef.current = importar;

  const guardarStats = async (crudos: Record<string, unknown>, pendientesFCBQ: number) => {
    setTexto("Guardando estadísticas…");
    try {
      const porEquipo = new Map<string, StatsPartido[]>();
      for (const [id, j] of Object.entries(crudos)) {
        const s = compactarStats(id, j);
        const eq = equipoDeStats.current.get(id);
        if (s && eq) porEquipo.set(eq, [...(porEquipo.get(eq) ?? []), s]);
      }
      let n = 0;
      for (const [eq, lista] of porEquipo) for (let i = 0; i < lista.length; i += 25) n += await guardarStatsFCBQ(eq, lista.slice(i, i + 25));
      setNumStats(n);
      if (pendientesFCBQ > 0) setAvisos((a) => [...a, `Quedan ${pendientesFCBQ} partidos por descargar: vuelve a pulsar Actualizar.`]);
    } catch (e) {
      setAvisos((a) => [...a, e instanceof Error ? e.message : "No se han podido guardar las estadísticas."]);
    }
    setEstado("hecho");
    router.refresh();
  };
  const guardarStatsRef = useRef(guardarStats);
  guardarStatsRef.current = guardarStats;

  useEffect(() => {
    // ¿Está la extensión? Le preguntamos y esperamos su respuesta
    let respondio = false;
    let recibido = false;
    const ping = () => window.postMessage({ tipo: "turo-fcbq-ping" }, location.origin);
    ping();
    const t1 = setTimeout(ping, 400);
    const t = setTimeout(() => { if (!respondio) setInstalada(false); }, 1200);

    const alRecibir = (e: MessageEvent) => {
      if (e.source !== window || !e.data || typeof e.data.tipo !== "string" || !e.data.tipo.startsWith("turo-fcbq-")) return;
      const d = e.data as { tipo: string; texto?: string; paginas?: Pagina[]; avisos?: string[]; stats?: Record<string, unknown>; pendientes?: number };
      if (d.tipo === "turo-fcbq-stats") { recibido = true; guardarStatsRef.current(d.stats ?? {}, d.pendientes ?? 0); }
      if (d.tipo === "turo-fcbq-pong") { respondio = true; setInstalada(true); }
      if (d.tipo === "turo-fcbq-progreso") setTexto(d.texto ?? "");
      if (d.tipo === "turo-fcbq-error") {
        // Si falla solo la parte de estadísticas, lo demás ya está guardado
        if (equipoDeStats.current.size) { setAvisos((a) => [...a, `Estadísticas: ${d.texto}`]); setEstado("hecho"); equipoDeStats.current = new Map(); router.refresh(); }
        else { setEstado("error"); setTexto(d.texto ?? "Error"); }
      }
      if (d.tipo === "turo-fcbq-fin" && !recibido) setTexto("Se ha cortado la conexión con la extensión. Vuelve a pulsar Actualizar.");
      if (d.tipo === "turo-fcbq-inicio") recibido = false;
      if (d.tipo === "turo-fcbq-fin" && !recibido) setEstado((s) => (s === "trabajando" ? "error" : s));
      if (d.tipo === "turo-fcbq-error") recibido = true;
      if (d.tipo === "turo-fcbq-datos" && d.paginas) {
        recibido = true;
        setAvisos(d.avisos ?? []);
        const l = procesar(d.paginas);
        if (!l.partidos.length && !l.ligas.length) { setEstado("error"); setTexto("La FCBQ no ha devuelto partidos del Turó."); return; }
        const eqs = equiposRef.current;
        const asig = Object.fromEntries(l.nombres.map((n) => [n, sugerirEquipo(n, eqs) ?? ""]));
        setLeido(l);
        setAsignacion(asig);
        // Si todos los equipos tienen pareja, se guarda directamente
        if (l.nombres.every((n) => asig[n])) importarRef.current(l, asig);
        else { setEstado("asignar"); setTexto(""); }
      }
    };
    window.addEventListener("message", alRecibir);
    return () => { clearTimeout(t); clearTimeout(t1); window.removeEventListener("message", alRecibir); };
  }, []);

  const actualizar = () => {
    setEstado("trabajando");
    setResultado(null);
    setAvisos([]);
    setNumStats(0);
    equipoDeStats.current = new Map();
    setTexto("Abriendo basquetcatala.cat…");
    window.postMessage({ tipo: "turo-fcbq-inicio" }, location.origin);
    window.postMessage({ tipo: "turo-fcbq-pedir", club: CLUB }, location.origin);
  };

  if (instalada === false) {
    return (
      <Link href="/partidos/importar#extension" className="btn-secundario">
        <RefreshCw size={16} /> Actualizar desde la FCBQ
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={actualizar} disabled={estado === "trabajando" || instalada === null} className="btn-primario">
        {estado === "trabajando" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualizar desde la FCBQ
      </button>

      {estado === "trabajando" && texto && <p className="text-sm text-tinta/70">{texto}</p>}
      {estado === "error" && <p className="max-w-xl rounded-lg bg-red-50 p-2 text-sm text-red-700">{texto}</p>}

      {estado === "asignar" && leido && (
        <div className="tarjeta max-w-xl space-y-3 p-4">
          <p className="text-sm font-semibold">¿Qué equipo de Turó Coach es cada uno? <span className="font-normal text-tinta/60">Solo la primera vez.</span></p>
          {leido.nombres.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0 truncate font-medium" title={n}>{n}</span>
              <select value={asignacion[n] ?? ""} onChange={(e) => setAsignacion((a) => ({ ...a, [n]: e.target.value }))} className="campo !py-1.5">
                <option value="">No importar</option>
                {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </label>
          ))}
          <button type="button" className="btn-primario" onClick={() => importar(leido, asignacion)}>Guardar</button>
        </div>
      )}

      {estado === "hecho" && resultado && (
        <div className="flex max-w-xl items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              Actualizado: {resultado.nuevos} partidos nuevos, {resultado.actualizados} actualizados
              {resultado.ligas ? `, ${resultado.ligas} ligas con clasificación` : ""}
              {numStats ? `, estadísticas de ${numStats} partidos` : ""}.
            </p>
            {[...resultado.errores, ...avisos].length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-red-700">{[...resultado.errores, ...avisos].slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}</ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
