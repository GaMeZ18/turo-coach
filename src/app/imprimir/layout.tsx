/** Páginas para imprimir o guardar en PDF: respetan la muesca y la barra del iPhone y caben en el móvil */
export default function LayoutImprimir({ children }: { children: React.ReactNode }) {
  return (
    <div className="imprimir min-h-dvh bg-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <style>{`
        @media screen and (max-width: 640px) {
          .imprimir main { padding: 12px !important; }
          .imprimir table { display: block; overflow-x: auto; max-width: 100%; }
        }
        @media print { .imprimir { padding: 0 !important; } }
      `}</style>
      {children}
    </div>
  );
}
