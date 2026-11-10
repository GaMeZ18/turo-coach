import MiniPizarra from "@/components/pizarra/Mini";
import { pasosDe, qrSvg } from "@/lib/pasos";
import BotonImprimir from "@/app/imprimir/entreno/[id]/Imprimir";

export type JugadaHoja = { id: string; titulo: string; tipo: string; categoria: string | null; descripcion: string | null; correcciones?: string | null; notas: string | null; preview: string | null; pizarra: unknown };

/** PDF del playbook: cada jugada con su dibujo paso a paso (igual que en el PDF del entreno) */
export default function HojaPlaybook({ equipo, jugadas, volver, enlace }: { equipo: string; jugadas: JugadaHoja[]; volver: string; enlace?: string | null }) {
  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-tinta print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: white } }`}</style>
      <BotonImprimir volver={volver} texto="← Volver al playbook" />
      <header className="flex items-center gap-4 border-b-4 border-azul pb-3">
        <img src="/marca/escudo-128.png" alt="" className="h-14 w-auto" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-rojo">{equipo} · CB Turó de la Peira</p>
          <h1 className="text-2xl font-bold">Playbook</h1>
          <p className="text-sm text-tinta/70">{jugadas.length} {jugadas.length === 1 ? "jugada" : "jugadas"}</p>
        </div>
        {enlace && (
          <figure className="w-20 text-center">
            <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: qrSvg(enlace) }} />
            <figcaption className="mt-0.5 text-[9px] leading-tight text-tinta/60">Escanéalo para verlas animadas</figcaption>
          </figure>
        )}
      </header>
      {/* Índice */}
      <ol className="mt-3 columns-2 text-sm">
        {jugadas.map((j, i) => <li key={j.id} className="break-inside-avoid"><span className="font-semibold tabular-nums">{i + 1}.</span> {j.titulo}</li>)}
      </ol>
      <ol className="mt-4 space-y-3">
        {jugadas.map((j, i) => {
          const pasos = pasosDe(j.pizarra);
          return (
            <li key={j.id} className="break-inside-avoid rounded-lg border border-linea p-3">
              <div className="flex items-baseline gap-2">
                <span className="flex-1 text-lg font-semibold">{i + 1}. {j.titulo}</span>
                <span className="text-xs uppercase text-tinta/60">{j.tipo === "sistema" ? "Sistema" : j.categoria ?? "Ejercicio"}</span>
              </div>
              {j.notas && <p className="mt-1 rounded bg-oro/20 px-2 py-1 text-sm font-medium">{j.notas}</p>}
              <div className="mt-2 flex gap-3">
                {!pasos.length && (j.preview || j.pizarra) ? (
                  <div className="w-56 shrink-0 overflow-hidden rounded border border-linea">
                    {j.preview ? <img src={j.preview} alt="" className="w-full" /> : <MiniPizarra pizarra={j.pizarra} className="w-full" />}
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-1 text-xs leading-snug">
                  {j.descripcion && <p className="whitespace-pre-line">{j.descripcion}</p>}
                  {j.correcciones && <p className="whitespace-pre-line"><strong>Claves:</strong> {j.correcciones}</p>}
                </div>
              </div>
              {pasos.length > 0 && (
                <div className={`mt-2 grid gap-2 ${pasos.length === 1 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {pasos.map((r, k) => (
                    <figure key={k} className="break-inside-avoid overflow-hidden rounded border border-linea">
                      <MiniPizarra pizarra={j.pizarra} pasos={r} numeros className="w-full" />
                      <figcaption className="border-t border-linea px-1.5 py-0.5 text-[10px] font-semibold text-tinta/70">Paso {k + 1}{r[1] - r[0] > 1 ? ` (${r[0] + 1}–${r[1]})` : ""}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
