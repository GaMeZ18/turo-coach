"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, CheckCircle2, Copy, FileUp, Loader2 } from "lucide-react";
import { buscarExistente, cambiosFCBQ, leerCalendarioFCBQ, leerLigaFCBQ, sugerirEquipo, type LigaFCBQ, type PartidoFCBQ } from "@/lib/fcbq";
import { importarFCBQ, type ResultadoImportacion } from "./actions";

type Equipo = { id: string; nombre: string; fcbq_nombre: string | null };
type Existente = { id: string; equipo_id: string; fecha: string; rival: string; fcbq_id: string | null } & Record<string, unknown>;

/** Marcador: lo abres en una página de basquetcatala.cat y la envía a esta pantalla.
 *  Corre en tu navegador, así que si la FCBQ pide el captcha lo resuelves tú y listo. */
function codigoMarcador(destino: string) {
  const origen = new URL(destino).origin;
  return `javascript:(()=>{const h=document.documentElement.outerHTML,u=location.href;try{navigator.clipboard.writeText(h).catch(()=>{})}catch(e){}const w=window.open(${JSON.stringify(destino)},"turocoach");if(!w){alert("Permite las ventanas emergentes para basquetcatala.cat");return}let n=0;const t=setInterval(()=>{if(++n>60)clearInterval(t);try{w.postMessage({tipo:"fcbq",html:h,url:u},${JSON.stringify(origen)})}catch(e){}},500);addEventListener("message",e=>{if(e.origin===${JSON.stringify(origen)}&&e.data==="fcbq-ok")clearInterval(t)})})();`;
}
const fechaBonita = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function Importador({ equipos, existentes, temporada }: { equipos: Equipo[]; existentes: Existente[]; temporada: string | null }) {
  const [texto, setTexto] = useState("");
  const [partidos, setPartidos] = useState<PartidoFCBQ[] | null>(null);
  const [liga, setLiga] = useState<LigaFCBQ | null>(null);
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const [origen, setOrigen] = useState<string | null>(null);
  const [marcador, setMarcador] = useState("");
  const [copiado, setCopiado] = useState(false);
  const enlace = useRef<HTMLAnchorElement>(null);

  const leer = (entrada: string, url?: string | null) => {
    setResultado(null);
    setError(null);
    const lista = leerCalendarioFCBQ(entrada);
    const lg = leerLigaFCBQ(entrada, url);
    setLiga(lg);
    if (!lista.length && !lg) {
      setPartidos(null);
      setError("No he encontrado partidos del Turó. Tiene que ser el «Calendari Mensual Club» o la página de «Resultats» de una competición.");
      return;
    }
    setPartidos(lista);
    const nombres = [...new Set([...lista.map((p) => p.nuestro), ...(lg ? [lg.nuestro] : [])])];
    setAsignacion(Object.fromEntries(nombres.map((n) => [n, sugerirEquipo(n, equipos) ?? ""])));
  };

  // Recibir la página enviada desde basquetcatala.cat con el marcador
  const leerRef = useRef(leer);
  leerRef.current = leer;
  useEffect(() => {
    const codigo = codigoMarcador(`${location.origin}/partidos/importar`);
    setMarcador(codigo);
    // React no deja poner "javascript:" en un href; lo ponemos a mano
    enlace.current?.setAttribute("href", codigo);
    const alRecibir = (e: MessageEvent) => {
      if (!/^https:\/\/(www\.)?basquetcatala\.cat$/.test(e.origin)) return;
      const d = e.data as { tipo?: string; html?: string; url?: string };
      if (d?.tipo !== "fcbq" || typeof d.html !== "string") return;
      (e.source as Window | null)?.postMessage("fcbq-ok", e.origin);
      setTexto("");
      setOrigen(d.url ?? "basquetcatala.cat");
      leerRef.current(d.html, d.url);
    };
    window.addEventListener("message", alRecibir);
    return () => window.removeEventListener("message", alRecibir);
  }, []);

  const subir = async (f: File | undefined) => {
    if (!f) return;
    const contenido = await f.text();
    setTexto("");
    leer(contenido);
  };

  const nombresFCBQ = useMemo(() => [...new Set([...(partidos ?? []).map((p) => p.nuestro), ...(liga ? [liga.nuestro] : [])])].sort(), [partidos, liga]);
  const idFCBQ = (nombre: string) => (partidos ?? []).find((p) => p.nuestro === nombre && p.nuestroId)?.nuestroId ?? (liga?.nuestro === nombre ? liga.nuestroId : null);

  const estado = (p: PartidoFCBQ): "sin equipo" | "nuevo" | "actualizar" | "igual" => {
    const eq = asignacion[p.nuestro];
    if (!eq) return "sin equipo";
    const ya = buscarExistente(existentes, eq, p);
    if (!ya) return "nuevo";
    return Object.keys(cambiosFCBQ(ya, p)).length ? "actualizar" : "igual";
  };

  const conEstado = (partidos ?? []).map((p) => ({ p, e: estado(p) })).sort((a, b) => (a.p.dia + a.p.hora).localeCompare(b.p.dia + b.p.hora));
  const cuenta = (e: string) => conEstado.filter((x) => x.e === e).length;
  const aImportar = conEstado.filter((x) => x.e === "nuevo" || x.e === "actualizar").length;
  const ligaLista = !!liga && !!asignacion[liga.nuestro];

  const importar = () => {
    if (!partidos) return;
    const asignaciones = Object.entries(asignacion)
      .filter(([, id]) => id)
      .map(([nombre, equipoId]) => ({ nombre, equipoId, fcbqEquipoId: idFCBQ(nombre) }));
    start(async () => {
      try {
        setResultado(await importarFCBQ(partidos, asignaciones, ligaLista ? liga : null));
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
      {/* Marcador */}
      <div className="tarjeta max-w-3xl space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><Bookmark size={18} className="text-azul" /> Botón «Enviar a Turó Coach»</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-tinta/80">
          <li>
            <strong>Una sola vez:</strong> arrastra este botón a la barra de marcadores del navegador
            (si no la ves: <kbd className="rounded bg-suave px-1">Ctrl+Shift+B</kbd>, o <kbd className="rounded bg-suave px-1">⌘+Shift+B</kbd> en Mac).
            <div className="my-2 flex flex-wrap items-center gap-2">
              {/* href lo pone el useEffect */}
              <a ref={enlace} onClick={(e) => e.preventDefault()} className="btn-primario cursor-grab" title="Arrástralo a la barra de marcadores">
                ⇪ Enviar a Turó Coach
              </a>
              <button type="button" className="btn-secundario !py-1.5 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(marcador); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} }}>
                <Copy size={14} /> {copiado ? "Copiado" : "Copiar código"}
              </button>
              <span className="text-xs text-tinta/50">(para crearlo a mano: nuevo marcador y pega el código como URL)</span>
            </div>
          </li>
          <li>
            Abre en basquetcatala.cat la página que quieras traer:
            <ul className="ml-5 list-disc text-tinta/70">
              <li>
                <a href="https://www.basquetcatala.cat/partits/calendari_club_mensual/3373" target="_blank" rel="noreferrer" className="font-medium text-azul underline">Calendari mensual del club</a>{" "}
                → partidos de todos los equipos (fechas, horas, pistas).
              </li>
              <li><strong>Resultats</strong> de la competición de un equipo (desde la página del equipo → su competición → Resultats) → marcadores.</li>
            </ul>
          </li>
          <li>
            Pulsa el marcador <strong>Enviar a Turó Coach</strong>: se abre esta pantalla con los partidos leídos. Si la FCBQ te pide verificar que no eres un robot, hazlo primero.
            <span className="block text-xs text-tinta/50">Si no llegan, la página también queda copiada: ábrela en «Otras formas» y pégala con Ctrl+V.</span>
          </li>
        </ol>
        {origen && <p className="rounded-lg bg-green-50 p-2 text-xs text-green-800">Recibido de {origen}</p>}
      </div>

      {/* Entrada manual */}
      <details className="tarjeta max-w-3xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-tinta/70">Otras formas: pegar el texto o subir la página guardada (Ctrl+S)</summary>
        <div className="mt-3 space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Pega aquí la página copiada de la FCBQ (Ctrl+A, Ctrl+C)…"
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
        </div>
      </details>
      {error && <p className="max-w-3xl rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

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
              <h2 className="mr-2 font-semibold">{partidos.length} partidos del Turó leídos</h2>
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
                        {p.pf !== null && p.pc !== null && (
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums text-white ${p.pf > p.pc ? "bg-green-600" : p.pf < p.pc ? "bg-rojo" : "bg-tinta/50"}`}>
                            {p.local ? `${p.pf}-${p.pc}` : `${p.pc}-${p.pf}`}
                          </span>
                        )}
                        <span className="block text-xs text-tinta/50">{[p.categoria, p.jornada ? `Jornada ${p.jornada}` : ""].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="hidden px-3 py-1.5 text-xs text-tinta/60 md:table-cell">{p.lugar}</td>
                      <td className="px-3 py-1.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTILO[e]}`}>{e === "igual" ? "sin cambios" : e}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {liga && (
            <p className="tarjeta max-w-3xl p-3 text-sm">
              <strong>Liga{liga.nombre ? ` · ${liga.nombre}` : ""}:</strong>{" "}
              {liga.resultados.length} partidos de todos los equipos ({liga.resultados.filter((r) => r.pl !== null).length} con resultado)
              {liga.clasificacion ? " y la clasificación oficial" : ""}. Se verán en Partidos de{" "}
              {equipos.find((e) => e.id === asignacion[liga.nuestro])?.nombre ?? <em>(elige el equipo de {liga.nuestro})</em>}.
            </p>
          )}

          {resultado ? (
            <div className="tarjeta flex max-w-3xl items-start gap-3 border-green-200 bg-green-50 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={20} />
              <div>
                <p className="font-semibold text-green-800">Importación hecha: {resultado.nuevos} nuevos, {resultado.actualizados} actualizados, {resultado.iguales} sin cambios{resultado.liga ? " · liga y clasificación guardadas" : ""}.</p>
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
            <button type="button" onClick={importar} disabled={pendiente || (aImportar === 0 && !ligaLista)} className="btn-primario">
              {pendiente ? <><Loader2 size={16} className="animate-spin" /> Importando…</> : aImportar ? `Importar ${aImportar} partidos${ligaLista ? " y la liga" : ""}` : ligaLista ? "Guardar liga y clasificación" : "Nada que importar"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
