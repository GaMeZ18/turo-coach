"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Line, Arrow, Circle, Text, Rect, RegularPolygon } from "react-konva";
import type Konva from "konva";
import {
  Hand, MoveUpRight, Activity, ShieldMinus, Send, Trash2, Undo2, Play, Square, Plus, Minus,
  Download, CircleDot, Users,
} from "lucide-react";
import Pista from "./Pista";
import {
  ANCHO, COLORES, LARGO, MAX_FASES, barraFinal, estados, longitud, normalizar, nuevoId, pizarraVacia,
  puntoEn, siguienteEtiqueta, simplificar, zigzag,
  type Elemento, type Fase, type Movimiento, type Pizarra, type Punto, type TipoAccion, type TipoElemento,
} from "./modelo";

type Herramienta = "colocar" | TipoAccion | "balon" | "pase" | "borrar";

const HERRAMIENTAS: { id: Herramienta; label: string; icono: typeof Hand; ayuda: string }[] = [
  { id: "colocar", label: "Colocar", icono: Hand, ayuda: "Arrastra para colocar (solo en la fase 1)" },
  { id: "correr", label: "Correr", icono: MoveUpRight, ayuda: "Arrastra desde un jugador para dibujar su desplazamiento" },
  { id: "botar", label: "Botar", icono: Activity, ayuda: "Arrastra desde el jugador con balón: línea en zigzag" },
  { id: "bloqueo", label: "Bloqueo", icono: ShieldMinus, ayuda: "Arrastra hasta donde pone el bloqueo" },
  { id: "balon", label: "Balón", icono: CircleDot, ayuda: "Toca al jugador que empieza con el balón (fase 1)" },
  { id: "pase", label: "Pase", icono: Send, ayuda: "Toca al receptor: pasa quien tiene el balón al empezar la fase" },
  { id: "borrar", label: "Borrar", icono: Trash2, ayuda: "Toca un jugador: borra su movimiento de esta fase (o el jugador, en la fase 1)" },
];

const R = 0.42; // radio de los jugadores en metros

// Los navegadores renderizan mal textos de <1px escalados: dibujamos el texto
// K veces más grande y lo reducimos con su propia escala.
const K = 50;
function T({ fontSize, width, height, ...resto }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...resto}
      fontSize={(fontSize ?? 0.4) * K}
      width={width !== undefined ? width * K : undefined}
      height={height !== undefined ? height * K : undefined}
      scaleX={1 / K}
      scaleY={1 / K}
    />
  );
}

export interface EditorProps {
  valor?: unknown;
  onChange?: (p: Pizarra) => void;
  /** El padre recibe una función que devuelve un PNG (data URL) con todas las fases dibujadas. */
  registrarCaptura?: (fn: () => Promise<string>) => void;
  altoMax?: number;
}

export default function Editor({ valor, onChange, registrarCaptura, altoMax = 640 }: EditorProps) {
  const [p, setP] = useState<Pizarra>(() => normalizar(valor ?? pizarraVacia()));
  const [historial, setHistorial] = useState<Pizarra[]>([]);
  const [fase, setFase] = useState(0);
  const [herr, setHerr] = useState<Herramienta>("colocar");
  const [trazo, setTrazo] = useState<{ id: string; puntos: number[] } | null>(null);
  const [anim, setAnim] = useState<{ fase: number; t: number } | null>(null);
  const [verTodo, setVerTodo] = useState(false);
  const [ancho, setAncho] = useState(400);

  const contRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const largo = LARGO(p.pista);
  const escala = Math.min(ancho / ANCHO, altoMax / largo);
  const est = useMemo(() => estados(p), [p]);
  const e = est[Math.min(fase, est.length - 1)];
  const faseActual: Fase = p.fases[Math.min(fase, p.fases.length - 1)];

  // ---------- tamaño responsive ----------
  useEffect(() => {
    if (!contRef.current) return;
    const ro = new ResizeObserver(([entry]) => setAncho(entry.contentRect.width));
    ro.observe(contRef.current);
    return () => ro.disconnect();
  }, []);

  // ---------- notificar cambios ----------
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => { onChangeRef.current?.(p); }, [p]);

  const cambiar = (fn: (prev: Pizarra) => Pizarra) => {
    setHistorial((h) => [...h.slice(-40), p]);
    setP(fn(structuredClone(p)));
  };

  const deshacer = () => {
    if (!historial.length) return;
    const anterior = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setP(anterior);
    setFase((f) => Math.min(f, anterior.fases.length - 1));
  };

  // Ctrl/Cmd+Z
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") { ev.preventDefault(); deshacer(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // ---------- elementos ----------
  const agregar = (tipo: TipoElemento) => {
    cambiar((d) => {
      const id = nuevoId();
      const n = d.elementos.filter((x) => x.tipo === tipo).length;
      d.elementos.push({ id, tipo, etiqueta: siguienteEtiqueta(d, tipo), color: COLORES[tipo] });
      const base: Record<TipoElemento, Punto> = {
        atacante: { x: 2 + (n % 6) * 2.2, y: 11.5 },
        defensor: { x: 2 + (n % 6) * 2.2, y: 9.5 },
        cono: { x: 1.5 + (n % 8) * 1.5, y: 12.8 },
        entrenador: { x: 13.5, y: 12.8 },
      };
      d.inicial[id] = base[tipo];
      return d;
    });
    setHerr("colocar");
    setFase(0);
  };

  const quinteto = (conDefensa: boolean) => {
    cambiar((d) => {
      const ataque: Punto[] = [
        { x: 7.5, y: 8.9 }, { x: 12.6, y: 6.2 }, { x: 2.4, y: 6.2 }, { x: 10.6, y: 2.4 }, { x: 4.4, y: 2.4 },
      ];
      d.elementos = []; d.inicial = {}; d.fases = [{ movimientos: [], pase: null }];
      ataque.forEach((pt, i) => {
        const id = nuevoId();
        d.elementos.push({ id, tipo: "atacante", etiqueta: String(i + 1), color: COLORES.atacante });
        d.inicial[id] = pt;
        if (i === 0) d.balonInicial = id;
        if (conDefensa) {
          const dx = nuevoId();
          d.elementos.push({ id: dx, tipo: "defensor", etiqueta: `X${i + 1}`, color: COLORES.defensor });
          // El defensor se coloca entre su par y la canasta
          const v = { x: 7.5 - pt.x, y: 1.575 - pt.y };
          const L = Math.hypot(v.x, v.y) || 1;
          d.inicial[dx] = { x: pt.x + (v.x / L) * 1.1, y: pt.y + (v.y / L) * 1.1 };
        }
      });
      return d;
    });
    setFase(0);
  };

  const borrarElemento = (id: string) =>
    cambiar((d) => {
      d.elementos = d.elementos.filter((x) => x.id !== id);
      delete d.inicial[id];
      if (d.balonInicial === id) d.balonInicial = null;
      d.fases.forEach((f) => {
        f.movimientos = f.movimientos.filter((m) => m.elementoId !== id);
        if (f.pase && (f.pase.de === id || f.pase.a === id)) f.pase = null;
      });
      return d;
    });

  // ---------- fases ----------
  const nuevaFase = () => {
    if (p.fases.length >= MAX_FASES) return;
    cambiar((d) => { d.fases.push({ movimientos: [], pase: null }); return d; });
    setFase(p.fases.length);
  };
  const quitarFase = () => {
    if (p.fases.length <= 1) return;
    cambiar((d) => { d.fases.pop(); return d; });
    setFase((f) => Math.min(f, p.fases.length - 2));
  };

  // ---------- interacción ----------
  const puntero = (): Punto | null => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return null;
    return { x: Math.max(0, Math.min(ANCHO, pos.x / escala)), y: Math.max(0, Math.min(largo, pos.y / escala)) };
  };

  const pulsarElemento = (el: Elemento) => {
    if (anim || verTodo) return;
    if (herr === "borrar") {
      const tiene = faseActual.movimientos.some((m) => m.elementoId === el.id);
      if (tiene) {
        cambiar((d) => { d.fases[fase].movimientos = d.fases[fase].movimientos.filter((m) => m.elementoId !== el.id); return d; });
      } else if (faseActual.pase && (faseActual.pase.a === el.id || faseActual.pase.de === el.id)) {
        cambiar((d) => { d.fases[fase].pase = null; return d; });
      } else if (fase === 0) {
        borrarElemento(el.id);
      }
      return;
    }
    if (herr === "balon") {
      if (el.tipo !== "atacante") return;
      cambiar((d) => { d.balonInicial = d.balonInicial === el.id ? null : el.id; return d; });
      return;
    }
    if (herr === "pase") {
      const de = e.balonInicio;
      if (!de || el.tipo !== "atacante") return;
      cambiar((d) => { d.fases[fase].pase = el.id === de ? null : { de, a: el.id }; return d; });
      return;
    }
    if (herr === "correr" || herr === "botar" || herr === "bloqueo") {
      if (el.tipo === "cono" && herr !== "correr") return;
      const ini = e.inicio[el.id];
      if (ini) setTrazo({ id: el.id, puntos: [ini.x, ini.y] });
    }
  };

  const mover = () => {
    if (!trazo) return;
    const pt = puntero();
    if (!pt) return;
    setTrazo((t) => (t ? { ...t, puntos: [...t.puntos, pt.x, pt.y] } : t));
  };

  const soltar = () => {
    if (!trazo) return;
    const puntos = simplificar(trazo.puntos);
    const id = trazo.id;
    setTrazo(null);
    if (longitud(puntos) < 0.6) return; // fue un toque, no un trazo
    const mov: Movimiento = { elementoId: id, tipo: herr as TipoAccion, puntos };
    cambiar((d) => {
      const f = d.fases[fase];
      f.movimientos = [...f.movimientos.filter((m) => m.elementoId !== id), mov];
      return d;
    });
  };

  const arrastrarFin = (id: string, node: Konva.Node) => {
    const nuevo = { x: node.x(), y: node.y() };
    cambiar((d) => {
      d.inicial[id] = nuevo;
      const m = d.fases[0].movimientos.find((x) => x.elementoId === id);
      if (m) { m.puntos[0] = nuevo.x; m.puntos[1] = nuevo.y; }
      return d;
    });
  };

  // ---------- animación ----------
  const duracionFase = (f: Fase) =>
    Math.max(1100, (Math.max(0, ...f.movimientos.map((m) => longitud(m.puntos))) / 4.2) * 1000);

  const reproducir = () => {
    if (anim) { setAnim(null); return; }
    let faseAnim = 0;
    let t0 = performance.now();
    const PAUSA = 350;
    const paso = (ahora: number) => {
      const f = p.fases[faseAnim];
      const D = duracionFase(f);
      const t = (ahora - t0) / D;
      if (t >= 1 + PAUSA / D) {
        faseAnim++;
        if (faseAnim >= p.fases.length) { setAnim(null); setFase(p.fases.length - 1); return; }
        t0 = ahora;
      }
      setAnim({ fase: faseAnim, t: Math.min(1, (ahora - t0) / duracionFase(p.fases[faseAnim])) });
      rafRef.current = requestAnimationFrame(paso);
    };
    setVerTodo(false);
    rafRef.current = requestAnimationFrame(paso);
  };
  const rafRef = useRef<number>(0);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (!anim) cancelAnimationFrame(rafRef.current); }, [anim]);

  // ---------- captura ----------
  const verTodoRef = useRef(setVerTodo);
  useEffect(() => {
    registrarCaptura?.(async () => {
      verTodoRef.current(true);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const url = stageRef.current?.toDataURL({ pixelRatio: Math.min(2, 600 / Math.max(1, ANCHO * escala)), mimeType: "image/jpeg", quality: 0.85 }) ?? "";
      verTodoRef.current(false);
      return url;
    });
  }, [registrarCaptura, escala]);

  const descargar = () => {
    const url = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = verTodo ? "pizarra.png" : `pizarra-fase-${fase + 1}.png`;
    a.click();
  };

  // ---------- qué se dibuja ----------
  const posiciones: Record<string, Punto> = {};
  let balonEn: Punto | null = null;
  let lineas: { m: Movimiento; fase: number }[] = [];
  let pases: { de: Punto; a: Punto; fase: number }[] = [];

  if (anim) {
    const ea = est[anim.fase];
    const fa = p.fases[anim.fase];
    for (const el of p.elementos) {
      const m = fa.movimientos.find((x) => x.elementoId === el.id);
      posiciones[el.id] = m ? puntoEn(m.puntos, anim.t) : ea.inicio[el.id];
    }
    lineas = fa.movimientos.map((m) => ({ m, fase: anim.fase }));
    if (fa.pase && posiciones[fa.pase.de] && posiciones[fa.pase.a]) {
      // El balón viaja durante la segunda mitad de la fase
      const k = Math.max(0, (anim.t - 0.5) / 0.5);
      const a = posiciones[fa.pase.de], b = posiciones[fa.pase.a];
      balonEn = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    } else if (ea.balonInicio && posiciones[ea.balonInicio]) {
      balonEn = posiciones[ea.balonInicio];
    }
  } else if (verTodo) {
    Object.assign(posiciones, p.inicial);
    p.fases.forEach((f, i) => {
      lineas.push(...f.movimientos.map((m) => ({ m, fase: i })));
      if (f.pase && est[i].fin[f.pase.de] && est[i].fin[f.pase.a]) {
        pases.push({ de: est[i].fin[f.pase.de], a: est[i].fin[f.pase.a], fase: i });
      }
    });
    if (p.balonInicial && p.inicial[p.balonInicial]) balonEn = p.inicial[p.balonInicial];
  } else {
    const fuente = herr === "colocar" ? e.inicio : e.fin;
    Object.assign(posiciones, fuente);
    lineas = faseActual.movimientos.map((m) => ({ m, fase }));
    if (trazo) lineas = lineas.filter((l) => l.m.elementoId !== trazo.id);
    if (faseActual.pase && e.fin[faseActual.pase.de] && e.fin[faseActual.pase.a]) {
      pases = [{ de: e.fin[faseActual.pase.de], a: e.fin[faseActual.pase.a], fase }];
    }
    const portador = herr === "colocar" ? e.balonInicio : faseActual.pase ? faseActual.pase.de : e.balonFin;
    if (portador && posiciones[portador]) balonEn = posiciones[portador];
  }

  const colorLinea = (m: Movimiento) => {
    const el = p.elementos.find((x) => x.id === m.elementoId);
    return el?.tipo === "defensor" ? COLORES.defensor : "#1b2333";
  };

  const dibujarMovimiento = (m: Movimiento, key: string, opacidad = 1, numeroFase?: number) => {
    const color = colorLinea(m);
    const n = m.puntos.length;
    const comun = { stroke: color, fill: color, strokeWidth: 0.09, lineCap: "round" as const, lineJoin: "round" as const, opacity: opacidad };
    return (
      <Group key={key} listening={false}>
        {m.tipo === "botar" ? (
          <Arrow points={zigzag(m.puntos)} pointerLength={0.38} pointerWidth={0.34} {...comun} />
        ) : m.tipo === "bloqueo" ? (
          <>
            <Line points={m.puntos} {...comun} tension={0.4} />
            <Line points={barraFinal(m.puntos)} {...comun} strokeWidth={0.14} />
          </>
        ) : (
          <Arrow points={m.puntos} pointerLength={0.38} pointerWidth={0.34} tension={0.4} {...comun} />
        )}
        {numeroFase !== undefined && n >= 4 && (
          <T
            x={m.puntos[Math.floor(n / 4) * 2] + 0.15} y={m.puntos[Math.floor(n / 4) * 2 + 1] + 0.1}
            text={String(numeroFase + 1)} fontSize={0.42} fontStyle="bold" fill={color}
          />
        )}
      </Group>
    );
  };

  const ayuda = HERRAMIENTAS.find((h) => h.id === herr)?.ayuda;

  return (
    <div className="space-y-3 select-none">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-1.5">
        {HERRAMIENTAS.map(({ id, label, icono: I }) => (
          <button
            key={id} type="button" onClick={() => { setHerr(id); setVerTodo(false); }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${herr === id ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
          >
            <I size={16} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <button type="button" onClick={deshacer} disabled={!historial.length} className="ml-auto rounded-lg border border-linea bg-white p-1.5 hover:bg-suave disabled:opacity-40" title="Deshacer (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-xs uppercase tracking-wide text-tinta/50">Añadir:</span>
        <button type="button" onClick={() => agregar("atacante")} className="flex items-center gap-1 rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: COLORES.atacante }} /> Atacante
        </button>
        <button type="button" onClick={() => agregar("defensor")} className="flex items-center gap-1 rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: COLORES.defensor }} /> Defensor
        </button>
        <button type="button" onClick={() => agregar("cono")} className="flex items-center gap-1 rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave">
          <span className="text-naranja">▲</span> Cono
        </button>
        <button type="button" onClick={() => agregar("entrenador")} className="rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave">Entrenador</button>
        <button type="button" onClick={() => quinteto(false)} className="flex items-center gap-1 rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave" title="Coloca 5 atacantes en 1-2-2 (borra lo actual)">
          <Users size={14} /> 5 ataque
        </button>
        <button type="button" onClick={() => quinteto(true)} className="flex items-center gap-1 rounded-lg border border-linea bg-white px-2 py-1 hover:bg-suave" title="5 contra 5 (borra lo actual)">
          <Users size={14} /> 5 vs 5
        </button>
        <select
          value={p.pista}
          onChange={(ev) => cambiar((d) => { d.pista = ev.target.value as Pizarra["pista"]; return d; })}
          className="ml-auto rounded-lg border border-linea bg-white px-2 py-1"
        >
          <option value="media">Media pista</option>
          <option value="completa">Pista entera</option>
        </select>
      </div>

      {/* Pista */}
      <div ref={contRef} className="w-full">
        <div className="mx-auto overflow-hidden rounded-xl border border-linea shadow-sm" style={{ width: ANCHO * escala, touchAction: "none" }}>
          <Stage
            ref={stageRef}
            width={ANCHO * escala}
            height={largo * escala}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerLeave={soltar}
          >
            <Layer scaleX={escala} scaleY={escala}>
              <Pista tipo={p.pista} />

              {/* Sombras de la posición inicial de quien se mueve */}
              {!anim && !verTodo && herr !== "colocar" && faseActual.movimientos.map((m) => {
                const ini = e.inicio[m.elementoId];
                const el = p.elementos.find((x) => x.id === m.elementoId);
                if (!ini || !el || el.tipo === "cono") return null;
                return <Circle key={`s-${m.elementoId}`} x={ini.x} y={ini.y} radius={R} fill={el.color} opacity={0.18} listening={false} />;
              })}

              {lineas.map(({ m, fase: fi }, i) => dibujarMovimiento(m, `l-${fi}-${i}`, anim ? 0.35 : 1, verTodo ? fi : undefined))}
              {pases.map((ps, i) => (
                <Group key={`p-${i}`} listening={false}>
                  <Arrow points={[ps.de.x, ps.de.y, ps.a.x, ps.a.y]} stroke="#1b2333" fill="#1b2333" strokeWidth={0.08} dash={[0.28, 0.2]} pointerLength={0.38} pointerWidth={0.34} opacity={anim ? 0.35 : 1} />
                  {verTodo && <T x={(ps.de.x + ps.a.x) / 2 + 0.15} y={(ps.de.y + ps.a.y) / 2} text={String(ps.fase + 1)} fontSize={0.42} fontStyle="bold" fill="#1b2333" />}
                </Group>
              ))}
              {trazo && dibujarMovimiento({ elementoId: trazo.id, tipo: herr as TipoAccion, puntos: trazo.puntos }, "trazo", 0.8)}

              {p.elementos.map((el) => {
                const pos = posiciones[el.id];
                if (!pos) return null;
                const arrastrable = herr === "colocar" && fase === 0 && !anim && !verTodo;
                return (
                  <Group
                    key={el.id}
                    x={pos.x} y={pos.y}
                    draggable={arrastrable}
                    dragBoundFunc={(posAbs) => ({
                      x: Math.max(0, Math.min(ANCHO * escala, posAbs.x)),
                      y: Math.max(0, Math.min(largo * escala, posAbs.y)),
                    })}
                    onDragEnd={(ev) => arrastrarFin(el.id, ev.target)}
                    onPointerDown={(ev) => { ev.cancelBubble = true; pulsarElemento(el); }}
                  >
                    {el.tipo === "cono" ? (
                      <RegularPolygon sides={3} radius={0.32} fill={el.color} stroke="#fff" strokeWidth={0.05} />
                    ) : el.tipo === "entrenador" ? (
                      <>
                        <Rect x={-R} y={-R} width={R * 2} height={R * 2} cornerRadius={0.08} fill={el.color} />
                        <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={0.45} fontStyle="bold" fill="#fff" />
                      </>
                    ) : (
                      <>
                        <Circle radius={R} fill={el.color} stroke="#fff" strokeWidth={0.06} shadowColor="#000" shadowOpacity={0.25} shadowBlur={0.15} shadowOffsetY={0.05} />
                        <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={el.etiqueta.length > 1 ? 0.36 : 0.46} fontStyle="bold" fill="#fff" />
                      </>
                    )}
                    {/* zona de toque más grande para dedos */}
                    <Circle radius={R * 1.5} fill="transparent" />
                  </Group>
                );
              })}

              {balonEn && (
                <Circle x={balonEn.x + R * 0.8} y={balonEn.y - R * 0.8} radius={0.2} fill="#fc6401" stroke="#7a2c00" strokeWidth={0.04} listening={false} />
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Fases y reproducción */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs uppercase tracking-wide text-tinta/50">Fase:</span>
        {p.fases.map((_, i) => (
          <button
            key={i} type="button"
            onClick={() => { setFase(i); setVerTodo(false); setAnim(null); }}
            className={`h-8 w-8 rounded-lg border text-sm font-semibold ${(anim ? anim.fase === i : fase === i && !verTodo) ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" onClick={nuevaFase} disabled={p.fases.length >= MAX_FASES} className="rounded-lg border border-linea bg-white p-1.5 hover:bg-suave disabled:opacity-40" title="Nueva fase"><Plus size={16} /></button>
        <button type="button" onClick={quitarFase} disabled={p.fases.length <= 1} className="rounded-lg border border-linea bg-white p-1.5 hover:bg-suave disabled:opacity-40" title="Quitar última fase"><Minus size={16} /></button>
        <button type="button" onClick={() => { setVerTodo((v) => !v); setAnim(null); }} className={`rounded-lg border px-2.5 py-1.5 text-sm ${verTodo ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}>
          Todas
        </button>
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={descargar} className="rounded-lg border border-linea bg-white p-1.5 hover:bg-suave" title="Descargar imagen"><Download size={18} /></button>
          <button type="button" onClick={reproducir} className="btn-primario !py-1.5">
            {anim ? <><Square size={16} /> Parar</> : <><Play size={16} /> Animar</>}
          </button>
        </div>
      </div>

      <input
        value={faseActual.nota ?? ""}
        onChange={(ev) => {
          const v = ev.target.value;
          setP((prev) => { const d = structuredClone(prev); d.fases[fase].nota = v; return d; });
        }}
        placeholder={`Nota de la fase ${fase + 1} (opcional)`}
        className="campo"
        disabled={verTodo || !!anim}
      />
      {anim && p.fases[anim.fase]?.nota && <p className="rounded-lg bg-tinta/5 p-2 text-sm">{p.fases[anim.fase].nota}</p>}
      <p className="text-xs text-tinta/50">{verTodo ? "Vista de todas las fases. Pulsa un número de fase para editar." : ayuda}</p>
    </div>
  );
}
