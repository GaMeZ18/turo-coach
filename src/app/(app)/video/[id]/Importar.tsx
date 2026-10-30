"use client";

// Importar el archivo del detector de tiros (.detecciones.json) y exportar las etiquetas para medirlo
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, MonitorDown, ScanSearch, Upload } from "lucide-react";
import { importarDetecciones } from "../actions";

export default function Importar({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendiente, start] = useTransition();
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto(!abierto)} className="btn-secundario !py-1.5 text-sm"><ScanSearch size={15} /> Detecciones</button>
      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-80 rounded-xl border border-linea bg-white p-3 text-sm shadow-xl">
          <form action={(fd) => start(async () => {
            const r = await importarDetecciones(fd);
            setMsg(r.error ? { ok: false, t: r.error } : { ok: true, t: `Importados ${r.nuevos} tiros por revisar${r.repetidos ? ` (${r.repetidos} ya estaban)` : ""}.` });
            if (!r.error) router.refresh();
          })} className="space-y-2">
            <input type="hidden" name="video_id" value={videoId} />
            <p className="font-semibold">Importar archivo del programa del PC</p>
            <input type="file" name="archivo" accept=".json,application/json" required className="block w-full text-xs" />
            <label className="flex items-center gap-2 text-xs text-tinta/70">Desfase (s)
              <input type="number" name="desfase" step="0.1" defaultValue={0} className="campo !w-20 !py-1 text-xs" />
              <span className="text-[11px]">si YouTube empieza en otro segundo</span>
            </label>
            <button disabled={pendiente} className="btn-primario w-full !py-1.5 text-sm">{pendiente ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Importar</button>
          </form>
          {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</p>}
          <div className="mt-3 border-t border-linea pt-2">
            <a href={`/video/${videoId}/etiquetas`} className="inline-flex items-center gap-1 text-xs text-azul hover:underline"><Download size={13} /> Exportar etiquetas (para medir el detector)</a>
            <a href={`/video/${videoId}/detectar`} className="mt-1 flex items-center gap-1 text-xs font-semibold text-azul hover:underline"><ScanSearch size={13} /> Detectar tiros aquí, en el navegador</a>
            <a href="/video/detector" className="mt-1 inline-flex items-center gap-1 text-xs text-tinta/60 hover:underline"><MonitorDown size={13} /> o con el programa para el PC</a>
          </div>
        </div>
      )}
    </div>
  );
}
