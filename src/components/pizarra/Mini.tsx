// Dibujo estático y ligero de una pizarra (para las tarjetas de la biblioteca), en SVG.
// Sirve en servidor: no usa el editor.
import { AROS, esJugador, estados, normalizar, type Punto } from "./modelo";

const AZUL = "#002b8e", ROJO = "#ca010c", NARANJA = "#fc6401";

export default function MiniPizarra({ pizarra, className = "" }: { pizarra: unknown; className?: string }) {
  const p = normalizar(pizarra);
  const est = estados(p);
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

  return (
    <svg viewBox={caja} className={className} role="img" aria-label="Pizarra">
      <defs>
        <marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#1f2937" />
        </marker>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="#f6efe2" />
      {/* Líneas de la pista */}
      <g transform={matriz} fill="none" stroke="#9aa3b5" strokeWidth="0.07">
        <rect x="0" y="0" width="28" height="15" />
        <line x1="14" y1="0" x2="14" y2="15" />
        <circle cx="14" cy="7.5" r="1.8" />
        <rect x="0" y="5.05" width="5.8" height="4.9" fill="#002b8e14" />
        <rect x="22.2" y="5.05" width="5.8" height="4.9" fill="#002b8e14" />
        <circle cx="5.8" cy="7.5" r="1.8" />
        <circle cx="22.2" cy="7.5" r="1.8" />
        <path d="M0,0.9 L2.99,0.9 A6.75,6.75 0 0 1 2.99,14.1 L0,14.1" />
        <path d="M28,0.9 L25.01,0.9 A6.75,6.75 0 0 0 25.01,14.1 L28,14.1" />
        {AROS.map((a, i) => <circle key={i} cx={a.x} cy={a.y} r="0.23" stroke={NARANJA} strokeWidth="0.08" />)}
        <line x1="1.2" y1="6.6" x2="1.2" y2="8.4" stroke="#1f2937" strokeWidth="0.1" />
        <line x1="26.8" y1="6.6" x2="26.8" y2="8.4" stroke="#1f2937" strokeWidth="0.1" />
      </g>

      {/* Movimientos y pases */}
      {p.fotogramas.map((f, k) => (
        <g key={k}>
          {f.movimientos.map((m, i) => {
            if (m.puntos.length < 4) return null;
            const n = m.puntos.length;
            const fin = T({ x: m.puntos[n - 2], y: m.puntos[n - 1] });
            const prev = T({ x: m.puntos[n - 4], y: m.puntos[n - 3] });
            const ang = Math.atan2(fin[1] - prev[1], fin[0] - prev[0]);
            return (
              <g key={i}>
                <polyline points={linea(m.puntos)} fill="none" stroke="#1f2937" strokeWidth="0.09"
                  strokeDasharray={m.tipo === "botar" ? "0.18 0.14" : undefined} markerEnd={m.tipo === "bloqueo" ? undefined : "url(#fl)"} />
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
            if (!de || !hacia) return null;
            const [x1, y1] = T(de), [x2, y2] = T(hacia);
            return <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.tipo === "tiro" ? NARANJA : "#475569"} strokeWidth="0.07" strokeDasharray="0.3 0.18" markerEnd="url(#fl)" />;
          })}
        </g>
      ))}

      {/* Elementos en su posición inicial */}
      {p.elementos.map((e) => {
        const q = p.inicial[e.id];
        if (!q) return null;
        if (e.tipo === "balon" && Object.values(p.poseedor).length && p.poseedor[e.id]) return null;
        const [x, y] = T(q);
        if (esJugador(e.tipo)) {
          const def = e.tipo === "defensor";
          const fill = def ? "#ffffff" : e.tipo === "entrenador" ? "#1f2937" : AZUL;
          return (
            <g key={e.id}>
              <circle cx={x} cy={y} r={r} fill={fill} stroke={def ? ROJO : "white"} strokeWidth="0.09" />
              <text x={x} y={y + 0.18} textAnchor="middle" fontSize={r * 1.15} fontWeight="700" fill={def ? ROJO : "white"} fontFamily="system-ui, sans-serif">{def ? "X" : e.etiqueta}</text>
              {Object.entries(p.poseedor).some(([, j]) => j === e.id) && <circle cx={x + r * 0.85} cy={y - r * 0.85} r={r * 0.42} fill={NARANJA} stroke="white" strokeWidth="0.05" />}
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
