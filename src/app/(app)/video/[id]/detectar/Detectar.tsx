"use client";

// Detectar tiros en el navegador: el vídeo original se elige del ordenador y se analiza aquí mismo
// (no se sube a ningún sitio). Al acabar, los tiros se guardan como clips «por revisar».
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Crosshair, FileVideo, Loader2, ScanSearch, Square, TriangleAlert } from "lucide-react";
import type { Aro, Evento } from "@/lib/detector";
import { alteracionLectura, buscarCanastas, buscarTiros, type Control } from "@/lib/detector-web";
import { importarDetecciones } from "../../actions";
import { archivoDe, recordarArchivo } from "@/lib/archivo-local";
import { mmss } from "@/lib/video";

type Fase = "elegir" | "fondo" | "canastas" | "marcar" | "tiros" | "guardando" | "hecho" | "error";
type Rect = { x: number; y: number; w: number; h: number };


export default function Detectar({ videoId, titulo, local, archivoEsperado }: {
  videoId: string; titulo: string; local: boolean; archivoEsperado?: { nombre: string; bytes: number | null } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<Control>({ parar: false, corregir: false });
  const [esBrave, setEsBrave] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { brave?: { isBrave: () => Promise<boolean> } };
    nav.brave?.isBrave().then(setEsBrave).catch(() => {});
  }, []);
  const [archivo, setArchivo] = useState<File | null>(null);
  const archivoActual = useRef<File | null>(null);
  archivoActual.current = archivo;
  const [desfase, setDesfase] = useState("0");
  const [fase, setFase] = useState<Fase>("elegir");
  const [msg, setMsg] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [resto, setResto] = useState<number | null>(null);
  const [tiros, setTiros] = useState(0);
  const [aros, setAros] = useState<Aro[]>([]);
  const [oculto, setOculto] = useState(false);
  const [resultado, setResultado] = useState<{ nuevos: number; repetidos: number; total: number } | null>(null);
  const [marcados, setMarcados] = useState<Rect[]>([]);
  const [arrastre, setArrastre] = useState<Rect | null>(null);
  const datos = useRef<{ W: number; H: number; dur: number; foto: ImageData | null }>({ W: 0, H: 0, dur: 0, foto: null });

  useEffect(() => {
    const f = () => setOculto(document.hidden);
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);

  // Evitar que la pantalla se apague mientras analiza
  useEffect(() => {
    if (fase !== "tiros" && fase !== "canastas") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [fase]);

  // ------------------------------------------------------------------ pasos
  // Si se acaba de añadir el vídeo con su archivo, empezar directamente
  const autoIniciado = useRef(false);
  useEffect(() => {
    const f = archivoDe(videoId);
    if (f && !autoIniciado.current) { autoIniciado.current = true; setArchivo(f); setTimeout(() => empezarRef.current(f), 0); }
  }, [videoId]);
  const empezarRef = useRef<(f?: File) => void>(() => {});

  const empezar = async (elegido?: File) => {
    const v = videoRef.current;
    const archivo = elegido ?? archivoActual.current;
    if (!v || !archivo) return;
    if (local) recordarArchivo(videoId, archivo);
    if (alteracionLectura() > 0.01) {
      setFase("error");
      setMsg(esBrave
        ? "Brave está alterando la imagen del vídeo para protegerte del rastreo, y así no se ve el balón. Pulsa el icono del león (a la derecha de la dirección) → «Controles avanzados» → «Bloquear huellas digitales» → «Permitir» para coach.cbturo.com, recarga la página y vuelve a empezar."
        : "El navegador (o alguna extensión de privacidad) está alterando la imagen del vídeo y así no se ve el balón. Desactiva la protección contra huellas digitales para coach.cbturo.com o usa Chrome o Edge.");
      return;
    }
    ctl.current = { parar: false, corregir: false };
    setTiros(0); setProgreso(0); setResto(null); setResultado(null); setMsg("");
    v.muted = true;
    try {
      await new Promise<void>((res, rej) => {
        v.onloadedmetadata = () => res();
        v.onerror = () => rej(new Error("formato"));
        v.src = URL.createObjectURL(archivo);
      });
    } catch {
      setFase("error");
      setMsg("Este navegador no puede leer el vídeo. Prueba con Chrome, Edge o Brave, o convierte el vídeo a MP4 (H.264).");
      return;
    }
    if (v.videoHeight < 700) setMsg(`Aviso: el vídeo es de ${v.videoWidth}×${v.videoHeight}. Con menos de 720p el balón se ve muy pequeño y se escaparán tiros.`);
    setFase("fondo");
    const prep = await buscarCanastas(v, ctl.current, { fase: setFase, progreso: setProgreso });
    if (!prep) { setFase("elegir"); return; }
    datos.current = { W: prep.W, H: prep.H, dur: prep.dur, foto: prep.foto };
    if (!prep.aros.length) { pedirMarcar(prep.motivo ?? "Marca tú los aros."); return; }
    setAros(prep.aros);
    await analizarTiros(prep.aros);
  };

  const pedirMarcar = (texto: string) => {
    setMsg(texto);
    setMarcados([]);
    setFase("marcar");
  };

  const analizarTiros = async (lista: Aro[]) => {
    const v = videoRef.current!;
    ctl.current.corregir = false;
    setFase("tiros"); setProgreso(0); setTiros(0); setResto(null);
    const eventos = await buscarTiros(v, lista, ctl.current, { progreso: setProgreso, tiros: (n, r) => { setTiros(n); setResto(r); } });
    if (!eventos) return; // se ha pedido marcar los aros a mano: se vuelve a empezar al marcarlos
    await guardar(eventos);
  };

  empezarRef.current = (f?: File) => { void empezar(f); };

  const guardar = async (eventos: Evento[]) => {
    setFase("guardando");
    if (!eventos.length) { setResultado({ nuevos: 0, repetidos: 0, total: 0 }); setFase("hecho"); return; }
    const json = JSON.stringify({ herramienta: "detector-tiros-web", version: "1", eventos: eventos.map(({ px: _px, ...e }) => e) });
    const fd = new FormData();
    fd.set("video_id", videoId);
    fd.set("desfase", desfase || "0");
    fd.set("archivo", new File([json], "detecciones.json", { type: "application/json" }));
    const r = await importarDetecciones(fd);
    if (r.error) { setFase("error"); setMsg(r.error); return; }
    setResultado({ ...r, total: eventos.length });
    setFase("hecho");
  };

  // ------------------------------------------------------------------ marcar aros a mano
  useEffect(() => {
    if (fase !== "marcar" && fase !== "tiros" && fase !== "canastas") return;
    const c = imgRef.current, foto = datos.current.foto;
    if (!c || !foto) return;
    c.width = foto.width; c.height = foto.height;
    const x = c.getContext("2d")!;
    x.putImageData(foto, 0, 0);
    x.lineWidth = Math.max(2, foto.width / 640);
    x.strokeStyle = "#facc15";
    x.font = `bold ${Math.round(foto.width / 70)}px sans-serif`;
    x.fillStyle = "#facc15";
    const cajas = fase === "marcar" ? [...marcados, ...(arrastre ? [arrastre] : [])] : aros;
    cajas.forEach((a, i) => {
      x.strokeRect(a.x - 4, a.y - 4, a.w + 8, a.h + 8);
      const n = "nombre" in a ? (a as Aro).nombre : i === 0 ? "izquierda" : "derecha";
      x.fillText(n, a.x - 10, a.y - 12);
    });
  }, [fase, aros, marcados, arrastre]);

  const aImagen = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), { W, H } = datos.current;
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const inicioMarca = useRef<{ x: number; y: number } | null>(null);

  const terminarMarcado = async () => {
    const lista: Aro[] = [...marcados].sort((a, b) => a.x - b.x).map((r, i, l) => ({
      nombre: l.length === 2 ? (i === 0 ? "izquierda" : "derecha") : "canasta",
      x: Math.round(r.x), y: Math.round(r.y), w: Math.max(4, Math.round(r.w)), h: Math.max(2, Math.round(r.h)),
    }));
    setAros(lista);
    await analizarTiros(lista);
  };

  // ------------------------------------------------------------------ interfaz
  const trabajando = fase === "fondo" || fase === "canastas" || fase === "tiros" || fase === "guardando";
  const pct = Math.round(progreso * 100);
  const textoFase: Record<string, string> = {
    fondo: "Preparando: mirando el pabellón…",
    canastas: "Buscando las canastas del partido…",
    tiros: "Buscando los tiros…",
    guardando: "Guardando los clips…",
  };

  return (
    <div className="max-w-4xl">
      <Link href={`/video/${videoId}`} className="inline-flex items-center gap-1 text-sm text-azul hover:underline"><ArrowLeft size={14} /> {titulo}</Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold"><ScanSearch className="text-azul" /> Detectar tiros</h1>
      <p className="max-w-2xl text-sm text-tinta/60">
        Elige el <strong>vídeo original</strong> del partido (el archivo de la cámara). Se analiza en este ordenador:
        no se sube a ningún sitio. Encuentra solo las canastas y deja los tiros como clips <strong>«por revisar»</strong> en este vídeo.
      </p>

      {fase === "elegir" && (
        <div className="tarjeta mt-5 space-y-3 p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-azul/30 p-6 text-center hover:border-azul hover:bg-azul/5">
            <FileVideo size={32} className="text-azul" />
            <span className="font-semibold">{archivo ? archivo.name : "Elegir el vídeo del partido"}</span>
            <span className="text-xs text-tinta/50">{archivo ? `${(archivo.size / 1e9).toFixed(1)} GB` : "MP4 de la cámara, mejor en 1080p"}</span>
            <input type="file" accept="video/*,.mp4,.mov,.mkv" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </label>
          {archivo && archivoEsperado && archivoEsperado.bytes && archivo.size !== archivoEsperado.bytes && (
            <p className="rounded-lg bg-oro/30 p-2 text-sm">Ojo: este archivo no parece el de este vídeo (se añadió «{archivoEsperado.nombre}»).</p>
          )}
          <label className={`flex flex-wrap items-center gap-2 text-sm text-tinta/70 ${local ? "hidden" : ""}`}>
            Desfase con YouTube (s)
            <input type="number" step="0.1" value={desfase} onChange={(e) => setDesfase(e.target.value)} className="campo !w-24 !py-1" />
            <span className="text-xs text-tinta/50">0 si el vídeo de YouTube empieza en el mismo segundo que este archivo</span>
          </label>
          <button onClick={() => empezar()} disabled={!archivo} className="btn-primario w-full sm:w-auto"><ScanSearch size={16} /> Empezar</button>
          <p className="text-xs text-tinta/50">Un partido entero tarda unos 15–25 minutos. Deja esta pestaña abierta y a la vista (puedes usar otras ventanas).</p>
        </div>
      )}

      {trabajando && (
        <div className="tarjeta mt-5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold"><Loader2 size={18} className="animate-spin text-azul" /> {textoFase[fase]}</p>
            {fase === "tiros" && <p className="text-sm"><strong>{tiros}</strong> tiros{resto !== null ? ` · faltan ~${mmss(resto)}` : ""}</p>}
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-suave"><div className="h-full rounded-full bg-azul transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-right text-xs text-tinta/50">{pct} %</p>
          {oculto && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-oro/30 p-2 text-sm"><TriangleAlert size={16} /> Vuelve a esta pestaña: con la pestaña escondida el navegador para el vídeo.</p>
          )}
          {fase === "tiros" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { ctl.current.parar = true; }} className="btn-secundario !py-1.5 text-sm"><Square size={14} /> Parar y guardar lo encontrado</button>
            </div>
          )}
        </div>
      )}

      {msg && fase !== "error" && <p className="mt-3 rounded-lg bg-oro/25 p-2 text-sm">{msg}</p>}

      {/* Imagen con las canastas (encontradas o para marcar) */}
      {(fase === "tiros" || fase === "marcar") && (
        <div className="tarjeta mt-4 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {fase === "marcar" ? `Arrastra un rectángulo alrededor de cada aro (${marcados.length}/2)` : "Canastas encontradas (recuadros amarillos)"}
            </p>
            {fase === "tiros" && (
              <button onClick={() => { ctl.current.corregir = true; pedirMarcar("Marca los dos aros y empezará de nuevo."); }} className="btn-secundario !py-1 text-xs"><Crosshair size={13} /> No son estas: marcar a mano</button>
            )}
            {fase === "marcar" && (
              <div className="flex gap-2">
                <button onClick={() => setMarcados([])} className="btn-secundario !py-1 text-xs">Borrar</button>
                <button onClick={terminarMarcado} disabled={!marcados.length} className="btn-primario !py-1 text-xs">Empezar con estos aros</button>
              </div>
            )}
          </div>
          <canvas
            ref={imgRef}
            className={`w-full rounded-lg ${fase === "marcar" ? "cursor-crosshair touch-none" : ""}`}
            onPointerDown={(e) => { if (fase !== "marcar" || marcados.length >= 2) return; e.currentTarget.setPointerCapture(e.pointerId); inicioMarca.current = aImagen(e); }}
            onPointerMove={(e) => {
              const i = inicioMarca.current; if (!i) return;
              const q = aImagen(e);
              setArrastre({ x: Math.min(i.x, q.x), y: Math.min(i.y, q.y), w: Math.abs(q.x - i.x), h: Math.abs(q.y - i.y) });
            }}
            onPointerUp={() => {
              inicioMarca.current = null;
              if (arrastre && arrastre.w > 3 && arrastre.h > 1) setMarcados((l) => [...l, arrastre]);
              setArrastre(null);
            }}
          />
          {fase === "marcar" && <p className="mt-1 text-xs text-tinta/50">Solo el aro (no el tablero). Si solo se ve una canasta, marca una y pulsa «Empezar».</p>}
        </div>
      )}

      {fase === "hecho" && resultado && (
        <div className="tarjeta mt-5 p-4">
          <p className="flex items-center gap-2 text-lg font-semibold text-green-700"><CheckCircle2 /> Hecho</p>
          <p className="mt-1 text-sm">
            {resultado.total === 0 ? "No se ha encontrado ningún tiro." : <>Se han encontrado <strong>{resultado.total} tiros</strong>: {resultado.nuevos} guardados como clips «por revisar»{resultado.repetidos ? ` (${resultado.repetidos} ya estaban)` : ""}.</>}
          </p>
          <Link href={`/video/${videoId}`} className="btn-primario mt-3 inline-flex">Ir al vídeo y revisar</Link>
          {local && <p className="mt-2 text-xs text-tinta/50">El vídeo se verá desde tu ordenador mientras no cierres la web; otro día te pedirá elegir el archivo otra vez.</p>}
        </div>
      )}

      {fase === "error" && (
        <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} /> {msg}</p>
          <button onClick={() => { setFase("elegir"); setMsg(""); }} className="btn-secundario mt-2 !py-1 text-sm">Volver a empezar</button>
        </div>
      )}

      {/* El vídeo se reproduce aquí (pequeño) mientras se analiza: el navegador necesita mostrarlo para dar sus fotogramas */}
      <video ref={videoRef} playsInline muted className={`mt-4 w-64 rounded-lg ${trabajando ? "" : "hidden"}`} />
    </div>
  );
}
