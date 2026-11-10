"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  borrarLugar, borrarMaterial, crearLugar, crearMaterial, guardarMaterial, marcarSitioContado, renombrarLugar,
  type Lugar, type Material,
} from "./actions";

const SUGERENCIAS = [
  "Balones talla 7", "Balones talla 6", "Balones talla 5", "Balones minibasket", "Balones medicinales",
  "Conos", "Chinos", "Petos", "Escaleras de agilidad", "Vallas", "Picas", "Aros", "Gomas elásticas",
  "Hinchador", "Agujas de hinchar", "Botiquín", "Pizarra táctica", "Carro de balones", "Bolsas de balones", "Silbatos", "Cronómetros",
];

const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "nunca";
const clave = (n: string) => n.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const esHoy = (s: string | null) => !!s && new Date(s).toDateString() === new Date().toDateString();

export default function Inventario({ lugaresIni, itemsIni }: { lugaresIni: Lugar[]; itemsIni: Material[] }) {
  const [lugares, setLugares] = useState(lugaresIni);
  const [items, setItems] = useState(itemsIni);
  const [vista, setVista] = useState<"sitios" | "total">("sitios");
  const [abierto, setAbierto] = useState<string | null>(lugaresIni[0]?.id ?? null);
  const [nuevoSitio, setNuevoSitio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const cambiar = (id: string, c: Partial<Material>, inmediato = false) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...c, ...("cantidad" in c || "rotos" in c ? { contado_at: new Date().toISOString() } : {}) } : x)));
    const contado = "cantidad" in c || "rotos" in c;
    const enviar = async () => {
      const r = await guardarMaterial(id, c, contado);
      if (r.error) setError(r.error);
    };
    // Al tocar + y − varias veces seguidas, solo se guarda el último número
    const k = `${id}:${Object.keys(c).join(",")}`;
    clearTimeout(timers.current.get(k));
    if (inmediato) void enviar();
    else timers.current.set(k, setTimeout(enviar, 600));
  };

  const anadirSitio = async () => {
    const r = await crearLugar(nuevoSitio);
    if (r.error) return setError(r.error);
    if (r.lugar) { setLugares((l) => [...l, r.lugar!]); setAbierto(r.lugar.id); setNuevoSitio(""); }
  };

  const totales = useMemo(() => {
    const m = new Map<string, { nombre: string; cantidad: number; rotos: number; minimo: number; sitios: { lugar: string; n: number }[] }>();
    for (const x of items) {
      const k = clave(x.nombre);
      const t = m.get(k) ?? { nombre: x.nombre, cantidad: 0, rotos: 0, minimo: 0, sitios: [] };
      t.cantidad += x.cantidad; t.rotos += x.rotos; t.minimo += x.minimo ?? 0;
      t.sitios.push({ lugar: lugares.find((l) => l.id === x.lugar_id)?.nombre ?? "?", n: x.cantidad });
      m.set(k, t);
    }
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [items, lugares]);
  const faltan = totales.filter((t) => t.minimo > 0 && t.cantidad - t.rotos < t.minimo);
  const rotosTotal = items.reduce((s, x) => s + x.rotos, 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}<button onClick={() => setError(null)} aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="tarjeta p-3"><div className="text-2xl font-bold">{items.reduce((s, x) => s + x.cantidad, 0)}</div><div className="text-xs text-tinta/60">piezas</div></div>
        <div className="tarjeta p-3"><div className={`text-2xl font-bold ${rotosTotal ? "text-red-600" : ""}`}>{rotosTotal}</div><div className="text-xs text-tinta/60">rotas</div></div>
        <div className="tarjeta p-3"><div className={`text-2xl font-bold ${faltan.length ? "text-amber-600" : ""}`}>{faltan.length}</div><div className="text-xs text-tinta/60">por reponer</div></div>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-linea text-sm font-semibold">
        {(["sitios", "total"] as const).map((v) => (
          <button key={v} onClick={() => setVista(v)} className={`flex-1 py-2 ${vista === v ? "bg-azul text-white" : "bg-white"}`}>
            {v === "sitios" ? "Por sitio" : "Total del club"}
          </button>
        ))}
      </div>

      {vista === "total" ? (
        <div className="tarjeta divide-y divide-linea">
          {totales.length === 0 && <p className="p-4 text-sm text-tinta/60">Aún no has contado nada.</p>}
          {totales.map((t) => {
            const falta = t.minimo > 0 && t.cantidad - t.rotos < t.minimo;
            return (
              <div key={t.nombre} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-semibold">{t.nombre}</div>
                  <div className="text-xs text-tinta/60">{t.sitios.map((s) => `${s.lugar}: ${s.n}`).join(" · ")}</div>
                  {falta && <div className="mt-1 text-xs font-semibold text-amber-600">Faltan {t.minimo - (t.cantidad - t.rotos)} para el mínimo ({t.minimo})</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-bold">{t.cantidad}</div>
                  {t.rotos > 0 && <div className="text-xs font-semibold text-red-600">{t.rotos} rotos</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {lugares.map((l) => (
            <Sitio
              key={l.id}
              lugar={l}
              items={items.filter((x) => x.lugar_id === l.id)}
              lugares={lugares}
              abierto={abierto === l.id}
              alternar={() => setAbierto(abierto === l.id ? null : l.id)}
              cambiar={cambiar}
              setItems={setItems}
              setLugares={setLugares}
              setError={setError}
            />
          ))}
          <div className="tarjeta flex gap-2 p-3">
            <input className="campo flex-1" placeholder="Nuevo sitio (p. ej. Trèvol – almacén)" value={nuevoSitio}
              onChange={(e) => setNuevoSitio(e.target.value)} onKeyDown={(e) => e.key === "Enter" && anadirSitio()} />
            <button className="btn-azul" onClick={anadirSitio} disabled={!nuevoSitio.trim()}><Plus size={16} /> Sitio</button>
          </div>
        </div>
      )}

      <datalist id="sugerencias-material">{SUGERENCIAS.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

function Sitio({ lugar, items, lugares, abierto, alternar, cambiar, setItems, setLugares, setError }: {
  lugar: Lugar; items: Material[]; lugares: Lugar[]; abierto: boolean; alternar: () => void;
  cambiar: (id: string, c: Partial<Material>, inmediato?: boolean) => void;
  setItems: React.Dispatch<React.SetStateAction<Material[]>>;
  setLugares: React.Dispatch<React.SetStateAction<Lugar[]>>;
  setError: (e: string | null) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cant, setCant] = useState("");
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(lugar.nombre);
  const contadosHoy = items.filter((x) => esHoy(x.contado_at)).length;

  const anadir = async () => {
    const r = await crearMaterial({ lugar_id: lugar.id, nombre, cantidad: Number(cant) || 0 });
    if (r.error) return setError(r.error);
    if (r.item) { setItems((xs) => [...xs, r.item!]); setNombre(""); setCant(""); }
  };
  const todoContado = async () => {
    const r = await marcarSitioContado(lugar.id);
    if (r.error) return setError(r.error);
    setItems((xs) => xs.map((x) => (x.lugar_id === lugar.id ? { ...x, contado_at: r.contado_at! } : x)));
  };
  const quitarSitio = async () => {
    if (!confirm(`¿Borrar «${lugar.nombre}» y todo su material?`)) return;
    const r = await borrarLugar(lugar.id);
    if (r.error) return setError(r.error);
    setLugares((ls) => ls.filter((x) => x.id !== lugar.id));
    setItems((xs) => xs.filter((x) => x.lugar_id !== lugar.id));
  };
  const guardarTitulo = async () => {
    const r = await renombrarLugar(lugar.id, titulo);
    if (r.error) return setError(r.error);
    setLugares((ls) => ls.map((x) => (x.id === lugar.id ? { ...x, nombre: titulo.trim() } : x)));
    setEditando(false);
  };

  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        {editando ? (
          <>
            <input className="campo flex-1" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardarTitulo()} autoFocus />
            <button className="btn-azul" onClick={guardarTitulo} aria-label="Guardar"><Check size={16} /></button>
            <button className="btn-secundario" onClick={quitarSitio} aria-label="Borrar sitio"><Trash2 size={16} /></button>
          </>
        ) : (
          <>
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={alternar}>
              {abierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span className="truncate font-bold">{lugar.nombre}</span>
              <span className="shrink-0 text-xs text-tinta/60">{items.length} cosas{items.length > 0 && ` · ${contadosHoy}/${items.length} contadas hoy`}</span>
            </button>
            <button className="rounded p-1.5 text-tinta/50 hover:bg-suave" onClick={() => { setTitulo(lugar.nombre); setEditando(true); }} aria-label="Editar sitio"><Pencil size={15} /></button>
          </>
        )}
      </div>

      {abierto && (
        <div className="border-t border-linea">
          {items.length === 0 && <p className="px-3 py-3 text-sm text-tinta/60">Añade lo que hay en este sitio.</p>}
          <ul className="divide-y divide-linea">
            {items.map((x) => <Fila key={x.id} x={x} lugares={lugares} cambiar={cambiar} setItems={setItems} setError={setError} />)}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-linea bg-suave/50 p-3">
            <input className="campo min-w-0 flex-[3_1_10rem]" list="sugerencias-material" placeholder="Qué es (balones, conos…)" value={nombre}
              onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && anadir()} />
            <input className="campo w-20 flex-none" type="number" inputMode="numeric" min={0} placeholder="Cant." value={cant}
              onChange={(e) => setCant(e.target.value)} onKeyDown={(e) => e.key === "Enter" && anadir()} />
            <button className="btn-azul flex-none" onClick={anadir} disabled={!nombre.trim()}><Plus size={16} /> Añadir</button>
          </div>
          {items.length > 0 && (
            <div className="border-t border-linea p-3">
              <button className="btn-secundario w-full" onClick={todoContado}><Check size={16} /> Todo este sitio está contado</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Contador({ valor, onCambio, rojo = false, etiqueta }: { valor: number; onCambio: (n: number) => void; rojo?: boolean; etiqueta: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={etiqueta}>
      <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-linea bg-white active:scale-95 disabled:opacity-30"
        onClick={() => onCambio(Math.max(0, valor - 1))} disabled={valor === 0} aria-label={`Quitar ${etiqueta}`}><Minus size={16} /></button>
      <input className={`h-9 w-14 rounded-lg border border-linea bg-white text-center text-lg font-bold ${rojo && valor > 0 ? "text-red-600" : ""}`}
        type="number" inputMode="numeric" min={0} value={valor}
        onChange={(e) => onCambio(Math.max(0, Math.round(Number(e.target.value) || 0)))} onFocus={(e) => e.target.select()} />
      <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-linea bg-white active:scale-95"
        onClick={() => onCambio(valor + 1)} aria-label={`Añadir ${etiqueta}`}><Plus size={16} /></button>
    </div>
  );
}

function Fila({ x, lugares, cambiar, setItems, setError }: {
  x: Material; lugares: Lugar[];
  cambiar: (id: string, c: Partial<Material>, inmediato?: boolean) => void;
  setItems: React.Dispatch<React.SetStateAction<Material[]>>;
  setError: (e: string | null) => void;
}) {
  const [mas, setMas] = useState(false);
  const [d, setD] = useState({ nombre: x.nombre, minimo: x.minimo?.toString() ?? "", notas: x.notas ?? "", lugar_id: x.lugar_id });
  const falta = x.minimo != null && x.cantidad - x.rotos < x.minimo;

  const guardar = () => {
    cambiar(x.id, { nombre: d.nombre.trim() || x.nombre, minimo: d.minimo === "" ? null : Math.max(0, Number(d.minimo) || 0), notas: d.notas.trim() || null, lugar_id: d.lugar_id }, true);
    setMas(false);
  };
  const borrar = async () => {
    if (!confirm(`¿Borrar «${x.nombre}»?`)) return;
    const r = await borrarMaterial(x.id);
    if (r.error) return setError(r.error);
    setItems((xs) => xs.filter((y) => y.id !== x.id));
  };

  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button className="min-w-0 flex-[1_1_9rem] text-left" onClick={() => setMas(!mas)}>
          <div className="font-semibold">{x.nombre}</div>
          <div className="text-xs text-tinta/55">
            {esHoy(x.contado_at) ? <span className="text-green-700">✓ contado hoy</span> : `contado: ${fecha(x.contado_at)}`}
            {falta && <span className="ml-1 font-semibold text-amber-600">· bajo mínimo ({x.minimo})</span>}
            {x.notas && <span> · {x.notas}</span>}
          </div>
        </button>
        <div className="flex items-center gap-3">
          <Contador etiqueta="unidades" valor={x.cantidad} onCambio={(n) => cambiar(x.id, { cantidad: n, rotos: Math.min(x.rotos, n) })} />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase text-tinta/50">Rotos</span>
            <div className="flex items-center gap-1">
              <button className="h-7 w-7 rounded border border-linea bg-white text-sm disabled:opacity-30" onClick={() => cambiar(x.id, { rotos: x.rotos - 1 })} disabled={x.rotos === 0} aria-label="Quitar roto">−</button>
              <span className={`w-6 text-center font-bold ${x.rotos ? "text-red-600" : "text-tinta/40"}`}>{x.rotos}</span>
              <button className="h-7 w-7 rounded border border-linea bg-white text-sm disabled:opacity-30" onClick={() => cambiar(x.id, { rotos: x.rotos + 1 })} disabled={x.rotos >= x.cantidad} aria-label="Añadir roto">+</button>
            </div>
          </div>
        </div>
      </div>
      {mas && (
        <div className="mt-3 grid gap-2 rounded-lg bg-suave/60 p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-tinta/60">Nombre
            <input className="campo mt-1 w-full" list="sugerencias-material" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-tinta/60">Mínimo que debería haber (avisa si baja)
            <input className="campo mt-1 w-full" type="number" inputMode="numeric" min={0} value={d.minimo} onChange={(e) => setD({ ...d, minimo: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-tinta/60">Sitio
            <select className="campo mt-1 w-full" value={d.lugar_id} onChange={(e) => setD({ ...d, lugar_id: e.target.value })}>
              {lugares.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-tinta/60">Notas
            <input className="campo mt-1 w-full" placeholder="Ej.: 3 pinchados, faltan los de talla 6" value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-azul flex-1" onClick={guardar}><Check size={16} /> Guardar</button>
            <button className="btn-secundario" onClick={borrar} aria-label="Borrar"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </li>
  );
}
