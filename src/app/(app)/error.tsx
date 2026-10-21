"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

// Si algo falla en una pantalla (p. ej. la app se ha actualizado mientras estaba abierta),
// en vez de quedarse en blanco mostramos el motivo y un botón para recargar.
export default function ErrorPantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const version = /Server Action|failed to find|ChunkLoadError|Loading chunk/i.test(error.message);
  return (
    <div className="tarjeta mx-auto max-w-md p-6 text-center">
      <p className="font-semibold text-azul">{version ? "Hay una versión nueva de la app" : "Algo ha fallado"}</p>
      <p className="mt-1 text-sm text-tinta/60">
        {version ? "Recarga para seguir trabajando con la última versión." : error.message || "Error inesperado."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={() => window.location.reload()} className="btn-primario"><RefreshCw size={16} /> Recargar</button>
        {!version && <button onClick={reset} className="btn-secundario">Reintentar</button>}
      </div>
    </div>
  );
}
