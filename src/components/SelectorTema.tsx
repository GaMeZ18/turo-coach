import { cookies } from "next/headers";
import { cambiarTema } from "@/app/tema";
import { Moon, Sun, SunMoon } from "lucide-react";

/** Botones ☀️ claro · 🌙 oscuro · automático (como el selector de idioma) */
export default async function SelectorTema({ oscuro = false }: { oscuro?: boolean }) {
  const c = (await cookies()).get("tema")?.value;
  const actual = c === "oscuro" || c === "auto" ? c : "claro";
  const op = [
    { v: "claro", icono: <Sun size={14} />, t: "Modo claro" },
    { v: "oscuro", icono: <Moon size={14} />, t: "Modo oscuro" },
    { v: "auto", icono: <SunMoon size={14} />, t: "Automático (como el móvil)" },
  ] as const;
  return (
    <form action={cambiarTema} className={`flex overflow-hidden rounded-md border text-xs font-bold ${oscuro ? "border-white/30" : "border-linea"}`}>
      {op.map((o) => (
        <button key={o.v} name="tema" value={o.v} title={o.t} aria-label={o.t} aria-pressed={actual === o.v}
          className={`flex items-center px-2 py-1 ${actual === o.v ? (oscuro ? "bg-white text-azul-oscuro" : "bg-azul text-white") : oscuro ? "text-white/70 hover:bg-white/10" : "text-tinta/60 hover:bg-suave"}`}>
          {o.icono}
        </button>
      ))}
    </form>
  );
}
