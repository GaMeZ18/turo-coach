"use client";

// Añadir un vídeo: enlace de YouTube o archivo del ordenador (que no se sube: se analiza y se ve desde el disco)
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileVideo, Link2, Loader2, Plus, ScanSearch } from "lucide-react";
import Enviar from "@/components/Enviar";
import { recordarArchivo, tamanoGB } from "@/lib/archivo-local";
import { crearVideo, crearVideoLocal } from "./actions";

type P = { id: string; texto: string };

export default function NuevoVideo({ equipoId, partidos, partidoPre }: { equipoId: string; partidos: P[]; partidoPre?: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"archivo" | "youtube">("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const campos = (
    <>
      <input type="hidden" name="equipo_id" value={equipoId} />
      <div>
        <label className="etiqueta">Partido</label>
        <select name="partido_id" className="campo" defaultValue={partidoPre ?? ""}>
          <option value="">— Sin partido (entreno, rival…) —</option>
          {partidos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
        </select>
      </div>
      <div><label className="etiqueta">Título (opcional)</label><input name="titulo" placeholder="Se pone solo con el partido" className="campo" /></div>
    </>
  );

  return (
    <div className="tarjeta mt-5 p-4">
      <div className="mb-3 flex rounded-lg border border-linea p-0.5 text-sm sm:w-fit">
        <button type="button" onClick={() => setModo("archivo")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 ${modo === "archivo" ? "bg-azul text-white" : "text-tinta/70"}`}><FileVideo size={15} /> Archivo del ordenador</button>
        <button type="button" onClick={() => setModo("youtube")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 ${modo === "youtube" ? "bg-azul text-white" : "text-tinta/70"}`}><Link2 size={15} /> Enlace de YouTube</button>
      </div>

      {modo === "archivo" ? (
        <form
          action={(fd) => {
            if (!archivo) { setError("Elige el archivo del vídeo."); return; }
            fd.set("archivo", archivo.name);
            fd.set("bytes", String(archivo.size));
            setError(null);
            start(async () => {
              const r = await crearVideoLocal(fd);
              if (r.error || !r.id) { setError(r.error ?? "No se ha podido crear."); return; }
              recordarArchivo(r.id, archivo);
              router.push(`/video/${r.id}/detectar`);
            });
          }}
          className="grid gap-2 sm:grid-cols-[2fr_1.4fr_1fr_auto] sm:items-end"
        >
          <div>
            <label className="etiqueta">Vídeo del partido</label>
            <label className="campo flex cursor-pointer items-center gap-2 truncate">
              <FileVideo size={16} className="shrink-0 text-azul" />
              <span className="truncate">{archivo ? `${archivo.name} · ${tamanoGB(archivo.size)}` : "Elegir archivo…"}</span>
              <input type="file" accept="video/*,.mp4,.mov,.mkv" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {campos}
          <button disabled={pendiente} className="btn-primario">{pendiente ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />} Añadir y detectar tiros</button>
        </form>
      ) : (
        <form action={crearVideo} className="grid gap-2 sm:grid-cols-[2fr_1.4fr_1fr_auto] sm:items-end">
          <div><label className="etiqueta">Enlace de YouTube</label><input name="url" required placeholder="https://youtu.be/…" className="campo" /></div>
          {campos}
          <Enviar className="btn-primario"><Plus size={16} /> Añadir vídeo</Enviar>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-tinta/50">
        {modo === "archivo"
          ? "El vídeo no se sube a ningún sitio: se queda en tu ordenador. La web lo analiza y lo reproduce desde tu disco (otro día te pedirá elegirlo de nuevo para verlo)."
          : "Sube el partido a YouTube como «Oculto» y pega aquí el enlace. Así se puede ver desde cualquier sitio, también el móvil."}
      </p>
    </div>
  );
}
