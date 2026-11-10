/** Cabecera sencilla para las páginas públicas (sin cuenta) */
export default function Cabecera({ sub }: { sub: string }) {
  return (
    <header className="bg-azul text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <img src="/icons/icon-192.png" alt="CB Turó" className="h-9 w-9 rounded-lg" />
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-escudo)] text-lg tracking-wide">CB Turó de la Peira</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-oro">{sub}</p>
        </div>
      </div>
      <div className="filete" />
    </header>
  );
}
