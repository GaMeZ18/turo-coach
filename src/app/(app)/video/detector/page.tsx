import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { ArrowLeft, Download, MonitorDown, ScanSearch } from "lucide-react";

export const metadata = { title: "Detector de tiros" };

// Se compila solo en GitHub (Windows) con cada cambio del detector
const DESCARGA = "https://github.com/GaMeZ18/turo-coach/releases/download/detector/DetectorTiros-Windows.zip";

const PASOS: { t: string; d: React.ReactNode }[] = [
  { t: "Descarga y descomprime", d: <>Descarga el .zip y descomprímelo donde quieras (por ejemplo, en el Escritorio). No hace falta instalar nada. La primera vez Windows puede avisar con «Windows protegió su PC»: pulsa <em>Más información → Ejecutar de todas formas</em>.</> },
  { t: "Calibra los aros", d: <>Arrastra el vídeo original del partido (MP4) encima de <code>1-calibrar.bat</code> y marca con el ratón el aro de cada canasta. Solo hace falta una vez por pabellón y posición de cámara.</> },
  { t: "Analiza el partido", d: <>Arrastra el mismo vídeo encima de <code>2-analizar.bat</code>. Al acabar deja un archivo <code>.detecciones.json</code> junto al vídeo. Tarda más o menos según el PC.</> },
  { t: "Importa y revisa", d: <>Abre aquí el vídeo de YouTube de ese partido, pulsa <strong>Detecciones → Importar</strong>, sube el archivo y luego <strong>Revisar ahora</strong>: eliges tipo de tiro, jugador y si entró. Hasta que no lo confirmas no cuenta en la estadística.</> },
  { t: "Mide cuánto acierta (opcional)", d: <>Tras revisar, en <strong>Detecciones → Exportar etiquetas</strong> descargas lo confirmado. Arrastra a la vez ese archivo y el <code>.detecciones.json</code> encima de <code>3-evaluar.bat</code>.</> },
];

export default async function DetectorPage() {
  await requireUser();
  return (
    <div className="max-w-3xl">
      <Link href="/video" className="inline-flex items-center gap-1 text-sm text-azul hover:underline"><ArrowLeft size={14} /> Vídeo</Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold"><ScanSearch className="text-azul" /> Detector de tiros</h1>
      <p className="text-sm text-tinta/60">
        Programa gratuito para el PC que busca los tiros en el vídeo de un partido grabado con <strong>cámara fija</strong> y te los
        deja preparados en Coach Manager para que solo tengas que decir quién tiró. Funciona sin internet: el vídeo no sale de tu ordenador.
      </p>

      <div className="tarjeta mt-5 flex flex-wrap items-center gap-4 p-4">
        <MonitorDown size={36} className="text-azul" />
        <div className="flex-1">
          <p className="font-semibold">Detector de tiros para Windows</p>
          <p className="text-xs text-tinta/60">Windows 10 u 11 · .zip de unos 65 MB · siempre la última versión</p>
        </div>
        <a href={DESCARGA} className="btn-primario"><Download size={16} /> Descargar</a>
      </div>

      <ol className="mt-6 space-y-3">
        {PASOS.map((p, i) => (
          <li key={p.t} className="tarjeta flex gap-3 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-azul text-sm font-bold text-white">{i + 1}</span>
            <div><p className="font-semibold">{p.t}</p><p className="mt-0.5 text-sm text-tinta/70">{p.d}</p></div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-tinta/50">
        Es una versión de prueba: falla más con tiros tapados por jugadores o con poca luz, por eso todo pasa por tu revisión.
        Usa OpenCV (licencia Apache 2.0) y NumPy (BSD). El código es público en GitHub.
      </p>
    </div>
  );
}
