// Biblioteca inicial de ejercicios del CB Turó (la carga el coordinador desde /biblioteca).
// Cada ejercicio trae su pizarra montada con un pequeño "lenguaje" de posiciones y pasos.
import type { AccionBalon, Elemento, Fotograma, Movimiento, Pizarra, TipoTrazo, Vista } from "@/components/pizarra/modelo";
import { AROS, COLOR_DEFECTO } from "@/components/pizarra/modelo";
import { EDADES } from "./edades";

type P = [number, number];
type Paso = {
  m?: [string, TipoTrazo, ...P[]][]; // [id, tipo, punto, punto…] (desde donde está)
  pase?: [string, string];           // [de, a]
  tiro?: string;                     // quien tira
  mano?: [string, string];           // mano a mano
};
type Montaje = {
  vista?: Vista;
  at?: Record<string, P>;   // atacantes: "1": [x, y]
  df?: Record<string, P>;   // defensores
  conos?: P[];
  aros?: P[];
  entrenador?: P;
  balon?: string;           // atacante que empieza con balón
  balones?: string[];       // varios balones (uno por atacante)
  pasos?: Paso[];
};

/** Construye una pizarra v3 a partir del montaje */
export function montar(m: Montaje): Pizarra {
  const elementos: Elemento[] = [];
  const inicial: Pizarra["inicial"] = {};
  const poseedor: Pizarra["poseedor"] = {};
  for (const [k, p] of Object.entries(m.at ?? {})) { elementos.push({ id: `a${k}`, tipo: "atacante", etiqueta: k, color: COLOR_DEFECTO.atacante }); inicial[`a${k}`] = { x: p[0], y: p[1] }; }
  for (const [k, p] of Object.entries(m.df ?? {})) { elementos.push({ id: `d${k}`, tipo: "defensor", etiqueta: k, color: COLOR_DEFECTO.defensor }); inicial[`d${k}`] = { x: p[0], y: p[1] }; }
  (m.conos ?? []).forEach((p, i) => { elementos.push({ id: `c${i}`, tipo: "cono", etiqueta: "", color: COLOR_DEFECTO.cono }); inicial[`c${i}`] = { x: p[0], y: p[1] }; });
  (m.aros ?? []).forEach((p, i) => { elementos.push({ id: `r${i}`, tipo: "aro", etiqueta: "", color: COLOR_DEFECTO.aro }); inicial[`r${i}`] = { x: p[0], y: p[1] }; });
  if (m.entrenador) { elementos.push({ id: "e", tipo: "entrenador", etiqueta: "E", color: COLOR_DEFECTO.entrenador }); inicial.e = { x: m.entrenador[0], y: m.entrenador[1] }; }
  const conBalon = m.balones ?? (m.balon ? [m.balon] : []);
  conBalon.forEach((j, i) => {
    const id = `b${i}`;
    elementos.push({ id, tipo: "balon", etiqueta: "", color: COLOR_DEFECTO.balon });
    const p = inicial[`a${j}`] ?? inicial[j] ?? { x: 20, y: 7.5 };
    inicial[id] = { x: p.x + 0.4, y: p.y + 0.4 };
    poseedor[id] = inicial[`a${j}`] ? `a${j}` : j;
  });

  // Pasos → fotogramas, siguiendo quién tiene cada balón
  const pos: Record<string, P> = Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, [v.x, v.y] as P]));
  const tiene = { ...poseedor };
  const id = (k: string) => (pos[`a${k}`] ? `a${k}` : pos[`d${k}`] ? `d${k}` : k);
  const fotogramas: Fotograma[] = (m.pasos ?? []).map((paso) => {
    const movimientos: Movimiento[] = (paso.m ?? []).map(([quien, tipo, ...pts]) => {
      const e = id(quien);
      const desde = pos[e];
      const puntos = [desde[0], desde[1], ...pts.flat()];
      pos[e] = pts[pts.length - 1];
      return { elementoId: e, tipo, puntos };
    });
    const balon: AccionBalon[] = [];
    const balonDe = (j: string) => Object.keys(tiene).find((b) => tiene[b] === j);
    if (paso.pase || paso.mano) {
      const [de, a] = (paso.pase ?? paso.mano)!;
      const b = balonDe(id(de));
      if (b) { balon.push({ balon: b, tipo: "pase", de: id(de), a: id(a), ...(paso.mano ? { mano: true } : {}) }); tiene[b] = id(a); }
    }
    if (paso.tiro) {
      const b = balonDe(id(paso.tiro));
      const aro = (m.vista ?? "ofensiva") === "defensiva" ? AROS[0] : AROS[1];
      if (b) { balon.push({ balon: b, tipo: "tiro", de: id(paso.tiro), destino: aro }); tiene[b] = null; }
    }
    return { movimientos, balon };
  });

  return {
    version: 3, vista: m.vista ?? "ofensiva", elementos, inicial, poseedor, fotogramas,
    capturas: [], dibujos: [], config: { tamano: 1, velocidad: 1 },
  };
}

export type EjercicioSemilla = {
  titulo: string;
  tipo?: "ejercicio" | "sistema";
  categoria: string;
  edades: string[];
  duracion: number;
  jugadores: number;
  material?: string;
  descripcion: string;
  correcciones: string;
  etiquetas: string[];
  montaje: Montaje;
};

// Puntos habituales en media pista (x de 14 a 28, canasta en x = 26.4)
const BASE: P = [19.2, 7.5], ALA_I: P = [21, 2.6], ALA_D: P = [21, 12.4], ESQ_I: P = [27, 1], ESQ_D: P = [27, 14];
const POSTE_I: P = [25.6, 5.4], POSTE_D: P = [25.6, 9.6], CODO_I: P = [22.6, 5.6], CODO_D: P = [22.6, 9.4], MEDIO: P = [14.6, 7.5];
const ARO: P = [26.4, 7.5];

const TODAS = EDADES;
const FORMACION = ["Mini", "Infantil", "Cadete"];
const MAYORES = ["Cadete", "Junior", "Sénior"];

export const SEMILLA: EjercicioSemilla[] = [
  // ---------- Calentamiento ----------
  {
    titulo: "Rueda de entradas por ambos lados", categoria: "Calentamiento", edades: TODAS, duracion: 8, jugadores: 8, material: "2 balones",
    descripcion: "Dos filas en medio campo, una en cada ala. La fila con balón bota hacia canasta y hace entrada; la otra fila coge el rebote y pasa a la siguiente de la fila contraria. Cada jugador cambia de fila tras su acción. A los 2 minutos se cambia al lado contrario (entrada con la otra mano).",
    correcciones: "Último bote fuerte y largo · Pie contrario a la mano de tiro · Mirar el cuadrado del tablero · Ritmo continuo, sin parar la rueda",
    etiquetas: ["entrada", "calentamiento", "rueda"],
    montaje: { at: { "1": [16, 12.5], "2": [16, 2.5] }, balon: "1", pasos: [{ m: [["1", "botar", [21, 11], [25.6, 9]]], tiro: "1" }, { m: [["2", "correr", [23, 5], [26.6, 6.5]]] }] },
  },
  {
    titulo: "Pase y sigue en triángulo", categoria: "Calentamiento", edades: TODAS, duracion: 6, jugadores: 6, material: "1-2 balones",
    descripcion: "Tres filas formando un triángulo (base y dos alas). El jugador pasa y sigue su pase, ocupando el final de la fila a la que ha pasado. Se puede añadir un segundo balón cuando la rueda sea fluida.",
    correcciones: "Pase de pecho tenso, a la mano exterior · Pedir el balón con las manos · Recibir con los pies preparados (triple amenaza)",
    etiquetas: ["pase", "calentamiento"],
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I }, balon: "1", pasos: [{ pase: ["1", "2"], m: [["1", "correr", [20.5, 11.8]]] }, { pase: ["2", "3"], m: [["2", "correr", [21, 3.2]]] }] },
  },
  {
    titulo: "Movilidad y bote en conos", categoria: "Calentamiento", edades: FORMACION, duracion: 8, jugadores: 6, material: "1 balón por jugador, 6 conos",
    descripcion: "Circuito de conos en zigzag. Cada jugador lo recorre botando: cambio por delante en cada cono a la ida y por detrás de la espalda a la vuelta. Al final, entrada a canasta.",
    correcciones: "Cabeza arriba · Bote bajo al cambiar de dirección · Proteger con el cuerpo y el brazo libre",
    etiquetas: ["bote", "conos", "coordinación"],
    montaje: { conos: [[16.5, 4], [18.5, 7], [20.5, 4], [22.5, 7]], at: { "1": [14.8, 6.5] }, balon: "1", pasos: [{ m: [["1", "botar", [16.5, 5.2], [18.5, 5.8], [20.5, 5.2], [22.5, 5.8], [25.5, 6.6]]], tiro: "1" }] },
  },

  // ---------- Fundamentos / bote ----------
  {
    titulo: "Bote en zigzag con defensor pasivo", categoria: "Bote", edades: FORMACION, duracion: 10, jugadores: 6, material: "1 balón por pareja",
    descripcion: "Por parejas en todo el campo. El atacante bota en zigzag de banda a banda y el defensor le acompaña en desplazamiento lateral, sin robar. En cada cambio de dirección, el atacante cambia de mano protegiendo el balón. Al llegar al fondo, cambian los papeles.",
    correcciones: "Atacante: cambio con el cuerpo entre balón y defensor · Defensor: no cruzar pies, mantener distancia de un brazo",
    etiquetas: ["bote", "cambio de mano", "defensa individual"],
    montaje: { vista: "completa", at: { "1": [2, 2] }, df: { "1": [3.2, 3] }, balon: "1", pasos: [{ m: [["1", "botar", [6, 12], [10, 3], [14, 12]], ["1", "correr", [7, 11], [11, 4], [15, 11]]] }] },
  },
  {
    titulo: "Cambios de ritmo y de dirección (1c0)", categoria: "Bote", edades: TODAS, duracion: 8, jugadores: 8, material: "1 balón por jugador, conos",
    descripcion: "Fila en medio campo. Bote hasta el cono a media velocidad, cambio de ritmo explosivo (2 botes rápidos), cambio de dirección (por delante, entre piernas o reverso según nivel) y entrada o tiro tras bote.",
    correcciones: "Bajar el centro de gravedad antes del cambio · Primer bote tras el cambio largo y hacia delante · Vender el cambio con hombros y mirada",
    etiquetas: ["bote", "cambio de ritmo", "1c0"],
    montaje: { conos: [[20.5, 9]], at: { "1": [15, 11] }, balon: "1", pasos: [{ m: [["1", "botar", [20, 9.6]]] }, { m: [["1", "botar", [22.5, 7.5], [25.6, 6.8]]], tiro: "1" }] },
  },
  {
    titulo: "Paradas en uno y dos tiempos", categoria: "Fundamentos", edades: ["Mini", "Infantil"], duracion: 8, jugadores: 8, material: "1 balón por jugador",
    descripcion: "Los jugadores botan por el campo y a la señal del entrenador hacen una parada: un tiempo (los dos pies a la vez) o dos tiempos (derecha-izquierda). Tras la parada, pivotan y pasan al entrenador, que les devuelve el balón.",
    correcciones: "Caer equilibrado, rodillas flexionadas · No arrastrar el pie de pivote · Balón protegido junto al pecho",
    etiquetas: ["paradas", "pivote", "reglamento", "mini"],
    montaje: { entrenador: [24, 7.5], at: { "1": [16, 3], "2": [16, 7.5], "3": [16, 12] }, balones: ["1", "2", "3"], pasos: [{ m: [["1", "botar", [20, 3.5]], ["2", "botar", [20, 7.5]], ["3", "botar", [20, 11.5]]] }] },
  },
  {
    titulo: "Pivotes y salidas en triple amenaza", categoria: "Fundamentos", edades: FORMACION, duracion: 10, jugadores: 6, material: "1 balón por jugador",
    descripcion: "El jugador recibe en el ala de cara a canasta y practica las salidas: directa, cruzada y finta de tiro + salida. Después añadir un defensor que da distancias para que el atacante lea qué salida usar.",
    correcciones: "Recibir ya en triple amenaza (balón en cadera, pies paralelos) · Primer paso largo y bajo, pasando la cadera del defensor · No botar antes de mover el pie",
    etiquetas: ["triple amenaza", "salidas", "pivote"],
    montaje: { at: { "1": ALA_D, "2": BASE }, df: { "1": [22.2, 11.6] }, balon: "2", pasos: [{ m: [["1", "correr", [22.5, 13], [21, 12.4]]], pase: ["2", "1"] }, { m: [["1", "botar", [24, 10.5], [25.6, 9]]], tiro: "1" }] },
  },

  // ---------- Pase ----------
  {
    titulo: "Pase en movimiento a 2 (todo el campo)", categoria: "Pase", edades: TODAS, duracion: 8, jugadores: 6, material: "1 balón por pareja",
    descripcion: "Por parejas, separados unos 4 metros, corren todo el campo pasándose el balón sin botar y terminan con entrada. Volver por el otro lado. Variante: solo pase picado o pase de una mano.",
    correcciones: "Pase por delante del compañero (que no tenga que frenar) · Recibir y pasar en el mismo movimiento · Comunicación: nombre o palmada",
    etiquetas: ["pase", "transición", "entrada"],
    montaje: { vista: "completa", at: { "1": [1.5, 4.5], "2": [1.5, 10.5] }, balon: "1", pasos: [{ m: [["1", "correr", [8, 4.5]], ["2", "correr", [8, 10.5]]], pase: ["1", "2"] }, { m: [["1", "correr", [16, 4.5]], ["2", "correr", [16, 10.5]]], pase: ["2", "1"] }, { m: [["1", "correr", [22, 5.5], [26, 7]]], tiro: "1" }] },
  },
  {
    titulo: "Rondo de pase 4c2", categoria: "Pase", edades: TODAS, duracion: 8, jugadores: 6, material: "1 balón, 4 conos",
    descripcion: "Cuadrado de 6×6 m con un atacante en cada lado y dos defensores dentro. Los atacantes no pueden botar ni pasar al compañero de al lado dos veces seguidas. Si un defensor toca el balón, cambia con el atacante que ha fallado.",
    correcciones: "Fintar antes de pasar · Pase picado o por encima según la posición del defensor · Moverse para ofrecer línea de pase",
    etiquetas: ["pase", "rondo", "toma de decisiones"],
    montaje: { conos: [[17, 4.5], [17, 10.5], [23, 4.5], [23, 10.5]], at: { "1": [17, 7.5], "2": [20, 4.5], "3": [23, 7.5], "4": [20, 10.5] }, df: { "1": [19, 7], "2": [21, 8] }, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }] },
  },
  {
    titulo: "Pase al poste y corte", categoria: "Pase", edades: ["Infantil", "Cadete", "Junior", "Sénior"], duracion: 10, jugadores: 6, material: "2 balones",
    descripcion: "Fila en el ala y un jugador en el poste bajo. El ala pasa al poste (pase picado o por encima) y corta por la línea de fondo o por el medio; el poste le devuelve el balón para tiro o entrada. Rotación: ala → poste → fila.",
    correcciones: "El poste pide con la mano lejana y sella al defensor · Pase al lado contrario de la defensa · Cortar fuerte tras el pase, cambiando de ritmo",
    etiquetas: ["pase al poste", "corte", "juego interior"],
    montaje: { at: { "1": ALA_D, "2": POSTE_D }, balon: "1", pasos: [{ pase: ["1", "2"] }, { m: [["1", "correr", [24, 10.8], [26, 9.3]]], pase: ["2", "1"] }, { tiro: "1" }] },
  },

  // ---------- Tiro ----------
  {
    titulo: "Tiro en 5 posiciones (con pasador)", categoria: "Tiro", edades: TODAS, duracion: 10, jugadores: 6, material: "1 balón por trío, 5 conos",
    descripcion: "Tríos: tirador, pasador y reboteador. El tirador tira desde 5 conos alrededor de la zona (esquina, ala, frontal, ala, esquina) y sale al siguiente tras cada tiro. Cada tirador hace 2 vueltas; se anota cuántas mete. Distancia según la edad.",
    correcciones: "Pies preparados antes de recibir · Codo debajo del balón y muñeca relajada · Mantener el brazo arriba al terminar (cuello de cisne)",
    etiquetas: ["tiro", "concurso", "mecánica"],
    montaje: { conos: [[26.8, 2.5], [23, 3], [21.8, 7.5], [23, 12], [26.8, 12.5]], at: { "1": [26.8, 2.5], "2": [24, 7.5] }, balon: "2", pasos: [{ pase: ["2", "1"] }, { tiro: "1" }, { m: [["1", "correr", [23, 3]]] }] },
  },
  {
    titulo: "Tiro tras bote desde el ala", categoria: "Tiro", edades: MAYORES, duracion: 8, jugadores: 6, material: "1 balón por jugador",
    descripcion: "Fila en el ala. Salida con 1-2 botes hacia el centro o hacia la línea de fondo, parada en dos tiempos y tiro de media distancia. Rebote propio y a la fila contraria.",
    correcciones: "Último bote fuerte para frenar · Parada equilibrada, hombros a canasta · Subir en vertical, sin echarse atrás",
    etiquetas: ["tiro tras bote", "media distancia"],
    montaje: { at: { "1": ALA_I }, balon: "1", pasos: [{ m: [["1", "botar", [22.6, 5]]] }, { tiro: "1" }] },
  },
  {
    titulo: "Concurso de tiro libre por parejas", categoria: "Tiro", edades: TODAS, duracion: 6, jugadores: 8, material: "1 balón por canasta",
    descripcion: "Por parejas en cada canasta. Cada jugador tira 2 tiros libres seguidos y cambia. Gana la pareja que llegue antes a 10 canastas. Ideal al final de un bloque intenso, con pulsaciones altas.",
    correcciones: "Rutina siempre igual (botes, respiración) · Pie del lado de tiro en el centro de la línea · Terminar con la mano dentro del aro",
    etiquetas: ["tiro libre", "concurso", "rutina"],
    montaje: { at: { "1": [22.2, 7.5], "2": [24.5, 9.3] }, balon: "1", pasos: [{ tiro: "1" }] },
  },
  {
    titulo: "Mikan (finalizaciones cerca del aro)", categoria: "Tiro", edades: TODAS, duracion: 5, jugadores: 1, material: "1 balón por jugador",
    descripcion: "Debajo de canasta, el jugador hace bandejas alternando lado derecho (mano derecha) e izquierdo (mano izquierda) sin dejar que el balón toque el suelo. 30 segundos por serie, contando canastas. Variantes: Mikan de reverso, con pie contrario.",
    correcciones: "Usar el tablero · Balón siempre por encima de los hombros · Coordinar pie y mano contrarios",
    etiquetas: ["finalización", "mano débil", "individual"],
    montaje: { at: { "1": [26.2, 6.2] }, balon: "1", pasos: [{ tiro: "1", m: [["1", "correr", [26.2, 8.8]]] }] },
  },

  // ---------- Ataque ----------
  {
    titulo: "1c1 desde el ala con lectura", categoria: "Ataque", edades: TODAS, duracion: 12, jugadores: 6, material: "1 balón",
    descripcion: "Atacante en el ala, defensor en el medio de la zona. El entrenador pasa desde el frontal; el defensor sale a defender al recibir (closeout). El atacante lee: si el defensor llega tarde, tira; si llega encima, ataca el lado del pie adelantado. Se juega hasta canasta o robo, y el defensor pasa a atacar.",
    correcciones: "Atacante: recibir en triple amenaza, leer la distancia · Defensor: llegar con pasos cortos al final y la mano alta · Ganar la línea de fondo o el medio según el pie",
    etiquetas: ["1c1", "closeout", "toma de decisiones"],
    montaje: { entrenador: BASE, at: { "1": ALA_D }, df: { "1": [24, 8.5] }, pasos: [{ m: [["d1", "correr", [22.2, 11.4]]] }, { m: [["1", "botar", [24.5, 13], [26, 10]]] }] },
  },
  {
    titulo: "2c1 en continuidad", categoria: "Ataque", edades: TODAS, duracion: 10, jugadores: 9, material: "1 balón",
    descripcion: "Dos atacantes salen desde medio campo contra un defensor que espera en la zona. Tras finalizar, el defensor y el que ha anotado atacan hacia el otro lado contra un nuevo defensor. El balón no se para.",
    correcciones: "El de balón ataca al defensor para fijarlo · El otro abre la distancia (no se esconde detrás) · Pasar cuando el defensor se compromete",
    etiquetas: ["superioridad", "2c1", "toma de decisiones"],
    montaje: { at: { "1": [15, 5.5], "2": [15, 10] }, df: { "1": [23, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [21.5, 6.5]], ["2", "correr", [22, 12]]], }, { m: [["d1", "correr", [22.6, 7]]], pase: ["1", "2"] }, { m: [["2", "correr", [25.5, 9.5]]], tiro: "2" }] },
  },
  {
    titulo: "3c2 y vuelta 2c1", categoria: "Ataque", edades: TODAS, duracion: 12, jugadores: 9, material: "1 balón",
    descripcion: "Tres atacantes contra dos defensores en tándem. Cuando termina la jugada, los dos defensores y el que ha tirado atacan al otro campo 2c1 contra el defensor que espera. Rotación continua en tríos.",
    correcciones: "Ocupar carriles: centro y dos laterales · Pasar al lado del defensor que salta · Defensa en tándem: el de arriba frena, el de abajo coge al primer pase",
    etiquetas: ["superioridad", "3c2", "transición"],
    montaje: { vista: "completa", at: { "1": [10, 7.5], "2": [10, 2.5], "3": [10, 12.5] }, df: { "1": [20.5, 7.5], "2": [24.5, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [19, 7.5]], ["2", "correr", [21, 2.8]], ["3", "correr", [21, 12.2]]] }, { m: [["d1", "correr", [20.6, 7.5]], ["d2", "correr", [23.5, 4.5]]], pase: ["1", "3"] }, { m: [["3", "botar", [25.5, 9.5]]], tiro: "3" }] },
  },
  {
    titulo: "Bloqueo directo: lectura del defensor", categoria: "Ataque", edades: MAYORES, duracion: 15, jugadores: 4, material: "1 balón",
    descripcion: "2c2 en el lado derecho: base con balón y bloqueador en la zona alta. El bloqueador pone el bloqueo directo y continúa (pick and roll) o abre (pick and pop) según cómo defiendan: si cambian, ataca el desajuste; si el defensor del bloqueador sale fuerte, el bloqueador continúa hacia el aro.",
    correcciones: "Bloqueo con el cuerpo perpendicular a la trayectoria del defensor · El base espera al bloqueo y pasa hombro con hombro · Pase picado al que continúa",
    etiquetas: ["bloqueo directo", "pick and roll", "2c2"],
    montaje: { at: { "1": [19.2, 9.5], "5": [22.6, 9] }, df: { "1": [20.3, 9.8], "5": [23.5, 8.5] }, balon: "1", pasos: [{ m: [["5", "bloqueo", [20.6, 10.6]]] }, { m: [["1", "botar", [21, 12.5], [22.6, 11.5]], ["5", "correr", [25.4, 8.6]]] }, { pase: ["1", "5"] }] },
  },
  {
    titulo: "Pasar y cortar (dar y seguir) 3c3", categoria: "Ataque", edades: FORMACION, duracion: 12, jugadores: 6, material: "1 balón",
    descripcion: "3c3 en media pista con una sola regla: el que pasa corta hacia canasta, y los otros reemplazan su sitio. Prohibido botar más de 2 veces. Se juega a 3 canastas.",
    correcciones: "Cortar delante del defensor si se queda mirando el balón · Reemplazar rápido el hueco · Pasar al cortador antes de que lo cubran",
    etiquetas: ["pasar y cortar", "juego sin balón", "3c3"],
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I }, df: { "1": [20.4, 7.5], "2": [22.2, 11.6], "3": [22.2, 3.4] }, balon: "1", pasos: [{ pase: ["1", "2"] }, { m: [["1", "correr", [24, 8.5], [26, 8.5]], ["3", "correr", [19.5, 6]]] }, { pase: ["2", "1"] }, { tiro: "1" }] },
  },
  {
    titulo: "Puerta atrás ante sobremarcaje", categoria: "Ataque", edades: ["Infantil", "Cadete", "Junior", "Sénior"], duracion: 10, jugadores: 6, material: "1 balón",
    descripcion: "Pasador en la base, atacante en el ala con defensor negando la línea de pase. Si el defensor niega, el atacante amaga salir y corta por detrás hacia el aro (puerta atrás); el pasador le da un pase picado. Si el defensor no niega, recibe arriba y juega 1c1.",
    correcciones: "Llevar al defensor 1-2 pasos hacia fuera antes de cortar · Cambio de ritmo explosivo · Pedir con la mano interior",
    etiquetas: ["puerta atrás", "corte", "juego sin balón"],
    montaje: { at: { "1": BASE, "2": ALA_D }, df: { "2": [21.5, 11.2] }, balon: "1", pasos: [{ m: [["2", "correr", [20.2, 12.8]]] }, { m: [["2", "correr", [24, 11.5], [26, 9]]], pase: ["1", "2"] }, { tiro: "2" }] },
  },
  {
    titulo: "Juego interior 1c1 en el poste", categoria: "Ataque", edades: MAYORES, duracion: 12, jugadores: 4, material: "1 balón",
    descripcion: "Interior en el poste bajo con defensor por detrás; pasador en el ala. El interior sella, recibe y juega: giro hacia el fondo, giro hacia el centro o pase de vuelta si llega la ayuda. Cambios de rol cada 3 posesiones.",
    correcciones: "Sellar con el culo y los brazos anchos · Recibir con dos manos y mirar por encima del hombro · Primer movimiento con un bote como máximo",
    etiquetas: ["poste bajo", "juego interior", "1c1"],
    montaje: { at: { "4": POSTE_D, "2": ALA_D }, df: { "4": [25, 8.6] }, balon: "2", pasos: [{ pase: ["2", "4"] }, { m: [["4", "botar", [26.3, 9]]], tiro: "4" }] },
  },
  {
    titulo: "Ataque a zona 2-3: ocupar los huecos", categoria: "Ataque", edades: MAYORES, duracion: 15, jugadores: 10, material: "1 balón",
    descripcion: "5c5 con la defensa en zona 2-3. El ataque se coloca en 1-3-1 (base, dos alas, un poste alto y uno bajo) para quedarse entre defensores. Regla: el balón tiene que pasar por el poste alto antes de tirar. Después, libre.",
    correcciones: "Recibir en los huecos entre dos defensores · Fintar pase para mover la zona · El poste alto se gira y mira al aro",
    etiquetas: ["ataque a zona", "zona 2-3", "5c5"],
    montaje: { at: { "1": BASE, "2": [21, 11.5], "3": [21, 3.5], "4": [22.8, 7.5], "5": [26.8, 12.5] }, df: { "1": [21.5, 9], "2": [21.5, 6], "3": [25.5, 11], "4": [25.5, 4], "5": [25.6, 7.5] }, balon: "1", pasos: [{ pase: ["1", "4"] }, { pase: ["4", "5"] }, { tiro: "5" }] },
  },

  // ---------- Defensa ----------
  {
    titulo: "Desplazamientos defensivos en zigzag", categoria: "Defensa", edades: TODAS, duracion: 8, jugadores: 10, material: "Conos",
    descripcion: "Los jugadores recorren el campo en desplazamiento lateral de cono a cono (zigzag), con cambio de dirección con pivote de cadera. Primero sin atacante; después con un atacante que bota en zigzag a media velocidad.",
    correcciones: "Posición baja, espalda recta, peso en la parte delantera de los pies · No juntar ni cruzar los pies · Manos activas",
    etiquetas: ["desplazamiento", "defensa individual", "físico"],
    montaje: { vista: "completa", conos: [[4, 2], [8, 12], [12, 2], [16, 12], [20, 2]], df: { "1": [1.5, 6] }, pasos: [{ m: [["d1", "correr", [4, 2.5], [8, 11.5], [12, 2.5], [16, 11.5]]] }] },
  },
  {
    titulo: "Closeout + 1c1", categoria: "Defensa", edades: TODAS, duracion: 10, jugadores: 6, material: "1 balón",
    descripcion: "El defensor empieza debajo del aro con el balón y pasa al atacante del ala o la esquina. Sale a defender (closeout) y se juega 1c1 a una posesión. El defensor no puede dejarle tirar cómodo ni dejarse superar por el bote.",
    correcciones: "Sprint los primeros metros y pasos cortos al final · Mano alta hacia el balón · Cerrar el lado fuerte (línea de fondo o centro, según el sistema)",
    etiquetas: ["closeout", "1c1", "defensa individual"],
    montaje: { at: { "1": ESQ_D }, df: { "1": [26.4, 8] }, balon: "d1", pasos: [{ pase: ["d1", "1"] }, { m: [["d1", "correr", [26.5, 12.8]]] }] },
  },
  {
    titulo: "Ayuda y recuperación 2c2", categoria: "Defensa", edades: ["Infantil", "Cadete", "Junior", "Sénior"], duracion: 12, jugadores: 8, material: "1 balón",
    descripcion: "2c2 con un atacante en el ala y otro en el lado contrario. El defensor del lado débil se coloca en posición de ayuda (pistola: ve balón y hombre). Cuando el atacante penetra, ayuda; si hay pase, recupera a su hombre.",
    correcciones: "Lado débil: un pie en la zona, ver balón y hombre · Parar la penetración antes del aro · Recuperar con closeout, sin saltar a la finta",
    etiquetas: ["ayudas", "lado débil", "2c2"],
    montaje: { at: { "1": ALA_D, "2": ALA_I }, df: { "1": [22.2, 11.6], "2": [24.2, 6.2] }, balon: "1", pasos: [{ m: [["1", "botar", [24.5, 10]], ["d2", "correr", [25, 8.6]]] }, { pase: ["1", "2"], m: [["d2", "correr", [22.2, 3.6]]] }] },
  },
  {
    titulo: "Negar la línea de pase", categoria: "Defensa", edades: MAYORES, duracion: 8, jugadores: 6, material: "1 balón",
    descripcion: "Entrenador con balón en la base, atacante intentando recibir en el ala. El defensor niega con la mano en la línea de pase y el pecho hacia el atacante. Si el atacante corta por detrás, el defensor gira la cabeza y cambia la mano. 30 segundos por turno.",
    correcciones: "Brazo extendido y palma hacia el balón · Ver balón y hombre a la vez · Ante la puerta atrás, abrir y no perder la posición",
    etiquetas: ["negación", "defensa individual", "anticipación"],
    montaje: { entrenador: BASE, at: { "2": ALA_D }, df: { "2": [21.2, 11.3] }, pasos: [{ m: [["2", "correr", [23, 13], [20.4, 13]], ["d2", "correr", [22.4, 12], [20.8, 12.2]]] }] },
  },
  {
    titulo: "Rebote defensivo: bloqueo y salida (box out)", categoria: "Rebote", edades: TODAS, duracion: 10, jugadores: 6, material: "1 balón",
    descripcion: "Tres parejas alrededor de la zona. El entrenador tira; cada defensor localiza a su atacante, le bloquea con la espalda y después va a por el balón. Si coge el rebote, sale botando o con pase de salida hacia la banda.",
    correcciones: "Primero contacto, después balón · Pivotar y poner el culo en el atacante · Coger con dos manos arriba y proteger el balón",
    etiquetas: ["rebote", "bloqueo de rebote", "transición"],
    montaje: { entrenador: BASE, at: { "1": [22, 11], "2": [22, 4], "3": [24, 7.5] }, df: { "1": [23.3, 10.3], "2": [23.3, 4.7], "3": [25, 7.5] }, pasos: [{ m: [["1", "correr", [24, 10]], ["d1", "correr", [24.7, 9.5]]] }] },
  },
  {
    titulo: "Rebote ofensivo: ganar la posición", categoria: "Rebote", edades: MAYORES, duracion: 8, jugadores: 6, material: "1 balón",
    descripcion: "Como el ejercicio de rebote defensivo, pero puntúa el atacante: 2 puntos si coge el rebote y 1 si palmea. Movimientos para evitar el bloqueo: giro, finta y paso, o entrar por el lado contrario.",
    correcciones: "Moverse antes de que te bloqueen · Seguir el tiro: el rebote va al lado contrario · Atacar el balón en su punto más alto",
    etiquetas: ["rebote ofensivo", "segunda opción"],
    montaje: { entrenador: [22, 3], at: { "4": [23.5, 9.6] }, df: { "4": [25, 9] }, pasos: [{ m: [["4", "correr", [24.3, 11], [26.2, 10]]] }] },
  },

  // ---------- Transición ----------
  {
    titulo: "Salida rápida tras rebote: 3 carriles", categoria: "Transición", edades: TODAS, duracion: 10, jugadores: 9, material: "1 balón por trío",
    descripcion: "Tríos. El interior coge el rebote y da el pase de salida al base en la banda; el tercero corre por el carril contrario. Llegan al otro campo en 3 carriles y terminan con entrada o tiro. Vuelta en sentido contrario.",
    correcciones: "Pase de salida rápido, sin botar · Correr por los carriles (cerca de las bandas) · El base cruza el centro para fijar",
    etiquetas: ["contraataque", "carriles", "transición"],
    montaje: { vista: "completa", at: { "4": [3, 7.5], "1": [4, 13], "2": [5, 2] }, balon: "4", pasos: [{ pase: ["4", "1"] }, { m: [["1", "botar", [14, 9]], ["2", "correr", [16, 2]], ["4", "correr", [15, 12.5]]] }, { pase: ["1", "2"] }, { m: [["2", "correr", [25.5, 5.8]]], tiro: "2" }] },
  },
  {
    titulo: "Balance defensivo 5c5 con cambio", categoria: "Transición", edades: MAYORES, duracion: 15, jugadores: 10, material: "1 balón",
    descripcion: "5c5 en media pista. Cuando el entrenador grita «¡cambio!», el equipo que defiende sale al contraataque y el que atacaba debe volver a defender (balance). Se cuentan los puntos de contraataque permitidos.",
    correcciones: "Los dos primeros en volver protegen el aro · Comunicar el emparejamiento · Frenar el balón antes del medio campo",
    etiquetas: ["balance defensivo", "transición", "5c5"],
    montaje: { vista: "completa", at: { "1": [20, 7.5], "2": [22, 3], "3": [22, 12], "4": [24, 9], "5": [25, 5] }, df: { "1": [21, 7.5], "2": [23, 3.5], "3": [23, 11.5], "4": [25, 8.8], "5": [25.6, 5.5] }, pasos: [{ m: [["1", "correr", [6, 7.5]], ["2", "correr", [4, 5]], ["d1", "correr", [10, 7.5]]] }] },
  },

  // ---------- Juego reducido ----------
  {
    titulo: "3c3 a una canasta (rey de pista)", categoria: "Juego reducido", edades: TODAS, duracion: 15, jugadores: 9, material: "1 balón",
    descripcion: "Tres equipos de 3. Se juega 3c3 a una canasta; el que anota sigue atacando y el que pierde sale. Si la defensa recupera, tiene que sacar el balón más allá de la línea de 3 antes de atacar. Gana el primer equipo que llegue a 7.",
    correcciones: "Espaciado: no juntarse en el lado del balón · Pasar y cortar · Defensa con ayudas y comunicación",
    etiquetas: ["3c3", "juego reducido", "competición"],
    montaje: { at: { "1": BASE, "2": ALA_D, "3": [25.6, 4] }, df: { "1": [20.3, 7.5], "2": [22.2, 11.6], "3": [25, 5] }, balon: "1" },
  },
  {
    titulo: "4c4 con ventaja inicial", categoria: "Juego reducido", edades: MAYORES, duracion: 15, jugadores: 8, material: "1 balón",
    descripcion: "4c4 en media pista donde el entrenador da el balón a un atacante que ya está con ventaja (su defensor empieza tocando la línea de fondo). El ataque tiene que aprovechar la ventaja con penetración y pase; la defensa tiene que rotar.",
    correcciones: "Ataque: atacar el hueco y pasar al libre · Defensa: rotar al que tiene el balón y tapar el pase extra",
    etiquetas: ["4c4", "ventaja", "rotaciones"],
    montaje: { entrenador: MEDIO, at: { "1": BASE, "2": ALA_D, "3": ALA_I, "4": ESQ_D }, df: { "1": [28, 9], "2": [22, 11.5], "3": [22, 3.5], "4": [26.2, 12.5] }, balon: "1", pasos: [{ m: [["1", "botar", [23.5, 7.5]], ["d1", "correr", [26, 8.5]]] }] },
  },
  {
    titulo: "Partido 5c5 con condicionante", categoria: "Juego reducido", edades: TODAS, duracion: 20, jugadores: 10, material: "1 balón, petos",
    descripcion: "Partido normal con una regla que refuerza el objetivo de la semana. Ejemplos: la canasta vale doble si antes se ha pasado por el poste; solo valen las canastas tras 3 pases; 1 punto extra por rebote ofensivo; el triple vale 4 en los últimos 2 minutos.",
    correcciones: "Elegir una sola regla por partido · Parar poco: corregir en los tiempos muertos",
    etiquetas: ["5c5", "partido", "condicionante"],
    montaje: { vista: "completa", at: { "1": [16, 7.5], "2": [20, 3], "3": [20, 12], "4": [23, 9], "5": [25, 5] }, df: { "1": [17, 7.5], "2": [21, 3.5], "3": [21, 11.5], "4": [24, 8.6], "5": [25.6, 5.5] }, balon: "1" },
  },

  // ---------- Físico / coordinación ----------
  {
    titulo: "Escalera de coordinación + entrada", categoria: "Físico", edades: FORMACION, duracion: 8, jugadores: 8, material: "Escalera o conos, 1 balón",
    descripcion: "Los jugadores pasan la escalera con distintos apoyos (uno en cada hueco, dos en cada hueco, lateral, dentro-fuera). Al salir reciben un pase del entrenador y hacen entrada a canasta.",
    correcciones: "Apoyos rápidos con la parte delantera del pie · Brazos acompañando · Mantener la vista al frente",
    etiquetas: ["coordinación", "velocidad", "entrada"],
    montaje: { conos: [[16, 6.5], [17, 6.5], [18, 6.5], [19, 6.5], [20, 6.5]], entrenador: [23, 11], at: { "1": [15, 6.5] }, pasos: [{ m: [["1", "correr", [21.5, 6.5]]] }, { m: [["1", "correr", [25.5, 6.8]]] }] },
  },
  {
    titulo: "Suicidios con balón", categoria: "Físico", edades: ["Cadete", "Junior", "Sénior"], duracion: 6, jugadores: 10, material: "1 balón por jugador",
    descripcion: "Carrera de ida y vuelta botando: línea de tiro libre, medio campo, tiro libre contrario y fondo, volviendo cada vez a la línea de fondo. Mano derecha a la ida y mano izquierda a la vuelta. 3 series con 1 minuto de descanso.",
    correcciones: "Pararse con los dos pies en cada línea · Cambio de mano al girar · No perder el control del balón por ir rápido",
    etiquetas: ["resistencia", "bote", "físico"],
    montaje: { vista: "completa", at: { "1": [0.5, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [5.8, 7.5], [0.8, 7.8], [14, 7.8], [0.8, 7.2]]] }] },
  },

  // ---------- Sistemas ----------
  {
    titulo: "Sistema «Cuernos» (Horns)", tipo: "sistema", categoria: "Sistema de juego", edades: MAYORES, duracion: 15, jugadores: 5, material: "1 balón",
    descripcion: "Colocación: base arriba, dos interiores en los codos y dos tiradores en las esquinas. El base pasa a un interior y el otro baja a bloquear a la esquina contraria, que sale hacia el ala; o el base usa el bloqueo directo de uno de los dos codos. Opciones: tiro del exterior, continuación del bloqueador, juego por el lado contrario.",
    correcciones: "Espaciado: esquinas abiertas de verdad · Bloqueos con el pie en el suelo, sin moverse · Leer la ayuda del lado débil",
    etiquetas: ["sistema", "horns", "bloqueo directo"],
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": ESQ_I, "3": ESQ_D }, balon: "1", pasos: [{ pase: ["1", "4"] }, { m: [["5", "bloqueo", [25.5, 12]], ["3", "correr", [24.5, 13], [21.5, 12.4]]] }, { pase: ["4", "3"] }, { tiro: "3" }] },
  },
  {
    titulo: "Movimiento «Mano a mano» (handoff) en el ala", tipo: "sistema", categoria: "Sistema de juego", edades: MAYORES, duracion: 12, jugadores: 5, material: "1 balón",
    descripcion: "El base bota hacia el ala y entrega mano a mano al escolta, que sale de la esquina; el base bloquea de manera implícita al defensor. El escolta puede tirar, penetrar o jugar un bloqueo directo con el interior que sube.",
    correcciones: "Entrega a la altura de la cadera, protegiendo el balón · El que recibe pasa pegado (hombro con hombro) · Leer si el defensor pasa por delante o por detrás",
    etiquetas: ["sistema", "mano a mano", "handoff"],
    montaje: { at: { "1": BASE, "2": ESQ_D, "3": ESQ_I, "4": POSTE_I, "5": [22.6, 3] }, balon: "1", pasos: [{ m: [["1", "botar", [21, 11]], ["2", "correr", [24, 13], [21.4, 12.6]]] }, { mano: ["1", "2"] }, { m: [["2", "botar", [23.8, 9.6]]], tiro: "2" }] },
  },
  {
    titulo: "Saque de fondo «Caja» (Box)", tipo: "sistema", categoria: "Sistema de juego", edades: ["Infantil", "Cadete", "Junior", "Sénior"], duracion: 10, jugadores: 5, material: "1 balón",
    descripcion: "Cuatro jugadores en caja dentro de la zona (dos en los codos y dos en los postes bajos); saca el base desde el fondo. Los de abajo bloquean a los de arriba; un tirador sale abierto a la esquina y el bloqueador continúa hacia el aro. Opción final: pase de seguridad al que sale hacia la base.",
    correcciones: "Bloquear y continuar con las manos arriba · El sacador lee la defensa antes de dar la señal · 5 segundos: tener siempre una salida de seguridad",
    etiquetas: ["saque de fondo", "BLOB", "sistema"],
    montaje: { at: { "1": [27.8, 11.8], "2": CODO_D, "3": CODO_I, "4": POSTE_D, "5": POSTE_I }, balon: "1", pasos: [{ m: [["4", "bloqueo", [23.5, 9.4]], ["2", "correr", [25, 11], [27, 13.5]], ["5", "correr", [26, 7]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  },
];
