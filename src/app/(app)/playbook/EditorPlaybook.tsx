"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Link2, Loader2, Plus, Share2, Trash2, X } from "lucide-react";
import MiniPizarra from "@/components/pizarra/Mini";
import { anadirAlPlaybook, enlacePlaybook, notaPlaybook, ordenarPlaybook, quitarDelPlaybook } from "./actions";

export type ItemPlaybook = { id: string; notas: string | null; ej: { id: string; titulo: string; tipo: string; categoria: string | null; preview: string | null; pizarra: unknown } };
type Opcion = { id: string; titulo: string; tipo: string; categoria: string | null };

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function EditorPlaybook({ equipoId, items, opciones, url: urlIni }: { equipoId: string; items: ItemPlaybook[]; opciones: Opcion[]; url: string | null }) {
  const [lista, setLista] = useState(items);
  const [url, setUrl] = useState(urlIni);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendiente, start] = useTransition();
  const ya = new Set(lista.map((x) => x.id));
  const encontrados = useMemo(() => {
    const t = sinAcentos(q.trim());
    if (t.length < 2) return [];
    return opciones.filter((o) => !ya.has(o.id) && sinAcentos(`${o.titulo} ${o.categoria ?? ""}`).includes(t)).slice(0, 12);
  }, [q, opciones, ya]);

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= lista.length) return;
    const nueva = [...lista]; [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    setLista(nueva);
    start(async () => { await ordenarPlaybook(equipoId, nueva.map((x) => x.id)); });
  };
  const quitar = (id: string) => start(async () => { const r = await quitarDelPlaybook(equipoId, id); if (r.error) setError(r.error); else setLista((l) => l.filter((x) => x.id !== id)); });
  const anadir = (o: Opcion) => start(async () => {
    const r = await anadirAlPlaybook(equipoId, o.id);
    if (r.error) return setError(r.error);
    setLista((l) => [...l, { id: o.id, notas: null, ej: { ...o, preview: null, pizarra: null } }]);
    setQ("");
  });
  const cambiarEnlace = (activar: boolean) => {
    if (!activar && !confirm("¿Quitar el enlace? Quien lo tenga ya no podrá ver el playbook.")) return;
    start(async () => { const r = await enlacePlaybook(equipoId, activar); if (r.error) setError(r.error); else setUrl(r.url ?? null); });
  };
  const compartir = async () => {
    if (!url) return;
    if (typeof navigator.share === "function") { try { await navigator.share({ title: "Playbook", text: "🏀 Nuestras jugadas", url }); return; } catch { /* cancelado */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`🏀 Nuestras jugadas\n${url}`)}`, "_blank");
  };

  return (
    <div className="mt-4 space-y-4">
      {error && <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}<button onClick={() => setError(null)} aria-label="Cerrar"><X size={16} /></button></p>}

      <section className="tarjeta p-3">
        <h2 className="font-semibold">Enlace para los jugadores</h2>
        {url ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-suave px-2 py-1.5 text-xs">{url}</code>
            <button className="btn-primario" onClick={compartir}><Share2 size={16} /> Compartir</button>
            <button className="btn-secundario" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} }}>{copiado ? <Check size={16} /> : <Link2 size={16} />} {copiado ? "Copiado" : "Copiar"}</button>
            <button className="btn-secundario" onClick={() => cambiarEnlace(false)} title="Quitar el enlace (deja de funcionar)">Desactivar</button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-tinta/60">Aún no hay enlace. Al crearlo, cualquiera que lo tenga podrá ver el playbook (solo ver).</p>
            <button className="btn-primario" onClick={() => cambiarEnlace(true)} disabled={pendiente}><Link2 size={16} /> Crear enlace</button>
          </div>
        )}
      </section>

      <section className="tarjeta p-3">
        <h2 className="font-semibold">Añadir jugada o ejercicio</h2>
        <input className="campo mt-2" placeholder="Busca por nombre (mín. 2 letras)…" value={q} onChange={(e) => setQ(e.target.value)} />
        {encontrados.length > 0 && (
          <ul className="mt-2 divide-y divide-linea rounded-lg border border-linea">
            {encontrados.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => anadir(o)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-suave">
                  <Plus size={15} className="text-azul" /> <span className="flex-1">{o.titulo}</span>
                  <span className="text-xs text-tinta/50">{o.tipo === "sistema" ? "Sistema" : o.categoria ?? "Ejercicio"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && encontrados.length === 0 && <p className="mt-2 text-sm text-tinta/50">Nada con ese nombre (solo salen los que tienen pizarra).</p>}
      </section>

      {lista.length === 0 ? <p className="text-sm text-tinta/60">El playbook está vacío.</p> : (
        <ol className="space-y-2">
          {lista.map((x, i) => (
            <li key={x.id} className="tarjeta flex gap-3 p-2">
              <Link href={`/ejercicios/${x.id}`} className="flex aspect-[15/14] w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-suave sm:w-32">
                {x.ej.preview ? <img src={x.ej.preview} alt="" className="h-full w-full object-contain" /> : x.ej.pizarra ? <MiniPizarra pizarra={x.ej.pizarra} className="h-full w-full" /> : <span className="text-xs text-tinta/40">{i + 1}</span>}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  <Link href={`/ejercicios/${x.id}`} className="min-w-0 flex-1 font-semibold hover:text-azul"><span className="mr-1 text-tinta/40">{i + 1}.</span>{x.ej.titulo}</Link>
                  <button className="rounded p-1 text-tinta/50 hover:bg-suave disabled:opacity-30" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp size={15} /></button>
                  <button className="rounded p-1 text-tinta/50 hover:bg-suave disabled:opacity-30" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Bajar"><ArrowDown size={15} /></button>
                  <button className="rounded p-1 text-tinta/50 hover:text-rojo" onClick={() => quitar(x.id)} aria-label="Quitar del playbook"><Trash2 size={15} /></button>
                </div>
                <p className="text-xs text-tinta/50">{x.ej.tipo === "sistema" ? "Sistema" : x.ej.categoria ?? "Ejercicio"}</p>
                <input className="campo mt-1 !py-1 text-sm" defaultValue={x.notas ?? ""} maxLength={500} placeholder="Nota para los jugadores (p. ej. «la cantamos con el puño»)"
                  onBlur={(e) => { if (e.target.value !== (x.notas ?? "")) start(async () => { await notaPlaybook(equipoId, x.id, e.target.value); }); }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {pendiente && <p className="flex items-center gap-1 text-xs text-tinta/50"><Loader2 size={12} className="animate-spin" /> Guardando…</p>}
    </div>
  );
}
