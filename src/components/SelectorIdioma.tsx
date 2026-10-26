import { cookies } from "next/headers";
import { cambiarIdioma } from "@/app/idioma";

/** Botones ES / CA */
export default async function SelectorIdioma({ oscuro = false }: { oscuro?: boolean }) {
  const actual = (await cookies()).get("idioma")?.value === "ca" ? "ca" : "es";
  return (
    <form action={cambiarIdioma} className={`flex overflow-hidden rounded-md border text-xs font-bold ${oscuro ? "border-white/30" : "border-linea"}`} translate="no">
      {(["es", "ca"] as const).map((i) => (
        <button key={i} name="idioma" value={i} className={`px-2 py-1 uppercase ${actual === i ? (oscuro ? "bg-white text-azul" : "bg-azul text-white") : oscuro ? "text-white/70 hover:bg-white/10" : "bg-white text-tinta/60 hover:bg-suave"}`} aria-pressed={actual === i}>
          {i}
        </button>
      ))}
    </form>
  );
}
