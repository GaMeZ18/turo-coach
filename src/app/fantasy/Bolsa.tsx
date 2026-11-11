import { pts } from "./ui";

/** Gráfica tipo bolsa del precio (línea con área), en verde si sube y en rojo si baja */
export function GraficaPrecio({ datos }: { datos: { etiqueta: string; precio: number }[] }) {
  if (datos.length < 2) return <p className="py-6 text-center text-sm fx-suave">Aún no hay suficiente historial.</p>;
  const W = 340, H = 150, PX = 26, PY = 14;
  const min = Math.min(...datos.map((d) => d.precio)) - 1, max = Math.max(...datos.map((d) => d.precio)) + 1;
  const x = (i: number) => PX + (i * (W - PX - 8)) / (datos.length - 1);
  const y = (v: number) => PY + (H - 2 * PY) * (1 - (v - min) / (max - min || 1));
  const sube = datos[datos.length - 1].precio >= datos[0].precio;
  const color = sube ? "#22c55e" : "#ef4444";
  const linea = datos.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.precio).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(datos.length - 1).toFixed(1)},${H - PY} L${x(0).toFixed(1)},${H - PY} Z`;
  const marcas = [min + 1, Math.round((min + max) / 2), max - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label="Evolución del precio">
      <defs>
        <linearGradient id="fx-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {marcas.map((v) => (
        <g key={v}>
          <line x1={PX} x2={W - 4} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity=".08" />
          <text x={PX - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#9aa8cf">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#fx-area)" />
      <path d={linea} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {datos.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.precio)} r={i === datos.length - 1 ? 4.5 : 2.5} fill={i === datos.length - 1 ? color : "#0b1122"} stroke={color} strokeWidth="1.5" />
          {(datos.length <= 8 || i % Math.ceil(datos.length / 8) === 0 || i === datos.length - 1) && (
            <text x={x(i)} y={H + 10} textAnchor="middle" fontSize="9" fill="#9aa8cf">{d.etiqueta}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Barras de puntos fantasy por jornada (verdes en positivo, rojas en negativo) */
export function BarrasPuntos({ datos }: { datos: { etiqueta: string; puntos: number | null }[] }) {
  if (!datos.length) return null;
  const W = 340, H = 110, PX = 8, base = 70;
  const max = Math.max(1, ...datos.map((d) => Math.abs(d.puntos ?? 0)));
  const ancho = (W - 2 * PX) / datos.length;
  const alto = (v: number) => (Math.abs(v) / max) * (v >= 0 ? base - 12 : H - base - 22);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Puntos por jornada">
      <line x1={PX} x2={W - PX} y1={base} y2={base} stroke="#ffffff" strokeOpacity=".2" />
      {datos.map((d, i) => {
        const v = d.puntos;
        const cx = PX + i * ancho + ancho / 2, w = Math.min(26, ancho * 0.62);
        return (
          <g key={i}>
            {v === null ? <text x={cx} y={base - 4} textAnchor="middle" fontSize="9" fill="#9aa8cf">–</text> : (
              <>
                <rect x={cx - w / 2} y={v >= 0 ? base - alto(v) : base} width={w} height={Math.max(1.5, alto(v))} rx="3" fill={v >= 0 ? "#22c55e" : "#ef4444"} />
                <text x={cx} y={v >= 0 ? base - alto(v) - 3 : base + alto(v) + 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#f1f4ff">{pts(v)}</text>
              </>
            )}
            <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" fill="#9aa8cf">{d.etiqueta}</text>
          </g>
        );
      })}
    </svg>
  );
}
