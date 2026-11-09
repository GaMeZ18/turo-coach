/** Se ve al instante al cambiar de menú, mientras llegan los datos (así no parece que el toque no ha hecho nada) */
export default function Cargando() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-7 w-48 rounded-lg bg-linea" />
      <div className="h-4 w-72 max-w-full rounded bg-linea/70" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-white shadow-sm ring-1 ring-linea" />)}
      </div>
    </div>
  );
}
