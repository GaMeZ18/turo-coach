"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Group, Line, Arrow, Circle, Text, Rect, RegularPolygon } from "react-konva";
import {
  Play, Square, Minus, Download, Undo2, Trash2, RotateCcw, RotateCw, Users, Maximize2, Minimize2,
  Type, Layers, Camera,
} from "lucide-react";
import Pista from "./Pista";
import {
  COLOR_DEFECTO, MAX_FASES, NOMBRE, PALETA, barraFinal, barrasMano, canastaCercana, cambiarPista, dimensiones,
  esJugador, estados, longitud, normalizar, nuevoId, paralelas, pizarraVacia, puntoEn, recortarFinal,
  siguienteEtiqueta, simplificar, zigzag,
  type AccionBalon, type Elemento, type Fase, type Movimiento, type Pizarra, type Punto, type TipoElemento,
  type TipoTrazo,
} from "./modelo";

// Arrastres de menos de 5 px cuentan como toque (para seleccionar sin mover)
Konva.dragDistance = 5;

// Texto nítido: se dibuja grande y se reduce (los textos < 1px se ven mal al escalar)
const K = 50;
function T({ fontSize, width, height, ...resto }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...resto}
      fontFamily="Barlow, Arial, sans-serif"
      fontSize={(fontSize ?? 0.4) * K}
      width={width !== undefined ? width * K : undefined}
      height={height !== undefined ? height * K : undefined}
      scaleX={1 / K}
      scaleY={1 / K}
    />
  );
}

const TINTA = "#121a33";
const MATERIALES: TipoElemento[] = ["cono", "chino", "aro", "pica", "valla", "escalera", "balon"];
const TRAZOS: { id: "auto" | TipoTrazo; label: string; ayuda: string }[] = [
  { id: "auto", label: "Auto", ayuda: "Bota si tiene el balón; si no, corre" },
  { id: "correr", label: "Desplazamiento", ayuda: "Línea continua con flecha" },
  { id: "botar", label: "Bote", ayuda: "Línea en zigzag" },
  { id: "bloqueo", label: "Bloqueo", ayuda: "Línea acabada en T" },
];

export interface EditorProps {
  valor?: unknown;
  onChange?: (p: Pizarra) => void;
  registrarCaptura?: (fn: () => Promise<string>) => void;
  altoMax?: number;
}

export default function Editor({ valor, onChange, registrarCaptura, altoMax = 620 }: EditorProps) {
  const [p, setP] = useState<Pizarra>(() => normalizar(valor ?? pizarraVacia()));
  const [historial, setHistorial] = useState<Pizarra[]>([]);
  const [paso, setPaso] = useState(0); // 0 = posición inicial; k = fase k
  const [sel, setSel] = useState<string | null>(null);
  const [trazo, setTrazo] = useState<"auto" | TipoTrazo>("auto");
  const [modoBalon, setModoBalon] = useState<"pase" | "mano" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vivo, setVivo] = useState<{ id: string; puntos: number[] } | null>(null);
  const vivoRef = useRef<{ id: string; puntos: number[] } | null>(null);
  const [anim, setAnim] = useState<{ fase: number; t: number } | null>(null);
  const [verTodo, setVerTodo] = useState(false);
  const [grande, setGrande] = useState(false);
  const [caja, setCaja] = useState({ ancho: 400, alto: 800 });

  const contRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const rafRef = useRef(0);

  const { ancho: W, alto: H } = dimensiones(p.pista);
  const altoDisponible = grande ? Math.max(200, caja.alto - 150) : altoMax;
  const escala = Math.max(4, Math.min(caja.ancho / W, altoDisponible / H));
  const R = p.pista === "completa" ? 0.5 : 0.45;
  const toque = Math.max(R * 1.5, 22 / escala); // zona táctil mínima ~22 px (dedo)
  const est = useMemo(() => estados(p), [p]);
  const e = paso > 0 ? est[paso - 1] : null;
  const fase: Fase | null = paso > 0 ? p.fases[paso - 1] : null;
  const elSel = p.elementos.find((x) => x.id === sel) ?? null;

  // ---------- tamaño ----------
  useEffect(() => {
    const medir = () => {
      const w = contRef.current?.clientWidth ?? 400;
      setCaja({ ancho: w, alto: window.innerHeight });
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (contRef.current) ro.observe(contRef.current);
    window.addEventListener("resize", medir);
    return () => { ro.disconnect(); window.removeEventListener("resize", medir); };
  }, [grande]);

  // ---------- cambios ----------
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => { onChangeRef.current?.(p); }, [p]);

  const cambiar = (fn: (d: Pizarra) => Pizarra | void) => {
    setHistorial((h) => [...h.slice(-50), p]);
    const d = structuredClone(p);
    setP((fn(d) as Pizarra | undefined) ?? d);
  };
  const deshacer = () => {
    if (!historial.length) return;
    const ant = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setP(ant);
    setPaso((k) => Math.min(k, ant.fases.length));
  };

  const avisar = (m: string) => { setAviso(m); window.setTimeout(() => setAviso((a) => (a === m ? null : a)), 3500); };

  // ---------- elementos ----------
  const posLibre = (tipo: TipoElemento): Punto => {
    const n = p.elementos.length;
    if (p.pista === "completa") {
      if (esJugador(tipo)) return { x: 9 + (n % 5) * 1.3, y: 3 + Math.floor(n / 5) * 1.4 };
      return { x: 16 + (n % 8) * 1.3, y: 12.5 - Math.floor(n / 8) * 1.3 };
    }
    if (esJugador(tipo)) return { x: 2.5 + (n % 6) * 1.8, y: 10.5 };
    return { x: 2 + (n % 8) * 1.5, y: 12.6 };
  };

  const agregar = (tipo: TipoElemento) => {
    if (anim) return;
    let etiqueta = siguienteEtiqueta(p, tipo);
    if (tipo === "texto") {
      const t = window.prompt("Texto a mostrar en la pista:", "");
      if (!t) return;
      etiqueta = t;
    }
    const id = nuevoId();
    cambiar((d) => {
      d.elementos.push({ id, tipo, etiqueta, color: COLOR_DEFECTO[tipo], rot: esJugador(tipo) ? undefined : 0 });
      d.inicial[id] = posLibre(tipo);
    });
    setSel(id);
    setVerTodo(false);
  };

  const quinteto = (defensa: boolean) => {
    if (p.elementos.length && !window.confirm("Se sustituirá lo que hay en la pizarra. ¿Continuar?")) return;
    // posiciones 1-2-2 en coordenadas locales de media pista (u a lo ancho, v desde el fondo)
    const local: Punto[] = [
      { x: 7.5, y: 8.9 }, { x: 12.6, y: 6.2 }, { x: 2.4, y: 6.2 }, { x: 10.6, y: 2.4 }, { x: 4.4, y: 2.4 },
    ];
    const aPista = (q: Punto): Punto => (p.pista === "completa" ? { x: q.y, y: q.x } : q);
    const aro = p.pista === "completa" ? { x: 1.575, y: 7.5 } : { x: 7.5, y: 1.575 };
    cambiar((d) => {
      d.elementos = []; d.inicial = {}; d.fases = [{ movimientos: [], balon: null }]; d.balonInicial = null;
      local.forEach((q, i) => {
        const id = nuevoId();
        const pos = aPista(q);
        d.elementos.push({ id, tipo: "atacante", etiqueta: String(i + 1), color: COLOR_DEFECTO.atacante });
        d.inicial[id] = pos;
        if (i === 0) d.balonInicial = id;
        if (defensa) {
          const dx = nuevoId();
          const v = { x: aro.x - pos.x, y: aro.y - pos.y };
          const L = Math.hypot(v.x, v.y) || 1;
          d.elementos.push({ id: dx, tipo: "defensor", etiqueta: `X${i + 1}`, color: COLOR_DEFECTO.defensor });
          d.inicial[dx] = { x: pos.x + (v.x / L) * 1.2, y: pos.y + (v.y / L) * 1.2 };
        }
      });
    });
    setPaso(0); setSel(null); setVerTodo(false);
  };

  const borrarElemento = (id: string) =>
    cambiar((d) => {
      d.elementos = d.elementos.filter((x) => x.id !== id);
      delete d.inicial[id];
      if (d.balonInicial === id) d.balonInicial = null;
      d.fases.forEach((f) => {
        f.movimientos = f.movimientos.filter((m) => m.elementoId !== id);
        if (f.balon && (f.balon.de === id || f.balon.a === id)) f.balon = null;
      });
    });

  const editarElemento = (id: string, campos: Partial<Elemento>) =>
    cambiar((d) => {
      const el = d.elementos.find((x) => x.id === id);
      if (el) Object.assign(el, campos);
    });

  const borrarSeleccion = () => {
    if (!elSel) return;
    if (paso > 0 && fase) {
      const tieneMov = fase.movimientos.some((m) => m.elementoId === elSel.id);
      const tieneBalon = fase.balon && (fase.balon.de === elSel.id || fase.balon.a === elSel.id);
      if (tieneMov || tieneBalon) {
        cambiar((d) => {
          const f = d.fases[paso - 1];
          f.movimientos = f.movimientos.filter((m) => m.elementoId !== elSel.id);
          if (f.balon && (f.balon.de === elSel.id || f.balon.a === elSel.id)) f.balon = null;
        });
        return;
      }
    }
    if (window.confirm(`¿Quitar ${NOMBRE[elSel.tipo].toLowerCase()} ${elSel.etiqueta} de la pizarra?`)) {
      borrarElemento(elSel.id);
      setSel(null);
    }
  };

  // ---------- fases ----------
  const quitarFase = () => {
    if (p.fases.length <= 1) return;
    const ult = p.fases[p.fases.length - 1];
    if ((ult.movimientos.length || ult.balon) && !window.confirm(`¿Borrar la fase ${p.fases.length} y sus movimientos?`)) return;
    cambiar((d) => { d.fases.pop(); });
    setPaso((k) => Math.min(k, p.fases.length - 1));
  };

  // ---------- grabar / captura (como en Coach Studio) ----------
  const grabando = paso > 0;
  const alternarGrabar = () => {
    setVerTodo(false); setAnim(null); setModoBalon(null); setSel(null);
    if (grabando) { setPaso(0); return; }
    if (!p.elementos.length) { avisar("Primero añade jugadores en la pista."); return; }
    setPaso(p.fases.length); // continúa en la última captura
    avisar("Grabando: arrastra a los jugadores; cada movimiento se queda grabado.");
  };
  const capturar = () => {
    if (!fase) return;
    if (!fase.movimientos.length && !fase.balon) { avisar("Haz algún movimiento antes de capturar."); return; }
    if (paso < p.fases.length) { setPaso(paso + 1); return; }
    if (p.fases.length >= MAX_FASES) { avisar(`Máximo ${MAX_FASES} capturas por pizarra.`); return; }
    cambiar((d) => { d.fases.push({ movimientos: [], balon: null }); });
    setPaso(p.fases.length + 1);
    setSel(null);
    avisar(`Captura ${paso} guardada. Sigue moviendo: ahora es la imagen ${paso + 1}.`);
  };

  // ---------- balón ----------
  const accionBalon = (tipo: "pase" | "mano" | "tiro") => {
    if (!e || !fase) return;
    const quien = e.balonInicio;
    if (!quien) {
      avisar("Nadie tiene el balón en esta fase. Ve a «Inicio», toca un atacante y pulsa «Con balón».");
      return;
    }
    if (tipo === "tiro") {
      cambiar((d) => { d.fases[paso - 1].balon = { tipo: "tiro", de: quien }; });
      setModoBalon(null);
      return;
    }
    setModoBalon((m) => (m === tipo ? null : tipo));
    setSel(null);
    avisar(tipo === "pase" ? "Toca al jugador que recibe el pase." : "Toca al jugador que recibe el mano a mano.");
  };

  // ---------- interacción ----------
  const tocar = (el: Elemento) => {
    if (anim) return;
    if (modoBalon && e && fase) {
      const de = e.balonInicio;
      if (!de || el.id === de || el.tipo !== "atacante") { avisar("Elige a otro atacante como receptor."); return; }
      const accion: AccionBalon = { tipo: modoBalon, de, a: el.id };
      cambiar((d) => { d.fases[paso - 1].balon = accion; });
      setModoBalon(null);
      setAviso(null);
      return;
    }
    setSel((s) => (s === el.id ? null : el.id));
  };

  const posicionMostrada = (id: string): Punto | undefined => (paso === 0 || verTodo ? p.inicial[id] : e?.fin[id]);

  const tipoTrazoPara = (el: Elemento): TipoTrazo => {
    if (trazo !== "auto") return el.tipo === "atacante" || el.tipo === "defensor" || trazo !== "botar" ? trazo : "correr";
    if (el.tipo === "atacante" && e?.balonInicio === el.id && !fase?.balon) return "botar";
    return "correr";
  };

  const inicioArrastre = (el: Elemento) => {
    // OJO: no seleccionar aquí. Si aparece algo encima de la pista durante el arrastre,
    // la pista se desplaza bajo el dedo y el jugador "se escapa".
    setModoBalon(null);
    if (paso > 0) {
      const pos = posicionMostrada(el.id);
      vivoRef.current = pos ? { id: el.id, puntos: [pos.x, pos.y] } : null;
      setVivo(vivoRef.current);
    }
  };

  const durante = (el: Elemento, node: Konva.Node) => {
    const v = vivoRef.current;
    if (paso === 0 || !v || v.id !== el.id) return;
    const x = node.x(), y = node.y();
    const n = v.puntos.length;
    if (Math.hypot(x - v.puntos[n - 2], y - v.puntos[n - 1]) < 0.12) return;
    v.puntos = [...v.puntos, x, y];
    setVivo({ id: v.id, puntos: v.puntos });
  };

  const finArrastre = (el: Elemento, node: Konva.Node) => {
    const destino = { x: node.x(), y: node.y() };
    if (paso === 0) {
      cambiar((d) => {
        d.inicial[el.id] = destino;
        const m = d.fases[0]?.movimientos.find((x) => x.elementoId === el.id);
        if (m) { m.puntos[0] = destino.x; m.puntos[1] = destino.y; }
      });
      return;
    }
    const v = vivoRef.current;
    const previa = posicionMostrada(el.id);
    const origen = v && v.id === el.id ? v.puntos : previa ? [previa.x, previa.y] : [];
    vivoRef.current = null;
    setVivo(null);
    const puntos = simplificar([...origen, destino.x, destino.y]);
    if (puntos.length < 4 || longitud(puntos) < 0.4) {
      if (previa) node.position(previa); // arrastre demasiado corto: vuelve a su sitio
      return;
    }
    cambiar((d) => {
      const f = d.fases[paso - 1];
      const existente = f.movimientos.find((m) => m.elementoId === el.id);
      if (existente) {
        existente.puntos = [...existente.puntos, ...puntos.slice(2)];
      } else {
        f.movimientos.push({ elementoId: el.id, tipo: tipoTrazoPara(el), puntos });
      }
    });
  };

  const fondoTocado = (ev: Konva.KonvaEventObject<Event>) => {
    if (ev.target === ev.target.getStage()) { setSel(null); setModoBalon(null); }
  };

  // ---------- teclado ----------
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); deshacer(); return; }
      if (ev.key === "Escape") { setSel(null); setModoBalon(null); return; }
      if ((ev.key === "Delete" || ev.key === "Backspace") && sel) { ev.preventDefault(); borrarSeleccion(); return; }
      if (ev.key === " ") { ev.preventDefault(); reproducir(); return; }
      if (ev.key.toLowerCase() === "r" && elSel && !esJugador(elSel.tipo)) {
        editarElemento(elSel.id, { rot: ((elSel.rot ?? 0) + (ev.shiftKey ? -45 : 45) + 360) % 360 });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // ---------- animación ----------
  const VEL = 4.2; // m/s: todos a la misma velocidad → la duración es proporcional al recorrido
  const tiempos = (f: Fase) => {
    const maxL = Math.max(0, ...f.movimientos.map((m) => longitud(m.puntos)));
    const mov = f.movimientos.length ? Math.max(700, (maxL / VEL) * 1000) : 250;
    const bal = f.balon ? (f.balon.tipo === "tiro" ? 750 : 600) : 0;
    return { mov, bal, total: mov + bal + 350 };
  };

  const reproducir = () => {
    if (anim) { cancelAnimationFrame(rafRef.current); setAnim(null); return; }
    setVerTodo(false); setSel(null); setModoBalon(null);
    let i = 0;
    let t0 = performance.now();
    const paso_ = (ahora: number) => {
      const t = ahora - t0;
      if (t >= tiempos(p.fases[i]).total) {
        i++;
        if (i >= p.fases.length) { setAnim(null); setPaso(p.fases.length); return; }
        t0 = ahora;
      }
      setAnim({ fase: i, t: ahora - t0 });
      rafRef.current = requestAnimationFrame(paso_);
    };
    rafRef.current = requestAnimationFrame(paso_);
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ---------- captura (miniatura con todas las fases) ----------
  useEffect(() => {
    registrarCaptura?.(async () => {
      setVerTodo(true); setSel(null);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const url = stageRef.current?.toDataURL({
        pixelRatio: Math.min(2, 900 / Math.max(1, W * escala)), mimeType: "image/jpeg", quality: 0.85,
      }) ?? "";
      setVerTodo(false);
      return url;
    });
  }, [registrarCaptura, escala, W]);

  const descargar = () => {
    setSel(null);
    requestAnimationFrame(() => {
      const url = stageRef.current?.toDataURL({ pixelRatio: 2 });
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = verTodo ? "pizarra-completa.png" : paso === 0 ? "pizarra-inicio.png" : `pizarra-fase-${paso}.png`;
      a.click();
    });
  };

  // ---------- qué se dibuja ----------
  const posiciones: Record<string, Punto> = {};
  let balonEn: Punto | null = null;
  let lineas: { m: Movimiento; fase: number }[] = [];
  let accionesBalon: { a: AccionBalon; fase: number; desde: Punto; hasta: Punto }[] = [];

  const destinoAccion = (a: AccionBalon, pos: Record<string, Punto>): Punto | null =>
    a.tipo === "tiro" ? (pos[a.de] ? canastaCercana(p.pista, pos[a.de]) : null) : a.a ? pos[a.a] ?? null : null;

  if (anim) {
    const ea = est[anim.fase];
    const fa = p.fases[anim.fase];
    const { mov, bal } = tiempos(fa);
    const maxL = Math.max(0.001, ...fa.movimientos.map((m) => longitud(m.puntos)));
    const recorrido = (Math.min(anim.t, mov) / mov) * maxL; // metros recorridos por todos a la misma velocidad
    for (const el of p.elementos) {
      const m = fa.movimientos.find((x) => x.elementoId === el.id);
      posiciones[el.id] = m ? puntoEn(m.puntos, recorrido / Math.max(0.001, longitud(m.puntos))) : ea.inicio[el.id];
    }
    lineas = fa.movimientos.map((m) => ({ m, fase: anim.fase }));
    if (fa.balon && anim.t > mov) {
      const k = Math.min(1, (anim.t - mov) / Math.max(1, bal));
      const desde = posiciones[fa.balon.de];
      const hasta = destinoAccion(fa.balon, posiciones);
      if (desde && hasta) balonEn = { x: desde.x + (hasta.x - desde.x) * k, y: desde.y + (hasta.y - desde.y) * k };
    } else if (ea.balonInicio && posiciones[ea.balonInicio]) {
      balonEn = posiciones[ea.balonInicio];
    }
  } else if (verTodo) {
    Object.assign(posiciones, p.inicial);
    p.fases.forEach((f, i) => {
      lineas.push(...f.movimientos.map((m) => ({ m, fase: i })));
      if (f.balon) {
        const desde = est[i].fin[f.balon.de];
        const hasta = destinoAccion(f.balon, est[i].fin);
        if (desde && hasta) accionesBalon.push({ a: f.balon, fase: i, desde, hasta });
      }
    });
    if (p.balonInicial && p.inicial[p.balonInicial]) balonEn = p.inicial[p.balonInicial];
  } else if (paso === 0) {
    Object.assign(posiciones, p.inicial);
    if (p.balonInicial && p.inicial[p.balonInicial]) balonEn = p.inicial[p.balonInicial];
  } else if (e && fase) {
    Object.assign(posiciones, e.fin);
    lineas = fase.movimientos.map((m) => ({ m, fase: paso - 1 }));
    if (fase.balon) {
      const desde = e.fin[fase.balon.de];
      const hasta = destinoAccion(fase.balon, e.fin);
      if (desde && hasta) accionesBalon = [{ a: fase.balon, fase: paso - 1, desde, hasta }];
    }
    const portador = fase.balon?.tipo === "tiro" ? null : e.balonFin;
    if (portador && e.fin[portador]) balonEn = e.fin[portador];
  }

  const tipoDe = (id: string) => p.elementos.find((x) => x.id === id)?.tipo;
  const colorLinea = (m: Movimiento) => (tipoDe(m.elementoId) === "defensor" ? "#ca010c" : TINTA);

  const dibujarMovimiento = (m: Movimiento, key: string, opacidad = 1, numero?: number) => {
    const tipoEl = tipoDe(m.elementoId);
    const material = tipoEl ? !esJugador(tipoEl) : false;
    const color = material ? "#6b7686" : colorLinea(m);
    const pts = material ? m.puntos : recortarFinal(m.puntos, R * 1.05);
    const base = { stroke: color, fill: color, strokeWidth: 0.09, lineCap: "round" as const, lineJoin: "round" as const, opacity: opacidad, listening: false };
    const n = m.puntos.length;
    const medio = puntoEn(m.puntos, 0.35);
    return (
      <Group key={key} listening={false}>
        {material ? (
          <Arrow points={pts} {...base} strokeWidth={0.06} dash={[0.12, 0.14]} pointerLength={0.3} pointerWidth={0.26} tension={0.3} />
        ) : m.tipo === "botar" ? (
          <Arrow points={zigzag(pts)} {...base} pointerLength={0.38} pointerWidth={0.34} />
        ) : m.tipo === "bloqueo" ? (
          <>
            <Line points={pts} {...base} tension={0.3} />
            <Line points={barraFinal(pts, 0.42)} {...base} strokeWidth={0.14} />
          </>
        ) : (
          <Arrow points={pts} {...base} pointerLength={0.38} pointerWidth={0.34} tension={0.3} />
        )}
        {numero !== undefined && n >= 4 && (
          <T x={medio.x + 0.18} y={medio.y - 0.55} text={String(numero + 1)} fontSize={0.5} fontStyle="bold" fill={color} />
        )}
      </Group>
    );
  };

  const dibujarAccion = (x: { a: AccionBalon; fase: number; desde: Punto; hasta: Punto }, key: string, opacidad = 1, numero?: number) => {
    const { a, desde, hasta } = x;
    const d = Math.hypot(hasta.x - desde.x, hasta.y - desde.y) || 1;
    const u = { x: (hasta.x - desde.x) / d, y: (hasta.y - desde.y) / d };
    const ini = { x: desde.x + u.x * R * 1.1, y: desde.y + u.y * R * 1.1 };
    const fin = a.tipo === "tiro" ? { x: hasta.x - u.x * 0.3, y: hasta.y - u.y * 0.3 } : { x: hasta.x - u.x * R * 1.15, y: hasta.y - u.y * R * 1.15 };
    const base = { stroke: TINTA, fill: TINTA, strokeWidth: 0.08, lineCap: "round" as const, opacity: opacidad, listening: false };
    const medio = { x: (ini.x + fin.x) / 2, y: (ini.y + fin.y) / 2 };
    return (
      <Group key={key} listening={false}>
        {a.tipo === "pase" && <Arrow points={[ini.x, ini.y, fin.x, fin.y]} {...base} dash={[0.25, 0.18]} pointerLength={0.38} pointerWidth={0.34} />}
        {a.tipo === "mano" && (
          <>
            <Line points={[ini.x, ini.y, fin.x, fin.y]} {...base} />
            {barrasMano(ini, fin).map((b, i) => <Line key={i} points={b} {...base} strokeWidth={0.1} />)}
          </>
        )}
        {a.tipo === "tiro" && (
          <>
            {paralelas(ini, { x: fin.x - u.x * 0.25, y: fin.y - u.y * 0.25 }).map((l, i) => <Line key={i} points={l} {...base} />)}
            <Arrow points={[fin.x - u.x * 0.3, fin.y - u.y * 0.3, fin.x, fin.y]} {...base} pointerLength={0.4} pointerWidth={0.42} />
          </>
        )}
        {numero !== undefined && (
          <T x={medio.x + 0.15} y={medio.y - 0.6} text={String(numero + 1)} fontSize={0.5} fontStyle="bold" fill={TINTA} />
        )}
      </Group>
    );
  };

  const forma = (el: Elemento) => {
    const c = el.color;
    switch (el.tipo) {
      case "atacante":
        return (
          <>
            <Circle radius={R} fill="#ffffff" stroke={c} strokeWidth={0.09} shadowColor="#000" shadowOpacity={0.2} shadowBlur={0.12} shadowOffsetY={0.04} />
            <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={el.etiqueta.length > 1 ? 0.5 : 0.62} fontStyle="bold" fill={c} />
          </>
        );
      case "defensor": {
        const s = R * 0.62;
        const num = el.etiqueta.replace(/^X/i, "");
        return (
          <>
            <Circle radius={R} fill="rgba(255,255,255,0.55)" />
            <Line points={[-s, -s, s, s]} stroke={c} strokeWidth={0.14} lineCap="round" />
            <Line points={[-s, s, s, -s]} stroke={c} strokeWidth={0.14} lineCap="round" />
            {num && <T x={s * 0.95} y={s * 0.05} text={num} fontSize={0.42} fontStyle="bold" fill={c} />}
          </>
        );
      }
      case "entrenador":
        return (
          <>
            <Rect x={-R} y={-R} width={R * 2} height={R * 2} cornerRadius={0.08} fill={c} />
            <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={0.58} fontStyle="bold" fill="#fff" />
          </>
        );
      case "cono":
        return <RegularPolygon sides={3} radius={0.34} fill={c} stroke="#fff" strokeWidth={0.05} />;
      case "chino":
        return (
          <>
            <Circle radius={0.24} fill={c} stroke="rgba(0,0,0,0.25)" strokeWidth={0.03} />
            <Circle radius={0.08} fill="#ffffff" />
          </>
        );
      case "aro":
        return <Circle radius={0.45} stroke={c} strokeWidth={0.11} />;
      case "pica":
        return (
          <>
            <Rect x={-0.07} y={-0.7} width={0.14} height={1.4} cornerRadius={0.05} fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth={0.025} />
            <Circle y={0.7} radius={0.12} fill={TINTA} />
          </>
        );
      case "valla":
        return (
          <>
            <Rect x={-0.55} y={-0.07} width={1.1} height={0.14} fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth={0.025} />
            <Line points={[-0.55, -0.22, -0.55, 0.22]} stroke={TINTA} strokeWidth={0.07} />
            <Line points={[0.55, -0.22, 0.55, 0.22]} stroke={TINTA} strokeWidth={0.07} />
          </>
        );
      case "escalera": {
        const largo = 3, ancho = 0.55;
        const peldaños = Array.from({ length: 7 }, (_, i) => -largo / 2 + (i * largo) / 6);
        return (
          <>
            <Rect x={-ancho / 2} y={-largo / 2} width={ancho} height={largo} fill="rgba(255,255,255,0.01)" />
            <Line points={[-ancho / 2, -largo / 2, -ancho / 2, largo / 2]} stroke={c} strokeWidth={0.07} />
            <Line points={[ancho / 2, -largo / 2, ancho / 2, largo / 2]} stroke={c} strokeWidth={0.07} />
            {peldaños.map((y, i) => <Line key={i} points={[-ancho / 2, y, ancho / 2, y]} stroke={c} strokeWidth={0.06} />)}
          </>
        );
      }
      case "balon":
        return (
          <>
            <Circle radius={0.24} fill={c} stroke="#7a2c00" strokeWidth={0.04} />
            <Line points={[-0.24, 0, 0.24, 0]} stroke="#7a2c00" strokeWidth={0.03} />
            <Line points={[0, -0.24, 0, 0.24]} stroke="#7a2c00" strokeWidth={0.03} />
          </>
        );
      case "texto":
        return <T text={el.etiqueta} fontSize={0.75} fontStyle="bold" fill={c} offsetX={(el.etiqueta.length * 0.75 * K) / 4} offsetY={(0.75 * K) / 2} />;
    }
  };

  const enMovimiento = !!anim;
  const pasoActual = anim ? anim.fase + 1 : verTodo ? -1 : paso;

  return (
    <div
      className={grande ? "fixed inset-0 z-50 flex flex-col gap-2 overflow-auto bg-suave p-2 sm:p-4" : "space-y-2 select-none"}
      style={grande ? { paddingTop: "max(env(safe-area-inset-top), 8px)" } : undefined}
    >
      {/* ===== Grabar / Captura / imágenes ===== */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={alternarGrabar}
          disabled={enMovimiento}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition ${grabando ? "border-rojo bg-rojo text-white" : "border-linea bg-white text-rojo hover:bg-red-50"}`}
          title={grabando ? "Parar de grabar y volver a colocar" : "Grabar movimientos"}
        >
          <span className={`inline-block h-3 w-3 rounded-full ${grabando ? "animate-pulse bg-white" : "bg-rojo"}`} />
          {grabando ? "Parar" : "Grabar"}
        </button>
        {grabando && (
          <button
            type="button"
            onClick={capturar}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-azul bg-azul px-3 text-sm font-semibold text-white hover:bg-azul-oscuro"
            title="Captura: cierra esta imagen y empieza otra limpia"
          >
            <Camera size={16} /> Captura
          </button>
        )}
        <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-tinta/50">Imágenes</span>
        <button
          type="button"
          onClick={() => { setPaso(0); setVerTodo(false); setAnim(null); setModoBalon(null); }}
          className={`h-8 rounded-lg border px-2 text-xs font-semibold ${pasoActual === 0 ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
          title="Posición inicial"
        >
          Inicio
        </button>
        {p.fases.map((f, i) => (
          <button
            key={i} type="button"
            onClick={() => { setPaso(i + 1); setVerTodo(false); setAnim(null); setModoBalon(null); }}
            className={`h-8 w-8 rounded-lg border text-sm font-semibold ${pasoActual === i + 1 ? "border-azul bg-azul text-white" : f.movimientos.length || f.balon ? "border-linea bg-white hover:bg-suave" : "border-dashed border-linea bg-white text-tinta/40"}`}
            title={`Captura ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" onClick={quitarFase} disabled={p.fases.length <= 1} className="h-8 rounded-lg border border-linea bg-white px-2 hover:bg-suave disabled:opacity-40" title="Borrar la última captura"><Minus size={16} /></button>
        <button
          type="button"
          onClick={() => { setVerTodo((v) => !v); setAnim(null); setSel(null); }}
          className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-sm ${verTodo ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
          title="Ver todas las capturas a la vez"
        >
          <Layers size={15} /> <span className="hidden sm:inline">Todas</span>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={deshacer} disabled={!historial.length} className="h-8 rounded-lg border border-linea bg-white px-2 hover:bg-suave disabled:opacity-40" title="Deshacer (Ctrl+Z)"><Undo2 size={16} /></button>
          <button type="button" onClick={descargar} className="h-8 rounded-lg border border-linea bg-white px-2 hover:bg-suave" title="Descargar imagen"><Download size={16} /></button>
          <button type="button" onClick={() => setGrande((g) => !g)} className="h-8 rounded-lg border border-linea bg-white px-2 hover:bg-suave" title={grande ? "Salir de pantalla completa" : "Pantalla completa"}>
            {grande ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button type="button" onClick={reproducir} className="btn-primario h-8 !px-3 !py-0">
            {anim ? <><Square size={15} /> Parar</> : <><Play size={15} /> Animar</>}
          </button>
        </div>
      </div>

      {/* ===== Herramientas según el paso ===== */}
      {!enMovimiento && !verTodo && paso === 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-tinta/50">Jugadores</span>
          <Chip onClick={() => agregar("atacante")}><span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-azul text-[9px] font-bold text-azul">1</span> Atacante</Chip>
          <Chip onClick={() => agregar("defensor")}><span className="text-base font-black leading-none text-rojo">✕</span> Defensor</Chip>
          <Chip onClick={() => agregar("entrenador")}><span className="flex h-4 w-4 items-center justify-center rounded-sm bg-tinta text-[9px] font-bold text-white">E</span> Entrenador</Chip>
          <Chip onClick={() => quinteto(false)} title="5 atacantes en 1-2-2"><Users size={14} /> 5 ataque</Chip>
          <Chip onClick={() => quinteto(true)} title="5 contra 5"><Users size={14} /> 5 vs 5</Chip>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-tinta/50">Material</span>
          {MATERIALES.map((m) => (
            <Chip key={m} onClick={() => agregar(m)}><IconoMaterial tipo={m} /> {NOMBRE[m]}</Chip>
          ))}
          <Chip onClick={() => agregar("texto")}><Type size={14} /> Texto</Chip>
          <select
            value={p.pista}
            onChange={(ev) => { const nueva = ev.target.value as Pizarra["pista"]; cambiar((d) => cambiarPista(d, nueva)); }}
            className="ml-auto h-8 rounded-lg border border-linea bg-white px-2"
            aria-label="Tipo de pista"
          >
            <option value="completa">Pista completa</option>
            <option value="media">Media pista</option>
          </select>
        </div>
      )}

      {!enMovimiento && !verTodo && paso > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-tinta/50">Al arrastrar</span>
          {TRAZOS.map((t) => (
            <Chip key={t.id} activo={trazo === t.id} onClick={() => setTrazo(t.id)} title={t.ayuda}>
              <IconoTrazo tipo={t.id} /> {t.label}
            </Chip>
          ))}
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-tinta/50">Balón</span>
          <Chip activo={modoBalon === "pase"} onClick={() => accionBalon("pase")} title="Pase: línea discontinua"><IconoTrazo tipo="pase" /> Pase</Chip>
          <Chip activo={modoBalon === "mano"} onClick={() => accionBalon("mano")} title="Mano a mano (entrega)"><IconoTrazo tipo="mano" /> Mano a mano</Chip>
          <Chip onClick={() => accionBalon("tiro")} title="Tiro a canasta: doble línea"><IconoTrazo tipo="tiro" /> Tiro</Chip>
          {fase?.balon && (
            <Chip onClick={() => cambiar((d) => { d.fases[paso - 1].balon = null; })} title="Quitar la acción de balón de esta fase">
              <Trash2 size={13} /> Quitar {fase.balon.tipo === "mano" ? "mano a mano" : fase.balon.tipo}
            </Chip>
          )}
        </div>
      )}

      {/* ===== Pista ===== */}
      <div ref={contRef} className="relative w-full">
        <div className="mx-auto overflow-hidden rounded-xl border border-linea shadow-sm" style={{ width: W * escala, touchAction: "none" }}>
          <Stage ref={stageRef} width={W * escala} height={H * escala} onClick={fondoTocado} onTap={fondoTocado}>
            <Layer scaleX={escala} scaleY={escala}>
              <Pista tipo={p.pista} />

              {/* Posición de salida (sombra) de quien se mueve en esta fase */}
              {!anim && !verTodo && paso > 0 && e && fase?.movimientos.map((m) => {
                const ini = e.inicio[m.elementoId];
                const el = p.elementos.find((x) => x.id === m.elementoId);
                if (!ini || !el || !esJugador(el.tipo)) return null;
                return <Circle key={`s-${m.elementoId}`} x={ini.x} y={ini.y} radius={R} fill={el.color} opacity={0.15} listening={false} />;
              })}

              {lineas.map(({ m, fase: fi }, i) => dibujarMovimiento(m, `l-${fi}-${i}`, anim ? 0.35 : 1, verTodo ? fi : undefined))}
              {accionesBalon.map((x, i) => dibujarAccion(x, `b-${i}`, 1, verTodo ? x.fase : undefined))}
              {anim && p.fases[anim.fase].balon && (() => {
                const fa = p.fases[anim.fase];
                const ea = est[anim.fase];
                const desde = ea.fin[fa.balon!.de];
                const hasta = destinoAccion(fa.balon!, ea.fin);
                return desde && hasta ? dibujarAccion({ a: fa.balon!, fase: anim.fase, desde, hasta }, "b-anim", 0.35) : null;
              })()}
              {vivo && (() => {
                const el = p.elementos.find((x) => x.id === vivo.id);
                return el ? dibujarMovimiento({ elementoId: vivo.id, tipo: tipoTrazoPara(el), puntos: vivo.puntos }, "vivo", 0.7) : null;
              })()}

              {/* Material debajo, jugadores encima (así siempre se pueden coger) */}
              {[...p.elementos].sort((a, b) => Number(esJugador(a.tipo)) - Number(esJugador(b.tipo))).map((el) => {
                const pos = posiciones[el.id];
                if (!pos) return null;
                const seleccionado = sel === el.id && !anim && !verTodo;
                return (
                  <Group
                    key={el.id}
                    x={pos.x}
                    y={pos.y}
                    rotation={esJugador(el.tipo) ? 0 : el.rot ?? 0}
                    draggable={!anim && !verTodo}
                    dragBoundFunc={(abs) => ({
                      x: Math.max(0, Math.min(W * escala, abs.x)),
                      y: Math.max(0, Math.min(H * escala, abs.y)),
                    })}
                    onDragStart={() => inicioArrastre(el)}
                    onDragMove={(ev) => durante(el, ev.target)}
                    onDragEnd={(ev) => finArrastre(el, ev.target)}
                    onClick={() => tocar(el)}
                    onTap={() => tocar(el)}
                    onMouseEnter={(ev) => { const s = ev.target.getStage(); if (s && !anim) s.container().style.cursor = "grab"; }}
                    onMouseLeave={(ev) => { const s = ev.target.getStage(); if (s) s.container().style.cursor = "default"; }}
                  >
                    {/* zona táctil generosa */}
                    {el.tipo === "escalera" ? (
                      <Rect x={-0.5} y={-1.7} width={1} height={3.4} fill="rgba(0,0,0,0.001)" />
                    ) : el.tipo === "valla" || el.tipo === "pica" ? (
                      <Rect x={el.tipo === "valla" ? -0.75 : -0.35} y={el.tipo === "valla" ? -0.35 : -0.9} width={el.tipo === "valla" ? 1.5 : 0.7} height={el.tipo === "valla" ? 0.7 : 1.8} fill="rgba(0,0,0,0.001)" />
                    ) : (
                      <Circle radius={esJugador(el.tipo) ? toque : Math.min(toque, 0.6)} fill="rgba(0,0,0,0.001)" />
                    )}
                    {seleccionado && <Circle radius={(el.tipo === "escalera" ? 1.7 : R * 1.45)} stroke="#fde302" strokeWidth={0.1} dash={[0.2, 0.12]} listening={false} />}
                    {modoBalon && el.tipo === "atacante" && e?.balonInicio !== el.id && (
                      <Circle radius={R * 1.35} stroke="#fc6401" strokeWidth={0.08} dash={[0.15, 0.1]} listening={false} />
                    )}
                    {forma(el)}
                  </Group>
                );
              })}

              {balonEn && (
                <Circle x={balonEn.x + R * 0.85} y={balonEn.y - R * 0.85} radius={0.21} fill="#fc6401" stroke="#7a2c00" strokeWidth={0.045} listening={false} />
              )}
            </Layer>
          </Stage>
        </div>
        {aviso && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full bg-tinta/90 px-3 py-1.5 text-xs text-white shadow">{aviso}</span>
          </div>
        )}
      </div>

      {/* ===== Elemento seleccionado ===== */}
      {elSel && !enMovimiento && !verTodo && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-oro bg-oro/10 px-2 py-1.5 text-sm">
          <span className="font-semibold text-azul">{NOMBRE[elSel.tipo]} {elSel.tipo !== "texto" ? elSel.etiqueta : ""}</span>
          {(esJugador(elSel.tipo) || elSel.tipo === "texto") && (
            <Chip onClick={() => {
              const t = window.prompt(elSel.tipo === "texto" ? "Texto:" : "Etiqueta (número o nombre corto):", elSel.etiqueta);
              if (t !== null && t.trim()) editarElemento(elSel.id, { etiqueta: t.trim().slice(0, elSel.tipo === "texto" ? 40 : 3) });
            }}>Etiqueta</Chip>
          )}
          <div className="flex items-center gap-1">
            {PALETA.map((c) => (
              <button
                key={c} type="button" aria-label={`Color ${c}`} onClick={() => editarElemento(elSel.id, { color: c })}
                className={`h-6 w-6 rounded-full border ${elSel.color === c ? "ring-2 ring-azul ring-offset-1" : "border-black/20"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {!esJugador(elSel.tipo) && (
            <>
              <Chip onClick={() => editarElemento(elSel.id, { rot: (((elSel.rot ?? 0) - 45) + 360) % 360 })} title="Girar (Mayús+R)"><RotateCcw size={14} /></Chip>
              <Chip onClick={() => editarElemento(elSel.id, { rot: ((elSel.rot ?? 0) + 45) % 360 })} title="Girar (R)"><RotateCw size={14} /></Chip>
            </>
          )}
          {paso === 0 && elSel.tipo === "atacante" && (
            <Chip activo={p.balonInicial === elSel.id} onClick={() => cambiar((d) => { d.balonInicial = d.balonInicial === elSel.id ? null : elSel.id; })}>
              <span className="inline-block h-3 w-3 rounded-full bg-naranja" /> Con balón
            </Chip>
          )}
          {paso > 0 && fase?.movimientos.some((m) => m.elementoId === elSel.id) && esJugador(elSel.tipo) && (
            <>
              <span className="text-[11px] uppercase text-tinta/50">Su línea:</span>
              {(["correr", "botar", "bloqueo"] as TipoTrazo[]).map((t) => (
                <Chip
                  key={t}
                  activo={fase.movimientos.find((m) => m.elementoId === elSel.id)?.tipo === t}
                  onClick={() => cambiar((d) => { const m = d.fases[paso - 1].movimientos.find((x) => x.elementoId === elSel.id); if (m) m.tipo = t; })}
                >
                  <IconoTrazo tipo={t} />
                </Chip>
              ))}
            </>
          )}
          <button type="button" onClick={borrarSeleccion} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-red-700 hover:bg-red-50">
            <Trash2 size={14} />
            {paso > 0 && fase && (fase.movimientos.some((m) => m.elementoId === elSel.id) || fase.balon?.de === elSel.id || fase.balon?.a === elSel.id)
              ? "Borrar su movimiento"
              : "Quitar"}
          </button>
        </div>
      )}

      {/* ===== Nota y ayuda ===== */}
      {paso > 0 && !verTodo && fase && (
        <input
          value={fase.nota ?? ""}
          onChange={(ev) => { const v = ev.target.value; setP((prev) => { const d = structuredClone(prev); d.fases[paso - 1].nota = v; return d; }); }}
          placeholder={`Nota de la imagen ${paso} (opcional)`}
          className="campo"
          disabled={!!anim}
        />
      )}
      {anim && p.fases[anim.fase]?.nota && <p className="rounded-lg bg-oro/15 p-2 text-sm">{p.fases[anim.fase].nota}</p>}
      <p className="text-xs text-tinta/55">
        {anim
          ? `Animando imagen ${anim.fase + 1} de ${p.fases.length}…`
          : verTodo
            ? "Todas las fases a la vez. Así queda la imagen del ejercicio."
            : paso === 0
              ? "COLOCAR: añade jugadores y material y arrástralos a su sitio. Toca uno para cambiar color, etiqueta, girarlo o darle el balón. Luego pulsa ● Grabar."
              : `GRABANDO · imagen ${paso}: arrastra a los jugadores y cada recorrido se queda grabado. Usa Pase, Mano a mano o Tiro para el balón. Pulsa 📷 Captura para cerrar esta imagen y empezar otra limpia.`}
        {!anim && " · Teclado: Supr borra, R gira, Espacio anima, Ctrl+Z deshace."}
      </p>
    </div>
  );
}

// ---------- piezas de la barra ----------

function Chip({ children, onClick, activo, title }: { children: React.ReactNode; onClick: () => void; activo?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 transition ${activo ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
    >
      {children}
    </button>
  );
}

function IconoTrazo({ tipo }: { tipo: "auto" | TipoTrazo | "pase" | "mano" | "tiro" }) {
  const c = "currentColor";
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden className="shrink-0">
      {tipo === "auto" && <text x="2" y="10" fontSize="10" fontWeight="700" fill={c}>A</text>}
      {tipo === "correr" && <><line x1="1" y1="6" x2="20" y2="6" stroke={c} strokeWidth="1.8" /><path d="M19 2 L25 6 L19 10 Z" fill={c} /></>}
      {tipo === "botar" && <><path d="M1 6 L4 2 L7 10 L10 2 L13 10 L16 2 L19 6" fill="none" stroke={c} strokeWidth="1.6" /><path d="M19 2 L25 6 L19 10 Z" fill={c} /></>}
      {tipo === "bloqueo" && <><line x1="1" y1="6" x2="22" y2="6" stroke={c} strokeWidth="1.8" /><line x1="22" y1="1" x2="22" y2="11" stroke={c} strokeWidth="2.4" /></>}
      {tipo === "pase" && <><line x1="1" y1="6" x2="20" y2="6" stroke={c} strokeWidth="1.8" strokeDasharray="3 2.5" /><path d="M19 2 L25 6 L19 10 Z" fill={c} /></>}
      {tipo === "mano" && <><line x1="1" y1="6" x2="25" y2="6" stroke={c} strokeWidth="1.8" /><line x1="13" y1="1" x2="13" y2="11" stroke={c} strokeWidth="1.8" /><line x1="17" y1="1" x2="17" y2="11" stroke={c} strokeWidth="1.8" /></>}
      {tipo === "tiro" && <><line x1="1" y1="4" x2="19" y2="4" stroke={c} strokeWidth="1.5" /><line x1="1" y1="8" x2="19" y2="8" stroke={c} strokeWidth="1.5" /><path d="M18 1 L25 6 L18 11 Z" fill={c} /></>}
    </svg>
  );
}

function IconoMaterial({ tipo }: { tipo: TipoElemento }) {
  const c = COLOR_DEFECTO[tipo];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      {tipo === "cono" && <path d="M8 2 L14 14 L2 14 Z" fill={c} />}
      {tipo === "chino" && <><circle cx="8" cy="8" r="6" fill={c} stroke="#0003" /><circle cx="8" cy="8" r="2" fill="#fff" /></>}
      {tipo === "aro" && <circle cx="8" cy="8" r="5.5" fill="none" stroke={c} strokeWidth="2" />}
      {tipo === "pica" && <><rect x="7" y="1" width="2" height="12" fill={c} stroke="#0004" strokeWidth="0.5" /><circle cx="8" cy="13.5" r="1.8" fill="#121a33" /></>}
      {tipo === "valla" && <><rect x="1" y="7" width="14" height="2.4" fill={c} /><line x1="1.5" y1="4" x2="1.5" y2="12" stroke="#121a33" strokeWidth="1.4" /><line x1="14.5" y1="4" x2="14.5" y2="12" stroke="#121a33" strokeWidth="1.4" /></>}
      {tipo === "escalera" && <><line x1="4" y1="1" x2="4" y2="15" stroke="#b59a00" strokeWidth="1.5" /><line x1="12" y1="1" x2="12" y2="15" stroke="#b59a00" strokeWidth="1.5" />{[3, 6.5, 10, 13.5].map((y) => <line key={y} x1="4" y1={y} x2="12" y2={y} stroke="#b59a00" strokeWidth="1.2" />)}</>}
      {tipo === "balon" && <><circle cx="8" cy="8" r="6" fill={c} stroke="#7a2c00" /><line x1="2" y1="8" x2="14" y2="8" stroke="#7a2c00" strokeWidth="0.8" /><line x1="8" y1="2" x2="8" y2="14" stroke="#7a2c00" strokeWidth="0.8" /></>}
    </svg>
  );
}
