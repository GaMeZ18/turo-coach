import Link from "@/components/Enlace";
import { Settings } from "lucide-react";
import { colorEquipo, sigla } from "@/lib/fantasy/estilo";
import AutoRefresco from "@/components/AutoRefresco";
import Transicion from "@/components/Transicion";
import Pestanas from "./Pestanas";
import { Suspense } from "react";

/** Camiseta con el dorsal, del color del equipo */
export function Camiseta({ dorsal, equipo, size = 30 }: { dorsal: string | number; equipo: string; size?: number }) {
  const c = colorEquipo(equipo);
  const d = String(dorsal ?? "").slice(0, 2);
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="shrink-0 drop-shadow" aria-hidden>
      <path d="M12 3h5c.5 2 1.7 3 3 3s2.5-1 3-3h5l9 6-4 7-4-2v23H11V14l-4 2-4-7z" fill={c} stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="20" y="28" textAnchor="middle" fontSize={d.length > 1 ? 13 : 15} fontWeight="800" fill="#fff" fontFamily="var(--font-barlow-condensed), sans-serif">{d}</text>
    </svg>
  );
}

/** Etiqueta corta del equipo (SAM, SBF, U18A…) */
export function Sigla({ equipo }: { equipo: string }) {
  return <span className="text-[10px] font-bold tracking-wide" style={{ color: colorEquipo(equipo) === "#111827" ? "#9aa8cf" : colorEquipo(equipo) }}>{sigla(equipo)}</span>;
}

/** Avatar del participante: foto, o emoji sobre su color, o la inicial */
export function Escudo({ alias, emoji, color, foto, size = 36 }: { alias: string; emoji?: string | null; color?: string | null; foto?: string | null; size?: number }) {
  const estilo = { width: size, height: size };
  if (foto) return <img src={foto} alt="" style={estilo} className="shrink-0 rounded-full border-2 border-[var(--fx-oro)] object-cover" />;
  return (
    <span style={{ ...estilo, background: color ?? "#d81f2f", fontSize: size * (emoji ? 0.55 : 0.45) }}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--fx-oro)] font-black text-white shadow">
      {emoji ?? (alias.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Nombre del equipo en grande y de la persona en pequeño */
export function Nombre({ alias, mostrar, className = "" }: { alias: string; mostrar?: string | null; className?: string }) {
  return (
    <span className={`min-w-0 leading-tight ${className}`}>
      <span className="block truncate font-bold">{alias}</span>
      {mostrar && <span className="block truncate text-[11px] font-normal text-[var(--fx-suave)]">{mostrar}</span>}
    </span>
  );
}


/** Cabecera del juego con las pestañas */
export function Marco({ children, perfil, esAdmin, vista, conMenu = true, temporada }: { children: React.ReactNode; perfil: boolean; esAdmin: boolean; vista?: string; conMenu?: boolean; temporada: string }) {
  return (
    <div className="fx">
      <header className="sticky top-0 z-30 border-b border-[var(--fx-borde)] bg-[#0a1024]/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-3 py-2">
          <img src="/marca/escudo-128.png" alt="CB Turó" className="h-9 w-auto" />
          <div className="flex-1 leading-none">
            <p className="fx-display fx-oro-texto text-xl">Fantasy Turó</p>
            <p className="text-[11px] text-white/80">CB Turó de la Peira · {temporada}</p>
          </div>
          {esAdmin && <Link href="/fantasy/admin" className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" title="Administrar"><Settings size={20} /></Link>}
          {perfil && <Link href="/" className="rounded-full border border-white/40 px-2.5 py-0.5 text-xs font-semibold">← App</Link>}
        </div>
        {conMenu && <Suspense fallback={null}><Pestanas vista={vista} /></Suspense>}
      </header>
      <main className="mx-auto max-w-3xl px-3 py-4"><Transicion>{children}</Transicion></main>
      <AutoRefresco oscuro />
    </div>
  );
}

/** Puntos con decimales a la española */
export const pts = (v: number) => v.toLocaleString("es-ES", { maximumFractionDigits: 2 });
