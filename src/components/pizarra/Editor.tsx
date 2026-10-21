"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Group, Line, Arrow, Circle, Text, Rect, RegularPolygon } from "react-konva";
import {
  Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Camera, Undo2, Trash2, Settings,
  Pencil, MoveRight, Download, RotateCcw, RotateCw, Maximize2, Minimize2, RefreshCw, Layers, X, FileDown, Film, ImageDown,
} from "lucide-react";
import Pista from "./Pista";
import {
  ALTO, AROS, COLOR_DEFECTO, MAX_CAPTURAS, NOMBRE, PALETA, barraFinal, barrasMano, compactar, esJugador,
  enderezar, estados, llevaBalon, longitud, normalizar, nuevoId, paralelas, pizarraVacia, puntoEn, recortarFinal,
  siguienteEtiqueta, simplificar, tramoDeCursor, tramoDeFotograma, zigzag,
  type AccionBalon, type Dibujo, type Elemento, type Estado, type Fotograma, type Movimiento, type Pizarra,
  type Punto, type TipoElemento, type TipoTrazo, type Vista,
} from "./modelo";


// Texto nítido al escalar: se dibuja grande y se reduce
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

const TINTA = "#1f2937";
const esperarPintado = () =>
  new Promise<void>((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => r())), 40));
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: number) => String(n).padStart(2, "0");

type VistaEspecial = null | { tipo: "captura"; seg: number } | { tipo: "todas" };

export interface EditorProps {
  valor?: unknown;
  onChange?: (p: Pizarra) => void;
  registrarCaptura?: (fn: () => Promise<string>) => void;
  altoMax?: number;
  titulo?: string;
}

export default function Editor({ valor, onChange, registrarCaptura, altoMax = 600, titulo = "Pizarra" }: EditorProps) {
  const [p, setP] = useState<Pizarra>(() => normalizar(valor ?? pizarraVacia()));
  const [historial, setHistorial] = useState<{ p: Pizarra; cursor: number }[]>([]);
  const [cursor, setCursor] = useState(0);
  const [grabando, setGrabando] = useState(false);
  const [herramienta, setHerramienta] = useState<"mover" | "flecha" | "lapiz">("mover");
  const [modoBloqueo, setModoBloqueo] = useState(false); // el siguiente arrastre será un bloqueo
  const [modoMano, setModoMano] = useState(false);       // el siguiente pase será un mano a mano
  const [sel, setSel] = useState<string | null>(null);
  const [selDibujo, setSelDibujo] = useState<string | null>(null);
  const [balonSel, setBalonSel] = useState<string | null>(null);
  const [colorActivo, setColorActivo] = useState<string | null>(null);
  const [vivo, setVivo] = useState<{ id: string; puntos: number[] } | null>(null);
  const vivoRef = useRef<{ id: string; puntos: number[] } | null>(null);
  const gestoRef = useRef<{ el: Elemento; ptr: Punto; pos: Punto; lista: boolean; arrastrando: boolean; destino?: Punto } | null>(null);
  const ultimoToque = useRef<{ id: string; t: number } | null>(null);
  const [dibujoVivo, setDibujoVivo] = useState<number[] | null>(null);
  const [arrastre, setArrastre] = useState<{ id: string; x: number; y: number } | null>(null);
  const [anim, setAnim] = useState<{ f: number; t: number } | null>(null);
  const [especial, setEspecial] = useState<VistaEspecial>(null);
  const [grande, setGrande] = useState(false);
  const [panel, setPanel] = useState<null | "config" | "descargar">(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [caja, setCaja] = useState({ ancho: 400, alto: 800 });

  const contRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const rafRef = useRef(0);

  const n = p.fotogramas.length;
  const est = useMemo(() => estados(p), [p]);
  const E: Estado = est[Math.min(cursor, n)];
  // Vista: la completa es la pista horizontal; las medias se ven en vertical y ampliadas
  // (ofensiva: canasta arriba; defensiva: canasta abajo), como en Coach Studio.
  // (u, v) = coordenadas de pantalla en metros; (x, y) = coordenadas de la pista.
  const VD = p.vista === "completa"
    ? { u0: 0, v0: 0, w: 28, h: 15, rotada: false, base: 0 }
    : p.vista === "ofensiva"
      ? { u0: -1.5, v0: -0.8, w: 18, h: 10.6, rotada: true, base: 28 }   // x = 28 - v
      : { u0: -1.5, v0: 4.2, w: 18, h: 10.6, rotada: true, base: 14 };   // x = 14 - v
  const anchoVista = VD.w;
  const altoVista = VD.h;
  const vistaACancha = (u: number, v: number): Punto => (VD.rotada ? { x: VD.base - v, y: u } : { x: u, y: v });
  const giroTexto = VD.rotada ? 90 : 0; // para que números y textos queden derechos
  const altoDisp = grande ? Math.max(220, caja.alto - 200) : altoMax;
  const escala = Math.max(5, Math.min(caja.ancho / anchoVista, altoDisp / altoVista));
  // Radio de la ficha: 0,5 m, pero nunca menos de ~13 px en pantalla (para poder tocar el número)
  const R = Math.max(0.5, 13 / escala) * p.config.tamano;
  const elSel = p.elementos.find((x) => x.id === sel) ?? null;
  const ocupado = !!anim || !!exportando;
  const anchoBarra = Math.max(anchoVista * escala, 320);

  // ---------- medida del contenedor ----------
  useEffect(() => {
    const medir = () => setCaja({ ancho: contRef.current?.clientWidth ?? 400, alto: window.innerHeight });
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

  const cambiar = (fn: (d: Pizarra) => Pizarra | void, nuevoCursor?: number) => {
    setHistorial((h) => [...h.slice(-60), { p, cursor }]);
    const d = structuredClone(p);
    setP((fn(d) as Pizarra | undefined) ?? d);
    if (nuevoCursor !== undefined) setCursor(nuevoCursor);
  };
  const deshacer = () => {
    const ult = historial[historial.length - 1];
    if (!ult) return;
    setHistorial((h) => h.slice(0, -1));
    setP(ult.p);
    setCursor(Math.min(ult.cursor, ult.p.fotogramas.length));
    setEspecial(null);
  };
  const avisar = (m: string) => { setAviso(m); window.setTimeout(() => setAviso((a) => (a === m ? null : a)), 3500); };
  const limpiarSeleccion = () => { setSel(null); setSelDibujo(null); setBalonSel(null); };

  // ---------- añadir elementos ----------
  const posNueva = (tipo: TipoElemento): Punto => {
    const cuantos = p.elementos.filter((e) => esJugador(e.tipo) === esJugador(tipo)).length;
    const cu = VD.u0 + VD.w / 2;
    const q = esJugador(tipo)
      ? vistaACancha(cu - 3.5 + (cuantos % 6) * 1.4, VD.v0 + 1.6 + Math.floor(cuantos / 6) * 1.4)
      : vistaACancha(cu - 4.5 + (cuantos % 8) * 1.3, VD.v0 + VD.h - 1.6 - Math.floor(cuantos / 8) * 1.3);
    return { x: Math.max(0.5, Math.min(27.5, q.x)), y: Math.max(0.5, Math.min(14.5, q.y)) };
  };

  const agregar = (tipo: TipoElemento) => {
    if (ocupado) return;
    let etiqueta = siguienteEtiqueta(p, tipo);
    if (tipo === "texto") {
      const t = window.prompt("Texto a mostrar en la pista:", "");
      if (!t) return;
      etiqueta = t.slice(0, 40);
    }
    const id = nuevoId();
    cambiar((d) => {
      d.elementos.push({ id, tipo, etiqueta, color: colorActivo ?? COLOR_DEFECTO[tipo], rot: esJugador(tipo) ? undefined : 0 });
      d.inicial[id] = posNueva(tipo);
      if (tipo === "balon") d.poseedor[id] = null;
    });
    setSel(id);
    setEspecial(null);
    if (tipo === "balon") avisar("Toca el balón y después un jugador para dárselo.");
  };

  /** Coordenadas locales de media pista (u a lo ancho, v desde el fondo) → pista */
  const local = (u: number, v: number): Punto =>
    p.vista === "defensiva" ? { x: v, y: 15 - u } : { x: 28 - v, y: u };
  const aroVista = p.vista === "defensiva" ? AROS[0] : AROS[1];

  const cinco = (tipo: "atacante" | "defensor") => {
    if (ocupado) return;
    const sitios: [number, number][] = [[7.5, 8.9], [12.6, 6.2], [2.4, 6.2], [10.6, 2.4], [4.4, 2.4]];
    cambiar((d) => {
      const atacantes = d.elementos.filter((e) => e.tipo === "atacante");
      sitios.forEach(([u, v], i) => {
        const id = nuevoId();
        const etiqueta = tipo === "defensor" ? `X${i + 1}` : String(i + 1);
        if (d.elementos.some((e) => e.tipo === tipo && e.etiqueta === etiqueta)) return;
        let pos = local(u, v);
        if (tipo === "defensor") {
          const par = atacantes.find((a) => a.etiqueta === String(i + 1));
          const base = par ? est[cursor].pos[par.id] ?? pos : pos;
          const vx = aroVista.x - base.x, vy = aroVista.y - base.y;
          const L = Math.hypot(vx, vy) || 1;
          pos = { x: base.x + (vx / L) * 1.2, y: base.y + (vy / L) * 1.2 };
        }
        d.elementos.push({ id, tipo, etiqueta, color: colorActivo ?? COLOR_DEFECTO[tipo] });
        d.inicial[id] = pos;
      });
    });
  };

  // ---------- fotogramas ----------
  /** Asegura el fotograma donde se graba (el siguiente al cursor) y lo devuelve */
  const fotogramaGrabacion = (d: Pizarra): Fotograma => {
    if (cursor >= d.fotogramas.length) d.fotogramas.push({ movimientos: [], balon: [] });
    return d.fotogramas[cursor];
  };

  const desplazarRecorridos = (d: Pizarra, id: string, desde: number, dx: number, dy: number) => {
    for (let j = desde; j < d.fotogramas.length; j++) {
      for (const m of d.fotogramas[j].movimientos) {
        if (m.elementoId !== id) continue;
        m.puntos = m.puntos.map((v, i) => v + (i % 2 ? dy : dx));
      }
    }
  };

  // ---------- balón ----------
  const darBalon = (balon: string, jugador: string) => {
    setBalonSel(null);
    if (!grabando) {
      if (cursor > 0 && n > 0) { avisar("Para pasar el balón durante la jugada, pulsa REC."); return; }
      cambiar((d) => { d.poseedor[balon] = d.poseedor[balon] === jugador ? null : jugador; });
      return;
    }
    const tiene = E.poseedor[balon] ?? null;
    if (tiene === jugador) return;
    const accion: AccionBalon = tiene
      ? { balon, tipo: "pase", de: tiene, a: jugador, ...(modoMano ? { mano: true } : {}) }
      : { balon, tipo: "coger", a: jugador };
    if (modoMano) setModoMano(false);
    cambiar((d) => {
      const f = fotogramaGrabacion(d);
      f.balon = [...f.balon.filter((a) => a.balon !== balon), accion];
    }, cursor + 1);
  };

  const tirar = (destino: Punto) => {
    const balon = balonSel;
    setBalonSel(null);
    if (!balon) return;
    if (!grabando) { avisar("Para tirar, pulsa REC."); return; }
    const tiene = E.poseedor[balon];
    if (!tiene) { avisar("Para tirar, el balón tiene que tenerlo un jugador."); return; }
    cambiar((d) => {
      const f = fotogramaGrabacion(d);
      f.balon = [...f.balon.filter((a) => a.balon !== balon), { balon, tipo: "tiro", de: tiene, destino }];
    }, cursor + 1);
  };

  // ---------- toques ----------
  const tocar = (el: Elemento) => {
    if (ocupado || herramienta !== "mover") return;
    setEspecial(null);
    setSelDibujo(null);
    if (el.tipo === "balon") {
      if (balonSel === el.id) { setBalonSel(null); return; }
      setBalonSel(el.id);
      setSel(el.id);
      avisar(grabando ? "Toca al jugador que recibe el pase, o una canasta para tirar." : "Toca al jugador que tendrá el balón.");
      return;
    }
    if (balonSel && esJugador(el.tipo)) { darBalon(balonSel, el.id); return; }
    setSel(el.id);
  };

  const editarEtiqueta = (el: Elemento) => {
    if (!esJugador(el.tipo) && el.tipo !== "texto") return;
    const t = window.prompt(el.tipo === "texto" ? "Texto:" : "Etiqueta (número o nombre corto):", el.etiqueta);
    if (t !== null && t.trim()) cambiar((d) => { const x = d.elementos.find((q) => q.id === el.id); if (x) x.etiqueta = t.trim().slice(0, el.tipo === "texto" ? 40 : 3); });
  };

  // ---------- arrastre ----------
  // IMPORTANTE: no usamos la detección de toques de Konva (lee píxeles del canvas y navegadores
  // como Brave los alteran por privacidad). Calculamos qué se toca con geometría pura.

  const inicioArrastre = (el: Elemento) => {
    if (el.tipo !== "balon") setBalonSel(null);
    if (grabando && !(el.tipo === "balon" && E.poseedor[el.id])) {
      const pos = E.pos[el.id];
      vivoRef.current = pos ? { id: el.id, puntos: [pos.x, pos.y] } : null;
      setVivo(vivoRef.current);
    }
  };

  const durante = (el: Elemento, q: Punto) => {
    setArrastre({ id: el.id, x: q.x, y: q.y });
    const v = vivoRef.current;
    if (!grabando || !v || v.id !== el.id) return;
    const k = v.puntos.length;
    if (Math.hypot(q.x - v.puntos[k - 2], q.y - v.puntos[k - 1]) < 0.12) return;
    v.puntos = [...v.puntos, q.x, q.y];
    setVivo({ id: v.id, puntos: v.puntos });
  };

  const tipoAuto = (el: Elemento): TipoTrazo =>
    modoBloqueo && esJugador(el.tipo) ? "bloqueo" : el.tipo === "atacante" && llevaBalon(E, el.id) ? "botar" : "correr";

  /** Jugador más cercano a un punto (para soltar el balón encima) */
  const jugadorCerca = (q: Punto, excepto?: string | null) => {
    let mejor: string | null = null, dist = Math.max(1.3, R * 2.6);
    for (const el of p.elementos) {
      if (!esJugador(el.tipo) || el.id === excepto) continue;
      const pos = E.pos[el.id];
      if (!pos) continue;
      const d = Math.hypot(pos.x - q.x, pos.y - q.y);
      if (d < dist) { dist = d; mejor = el.id; }
    }
    return mejor;
  };

  const finArrastre = (el: Elemento, destino: Punto) => {
    setArrastre(null);
    // Balón soltado encima de un jugador: se lo da (o es un pase, si se está grabando)
    if (el.tipo === "balon") {
      const tiene = E.poseedor[el.id] ?? null;
      const receptor = jugadorCerca(destino, tiene);
      if (receptor) { vivoRef.current = null; setVivo(null); darBalon(el.id, receptor); return; }
      if (tiene) { avisar("Suelta el balón encima de un jugador para dárselo."); return; }
    }
    const actual = E.pos[el.id];
    if (!grabando) {
      // Sin grabar: recoloca el elemento (y desplaza sus recorridos con él)
      if (!actual) return;
      const dx = destino.x - actual.x, dy = destino.y - actual.y;
      cambiar((d) => {
        d.inicial[el.id] = { x: d.inicial[el.id].x + dx, y: d.inicial[el.id].y + dy };
        desplazarRecorridos(d, el.id, 0, dx, dy);
      });
      return;
    }
    const v = vivoRef.current;
    vivoRef.current = null;
    setVivo(null);
    const origen = v && v.id === el.id ? v.puntos : actual ? [actual.x, actual.y] : [];
    const crudo = simplificar([...origen, destino.x, destino.y], 0.15);
    if (crudo.length < 4 || longitud(crudo) < 0.4) return;
    const puntos = enderezar(crudo); // recta perfecta, esquina nítida o curva suave
    const tipo = tipoAuto(el);
    if (modoBloqueo) setModoBloqueo(false);
    const finAntes = est[Math.min(cursor + 1, n)]?.pos[el.id] ?? actual;
    cambiar((d) => {
      const f = fotogramaGrabacion(d);
      f.movimientos = [...f.movimientos.filter((m) => m.elementoId !== el.id), { elementoId: el.id, tipo, puntos }];
      if (cursor + 1 < d.fotogramas.length && finAntes) {
        desplazarRecorridos(d, el.id, cursor + 1, destino.x - finAntes.x, destino.y - finAntes.y);
      }
    }, cursor + 1);
  };

  // ---------- dibujo libre (flecha y lápiz) ----------
  const seguirDibujo = (q: Punto) => {
    if (!dibujoVivo) return;
    const k = dibujoVivo.length;
    if (Math.hypot(q.x - dibujoVivo[k - 2], q.y - dibujoVivo[k - 1]) < 0.1) return;
    setDibujoVivo(herramienta === "flecha" ? [dibujoVivo[0], dibujoVivo[1], q.x, q.y] : [...dibujoVivo, q.x, q.y]);
  };
  const acabarDibujo = () => {
    if (!dibujoVivo) return;
    const pts = herramienta === "lapiz" ? simplificar(dibujoVivo, 0.12) : dibujoVivo;
    setDibujoVivo(null);
    if (pts.length < 4 || longitud(pts) < 0.4) return;
    const dib: Dibujo = { id: nuevoId(), tipo: herramienta === "flecha" ? "flecha" : "lapiz", puntos: pts, color: colorActivo ?? TINTA, seg: tramoDeCursor(p, cursor) };
    cambiar((d) => { d.dibujos.push(dib); });
  };

  // ---------- borrar ----------
  const quitarElemento = (id: string) =>
    cambiar((d) => {
      d.elementos = d.elementos.filter((x) => x.id !== id);
      delete d.inicial[id];
      delete d.poseedor[id];
      for (const k of Object.keys(d.poseedor)) if (d.poseedor[k] === id) d.poseedor[k] = null;
      d.fotogramas.forEach((f) => {
        f.movimientos = f.movimientos.filter((m) => m.elementoId !== id);
        f.balon = f.balon.filter((a) => a.balon !== id && a.de !== id && a.a !== id);
      });
      const c = compactar(d);
      setCursor((k) => Math.min(k, c.fotogramas.length));
      return c;
    });

  const ultimoFot = cursor > 0 ? p.fotogramas[cursor - 1] : null;
  const movSel = elSel && ultimoFot ? ultimoFot.movimientos.find((m) => m.elementoId === elSel.id) : undefined;
  const balonSelAccion = elSel && ultimoFot ? ultimoFot.balon.find((a) => a.balon === elSel.id || a.de === elSel.id || a.a === elSel.id) : undefined;

  const borrarSeleccion = () => {
    if (selDibujo) { cambiar((d) => { d.dibujos = d.dibujos.filter((x) => x.id !== selDibujo); }); setSelDibujo(null); return; }
    if (!elSel) return;
    if (movSel || balonSelAccion) {
      cambiar((d) => {
        const f = d.fotogramas[cursor - 1];
        f.movimientos = f.movimientos.filter((m) => m.elementoId !== elSel.id);
        f.balon = f.balon.filter((a) => a.balon !== elSel.id && a.de !== elSel.id && a.a !== elSel.id);
        const c = compactar(d);
        if (c.fotogramas.length < d.fotogramas.length) setCursor((k) => Math.max(0, k - 1));
        return c;
      });
      return;
    }
    if (window.confirm(`¿Quitar ${NOMBRE[elSel.tipo].toLowerCase()} ${elSel.etiqueta} de la pizarra?`)) {
      quitarElemento(elSel.id);
      setSel(null);
    }
  };

  const borrarGrabacion = () => {
    if (!n && !p.dibujos.length) return;
    if (!window.confirm("¿Borrar toda la grabación (movimientos, pases, capturas y dibujos)? Los jugadores se quedan en su posición inicial.")) return;
    cambiar((d) => { d.fotogramas = []; d.capturas = []; d.dibujos = []; }, 0);
    setEspecial(null);
  };
  const reiniciar = () => {
    if (!p.elementos.length && !n) return;
    if (!window.confirm("¿Empezar una pizarra nueva? Se borrará todo.")) return;
    cambiar(() => ({ ...pizarraVacia(), vista: p.vista, config: p.config }), 0);
    setGrabando(false); setEspecial(null); limpiarSeleccion();
  };

  // ---------- capturas ----------
  const capturar = () => {
    if (!grabando) { avisar("Pulsa REC para grabar y capturar."); return; }
    const ultimaCaptura = Math.max(0, ...p.capturas.filter((b) => b <= cursor));
    if (cursor === 0 || cursor <= ultimaCaptura) { avisar("Haz algún movimiento antes de capturar."); return; }
    if (p.capturas.length >= MAX_CAPTURAS) { avisar(`Máximo ${MAX_CAPTURAS} capturas.`); return; }
    cambiar((d) => { d.capturas = [...new Set([...d.capturas, cursor])].sort((a, b) => a - b); });
    avisar(`📷 Captura ${p.capturas.length + 1} hecha. Las líneas se limpian; sigue grabando.`);
  };

  /** Imágenes (tramos entre capturas) con contenido */
  const segmentos = useMemo(() => {
    const cortes = [...p.capturas].sort((a, b) => a - b);
    const lista: { seg: number; inicio: number; fin: number }[] = [];
    let ini = 0;
    cortes.forEach((c, i) => { lista.push({ seg: i, inicio: ini, fin: c }); ini = c; });
    lista.push({ seg: cortes.length, inicio: ini, fin: p.fotogramas.length });
    return lista.filter((s) => s.fin > s.inicio || p.dibujos.some((d) => d.seg === s.seg));
  }, [p]);

  // ---------- reproducción ----------
  const VEL = 4.2 * p.config.velocidad;
  const tiempos = (f: Fotograma) => {
    const maxL = Math.max(0, ...f.movimientos.map((m) => longitud(m.puntos)));
    const mov = f.movimientos.length ? Math.max(450, (maxL / VEL) * 1000) : 0;
    const bal = f.balon.length ? 650 / p.config.velocidad : 0;
    return { mov, bal, total: mov + bal + 250 / p.config.velocidad };
  };

  const reproducir = (desde?: number) =>
    new Promise<void>((resolve) => {
      if (!n) { avisar("Todavía no hay nada grabado."); resolve(); return; }
      setEspecial(null); limpiarSeleccion();
      let f = desde ?? (cursor >= n ? 0 : cursor);
      setCursor(f);
      let t0 = performance.now();
      const paso = (ahora: number) => {
        if (ahora - t0 >= tiempos(p.fotogramas[f]).total) {
          f++;
          setCursor(f);
          if (f >= n) { setAnim(null); resolve(); return; }
          t0 = ahora;
        }
        setAnim({ f, t: ahora - t0 });
        rafRef.current = requestAnimationFrame(paso);
      };
      rafRef.current = requestAnimationFrame(paso);
    });
  const parar = () => { cancelAnimationFrame(rafRef.current); setAnim(null); };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const irA = (k: number) => { if (ocupado) return; setEspecial(null); setCursor(Math.max(0, Math.min(n, k))); limpiarSeleccion(); };

  // ---------- exportar ----------
  const imagenActual = (calidad = 2) =>
    stageRef.current?.toDataURL({ pixelRatio: calidad, mimeType: "image/jpeg", quality: 0.92 }) ?? "";

  const descargarPNG = async () => {
    setPanel(null); limpiarSeleccion();
    await esperarPintado();
    const url = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${titulo}.png`; a.click();
  };

  const descargarPDF = async () => {
    setPanel(null);
    if (!segmentos.length) { avisar("No hay capturas que exportar."); return; }
    setExportando("Preparando PDF…");
    limpiarSeleccion();
    const imgs: string[] = [];
    for (const s of segmentos) {
      setEspecial({ tipo: "captura", seg: s.seg });
      await esperarPintado();
      imgs.push(imagenActual(2));
    }
    setEspecial(null);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297, H = 210, m = 12;
      const ratio = anchoVista / altoVista;
      let w = W - m * 2, h = w / ratio;
      if (h > H - m * 2 - 10) { h = H - m * 2 - 10; w = h * ratio; }
      imgs.forEach((src, i) => {
        if (i) doc.addPage();
        doc.setFontSize(13);
        doc.text(`${titulo} · Imagen ${i + 1} de ${imgs.length}`, m, m);
        doc.addImage(src, "JPEG", (W - w) / 2, m + 6, w, h);
      });
      doc.save(`${titulo}.pdf`);
    } catch {
      avisar("No se ha podido generar el PDF.");
    }
    setExportando(null);
  };

  const descargarVideo = async () => {
    setPanel(null);
    if (!n) { avisar("Graba algún movimiento antes de exportar el vídeo."); return; }
    const canvas = layerRef.current?.getNativeCanvasElement() as (HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }) | undefined;
    if (!canvas?.captureStream || typeof MediaRecorder === "undefined") {
      avisar("Este navegador no permite grabar vídeo. Prueba con Chrome.");
      return;
    }
    const tipos = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const mime = tipos.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(canvas.captureStream(30), mime ? { mimeType: mime } : undefined);
    const trozos: Blob[] = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) trozos.push(ev.data); };
    const terminado = new Promise<void>((r) => { rec.onstop = () => r(); });
    setExportando("Grabando vídeo…");
    setCursor(0);
    await esperarPintado();
    rec.start();
    await dormir(500);
    await reproducir(0);
    await dormir(800);
    rec.stop();
    await terminado;
    const blob = new Blob(trozos, { type: mime || "video/webm" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${titulo}.${mime.startsWith("video/mp4") ? "mp4" : "webm"}`;
    a.click();
    setExportando(null);
  };

  // miniatura del ejercicio: todas las imágenes superpuestas
  useEffect(() => {
    registrarCaptura?.(async () => {
      setEspecial({ tipo: "todas" }); setSel(null); setSelDibujo(null); setBalonSel(null);
      await esperarPintado();
      const url = stageRef.current?.toDataURL({ pixelRatio: Math.min(2, 900 / Math.max(1, anchoVista * escala)), mimeType: "image/jpeg", quality: 0.85 }) ?? "";
      setEspecial(null);
      return url;
    });
  }, [registrarCaptura, escala, anchoVista]);

  // ---------- teclado ----------
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); deshacer(); return; }
      if (ev.key === "Escape") { limpiarSeleccion(); setHerramienta("mover"); return; }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); irA(cursor - 1); return; }
      if (ev.key === "ArrowRight") { ev.preventDefault(); irA(cursor + 1); return; }
      if (ev.key === "Home") { irA(0); return; }
      if (ev.key === "End") { irA(n); return; }
      if (ev.key === " ") { ev.preventDefault(); if (anim) parar(); else void reproducir(); return; }
      if (ev.key.toLowerCase() === "c" && !ev.ctrlKey && !ev.metaKey) { capturar(); return; }
      if ((ev.key === "Delete" || ev.key === "Backspace") && (sel || selDibujo)) { ev.preventDefault(); borrarSeleccion(); return; }
      if (ev.key.toLowerCase() === "r" && elSel && !esJugador(elSel.tipo)) {
        const nuevo = (((elSel.rot ?? 0) + (ev.shiftKey ? -45 : 45)) % 360 + 360) % 360;
        cambiar((d) => { const x = d.elementos.find((q) => q.id === elSel.id); if (x) x.rot = nuevo; });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // =====================================================================
  // Escena a dibujar
  // =====================================================================
  let posiciones: Record<string, Punto> = {};
  let poseedores: Record<string, string | null> = {};
  const balonEnVuelo: Record<string, Punto> = {};
  type Linea = { m: Movimiento; f: number; op: number; num?: number };
  type AccLinea = { a: AccionBalon; f: number; op: number; num?: number };
  const lineas: Linea[] = [];
  const acciones: AccLinea[] = [];
  let dibujosVisibles: Dibujo[] = [];

  const lineasDe = (desde: number, hasta: number, op = 1, numerar?: (f: number) => number) => {
    for (let f = desde; f < hasta; f++) {
      const fot = p.fotogramas[f];
      if (!fot) continue;
      fot.movimientos.forEach((m) => lineas.push({ m, f, op, num: numerar?.(f) }));
      fot.balon.forEach((a) => acciones.push({ a, f, op, num: numerar?.(f) }));
    }
  };

  if (anim && p.fotogramas[anim.f]) {
    const f = anim.f;
    const fot = p.fotogramas[f];
    const S0 = est[f];
    const { mov, bal } = tiempos(fot);
    const maxL = Math.max(0.001, ...fot.movimientos.map((m) => longitud(m.puntos)));
    const recorrido = mov ? (Math.min(anim.t, mov) / mov) * maxL : 0;
    posiciones = { ...S0.pos };
    for (const m of fot.movimientos) posiciones[m.elementoId] = puntoEn(m.puntos, recorrido / Math.max(0.001, longitud(m.puntos)));
    poseedores = { ...S0.poseedor };
    for (const a of fot.balon) {
      if (anim.t <= mov) continue;
      const k = Math.min(1, (anim.t - mov) / Math.max(1, bal));
      const desde = a.de ? posiciones[a.de] : S0.pos[a.balon];
      const hasta = a.tipo === "tiro" ? a.destino : a.a ? posiciones[a.a] : undefined;
      if (desde && hasta) {
        poseedores[a.balon] = null;
        balonEnVuelo[a.balon] = { x: desde.x + (hasta.x - desde.x) * k, y: desde.y + (hasta.y - desde.y) * k };
      }
    }
    const inicioSeg = Math.max(0, ...p.capturas.filter((b) => b < f + 1));
    lineasDe(inicioSeg, f, 1);
    lineasDe(f, f + 1, 0.35);
    dibujosVisibles = p.dibujos.filter((d) => d.seg === tramoDeFotograma(p, f + 1));
  } else if (especial?.tipo === "captura") {
    const s = segmentos.find((x) => x.seg === especial.seg) ?? { seg: 0, inicio: 0, fin: 0 };
    posiciones = { ...est[s.inicio].pos };
    poseedores = { ...est[s.inicio].poseedor };
    lineasDe(s.inicio, s.fin);
    dibujosVisibles = p.dibujos.filter((d) => d.seg === s.seg);
  } else if (especial?.tipo === "todas") {
    posiciones = { ...est[0].pos };
    poseedores = { ...est[0].poseedor };
    lineasDe(0, n, 1, p.capturas.length ? (f) => tramoDeFotograma(p, f + 1) + 1 : undefined);
    dibujosVisibles = p.dibujos;
  } else {
    posiciones = { ...E.pos };
    poseedores = { ...E.poseedor };
    const inicioSeg = Math.max(0, ...p.capturas.filter((b) => b <= cursor));
    lineasDe(inicioSeg, cursor);
    dibujosVisibles = p.dibujos.filter((d) => d.seg === tramoDeCursor(p, cursor));
  }

  const elemento = (id?: string) => p.elementos.find((x) => x.id === id);

  // ---------- pintar líneas ----------
  const pintarMovimiento = (m: Movimiento, key: string, op: number, num?: number) => {
    const el = elemento(m.elementoId);
    if (!el) return null;
    const material = !esJugador(el.tipo);
    const color = material ? "#6b7280" : el.tipo === "defensor" ? "#ca010c" : TINTA;
    const pts = material ? m.puntos : recortarFinal(m.puntos, R * 1.05);
    const base = { stroke: color, fill: color, strokeWidth: 0.09, lineCap: "round" as const, lineJoin: "round" as const, opacity: op, listening: false };
    const medio = puntoEn(m.puntos, 0.35);
    return (
      <Group key={key} listening={false}>
        {material ? (
          <Arrow points={pts} {...base} strokeWidth={0.06} dash={[0.12, 0.14]} pointerLength={0.3} pointerWidth={0.26} />
        ) : m.tipo === "botar" ? (
          <Arrow points={zigzag(pts)} {...base} pointerLength={0.38} pointerWidth={0.34} />
        ) : m.tipo === "bloqueo" ? (
          <>
            <Line points={pts} {...base} />
            <Line points={barraFinal(pts, 0.42)} {...base} strokeWidth={0.14} />
          </>
        ) : (
          <Arrow points={pts} {...base} pointerLength={0.38} pointerWidth={0.34} />
        )}
        {num !== undefined && <T x={medio.x + 0.18} y={medio.y - 0.55} rotation={giroTexto} text={String(num)} fontSize={0.5} fontStyle="bold" fill={color} />}
      </Group>
    );
  };

  const pintarAccion = (x: AccLinea, key: string) => {
    const { a, f, op, num } = x;
    if (a.tipo === "coger") return null;
    const S = est[f + 1];
    const desde = a.de ? S.pos[a.de] : undefined;
    const hasta = a.tipo === "tiro" ? a.destino : a.a ? S.pos[a.a] : undefined;
    if (!desde || !hasta) return null;
    const d = Math.hypot(hasta.x - desde.x, hasta.y - desde.y) || 1;
    const u = { x: (hasta.x - desde.x) / d, y: (hasta.y - desde.y) / d };
    const ini = { x: desde.x + u.x * R * 1.1, y: desde.y + u.y * R * 1.1 };
    const fin = a.tipo === "tiro" ? { x: hasta.x - u.x * 0.3, y: hasta.y - u.y * 0.3 } : { x: hasta.x - u.x * R * 1.15, y: hasta.y - u.y * R * 1.15 };
    const base = { stroke: TINTA, fill: TINTA, strokeWidth: 0.08, lineCap: "round" as const, opacity: op, listening: false };
    const mano = a.tipo === "pase" && (a.mano || d < 1.9); // botón mano a mano, o pase muy corto
    const medio = { x: (ini.x + fin.x) / 2, y: (ini.y + fin.y) / 2 };
    return (
      <Group key={key} listening={false}>
        {a.tipo === "pase" && !mano && <Arrow points={[ini.x, ini.y, fin.x, fin.y]} {...base} dash={[0.25, 0.18]} pointerLength={0.38} pointerWidth={0.34} />}
        {mano && (
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
        {num !== undefined && <T x={medio.x + 0.15} y={medio.y - 0.6} rotation={giroTexto} text={String(num)} fontSize={0.5} fontStyle="bold" fill={TINTA} />}
      </Group>
    );
  };

  const pintarDibujo = (d: Dibujo, key: string) => {
    const seleccionado = selDibujo === d.id;
    const comun = {
      stroke: d.color, fill: d.color, strokeWidth: 0.08, lineCap: "round" as const, lineJoin: "round" as const,
      listening: false,
      shadowColor: "#eab308", shadowBlur: seleccionado ? 0.3 : 0, shadowOpacity: seleccionado ? 1 : 0,
    };
    return d.tipo === "flecha"
      ? <Arrow key={key} points={d.puntos} {...comun} pointerLength={0.38} pointerWidth={0.34} />
      : <Line key={key} points={d.puntos} {...comun} tension={0.4} />;
  };

  // ---------- formas ----------
  const forma = (el: Elemento) => {
    const c = el.color;
    switch (el.tipo) {
      case "atacante":
        return (
          <>
            <Circle radius={R} fill="#ffffff" stroke={c} strokeWidth={0.09} shadowColor="#000" shadowOpacity={0.2} shadowBlur={0.12} shadowOffsetY={0.04} />
            <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={(el.etiqueta.length > 1 ? 0.5 : 0.62) * p.config.tamano} fontStyle="bold" fill={c === "#ffffff" ? TINTA : c} />
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
            {num && <T x={s * 0.95} y={s * 0.05} text={num} fontSize={0.42 * p.config.tamano} fontStyle="bold" fill={c} />}
          </>
        );
      }
      case "entrenador":
        return (
          <>
            <Rect x={-R} y={-R} width={R * 2} height={R * 2} cornerRadius={0.08} fill={c} />
            <T x={-R} y={-R} width={R * 2} height={R * 2} text={el.etiqueta} align="center" verticalAlign="middle" fontSize={0.58 * p.config.tamano} fontStyle="bold" fill="#fff" />
          </>
        );
      case "balon":
        return (
          <>
            <Circle radius={0.23} fill={c} stroke="#7a2c00" strokeWidth={0.045} />
            <Line points={[-0.23, 0, 0.23, 0]} stroke="#7a2c00" strokeWidth={0.03} />
            <Line points={[0, -0.23, 0, 0.23]} stroke="#7a2c00" strokeWidth={0.03} />
          </>
        );
      case "canasta":
        return (
          <>
            <Rect x={-1.2} y={-0.25} width={0.7} height={0.5} fill="#6b7280" />
            <Line points={[-0.45, -0.9, -0.45, 0.9]} stroke={c} strokeWidth={0.12} />
            <Circle radius={0.23} stroke="#fc6401" strokeWidth={0.08} />
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
        const peldanos = Array.from({ length: 7 }, (_, i) => -largo / 2 + (i * largo) / 6);
        return (
          <>
            <Line points={[-ancho / 2, -largo / 2, -ancho / 2, largo / 2]} stroke={c} strokeWidth={0.07} />
            <Line points={[ancho / 2, -largo / 2, ancho / 2, largo / 2]} stroke={c} strokeWidth={0.07} />
            {peldanos.map((y, i) => <Line key={i} points={[-ancho / 2, y, ancho / 2, y]} stroke={c} strokeWidth={0.06} />)}
          </>
        );
      }
      case "texto":
        return <T text={el.etiqueta} fontSize={0.75} fontStyle="bold" fill={c} offsetX={(el.etiqueta.length * 0.75 * K) / 4} offsetY={(0.75 * K) / 2} />;
    }
  };

  // orden de pintado: material, jugadores y, encima de todo, los balones
  const orden = (el: Elemento) => (el.tipo === "balon" ? 2 : esJugador(el.tipo) ? 1 : 0);
  const elementosOrdenados = [...p.elementos].sort((a, b) => orden(a) - orden(b));

  const posBalon = (id: string): Punto | undefined => {
    if (balonEnVuelo[id]) return balonEnVuelo[id];
    if (arrastre?.id === id) return { x: arrastre.x, y: arrastre.y };
    const j = poseedores[id];
    if (j && arrastre?.id === j) return { x: arrastre.x + R * 0.8, y: arrastre.y - R * 0.8 };
    if (j && posiciones[j]) return { x: posiciones[j].x + R * 0.8, y: posiciones[j].y - R * 0.8 };
    return posiciones[id];
  };

  const canastasObjetivo: Punto[] = [
    ...AROS,
    ...(p.elementos.filter((e) => e.tipo === "canasta").map((e) => E.pos[e.id]).filter(Boolean) as Punto[]),
  ];

  /** Rotación con la que se dibuja: jugadores y texto siempre derechos */
  const rotVisual = (el: Elemento) =>
    esJugador(el.tipo) || el.tipo === "balon" ? giroTexto : el.tipo === "texto" ? (el.rot ?? 0) + giroTexto : el.rot ?? 0;

  const posMostrada = (el: Elemento): Punto | undefined =>
    el.tipo === "balon" ? posBalon(el.id) : arrastre?.id === el.id ? { x: arrastre.x, y: arrastre.y } : posiciones[el.id];

  /** ¿Qué hay en el punto q? (geometría pura, sin leer píxeles) */
  type Objetivo = { tipo: "elemento"; el: Elemento } | { tipo: "dibujo"; id: string } | { tipo: "canasta"; c: Punto } | null;
  const buscar = (q: Punto): Objetivo => {
    const minimo = 11 / escala; // al menos ~11 px de margen para el dedo
    if (balonSel && grabando) {
      const c = canastasObjetivo.find((h) => Math.hypot(h.x - q.x, h.y - q.y) < Math.max(0.9, minimo));
      if (c) return { tipo: "canasta", c };
    }
    // De arriba abajo: balones, jugadores, material
    for (const el of [...elementosOrdenados].reverse()) {
      const pos = posMostrada(el);
      if (!pos) continue;
      const dx = q.x - pos.x, dy = q.y - pos.y;
      const a = (-rotVisual(el) * Math.PI) / 180;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      const dentro = (() => {
        switch (el.tipo) {
          case "atacante": case "defensor": case "entrenador": return Math.hypot(dx, dy) <= Math.max(R * 1.15, minimo);
          case "balon": return Math.hypot(dx, dy) <= Math.max(0.3, minimo);
          case "escalera": return Math.abs(lx) <= 0.45 && Math.abs(ly) <= 1.6;
          case "valla": return Math.abs(lx) <= 0.65 && Math.abs(ly) <= Math.max(0.3, minimo);
          case "pica": return Math.abs(lx) <= Math.max(0.3, minimo) && Math.abs(ly) <= 0.8;
          case "canasta": return lx >= -1.25 && lx <= 0.3 && Math.abs(ly) <= 0.95;
          case "texto": return Math.abs(lx) <= Math.max(0.4, el.etiqueta.length * 0.2) && Math.abs(ly) <= 0.45;
          default: return Math.hypot(dx, dy) <= Math.max(0.45, minimo);
        }
      })();
      if (dentro) return { tipo: "elemento", el };
    }
    // Dibujos visibles: cerca de su trazo
    const tol = Math.max(0.25, 8 / escala);
    for (const d of [...dibujosVisibles].reverse()) {
      for (let i = 2; i < d.puntos.length; i += 2) {
        const ax = d.puntos[i - 2], ay = d.puntos[i - 1], bx = d.puntos[i], by = d.puntos[i + 1];
        const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((q.x - ax) * (bx - ax) + (q.y - ay) * (by - ay)) / L2));
        if (Math.hypot(q.x - (ax + t * (bx - ax)), q.y - (ay + t * (by - ay))) < tol) return { tipo: "dibujo", id: d.id };
      }
    }
    return null;
  };

  const aMetros = (ev: React.PointerEvent<HTMLDivElement>): Punto => {
    const r = ev.currentTarget.getBoundingClientRect();
    return {
      ...(() => {
        const q = vistaACancha((ev.clientX - r.left) / escala + VD.u0, (ev.clientY - r.top) / escala + VD.v0);
        return { x: Math.max(0, Math.min(28, q.x)), y: Math.max(0, Math.min(ALTO, q.y)) };
      })(),
    };
  };

  const alApretar = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ocupado || especial || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    const q = aMetros(ev);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    if (herramienta !== "mover") { setDibujoVivo([q.x, q.y]); return; }
    const obj = buscar(q);
    if (!obj) { limpiarSeleccion(); gestoRef.current = null; return; }
    if (obj.tipo === "canasta") { tirar(obj.c); return; }
    if (obj.tipo === "dibujo") { setSelDibujo(obj.id); setSel(null); setBalonSel(null); return; }
    const el = obj.el;
    if (balonSel && esJugador(el.tipo)) { darBalon(balonSel, el.id); gestoRef.current = null; return; }
    // Primero se selecciona; el arrastre solo mueve la ficha ya seleccionada
    const lista = el.tipo === "balon" ? balonSel === el.id : sel === el.id;
    const pos = posMostrada(el);
    gestoRef.current = pos ? { el, ptr: q, pos, lista, arrastrando: false } : null;
    if (!lista && el.tipo !== "balon") { setSel(el.id); setSelDibujo(null); }
  };

  const alMover = (ev: React.PointerEvent<HTMLDivElement>) => {
    const q = aMetros(ev);
    if (dibujoVivo) { seguirDibujo(q); return; }
    const g = gestoRef.current;
    if (!g) {
      if (ev.pointerType === "mouse" && herramienta === "mover") {
        ev.currentTarget.style.cursor = buscar(q) ? "pointer" : "default";
      }
      return;
    }
    if (!g.lista) return;
    if (!g.arrastrando) {
      if (Math.hypot(q.x - g.ptr.x, q.y - g.ptr.y) * escala < 6) return; // aún es un toque
      g.arrastrando = true;
      ev.currentTarget.style.cursor = "grabbing";
      inicioArrastre(g.el);
    }
    const destino = {
      x: Math.max(0, Math.min(28, g.pos.x + q.x - g.ptr.x)),
      y: Math.max(0, Math.min(ALTO, g.pos.y + q.y - g.ptr.y)),
    };
    g.destino = destino;
    durante(g.el, destino);
  };

  const alSoltar = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.currentTarget.hasPointerCapture(ev.pointerId)) ev.currentTarget.releasePointerCapture(ev.pointerId);
    if (dibujoVivo) { acabarDibujo(); return; }
    const g = gestoRef.current;
    gestoRef.current = null;
    if (!g) return;
    ev.currentTarget.style.cursor = "default";
    if (g.arrastrando && g.destino) { finArrastre(g.el, g.destino); return; }
    setArrastre(null);
    // Fue un toque
    if (g.el.tipo === "balon") { tocar(g.el); return; }
    const ahora = performance.now();
    const ult = ultimoToque.current;
    ultimoToque.current = { id: g.el.id, t: ahora };
    if (ult && ult.id === g.el.id && ahora - ult.t < 350) editarEtiqueta(g.el); // doble toque
  };

  const contador = anim ? anim.f + 1 : cursor;
  const etiquetaVista = especial
    ? especial.tipo === "todas" ? "Todas las imágenes" : `Imagen ${segmentos.findIndex((s) => s.seg === especial.seg) + 1}`
    : null;

  // =====================================================================
  return (
    <div
      className={grande ? "fixed inset-0 z-50 flex flex-col gap-2 overflow-auto bg-suave p-2 sm:p-3" : "select-none space-y-2"}
      style={grande ? { paddingTop: "max(env(safe-area-inset-top), 8px)" } : undefined}
    >
      <div>
        {/* ===== Pista ===== */}
        <div ref={contRef} className="relative w-full">
          <div className="mx-auto overflow-hidden rounded-t-xl border border-b-0 border-linea bg-white" style={{ width: anchoVista * escala + 2 }}>
            {/* Todos los toques y arrastres se gestionan aquí, con eventos de puntero (ratón, dedo y lápiz igual) */}
            <div
              style={{ width: anchoVista * escala, height: altoVista * escala, touchAction: "none" }}
              onPointerDown={alApretar}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
              onPointerCancel={alSoltar}
              onContextMenu={(ev) => ev.preventDefault()}
            >
            <Stage ref={stageRef} width={anchoVista * escala} height={altoVista * escala} listening={false}>
              <Layer
                ref={layerRef}
                x={-VD.u0 * escala}
                y={VD.rotada ? (VD.base - VD.v0) * escala : -VD.v0 * escala}
                rotation={VD.rotada ? -90 : 0}
                scaleX={escala}
                scaleY={escala}
                listening={false}
              >
                <Pista />

                {dibujosVisibles.map((d) => pintarDibujo(d, `d-${d.id}`))}
                {dibujoVivo && <Line points={dibujoVivo} stroke={colorActivo ?? TINTA} strokeWidth={0.08} tension={0.4} opacity={0.7} listening={false} />}
                {lineas.map((l, i) => pintarMovimiento(l.m, `m-${l.f}-${i}`, l.op, l.num))}
                {acciones.map((a, i) => pintarAccion(a, `a-${a.f}-${i}`))}
                {vivo && (() => {
                  const el = elemento(vivo.id);
                  return el ? pintarMovimiento({ elementoId: vivo.id, tipo: tipoAuto(el), puntos: vivo.puntos }, "vivo", 0.75) : null;
                })()}

                {/* Canastas a las que se puede tirar */}
                {balonSel && grabando && canastasObjetivo.map((c, i) => (
                  <Circle
                    key={`obj-${i}`} x={c.x} y={c.y} radius={0.8} stroke="#fc6401" strokeWidth={0.08} dash={[0.18, 0.12]}
                    fill="rgba(252,100,1,0.15)"
                  />
                ))}

                {elementosOrdenados.map((el) => {
                  const pos = posMostrada(el);
                  if (!pos) return null;
                  const seleccionado = (sel === el.id || balonSel === el.id) && !ocupado && !especial;
                  const receptor = !!balonSel && esJugador(el.tipo) && poseedores[balonSel] !== el.id;
                  return (
                    <Group
                      key={el.id}
                      x={pos.x}
                      y={pos.y}
                      rotation={rotVisual(el)}
                    >
                      {seleccionado && <Circle radius={el.tipo === "balon" ? 0.42 : el.tipo === "escalera" ? 1.7 : R * 1.45} stroke="#eab308" strokeWidth={0.1} dash={[0.2, 0.12]} listening={false} />}
                      {receptor && <Circle radius={R * 1.35} stroke="#fc6401" strokeWidth={0.07} dash={[0.15, 0.1]} listening={false} />}
                      {forma(el)}
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
            </div>
          </div>

          {/* escudo en la esquina en las medias pistas (en la completa va en el círculo central) */}
          {VD.rotada && (
            <img
              src="/marca/escudo-128.png" alt=""
              className="pointer-events-none absolute h-9 w-auto opacity-90"
              style={{ top: 8, left: `calc(50% + ${(anchoVista * escala) / 2 - 48}px)` }}
            />
          )}

          {/* avisos sobre la pista (no desplazan nada) */}
          <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1">
            {grabando && !anim && (
              <span className="flex items-center gap-1.5 rounded-full bg-rojo px-2.5 py-1 text-xs font-bold text-white shadow">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
              </span>
            )}
            {etiquetaVista && <span className="rounded-full bg-azul px-3 py-1 text-xs font-semibold text-white shadow">{etiquetaVista}</span>}
            {aviso && <span className="max-w-[90%] rounded-full bg-tinta/90 px-3 py-1.5 text-center text-xs text-white shadow">{aviso}</span>}
            {exportando && <span className="rounded-full bg-azul px-3 py-1.5 text-xs font-semibold text-white shadow">{exportando}</span>}
          </div>
        </div>

        {/* ===== Fila de elementos + colores ===== */}
        <div className="mx-auto flex w-full flex-wrap items-center gap-0.5 border-x border-t border-linea bg-white px-2 py-1" style={{ maxWidth: anchoBarra }}>
          <Pieza titulo="Atacante" onClick={() => agregar("atacante")}><svg viewBox="0 0 24 24" className="h-6 w-6"><circle cx="12" cy="12" r="9" fill="#fff" stroke="#1f2937" strokeWidth="1.6" /></svg></Pieza>
          <Pieza titulo="5 atacantes" onClick={() => cinco("atacante")}><svg viewBox="0 0 24 24" className="h-6 w-6"><circle cx="12" cy="12" r="9" fill="#fff" stroke="#1f2937" strokeWidth="1.6" /><text x="12" y="15.5" fontSize="9" fontWeight="700" textAnchor="middle" fill="#1f2937">x5</text></svg></Pieza>
          <Pieza titulo="Balón" onClick={() => agregar("balon")}><svg viewBox="0 0 24 24" className="h-6 w-6"><circle cx="12" cy="12" r="8" fill="#fc6401" stroke="#7a2c00" /><path d="M4 12h16M12 4v16" stroke="#7a2c00" strokeWidth="1" /></svg></Pieza>
          <Pieza titulo="Defensor" onClick={() => agregar("defensor")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M6 6l12 12M18 6L6 18" stroke="#ca010c" strokeWidth="2.6" strokeLinecap="round" /></svg></Pieza>
          <Pieza titulo="5 defensores" onClick={() => cinco("defensor")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M4 4l9 9M13 4l-9 9" stroke="#ca010c" strokeWidth="2.4" strokeLinecap="round" /><text x="18" y="22" fontSize="9" fontWeight="700" textAnchor="middle" fill="#1f2937">x5</text></svg></Pieza>
          <Pieza titulo="Entrenador" onClick={() => agregar("entrenador")}><svg viewBox="0 0 24 24" className="h-6 w-6"><rect x="4" y="4" width="16" height="16" rx="2" fill="#1f2937" /><text x="12" y="16.5" fontSize="11" fontWeight="700" textAnchor="middle" fill="#fff">E</text></svg></Pieza>
          <Pieza titulo="Canasta" onClick={() => agregar("canasta")}><svg viewBox="0 0 24 24" className="h-6 w-6"><rect x="2" y="9" width="5" height="6" fill="#6b7280" /><path d="M9 4v16" stroke="#1f2937" strokeWidth="2" /><circle cx="15" cy="12" r="4" fill="none" stroke="#fc6401" strokeWidth="1.8" /></svg></Pieza>
          <span className="mx-1 h-6 w-px bg-linea" />
          <Pieza titulo="Cono" onClick={() => agregar("cono")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M12 3l7 17H5z" fill="#fc6401" /><path d="M8.5 13h7" stroke="#fff" strokeWidth="1.5" /></svg></Pieza>
          <Pieza titulo="Aro" onClick={() => agregar("aro")}><svg viewBox="0 0 24 24" className="h-6 w-6"><circle cx="12" cy="12" r="8" fill="none" stroke="#1f2937" strokeWidth="1.8" /></svg></Pieza>
          <Pieza titulo="Escalera" onClick={() => agregar("escalera")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M5 3v18M19 3v18M5 6h14M5 10h14M5 14h14M5 18h14" stroke="#1f2937" strokeWidth="1.5" /></svg></Pieza>
          <Pieza titulo="Valla" onClick={() => agregar("valla")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M4 18V8h16v10" fill="none" stroke="#1f2937" strokeWidth="1.8" /><path d="M2 18h4M18 18h4" stroke="#1f2937" strokeWidth="1.8" /></svg></Pieza>
          <Pieza titulo="Chino" onClick={() => agregar("chino")}><svg viewBox="0 0 24 24" className="h-6 w-6"><ellipse cx="12" cy="15" rx="9" ry="3.5" fill="#eab308" /><ellipse cx="12" cy="12.5" rx="4" ry="1.6" fill="#fff" stroke="#1f2937" strokeWidth="0.8" /></svg></Pieza>
          <Pieza titulo="Pica" onClick={() => agregar("pica")}><svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M12 3v14" stroke="#1f2937" strokeWidth="2" /><path d="M7 21l5-4 5 4z" fill="#1f2937" /></svg></Pieza>
          <Pieza titulo="Texto" onClick={() => agregar("texto")}><svg viewBox="0 0 24 24" className="h-6 w-6"><text x="12" y="18" fontSize="16" fontWeight="700" textAnchor="middle" fill="#1f2937">T</text></svg></Pieza>
          <div className="ml-auto flex items-center gap-1">
            {PALETA.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                title="Color para lo que añadas o para lo seleccionado"
                onClick={() => {
                  setColorActivo((a) => (a === c && !sel && !selDibujo ? null : c));
                  if (sel) cambiar((d) => { const x = d.elementos.find((q) => q.id === sel); if (x) x.color = c; });
                  if (selDibujo) cambiar((d) => { const x = d.dibujos.find((q) => q.id === selDibujo); if (x) x.color = c; });
                }}
                className={`h-7 w-7 rounded-full border transition ${colorActivo === c ? "scale-110 ring-2 ring-tinta ring-offset-1" : "border-black/25"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {/* ===== Fila de controles: grabar, fotogramas, capturas ===== */}
        <div className="mx-auto flex w-full flex-wrap items-center gap-1 rounded-b-xl border border-linea bg-white px-2 py-1.5" style={{ maxWidth: anchoBarra }}>
          <Boton
            titulo={grabando ? "Parar de grabar" : "Grabar (REC)"}
            activo={grabando}
            rojo
            onClick={() => {
              const empieza = !grabando;
              setGrabando(empieza); limpiarSeleccion(); setEspecial(null); setHerramienta("mover");
              if (!empieza) { setModoBloqueo(false); setModoMano(false); }
              if (empieza) avisar("Grabando: arrastra jugadores; toca el balón y luego a quien lo recibe.");
            }}
          >
            <span className="text-[10px] font-black">REC</span>
          </Boton>
          <Boton titulo="Flecha" activo={herramienta === "flecha"} onClick={() => { setHerramienta((h) => (h === "flecha" ? "mover" : "flecha")); limpiarSeleccion(); }}><MoveRight size={18} /></Boton>
          <Boton titulo="Lápiz (dibujo libre)" activo={herramienta === "lapiz"} onClick={() => { setHerramienta((h) => (h === "lapiz" ? "mover" : "lapiz")); limpiarSeleccion(); }}><Pencil size={17} /></Boton>
          <Boton
            titulo="Bloqueo: el siguiente jugador que arrastres hará un bloqueo"
            activo={modoBloqueo}
            onClick={() => {
              if (!grabando) { avisar("Pulsa REC para grabar un bloqueo."); return; }
              setModoBloqueo((m) => !m); setModoMano(false); setHerramienta("mover");
              if (!modoBloqueo) avisar("Bloqueo: arrastra al jugador hasta donde pone el bloqueo.");
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M3 12h15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M18 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </Boton>
          <Boton
            titulo="Mano a mano: el siguiente pase será una entrega en mano"
            activo={modoMano}
            onClick={() => {
              if (!grabando) { avisar("Pulsa REC para grabar un mano a mano."); return; }
              setModoMano((m) => !m); setModoBloqueo(false); setHerramienta("mover");
              if (!modoMano) avisar("Mano a mano: toca el balón y luego al jugador que lo recibe.");
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M3 12h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M11 6v12M15 6v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </Boton>

          <span className="mx-1 h-6 w-px bg-linea" />
          <Boton titulo="Al principio" onClick={() => irA(0)}><ChevronsLeft size={18} /></Boton>
          <Boton titulo={anim ? "Pausa" : "Reproducir"} onClick={() => (anim ? parar() : void reproducir())}>{anim ? <Pause size={17} /> : <Play size={17} />}</Boton>
          <Boton titulo="Fotograma anterior" onClick={() => irA(cursor - 1)}><ChevronLeft size={18} /></Boton>
          <span className="min-w-14 text-center font-mono text-base font-bold tabular-nums text-tinta">{pad(contador)}/{pad(n)}</span>
          <Boton titulo="Fotograma siguiente" onClick={() => irA(cursor + 1)}><ChevronRight size={18} /></Boton>
          <Boton titulo="Al final" onClick={() => irA(n)}><ChevronsRight size={18} /></Boton>

          <span className="mx-1 h-6 w-px bg-linea" />
          <Boton titulo="Captura (limpia las líneas y sigue grabando)" onClick={capturar}><Camera size={18} /></Boton>
          <div className="flex max-w-[45%] items-center gap-1 overflow-x-auto rounded bg-suave px-1 py-0.5">
            {segmentos.map((s, i) => (
              <button
                key={s.seg}
                type="button"
                onClick={() => { if (ocupado) return; setEspecial((e) => (e?.tipo === "captura" && e.seg === s.seg ? null : { tipo: "captura", seg: s.seg })); limpiarSeleccion(); }}
                className={`h-7 min-w-7 rounded px-1.5 text-xs font-bold ${especial?.tipo === "captura" && especial.seg === s.seg ? "bg-azul text-white" : "bg-white text-tinta hover:bg-linea"}`}
                title={`Ver imagen ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { if (ocupado) return; setEspecial((e) => (e?.tipo === "todas" ? null : { tipo: "todas" })); limpiarSeleccion(); }}
              className={`flex h-7 items-center rounded px-1.5 ${especial?.tipo === "todas" ? "bg-azul text-white" : "bg-white text-tinta hover:bg-linea"}`}
              title="Todas las imágenes superpuestas"
            >
              <Layers size={14} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Boton titulo="Deshacer el último movimiento (Ctrl+Z)" onClick={deshacer} desactivado={!historial.length}><Undo2 size={18} /></Boton>
            <Boton titulo="Borrar la grabación" onClick={borrarGrabacion}><Trash2 size={17} /></Boton>
            <Boton titulo="Configuración" activo={panel === "config"} onClick={() => setPanel((x) => (x === "config" ? null : "config"))}><Settings size={17} /></Boton>
          </div>
        </div>
      </div>

      {/* ===== Paneles ===== */}
      {panel === "config" && (
        <div className="mx-auto flex w-full flex-wrap items-center gap-4 rounded-xl border border-linea bg-white p-3 text-sm" style={{ maxWidth: anchoBarra }}>
          <label className="flex items-center gap-2">Tamaño de jugadores
            <select className="campo !w-auto !py-1" value={p.config.tamano} onChange={(ev) => { const v = Number(ev.target.value); cambiar((d) => { d.config.tamano = v; }); }}>
              <option value={0.8}>Pequeño</option><option value={1}>Normal</option><option value={1.25}>Grande</option><option value={1.5}>Muy grande</option>
            </select>
          </label>
          <label className="flex items-center gap-2">Velocidad de la animación
            <select className="campo !w-auto !py-1" value={p.config.velocidad} onChange={(ev) => { const v = Number(ev.target.value); cambiar((d) => { d.config.velocidad = v; }); }}>
              <option value={0.6}>Lenta</option><option value={1}>Normal</option><option value={1.6}>Rápida</option>
            </select>
          </label>
          <button type="button" onClick={() => setPanel(null)} className="ml-auto text-tinta/50 hover:text-tinta" aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}

      {/* ===== Elemento seleccionado (debajo: no mueve la pista) ===== */}
      {(elSel || selDibujo) && !ocupado && !especial && (
        <div className="mx-auto flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-oro bg-oro/10 px-2 py-1.5 text-sm" style={{ maxWidth: anchoBarra }}>
          {selDibujo ? (
            <span className="font-semibold text-azul">Dibujo</span>
          ) : elSel && (
            <>
              <span className="font-semibold text-azul">{NOMBRE[elSel.tipo]} {elSel.tipo !== "texto" ? elSel.etiqueta : ""}</span>
              {(esJugador(elSel.tipo) || elSel.tipo === "texto") && <Chip onClick={() => editarEtiqueta(elSel)}>Etiqueta</Chip>}
              {!esJugador(elSel.tipo) && elSel.tipo !== "balon" && (
                <>
                  <Chip titulo="Girar (Mayús+R)" onClick={() => cambiar((d) => { const x = d.elementos.find((q) => q.id === elSel.id); if (x) x.rot = (((x.rot ?? 0) - 45) % 360 + 360) % 360; })}><RotateCcw size={14} /></Chip>
                  <Chip titulo="Girar (R)" onClick={() => cambiar((d) => { const x = d.elementos.find((q) => q.id === elSel.id); if (x) x.rot = ((x.rot ?? 0) + 45) % 360; })}><RotateCw size={14} /></Chip>
                </>
              )}
              {movSel && esJugador(elSel.tipo) && (
                <>
                  <span className="text-[11px] uppercase text-tinta/50">Su línea:</span>
                  {(["correr", "botar", "bloqueo"] as TipoTrazo[]).map((t) => (
                    <Chip key={t} activo={movSel.tipo === t} onClick={() => cambiar((d) => { const m = d.fotogramas[cursor - 1].movimientos.find((x) => x.elementoId === elSel.id); if (m) m.tipo = t; })}>
                      {t === "correr" ? "Desplazamiento" : t === "botar" ? "Bote" : "Bloqueo"}
                    </Chip>
                  ))}
                </>
              )}
            </>
          )}
          <button type="button" onClick={borrarSeleccion} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-red-700 hover:bg-red-50">
            <Trash2 size={14} /> {selDibujo ? "Borrar dibujo" : movSel || balonSelAccion ? "Borrar su movimiento" : "Quitar"}
          </button>
        </div>
      )}

      {/* ===== Pista, descargas y opciones ===== */}
      <div className="mx-auto flex w-full flex-wrap items-center gap-2" style={{ maxWidth: anchoBarra }}>
        <div className="flex overflow-hidden rounded-lg border border-linea">
          {(["completa", "ofensiva", "defensiva"] as Vista[]).map((v) => (
            <button
              key={v} type="button"
              onClick={() => cambiar((d) => { d.vista = v; })}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${p.vista === v ? "bg-azul text-white" : "bg-white text-tinta hover:bg-suave"}`}
            >
              {v === "completa" ? "Completa" : v === "ofensiva" ? "Media ofensiva" : "Media defensiva"}
            </button>
          ))}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setPanel((x) => (x === "descargar" ? null : "descargar"))} className="btn-secundario !py-1.5"><Download size={15} /> Descargar</button>
          {panel === "descargar" && (
            <div className="absolute bottom-full left-0 z-20 mb-1 w-56 overflow-hidden rounded-lg border border-linea bg-white text-sm shadow-lg">
              <button type="button" onClick={descargarPDF} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-suave"><FileDown size={15} /> PDF con las capturas</button>
              <button type="button" onClick={descargarVideo} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-suave"><Film size={15} /> Vídeo de la animación</button>
              <button type="button" onClick={descargarPNG} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-suave"><ImageDown size={15} /> Imagen de lo que se ve</button>
            </div>
          )}
        </div>
        <button type="button" onClick={reiniciar} className="btn-secundario !py-1.5"><RefreshCw size={15} /> Reiniciar</button>
        <button type="button" onClick={() => setGrande((g) => !g)} className="btn-secundario !py-1.5">
          {grande ? <><Minimize2 size={15} /> Salir</> : <><Maximize2 size={15} /> Pantalla completa</>}
        </button>
      </div>

      <p className="mx-auto w-full text-xs text-tinta/55" style={{ maxWidth: anchoBarra }}>
        {grabando
          ? "GRABANDO: toca un jugador y arrástralo; si lleva el balón bota, si no corta. Para pasar, toca el balón y luego al receptor (o arrastra el balón hasta él); para tirar, toca el balón y una canasta. Con ‹ vuelve un fotograma atrás y mueve a otro jugador para que se muevan a la vez. 📷 limpia las líneas y sigue."
          : "Toca una ficha para seleccionarla (aro amarillo) y arrástrala a su sitio. Para dar el balón: toca el balón y luego al jugador, o arrástralo encima de él. Doble toque para cambiar la etiqueta. Pulsa REC para grabar la jugada."}
        {" "}Teclado: ← → fotogramas · Espacio reproducir · C captura · Supr borrar · R girar · Ctrl+Z deshacer.
        <span className="ml-1 rounded bg-azul/10 px-1.5 py-0.5 font-semibold text-azul">Pizarra v3.5</span>
      </p>
    </div>
  );
}

// ---------- botones ----------

function Pieza({ titulo, onClick, children }: { titulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-suave">
      {children}
    </button>
  );
}

function Boton({ titulo, onClick, children, activo, rojo, desactivado }: {
  titulo: string; onClick: () => void; children: React.ReactNode; activo?: boolean; rojo?: boolean; desactivado?: boolean;
}) {
  const color = activo ? (rojo ? "bg-rojo text-white border-rojo" : "bg-azul text-white border-azul") : rojo ? "bg-white text-rojo border-rojo/40" : "bg-white text-tinta border-linea";
  return (
    <button
      type="button" title={titulo} aria-label={titulo} onClick={onClick} disabled={desactivado}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-1.5 transition hover:brightness-95 disabled:opacity-35 ${color}`}
    >
      {children}
    </button>
  );
}

function Chip({ children, onClick, activo, titulo }: { children: React.ReactNode; onClick: () => void; activo?: boolean; titulo?: string }) {
  return (
    <button
      type="button" onClick={onClick} title={titulo}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 transition ${activo ? "border-azul bg-azul text-white" : "border-linea bg-white hover:bg-suave"}`}
    >
      {children}
    </button>
  );
}
