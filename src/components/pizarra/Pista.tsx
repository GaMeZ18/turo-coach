"use client";

import { Group, Line, Rect, Circle } from "react-konva";

// Medidas FIBA en metros. La canasta de arriba está en y = 0.
const SUELO = "#ecd7ae";
const ZONA_TRIPLE = "#e6cc9c";
const ZONA = "#002b8e";
const LINEA = "#ffffff";
const GROSOR = 0.07;

const arco = (cx: number, cy: number, r: number, a0: number, a1: number, n = 40) => {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return pts;
};

/** Refleja los puntos para dibujar la canasta del otro lado (y → 28 - y). */
const espejo = (pts: number[], activo: boolean) =>
  activo ? pts.map((v, i) => (i % 2 ? 28 - v : v)) : pts;

function Media({ abajo = false }: { abajo?: boolean }) {
  const yAro = 1.575;
  const yEsquina = yAro + Math.sqrt(6.75 ** 2 - 6.6 ** 2); // ≈ 2.99
  const angulo = (Math.atan2(yEsquina - yAro, 6.6) * 180) / Math.PI; // ≈ 12°

  // Arco de triple de izquierda (~168°) a derecha (~12°), pasando por abajo (90°)
  const arcoTriple = arco(7.5, yAro, 6.75, 180 - angulo, angulo);
  const zonaTriple = [0.9, 0, 0.9, yEsquina, ...arcoTriple, 14.1, yEsquina, 14.1, 0];

  const m = (p: number[]) => espejo(p, abajo);

  return (
    <Group listening={false}>
      <Line points={m(zonaTriple)} closed fill={ZONA_TRIPLE} />
      <Line points={m([0.9, 0, 0.9, yEsquina])} stroke={LINEA} strokeWidth={GROSOR} />
      <Line points={m([14.1, 0, 14.1, yEsquina])} stroke={LINEA} strokeWidth={GROSOR} />
      <Line points={m(arcoTriple)} stroke={LINEA} strokeWidth={GROSOR} />
      {/* Zona */}
      <Line points={m([5.05, 0, 9.95, 0, 9.95, 5.8, 5.05, 5.8])} closed fill={ZONA} opacity={0.82} stroke={LINEA} strokeWidth={GROSOR} />
      {/* Círculo de tiros libres: mitad exterior continua, interior discontinua */}
      <Line points={m(arco(7.5, 5.8, 1.8, 0, 180))} stroke={LINEA} strokeWidth={GROSOR} />
      <Line points={m(arco(7.5, 5.8, 1.8, 180, 360))} stroke={LINEA} strokeWidth={GROSOR} dash={[0.3, 0.25]} />
      {/* Semicírculo de no carga */}
      <Line points={m(arco(7.5, yAro, 1.25, 0, 180))} stroke={LINEA} strokeWidth={GROSOR} />
      {/* Tablero y aro */}
      <Line points={m([6.6, 1.2, 8.4, 1.2])} stroke="#ffffff" strokeWidth={0.12} />
      <Circle x={7.5} y={abajo ? 28 - yAro : yAro} radius={0.23} stroke="#fc6401" strokeWidth={0.08} />
    </Group>
  );
}

export default function Pista({ tipo }: { tipo: "media" | "completa" }) {
  const largo = tipo === "media" ? 14 : 28;
  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={15} height={largo} fill={SUELO} />
      <Media />
      {tipo === "completa" && <Media abajo />}
      {/* Línea central y círculo */}
      {tipo === "completa" ? (
        <>
          <Line points={[0, 14, 15, 14]} stroke={LINEA} strokeWidth={GROSOR} />
          <Circle x={7.5} y={14} radius={1.8} stroke={LINEA} strokeWidth={GROSOR} fill={ZONA} opacity={0.82} />
        </>
      ) : (
        <Line points={arco(7.5, 14, 1.8, 180, 360)} stroke={LINEA} strokeWidth={GROSOR} />
      )}
      <Rect x={0} y={0} width={15} height={largo} stroke={LINEA} strokeWidth={GROSOR * 1.5} />
    </Group>
  );
}
