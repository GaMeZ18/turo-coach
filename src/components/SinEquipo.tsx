import Link from "next/link";

export default function SinEquipo({ que }: { que: string }) {
  return (
    <div className="tarjeta p-6 text-center">
      <p className="font-medium">Primero elige un equipo</p>
      <p className="mt-1 text-sm text-tinta/60">
        Usa el selector de arriba o ve a <Link href="/equipos" className="text-club underline">Equipos</Link> para ver {que}.
      </p>
    </div>
  );
}
