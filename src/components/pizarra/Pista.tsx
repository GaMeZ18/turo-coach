"use client";

import { useEffect, useState } from "react";
import { Group, Line, Rect, Circle, Image as KImage } from "react-konva";

// Medidas FIBA en metros. Cada media pista se dibuja en coordenadas "locales"
// (u = a lo ancho 0..15, v = desde la línea de fondo 0..14) y se coloca con T().
const SUELO = "#ead3a6";
const SUELO_TRIPLE = "#e3c690";
const ZONA = "#002b8e";
const LINEA = "#ffffff";
const G = 0.08;

type T = (u: number, v: number) => [number, number];

const arco = (cu: number, cv: number, r: number, a0: number, a1: number, n = 40) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return pts;
};
const aplicar = (t: T, pts: [number, number][]) => pts.flatMap(([u, v]) => t(u, v));

function MediaPista({ t }: { t: T }) {
  const vAro = 1.575;
  const vEsquina = vAro + Math.sqrt(6.75 ** 2 - 6.6 ** 2);
  const ang = (Math.atan2(vEsquina - vAro, 6.6) * 180) / Math.PI;
  const arcoTriple = arco(7.5, vAro, 6.75, 180 - ang, ang);
  const L = (pts: [number, number][]) => aplicar(t, pts);
  const [ax, ay] = t(7.5, vAro);

  return (
    <Group listening={false}>
      <Line points={L([[0.9, 0], [0.9, vEsquina], ...arcoTriple, [14.1, vEsquina], [14.1, 0]])} closed fill={SUELO_TRIPLE} />
      <Line points={L([[0.9, 0], [0.9, vEsquina]])} stroke={LINEA} strokeWidth={G} />
      <Line points={L([[14.1, 0], [14.1, vEsquina]])} stroke={LINEA} strokeWidth={G} />
      <Line points={L(arcoTriple)} stroke={LINEA} strokeWidth={G} />
      {/* Zona */}
      <Line points={L([[5.05, 0], [9.95, 0], [9.95, 5.8], [5.05, 5.8]])} closed fill={ZONA} opacity={0.88} stroke={LINEA} strokeWidth={G} />
      {/* Tiro libre */}
      <Line points={L(arco(7.5, 5.8, 1.8, 0, 180))} stroke={LINEA} strokeWidth={G} />
      <Line points={L(arco(7.5, 5.8, 1.8, 180, 360))} stroke={LINEA} strokeWidth={G} dash={[0.3, 0.25]} />
      {/* No carga */}
      <Line points={L(arco(7.5, vAro, 1.25, 0, 180))} stroke={LINEA} strokeWidth={G} />
      {/* Tablero y aro */}
      <Line points={L([[6.6, 1.2], [8.4, 1.2]])} stroke={LINEA} strokeWidth={0.14} />
      <Circle x={ax} y={ay} radius={0.23} stroke="#fc6401" strokeWidth={0.09} />
    </Group>
  );
}

/** Carga una imagen del propio dominio (para el escudo). */
function useImagen(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

export default function Pista() {
  const escudo = useImagen("/marca/escudo.png");
  const completa = true;
  const ancho = completa ? 28 : 15;
  const alto = completa ? 15 : 14;
  const proporcion = escudo ? escudo.width / escudo.height : 0.93;

  // Mitad izquierda: el fondo (v=0) es x=0; mitad derecha, reflejada.
  const izq: T = (u, v) => [v, u];
  const der: T = (u, v) => [28 - v, u];
  const vertical: T = (u, v) => [u, v];

  const hEscudo = completa ? 2.9 : 1.55;
  const cEscudo = completa ? { x: 14, y: 7.5 } : { x: 7.5, y: 13.05 };

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={ancho} height={alto} fill={SUELO} />
      {completa ? (
        <>
          <MediaPista t={izq} />
          <MediaPista t={der} />
          <Line points={[14, 0, 14, 15]} stroke={LINEA} strokeWidth={G} />
          <Circle x={14} y={7.5} radius={1.8} fill="#ffffff" opacity={0.35} />
          <Circle x={14} y={7.5} radius={1.8} stroke={LINEA} strokeWidth={G} />
        </>
      ) : (
        <>
          <MediaPista t={vertical} />
          <Line points={aplicar(vertical, arco(7.5, 14, 1.8, 180, 360))} stroke={LINEA} strokeWidth={G} />
        </>
      )}
      {escudo && (
        <KImage
          image={escudo}
          x={cEscudo.x - (hEscudo * proporcion) / 2}
          y={cEscudo.y - hEscudo / 2}
          width={hEscudo * proporcion}
          height={hEscudo}
          opacity={0.95}
        />
      )}
      <Rect x={0} y={0} width={ancho} height={alto} stroke={LINEA} strokeWidth={G * 1.6} />
    </Group>
  );
}
