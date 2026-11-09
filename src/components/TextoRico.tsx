// Texto con formato sencillo (sin HTML): párrafos, **negrita**, listas con «- », [texto](enlace) y enlaces sueltos.
import type { ReactNode } from "react";

const seguro = (u: string) => (/^(https?:\/\/|mailto:|tel:|\/)/i.test(u) ? u : `https://${u}`);
const ENLACE = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<)]+|www\.[^\s<)]+)|\*\*([^*]+)\*\*/g;

function enLinea(t: string, clave: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0, k = 0;
  for (const m of t.matchAll(ENLACE)) {
    if (m.index! > i) out.push(t.slice(i, m.index));
    if (m[1]) out.push(<a key={`${clave}-${k++}`} href={seguro(m[2])} target="_blank" rel="noopener noreferrer" className="font-medium text-azul underline">{m[1]}</a>);
    else if (m[3]) out.push(<a key={`${clave}-${k++}`} href={seguro(m[3])} target="_blank" rel="noopener noreferrer" className="break-all text-azul underline">{m[3]}</a>);
    else if (m[4]) out.push(<strong key={`${clave}-${k++}`}>{m[4]}</strong>);
    i = m.index! + m[0].length;
  }
  if (i < t.length) out.push(t.slice(i));
  return out;
}

export default function TextoRico({ texto, className = "" }: { texto: string; className?: string }) {
  const bloques = texto.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 ${className}`}>
      {bloques.map((b, n) => {
        const lineas = b.split("\n");
        if (lineas.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return <ul key={n} className="list-disc space-y-1 pl-5">{lineas.map((l, j) => <li key={j}>{enLinea(l.replace(/^\s*[-•*]\s+/, ""), `${n}-${j}`)}</li>)}</ul>;
        }
        if (/^#{1,3}\s/.test(b)) return <h3 key={n} className="text-lg font-semibold">{enLinea(b.replace(/^#{1,3}\s/, ""), `${n}`)}</h3>;
        return <p key={n} className="whitespace-pre-line">{enLinea(b, `${n}`)}</p>;
      })}
    </div>
  );
}
