"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { leerCalendarioFCBQ, leerLigaFCBQ, sugerirEquipo, unirResultados, type LigaFCBQ, type PartidoFCBQ } from "@/lib/fcbq";
import { importarFCBQ, type ResultadoImportacion } from "./actions";
import { marcarAplazados } from "../actions";
import { guardarStatsFCBQ, statsPendientes } from "../../scouting/actions";
import { compactarStats, type StatsPartido } from "@/lib/stats-fcbq";

type Equipo = { id: string; nombre: string; fcbq_nombre: string | null };
type Pagina = { url: string; html: string };
type Leido = { partidos: PartidoFCBQ[]; ligas: LigaFCBQ[]; nombres: string[]; ids: Record<string, string | null> };

const CLUB = "3373";

/** Trozo del HTML de una página de resultados (para diagnosticar si cambia la web) */
function muestra(paginas: Pagina[]) {
  const pg = paginas.find((p) => /\/competicions\/resultats\/\d+\/[1-9]/.test(p.url)) ?? paginas.find((p) => /resultats/.test(p.url));
  if (!pg) return "—";
  const doc = new DOMParser().parseFromString(pg.html, "text/html");
  const corta = (el: Element | null | undefined, n = 1500) => (el ? el.outerHTML.replace(/\s+/g, " ").slice(0, n) : "—");
  const ranking = doc.querySelector(".nameTeamLegend2");
  let fila: Element | null | undefined = ranking;
  for (let i = 0; i < 3 && fila?.parentElement; i++) fila = fila.parentElement;
  return [pg.url, "PARTIDO: " + corta(doc.querySelector(".rowJornada")), "CLASIFICACION: " + corta(fila, 2500), "JORNADA: " + corta(doc.querySelector(".bg-2"), 400)].join("\n");
}

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
  const [informe, setInforme] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
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
      if (d.tipo === "turo-fcbq-pong") {
        if (!respondio && /[?&]auto=1/.test(location.search) && !autoLanzado.current) { autoLanzado.current = true; setTimeout(() => actualizarRef.current(), 300); }
        respondio = true; setInstalada(true);
      }
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
        // Informe para diagnosticar si algo no llega
        const tipo = (u: string) => (/calendari_club/.test(u) ? "calendario" : /\/equip\//.test(u) ? "equipo" : /resultats/.test(u) ? "resultados" : /classifica/.test(u) ? "clasificación" : "otra");
        const cuenta: Record<string, number> = {};
        for (const pg of d.paginas) cuenta[tipo(pg.url)] = (cuenta[tipo(pg.url)] ?? 0) + 1;
        const enlacesEquipo = d.paginas.filter((pg) => tipo(pg.url) === "equipo").slice(0, 2)
          .map((pg) => `${pg.url}\n  ` + [...new Set([...pg.html.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]).filter((h) => /competici|resultat|classific|calendari|partit/i.test(h)))].slice(0, 25).join("\n  "));
        setInforme([
          `Turó Coach · informe FCBQ ${new Date().toLocaleString("es-ES")}`,
          `Páginas: ${Object.entries(cuenta).map(([k, v]) => `${k} ${v}`).join(", ")}`,
          `Partidos del Turó leídos: ${l.partidos.length} · con marcador: ${l.partidos.filter((x) => x.pf !== null).length}`,
          `Ligas: ${l.ligas.map((x) => `${x.nuestro} (${x.resultados.length} partidos, ${x.resultados.filter((r) => r.statsId).length} con stats, clasif. ${x.clasificacion ? "sí" : "no"})`).join("; ") || "ninguna"}`,
          `Equipos FCBQ: ${l.nombres.join(", ")}`,
          `Avisos: ${(d.avisos ?? []).join(" | ") || "—"}`,
          `Enlaces en páginas de equipo:\n${enlacesEquipo.join("\n") || "—"}`,
          `Muestra de resultados:\n${muestra(d.paginas)}`,
        ].join("\n"));
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

  // Modo automático (?auto=1): lo abre la extensión los lunes a las 6:00; al acabar se cierra sola
  const autoLanzado = useRef(false);
  useEffect(() => {
    if (!autoLanzado.current || (estado !== "hecho" && estado !== "error")) return;
    window.postMessage({ tipo: "turo-fcbq-terminado", ok: estado === "hecho" }, location.origin);
  }, [estado]);

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
  const actualizarRef = useRef(actualizar);
  actualizarRef.current = actualizar;

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

      {informe && (estado === "hecho" || estado === "error") && (
        <details className="max-w-xl text-xs text-tinta/60">
          <summary className="cursor-pointer">Detalle de lo leído</summary>
          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-suave p-2">{informe}</pre>
          <button type="button" className="btn-secundario mt-1 !py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(informe); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} }}>
            {copiado ? "Copiado" : "Copiar informe"}
          </button>
        </details>
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
            {resultado.desaparecidos?.length > 0 && (
              <div className="mt-2 rounded border border-oro bg-oro/15 p-2 text-tinta">
                <p className="font-semibold">{resultado.desaparecidos.length} partidos ya no aparecen en el calendario de la FCBQ (aplazados o anulados):</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {resultado.desaparecidos.map((d) => (
                    <li key={d.id}><Link href={`/partidos/${d.id}`} className="underline">{new Date(d.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })} · {d.equipo} – {d.rival}</Link></li>
                  ))}
                </ul>
                <button type="button" className="btn-secundario mt-2 !py-1 text-xs" onClick={async () => { await marcarAplazados(resultado.desaparecidos.map((d) => d.id)); setResultado({ ...resultado, desaparecidos: [] }); router.refresh(); }}>
                  Marcarlos como aplazados
                </button>
              </div>
            )}
            {[...resultado.errores, ...avisos].length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-red-700">{[...resultado.errores, ...avisos].slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}</ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
