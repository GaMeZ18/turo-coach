"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** ¿Este clic va a otra página de la app? (no: pestaña nueva, descargas, enlaces externos, anclas…) */
function destino(e: MouseEvent): string | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.sinTransicion !== undefined) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/imprimir")) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null; // misma página (o solo #ancla)
  return url.pathname + url.search;
}

/** La página de antes se atenúa al momento (sin desmontarla: si la navegación no sigue, no se pierde nada) */
function Atenuado({ yendo, children }: { yendo: boolean; children: React.ReactNode }) {
  return <div className={`transition-opacity duration-100 ${yendo ? "opacity-40" : "opacity-100"}`}>{children}</div>;
}

function Dentro({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const params = useSearchParams();
  const actual = ruta + (params.toString() ? `?${params}` : "");
  const [yendo, setYendo] = useState<string | null>(null);
  const t = useRef<number | undefined>(undefined);

  // Al llegar la página nueva (o al volver atrás) se quita el esqueleto
  useEffect(() => { setYendo(null); window.clearTimeout(t.current); }, [actual]);
  useEffect(() => {
    // Al instante de tocar: barra arriba y esqueleto en el contenido, sin esperar al servidor
    const clic = (e: MouseEvent) => {
      const d = destino(e);
      if (!d) return;
      setYendo(d);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setYendo(null), 8000); // por si algo falla, nunca se queda colgado
    };
    const atras = () => setYendo(null);
    // En fase de captura: antes de que el enlace de Next haga su trabajo
    document.addEventListener("click", clic, true);
    window.addEventListener("popstate", atras);
    return () => { document.removeEventListener("click", clic, true); window.removeEventListener("popstate", atras); };
  }, []);

  return (
    <>
      {yendo && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden" style={{ top: "env(safe-area-inset-top)" }}>
          <div className="h-full w-1/3 animate-[barra_0.9s_ease-in-out_infinite] rounded bg-oro shadow-[0_0_8px_rgba(246,196,69,.8)]" />
        </div>
      )}
      <Atenuado yendo={!!yendo}>{children}</Atenuado>
    </>
  );
}

/** Respuesta inmediata al tocar cualquier enlace de la app: barra de carga arriba y la página atenuada al momento */
export default function Transicion({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={children}><Dentro>{children}</Dentro></Suspense>;
}
