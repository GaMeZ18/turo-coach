// Dibujo estático y ligero de una pizarra (para las tarjetas de la biblioteca), en SVG.
// Sirve en servidor: no usa el editor.
import { aspectoEn, esJugador, estados, normalizar, visibleEn, type Punto } from "./modelo";

const AZUL = "#002b8e", ROJO = "#ca010c", NARANJA = "#fc6401";

// ---- Pista (mismas medidas y colores que pizarra/Pista.tsx, en SVG) ----
const SUELO = "#ead3a6", SUELO_TRIPLE = "#e3c690", LINEA = "#ffffff", G = 0.08;
type TT = (u: number, v: number) => [number, number];
const arco = (cu: number, cv: number, r: number, a0: number, a1: number, n = 32) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return pts;
};
const ruta = (t: TT, pts: [number, number][], cerrar = false) =>
  pts.map(([u, v], i) => `${i ? "L" : "M"}${t(u, v).map((n) => n.toFixed(3)).join(",")}`).join(" ") + (cerrar ? " Z" : "");

function MediaPista({ t }: { t: TT }) {
  const vAro = 1.575;
  const vEsq = vAro + Math.sqrt(6.75 ** 2 - 6.6 ** 2);
  const ang = (Math.atan2(vEsq - vAro, 6.6) * 180) / Math.PI;
  const triple = arco(7.5, vAro, 6.75, 180 - ang, ang);
  const [ax, ay] = t(7.5, vAro);
  const l = { fill: "none", stroke: LINEA, strokeWidth: G };
  return (
    <g>
      <path d={ruta(t, [[0.9, 0], [0.9, vEsq], ...triple, [14.1, vEsq], [14.1, 0]], true)} fill={SUELO_TRIPLE} />
      <path d={ruta(t, [[0.9, 0], [0.9, vEsq], ...triple, [14.1, vEsq], [14.1, 0]])} {...l} />
      <path d={ruta(t, [[5.05, 0], [9.95, 0], [9.95, 5.8], [5.05, 5.8]], true)} fill={AZUL} fillOpacity={0.88} stroke={LINEA} strokeWidth={G} />
      <path d={ruta(t, arco(7.5, 5.8, 1.8, 0, 180))} {...l} />
      <path d={ruta(t, arco(7.5, 5.8, 1.8, 180, 360))} {...l} strokeDasharray="0.3 0.25" />
      <path d={ruta(t, arco(7.5, vAro, 1.25, 0, 180))} {...l} />
      <path d={ruta(t, [[6.6, 1.2], [8.4, 1.2]])} fill="none" stroke={LINEA} strokeWidth={0.14} />
      <circle cx={ax} cy={ay} r={0.23} fill="none" stroke={NARANJA} strokeWidth={0.09} />
    </g>
  );
}

function Pista({ escudo = true }: { escudo?: boolean }) {
  const hE = 2.9, wE = hE * (111 / 128);
  return (
    <g>
      <rect x={0} y={0} width={28} height={15} fill={SUELO} />
      <MediaPista t={(u, v) => [v, u]} />
      <MediaPista t={(u, v) => [28 - v, u]} />
      <line x1={14} y1={0} x2={14} y2={15} stroke={LINEA} strokeWidth={G} />
      <circle cx={14} cy={7.5} r={1.8} fill="#ffffff" fillOpacity={0.35} stroke={LINEA} strokeWidth={G} />
      {escudo && <image href="/marca/escudo-128.png" x={14 - wE / 2} y={7.5 - hE / 2} width={wE} height={hE} opacity={0.95} />}
      <rect x={0} y={0} width={28} height={15} fill="none" stroke={LINEA} strokeWidth={G * 1.6} />
    </g>
  );
}

/** pasos: [desde, hasta) dibuja solo esos fotogramas, con los jugadores donde están al empezar el primero
 *  (para enseñar la jugada paso a paso en el PDF). Sin pasos: todo el ejercicio sobre la posición inicial. */
export default function MiniPizarra({ pizarra, className = "", pasos }: { pizarra: unknown; className?: string; pasos?: [number, number] }) {
  const p = normalizar(pizarra);
  const est = estados(p);
  const k0 = pasos ? Math.max(0, Math.min(pasos[0], p.fotogramas.length)) : 0;
  const k1 = pasos ? Math.max(k0, Math.min(pasos[1], p.fotogramas.length)) : p.fotogramas.length;
  const posIni: Record<string, Punto> = pasos ? (est[k0]?.pos ?? p.inicial) : p.inicial;
  const poseedor: Record<string, string | null> = (pasos ? est[k0]?.poseedor : p.poseedor) ?? {};
  const vista = p.vista;
  // Pista → dibujo: media ofensiva vertical con la canasta arriba; defensiva con la canasta abajo
  const T = (q: Punto): [number, number] =>
    vista === "ofensiva" ? [q.y, 28 - q.x] : vista === "defensiva" ? [15 - q.y, 14 - q.x] : [q.x, q.y];
  const caja = vista === "completa" ? "0 0 28 15" : "0 0 15 14";
  const matriz = vista === "ofensiva" ? "matrix(0,-1,1,0,0,28)" : vista === "defensiva" ? "matrix(0,-1,-1,0,15,14)" : undefined;
  const linea = (pts: number[]) => {
    const q: string[] = [];
    for (let i = 0; i + 1 < pts.length; i += 2) q.push(T({ x: pts[i], y: pts[i + 1] }).join(","));
    return q.join(" ");
  };
  const r = vista === "completa" ? 0.45 : 0.5;
  const tipoDe = new Map(p.elementos.map((e) => [e.id, e.tipo]));

  return (
    <svg viewBox={caja} className={className} role="img" aria-label="Pizarra">
      <defs>
        <marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#1f2937" />
        </marker>
        <marker id="flr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#ca010c" />
        </marker>
      </defs>
      {/* Pista igual que la de la pizarra: parquet, zona azul, líneas blancas y escudo */}
      <g transform={matriz}>
        <Pista escudo={vista === "completa"} />
      </g>
      {vista !== "completa" && <image href="/marca/escudo-128.png" x={15 - 0.35 - 1.3} y={0.3} width={1.3} height={1.5} opacity={0.9} />}

      {/* Movimientos y pases */}
      {p.fotogramas.map((f, k) => (k < k0 || k >= k1) ? null : (
        <g key={k}>
          {f.movimientos.map((m, i) => {
            if (m.puntos.length < 4) return null;
            const n = m.puntos.length;
            const fin = T({ x: m.puntos[n - 2], y: m.puntos[n - 1] });
            const prev = T({ x: m.puntos[n - 4], y: m.puntos[n - 3] });
            const ang = Math.atan2(fin[1] - prev[1], fin[0] - prev[0]);
            // Los defensores, en rojo y más finos: así se distingue la jugada del ataque de cómo se mueve la defensa
            const el0 = p.elementos.find((x) => x.id === m.elementoId);
            const def = (el0 ? aspectoEn(el0, k).tipo : tipoDe.get(m.elementoId)) === "defensor";
            return (
              <g key={i} opacity={def ? 0.75 : 1}>
                <polyline points={linea(m.puntos)} fill="none" stroke={def ? "#ca010c" : "#1f2937"} strokeWidth={def ? "0.06" : "0.09"}
                  strokeDasharray={m.tipo === "botar" ? "0.18 0.14" : undefined} markerEnd={m.tipo === "bloqueo" ? undefined : def ? "url(#flr)" : "url(#fl)"} />
                {m.tipo === "bloqueo" && (
                  <line x1={fin[0] - 0.4 * Math.sin(ang)} y1={fin[1] + 0.4 * Math.cos(ang)} x2={fin[0] + 0.4 * Math.sin(ang)} y2={fin[1] - 0.4 * Math.cos(ang)} stroke="#1f2937" strokeWidth="0.12" />
                )}
              </g>
            );
          })}
          {f.balon.map((a, i) => {
            const pos = est[k + 1]?.pos ?? {};
            const de = a.de ? pos[a.de] : undefined;
            const hacia = a.tipo === "tiro" ? a.destino : a.a ? pos[a.a] : undefined;
            if (a.tipo === "coger" && a.rebote && hacia) {
              const [x, y] = T(hacia);
              return (
                <g key={`b${i}`}>
                  <circle cx={x - r * 1.2} cy={y - r * 1.2} r={r * 0.62} fill="#fff" stroke="#1f2937" strokeWidth="0.05" />
                  <text x={x - r * 1.2} y={y - r * 1.2 + r * 0.3} textAnchor="middle" fontSize={r * 0.82} fontWeight="700" fill="#1f2937" fontFamily="system-ui, sans-serif">R</text>
                </g>
              );
            }
            if (!de || !hacia) return null;
            const [x1, y1] = T(de), [x2, y2] = T(hacia);
            return <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.tipo === "tiro" ? NARANJA : "#475569"} strokeWidth="0.07" strokeDasharray="0.3 0.18" markerEnd="url(#fl)" />;
          })}
        </g>
      ))}

      {/* Elementos en su posición inicial */}
      {p.elementos.map((e0) => {
        if (!visibleEn(e0, k0)) return null;
        const e = aspectoEn(e0, k0);
        const q = posIni[e.id];
        if (!q) return null;
        if (e.tipo === "balon" && Object.values(poseedor).length && poseedor[e.id]) return null;
        const [x, y] = T(q);
        if (esJugador(e.tipo)) {
          const c = e.color || (e.tipo === "defensor" ? ROJO : e.tipo === "entrenador" ? "#1f2937" : AZUL);
          const conBalon = Object.entries(poseedor).some(([, j]) => j === e.id);
          const balon = conBalon && <circle cx={x + r * 0.85} cy={y - r * 0.85} r={r * 0.42} fill={NARANJA} stroke="#7a2c00" strokeWidth="0.05" />;
          // Mismo dibujo que en la pizarra: atacante = círculo blanco con número; defensor = X
          if (e.tipo === "defensor") {
            const s = r * 0.62, num = e.etiqueta.replace(/^X/i, "");
            return (
              <g key={e.id}>
                <circle cx={x} cy={y} r={r} fill="rgba(255,255,255,0.55)" />
                <path d={`M${x - s},${y - s} L${x + s},${y + s} M${x - s},${y + s} L${x + s},${y - s}`} stroke={c} strokeWidth={r * 0.26} strokeLinecap="round" />
                {num && <text x={x + s * 0.95} y={y + s * 0.05 + r * 0.7} fontSize={r * 0.85} fontWeight="700" fill={c} fontFamily="system-ui, sans-serif">{num}</text>}
              </g>
            );
          }
          if (e.tipo === "entrenador") {
            return (
              <g key={e.id}>
                <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={0.08} fill={c} />
                <text x={x} y={y + r * 0.4} textAnchor="middle" fontSize={r * 1.15} fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">{e.etiqueta}</text>
              </g>
            );
          }
          return (
            <g key={e.id}>
              <circle cx={x} cy={y} r={r} fill="#ffffff" stroke={c} strokeWidth={r * 0.17} />
              <text x={x} y={y + r * 0.43} textAnchor="middle" fontSize={r * (e.etiqueta.length > 1 ? 1.0 : 1.25)} fontWeight="700" fill={c === "#ffffff" ? "#1f2937" : c} fontFamily="system-ui, sans-serif">{e.etiqueta}</text>
              {balon}
            </g>
          );
        }
        if (e.tipo === "cono" || e.tipo === "chino" || e.tipo === "pica") return <path key={e.id} d={`M${x},${y - 0.32} L${x + 0.28},${y + 0.22} L${x - 0.28},${y + 0.22} z`} fill={e.color} />;
        if (e.tipo === "aro") return <circle key={e.id} cx={x} cy={y} r="0.4" fill="none" stroke={e.color} strokeWidth="0.1" />;
        if (e.tipo === "balon") return <circle key={e.id} cx={x} cy={y} r="0.22" fill={NARANJA} />;
        return <rect key={e.id} x={x - 0.3} y={y - 0.15} width="0.6" height="0.3" fill={e.color} />;
      })}
    </svg>
  );
}
