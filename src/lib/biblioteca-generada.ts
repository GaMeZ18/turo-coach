// Biblioteca del CB Turó · ampliación grande (sobre todo sénior): ejercicios por familias, con variantes que cambian
// de verdad el trabajo (la defensa que hay que leer, la regla del juego, el formato o la acción).
// Cada ejercicio trae SU pizarra (la que cuenta la descripción), con la defensa colocada y moviéndose
// (biblioteca-jugada.ts), y un enlace a vídeos de entrenadores que trabajan lo mismo.
import type { EjercicioSemilla } from "./biblioteca-semilla";
import { yt } from "./biblioteca-sistemas";
import { jugada, posZona, entre, type MontajeJ, type PasoJ, type Zona } from "./biblioteca-jugada";

type P = [number, number];
type Montaje = MontajeJ;
type Pasos = PasoJ[];
type Mov = [string, "correr" | "botar" | "bloqueo", ...P[]];

// ---------------------------------------------------------------------------- posiciones (media pista)
const ARO: P = [26.4, 7.5];
const S = {
  cabeza: [19.4, 7.5] as P, alaD: [21, 12.4] as P, alaI: [21, 2.6] as P, esqD: [27, 14] as P, esqI: [27, 1] as P,
  posteD: [25.6, 9.6] as P, posteI: [25.6, 5.4] as P, codoD: [22.6, 9.4] as P, codoI: [22.6, 5.6] as P,
  baseD: [19.6, 10] as P, baseI: [19.6, 5] as P, tl: [22.2, 7.5] as P, medio: [14.6, 7.5] as P,
};
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Defensor colocado entre su atacante y el aro */
const dfDe = (p: P, d = 1.1): P => entre(p, ARO, d);
const hacia = (p: P, q: P, f: number): P => [r1(p[0] + (q[0] - p[0]) * f), r1(p[1] + (q[1] - p[1]) * f)];
const lado = (p: P) => (p[1] >= 7.5 ? 1 : -1);
/** Punto de finalización junto al aro, por el lado del jugador */
const aroLado = (p: P, f = 1.1): P => [25.7, r1(7.5 + lado(p) * f)];
const corre = (k: string, ...p: P[]): Mov => [k, "correr", ...p];
const bota = (k: string, ...p: P[]): Mov => [k, "botar", ...p];
const bloq = (k: string, p: P): Mov => [k, "bloqueo", p];
/** Dónde queda cada atacante tras unos pasos */
const posTras = (at: Record<string, P>, pasos: Pasos): Record<string, P> => {
  const q = { ...at };
  for (const p of pasos) for (const [k, , ...pts] of p.m ?? []) if (k in q && pts.length) q[k] = pts[pts.length - 1];
  return q;
};

const ADULTOS = ["Junior", "Sénior"];
const MAYORES = ["Cadete", "Junior", "Sénior"];
const DESDE_INF = ["Infantil", "Cadete", "Junior", "Sénior"];

type Base = Omit<EjercicioSemilla, "tipo" | "montaje"> & { montaje: Montaje };
/** Quita de la pizarra los pasos que mencionan a jugadores que no están en la pista */
const sano = (m: EjercicioSemilla["montaje"]): EjercicioSemilla["montaje"] => {
  const at = m.at ?? {}, df = m.df ?? {};
  const existe = (k: string) => k === "e" ? !!m.entrenador : k in at || k in df || (k[0] === "d" && k.slice(1) in df);
  return { ...m, pasos: (m.pasos ?? []).map((p) => ({
    ...(p.m ? { m: p.m.filter(([q]) => existe(q)) } : {}),
    ...(p.pase && existe(p.pase[0]) && existe(p.pase[1]) ? { pase: p.pase } : {}),
    ...(p.mano && existe(p.mano[0]) && existe(p.mano[1]) ? { mano: p.mano } : {}),
    ...(p.tiro && existe(p.tiro) ? { tiro: p.tiro } : {}),
    ...(p.rebote && existe(p.rebote) ? { rebote: p.rebote } : {}),
    ...(p.pases ? { pases: p.pases.filter(([a, b]) => existe(a) && existe(b)) } : {}),
    ...(p.tiros ? { tiros: p.tiros.filter(existe) } : {}),
  })).filter((p) => (p.m?.length ?? 0) > 0 || p.pase || p.mano || p.tiro || p.rebote || p.pases?.length || p.tiros?.length) };
};
const ej = (e: Base): EjercicioSemilla => ({ tipo: "ejercicio", ...e, montaje: sano(jugada(e.montaje)) });
const unir = (...x: (string | false | undefined | null)[]) => x.filter(Boolean).join(" ");

// ============================================================================
// A) JUEGO REDUCIDO CON REGLAS QUE OBLIGAN A ROTAR (3c3, 4c4, 5c5, media y toda la pista)
// ============================================================================
type Roles = { b: string; r: string; w?: string; w2?: string; p?: string };
type Formato = {
  clave: string; nombre: string; jugadores: number; poste: boolean; todaPista: boolean; duracion: number;
  montaje: Montaje; organizacion: string; video: string; roles: Roles; zona: Record<string, P>;
};
const F3 = { "1": S.cabeza, "2": S.alaD, "3": S.alaI };
const F3P = { "1": S.alaD, "2": S.alaI, "5": S.posteD };
const F4 = { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD };
const F4P = { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "5": S.posteD };
const F5 = { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqI, "5": S.posteD };
const conDf = (at: Record<string, P>) => Object.fromEntries(Object.entries(at).map(([k, p]) => [k, dfDe(p)]));
// Zonas pequeñas para la regla «la defensa juega en zona»
const Z21 = { "1": [21.2, 5.8] as P, "2": [21.2, 9.2] as P, "3": [25.0, 7.5] as P };
const Z12 = { "1": [21.6, 7.5] as P, "2": [24.8, 5.4] as P, "3": [24.8, 9.6] as P };
const Z22 = { "1": [21.4, 5.8] as P, "2": [21.4, 9.2] as P, "3": [24.8, 5.4] as P, "4": [24.8, 9.6] as P };
const FORMATOS: Formato[] = [
  { clave: "3c3", nombre: "3c3 abiertos", jugadores: 6, poste: false, todaPista: false, duracion: 12, video: "3 on 3 basketball drill rules",
    organizacion: "3c3 en media pista con los tres atacantes abiertos (cabeza y alas), sin interior fijo.", roles: { b: "1", r: "2", w: "3" }, zona: Z21,
    montaje: { at: F3, df: conDf(F3), balon: "1", pasos: [{ pase: ["1", "2"], m: [corre("1", [24.6, 8.4], [21, 5.6]), corre("3", [20, 6.8])] }] } },
  { clave: "3c3p", nombre: "3c3 con poste", jugadores: 6, poste: true, todaPista: false, duracion: 12, video: "3 on 3 post play drill basketball",
    organizacion: "3c3 en media pista: dos exteriores en las alas y un interior en el poste bajo.", roles: { b: "1", r: "2", p: "5" }, zona: Z12,
    montaje: { at: F3P, df: conDf(F3P), balon: "1", pasos: [{ pase: ["1", "5"], m: [corre("1", [23.6, 11.8])] }] } },
  { clave: "4c4", nombre: "4c4 abiertos", jugadores: 8, poste: false, todaPista: false, duracion: 15, video: "4 on 4 advantage disadvantage drill",
    organizacion: "4c4 en media pista con cuatro abiertos (dos arriba y dos esquinas).", roles: { b: "1", r: "2", w: "3", w2: "4" }, zona: Z22,
    montaje: { at: F4, df: conDf(F4), balon: "1", pasos: [{ pase: ["1", "2"], m: [corre("1", [24.4, 6.4], [26.4, 3]), corre("3", [21, 2.6])] }] } },
  { clave: "4c4p", nombre: "4c4 con poste", jugadores: 8, poste: true, todaPista: false, duracion: 15, video: "4 on 4 basketball drill post",
    organizacion: "4c4 en media pista: tres exteriores (cabeza y alas) y un interior que se mueve por el lado del balón.", roles: { b: "1", r: "2", w: "3", p: "5" }, zona: Z22,
    montaje: { at: F4P, df: conDf(F4P), balon: "1", pasos: [{ pase: ["1", "2"], m: [corre("5", [25.6, 10.2])] }, { pase: ["2", "5"] }] } },
  { clave: "5c5", nombre: "5c5 media pista", jugadores: 10, poste: true, todaPista: false, duracion: 15, video: "5 on 5 basketball drill constraints",
    organizacion: "5c5 en media pista, ataque libre del equipo.", roles: { b: "1", r: "2", w: "3", w2: "4", p: "5" }, zona: {},
    montaje: { at: F5, df: conDf(F5), balon: "1", pasos: [{ pase: ["1", "3"] }, { pase: ["3", "4"], m: [corre("5", [25.6, 5.6])] }] } },
  { clave: "3c3t", nombre: "3c3 toda la pista (continuo)", jugadores: 9, poste: false, todaPista: true, duracion: 15, video: "3 on 3 continuous full court drill",
    organizacion: "3c3 en toda la pista con tres equipos: el que ataca y anota se queda a defender en esa canasta y ataca el siguiente equipo que espera.", roles: { b: "1", r: "3", w: "2" }, zona: {},
    montaje: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 2.5], "3": [8, 12.5] }, df: { "1": [15, 7.5], "2": [17, 4], "3": [17, 11] }, balon: "1", pasos: [{ m: [bota("1", [18, 7.5]), corre("2", [21, 2.6]), corre("3", [21, 12.4])] }] } },
  { clave: "4c4t", nombre: "4c4 toda la pista", jugadores: 8, poste: false, todaPista: true, duracion: 15, video: "4 on 4 full court drill transition",
    organizacion: "4c4 en toda la pista: tras canasta, rebote o robo, transición inmediata hacia el otro aro sin parar.", roles: { b: "1", r: "3", w: "2", w2: "4" }, zona: {},
    montaje: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 2.5], "3": [8, 12.5], "4": [5, 9] }, df: { "1": [14, 7.5], "2": [18, 4], "3": [18, 11], "4": [22, 7.5] }, balon: "1", pasos: [{ m: [bota("1", [18.6, 7.5]), corre("2", [21, 2.6]), corre("3", [21, 12.4]), corre("4", [19, 9.6])] }] } },
  { clave: "5c5t", nombre: "5c5 toda la pista", jugadores: 10, poste: true, todaPista: true, duracion: 20, video: "5 on 5 full court scrimmage rules",
    organizacion: "5c5 en toda la pista, partido con la regla del ejercicio.", roles: { b: "1", r: "4", w: "2", w2: "3", p: "5" }, zona: {},
    montaje: { vista: "completa", at: { "1": [10, 7.5], "2": [10, 2.5], "3": [10, 12.5], "4": [7, 5], "5": [7, 10] }, df: { "1": [15, 7.5], "2": [19, 4], "3": [19, 11], "4": [22, 6], "5": [23, 9] }, balon: "1", pasos: [{ m: [bota("1", [19, 7.5]), corre("2", [27, 1]), corre("3", [27, 14]), corre("5", [25.6, 9.6]), corre("4", [21, 5])] }] } },
];
type Regla = {
  clave: string; titulo: string; regla: string; objetivo: string; correcciones: string; etiquetas: string[];
  vale?: (f: Formato) => boolean; edades?: string[]; video?: string;
};
const REGLAS: Regla[] = [
  { clave: "3pases", titulo: "canasta solo tras 3 pases", regla: "Solo vale la canasta si antes ha habido al menos 3 pases. Si se tira antes, la posesión pasa al otro equipo.",
    objetivo: "Mover la defensa con el pase antes de atacar · Paciencia y buenas decisiones", correcciones: "Pasar para mover a la defensa, no por pasar · Recibir amenazando (triple amenaza) · Cortar tras cada pase", etiquetas: ["pase", "paciencia"] },
  { clave: "1bote", titulo: "máximo 1 bote por jugador", regla: "Cada jugador puede dar como máximo 1 bote antes de pasar o tirar. Si da más, pérdida.",
    objetivo: "Jugar sin balón y decidir rápido · Espacios y cortes para recibir cerca del aro", correcciones: "Moverse para recibir con ventaja · El bote, solo para mejorar el ángulo o atacar un hueco · Decidir antes de recibir", etiquetas: ["sin bote", "toma de decisiones", "cortes"] },
  { clave: "corte2", titulo: "canasta tras corte vale doble", regla: "La canasta que llega de un corte sin balón (puerta atrás, corte tras pase, flash) vale doble. Las demás valen 1.",
    objetivo: "Cortar con intención y castigar la negación y la ayuda · Pasadores atentos a los cortes", correcciones: "Leer al defensor: si mira el balón, cortar por la espalda · Cambio de ritmo en el corte · El pasador pasa al espacio, no al jugador", etiquetas: ["cortes", "puerta atrás", "pase"] },
  { clave: "14s", titulo: "posesiones de 14 segundos", regla: "Cada ataque tiene 14 segundos (como tras rebote ofensivo). El entrenador cuenta en voz alta los últimos 5.",
    objetivo: "Atacar con ritmo y decidir con el reloj · Gestionar los finales de posesión", correcciones: "Primera acción antes de 6 segundos · Saber quién crea en los últimos 5 · No precipitarse si queda tiempo", etiquetas: ["reloj de posesión", "final de posesión"] },
  { clave: "pintura", titulo: "tocar la pintura antes de tirar", regla: "Antes de tirar, el balón tiene que haber estado en la pintura (por pase o por bote). Si no, la canasta no vale.",
    objetivo: "Atacar el interior para abrir el exterior · Penetrar y sacar (drive and kick)", correcciones: "Penetrar con intención de anotar · Al sacar el balón, a un compañero preparado · Los demás se mueven al ver la penetración", etiquetas: ["penetración", "drive and kick", "pintura"] },
  { clave: "skip", titulo: "pase por encima obligatorio", regla: "En cada posesión tiene que haber al menos un pase de lado a lado por encima de la defensa (skip pass) antes de tirar.",
    objetivo: "Castigar las ayudas del lado débil · Cerrar con buenas distancias (defensa)", correcciones: "El pase por encima, tenso y al pecho del receptor · El receptor preparado para tirar o atacar el cierre · Defensa: cerrar con pasos cortos y la mano arriba", etiquetas: ["skip pass", "cierres", "lado débil"] },
  { clave: "05", titulo: "decidir en medio segundo", regla: "Al recibir, cada jugador tiene medio segundo para tirar, penetrar o pasar (regla 0,5). Si se queda parado con el balón, pérdida.",
    objetivo: "Jugar con ventaja continuada · Leer antes de recibir", correcciones: "Mirar la defensa antes de que llegue el balón · Recibir con los pies preparados · Ataque al cierre con el primer bote", etiquetas: ["0,5", "toma de decisiones", "ventaja"], edades: ADULTOS },
  { clave: "directo", titulo: "cada ataque empieza con bloqueo directo", regla: "Toda posesión empieza con un bloqueo directo (central o lateral). A partir de ahí, juego libre.",
    objetivo: "Leer el bloqueo directo y continuar la ventaja · Coberturas defensivas del directo", correcciones: "Bloqueo con ángulo y sin moverse · El que bota espera a que el bloqueo esté puesto · Los demás espaciados y preparados para la ayuda", etiquetas: ["bloqueo directo", "pick and roll"],
    vale: (f) => f.jugadores >= 6 },
  { clave: "mano", titulo: "cada ataque empieza con mano a mano", regla: "Toda posesión empieza con un mano a mano (DHO). El receptor ataca de inmediato.",
    objetivo: "Usar el mano a mano para ganar ventaja · Defender la entrega (pasar por arriba, cambiar)", correcciones: "Entregar en la cadera y bloquear con el cuerpo · El receptor ataca hacia el aro con el primer bote · El que entrega rueda o se abre", etiquetas: ["mano a mano", "DHO"] },
  { clave: "cambio", titulo: "la defensa cambia todos los bloqueos", regla: "La defensa está obligada a cambiar en todos los bloqueos (directos e indirectos). El ataque tiene que castigar los emparejamientos.",
    objetivo: "Atacar los cambios defensivos: emparejamientos y deslizamientos · Comunicación defensiva", correcciones: "Ataque: deslizar (slip) antes del contacto o buscar al pequeño en el poste · Defensa: hablar antes del bloqueo y cambiar a la vez · Ayudas al emparejamiento malo", etiquetas: ["cambios", "switch", "emparejamientos"], edades: ADULTOS },
  { clave: "ice", titulo: "la defensa hace «ice» en los directos laterales", regla: "En los bloqueos directos laterales la defensa niega el uso del bloqueo y manda el balón a la banda (ice). El ataque busca soluciones: rechazar el bloqueo, cambiar el ángulo o pasar al bloqueador.",
    objetivo: "Practicar la cobertura «ice» y sus respuestas ofensivas", correcciones: "Defensor del balón: ponerse encima, pies paralelos a la banda · Defensor del bloqueador: bajo, entre el balón y el aro · Ataque: re-bloquear o cambiar el lado del bloqueo", etiquetas: ["ice", "bloqueo directo lateral", "coberturas"], edades: ADULTOS, vale: (f) => f.jugadores >= 8 },
  { clave: "rebof", titulo: "el rebote ofensivo vale 1 punto", regla: "Cada rebote ofensivo suma 1 punto, además de la canasta. Todos los atacantes tienen que ir al rebote, salvo uno que balancea.",
    objetivo: "Hábito de ir al rebote ofensivo y de cerrar el rebote · Balance defensivo con un jugador", correcciones: "Atacar el rebote desde fuera, buscando el lado débil · Defensa: contacto primero, luego balón · El que balancea vuelve a medio campo", etiquetas: ["rebote ofensivo", "rebote"] },
  { clave: "anota", titulo: "el que anota defiende (gana y se queda)", regla: "El equipo que anota sigue atacando (gana y se queda). El que defiende tiene que parar para entrar a atacar. Se juega a 7 canastas.",
    objetivo: "Intensidad defensiva: solo se ataca si se defiende · Concentración en cada posesión", correcciones: "Defender cada posesión como la última · Cerrar el rebote para recuperar el balón · Ataque: no regalar posesiones", etiquetas: ["competición", "intensidad", "gana y se queda"] },
  { clave: "tran", titulo: "si la defensa roba, contraataque", regla: "Si la defensa recupera el balón (robo o rebote), sale en transición hacia el otro aro y el ataque tiene que balancear y defender. Al llegar al otro aro, juego libre.",
    objetivo: "Transición ataque-defensa inmediata · Hábito de balance defensivo", correcciones: "Al perder el balón, el más cercano frena al que bota y el resto corre a proteger el aro · La defensa que recupera, primer pase hacia delante · Hablar en la transición", etiquetas: ["transición", "balance defensivo"], vale: (f) => !f.todaPista },
  { clave: "sinmedia", titulo: "solo tiros de 3 o en la pintura", regla: "Solo valen los tiros de 3 y los de dentro de la pintura. Una canasta de media distancia no cuenta.",
    objetivo: "Selección de tiro moderna: aro o triple · Romper la defensa hasta un tiro de calidad", correcciones: "Si el cierre llega, atacar hasta la pintura o pasar · Pies detrás de la línea al recibir · No conformarse con la media distancia", etiquetas: ["selección de tiro", "tiro de 3"] },
  { clave: "ventaja", titulo: "empezar con ventaja (un defensor en el aro)", regla: "Cada posesión empieza con un defensor tocando el aro y saliendo al recibir el primer pase, para que el ataque juegue con una ventaja que tiene que mantener y aprovechar.",
    objetivo: "Jugar la ventaja: atacar el cierre y encontrar al libre · Defensa: rotaciones en inferioridad momentánea", correcciones: "Atacar al que llega tarde · Pase al compañero que deja libre la ayuda · Defensa: hablar y rotar al más peligroso", etiquetas: ["ventaja", "rotaciones", "cierres"], vale: (f) => !f.todaPista },
  { clave: "postefirst", titulo: "primer pase al poste", regla: "Cada posesión empieza con un pase al poste (bajo o alto). Tras el pase, los exteriores se mueven: cortan, se cruzan o se abren a la línea de visión del poste.",
    objetivo: "Jugar a través del poste · Movimiento de los exteriores tras pase interior", correcciones: "Pase al poste desde el ángulo del ala · Tras pasar, moverse (cortar o relocalizarse) · El poste lee antes de botar", etiquetas: ["juego interior", "pase al poste"], vale: (f) => f.poste },
  { clave: "negar", titulo: "la defensa niega todos los pases", regla: "La defensa niega todas las líneas de pase cercanas al balón (brazo y pie en la línea). El ataque tiene que usar puertas atrás, cortes y flashes al poste alto.",
    objetivo: "Atacar la defensa agresiva sin balón · Defensa: negar y ayudar a la vez", correcciones: "Ataque: puerta atrás cuando el brazo del defensor está en la línea · Flash al poste alto para pasar · Defensa: ver balón y atacante (posición de negación)", etiquetas: ["negación", "puerta atrás", "presión"] },
  { clave: "manoD", titulo: "solo vale la canasta con la mano débil", regla: "Las canastas cerca del aro solo cuentan si se terminan con la mano débil (o con la mano lejana del defensor). Los tiros de fuera valen normal.",
    objetivo: "Finalizar con las dos manos en situación real", correcciones: "Proteger el balón con el cuerpo · Despegue con el pie contrario a la mano de tiro · Mirar el aro, no el defensor", etiquetas: ["finalización", "mano débil"] },
  { clave: "zona", titulo: "la defensa juega en zona", regla: "La defensa juega en zona (2-3 o 3-2 en 5c5, 2-1 o 1-2 en 3c3, 2-2 en 4c4). El ataque tiene que usar huecos, poste alto y pases rápidos.",
    objetivo: "Ataque contra zona en espacio reducido · Defensa de zona: comunicación y movimientos", correcciones: "Ataque: colocarse en los huecos y penetrar al hueco · Pases rápidos sin botar · Defensa: manos arriba y desplazarse con cada pase", etiquetas: ["zona", "ataque a zona"] },
  { clave: "ganador", titulo: "partido a 5 con penalización", regla: "Partidos cortos a 5 canastas. El equipo que pierde hace un ejercicio físico breve (por ejemplo, una ida y vuelta) y vuelve a jugar.",
    objetivo: "Competición e intensidad en cada posesión", correcciones: "Competir sin perder la técnica · Comunicación constante · Jugar cada posesión con intención", etiquetas: ["competición", "intensidad"] },
  { clave: "sinbote", titulo: "sin bote (solo pase)", regla: "No se puede botar. El ataque avanza y busca la canasta solo con pases y cortes. Se permite 1 bote para terminar en el aro.",
    objetivo: "Movimiento sin balón, espacios y pase", correcciones: "Moverse siempre para dar línea de pase · Pase y corte inmediato · Recibir lejos del defensor", etiquetas: ["sin bote", "pase", "movimiento sin balón"] },
  { clave: "extra", titulo: "pase extra antes del tiro", regla: "El tiro solo vale si llega de un 'pase extra': el jugador que estaba abierto tras la ayuda no tira, pasa a otro compañero aún más libre.",
    objetivo: "Del tiro bueno al tiro excelente · Romper la defensa en rotación", correcciones: "Leer el cierre: si llega, pasar al siguiente · Pase rápido, sin botar · Los receptores, ya preparados", etiquetas: ["pase extra", "rotaciones"], edades: ADULTOS },
  { clave: "volver", titulo: "si no hay tiro, volver a empezar (re-ataque)", regla: "Si la primera acción no da ventaja, el balón vuelve arriba y el equipo tiene que encadenar una segunda acción distinta (directo, mano a mano o bloqueo indirecto) sin parar el juego.",
    objetivo: "Encadenar acciones (re-ataque) en lugar de jugar 1c1 al final · Paciencia ofensiva", correcciones: "Reconocer cuándo no hay ventaja y no forzar · Segunda acción en el lado contrario · Mantener el espaciado", etiquetas: ["re-ataque", "encadenar acciones"], edades: ADULTOS, vale: (f) => f.jugadores >= 8 },
  { clave: "tiempo", titulo: "partido con tiempo y marcador (final apretado)", regla: "Se juega un final de partido simulado: 2 minutos, marcador apretado (por ejemplo, -3 con balón). El entrenador decide la situación y los tiempos muertos.",
    objetivo: "Gestión de finales: reloj, faltas, mejor tiro · Toma de decisiones bajo presión", correcciones: "Saber el marcador y el tiempo en cada posesión · Buscar el mejor tiro, no el primero · Defensa: no hacer faltas tontas", etiquetas: ["final de partido", "situaciones", "competición"], edades: ADULTOS },
];

// Pizarra propia de cada regla (lo que obliga la regla, dibujado con los jugadores del formato)
type Jug = { pasos: Pasos; df?: Record<string, P>; defensa?: Montaje["defensa"] };
type Constructor = (pos: Record<string, P>, R: Roles, f: Formato) => Jug | null;
const otroLado = (pos: Record<string, P>, de: string, menos: string[]) =>
  Object.keys(pos).filter((k) => !menos.includes(k)).sort((a, b) => Math.abs(pos[b][1] - pos[de][1]) - Math.abs(pos[a][1] - pos[de][1]))[0];
const masCerca = (pos: Record<string, P>, de: string, menos: string[]) =>
  Object.keys(pos).filter((k) => !menos.includes(k) && k !== de).sort((a, b) => Math.hypot(pos[a][0] - pos[de][0], pos[a][1] - pos[de][1]) - Math.hypot(pos[b][0] - pos[de][0], pos[b][1] - pos[de][1]))[0];
/** Bloqueo directo al que bota: dónde se pone, por dónde sale y hacia dónde continúa */
const directo = (pos: Record<string, P>, b: string, haciaLado: number) => {
  const pb = pos[b];
  const sitio: P = [r1(pb[0] + 1.0), r1(pb[1] + haciaLado * 0.8)];
  return { sitio, salida: [[r1(sitio[0] + 0.5), r1(sitio[1] + haciaLado * 1.5)], [22.4, r1(Math.min(13, Math.max(2, sitio[1] + haciaLado * 2.4)))]] as P[], rueda: [25.2, r1(7.5 + haciaLado * 0.6)] as P };
};
const JUGADA_REGLA: Record<string, Constructor> = {
  "3pases": (pos, { b, r, w, p }) => {
    const t = w ?? p!;
    return { pasos: [{ pase: [b, r] }, { pase: [r, b], m: [corre(b, hacia(pos[b], pos[r], 0.15))] }, { pase: [b, t] }, { tiro: t }] };
  },
  "1bote": (pos, { b, r, w }) => {
    const c = w ?? r;
    return { pasos: [{ m: [bota(b, hacia(pos[b], ARO, 0.18)), corre(c, hacia(pos[c], [pos[c][0] - 1.5, pos[c][1]], 0.6), aroLado(pos[c]))] }, { pase: [b, c] }, { tiro: c }] };
  },
  corte2: (pos, { b, r }) => ({ pasos: [{ pase: [b, r] }, { m: [corre(b, hacia(pos[b], pos[r], 0.3), aroLado(pos[r]))] }, { pase: [r, b] }, { tiro: b }] }),
  pintura: (pos, { b, r, w, p }) => {
    const ay = p ?? w ?? r;
    return { pasos: [{ m: [bota(b, [24.2, r1(7.5 + lado(pos[r]) * 1.0)])], ayuda: ay }, { pase: [b, ay] }, { tiro: ay }] };
  },
  skip: (pos, { b, r }) => {
    const t = otroLado(pos, r, [b, r]);
    return { pasos: [{ pase: [b, r] }, { pase: [r, t] }, { m: [bota(t, hacia(pos[t], ARO, 0.25))] }, { tiro: t }] };
  },
  "05": (pos, { b, r }) => ({ pasos: [{ pase: [b, r] }, { m: [bota(r, hacia(pos[r], ARO, 0.45), aroLado(pos[r]))] }, { tiro: r }] }),
  directo: (pos, { b, r, p }) => {
    const s = p ?? r, d = directo(pos, b, lado(pos[r]));
    return { pasos: [{ m: [bloq(s, d.sitio)] }, { m: [bota(b, ...d.salida)] }, { m: [corre(s, d.rueda)] }, { pase: [b, s] }, { tiro: s }] };
  },
  mano: (pos, { b, r }) => ({ pasos: [{ m: [bota(b, hacia(pos[b], pos[r], 0.55)), corre(r, hacia(pos[r], pos[b], 0.25))] }, { mano: [b, r] }, { m: [bota(r, hacia(pos[r], ARO, 0.5), aroLado(pos[r]))] }, { tiro: r }] }),
  cambio: (pos, { b, r, p }) => {
    const s = p ?? r, d = directo(pos, b, lado(pos[r]));
    return { pasos: [{ m: [bloq(s, d.sitio)] }, { m: [bota(b, ...d.salida)], dm: [[s, hacia(d.salida[1], d.sitio, 0.25)], [b, hacia(d.sitio, ARO, 0.3)]] },
      { m: [corre(s, d.rueda)], dm: [[b, hacia(d.rueda, d.sitio, 0.35)]] }, { pase: [b, s] }, { tiro: s }] };
  },
  ice: (pos, { b, r, w, p }) => {
    const h = r, s = p ?? w!, l = lado(pos[h]), ph = pos[h];
    const sitio: P = [r1(ph[0] - 0.9), r1(ph[1] - l * 1.0)];
    return { pasos: [{ pase: [b, h] }, { m: [bloq(s, sitio)], dm: [[h, [r1(ph[0] - 0.4), r1(ph[1] - l * 0.9)]], [s, [24.8, r1(7.5 + l * 2.6)]]] },
      { m: [bota(h, [r1(Math.min(26.6, ph[0] + 2.4)), r1(ph[1] + l * 0.2)], [25.2, r1(7.5 + l * 3.6)])] }, { m: [corre(s, [r1(ph[0] - 1.4), r1(ph[1] - l * 3.4)])] }, { pase: [h, s] }, { tiro: s }] };
  },
  rebof: (pos, { b, r }) => {
    const resto = Object.keys(pos).filter((k) => k !== b && k !== r);
    const pega = resto[0] ?? r;
    return { pasos: [{ pase: [b, r] }, { tiro: r }, { m: [corre(b, [17.6, 7.5]), corre(r, hacia(pos[r], ARO, 0.55)), ...resto.map((k) => corre(k, hacia(pos[k], ARO, 0.65)))], cierra: true }, { rebote: pega }, { tiro: pega }] };
  },
  ventaja: (pos, { b, r, w, p }) => {
    const ay = p ?? w;
    return { df: { [r]: [26.0, r1(7.5 + lado(pos[r]) * 0.6)] }, pasos: [{ pase: [b, r] }, { m: [bota(r, hacia(pos[r], ARO, 0.5))], ...(ay ? { ayuda: ay } : {}) }, ...(ay ? [{ pase: [r, ay] as [string, string] }, { tiro: ay }] : [{ tiro: r }])] };
  },
  postefirst: (pos, { b, r, p }) => {
    if (!p) return null;
    const pas = Math.hypot(pos[b][0] - pos[p][0], pos[b][1] - pos[p][1]) < Math.hypot(pos[r][0] - pos[p][0], pos[r][1] - pos[p][1]) ? b : r;
    const otro = pas === b ? r : b;
    const esq: P = [26.8, r1(7.5 + lado(pos[p]) * 6.1)];
    return { pasos: [...(pas !== b ? [{ pase: [b, pas] as [string, string] }] : []), { pase: [pas, p] },
      { m: [corre(pas, hacia(pos[pas], ARO, 0.4), esq), corre(otro, hacia(pos[otro], pos[pas], 0.75))] }, { pase: [p, otro] }, { tiro: otro }] };
  },
  negar: (pos, { b, r }) => ({ pasos: [{ m: [corre(r, [r1(pos[r][0] - 1.2), pos[r][1]], aroLado(pos[r], 0.9))] }, { pase: [b, r] }, { tiro: r }] }),
  zona: (pos, { b, r, w, p }, f) => {
    const t = w ?? p!;
    return { defensa: f.jugadores >= 10 ? "23" : "zonaLibre", df: f.jugadores >= 10 ? undefined : f.zona,
      pasos: [{ pase: [b, r] }, { m: [bota(r, hacia(pos[r], ARO, 0.3))] }, { pase: [r, t] }, { tiro: t }] };
  },
  sinbote: (pos, { b, r, w }) => {
    const esq: P = [26.8, r1(7.5 - lado(pos[r]) * 6.2)];
    return { pasos: [{ pase: [b, r] }, { m: [corre(b, aroLado(pos[r], 0.6), esq), ...(w ? [corre(w, hacia(pos[w], pos[b], 0.7))] : [])] }, { pase: [r, w ?? b] }, { tiro: w ?? b }] };
  },
  extra: (pos, { b, r, w, p }) => {
    const t = w ?? p;
    if (!t) return null;
    return { pasos: [{ m: [bota(b, [24.0, r1(7.5 + lado(pos[r]) * 1.2)])], ayuda: r }, { pase: [b, r], dm: [[t, hacia(pos[t], pos[r], 0.7)]] }, { pase: [r, t] }, { tiro: t }] };
  },
  volver: (pos, { b, r, p }) => {
    const s = p ?? masCerca(pos, b, [b, r])!, d = directo(pos, b, -lado(pos[r]));
    const t = masCerca(pos, r, [b, r, s]);
    if (!t) return null;
    return { pasos: [{ m: [bloq(s, d.sitio)] }, { m: [bota(b, d.salida[0])] }, { pase: [b, r] }, { m: [bota(r, hacia(pos[r], pos[t], 0.5)), corre(t, hacia(pos[t], pos[r], 0.2))] }, { mano: [r, t] }, { m: [bota(t, aroLado(pos[t]))] }, { tiro: t }] };
  },
};

const juegoReducido: EjercicioSemilla[] = [];
for (const f of FORMATOS) for (const r of REGLAS) {
  if (r.vale && !r.vale(f)) continue;
  // Media pista: la pizarra de la regla. Toda la pista: la transición del formato y, al llegar, la regla.
  const base = f.montaje;
  const pos = f.todaPista ? posTras(base.at!, base.pasos ?? []) : base.at!;
  const jr = JUGADA_REGLA[r.clave]?.(pos, f.roles, f) ?? null;
  const usar = jr && !(f.todaPista && (jr.df || jr.defensa));
  const montaje: Montaje = !usar ? base : {
    ...base, ...(jr.defensa ? { defensa: jr.defensa } : {}),
    df: jr.defensa && jr.defensa !== "individual" ? jr.df : { ...base.df, ...(jr.df ?? {}) },
    pasos: [...(f.todaPista ? base.pasos ?? [] : []), ...jr.pasos],
  };
  juegoReducido.push(ej({
    titulo: `${f.nombre}: ${r.titulo}`, categoria: "Juego reducido", edades: r.edades ?? (f.jugadores >= 8 ? ADULTOS : MAYORES),
    duracion: f.duracion, jugadores: f.jugadores, material: `1 balón${f.jugadores >= 8 ? ", petos" : ""}`, objetivos: r.objetivo,
    descripcion: unir(f.organizacion, "Regla:", r.regla, f.todaPista ? "Se juega a 3-4 minutos o a canastas, con rotación de equipos." : "Series de 4-5 minutos; ataque y defensa cambian cada 3 posesiones o tras canasta."),
    correcciones: r.correcciones, etiquetas: [f.clave, ...r.etiquetas, f.todaPista ? "toda la pista" : "media pista"],
    video: yt(r.video ?? `${f.video} ${r.etiquetas[0]}`), montaje,
  }));
}

// ============================================================================
// B) BLOQUEO DIRECTO: LEER CADA COBERTURA (ataque) Y DEFENDERLA (defensa)
// ============================================================================
type Cob = { clave: string; nombre: string; ing: string; defensa: string; lectura: string; ataqueCorr: string; defCorr: string };
const COBERTURAS: Cob[] = [
  { clave: "drop", nombre: "defensa atrás (drop)", ing: "drop coverage",
    defensa: "El defensor del bloqueador se queda atrás, a la altura del tiro libre, protegiendo el aro; el defensor del balón pasa por encima del bloqueo y persigue.",
    lectura: "El que bota ataca hacia el pívot que retrocede: tiro tras bote en media distancia si se queda atrás, flotadora si sale, o pase al que continúa si el pívot sale a por el balón.",
    ataqueCorr: "Atacar al defensor grande con 2 botes, no 5 · Tiro tras bote si el pívot no sale · El bloqueador continúa ancho para que el pívot no pueda cubrir los dos", defCorr: "El grande con los pies hacia el balón, sin girarse · El del balón persigue por encima, pegado a la cadera · Mano arriba para molestar el tiro tras bote" },
  { clave: "show", nombre: "salir y volver (show / hedge)", ing: "hedge show pick and roll",
    defensa: "El defensor del bloqueador sale fuerte a la línea del balón para frenar al que bota y vuelve a su jugador cuando el defensor del balón se recupera.",
    lectura: "Separar del bloqueo (no ir hacia la banda), pase rápido al bloqueador que continúa o se abre antes de que su defensor vuelva, o rechazo del bloqueo si el defensor del grande sale muy pronto.",
    ataqueCorr: "Separarse del show con un bote hacia atrás · Pase al que continúa en cuanto su defensor está fuera · El bloqueador continúa rápido, sin esperar", defCorr: "Salir al lado del bloqueador, no a su espalda · Frenar al que bota y volver con pasos laterales · El lado débil ayuda en la continuación hasta que vuelva el grande" },
  { clave: "cambio", nombre: "cambio de asignación (switch)", ing: "switch pick and roll",
    defensa: "Los dos defensores se cambian de atacante en el bloqueo: el grande defiende al que bota y el pequeño al bloqueador.",
    lectura: "Buscar el emparejamiento bueno: el que bota ataca al grande en 1c1 o el bloqueador sella al pequeño en el poste; también deslizar (slip) antes del contacto si la defensa cambia pronto.",
    ataqueCorr: "Ver el cambio y castigarlo rápido (antes de que la defensa lo arregle) · Sellar al pequeño con el cuerpo y pedir con la mano lejana · Espaciar para el 1c1 contra el grande", defCorr: "Hablar ('cambio') antes del contacto · Cambiar a la vez, sin dejar hueco · El pequeño se pone por delante del bloqueador (negar el poste) y el lado débil ayuda" },
  { clave: "ice", nombre: "mandar a la banda (ice / down)", ing: "ice coverage side pick and roll",
    defensa: "En el bloqueo lateral, el defensor del balón se pone encima e impide usar el bloqueo, mandando al que bota hacia la banda y la línea de fondo, donde le espera el grande bajo.",
    lectura: "Rechazar el bloqueo y atacar la banda con ventaja si el grande no llega, cambiar el ángulo del bloqueo (re-bloquear), o pasar al bloqueador que se abre arriba.",
    ataqueCorr: "Si el defensor se pone encima, rechazar y atacar · El bloqueador cambia el ángulo y vuelve a bloquear · Pase al bloqueador que se abre (pop)", defCorr: "Del balón: encima, pies paralelos a la banda · Grande: bajo, entre el balón y el aro, sin salir de la zona · Lado débil preparado para la ayuda en la línea de fondo" },
  { clave: "trampa", nombre: "trampa al que bota (blitz)", ing: "blitz trap pick and roll",
    defensa: "Los dos defensores van a por el que bota y le hacen una trampa al salir del bloqueo; los otros tres defensores rotan para cubrir al bloqueador y a los tiradores.",
    lectura: "Pasar rápido antes de que se cierre la trampa: al bloqueador que continúa por el centro (4c3 a favor), que juega con ventaja contra la rotación, y desde ahí al tirador libre.",
    ataqueCorr: "Separarse de la trampa con 1-2 botes hacia atrás para ver el pase · Pase por encima o picado, no por en medio · El bloqueador corta al espacio libre (short roll) y decide rápido", defCorr: "Trampa sin hacer falta: brazos arriba, pies cerrando la salida · El lado débil rota al que continúa (el más cercano al aro) · Recuperar al más peligroso" },
  { clave: "debajo", nombre: "pasar por debajo (under)", ing: "go under pick and roll",
    defensa: "El defensor del balón pasa por debajo del bloqueo (entre el bloqueador y su defensor), ideal contra jugadores que no tiran bien tras bote.",
    lectura: "Castigar con tiro tras bote detrás del bloqueo en cuanto el defensor pase por debajo, o volver a bloquear (re-screen) para tener aún más espacio.",
    ataqueCorr: "Si el defensor se va por debajo, tirar detrás del bloqueo · El bloqueador se gira y vuelve a bloquear · Pies preparados para el tiro tras bote", defCorr: "Pasar por debajo rápido y cerrar con la mano arriba · El grande da espacio para que pase el compañero · No usarlo contra buenos tiradores tras bote" },
  { clave: "nivel", nombre: "subir a la altura del bloqueo (level / up to touch)", ing: "up to touch level coverage",
    defensa: "El defensor del bloqueador sube hasta la línea del bloqueo (sin salir del todo) para cortar la penetración y el tiro tras bote, y se recupera hacia atrás cuando pasa el defensor del balón.",
    lectura: "Atacar el espacio entre el defensor grande y su jugador: pase rápido al que continúa (pocket pass), o atacar al grande si se queda dudando.",
    ataqueCorr: "Pase picado en el bolsillo (pocket) al que continúa · No botar hacia atrás si el grande está arriba · El bloqueador se separa del grande para recibir", defCorr: "Subir a la altura del bloqueo con las manos activas · Recuperar al bloqueador en cuanto pasa el compañero · Comunicación constante" },
];
type FmtPnr = { clave: string; nombre: string; jugadores: number; extra: string; at: Record<string, P>; edades: string[] };
const PNR_FORMATOS: FmtPnr[] = [
  { clave: "2c2", nombre: "2c2", jugadores: 4, edades: MAYORES, extra: "Solo el que bota y el bloqueador, con sus defensores.", at: { "1": S.cabeza, "5": S.tl } },
  { clave: "3c3", nombre: "3c3 con esquina", jugadores: 6, edades: ADULTOS, extra: "Se añade un tirador en la esquina del lado de la penetración: su defensor tiene que decidir si ayuda en la continuación (tag) o se queda con el tirador.", at: { "1": S.cabeza, "5": S.tl, "2": S.esqD } },
  { clave: "4c4", nombre: "4c4 con lado débil", jugadores: 8, edades: ADULTOS, extra: "Se añaden dos tiradores en el lado débil (ala y esquina): la ayuda llega desde ahí y hay que encontrar al que queda libre tras la rotación.", at: { "1": S.cabeza, "5": S.tl, "2": S.esqD, "3": S.alaI, "4": S.esqI } },
  { clave: "5c5", nombre: "5c5", jugadores: 10, edades: ADULTOS, extra: "Con los cinco: la defensa usa la cobertura del día y el ataque busca la mejor opción tras el bloqueo directo.", at: { "1": S.cabeza, "5": S.tl, "2": S.esqD, "3": S.alaI, "4": S.esqI } },
];
type Lugar = { clave: string; nombre: string; balon: P; bloqueo: P; rumbo: P[] };
const PNR_LUGARES: Lugar[] = [
  { clave: "central", nombre: "central", balon: S.cabeza, bloqueo: [20.4, 8.6], rumbo: [[20.8, 10.2], [22.6, 10.6]] },
  { clave: "lateral", nombre: "lateral", balon: S.baseD, bloqueo: [20.8, 11.2], rumbo: [[21.4, 9.8], [23.2, 8.6]] },
  { clave: "esquina", nombre: "desde la esquina (empty)", balon: [21.4, 12.8], bloqueo: [22.6, 12.4], rumbo: [[23.4, 11.2], [24.8, 9.8]] },
];
const pnrMontaje = (fm: FmtPnr, lg: Lugar, cob: Cob): Montaje => {
  const at: Record<string, P> = { ...fm.at, "1": lg.balon, "5": hacia(lg.bloqueo, ARO, 0.35) };
  const df: Record<string, P> = conDf(at);
  const movDef: [string, "correr", ...P[]][] =
    cob.clave === "drop" ? [["d5", "correr", [24.2, 8.4]]] :
    cob.clave === "show" ? [["d5", "correr", hacia(lg.bloqueo, lg.rumbo[0], 0.8)]] :
    cob.clave === "cambio" ? [["d5", "correr", lg.rumbo[0]], ["d1", "correr", hacia(lg.bloqueo, ARO, 0.5)]] :
    cob.clave === "trampa" ? [["d5", "correr", lg.rumbo[0]], ["d1", "correr", hacia(lg.rumbo[0], lg.balon, 0.3)]] :
    cob.clave === "ice" ? [["d5", "correr", [25, 10.4]]] :
    cob.clave === "debajo" ? [["d1", "correr", hacia(lg.bloqueo, ARO, 0.4), lg.rumbo[0]]] :
    [["d5", "correr", hacia(lg.bloqueo, ARO, 0.15)]];
  return { at, df, balon: "1", pasos: [
    { m: [["5", "bloqueo", lg.bloqueo]] },
    { m: [["1", "botar", ...lg.rumbo], ...movDef] },
    { m: [["5", "correr", [25.4, 8.2]]] }, { pase: ["1", "5"] }, { tiro: "5" },
  ] };
};
const pnr: EjercicioSemilla[] = [];
for (const cob of COBERTURAS) for (const fm of PNR_FORMATOS) for (const lg of PNR_LUGARES) {
  if (fm.clave === "2c2" && lg.clave === "esquina") continue;
  pnr.push(ej({
    titulo: `Directo ${lg.nombre} contra ${cob.nombre}: ${fm.nombre}`, categoria: "Ataque", edades: fm.edades, duracion: 12, jugadores: fm.jugadores, material: "1-2 balones",
    objetivos: `Leer y castigar la cobertura «${cob.ing.split(" ")[0]}» en el bloqueo directo ${lg.nombre}`,
    descripcion: unir(`Bloqueo directo ${lg.nombre}.`, fm.extra, "Defensa:", cob.defensa, "Ataque:", cob.lectura, "Primero con defensa a medio ritmo, luego en vivo hasta canasta o pérdida. 6-8 repeticiones por pareja y cambio de roles."),
    correcciones: cob.ataqueCorr, etiquetas: ["bloqueo directo", "pick and roll", cob.clave, lg.clave, fm.clave],
    video: yt(`${cob.ing} reads drill`), montaje: pnrMontaje(fm, lg, cob),
  }));
}
for (const cob of COBERTURAS) for (const fm of PNR_FORMATOS.filter((f) => f.clave !== "4c4")) {
  pnr.push(ej({
    titulo: `Defender el directo con ${cob.nombre}: ${fm.nombre}`, categoria: "Defensa", edades: fm.edades, duracion: 12, jugadores: fm.jugadores, material: "1 balón",
    objetivos: `Ejecutar la cobertura «${cob.ing.split(" ")[0]}» con sus ayudas y recuperaciones`,
    descripcion: unir("El ataque juega bloqueos directos centrales y laterales.", fm.extra, "La defensa trabaja:", cob.defensa, "Primero el ataque a medio ritmo para fijar posiciones y comunicación; luego en vivo, contando paradas defensivas. 4 posesiones por grupo."),
    correcciones: cob.defCorr, etiquetas: ["defensa del bloqueo directo", "pick and roll", cob.clave, fm.clave, "coberturas"],
    video: yt(`${cob.ing} defense drill`), montaje: pnrMontaje(fm, PNR_LUGARES[0], cob),
  }));
}

// ============================================================================
// C) BLOQUEOS SIN BALÓN: CADA ACCIÓN CONTRA CADA DEFENSA (la pizarra cambia según cómo defienden)
// ============================================================================
type Ind = { clave: string; nombre: string; ing: string; desc: string; corte: P[]; bloq: P; cortador: P; bloqueador: P };
const INDIRECTOS: Ind[] = [
  { clave: "pin", nombre: "bloqueo indirecto hacia abajo (pin down)", ing: "pin down screen", desc: "El tirador sale del poste bajo hacia el ala usando el bloqueo del compañero que baja.", cortador: S.posteD, bloqueador: S.alaD, bloq: [23.6, 11], corte: [[24.4, 11.6], [21.2, 12.4]] },
  { clave: "flare", nombre: "bloqueo de salida (flare)", ing: "flare screen", desc: "El jugador del ala se abre hacia la banda usando un bloqueo de espaldas al aro puesto entre él y el balón.", cortador: S.baseD, bloqueador: S.tl, bloq: [20.6, 9.2], corte: [[20.2, 9.6], [21, 12.6]] },
  { clave: "back", nombre: "bloqueo de espaldas (back screen)", ing: "back screen cut", desc: "El jugador del ala corta hacia el aro usando un bloqueo de espaldas puesto por un compañero que sube desde el poste.", cortador: S.alaD, bloqueador: S.posteD, bloq: [22.4, 11.2], corte: [[22.6, 10.6], [25.8, 8.6]] },
  { clave: "cross", nombre: "bloqueo cruzado (cross screen)", ing: "cross screen post", desc: "Un interior cruza la zona para recibir en el poste bajo del lado del balón usando el bloqueo de otro jugador.", cortador: S.posteI, bloqueador: S.posteD, bloq: [25.6, 7.4], corte: [[25.2, 8.6], [25.8, 10]] },
  { clave: "stagger", nombre: "bloqueos escalonados (stagger)", ing: "stagger screen", desc: "El tirador sale desde debajo del aro usando dos bloqueos seguidos hacia el ala.", cortador: [26.4, 7.5], bloqueador: S.posteD, bloq: [24.6, 10], corte: [[25.4, 9.6], [23.6, 10.6], [21.2, 12.4]] },
  { clave: "ucla", nombre: "corte UCLA (bloqueo de espaldas del poste alto)", ing: "UCLA cut", desc: "El base pasa al ala y corta hacia el aro usando el bloqueo de espaldas del interior en el poste alto.", cortador: S.cabeza, bloqueador: S.codoD, bloq: [21.6, 9], corte: [[21, 9.6], [25.6, 8.6]] },
  { clave: "zipper", nombre: "cremallera (zipper)", ing: "zipper cut", desc: "El jugador del poste bajo sube por el carril hasta la cabeza usando un bloqueo, para recibir de cara al aro.", cortador: S.posteD, bloqueador: S.codoD, bloq: [23.4, 9.2], corte: [[24.4, 8.8], [19.8, 9.4]] },
  { clave: "sts", nombre: "bloquear al bloqueador (screen the screener)", ing: "screen the screener", desc: "Tras poner un bloqueo, el bloqueador recibe a su vez un bloqueo para salir libre (normalmente el interior que sube al poste alto).", cortador: S.posteI, bloqueador: S.codoI, bloq: [24.8, 6], corte: [[24.6, 6.4], [22.2, 7.5]] },
];
type DefInd = { clave: string; nombre: string; defensa: string; lectura: string };
const DEF_IND: DefInd[] = [
  { clave: "persigue", nombre: "defensor que persigue", defensa: "El defensor persigue por detrás, pegado al cortador.", lectura: "Cortar hacia el aro por dentro del bloqueo (curl) y finalizar o pasar." },
  { clave: "debajo", nombre: "defensor que pasa por debajo", defensa: "El defensor anticipa y pasa por debajo del bloqueo para llegar antes al destino.", lectura: "Abrirse hacia fuera (fade) o salir recto y tirar con el espacio que deja el defensor." },
  { clave: "cambio", nombre: "defensa que cambia", defensa: "Los dos defensores se cambian de atacante en el bloqueo.", lectura: "El bloqueador desliza hacia el aro (slip) o sella al defensor pequeño; el cortador busca el emparejamiento bueno." },
  { clave: "anticipa", nombre: "defensor que se adelanta (top lock)", defensa: "El defensor se pone por encima del bloqueo para negar la salida hacia el balón.", lectura: "Puerta atrás hacia el aro por el lado contrario, o cambiar de dirección y usar el bloqueo por el otro lado." },
];
const indirectos: EjercicioSemilla[] = [];
for (const b of INDIRECTOS) for (const d of DEF_IND) for (const fm of [{ c: "2c2", n: "2c2 + pasador", j: 5, extra: "Un pasador fijo en la cabeza." }, { c: "3c3", n: "3c3", j: 6, extra: "El pasador también defendido: tiene que mantener el balón vivo y elegir el pase." }]) {
  const pas: P = S.cabeza.join() === b.cortador.join() ? S.alaI : S.cabeza;
  const at: Record<string, P> = { "2": b.cortador, "4": b.bloqueador, "1": pas };
  const d2 = dfDe(b.cortador, 0.8), d4 = dfDe(b.bloqueador, 0.8);
  const df: Record<string, P> = { "2": d2, "4": d4, ...(fm.c === "3c3" ? { "1": dfDe(pas) } : {}) };
  const S0 = b.bloq, fin = b.corte[b.corte.length - 1], entrada = b.corte[0];
  let pasos: Pasos;
  if (d.clave === "persigue") {
    // Le persigue pegado: el cortador rodea el bloqueo hacia el aro (curl)
    const curl = hacia(S0, ARO, 0.45);
    pasos = [{ m: [bloq("4", S0)] }, { m: [corre("2", entrada, curl)], dm: [["2", hacia(S0, b.cortador, 0.25), hacia(curl, S0, 0.3)], ["4", hacia(S0, fin, 0.25), S0]] }, { pase: ["1", "2"] }, { tiro: "2" }];
  } else if (d.clave === "debajo") {
    // Pasa por debajo: el cortador sale recto y se abre (fade) con el espacio que le dan
    const fade: P = [r1(fin[0] + (fin[0] - S0[0]) * 0.25), r1(fin[1] + (fin[1] - S0[1]) * 0.25)];
    pasos = [{ m: [bloq("4", S0)] }, { m: [corre("2", ...b.corte, fade)], dm: [["2", hacia(S0, ARO, 0.3), hacia(fin, ARO, 0.25)]] }, { pase: ["1", "2"] }, { tiro: "2" }];
  } else if (d.clave === "cambio") {
    // Cambian: el defensor del bloqueador se va con el cortador y el bloqueador se escapa hacia el aro (slip)
    pasos = [{ m: [bloq("4", S0)] }, { m: [corre("2", ...b.corte)], dm: [["4", dfDe(fin, 0.9)], ["2", hacia(S0, ARO, 0.25)]] },
      { m: [corre("4", hacia(S0, ARO, 0.7))] }, { pase: ["1", "4"] }, { tiro: "4" }];
  } else {
    // Se adelanta por encima: puerta atrás hacia el aro
    const arriba = hacia(entrada, pas, 0.2);
    pasos = [{ m: [bloq("4", S0)], dm: [["2", arriba]] }, { m: [corre("2", hacia(b.cortador, entrada, 0.4), aroLado(b.cortador, 0.8))] }, { pase: ["1", "2"] }, { tiro: "2" }];
  }
  indirectos.push(ej({
    titulo: `${b.nombre[0].toUpperCase()}${b.nombre.slice(1)} contra ${d.nombre} (${fm.n})`, categoria: "Ataque", edades: ADULTOS, duracion: 10, jugadores: fm.j, material: "1 balón",
    objetivos: `Usar el ${b.nombre.split(" (")[0]} leyendo al defensor · ${d.lectura.split(".")[0]}`,
    descripcion: unir(b.desc, fm.extra, "La defensa juega así:", d.defensa, "Lectura del ataque:", d.lectura, "6 repeticiones por lado y cambio de roles."),
    correcciones: "Preparar el corte: llevar al defensor en dirección contraria antes de usar el bloqueo · Pasar hombro con hombro con el bloqueador · El bloqueador espera el contacto y luego sella o se abre · El pasador espera a que el cortador salga del bloqueo",
    etiquetas: ["bloqueo indirecto", b.clave, d.clave, fm.c, "sin balón"], video: yt(`${b.ing} reads drill`),
    montaje: { at, df, balon: "1", pasos },
  }));
}

// ============================================================================
// D) TIRO EN MOVIMIENTO (estilo NBA/ACB): cada salida con cada final
// ============================================================================
type Salida = { clave: string; nombre: string; ing: string; desc: string; at: Record<string, P>; pasos: NonNullable<Montaje>["pasos"] };
const SALIDAS: Salida[] = [
  { clave: "pin", nombre: "salida de bloqueo indirecto", ing: "pin down shooting drill", desc: "El tirador sale del poste bajo al ala usando el bloqueo de un compañero (o un escudo/silla).", at: { "2": S.posteD, "4": [23.4, 11], "1": S.cabeza }, pasos: [{ m: [["2", "correr", [24.6, 11.8], [21.2, 12.4]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "curl", nombre: "corte curl al tiro libre", ing: "curl cut shooting", desc: "El tirador sale del poste bajo y, en lugar de abrirse, corta rodeando el bloqueo hacia el tiro libre.", at: { "2": S.posteD, "4": [23.4, 11], "1": S.cabeza }, pasos: [{ m: [["2", "correr", [24, 11.4], [22.6, 9.4]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "fade", nombre: "salida abierta a la esquina (fade)", ing: "fade cut corner three", desc: "El tirador amaga salir al ala y se abre a la esquina, donde recibe el pase.", at: { "2": S.posteD, "4": [24.2, 11.4], "1": S.alaD }, pasos: [{ m: [["2", "correr", [25.2, 11.4], [27, 14]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "flare", nombre: "bloqueo de salida (flare)", ing: "flare screen shooting", desc: "El tirador, en la cabeza, se abre al ala usando un bloqueo de espaldas mientras el balón está en el otro lado.", at: { "2": S.baseD, "4": [20.6, 9.2], "1": S.alaI }, pasos: [{ m: [["2", "correr", [20, 9.8], [21, 12.6]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "dho", nombre: "mano a mano (DHO)", ing: "dribble handoff shooting", desc: "El tirador sale de la esquina y recibe en mano a mano de un interior que bota hacia el ala.", at: { "2": S.esqD, "5": [21.8, 10.4], "1": S.cabeza }, pasos: [{ m: [["2", "correr", [24.4, 13], [21.2, 12]]] }, { mano: ["5", "2"] }, { tiro: "2" }] },
  { clave: "relo", nombre: "relocalización tras penetración", ing: "relocation shooting drill", desc: "Un compañero penetra desde el ala; el tirador de la esquina se desplaza (sube o baja) a la línea de visión del pasador.", at: { "1": S.alaD, "2": S.esqD, "3": S.cabeza }, pasos: [{ m: [["1", "botar", [23.6, 10.6], [25.2, 9.4]], ["2", "correr", [25.8, 13.4], [23.6, 13.4]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "drift", nombre: "deslizamiento del ala a la esquina (drift)", ing: "drift shooting drill", desc: "Cuando el balón penetra por el centro, el tirador del ala se desliza a la esquina para recibir el pase de salida.", at: { "1": S.cabeza, "2": S.alaD }, pasos: [{ m: [["1", "botar", [22, 8.4], [23.8, 8.4]], ["2", "correr", [24.4, 13.4], [27, 14]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "trailer", nombre: "trailer en transición", ing: "trailer three transition drill", desc: "En transición, el balón llega al ala y el trailer (que viene detrás) recibe en la cabeza para tirar de 3.", at: { "1": S.alaD, "4": [16, 8.6], "2": S.esqI }, pasos: [{ m: [["4", "correr", [19.4, 8]]] }, { pase: ["1", "4"] }, { tiro: "4" }] },
  { clave: "pop", nombre: "abrirse tras bloqueo directo (pick and pop)", ing: "pick and pop shooting drill", desc: "El tirador (interior o exterior) pone un bloqueo directo y se abre a la línea de 3 para recibir.", at: { "1": S.cabeza, "4": [20.4, 8.6] }, pasos: [{ m: [["1", "botar", [20.8, 10], [22.4, 10.8]], ["4", "correr", [19.8, 5.6]]] }, { pase: ["1", "4"] }, { tiro: "4" }] },
  { clave: "closeout", nombre: "recepción contra cierre (ataque al close-out)", ing: "attack closeout drill", desc: "El tirador recibe en el ala con un defensor que llega corriendo a cerrar: tirar si llega tarde o atacar si llega encima.", at: { "2": S.alaD, "1": S.cabeza }, pasos: [{ pase: ["1", "2"] }, { m: [["2", "botar", [23.6, 10.8]]] }, { tiro: "2" }] },
];
type Final = { clave: string; nombre: string; desc: string; corr: string };
const FINALES: Final[] = [
  { clave: "cs", nombre: "tiro tras recepción", desc: "Tiro inmediato tras recibir (catch and shoot).", corr: "Pies preparados antes de recibir (paso 1-2 o salto) · Manos arriba para pedir · Subir recto y caer en el mismo sitio" },
  { clave: "1b", nombre: "1 bote y tiro (pull-up)", desc: "Finta de tiro con el cierre imaginario, un bote lateral o hacia delante y tiro en suspensión.", corr: "La finta vende el tiro (balón arriba, no solo los hombros) · Bote fuerte y corto · Parar en uno o dos tiempos equilibrado" },
  { clave: "fin", nombre: "finta y entrada", desc: "Finta de tiro, dos botes de ataque y finalización en el aro (bandeja, flotadora o parada).", corr: "Primer paso largo y bajo, pasando la cadera del defensor · Proteger el balón · Leer la ayuda en el segundo bote" },
  { clave: "lado", nombre: "paso lateral y tiro (side-step)", desc: "Tras recibir, paso lateral para esquivar el cierre y tiro.", corr: "El bote del paso lateral, bajo y rápido · Caer de cara al aro · Sin arrastrar el pie de pivote" },
];
const tiroMov: EjercicioSemilla[] = [];
/** Cambia el final del tirador: tras recibir, lo que pide el final (bote y tiro, finta y entrada, paso lateral) */
const conFinal = (s: Salida, f: Final): Montaje => {
  const pasos: Pasos = s.clave === "closeout" ? [(s.pasos ?? [])[0], { tiro: "2" }] : [...(s.pasos ?? [])];
  const iTiro = pasos.findIndex((p) => p.tiro);
  const quien = pasos[iTiro]?.tiro;
  const extra: Montaje = s.clave === "closeout" ? { df: { "2": [25.2, 9.4] } } : {};
  if (s.clave === "closeout") pasos[0] = { ...pasos[0], dm: [["2", [22.2, 11.6]]] };
  if (!quien || f.clave === "cs") return { at: s.at, ...extra, defensa: s.clave === "closeout" ? "individual" : "ninguna", pasos };
  const p = posTras(s.at, pasos.slice(0, iTiro))[quien];
  const u: P = [ARO[0] - p[0], ARO[1] - p[1]], n = Math.hypot(u[0], u[1]) || 1, perp: P = [-u[1] / n, u[0] / n];
  const mov: Mov = f.clave === "1b" ? bota(quien, [r1(p[0] + (u[0] / n) * 1.6), r1(p[1] + (u[1] / n) * 1.6)])
    : f.clave === "fin" ? bota(quien, hacia(p, ARO, 0.55), aroLado(p, 0.8))
    : bota(quien, [r1(p[0] + perp[0] * 1.1), r1(p[1] + perp[1] * 1.1)]);
  if (f.clave === "fin" && s.clave === "closeout") {
    // contra el cierre: finta, el defensor se pasa y se le supera
    pasos.splice(iTiro, 0, { m: [mov], dm: [["2", hacia(p, ARO, 0.2)]] });
  } else pasos.splice(iTiro, 0, { m: [mov] });
  return { at: s.at, ...extra, defensa: s.clave === "closeout" ? "individual" : "ninguna", pasos };
};
/**
 * El mismo ejercicio a la vez en los dos lados de la pista (dos grupos, dos balones): los del segundo grupo
 * llevan el número + 5 y hacen lo mismo en espejo. Así trabajan el doble de jugadores y se ven las filas.
 */
const enDosLados = (m: Montaje, balon: string): Montaje => {
  const k2 = (k: string) => (/^\d$/.test(k) ? String(Number(k) + 5) : k);
  // Lo que está en el centro se aparta hacia su lado para que los dos grupos no se pisen
  const lado1 = (p: P): P => (Math.abs(p[1] - 7.5) < 1.6 ? [p[0], r1(p[1] + 1.7)] : p);
  const esp = (p: P): P => { const q = lado1(p); return [q[0], r1(15 - q[1])]; };
  const dup = (r: Record<string, P> | undefined) => r ? { ...Object.fromEntries(Object.entries(r).map(([k, p]) => [k, lado1(p)])), ...Object.fromEntries(Object.entries(r).map(([k, p]) => [k2(k), esp(p)])) } : undefined;
  const pasos: Pasos = (m.pasos ?? []).map((p) => ({
    m: [...(p.m ?? []).map(([k, t, ...pts]) => [k, t, ...pts.map(lado1)] as Mov), ...(p.m ?? []).map(([k, t, ...pts]) => [k[0] === "d" ? "d" + k2(k.slice(1)) : k2(k), t, ...pts.map(esp)] as Mov)],
    ...(p.dm ? { dm: [...p.dm.map(([k, ...pts]) => [k, ...pts.map(lado1)] as [string, ...P[]]), ...p.dm.map(([k, ...pts]) => [k2(k), ...pts.map(esp)] as [string, ...P[]])] } : {}),
    ...(p.pase ? { pases: [p.pase, [k2(p.pase[0]), k2(p.pase[1])]] as [string, string][] } : {}),
    ...(p.mano ? { mano: p.mano, pases: [[k2(p.mano[0]), k2(p.mano[1])]] as [string, string][] } : {}),
    ...(p.tiro ? { tiros: [p.tiro, k2(p.tiro)] } : {}),
  }));
  return { ...m, at: dup(m.at), df: dup(m.df), defensa: "ninguna", balon: undefined, balones: [balon, k2(balon)], pasos };
};
for (const s of SALIDAS) for (const f of FINALES) {
  if (s.clave === "closeout" && f.clave === "cs") continue;
  const balon = s.clave === "dho" ? "5" : s.at["1"] ? "1" : Object.keys(s.at)[0];
  const n = Object.keys(s.at).length * 2 + (s.clave === "closeout" ? 2 : 0);
  tiroMov.push(ej({
    titulo: `Tiro: ${s.nombre} + ${f.nombre}`, categoria: "Tiro", edades: ADULTOS, duracion: 10, jugadores: n + 2, material: "4 balones",
    objetivos: `Tiro con ritmo de partido tras ${s.nombre} · ${f.nombre}`,
    descripcion: unir(s.desc, "Final:", f.desc, `Se trabaja a la vez en los dos lados de la pista (dos grupos con dos balones cada uno y una fila de espera detrás de cada puesto, ${n + 2} jugadores). Tras tirar: el tirador coge su rebote y pasa a la fila del pasador, el pasador a la del bloqueador y el bloqueador a la de tiradores. Series de 2 minutos contando canastas por lado; el lado que pierde, una carrera.`),
    correcciones: f.corr, etiquetas: ["tiro", s.clave, f.clave, "tiro en movimiento", "dos lados"], video: yt(s.ing),
    montaje: enDosLados({ ...conFinal(s, f) }, balon),
  }));
}
// Series de tiro de equipo con formato competitivo
type SerieTiro = { titulo: string; desc: string; corr: string; jug: number; mont: Montaje; video: string; et: string[]; tirador: string; cierre: P };
const SERIES_TIRO: SerieTiro[] = [
  { titulo: "Tiro en 3 filas con rotación (pasa, tira y cambia)", desc: "Tres filas: cabeza, ala y esquina, con dos balones. Pase de la cabeza al ala, del ala a la esquina para tirar; el tirador coge su rebote y va a la fila de la cabeza. Rotación continua.", corr: "Pase al bolsillo de tiro del compañero · Pies preparados al recibir · Rebote propio rápido", jug: 6, video: "3 line shooting drill rotation", et: ["rueda", "tiro de 3"], tirador: "3", cierre: [25.4, 11.4],
    mont: { at: { "1": S.cabeza, "2": S.alaD, "3": S.esqD }, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { tiro: "3" }, { m: [corre("3", [26.2, 9.4])], rebote: "3" }, { m: [bota("3", [19.8, 8.4])] }] } },
  { titulo: "Tiro en estrella (5 puntos y 2 balones)", desc: "Cinco puntos alrededor del arco (esquinas, alas y cabeza). El tirador recorre los 5 puntos recibiendo de dos pasadores alternos: sale de un punto, recibe en el siguiente y tira.", corr: "Correr entre puntos a velocidad de partido · Girar hacia el pasador antes de recibir · Mismo gesto en los 5 puntos", jug: 3, video: "star shooting drill 5 spots", et: ["5 puntos", "tiro de 3"], tirador: "2", cierre: [24.4, 4.4],
    mont: { conos: [S.esqI, S.alaI, S.cabeza, S.alaD, S.esqD], at: { "2": S.esqI, "1": [24.6, 6.4], "3": [24.6, 8.6] }, balones: ["1", "3"], pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("2", [21, 2.6])] }, { pase: ["3", "2"] }, { tiro: "2" }] } },
  { titulo: "Tiro contra reloj: 1 minuto desde 5 puntos", desc: "Un minuto por tirador, con un reboteador-pasador: tiros desde 5 puntos, cambiando de punto tras cada canasta. Se anota la cifra de cada jugador cada semana.", corr: "Ritmo alto sin perder la mecánica · Pedir el balón con las manos · Pase del reboteador rápido y al pecho", jug: 2, video: "1 minute shooting drill", et: ["contra reloj", "competición"], tirador: "2", cierre: [23.4, 10.6],
    mont: { conos: [S.esqI, S.alaI, S.cabeza, S.alaD, S.esqD], at: { "2": S.alaD, "1": [24.6, 8.6] }, balon: "1", pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("2", [19.6, 7.5]), corre("1", [25.4, 8.0])], rebote: "1" }, { pase: ["1", "2"] }, { tiro: "2" }] } },
  { titulo: "Tiro por parejas con cierre (shoot & closeout)", desc: "Por parejas con un balón: A pasa a B y corre a cerrarle (sin tocar); B tira. B coge su rebote, pasa a A y le cierra. 2 minutos y se cuentan canastas.", corr: "Cierre con pasos cortos al final y la mano arriba · Tirar a pesar del cierre · Rebote y pase rápido", jug: 2, video: "partner shooting closeout drill", et: ["por parejas", "cierres"], tirador: "2", cierre: [22.2, 11.4],
    mont: { at: { "1": S.tl, "2": S.alaD }, balon: "1", pasos: [{ pase: ["1", "2"], m: [corre("1", hacia(S.tl, S.alaD, 0.75))] }, { tiro: "2" }, { m: [corre("2", [25.0, 9.4])], rebote: "2" }, { pase: ["2", "1"] }] } },
  { titulo: "Tiro 'gana el que antes llegue a 10'", desc: "Dos grupos de 3 en dos canastas: tiran desde el mismo punto, el que anota cambia de punto. Primer grupo en llegar a 10 canastas gana; el que pierde hace una carrera.", corr: "Competir sin perder la técnica · Rebote y pase sin pausa · Comunicación del grupo", jug: 6, video: "competitive team shooting drill", et: ["competición", "grupos"], tirador: "2", cierre: [23.0, 11.0],
    mont: { at: { "1": [24.8, 8.6], "2": S.alaD, "3": [20.6, 13.4] }, balon: "1", pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("2", [25.0, 9.8]), corre("1", [21.4, 13.0]), corre("3", [21, 12.4])], rebote: "2" }, { pase: ["2", "3"] }, { tiro: "3" }] } },
  { titulo: "Tiro en transición de esquina a esquina (11 hombres de tiro)", desc: "Tiradores salen en carriles desde el fondo contrario; el base recibe de un pasador, sube botando y pasa a la esquina para tirar de 3. El tirador coge el rebote y sale hacia el otro aro. Continuo.", corr: "Correr hasta la esquina, pisando la línea de fondo · Girar hacia el balón en los últimos pasos · Tiro con las caderas de cara al aro", jug: 6, video: "transition corner three drill", et: ["transición", "esquina", "tiro de 3"], tirador: "2", cierre: [25.2, 3.0],
    mont: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 1.5] }, balon: "1", pasos: [{ m: [bota("1", [18, 7.5]), corre("2", [18, 1.2], [27, 1])] }, { pase: ["1", "2"] }, { tiro: "2" }] } },
];
for (const s of SERIES_TIRO) for (const v of [
  { c: "", suf: "", extra: "" },
  { c: "pres", suf: " (con presión de defensor)", extra: "Variante con un defensor que cierra a cada tirador con la mano arriba (sin tapar)." },
  { c: "fat", suf: " (tras ejercicio físico)", extra: "Variante con fatiga: antes de cada serie, una carrera de ida y vuelta para tirar cansados, como en el último cuarto." },
]) {
  const m = s.mont, pasos = [...(m.pasos ?? [])];
  let mont: Montaje = { ...m, defensa: "ninguna" };
  if (v.c === "pres") {
    // Un defensor sale desde debajo del aro a cerrar al tirador en cada pase que recibe
    const iPase = pasos.findIndex((p) => p.pase?.[1] === s.tirador);
    const dest = posTras(m.at!, pasos.slice(0, iPase + 1))[s.tirador];
    pasos[iPase] = { ...pasos[iPase], dm: [[s.tirador, hacia(dest, ARO, 0.18)]] };
    mont = { ...m, df: { [s.tirador]: s.cierre }, defensa: "individual", pasos };
  } else if (v.c === "fat") {
    const t = m.at![s.tirador];
    mont = { ...m, defensa: "ninguna", pasos: [{ m: [corre(s.tirador, [m.vista === "completa" ? 2 : 14.4, t[1]], t)] }, ...pasos] };
  }
  tiroMov.push(ej({
    titulo: s.titulo + v.suf, categoria: "Tiro", edades: MAYORES, duracion: 10, jugadores: s.jug + (v.c === "pres" ? 1 : 0), material: "2-3 balones",
    objetivos: "Volumen de tiro con ritmo y competición", descripcion: unir(s.desc, v.extra), correcciones: s.corr,
    etiquetas: ["tiro", ...s.et], video: yt(s.video), montaje: mont,
  }));
}

// ============================================================================
// E) FINALIZACIONES CONTRA AYUDAS Y CON ROTACIONES (cada técnica cambia el último tramo)
// ============================================================================
type Fin = { clave: string; nombre: string; ing: string; tec: string };
const FINALIZACIONES: Fin[] = [
  { clave: "manoc", nombre: "bandeja con la mano contraria", ing: "off hand layup", tec: "Despegue con el pie de la mano de tiro y bandeja con la mano lejana al defensor." },
  { clave: "reverso", nombre: "bandeja en reverso", ing: "reverse layup", tec: "Pasar por debajo del aro y terminar por el otro lado, usando el aro como protección." },
  { clave: "euro", nombre: "paso europeo (euro step)", ing: "euro step finish", tec: "Primer paso hacia un lado y segundo paso hacia el otro, esquivando al defensor." },
  { clave: "flot", nombre: "flotadora", ing: "floater drill", tec: "Tiro a una mano por encima del defensor grande, desde 2-4 metros, sin llegar a contactar." },
  { clave: "parada", nombre: "parada en un tiempo y finta", ing: "jump stop pump fake finish", tec: "Parada en un tiempo en la pintura, finta de tiro, pie de pivote y finalización (por arriba o por debajo)." },
  { clave: "fuerza", nombre: "finalización de fuerza a dos pies", ing: "power layup two feet", tec: "Despegue con los dos pies, balón protegido con las dos manos y finalización buscando el contacto." },
  { clave: "cuchara", nombre: "bandeja de cuchara (scoop)", ing: "scoop layup", tec: "Bandeja con la palma hacia arriba, soltando el balón antes de que llegue el tapón." },
  { clave: "interior", nombre: "mano interior (inside hand)", ing: "inside hand finish", tec: "Finalización con la mano más cercana al defensor, por delante de él, cambiando el ángulo." },
  { clave: "pasos", nombre: "paso cruzado (cross over step)", ing: "crossover step finish", tec: "Paso cruzado por delante del defensor para ganar el ángulo al aro y finalizar con la mano lejana." },
  { clave: "tabla", nombre: "tiro a tabla desde el ángulo", ing: "bank shot angle drill", tec: "Tiro a tabla desde 45º tras parada o desde la carrera, apuntando al cuadrado." },
];
type Sit = { clave: string; nombre: string; desc: string; at: Record<string, P>; df: Record<string, P>; pasos: Pasos; jug: number; quien: string };
const SITUACIONES_FIN: Sit[] = [
  { clave: "ayuda", nombre: "contra ayuda del lado débil", desc: "El atacante penetra desde el ala por la línea de fondo y el defensor del lado débil sale a ayudar en el último momento, delante del aro.", jug: 2, quien: "1",
    at: { "1": S.alaD }, df: { "4": [25.2, 4.4] }, pasos: [{ m: [bota("1", [23.6, 10.6], [25.4, 8.8])], dm: [["4", [25.8, 7.6]]] }, { tiro: "1" }] },
  { clave: "drop", nombre: "contra el pívot que espera atrás", desc: "Bloqueo directo central: el defensor del balón queda atrapado y el pívot defensor espera atrás, en la pintura, para cerrar la penetración.", jug: 4, quien: "1",
    at: { "1": S.cabeza, "5": [21.4, 9.4] }, df: { "1": [20.5, 7.5], "5": [22.2, 9.0] }, pasos: [{ m: [bloq("5", [20.5, 8.4])] }, { m: [bota("1", [21.2, 10.0], [23.4, 9.2])], dm: [["1", [20.8, 9.0], [21.8, 9.8]], ["5", [24.2, 8.6]]] }, { tiro: "1" }] },
  { clave: "contacto", nombre: "con contacto en transición", desc: "En transición 1c1, el defensor persigue al que bota y le da contacto (con un escudo) en el último paso.", jug: 2, quien: "1",
    at: { "1": [16, 9] }, df: { "1": [15, 10.4] }, pasos: [{ m: [bota("1", [22, 9], [25.4, 8.4])], dm: [["1", [24.6, 9.4]]] }, { tiro: "1" }] },
  { clave: "corte", nombre: "tras corte desde la esquina (línea de fondo)", desc: "El ala penetra por el centro; el defensor de ayuda sale a frenarle y el jugador de la esquina corta por la línea de fondo, recibe y finaliza contra ese defensor que vuelve.", jug: 3, quien: "2",
    at: { "1": S.alaI, "2": S.esqD }, df: { "5": [25.2, 9.0] }, pasos: [{ m: [bota("1", [23.4, 4.4], [24.4, 6.2]), corre("2", [27.4, 11.4], [26.8, 9.4])], dm: [["5", [25.0, 7.0]]] }, { pase: ["1", "2"], dm: [["5", [26.0, 8.4]]] }, { tiro: "2" }] },
  { clave: "2c1", nombre: "en 2c1 contra el defensor que duda", desc: "Dos atacantes contra un defensor que protege el aro: el que bota ataca; el defensor duda y se va hacia el pase, y el que bota finaliza.", jug: 3, quien: "1",
    at: { "1": [17, 9], "2": [17, 4] }, df: { "1": [23.6, 7.5] }, pasos: [{ m: [bota("1", [22.6, 9.0]), corre("2", [24.6, 4.4])], dm: [["1", [23.4, 8.4]]] }, { m: [bota("1", [25.4, 8.8])], dm: [["1", [24.8, 6.2]]] }, { tiro: "1" }] },
];
/** El último tramo hacia el aro según la técnica */
const rematar = (pasos: Pasos, quien: string, tec: string, at: Record<string, P>): Pasos => {
  const out = pasos.map((p) => ({ ...p, ...(p.m ? { m: p.m.map((x) => [...x] as Mov) } : {}) }));
  let iMov = -1, j = -1;
  out.forEach((p, i) => p.m?.forEach((x, k) => { if (x[0] === quien && x[1] !== "bloqueo") { iMov = i; j = k; } }));
  if (iMov < 0) return out;
  const mv = out[iMov].m![j] as Mov;
  const pts = mv.slice(2) as P[];
  const fin = pts[pts.length - 1], ant = pts.length > 1 ? pts[pts.length - 2] : posTras(at, out.slice(0, iMov))[quien];
  const u: P = [fin[0] - ant[0], fin[1] - ant[1]], n = Math.hypot(u[0], u[1]) || 1, perp: P = [-u[1] / n, u[0] / n];
  const l = lado(fin);
  let nuevos: P[] = pts;
  if (tec === "reverso") nuevos = [...pts, [27.3, 7.5], [26.9, r1(7.5 - l * 1.0)]];
  else if (tec === "euro") nuevos = [...pts.slice(0, -1), [r1(fin[0] - (u[0] / n) * 0.9 + perp[0] * 0.8), r1(fin[1] - (u[1] / n) * 0.9 + perp[1] * 0.8)], [r1(fin[0] - perp[0] * 0.4), r1(fin[1] - perp[1] * 0.4)]];
  else if (tec === "flot") nuevos = [...pts.slice(0, -1), hacia(fin, ant, 0.4)];
  else if (tec === "parada") nuevos = [...pts.slice(0, -1), hacia(fin, ant, 0.25)];
  else if (tec === "pasos") nuevos = [...pts.slice(0, -1), [r1(fin[0] + perp[0] * 0.8), r1(fin[1] + perp[1] * 0.8)], fin];
  else if (tec === "tabla") nuevos = [...pts.slice(0, -1), [24.4, r1(7.5 + l * 2.2)]];
  else if (tec === "manoc") nuevos = [...pts.slice(0, -1), [26.0, r1(7.5 + l * 0.3)]];
  else if (tec === "fuerza") nuevos = [...pts.slice(0, -1), [25.4, r1(7.5 + l * 1.4)], [25.6, r1(7.5 + l * 1.3)]];
  else if (tec === "cuchara") nuevos = [...pts.slice(0, -1), [r1(fin[0] - 0.6), r1(fin[1] + l * 0.9)], [25.6, r1(7.5 + l * 0.7)]];
  else if (tec === "interior") nuevos = [...pts.slice(0, -1), [r1(fin[0] + perp[0] * 0.6), r1(fin[1] + perp[1] * 0.6)]];
  out[iMov].m![j] = [mv[0], mv[1], ...nuevos];
  return out;
};
const finalizaciones: EjercicioSemilla[] = [];
for (const f of FINALIZACIONES) for (const s of SITUACIONES_FIN) finalizaciones.push(ej({
  titulo: `Finalización: ${f.nombre} ${s.nombre}`, categoria: "Tiro", edades: ADULTOS, duracion: 10, jugadores: s.jug + 2, material: "2 balones, escudo de contacto",
  objetivos: `Dominar la ${f.nombre} en situación real (${s.nombre})`,
  descripcion: unir(s.desc, "Técnica a usar:", f.tec, "Primero sin oposición (5 por lado), después con el defensor real. Se cuentan canastas por serie de 10."),
  correcciones: "Leer al defensor antes del último bote · Proteger el balón con el cuerpo y el brazo libre · Terminar arriba y suave, a tabla si hay ángulo · Seguir la jugada al rebote si falla",
  etiquetas: ["finalización", f.clave, s.clave], video: yt(f.ing), montaje: { at: s.at, df: s.df, defensa: "ninguna", balon: "1", pasos: rematar(s.pasos, s.quien, f.clave, s.at) },
}));

// ============================================================================
// F) DEFENSA: SHELL, CIERRES Y ROTACIONES (la defensa se mueve en cada pase)
// ============================================================================
type Jugada = { at: Record<string, P>; balon: string; pasos: Pasos };
type Shell = { clave: string; nombre: string; ing: string; desc: string; corr: string; f4: Jugada; f5: Jugada };
const A4 = { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD };
const A5 = { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqD, "5": S.posteI };
const SHELL: Shell[] = [
  { clave: "pase", nombre: "desplazamientos con cada pase", ing: "shell drill basic", desc: "El ataque pasa el balón alrededor (sin penetrar). Cada defensor ajusta su posición con cada pase: presión al balón, negación a un pase, ayuda en el lado débil.", corr: "Moverse mientras el balón está en el aire · Ver balón y atacante (triángulo) · Hablar: 'balón', 'ayuda', 'niego'",
    f4: { at: A4, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "2"] }] },
    f5: { at: A5, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "2"] }] } },
  { clave: "penetra", nombre: "ayuda y recuperación ante penetración", ing: "shell drill help and recover", desc: "El atacante con balón penetra; el defensor de ayuda más cercano frena (ayuda completa) y recupera cuando el balón sale a su jugador.", corr: "Ayudar con el cuerpo, no con las manos · Recuperar con pasos cortos y la mano arriba · El siguiente defensor rota si la ayuda se queda",
    f4: { at: A4, balon: "2", pasos: [{ m: [bota("2", [23.6, 10.4])], ayuda: "4" }, { pase: ["2", "4"] }] },
    f5: { at: A5, balon: "2", pasos: [{ m: [bota("2", [23.4, 11.4], [24.6, 10.2])], ayuda: "5" }, { pase: ["2", "5"] }] } },
  { clave: "poste", nombre: "defender el pase al poste", ing: "post defense shell drill", desc: "El balón llega al ala y de ahí al poste bajo. El defensor del poste le niega 3/4 por delante desde el ala; tras el pase interior, los exteriores caen hacia dentro y salen al pase de vuelta.", corr: "Negar por el lado del balón (3/4 por delante) · Tras pase al poste, caer a la línea de pase de vuelta · Doble defensa solo si está pactada",
    f4: { at: { "1": S.baseI, "2": S.baseD, "4": S.alaD, "5": S.posteD }, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "5"] }, { pase: ["5", "1"] }] },
    f5: { at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqI, "5": S.posteD }, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "5"] }, { pase: ["5", "3"] }] } },
  { clave: "skip", nombre: "cierres tras pase por encima", ing: "skip pass closeout shell", desc: "El ataque hace pases de lado a lado por encima (skip). El defensor del lado débil, que estaba en ayuda, tiene que cerrar a su jugador desde lejos.", corr: "Salir con el pase, no después · Cierre con pasos cortos al final · Mano arriba al lado del tiro",
    f4: { at: A4, balon: "2", pasos: [{ pase: ["2", "3"] }, { pase: ["3", "4"] }] },
    f5: { at: A5, balon: "2", pasos: [{ pase: ["2", "3"] }, { pase: ["3", "4"] }] } },
  { clave: "indirecto", nombre: "defender bloqueos indirectos", ing: "shell drill screens", desc: "El ataque pone un bloqueo indirecto hacia abajo lejos del balón; el defensor del tirador persigue y el del bloqueador ayuda un instante, con comunicación.", corr: "Avisar el bloqueo antes de que llegue · El defensor del bloqueador ayuda un instante (show) · Pasar pegados al cortador",
    f4: { at: { "1": S.cabeza, "2": [25.4, 10.2], "4": S.alaD, "3": S.alaI }, balon: "1", pasos: [{ m: [bloq("4", [23.8, 11.4])] }, { m: [corre("2", [24.6, 12.0], [21.4, 12.6])] }, { pase: ["1", "2"] }] },
    f5: { at: { "1": S.cabeza, "2": [25.4, 10.2], "4": S.alaD, "3": S.alaI, "5": S.posteI }, balon: "1", pasos: [{ m: [bloq("4", [23.8, 11.4])] }, { m: [corre("2", [24.6, 12.0], [21.4, 12.6])] }, { pase: ["1", "2"] }] } },
  { clave: "directo", nombre: "defender el bloqueo directo con rotación", ing: "pick and roll defense shell rotation", desc: "El ataque juega un bloqueo directo; la defensa ejecuta la cobertura, el defensor del lado débil toca al que continúa (tag) y, cuando el balón sale a su jugador, cierra desde ahí (X-out).", corr: "El tag del lado débil, al que continúa · Rotaciones 'del fondo a la esquina' · Recuperar al más peligroso",
    f4: { at: { "1": S.cabeza, "2": S.alaD, "3": S.esqI, "4": [22.2, 9.2] }, balon: "1", pasos: [{ m: [bloq("4", [20.4, 8.4])] }, { m: [bota("1", [21, 10.2], [22.6, 10.8])] }, { m: [corre("4", [25.2, 8.4])], dm: [["3", [25.0, 7.0]]] }, { pase: ["1", "3"], dm: [["3", [26.2, 2.0]]] }] },
    f5: { at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqI, "5": [22.2, 9.2] }, balon: "1", pasos: [{ m: [bloq("5", [20.4, 8.4])] }, { m: [bota("1", [21, 10.2], [22.6, 10.8])] }, { m: [corre("5", [25.2, 8.4])], dm: [["4", [25.2, 7.0]]] }, { pase: ["1", "4"], dm: [["4", [26.2, 2.0]]] }] } },
  { clave: "xout", nombre: "rotación en X (X-out) tras pase", ing: "x out rotation drill", desc: "Tras una ayuda desde el lado débil, el balón sale a ese lado: los dos defensores del lado débil cambian de jugador en X (el que ayudó sube al de arriba y el de arriba baja a la esquina) para no llegar tarde.", corr: "El que está más cerca del pase va al balón · Hablar el cambio · Cierre controlado, sin saltar",
    f4: { at: A4, balon: "2", pasos: [{ m: [bota("2", [23.6, 10.4])], dm: [["3", [24.6, 9.6]]], ayuda: "3" }, { pase: ["2", "3"], dm: [["1", [26.0, 2.0]], ["3", [20.6, 5.6]]] }, { pase: ["3", "1"] }] },
    f5: { at: A5, balon: "2", pasos: [{ m: [bota("2", [23.4, 11.6], [25.0, 10.4])], dm: [["5", [25.6, 9.0]]], ayuda: "5" }, { pase: ["2", "4"] }, { pase: ["4", "3"] }] } },
  { clave: "mano", nombre: "defender el mano a mano", ing: "defend dribble handoff", desc: "El ataque hace un mano a mano en el perímetro: el defensor del receptor tiene que pasar por encima de la entrega (o adelantarse) y el del que entrega se queda pegado para no dejar el pase al aro.", corr: "El defensor del receptor se anticipa a la entrega · El del que entrega se pone pegado (no dejar el pase al aro) · Hablar",
    f4: { at: A4, balon: "1", pasos: [{ m: [bota("1", [20.2, 8.8]), corre("2", [20.4, 10.4])] }, { mano: ["1", "2"] }, { m: [bota("2", [22.8, 9.6])] }] },
    f5: { at: A5, balon: "1", pasos: [{ m: [bota("1", [20.4, 10.6]), corre("2", [21.4, 11.6])] }, { mano: ["1", "2"] }, { m: [bota("2", [23.2, 9.8])] }] } },
];
const shell: EjercicioSemilla[] = [];
for (const s of SHELL) for (const fmt of [{ c: "4c4", j: 8, jg: s.f4 }, { c: "5c5", j: 10, jg: s.f5 }]) {
    shell.push(ej({
      titulo: `Shell ${fmt.c}: ${s.nombre}`, categoria: "Defensa", edades: ADULTOS, duracion: 12, jugadores: fmt.j, material: "1 balón",
      objetivos: `Defensa de equipo: ${s.nombre}`, descripcion: unir(`${fmt.c} en media pista.`, s.desc, "Primero a medio ritmo, con el entrenador parando para corregir posiciones; después en vivo: tras 4 pases el ataque puede atacar y se juega hasta canasta o rebote defensivo."),
      correcciones: s.corr, etiquetas: ["shell", "defensa de equipo", s.clave, fmt.c, "rotaciones"], video: yt(s.ing),
      montaje: { at: fmt.jg.at, defensa: "individual", balon: fmt.jg.balon, pasos: fmt.jg.pasos },
    }));
  }
const CIERRES: { t: string; d: string; j: number; m: Montaje }[] = [
  { t: "Cierres 1c1 desde la pintura", d: "El defensor, con el balón en la pintura, pasa al atacante del ala y sale a cerrarle; el atacante juega 1c1 con 2 botes como máximo.", j: 2,
    m: { at: { "2": S.alaD }, df: { "2": [25.2, 8.4] }, balon: "d2", defensa: "ninguna", pasos: [{ pase: ["d2", "2"], m: [corre("d2", [22.0, 11.6])] }, { m: [bota("2", [23.4, 12.8], [25.4, 10.8]), corre("d2", [24.4, 11.4])] }, { tiro: "2" }] } },
  { t: "Cierres en la esquina contra la línea de fondo", d: "El entrenador pasa a la esquina y el defensor cierra negando la línea de fondo: llega por fuera, con los pies orientados hacia el centro, y obliga a botar hacia la ayuda.", j: 2,
    m: { at: { "2": S.esqD }, entrenador: S.alaD, balon: "e", df: { "2": [25.2, 9.0] }, defensa: "ninguna", pasos: [{ pase: ["e", "2"], m: [corre("d2", [26.4, 12.9])] }, { m: [bota("2", [25.4, 12.6], [24.4, 10.2]), corre("d2", [25.0, 11.2])] }, { tiro: "2" }] } },
  { t: "Cierre y caída: 2c2 desde la ayuda", d: "Dos defensores en la pintura; el entrenador pasa a uno de los dos atacantes abiertos y su defensor cierra mientras el otro cae a la ayuda; si el balón cambia de lado, cierra el segundo.", j: 4,
    m: { at: { "2": S.alaD, "3": S.alaI }, entrenador: S.cabeza, balon: "e", df: { "2": [24.4, 8.6], "3": [24.4, 6.4] }, defensa: "ninguna", pasos: [{ pase: ["e", "2"], m: [corre("d2", [22.0, 11.6]), corre("d3", [23.4, 7.6])] }, { m: [bota("2", [23.4, 10.8]), corre("d3", [24.2, 9.4])] }, { pase: ["2", "3"], m: [corre("d3", [21.9, 3.4])] }, { tiro: "3" }] } },
  { t: "Cierre largo tras skip (3c3)", d: "3c3: con el balón en un ala, el defensor del ala contraria está en ayuda cerca de la pintura. El balón cambia de lado por encima (skip) y tiene que cerrar desde ahí hasta el ala contraria.", j: 6,
    m: { at: { "1": S.alaD, "2": S.esqD, "3": S.alaI }, defensa: "individual", balon: "1", pasos: [{ pase: ["1", "3"] }, { m: [bota("3", [23.4, 3.4])] }, { tiro: "3" }] } },
  { t: "Cierre con tapón de atrás (contest)", d: "El defensor sale tarde a propósito (desde debajo del aro) y practica molestar el tiro con la mano arriba sin saltar al cuerpo del tirador.", j: 2,
    m: { at: { "2": S.alaD }, entrenador: S.cabeza, balon: "e", df: { "2": [26.0, 8.4] }, defensa: "ninguna", pasos: [{ pase: ["e", "2"], m: [corre("d2", [22.4, 11.2])] }, { tiro: "2" }] } },
  { t: "Cierres en cadena (rueda de 4)", d: "Cuatro atacantes en el arco y dos defensores dentro: con cada pase cierra el defensor más cercano al receptor y el otro vuelve a la ayuda, sin parar.", j: 6,
    m: { at: { "1": S.alaI, "2": S.cabeza, "3": S.alaD, "4": S.esqD }, df: { "1": [23.4, 4.6], "2": [23.4, 10.4] }, defensa: "zonaLibre", balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { pase: ["3", "4"] }] } },
];
for (const c of CIERRES) for (const v of [{ s: "", e: "Si el defensor hace falta o salta al tirador, vuelve a empezar." }]) shell.push(ej({
  titulo: c.t + v.s, categoria: "Defensa", edades: MAYORES, duracion: 10, jugadores: c.j, material: "2 balones",
  objetivos: "Cerrar al tirador sin ser superado · Pasos cortos y mano arriba",
  descripcion: unir(c.d, v.e, "Series de 6 cierres por jugador."),
  correcciones: "Sprint los primeros pasos y pasos cortos al final · Mano arriba al lado de la mano de tiro · Pies orientados para cortar la penetración · No saltar", etiquetas: ["cierres", "close out", "defensa"],
  video: yt("closeout drill basketball"), montaje: c.m,
}));

// ============================================================================
// G) REBOTE (tiro, choque y cierre; quién coge el balón según el foco)
// ============================================================================
type Reb = { t: string; f: string; j: number; d: string; at: Record<string, P>; df?: Record<string, P>; antes?: Pasos; tiro: Pasos; choque: Mov[]; nado: Mov[]; reb: string; rebAt: string; balon?: string };
const ENT: P = [22.4, 7.5];
const REBOTE: Reb[] = [
  { t: "Rebote 1c1 tras tiro del entrenador (cerrar y salir)", f: "1c1", j: 2, d: "El entrenador tira desde el tiro libre; el defensor localiza, contacta y cierra al atacante, que intenta ganar la posición.", at: { "2": S.alaD }, df: { "2": [23.4, 10.6] },
    tiro: [{ tiro: "e" }], choque: [corre("2", [24.6, 9.8])], nado: [corre("2", [23.8, 11.6], [25.6, 9.4])], reb: "d2", rebAt: "2" },
  { t: "Rebote 2c2 desde el lado débil", f: "2c2", j: 4, d: "Dos atacantes en el lado débil (ala y esquina) y sus defensores en posición de ayuda. Tras el tiro del entrenador, cierre del rebote desde la ayuda (más lejos, más difícil).", at: { "2": S.alaI, "3": S.esqI }, df: { "2": [23, 5.6], "3": [25.2, 4.6] },
    tiro: [{ tiro: "e" }], choque: [corre("2", [24.2, 4.6]), corre("3", [26.4, 4.2])], nado: [corre("2", [22.8, 3.8], [24.8, 5.6]), corre("3", [27.4, 3.8], [26.8, 6.0])], reb: "d3", rebAt: "3" },
  { t: "Rebote 3c3 con atacantes en movimiento", f: "3c3", j: 6, d: "Los atacantes se cruzan (cortes y relevos) hasta que el entrenador tira. La defensa tiene que seguirles, localizar, contactar y cerrar con el atacante en movimiento.", at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI },
    antes: [{ m: [corre("2", [24.4, 10.4], [24.4, 5.4]), corre("3", [22.6, 4.4], [21.4, 11.8])] }], tiro: [{ tiro: "e" }], choque: [corre("1", [23.6, 8.2]), corre("2", [25.8, 6.0]), corre("3", [24.2, 10.8])], nado: [corre("1", [22.6, 9.2], [24.6, 8.4]), corre("2", [26.8, 5.2], [26.4, 6.6]), corre("3", [23.2, 11.6], [25.2, 9.6])], reb: "d2", rebAt: "2" },
  { t: "Rebote 4c4 (shell) tras tiro y transición", f: "4c4", j: 8, d: "Shell 4c4: el ataque mueve el balón y tira tras 4 pases. La defensa cierra el rebote y, al cogerlo, sale en transición a la otra canasta (4c4 toda la pista).", at: F4, balon: "1",
    tiro: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "2"] }, { tiro: "2" }], choque: [corre("2", [23.2, 9.6]), corre("1", [17.8, 6.0]), corre("3", [25.6, 3.8]), corre("4", [26.2, 11.6])], nado: [corre("2", [22.4, 10.8], [24.2, 9.0]), corre("1", [17.8, 6.0]), corre("3", [27.2, 3.2], [26.4, 5.6]), corre("4", [27.4, 11.2], [26.6, 9.6])], reb: "d4", rebAt: "4" },
  { t: "Rebote 5c5 con puntos por rebote", f: "5c5", j: 10, d: "5c5 media pista: cada rebote ofensivo suma 1 punto al ataque y cada rebote defensivo con salida limpia suma 1 a la defensa. El base se queda de balance.", at: F5, balon: "1",
    tiro: [{ pase: ["1", "2"] }, { tiro: "2" }], choque: [corre("1", [17.8, 7.5]), corre("2", [23.4, 10.6]), corre("3", [24.0, 4.4]), corre("4", [26.2, 3.0]), corre("5", [26.4, 8.6])], nado: [corre("1", [17.8, 7.5]), corre("2", [22.6, 11.6], [24.4, 9.6]), corre("3", [23.0, 3.4], [24.8, 5.4]), corre("4", [27.4, 3.0], [26.6, 5.2]), corre("5", [27.2, 9.4], [26.4, 7.6])], reb: "d5", rebAt: "5" },
  { t: "Guerra de rebote 3 contra 3 en la pintura", f: "3c3", j: 6, d: "Tres contra tres dentro de la zona; el entrenador tira y se juega el rebote hasta canasta (2 puntos por canasta tras rebote ofensivo). El que no gana, sale.", at: { "1": S.posteD, "2": S.posteI, "3": S.tl }, df: { "1": [25.4, 9], "2": [25.4, 6], "3": [23.6, 7.5] },
    tiro: [{ tiro: "e" }], choque: [corre("1", [26.4, 9.4]), corre("2", [26.4, 5.6]), corre("3", [24.8, 7.5])], nado: [corre("1", [26.8, 10.4], [26.8, 8.6]), corre("2", [26.8, 4.6], [26.8, 6.4]), corre("3", [24.0, 8.8], [25.4, 8.0])], reb: "d1", rebAt: "1" },
];
const rebote: EjercicioSemilla[] = [];
for (const r of REBOTE) for (const v of [
  { c: "cerrar", s: "", e: "", cr: "Contactar primero (pie y antebrazo) y luego buscar el balón · Bajar el centro de gravedad · Coger el balón con las dos manos y protegerlo en la barbilla" },
  { c: "ofensivo", s: " · rebote ofensivo", e: "El foco está en el ataque: tiene que ganar la posición por dentro con pasos de rodeo (swim, spin) y palmear o anotar si coge el balón.", cr: "Ir al rebote desde el lado débil · Esquivar el contacto con pasos de rodeo · Palmear el balón si no se puede coger" },
  { c: "salida", s: " · salida de rebote", e: "Tras ganar el rebote defensivo, salida inmediata: pivote hacia fuera y pase de salida al base (el entrenador hace de base) en la banda en menos de 2 segundos.", cr: "Pivotar hacia fuera tras el rebote · Pase de salida por encima de la cabeza · El base se abre a la banda a recibir" },
]) {
  const conEnt = !r.balon || v.c === "salida";
  const pasos: Pasos = [...(r.antes ?? []), ...r.tiro,
    { m: [...(v.c === "ofensivo" ? r.nado : r.choque), ...(v.c === "salida" ? [corre("e", [20.4, 14.2])] : [])], cierra: true },
    ...(v.c === "ofensivo" ? [{ rebote: r.rebAt }, { tiro: r.rebAt }] : [{ rebote: r.reb }]),
    ...(v.c === "salida" ? [{ pase: [r.reb, "e"] as [string, string] }] : []),
  ];
  rebote.push(ej({
    titulo: r.t + v.s, categoria: "Rebote", edades: MAYORES, duracion: 10, jugadores: r.j, material: "1 balón",
    objetivos: "Ganar el rebote con contacto y posición", descripcion: unir(r.d, v.e, "Series de 6 tiros por grupo."),
    correcciones: v.cr, etiquetas: ["rebote", r.f, v.c === "cerrar" ? "cerrar el rebote" : v.c === "ofensivo" ? "rebote ofensivo" : "salida de rebote"],
    video: yt(`${r.f} rebounding drill box out`),
    montaje: { at: r.at, ...(r.df ? { df: r.df } : {}), defensa: "individual", ...(conEnt ? { entrenador: r.balon ? [20.4, 13.6] as P : ENT } : {}), balon: r.balon ?? "e", pasos },
  }));
}

// ============================================================================
// H) TRANSICIÓN (toda la pista: cada situación con su dibujo)
// ============================================================================
type Var = "base" | "5s" | "inf" | "sb";
type Trans = { t: string; j: number; d: string; ing: string; m: Montaje; sb?: Pasos; vars: Var[] };
const TRANS: Trans[] = [
  { t: "2c1 continuo (ida y vuelta)", j: 5, ing: "2 on 1 continuous drill", vars: ["base", "5s", "inf", "sb"],
    d: "Dos atacantes contra un defensor que espera en la zona; el que bota ataca el aro por un lado y el compañero llena el otro carril. El defensor frena el balón y el que bota pasa en cuanto se compromete. Tras canasta o rebote, el defensor y el que ha anotado salen 2c1 al otro aro contra un nuevo defensor que espera.",
    m: { vista: "completa", at: { "1": [12, 9], "2": [12, 4] }, df: { "1": [23.6, 7.5] }, defensa: "ninguna", balon: "1", pasos: [{ m: [bota("1", [21.6, 9.0]), corre("2", [22.4, 3.6])], dm: [["1", [23.0, 8.4]]] }, { pase: ["1", "2"], dm: [["1", [24.8, 6.0]]] }, { tiro: "2" }] },
    sb: [{ m: [corre("2", [18.4, 3.8])] }, { pase: ["1", "2"] }, { m: [corre("1", [22.4, 9.0])], dm: [["1", [23.6, 6.2]]] }, { pase: ["2", "1"], dm: [["1", [24.8, 8.2]]] }, { tiro: "1" }] },
  { t: "3c2 → 2c1 (continuo)", j: 5, ing: "3 on 2 2 on 1 drill", vars: ["base", "5s", "inf", "sb"],
    d: "Tres atacantes contra dos defensores en tándem (uno arriba y otro abajo). El de arriba frena el balón, el de abajo sale al primer pase al ala y el de arriba cae al aro: el pase al ala contraria deja el tiro libre. Al acabar, los dos defensores atacan 2c1 hacia el otro aro contra el que ha tirado.",
    m: { vista: "completa", at: { "1": [12, 7.5], "2": [12, 2.5], "3": [12, 12.5] }, df: { "1": [21.4, 7.5], "2": [24.8, 7.5] }, defensa: "ninguna", balon: "1", pasos: [{ m: [bota("1", [19.6, 7.5]), corre("2", [22.6, 2.4]), corre("3", [22.6, 12.6])], dm: [["1", [20.8, 7.5]]] }, { pase: ["1", "3"], dm: [["2", [23.8, 11.4]], ["1", [25.0, 6.4]]] }, { pase: ["3", "2"], dm: [["1", [23.6, 3.6]]] }, { tiro: "2" }] },
    sb: [{ m: [corre("2", [19.6, 2.4]), corre("3", [19.6, 12.6])] }, { pase: ["1", "3"], dm: [["2", [23.8, 11.4]], ["1", [24.4, 6.8]]] }, { m: [corre("1", [21.4, 7.5]), corre("2", [22.8, 2.4])] }, { pase: ["3", "2"], dm: [["1", [23.6, 3.6]]] }, { tiro: "2" }] },
  { t: "4c3 con defensor que llega tarde", j: 8, ing: "4 on 3 transition drill", vars: ["base", "5s", "inf"],
    d: "Cuatro atacantes contra tres defensores colocados en triángulo; el cuarto defensor sale tarde (toca la línea de fondo contraria) y tiene que incorporarse. El ataque abre el balón al ala y el trailer (el cuarto atacante) entra por el centro antes de que llegue el defensor tardío.",
    m: { vista: "completa", at: { "1": [13, 7.5], "2": [13, 2.5], "3": [13, 12.5], "4": [9, 9] }, df: { "1": [21, 7.5], "2": [24.6, 5.4], "3": [24.6, 9.6], "4": [3, 7.5] }, defensa: "ninguna", balon: "1",
      pasos: [{ m: [bota("1", [19.6, 7.5]), corre("2", [22.6, 2.4]), corre("3", [22.6, 12.6]), corre("4", [17.6, 9.4])], dm: [["1", [20.6, 7.5]], ["4", [12, 7.5]]] }, { pase: ["1", "3"], dm: [["3", [23.4, 11.6]], ["1", [22.6, 9.4]], ["4", [17.0, 8.0]]] }, { m: [corre("4", [22.6, 8.8])], dm: [["4", [21.0, 8.6]]] }, { pase: ["3", "4"] }, { tiro: "4" }] } },
  { t: "5c4 y 5c5 (el último defensor entra tarde)", j: 10, ing: "5 on 5 transition drill", vars: ["base", "5s", "inf"],
    d: "Cinco contra cuatro con el quinto defensor entrando tras tocar la línea de medio campo: el ataque llena los cinco carriles (dos esquinas, el base, el trailer y el interior corriendo al aro) y busca al interior antes de que llegue el quinto defensor.",
    m: { vista: "completa", at: { "1": [13, 7.5], "2": [13, 2], "3": [13, 13], "4": [10, 5], "5": [9, 10] }, df: { "1": [20.6, 7.5], "2": [23.4, 3.6], "3": [23.4, 11.4], "4": [25.4, 7.5], "5": [14, 9.6] }, balon: "1",
      pasos: [{ m: [bota("1", [19.4, 7.5]), corre("2", [26.8, 1.4]), corre("3", [26.8, 13.6]), corre("4", [21.6, 5.0]), corre("5", [24.8, 9.6])], dm: [["5", [19.0, 9.0]]] }, { pase: ["1", "5"], dm: [["5", [23.2, 9.4]]] }, { tiro: "5" }] } },
  { t: "Transición de 11 jugadores (11-man break)", j: 11, ing: "11 man break drill", vars: ["base", "5s", "sb"],
    d: "Tres atacantes contra dos defensores en tándem en un aro; en cada banda, a la altura del medio campo contrario, espera un jugador para la salida. Quien coge el rebote o la canasta saca rápido a uno de ellos y atacan el otro aro 3c2 contra los dos que esperan allí.",
    m: { vista: "completa", at: { "1": [12, 7.5], "2": [12, 2.5], "3": [12, 12.5], "4": [5, 0.8], "5": [5, 14.2] }, df: { "1": [21.4, 7.5], "2": [24.8, 7.5] }, defensa: "ninguna", balon: "1",
      pasos: [{ m: [bota("1", [19.6, 7.5]), corre("2", [22.6, 2.4]), corre("3", [22.6, 12.6])], dm: [["1", [20.8, 7.5]]] }, { pase: ["1", "3"], dm: [["2", [23.8, 11.4]], ["1", [25.0, 6.4]]] }, { pase: ["3", "2"], dm: [["1", [23.6, 3.6]]] }, { tiro: "2" }] },
    sb: [{ m: [corre("2", [19.6, 2.4]), corre("3", [19.6, 12.6])] }, { pase: ["1", "3"], dm: [["2", [23.8, 11.4]], ["1", [24.4, 6.8]]] }, { m: [corre("2", [22.8, 2.4])] }, { pase: ["3", "2"], dm: [["1", [23.6, 3.6]]] }, { tiro: "2" }] },
  { t: "3c3 tras saque de fondo rápido", j: 6, ing: "quick inbound transition drill", vars: ["base", "5s", "inf", "sb"],
    d: "Tras canasta, el equipo que ha recibido saca rápido desde el fondo y ataca 3c3 en toda la pista: el que saca entra corriendo por el centro, el base sube botando y el tercero corre el carril; buscan ventaja antes de que la defensa se coloque.",
    m: { vista: "completa", at: { "1": [0.3, 6], "2": [3, 2.6], "3": [5, 11.4] }, defensa: "individual", balon: "1",
      pasos: [{ pase: ["1", "2"] }, { m: [bota("2", [11, 3.0], [20.4, 3.4]), corre("1", [8, 7.6], [22.2, 8.0]), corre("3", [12, 12.4], [22, 12.4])] }, { pase: ["2", "1"] }, { tiro: "1" }] },
    sb: [{ pase: ["1", "2"] }, { m: [corre("3", [12, 12.4], [16, 12.4]), corre("1", [8, 7.6])] }, { pase: ["2", "3"] }, { m: [corre("1", [22.4, 8.4]), corre("2", [12, 3.0], [20.6, 3.4])] }, { pase: ["3", "1"] }, { tiro: "1" }] },
  { t: "Balance defensivo tras tiro (4c4 + 1)", j: 9, ing: "defensive transition balance drill", vars: ["base", "5s"],
    d: "Se juega 4c4 media pista con un quinto defensor esperando bajo el aro. Al tirar, el ataque manda a dos al rebote y dos al balance; el quinto defensor sale corriendo hacia el otro aro (leak-out) y, si nadie le frena, recibe el pase largo tras el rebote.",
    m: { vista: "completa", at: { "1": [19.6, 5], "2": [19.6, 10], "3": [27, 1], "4": [27, 14] }, df: { "1": [20.6, 5.4], "2": [20.6, 9.6], "3": [25.8, 4.0], "4": [25.8, 11.0], "5": [26.6, 7.5] }, balon: "1",
      pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("1", [9, 6.6]), corre("2", [12, 9.0]), corre("3", [25.4, 4.6]), corre("4", [25.4, 10.6])], dm: [["5", [17, 7.5], [6.4, 8.4]]], cierra: true }, { rebote: "d4" }, { pase: ["d4", "d5"] }] } },
  { t: "Primer pase tras rebote en menos de 2 segundos", j: 6, ing: "outlet pass fast break drill", vars: ["base", "5s"],
    d: "El entrenador tira; el interior coge el rebote, pivota hacia fuera y hace el pase de salida al base, que se ha abierto a la banda, en menos de 2 segundos. El base sube botando por el centro y los aleros corren los carriles exteriores hacia el otro aro.",
    m: { vista: "completa", entrenador: [22.2, 7.5], at: { "5": [25.6, 9.4], "1": [22.4, 12.6], "2": [23.4, 2.6], "3": [20.6, 10.6] }, defensa: "ninguna", balon: "e",
      pasos: [{ tiro: "e" }, { m: [corre("5", [26.0, 8.4]), corre("1", [20.6, 14.2])], rebote: "5" }, { pase: ["5", "1"] }, { m: [bota("1", [14, 11.4], [9, 8.4]), corre("2", [14, 2.0], [6, 2.0]), corre("3", [14, 13.4], [6, 13.2])] }] } },
];
const VAR_TRANS: Record<Var, { s: string; e: string; c: string }> = {
  base: { s: "", e: "", c: "Correr los carriles anchos · El balón por el centro · Atacar el aro antes de que se coloque la defensa" },
  "5s": { s: " · con límite de 5 segundos", e: "El ataque tiene 5 segundos para tirar desde que cruza el medio campo.", c: "Decidir rápido · El primer pase hacia delante · No botar si hay un compañero por delante" },
  inf: { s: " · defensa en inferioridad", e: "El foco está en la defensa: frenar el balón, proteger el aro y ganar tiempo con fintas de ayuda hasta que lleguen los compañeros.", c: "El primero protege el aro, el segundo frena el balón · Fintas de ayuda para que el ataque dude · Hablar" },
  sb: { s: " · solo pase (sin bote)", e: "No se puede botar hasta el último bote para finalizar: el balón avanza solo con pases a compañeros que van por delante.", c: "Pases por delante del receptor · Correr sin balón · Pase picado para terminar" },
};
const transicion: EjercicioSemilla[] = [];
for (const t of TRANS) for (const v of t.vars) transicion.push(ej({
  titulo: t.t + VAR_TRANS[v].s, categoria: "Transición", edades: MAYORES, duracion: 12, jugadores: t.j, material: "2 balones",
  objetivos: "Transición rápida y eficaz (ataque y defensa)", descripcion: unir(t.d, VAR_TRANS[v].e, "Series de 4 minutos."),
  correcciones: VAR_TRANS[v].c, etiquetas: ["transición", "toda la pista", v === "base" ? "contraataque" : VAR_TRANS[v].s.replace(" · ", "")], video: yt(t.ing),
  montaje: v === "sb" && t.sb ? { ...t.m, pasos: t.sb } : t.m,
}));

// ============================================================================
// I) PRESIÓN DE TODA LA PISTA (defenderla y atacarla): cada presión con su colocación y su trampa
// ============================================================================
type Pres = { c: string; n: string; ing: string; d: string; romper: string; fmts: string[]; m: (n: number) => { at: Record<string, P>; df: Record<string, P>; balon: string; vista?: "completa" | "ofensiva"; def: Pasos; atq: Pasos; defensa?: Montaje["defensa"] } };
const solo = <T,>(o: Record<string, T>, ks: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => ks.includes(k)));
const PRESIONES: Pres[] = [
  { c: "221", n: "2-2-1", ing: "2-2-1 press", fmts: ["5c5"],
    d: "Dos defensores arriba (a la altura del tiro libre) dejan entrar el primer pase a la banda; cuando el balón sube por la banda, el de arriba de ese lado lo encierra contra la línea y el del medio campo de ese lado sube a hacer la trampa. El otro de arriba niega el pase al centro, el otro del medio campo baja al centro y el último protege el aro.",
    romper: "Contra la 2-2-1: no botar hacia la banda; el centro (3) se mueve a la vista del balón para recibir antes de la trampa, gira y ataca la superioridad hacia el aro.",
    m: () => ({ vista: "completa", balon: "4", at: { "4": [0.3, 9.4], "1": [3.4, 3.2], "2": [3.4, 11.8], "3": [9.6, 7.5], "5": [17, 7.5] }, df: { "1": [6.4, 5.2], "2": [6.4, 9.8], "3": [12.4, 3.0], "4": [12.4, 12.0], "5": [20.6, 7.5] },
      def: [{ pase: ["4", "1"] }, { m: [bota("1", [7.6, 2.0])], dm: [["1", [7.2, 3.0]], ["3", [9.0, 1.6]], ["2", [7.4, 6.2]], ["4", [11.6, 7.4]], ["5", [18.6, 6.4]]] }],
      atq: [{ pase: ["4", "1"] }, { m: [bota("1", [7.0, 2.2]), corre("3", [9.8, 5.0])], dm: [["1", [6.8, 3.2]], ["3", [8.4, 1.6]], ["2", [7.6, 6.6]], ["4", [11.6, 7.4]], ["5", [18.6, 6.4]]] }, { pase: ["1", "3"] }, { m: [bota("3", [16.4, 6.4]), corre("5", [24.6, 9.6]), corre("2", [14, 12.2], [21, 12.4])], dm: [["5", [21.8, 7.6]]] }, { pase: ["3", "5"] }, { tiro: "5" }] }) },
  { c: "1211", n: "1-2-1-1", ing: "1-2-1-1 press", fmts: ["5c5"],
    d: "Un defensor molesta al sacador; dos en las esquinas del tiro libre, uno en el centro y el último lejos. Tras el primer pase a la esquina, el que estaba en el sacador y el de ese lado hacen la trampa; el del centro intercepta el pase al medio, el otro de arriba niega el pase de vuelta al sacador y el último protege el aro.",
    romper: "Contra la 1-2-1-1: el sacador entra a la pista justo después de sacar para recibir el pase de vuelta y cambiar de lado; el balón tiene que salir de la trampa antes de que se cierre.",
    m: () => ({ vista: "completa", balon: "4", at: { "4": [0.3, 9], "1": [3.0, 2.8], "2": [3.6, 12.0], "3": [8.6, 7.5], "5": [16, 9.4] }, df: { "1": [1.6, 8.0], "2": [5.0, 3.4], "3": [5.0, 11.6], "4": [10.8, 7.5], "5": [21, 7.5] },
      def: [{ pase: ["4", "1"] }, { dm: [["1", [2.6, 4.2]], ["2", [4.2, 2.0]], ["4", [7.4, 5.0]], ["3", [4.6, 8.8]], ["5", [18.4, 6.0]]] }],
      atq: [{ pase: ["4", "1"] }, { m: [corre("4", [2.4, 8.2])], dm: [["1", [2.6, 4.2]], ["2", [4.2, 2.0]], ["4", [7.4, 5.0]], ["3", [4.4, 9.6]], ["5", [18.4, 6.0]]] }, { pase: ["1", "4"] }, { pase: ["4", "2"] }, { m: [bota("2", [12.6, 12.4], [20, 11.2]), corre("5", [24.6, 8.6]), corre("3", [13, 4.6], [21, 3.0])] }, { pase: ["2", "5"] }, { tiro: "5" }] }) },
  { c: "131", n: "1-3-1 de medio campo", ing: "1-3-1 half court trap", fmts: ["5c5"],
    d: "La defensa espera en su medio campo en 1-3-1: el de arriba guía el balón hacia la banda y, al cruzar el medio campo, él y el ala de ese lado hacen la trampa en la esquina que forman la banda y el medio campo. El del centro niega el pase al medio, el ala contraria cae al centro y el de abajo cubre el lado del balón.",
    romper: "Contra la 1-3-1 de medio campo: un jugador de seguridad detrás del balón y otro que aparece en el centro de la zona (por detrás del defensor del medio); del centro, pase a la línea de fondo, donde solo hay un defensor.",
    m: () => ({ vista: "completa", balon: "1", at: { "1": [11.6, 4.4], "2": [11.4, 9.6], "3": [19.4, 13.4], "4": [16.4, 9.8], "5": [24.6, 12.6] }, df: { "1": [16.4, 7.5], "2": [17.4, 2.6], "3": [17.4, 12.4], "5": [20.6, 7.5], "4": [24.6, 7.5] },
      def: [{ m: [bota("1", [15.2, 2.0])], dm: [["1", [15.6, 3.2]], ["2", [16.6, 1.2]], ["5", [18.0, 5.0]], ["3", [19.6, 8.6]], ["4", [23.4, 4.0]]] }],
      atq: [{ m: [bota("1", [14.6, 2.2])], dm: [["1", [15.4, 3.4]], ["2", [16.4, 1.4]], ["5", [18.0, 5.0]], ["3", [19.6, 8.6]], ["4", [23.4, 4.0]]] }, { pase: ["1", "2"] }, { m: [corre("4", [19.8, 7.6])] }, { pase: ["2", "4"] }, { m: [corre("5", [26.8, 11.0])] }, { pase: ["4", "5"] }, { tiro: "5" }] }) },
  { c: "runjump", n: "run and jump", ing: "run and jump press", fmts: ["3c3", "4c4", "5c5"],
    d: "Defensa individual en toda la pista. Cuando el que bota va hacia un compañero defendido, el defensor de ese compañero sale por sorpresa a cortarle el paso (jump) y el defensor original corre a por el atacante que se ha quedado libre (run). Los demás anticipan el pase más cercano.",
    romper: "Contra el run and jump: el que bota levanta la cabeza en cuanto ve salir al segundo defensor y pasa al compañero que se ha quedado libre antes de que llegue el que corre.",
    m: (n) => { const ks = ["1", "2", "3", "4", "5"].slice(0, n); return { vista: "completa", balon: "1", defensa: "individual",
      at: solo({ "1": [3.6, 4.6], "2": [9.4, 9.4], "3": [13, 2.4], "4": [16, 12], "5": [21, 7.5] }, ks), df: solo({ "1": [4.6, 4.8], "2": [10.2, 8.8], "3": [13.8, 3.0], "4": [16.8, 11.2], "5": [21.8, 7.5] }, ks),
      def: [{ m: [bota("1", [8.6, 6.8])], dm: [["2", [9.6, 7.0]], ["1", [10.4, 9.2]]] }],
      atq: [{ m: [bota("1", [8.2, 6.6])], dm: [["2", [9.2, 7.0]], ["1", [7.6, 7.8]]] }, { pase: ["1", "2"], dm: [["1", [10.2, 9.0]]] }, { m: [bota("2", [16, 9.4], [22, 9.2])] }, { tiro: "2" }] }; } },
  { c: "negar", n: "negación del primer pase (hombre a hombre)", ing: "deny inbound pass full court", fmts: ["3c3", "4c4", "5c5"],
    d: "Defensa individual en toda la pista negando la recepción del saque: cada defensor se pone entre su atacante y el sacador (cara a cara) y, si el balón entra, se presiona al que bota hasta el medio campo.",
    romper: "Contra la negación del saque: los receptores se cruzan con un bloqueo entre ellos y el que sale del bloqueo viene al balón; tras recibir, ataca la banda contraria con el sacador como apoyo.",
    m: (n) => { const ks = ["4", "1", "2", "3", "5"].slice(0, n); return { vista: "completa", balon: "4", defensa: "individual",
      at: solo({ "4": [0.3, 8.4], "1": [3.4, 4.0], "2": [3.6, 11.0], "3": [10, 7.5], "5": [19, 7.5] }, ks), df: solo({ "4": [1.4, 7.8], "1": [2.6, 4.8], "2": [2.8, 10.4], "3": [8.4, 7.8], "5": [16, 7.8] }, ks),
      def: [{ m: [corre("1", [5.8, 5.6], [3.0, 2.4])] }, { pase: ["4", "1"] }, { m: [bota("1", [9, 2.6])] }],
      atq: [{ m: [bloq("2", [4.4, 6.4]), corre("1", [4.8, 5.4], [2.6, 9.6])] }, { pase: ["4", "1"] }, { m: [bota("1", [8.6, 12.0], [15, 12.0]), corre("4", [5.6, 6.4])] }] }; } },
];
const presion: EjercicioSemilla[] = [];
for (const p of PRESIONES) for (const fmt of [{ c: "3c3", j: 6, n: 3 }, { c: "4c4", j: 8, n: 4 }, { c: "5c5", j: 10, n: 5 }]) {
  if (!p.fmts.includes(fmt.c)) continue;
  for (const ladoP of ["defender", "atacar"] as const) {
    const m = p.m(fmt.n);
    presion.push(ej({
      titulo: `${ladoP === "defender" ? "Presión" : "Superar la presión"} ${p.n} en ${fmt.c}`, categoria: ladoP === "defender" ? "Defensa" : "Transición", edades: ADULTOS, duracion: 12, jugadores: fmt.j, material: "1 balón",
      objetivos: ladoP === "defender" ? `Ejecutar la presión ${p.n}: trampas y rotaciones` : `Romper la presión ${p.n} con pases y ocupando el centro`,
      descripcion: ladoP === "defender"
        ? unir(`${fmt.c} en toda la pista tras saque de fondo.`, p.d, "Se cuenta si la defensa provoca pérdida o 8 segundos. 5 posesiones por equipo.")
        : unir(`${fmt.c} en toda la pista tras saque de fondo, contra la presión ${p.n}.`, p.romper, "Cómo presiona la defensa:", p.d),
      correcciones: ladoP === "defender" ? "Trampa sin falta: pies cerrando la salida y brazos arriba · Anticipar el pase de salida, no el balón · El último siempre protege el aro" : "Recibir encarado hacia el campo de ataque · Pasar antes de que se cierre la trampa · Siempre un pase de seguridad detrás · Tras romper, atacar sin parar",
      etiquetas: ["presión", p.c, fmt.c, "toda la pista", ladoP === "defender" ? "defensa" : "salida de presión"], video: yt(`${p.ing} ${ladoP === "defender" ? "drill" : "break"}`),
      montaje: { vista: m.vista ?? "completa", at: m.at, df: m.df, balon: m.balon, defensa: m.defensa ?? "ninguna", pasos: ladoP === "defender" ? m.def : m.atq },
    }));
  }
}

// ============================================================================
// J) ZONA: ATACARLA Y DEFENDERLA (cada zona con su colocación y cada concepto con su jugada)
// ============================================================================
type ZonaInfo = { c: Zona; n: string; debil: string; impar: boolean };
const ZONAS: ZonaInfo[] = [
  { c: "23", n: "2-3", impar: true, debil: "La 2-3 deja huecos en el poste alto, en los codos y en las alas altas (entre los dos de arriba y los de abajo), y le cuesta salir a la esquina corta. Se ataca con frente impar (1-3-1): base en la cabeza, aleros en las alas, un interior en el poste alto y otro en la esquina corta." },
  { c: "32", n: "3-2", impar: false, debil: "La 3-2 deja libres el poste alto, las esquinas y la línea de fondo (solo dos defensores abajo). Se ataca con frente par (2-1-2): dos bases en los huecos de arriba, un interior en el poste alto y dos jugadores en las esquinas." },
  { c: "131", n: "1-3-1", impar: false, debil: "La 1-3-1 es débil en las esquinas y en la línea de fondo (un solo defensor abajo tiene que cubrir las dos). Se ataca con frente par: dos bases, las dos esquinas llenas y un interior en el poste alto." },
  { c: "match", n: "de emparejamientos (match-up)", impar: false, debil: "La match-up empieza como una 3-2 pero se empareja con los atacantes y sigue a los que cortan como una individual. Se ataca con frente par y con cortes y bloqueos que la obligan a decidir quién sigue a quién." },
];
const IMPAR: Record<string, P> = { "1": [19.4, 7.5], "2": [20.9, 12.3], "3": [20.9, 2.7], "4": [22.0, 7.5], "5": [26.8, 11.8] };
const PAR: Record<string, P> = { "1": [19.6, 5.2], "2": [19.6, 9.8], "3": [26.6, 1.4], "4": [26.6, 13.6], "5": [22.2, 7.5] };
type Concepto = { c: string; n: string; video: string; impar: { d: string; at?: Record<string, P>; pasos: Pasos }; par: { d: string; at?: Record<string, P>; pasos: (z: Zona) => Pasos } };
const CONCEPTOS_ZONA: Concepto[] = [
  { c: "hueco", n: "penetrar al hueco y pasar", video: "gap",
    impar: { d: "El 1 ataca con un bote el hueco entre los dos defensores de arriba y los junta; pasa al 2 en el ala, que vuelve a atacar el hueco entre el defensor de arriba y el de abajo de su lado. Cuando el de abajo sale a frenarle, pase al 5 en la esquina corta para tirar o finalizar.",
      pasos: [{ m: [bota("1", [21.0, 7.5])] }, { pase: ["1", "2"] }, { m: [bota("2", [23.0, 10.6])], zona: "alaD" }, { pase: ["2", "5"] }, { tiro: "5" }] },
    par: { d: "El 1 ataca con un bote el hueco entre el defensor de arriba y el del ala, que tienen que cerrar los dos; pasa al 5 en el poste alto, que se ha quedado solo, y el 5 encuentra al 4 en la esquina cuando la zona se cierra sobre él.",
      pasos: () => [{ m: [bota("1", [21.0, 6.2])], zona: "baseI" }, { pase: ["1", "5"] }, { pase: ["5", "4"] }, { tiro: "4" }] } },
  { c: "postealto", n: "poste alto encarado", video: "high post",
    impar: { d: "Pase al ala y flash del 4 desde el poste bajo del lado débil al poste alto, el centro de la 2-3. El 4 recibe, se encara y lee: si sube el central a por él, pase alto-bajo al 5, que sella a su defensor en el poste bajo; si cierran los de arriba, tiro desde el tiro libre.",
      at: { ...IMPAR, "4": [25.4, 4.8] }, pasos: [{ pase: ["1", "2"] }, { m: [corre("4", [23.6, 6.4], [22.2, 7.4])] }, { pase: ["2", "4"] }, { m: [corre("5", [25.8, 9.4])] }, { pase: ["4", "5"] }, { tiro: "5" }] },
    par: { d: "Pase del 1 al 2 y del 2 al 5 en el poste alto. El 5 recibe encarado y la zona tiene que cerrarse sobre él: el 3, desde la esquina del lado débil, corta por la línea de fondo por detrás de la zona y recibe para finalizar.",
      pasos: () => [{ pase: ["1", "2"] }, { pase: ["2", "5"] }, { m: [corre("3", [27.4, 4.6], [26.6, 6.2])] }, { pase: ["5", "3"] }, { tiro: "3" }] } },
  { c: "skip", n: "pases por encima de la zona", video: "skip pass",
    impar: { d: "El 1 pasa al 2 en el ala y la zona se carga hacia ese lado. El 2 hace el pase por encima (skip) al 3 en el ala contraria: el defensor de arriba tiene que hacer un cierre largo y el 3 tira si llega tarde o ataca el cierre si llega encima.",
      pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { tiro: "3" }] },
    par: { d: "El 1 pasa al 2 y la zona bascula hacia la derecha. El 2 hace el pase por encima de la zona directamente a la esquina contraria (el 3): el defensor que tiene que salir a la esquina viene desde el centro y llega tarde.",
      pasos: () => [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { tiro: "3" }] } },
  { c: "fondo", n: "corredor de línea de fondo", video: "baseline runner",
    impar: { d: "El 5 corre la línea de fondo por debajo de la zona hacia el lado al que va el balón: el 1 pasa al 3 y el 5 llega a la esquina corta de ese lado para recibir. Si el defensor de abajo sale a por él, el 4 baja del poste alto al centro de la zona y recibe del 5.",
      pasos: [{ pase: ["1", "3"], m: [corre("5", [27.4, 9.4], [27.2, 5.6], [26.8, 3.2])] }, { pase: ["3", "5"] }, { m: [corre("4", [24.4, 6.4])] }, { pase: ["5", "4"] }, { tiro: "4" }] },
    par: { d: "Con el pase del 1 al 2, el 4 sube de la esquina al ala y el 3 corre la línea de fondo desde la esquina contraria hasta la esquina corta del lado del balón. El 2 pasa al 4 y el 4 al 3, que recibe por detrás de la zona.",
      pasos: () => [{ pase: ["1", "2"], m: [corre("4", [22.2, 12.8]), corre("3", [27.5, 4.0], [27.5, 10.0], [26.8, 12.2])] }, { pase: ["2", "4"] }, { pase: ["4", "3"] }, { tiro: "3" }] } },
  { c: "bloqueo", n: "bloqueos a la zona", video: "screen",
    impar: { d: "Balón al ala: el defensor de arriba del lado débil cae al tiro libre. El 4 le pone un bloqueo (le sujeta en el centro) y el 2 hace el pase por encima al 3, que queda solo en el ala contraria porque quien tenía que cerrarle está bloqueado.",
      pasos: [{ pase: ["1", "2"], dm: [["1", [22.2, 8.4]]] }, { m: [bloq("4", [21.9, 7.7])] }, { pase: ["2", "3"] }, { tiro: "3" }] },
    par: { d: "Pase del 1 al 2: el defensor de abajo del lado contrario (el que tiene que salir a la esquina) se queda en el centro. El 5 baja del poste alto y le bloquea por dentro; el 2 hace el pase por encima al 3 en la esquina, que tira libre.",
      pasos: (z) => { const dz = posZona(z, "baseD")["4"]; return [{ pase: ["1", "2"], dm: [["4", dz]] }, { m: [bloq("5", hacia(dz, PAR["3"], 0.14))] }, { pase: ["2", "3"] }, { tiro: "3" }]; } } },
  { c: "rebote", n: "rebote contra zona", video: "rebounding",
    impar: { d: "Contra zona nadie tiene un atacante asignado para cerrar el rebote. Tras el tiro del 2 desde el ala, van al rebote el 3 (desde el lado débil, el mejor sitio), el 5 y el 4; el 1 se queda de balance. Cada defensor tiene que buscar al atacante más cercano a su sitio.",
      pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("3", [24.8, 4.6]), corre("5", [26.4, 9.6]), corre("4", [24.2, 7.8]), corre("2", [23.4, 11.0]), corre("1", [17.6, 7.5])], cierra: true }, { rebote: "3" }, { tiro: "3" }] },
    par: { d: "Contra zona nadie tiene un atacante asignado para cerrar el rebote. Tras el tiro del 4 desde la esquina, van al rebote el 3 (desde el lado débil), el 5 y el propio tirador; el 1 y el 2 balancean. Cada defensor tiene que buscar al atacante más cercano.",
      pasos: () => [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { tiro: "4" }, { m: [corre("3", [25.6, 4.2]), corre("5", [25.0, 7.2]), corre("4", [26.0, 12.0]), corre("2", [19.0, 10.6]), corre("1", [17.4, 6.4])], cierra: true }, { rebote: "5" }, { tiro: "5" }] } },
];
const zona: EjercicioSemilla[] = [];
for (const z of ZONAS) for (const c of CONCEPTOS_ZONA) {
  const v = z.impar ? { d: c.impar.d, at: c.impar.at ?? IMPAR, pasos: c.impar.pasos } : { d: c.par.d, at: c.par.at ?? PAR, pasos: c.par.pasos(z.c) };
  zona.push(ej({
    titulo: `Atacar la zona ${z.n}: ${c.n}`, categoria: "Ataque", edades: MAYORES, duracion: 12, jugadores: 10, material: "1 balón",
    objetivos: `Superar la zona ${z.n} con ${c.n}`, descripcion: unir(`5c5 media pista contra zona ${z.n}.`, z.debil, "La jugada:", v.d, "Primero contra la zona a medio ritmo, luego en vivo: 5 posesiones por equipo, contando tiros de calidad."),
    correcciones: "Colocarse en los huecos de la zona, no delante de los defensores · Pasar rápido y fintar antes de pasar · Recibir preparados para tirar · Rebote ofensivo desde el lado débil",
    etiquetas: ["ataque a zona", z.c, c.c], video: yt(`attack ${z.c === "match" ? "match up" : z.n} zone ${c.video}`),
    montaje: { at: v.at, defensa: z.c, balon: "1", pasos: v.pasos },
  }));
}
type DefZona = { c: string; n: string; d: Record<Zona, string>; impar: Pasos; par: Pasos };
const DEF_ZONA: DefZona[] = [
  { c: "despl", n: "desplazamientos con cada pase",
    d: { "23": "Con el balón en el ala sale el de arriba de ese lado, el otro de arriba cae al tiro libre, el de abajo del lado del balón cubre la esquina corta y el central se pone por delante en el poste.", "32": "El de arriba toma el balón por el centro, los laterales toman las alas y, cuando el balón va a la esquina, sale el de abajo de ese lado y el lateral baja a negar el pase de vuelta.", "131": "El de arriba guía el balón a la banda, el ala de ese lado lo toma y el de abajo corre de esquina a esquina con el balón; el central siempre por delante del poste alto del lado del balón.", match: "Cada defensor toma al atacante que entra en su zona y, con cada pase, se reemparejan: el más cercano al balón, encima; los demás, negando y en ayuda." },
    impar: [{ pase: ["1", "2"] }, { pase: ["2", "5"] }, { pase: ["5", "2"] }, { pase: ["2", "1"] }], par: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "2"] }, { pase: ["2", "1"] }] },
  { c: "poste", n: "defender el poste alto y el poste bajo",
    d: { "23": "Pase al poste alto: sube el central y los dos de arriba se cierran por detrás; si el balón baja al poste bajo, el de abajo de ese lado ayuda y el central se pone por delante.", "32": "Pase al poste alto: cae el de arriba por detrás y sube el de abajo más cercano; los laterales niegan el pase a las alas. Al poste bajo, doble del lateral.", "131": "El poste alto es del central, que se pone por detrás; si el balón entra, cae también el de arriba. El poste bajo y la esquina corta, del de abajo.", match: "El defensor más cercano toma al poste y los demás caen a la línea de pase de vuelta; tras el pase interior, todos miran el balón." },
    impar: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { m: [corre("5", [25.6, 9.8])] }, { pase: ["4", "5"] }], par: [{ pase: ["1", "2"] }, { pase: ["2", "5"] }, { m: [corre("4", [26.8, 11.8])] }, { pase: ["5", "4"] }] },
  { c: "esquina", n: "salir a la esquina y recuperar",
    d: { "23": "Balón a la esquina: sale el de abajo de ese lado (no el de arriba), el central se va al poste bajo de ese lado, el de abajo contrario al centro y el de arriba del lado del balón baja a negar el pase de vuelta al ala.", "32": "Balón a la esquina: sale el de abajo de ese lado, el otro de abajo cruza al poste bajo y el lateral del lado del balón baja a negar el pase de vuelta.", "131": "Balón a la esquina: sale el de abajo (corre de esquina a esquina), el central baja al poste bajo, el ala del lado del balón niega el pase de vuelta y el ala contraria cae al centro.", match: "Balón a la esquina: sale el atacante de ese defensor; si es un cortador, lo sigue quien venía con él y se avisa el cambio." },
    impar: [{ pase: ["1", "2"] }, { m: [corre("5", [27.0, 14.0])] }, { pase: ["2", "5"] }, { pase: ["5", "2"] }], par: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { pase: ["4", "2"] }] },
  { c: "rebote", n: "cerrar el rebote desde la zona",
    d: { "23": "Tras el tiro, cada defensor busca al atacante más cercano a su zona y lo cierra: el central al del poste, los de abajo a los que llegan por la línea de fondo y los de arriba a los que entran desde fuera.", "32": "Tras el tiro, los dos de abajo cierran a los interiores y los tres de arriba buscan a los exteriores que entran al rebote; el lado débil, el más peligroso.", "131": "Tras el tiro, el de abajo y el central cierran a los interiores y las alas cierran a los que entran desde las esquinas (el punto débil del rebote en la 1-3-1).", match: "Tras el tiro, cada uno cierra al atacante con el que está emparejado en ese momento." },
    impar: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("3", [24.8, 4.6]), corre("5", [26.4, 9.6]), corre("4", [24.2, 7.8]), corre("2", [23.4, 11.0])], cierra: true }, { rebote: "d5" }],
    par: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { tiro: "4" }, { m: [corre("3", [25.6, 4.2]), corre("5", [25.0, 7.2]), corre("4", [26.0, 12.0])], cierra: true }, { rebote: "d4" }] },
];
for (const z of ZONAS) for (const s of DEF_ZONA) zona.push(ej({
  titulo: `Defensa en zona ${z.n}: ${s.n}`, categoria: "Defensa", edades: MAYORES, duracion: 12, jugadores: 10, material: "1 balón",
  objetivos: `Zona ${z.n}: ${s.n}`, descripcion: unir(`5c5 media pista, la defensa en zona ${z.n}; el ataque se coloca contra ella (${z.impar ? "frente impar 1-3-1" : "frente par 2-1-2"}).`, z.c === "match" && "Para empezar, el 5 corta del poste alto a la esquina corta: su defensor le sigue y los demás se reemparejan.", s.d[z.c], "Primero sin tirar, a medio ritmo y con el entrenador parando para corregir; luego en vivo."),
  correcciones: "Manos arriba y activas · Moverse mientras el balón está en el aire · Hablar en cada pase · Cerrar el rebote buscando al más cercano",
  etiquetas: ["defensa en zona", z.c, s.c], video: yt(`${z.c === "match" ? "match up" : z.n} zone defense drill`),
  montaje: { at: z.impar ? IMPAR : PAR, defensa: z.c, balon: "1",
    // En la match-up, el 5 corta del poste alto a la esquina corta y su defensor le sigue (no se queda en su sitio)
    pasos: z.impar ? s.impar : z.c === "match" ? [{ m: [corre("5", [24.6, 9.0], [26.8, 11.8])] }, ...s.par.map((p) => ({ ...p, m: p.m?.filter(([k]) => k !== "5") }))] : s.par },
}));

// ============================================================================
// K) JUEGO INTERIOR (cada movimiento con su dibujo)
// ============================================================================
type MovPoste = { c: string; n: string; d: string; video: string; pasos: (f: string) => Pasos; at?: Record<string, P>; df?: Record<string, P>; balon?: string };
const MOVS_POSTE: MovPoste[] = [
  { c: "drop", n: "paso atrás hacia el aro (drop step)", video: "drop step", d: "Recibe de espaldas con el defensor por el lado de arriba; siente el contacto y da un paso atrás largo hacia la línea de fondo, con un bote, y finaliza con las dos manos.",
    df: { "5": [25.0, 9.2] }, pasos: () => [{ pase: ["2", "5"] }, { m: [bota("5", [26.6, 9.0])] }, { tiro: "5" }] },
  { c: "giro", n: "giro y tiro (turnaround)", video: "turnaround", d: "Recibe, gira sobre el pie de pivote hacia el centro para encararse y tira en suspensión a tabla mientras el defensor sigue de espaldas.",
    pasos: () => [{ pase: ["2", "5"] }, { m: [corre("5", [25.0, 9.8])] }, { tiro: "5" }] },
  { c: "gancho", n: "gancho", video: "hook shot", d: "Recibe, da un bote hacia el centro de la zona protegiendo el balón y tira de gancho con el brazo lejano al defensor.",
    pasos: () => [{ pase: ["2", "5"] }, { m: [bota("5", [25.6, 8.0])] }, { tiro: "5" }] },
  { c: "updown", n: "finta y por debajo (up and under)", video: "up and under", d: "Gira para encararse y finta el tiro; cuando el defensor salta, paso cruzado por su lado y finalización por debajo.",
    pasos: () => [{ pase: ["2", "5"] }, { m: [corre("5", [25.0, 9.6])] }, { m: [corre("5", [25.8, 8.4])] }, { tiro: "5" }] },
  { c: "cara", n: "de cara al aro (face up)", video: "face up", d: "Recibe un poco más abierto, se encara y lee al defensor: si se separa, tira; si se pega, bote largo por la línea de fondo y finalización.",
    at: { "5": [25.0, 10.6] }, pasos: () => [{ pase: ["2", "5"] }, { m: [bota("5", [26.4, 10.4], [26.6, 8.8])] }, { tiro: "5" }] },
  { c: "sello", n: "sellar y recibir alto-bajo", video: "seal high low", d: "El balón está en el poste alto y el defensor del 5 se pone por arriba: el 5 le sella con el cuerpo (le deja a su espalda) y pide el pase bombeado por encima.",
    at: { "4": [22.4, 8.2] }, df: { "5": [25.0, 9.0] }, balon: "4", pasos: () => [{ m: [corre("5", [25.9, 8.4])] }, { pase: ["4", "5"] }, { tiro: "5" }] },
  { c: "doble", n: "salir del 2 contra 1 en el poste", video: "double team", d: "Recibe y llega un segundo defensor a hacer el 2 contra 1. El pasador se recoloca a la vista del poste y el 5 le devuelve el balón en menos de 2 segundos para tirar antes de que llegue el cierre.",
    pasos: () => [{ pase: ["2", "5"] }, { m: [corre("2", [22.4, 13.4])], dm: [["2", [24.8, 10.6]]] }, { pase: ["5", "2"] }, { tiro: "2" }] },
  { c: "pase", n: "pasar desde el poste a los cortadores", video: "passing", d: "Recibe en el poste y lee los cortes de los exteriores: el que pasa corta hacia el aro rozando al poste (y el otro exterior se cruza por detrás); el 5 da el pase al que queda libre.",
    pasos: (f) => [{ pase: ["2", "5"] }, { m: [corre("2", [24.0, 10.6], [25.8, 8.4]), ...(f === "3c3" ? [corre("3", [22.0, 9.4], [22.8, 12.6])] : [])] }, { pase: ["5", "2"] }, { tiro: "2" }] },
];
const interior: EjercicioSemilla[] = [];
for (const m of MOVS_POSTE) for (const f of [{ c: "1c1", j: 3, e: "1c1 con un pasador en el ala." }, { c: "2c2", j: 4, e: "2c2 (interior y exterior con sus defensores): el exterior se mueve tras el pase." }, { c: "3c3", j: 6, e: "3c3 con dos exteriores: tras el pase al poste, los exteriores se cruzan o se relocalizan." }]) {
  const pasador = m.balon ?? "2";
  const at: Record<string, P> = { "5": S.posteD, [pasador]: pasador === "4" ? [22.4, 8.2] : S.alaD, ...(f.c === "3c3" ? { "3": S.alaI } : {}), ...(m.at ?? {}) };
  const df: Record<string, P> = { "5": [25.0, 9.2], ...(f.c !== "1c1" || m.c === "doble" ? { [pasador]: dfDe(at[pasador]) } : {}), ...(f.c === "3c3" ? { "3": dfDe(S.alaI) } : {}), ...(m.df ?? {}) };
  interior.push(ej({
    titulo: `Poste: ${m.n} (${f.c})`, categoria: "Ataque", edades: MAYORES, duracion: 10, jugadores: f.j + (m.c === "doble" && f.c === "1c1" ? 1 : 0), material: "2 balones",
    objetivos: `Recurso de poste bajo: ${m.n}`, descripcion: unir(f.e, m.d, "6 repeticiones por lado; primero defensa pasiva, luego activa."),
    correcciones: "Pedir con la mano lejana al defensor · Recibir con dos manos y el balón protegido en la barbilla · Leer al defensor antes de moverse · Pies anchos y equilibrio",
    etiquetas: ["juego interior", "poste", m.c, f.c], video: yt(`post move ${m.video} drill`),
    montaje: { at, df, defensa: "individual", balon: pasador, pasos: m.pasos(f.c) },
  }));
}

// ============================================================================
// L) 1c1 DESDE SITUACIONES DE PARTIDO (cada situación con su dibujo)
// ============================================================================
type Sit1 = { c: string; n: string; d: string; m: Montaje };
const SIT_1C1: Sit1[] = [
  { c: "ala", n: "tras recibir en el ala", d: "El atacante sale del poste bajo al ala con un corte en V para recibir del entrenador; su defensor le niega el pase. Al recibir, 1c1 hacia el aro.",
    m: { at: { "1": [24.6, 11.2] }, entrenador: S.cabeza, balon: "e", pasos: [{ m: [corre("1", [24.2, 10.4], [21.2, 12.6])] }, { pase: ["e", "1"] }, { m: [bota("1", [23.6, 10.4], [25.2, 8.8])] }, { tiro: "1" }] } },
  { c: "cierre", n: "contra el cierre", d: "El defensor empieza en la pintura; cuando el entrenador pasa al atacante del ala, sale a cerrarle y el atacante le ataca por la línea de fondo antes de que se equilibre.",
    m: { at: { "1": S.alaD }, df: { "1": [25.0, 8.6] }, entrenador: S.cabeza, balon: "e", pasos: [{ pase: ["e", "1"], dm: [["1", [22.0, 11.6]]] }, { m: [bota("1", [23.6, 13.0], [26.0, 10.4])], dm: [["1", [24.0, 12.0]]] }, { tiro: "1" }] } },
  { c: "mano", n: "tras mano a mano", d: "El entrenador bota hacia el ala y entrega en mano a mano al atacante que sube desde la esquina; el atacante ataca de inmediato con la ventaja de la entrega (su defensor choca con el entrenador).",
    m: { at: { "1": S.esqD }, entrenador: [20.2, 9.6], balon: "e", pasos: [{ m: [corre("1", [24.6, 13.2], [21.4, 11.8]), corre("e", [20.8, 11.0])] }, { mano: ["e", "1"] }, { m: [bota("1", [23.0, 10.0], [25.2, 8.6])] }, { tiro: "1" }] } },
  { c: "esquina", n: "desde la esquina", d: "1c1 desde la esquina: el defensor cierra negando la línea de fondo y el atacante tiene poco espacio; ataca hacia el centro (hacia el codo) con cambio de ritmo.",
    m: { at: { "1": S.esqD }, df: { "1": [25.4, 10.6] }, entrenador: S.alaD, balon: "e", pasos: [{ pase: ["e", "1"], dm: [["1", [26.4, 13.0]]] }, { m: [bota("1", [25.2, 12.4], [24.2, 9.8])] }, { tiro: "1" }] } },
  { c: "codo", n: "desde el codo", d: "1c1 desde el codo, encarado al aro: el atacante recibe, amenaza con el tiro y ataca a cualquiera de los dos lados según cómo esté el defensor.",
    m: { at: { "1": S.codoD }, entrenador: S.alaD, balon: "e", pasos: [{ pase: ["e", "1"] }, { m: [bota("1", [24.0, 9.6], [25.6, 8.4])] }, { tiro: "1" }] } },
  { c: "trans", n: "en transición (desde medio campo)", d: "1c1 desde medio campo con el defensor delante, retrocediendo: el atacante tiene que llegar al aro botando a velocidad y cambiar de mano cuando el defensor le corte el paso.",
    m: { at: { "1": [15, 7.5] }, balon: "1", pasos: [{ m: [bota("1", [19.4, 9.0], [22.4, 7.0], [25.4, 8.0])] }, { tiro: "1" }] } },
  { c: "persig", n: "con el defensor persiguiendo", d: "El atacante sale con ventaja (el defensor empieza un paso por detrás) y el defensor persigue: finalizar sin que llegue el tapón por detrás.",
    m: { at: { "1": [16, 8] }, df: { "1": [14.6, 9.0] }, balon: "1", pasos: [{ m: [bota("1", [21, 8.6], [25.2, 8.4])], dm: [["1", [24.0, 9.2]]] }, { tiro: "1" }] } },
  { c: "poste", n: "desde el poste alto de espaldas", d: "El atacante recibe de espaldas al aro en el poste alto, gira (pivote de reverso) para encararse y ataca al defensor.",
    m: { at: { "1": [22.2, 8.4] }, entrenador: S.alaD, balon: "e", pasos: [{ pase: ["e", "1"] }, { m: [corre("1", [22.4, 8.8])] }, { m: [bota("1", [24.0, 7.2], [25.6, 7.0])] }, { tiro: "1" }] } },
];
const REST_1C1 = [
  { c: "3b", n: "máximo 3 botes", d: "El atacante tiene 3 botes como máximo." },
  { c: "5s", n: "5 segundos", d: "El atacante tiene 5 segundos para anotar." },
  { c: "rey", n: "rey de la pista (el que anota sigue)", d: "El que anota sigue atacando; gana el primero a 5 canastas." },
  { c: "debil", n: "atacando por la mano débil", d: "El atacante tiene que atacar con la mano débil (si lo hace con la fuerte, la canasta no vale)." },
];
const unoContraUno: EjercicioSemilla[] = [];
for (const s of SIT_1C1) for (const r of REST_1C1) unoContraUno.push(ej({
  titulo: `1c1 ${s.n}: ${r.n}`, categoria: "Fundamentos", edades: MAYORES, duracion: 10, jugadores: 4, material: "2 balones",
  objetivos: "Crear ventaja individual y finalizar · Defensa individual del balón", descripcion: unir(s.d, r.d, "Por parejas con rotación: ataca, defiende y descansa."),
  correcciones: "Atacar la cadera del defensor con el primer paso · Cambio de ritmo más que de dirección · Defensa: distancia de un brazo, no cruzar los pies, contestar sin saltar",
  etiquetas: ["1c1", s.c, r.c], video: yt(`1 on 1 basketball drill ${s.c === "cierre" ? "closeout" : s.c === "trans" ? "full court" : s.c}`),
  montaje: { ...s.m, defensa: "individual" },
}));

// ============================================================================
// M) PASE Y LECTURA: PENETRAR Y PASAR (cada regla con su dibujo)
// ============================================================================
const PASE_FMT = [
  { c: "2c1", j: 3, n: "2c1 (penetrador y tirador)", d: "Penetración desde el ala con un tirador en la esquina y un solo defensor, que tiene que elegir.", at: { "1": S.alaD, "2": S.esqD } as Record<string, P>, df: { "2": [25.2, 10.8] } as Record<string, P> },
  { c: "3c2", j: 5, n: "3c2 en media pista", d: "Tres atacantes contra dos defensores: penetrar, fijar y encontrar al libre.", at: { "1": S.alaD, "2": S.esqD, "3": S.alaI } as Record<string, P>, df: { "2": [25.2, 10.8], "3": [23.6, 5.6] } as Record<string, P> },
  { c: "4c3", j: 7, n: "4c3 en media pista", d: "Cuatro atacantes contra tres: la defensa rota y el ataque tiene que hacer el pase extra.", at: { "1": S.alaD, "2": S.esqD, "3": S.alaI, "4": S.esqI } as Record<string, P>, df: { "2": [25.2, 10.8], "3": [23.4, 5.6], "4": [25.6, 3.4] } as Record<string, P> },
  { c: "5c4", j: 9, n: "5c4 en media pista", d: "Cinco contra cuatro: con superioridad, el ataque busca siempre al libre.", at: { "1": S.alaD, "2": S.esqD, "3": S.alaI, "4": S.esqI, "5": S.cabeza } as Record<string, P>, df: { "2": [25.2, 10.8], "3": [23.4, 5.6], "4": [25.6, 3.4], "5": [21.0, 7.8] } as Record<string, P> },
];
const PASE_REG: { c: string; n: string; d: string; pasos: (f: typeof PASE_FMT[number]) => Pasos | null }[] = [
  { c: "base", n: "penetrar y sacar (drive and kick)", d: "Cada ataque empieza con una penetración del 1 desde el ala por la línea de fondo: sale el defensor de la esquina y el 1 saca el balón al 2.",
    pasos: () => [{ m: [bota("1", [23.6, 10.6], [25.0, 9.6])], dm: [["2", [25.4, 9.4]]] }, { pase: ["1", "2"], dm: [["2", [26.4, 12.8]]] }, { tiro: "2" }] },
  { c: "picado", n: "solo pase picado tras penetración", d: "El 1 penetra hacia el centro y el pase al compañero tiene que ser picado, por debajo de los brazos del defensor que ayuda.",
    pasos: (f) => { const t = f.at["3"] ? "3" : "2"; return [{ m: [bota("1", [23.4, 10.6], [24.4, 8.4])], dm: [[t === "3" ? "3" : "2", t === "3" ? [24.6, 7.0] : [25.0, 9.2]]] }, { pase: ["1", t] }, { tiro: t }]; } },
  { c: "extra", n: "pase extra obligatorio", d: "El 1 penetra y saca el balón; el primer receptor no puede tirar aunque esté libre: cuando le cierran, hace un pase más al siguiente compañero.",
    pasos: (f) => f.at["3"] ? [{ m: [bota("1", [23.6, 10.6], [25.0, 9.6])], dm: [["2", [25.4, 9.4]]] }, { pase: ["1", "2"], dm: [["3", [25.8, 11.6]]] }, { pase: ["2", "3"] }, { tiro: "3" }] : null },
  { c: "fondo", n: "pase al cortador de la línea de fondo", d: "El 1 penetra por el centro y el de la esquina corta por la línea de fondo por detrás de su defensor, que mira el balón: es la primera opción de pase.",
    pasos: () => [{ m: [bota("1", [23.2, 10.8], [24.2, 8.8]), corre("2", [27.4, 12.0], [26.8, 9.6])], dm: [["2", [24.8, 10.0]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { c: "salto", n: "pase en salto prohibido", d: "El 1 penetra, para en un tiempo con los pies en el suelo y pivota antes de pasar: no se permite pasar en el aire.",
    pasos: () => [{ m: [bota("1", [23.6, 10.6], [24.8, 9.8])], dm: [["2", [25.4, 9.6]]] }, { m: [corre("1", [24.6, 10.2])] }, { pase: ["1", "2"] }, { tiro: "2" }] },
];
const pase: EjercicioSemilla[] = [];
for (const f of PASE_FMT) for (const r of PASE_REG) {
  const pasos = r.pasos(f);
  if (!pasos) continue;
  pase.push(ej({
    titulo: `${f.n}: ${r.n}`, categoria: "Pase", edades: MAYORES, duracion: 10, jugadores: f.j, material: "2 balones",
    objetivos: "Fijar a la ayuda y encontrar al compañero libre · Pase en movimiento", descripcion: unir(f.d, r.d, "Series de 3 minutos; el que tira recoge el rebote y rota a defensa."),
    correcciones: "Penetrar con intención de anotar para que llegue la ayuda · Ver al defensor que ayuda, no al compañero · Pase al bolsillo de tiro · Los receptores se mueven a la línea de visión",
    etiquetas: ["pase", "drive and kick", f.c, r.c], video: yt(`${f.c.replace("c", " on ")} drive and kick drill`),
    montaje: { at: f.at, df: f.df, defensa: "individual", balon: "1", pasos },
  }));
}

// ============================================================================
// N) FÍSICO CON BALÓN (sénior) Y CALENTAMIENTOS (cada uno con su recorrido)
// ============================================================================
const FISICO: { t: string; d: string; m: Montaje }[] = [
  { t: "Carrera de 17 (bandas) con tiro final", d: "Cruzar el ancho de la pista 17 veces en menos de 1 minuto y, sin descanso, 2 tiros libres (el entrenador da el balón).",
    m: { vista: "completa", at: { "1": [10, 0.6] }, entrenador: [24.4, 9.6], balon: "e", pasos: [{ m: [corre("1", [10.4, 14.4], [10.8, 0.6], [11.2, 14.4], [11.6, 0.6])] }, { m: [corre("1", [22.2, 7.5])] }, { pase: ["e", "1"] }, { tiro: "1" }] } },
  { t: "Suicidas con entrada a canasta", d: "Carreras botando de ida y vuelta a las líneas (tiro libre, medio campo, tiro libre contrario) saliendo siempre desde el fondo y terminando con una entrada en el aro contrario.",
    m: { vista: "completa", at: { "1": [0.6, 7.5] }, balon: "1", pasos: [{ m: [bota("1", [5.8, 8.0], [0.8, 8.6], [14, 9.0], [0.8, 9.6], [22.2, 10.0], [25.8, 8.4])] }, { tiro: "1" }] } },
  { t: "Desplazamientos defensivos en zigzag + cierre", d: "Desplazamiento lateral en zigzag desde el medio campo hasta el fondo y, al llegar, sprint a cerrar al tirador del ala, que tira o ataca el cierre.",
    m: { at: { "1": S.alaD }, df: { "1": [14.6, 1.0] }, balon: "1", defensa: "ninguna", pasos: [{ m: [corre("d1", [17, 4.6], [19.6, 1.0], [22.2, 4.6], [24.8, 1.0], [27.2, 3.0])] }, { m: [corre("d1", [22.0, 11.6])] }, { tiro: "1" }] } },
  { t: "Circuito de saltos y rebote", d: "Saltos continuos tocando el tablero; el entrenador tira, el jugador coge el rebote en el punto más alto y sale botando hacia la banda.",
    m: { at: { "1": [26.4, 8.8] }, entrenador: [23.0, 9.6], balon: "e", pasos: [{ m: [corre("1", [26.4, 6.4], [26.4, 8.8])] }, { tiro: "e" }, { rebote: "1" }, { m: [bota("1", [21.4, 13.6], [16, 13.6])] }] } },
  { t: "Sprint con balón y parada en un tiempo", d: "Sprints botando de 10 metros con parada en un tiempo, pivote y pase al compañero que espera; vuelve sin balón y repite. 8 repeticiones.",
    m: { vista: "completa", at: { "1": [0.8, 4], "2": [13, 4] }, balon: "1", pasos: [{ m: [bota("1", [10, 4])] }, { pase: ["1", "2"] }, { m: [corre("1", [1, 5])] }] } },
  { t: "Mikan continuo (30 segundos)", d: "Canastas alternas por ambos lados del aro sin que el balón toque el suelo durante 30 segundos: tira, coge el balón por debajo de la red y tira por el otro lado. 4 series.",
    m: { at: { "1": [25.8, 9.0] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [25.8, 6.0])], rebote: "1" }, { tiro: "1" }, { m: [corre("1", [25.8, 9.0])], rebote: "1" }, { tiro: "1" }] } },
  { t: "Tiro libre tras fatiga", d: "Carrera de ida y vuelta al medio campo y 2 tiros libres seguidos, como en un final de partido; 10 series contando el porcentaje.",
    m: { at: { "1": [22.2, 7.5] }, entrenador: [24.6, 10.4], balon: "e", pasos: [{ m: [corre("1", [14.4, 8.2], [22.2, 7.5])] }, { pase: ["e", "1"] }, { tiro: "1" }] } },
  { t: "Ida y vuelta en 3 carriles con 3 pases", d: "Tres jugadores corren todo el campo por sus carriles con 3 pases como máximo y entrada; vuelta inmediata. Tiempo objetivo por debajo de 10 segundos.",
    m: { vista: "completa", at: { "1": [1, 7.5], "2": [1, 2], "3": [1, 13] }, balon: "1", pasos: [{ m: [corre("2", [8, 2]), corre("3", [8, 13])] }, { pase: ["1", "2"] }, { m: [corre("1", [14, 7.5]), corre("3", [17, 13])] }, { pase: ["2", "1"] }, { m: [corre("2", [22, 2]), corre("3", [23, 11])] }, { pase: ["1", "3"] }, { m: [corre("3", [25.6, 8.6])] }, { tiro: "3" }] } },
  { t: "Lucha por el balón en el suelo y salida", d: "El entrenador lanza un balón al suelo entre dos jugadores; lo pelean y el que lo gana ataca 1c1 a canasta contra el otro.",
    m: { at: { "1": [20.4, 6.4] }, df: { "1": [20.4, 8.6] }, entrenador: [18.6, 7.5], balon: "e", defensa: "ninguna", pasos: [{ m: [corre("1", [21.0, 7.2]), corre("d1", [21.4, 7.8])] }, { pase: ["e", "1"] }, { m: [bota("1", [23.4, 6.6], [25.6, 7.0]), corre("d1", [24.4, 7.6])] }, { tiro: "1" }] } },
  { t: "Circuito de fuerza con balón medicinal y tiro", d: "Estaciones: lanzamiento de balón medicinal al pecho, sentadillas con balón y 5 tiros desde el ala en cada vuelta.",
    m: { conos: [[16, 3], [16, 7.5], [16, 12]], at: { "1": [15.4, 3] }, entrenador: [24.6, 9.4], balon: "e", pasos: [{ m: [corre("1", [15.4, 7.5], [15.4, 12], [21, 12.4])] }, { pase: ["e", "1"] }, { tiro: "1" }] } },
];
const fisico: EjercicioSemilla[] = [];
for (const f of FISICO) for (const v of [{ s: "", e: "" }, { s: " (por equipos, competición)", e: "Por equipos: el equipo que termina antes (o con más canastas) gana; el que pierde, una repetición extra." }]) fisico.push(ej({
  titulo: f.t + v.s, categoria: "Físico", edades: ADULTOS, duracion: 8, jugadores: 6, material: "Balones",
  objetivos: "Condición física específica con balón", descripcion: unir(f.d, v.e), correcciones: "Mantener la técnica con fatiga · Recuperar entre series lo justo · Hidratación",
  etiquetas: ["físico", "condición", "con balón"], video: yt("basketball conditioning drills with ball"), montaje: f.m,
}));
const CALENT: { t: string; d: string; m: Montaje }[] = [
  { t: "Tiro de calentamiento en forma de Mikan a tiro libre", d: "Progresión de cerca a lejos: Mikan, tiros a 2 metros, a 4 metros y tiros libres, 5 de cada.",
    m: { conos: [[25.4, 8.6], [24.2, 9.8], [22.2, 7.5]], at: { "1": [25.4, 8.6] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [24.2, 9.8])], rebote: "1" }, { tiro: "1" }, { m: [corre("1", [22.2, 7.5])], rebote: "1" }, { tiro: "1" }] } },
  { t: "Rueda de pases con dos balones y entrada", d: "Cuatro filas en las esquinas de media pista con dos balones; pase y sigue en cuadrado (el que pasa corre a la fila a la que ha pasado) y, a la señal, entrada.",
    m: { at: { "1": [16, 2], "2": [26.6, 2], "3": [26.6, 13], "4": [16, 13] }, balones: ["1", "3"], pasos: [{ pase: ["1", "2"] }, { pase: ["3", "4"] }, { m: [corre("1", [26.0, 2.6]), corre("3", [16.6, 12.4])] }, { pase: ["2", "3"] }] } },
  { t: "Calentamiento de movilidad + tiro de forma", d: "Movilidad de tobillos, caderas y hombros (5 minutos) seguida de tiro de forma con una mano muy cerca del aro, alejándose un paso cada 5 canastas.",
    m: { conos: [[25.2, 7.5], [24.4, 7.5], [23.6, 7.5]], at: { "1": [25.2, 7.5] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [24.4, 7.5])], rebote: "1" }, { tiro: "1" }] } },
  { t: "3 carriles con pase y bandeja (calentamiento)", d: "Tres filas en el fondo: carrera a todo el campo pasando el balón al compañero de delante y bandeja; vuelta por los carriles exteriores.",
    m: { vista: "completa", at: { "1": [1, 7.5], "2": [1, 2], "3": [1, 13] }, balon: "1", pasos: [{ m: [corre("2", [9, 2]), corre("3", [9, 13])] }, { pase: ["1", "2"] }, { m: [corre("1", [15, 7.5]), corre("3", [18, 13])] }, { pase: ["2", "3"] }, { m: [corre("3", [25.6, 9.0])] }, { tiro: "3" }] } },
  { t: "Pases en movimiento por parejas (5 tipos)", d: "Parejas desplazándose a lo largo de la pista: pase de pecho, picado, de béisbol, por encima de la cabeza y con una mano, 2 idas y vueltas cada uno.",
    m: { vista: "completa", at: { "1": [1.5, 4.5], "2": [1.5, 10.5] }, balon: "1", pasos: [{ m: [corre("1", [7, 4.5]), corre("2", [8, 10.5])] }, { pase: ["1", "2"] }, { m: [corre("1", [15, 4.5]), corre("2", [14, 10.5])] }, { pase: ["2", "1"] }, { m: [corre("1", [21, 4.5]), corre("2", [22, 10.5])] }, { pase: ["1", "2"] }] } },
  { t: "Tiro en estrella de calentamiento (sin defensa)", d: "Cinco puntos con conos; el tirador tira dos veces en cada uno y cambia de punto; el pasador debajo del aro recoge y pasa. A ritmo suave para coger sensaciones.",
    m: { conos: [[26.4, 1.6], [21.6, 3.2], [20.0, 7.5], [21.6, 11.8], [26.4, 13.4]], at: { "1": [26.4, 1.6], "2": [25.4, 7.5] }, balon: "2", pasos: [{ pase: ["2", "1"] }, { tiro: "1" }, { m: [corre("1", [21.6, 3.2]), corre("2", [25.6, 6.6])], rebote: "2" }, { pase: ["2", "1"] }, { tiro: "1" }] } },
  { t: "Entradas con contacto suave (calentamiento)", d: "Fila de entradas desde el ala; un compañero con el escudo espera junto al aro y da un pequeño contacto en el aire para acostumbrarse a terminar con contacto.",
    m: { at: { "1": [19.6, 12.6] }, df: { "1": [25.4, 9.6] }, balon: "1", defensa: "ninguna", pasos: [{ m: [bota("1", [22.6, 11.4], [25.0, 9.2]), corre("d1", [25.6, 9.0])] }, { tiro: "1" }] } },
  { t: "1c1 de bote en un círculo (quitar el balón)", d: "Todos botando dentro del círculo central: hay que proteger el balón propio con el cuerpo y el brazo e intentar sacar el de los demás. El que pierde el balón sale y hace 5 botes de cambio de mano fuera.",
    m: { vista: "completa", at: { "1": [13, 6.4], "2": [15, 6.6], "3": [14.4, 8.8], "4": [13.2, 8.4] }, balones: ["1", "2", "3", "4"], pasos: [{ m: [bota("1", [13.8, 6.0], [14.6, 7.0]), bota("2", [15.4, 7.6], [14.4, 8.2]), bota("3", [13.6, 9.0], [13.2, 7.6]), bota("4", [12.8, 7.2], [13.8, 6.6])] }] } },
];
const calentamiento: EjercicioSemilla[] = CALENT.map((c) => ej({
  titulo: c.t, categoria: "Calentamiento", edades: DESDE_INF, duracion: 8, jugadores: 8, material: "Balones",
  objetivos: "Activar el cuerpo y coger sensaciones con el balón", descripcion: c.d, correcciones: "Intensidad progresiva · Técnica correcta desde el primer minuto · Comunicación",
  etiquetas: ["calentamiento"], video: yt("basketball warm up drills team"), montaje: c.m,
}));

// ============================================================================
// O) BOTE AVANZADO (sénior): cada recurso SIEMPRE contra un defensor (presión, cierre o antes del directo)
// ============================================================================
// Recorrido del recurso en ejes propios (avance, lateral), en metros
const RECURSOS_BOTE = [
  { c: "cruce", n: "cambio por delante (crossover)", ing: "crossover", t: "Cambio de mano por delante, bajo y rápido, con el hombro protegiendo.", ruta: [[1.6, 0.9], [2.6, -0.8], [4.4, -0.6]] },
  { c: "piernas", n: "entre las piernas", ing: "between the legs", t: "Cambio entre las piernas con el paso adelantado, sin perder velocidad.", ruta: [[1.6, 0.8], [2.4, -0.7], [4.4, -0.5]] },
  { c: "espalda", n: "por la espalda", ing: "behind the back", t: "Cambio por la espalda para mantener la dirección cuando el defensor corta el paso.", ruta: [[1.8, 1.0], [2.8, -0.4], [4.4, -0.4]] },
  { c: "hesit", n: "amago de parada (hesitation)", ing: "hesitation dribble", t: "Frenar levantando la cabeza como para tirar o pasar y salir explosivo.", ruta: [[1.8, 0.3], [2.1, 0.3], [4.4, 0.2]] },
  { c: "inout", n: "dentro-fuera (in and out)", ing: "in and out dribble", t: "Amago de cambio con la misma mano (el balón va hacia dentro y vuelve fuera).", ruta: [[1.6, 0.6], [2.1, 0.1], [4.4, 0.9]] },
  { c: "giro", n: "reverso (spin)", ing: "spin move", t: "Giro sobre el pie adelantado protegiendo el balón cuando el defensor se pega.", ruta: [[1.8, 0.7], [2.2, 0.0], [2.4, -0.7], [4.4, -0.9]] },
  { c: "atras", n: "bote de retroceso (retreat dribble)", ing: "retreat dribble", t: "Dos botes hacia atrás para separarse de la presión o de una trampa y ver el pase o volver a atacar.", ruta: [[1.6, 0.4], [0.4, 0.4], [3.6, -0.8]] },
  { c: "snatch", n: "bote de recogida (snatch back)", ing: "snatch back dribble", t: "Bote hacia delante y recogida brusca hacia atrás para crear espacio para el tiro.", ruta: [[2.0, 0.3], [1.0, 0.3]] },
];
const enEjes = (o: P, d: P, ruta: number[][], esc: number): P[] => {
  const n = Math.hypot(d[0] - o[0], d[1] - o[1]) || 1, u: P = [(d[0] - o[0]) / n, (d[1] - o[1]) / n], v: P = [-u[1], u[0]];
  return ruta.map(([a, l]) => [r1(o[0] + u[0] * a * esc + v[0] * l), r1(o[1] + u[1] * a * esc + v[1] * l)] as P);
};
const CONTEXTOS_BOTE = [
  { c: "presion", n: "contra presión en toda la pista", d: "1c1 en toda la pista: el defensor presiona desde el saque y el atacante tiene que superar el medio campo usando el recurso cuando el defensor le corta el paso.", j: 2 },
  { c: "cierre", n: "atacando el cierre", d: "El entrenador pasa al atacante del ala y el defensor sale a cerrarle desde la pintura; el atacante usa el recurso para superarle y finalizar.", j: 2 },
  { c: "directo", n: "antes del bloqueo directo", d: "Usar el recurso para preparar al defensor antes de atacar el bloqueo directo central: llevarle hacia el lado contrario y salir pegado al bloqueo para que quede atrapado.", j: 4 },
];
const bote: EjercicioSemilla[] = [];
for (const r of RECURSOS_BOTE) for (const c of CONTEXTOS_BOTE) {
  let m: Montaje;
  if (c.c === "presion") {
    const ruta = enEjes([3, 7.5], [16, 8.5], r.ruta, 2.6);
    m = { vista: "completa", at: { "1": [3, 7.5] }, df: { "1": [4.6, 7.5] }, balon: "1", defensa: "individual", pasos: [{ m: [bota("1", ...ruta)] }] };
  } else if (c.c === "cierre") {
    const ruta = enEjes(S.alaD, ARO, r.ruta, 1.0);
    m = { at: { "1": S.alaD }, df: { "1": [25.0, 8.6] }, entrenador: S.cabeza, balon: "e", defensa: "individual", pasos: [{ pase: ["e", "1"] }, { m: [bota("1", ...ruta)], dm: [["1", hacia(ruta[0], S.alaD, 0.3)]] }, { tiro: "1" }] };
  } else {
    const prep = enEjes(S.cabeza, [19.4, 3.0], r.ruta.slice(0, 2), 0.6);
    m = { at: { "1": S.cabeza, "5": [21.6, 9.6] }, balon: "1", defensa: "individual",
      pasos: [{ m: [bota("1", ...prep)] }, { m: [bloq("5", [20.4, 8.4])] }, { m: [bota("1", [20.6, 9.8], [22.6, 10.8])] }, { m: [corre("5", [25.2, 8.6])] }, { pase: ["1", "5"] }, { tiro: "5" }] };
  }
  bote.push(ej({
    titulo: `Bote: ${r.n} ${c.n}`, categoria: "Bote", edades: MAYORES, duracion: 8, jugadores: c.j, material: "1 balón por pareja",
    objetivos: `Dominar el ${r.n} y usarlo con intención contra un defensor`, descripcion: unir(r.t, c.d, "Series de 4-6 repeticiones por mano; el defensor empieza al 50% y acaba al 100%."),
    correcciones: "Cabeza arriba · Bote por debajo de la cintura en el cambio · Cambio de ritmo tras el recurso (lento-rápido) · Proteger con el brazo libre",
    etiquetas: ["bote", r.c, c.c, "1c1"], video: yt(`${r.ing} basketball drill`), montaje: m,
  }));
}

// ============================================================================
// P) DEFENSA INDIVIDUAL Y AYUDAS (cada situación con su dibujo)
// ============================================================================
const DEF_IND_BAL: { c: string; n: string; d: string; m: (ayuda: boolean) => Montaje }[] = [
  { c: "zigzag", n: "zigzag defensivo con balón", d: "1c1 en zigzag por toda la pista: el defensor se pone en la línea del bote y obliga al atacante a cambiar de dirección cada 3 botes.",
    m: () => ({ vista: "completa", at: { "1": [1.4, 1.4] }, df: { "1": [2.6, 2.4] }, balon: "1", defensa: "ninguna", pasos: [{ m: [bota("1", [5.4, 6.0], [9.0, 1.6], [13.0, 6.2], [17.0, 1.6])], dm: [["1", [6.4, 5.0], [10.0, 2.6], [14.0, 5.2], [18.0, 2.6]]] }] }) },
  { c: "linea", n: "negar la línea de fondo", d: "1c1 desde el ala: el defensor se coloca un poco hacia la línea de fondo y manda siempre al atacante al centro (donde está la ayuda), nunca por fuera.",
    m: (ay) => ({ at: { "1": S.alaD }, df: { "1": [21.8, 12.8], ...(ay ? { "4": [24.4, 6.6] } : {}) }, balon: "1", defensa: "ninguna", pasos: [{ m: [bota("1", [22.4, 10.4], [23.6, 8.8])], dm: [["1", [23.0, 11.0], [24.2, 9.6]], ...(ay ? [["4", [24.4, 7.8]] as [string, P]] : [])] }, { tiro: "1" }] }) },
  { c: "parar", n: "parar el bote y defender el pase", d: "Cuando el atacante deja de botar, el defensor se pega (presión con las manos en el balón) y molesta el pase sin hacer falta; el compañero tiene que venir a recibir.",
    m: () => ({ at: { "1": S.alaD, "2": S.cabeza }, df: { "1": [22.0, 11.6] }, balon: "1", defensa: "ninguna", pasos: [{ m: [bota("1", [22.2, 11.0])], dm: [["1", [22.8, 10.4]]] }, { dm: [["1", [22.6, 10.8]]], m: [corre("2", [20.2, 9.4])] }, { pase: ["1", "2"] }] }) },
  { c: "tirador", n: "defender al tirador tras bote", d: "1c1 contra un buen tirador: el defensor le niega el tiro tras bote (pegado, la mano en la cara del balón) sin dejarse superar hacia el aro.",
    m: (ay) => ({ at: { "1": S.alaD }, df: { "1": [22.0, 11.6], ...(ay ? { "4": [24.4, 6.6] } : {}) }, balon: "1", defensa: "ninguna", pasos: [{ m: [bota("1", [20.6, 10.6])], dm: [["1", [21.4, 10.0]]] }, { tiro: "1" }] }) },
  { c: "poste", n: "defensa del poste por delante", d: "Con el balón en la cabeza, el defensor del poste bajo se coloca por detrás; cuando el balón va al ala, pasa a negarle 3/4 por delante por el lado del balón.",
    m: (ay) => ({ at: { "5": S.posteD, "1": S.cabeza, "2": S.alaD }, df: { "5": [26.2, 9.2], ...(ay ? { "4": [24.4, 6.6] } : {}) }, balon: "1", defensa: "ninguna", pasos: [{ pase: ["1", "2"], dm: [["5", [25.2, 10.2]]] }, { pase: ["2", "1"], dm: [["5", [26.2, 9.2]]] }] }) },
  { c: "corte", n: "defender el corte (no dejar pasar por delante)", d: "El atacante pasa al entrenador y corta: el defensor salta hacia el balón (jump to the ball) en cuanto sale el pase y obliga a cortar por detrás de él.",
    m: (ay) => ({ at: { "1": S.alaD }, df: { "1": [22.0, 11.6], ...(ay ? { "4": [24.4, 6.6] } : {}) }, entrenador: S.cabeza, balon: "1", defensa: "ninguna", pasos: [{ pase: ["1", "e"], dm: [["1", [21.6, 10.6]]] }, { m: [corre("1", [23.0, 11.6], [25.6, 9.4])], dm: [["1", [23.6, 10.0]]] }] }) },
];
const defensa: EjercicioSemilla[] = [];
for (const d of DEF_IND_BAL) for (const v of [{ s: "", e: "", j: 2, ay: false }, { s: " (con ayuda)", e: "Se añade un compañero de ayuda en el lado débil: si el defensor es superado, la ayuda llega y hay que recuperar.", j: 4, ay: true }, ]) {
  if (v.ay && (d.c === "zigzag" || d.c === "parar")) continue;
  defensa.push(ej({
    titulo: `Defensa: ${d.n}${v.s}`, categoria: "Defensa", edades: MAYORES, duracion: 10, jugadores: v.j, material: "1 balón",
    objetivos: "Defensa individual del balón y del jugador sin balón", descripcion: unir(d.d, v.e, "En competición: se cuentan paradas defensivas en 5 intentos."),
    correcciones: "Posición baja, pies más anchos que los hombros · No cruzar los pies · Mano activa en el balón sin buscar el robo · Cabeza por delante del atacante",
    etiquetas: ["defensa individual", d.c], video: yt(`${d.c === "poste" ? "post defense" : d.c === "corte" ? "jump to the ball" : "on ball defense"} drill`),
    montaje: d.m(v.ay),
  }));
}
const AYUDAS: { c: string; n: string; d: string; video: string; m: (f: "3c3" | "4c4" | "5c5") => Montaje }[] = [
  { c: "ayudaal", n: "ayudar al que ayuda (help the helper)", video: "help the helper", d: "Penetración por la línea de fondo: ayuda el defensor del lado débil más cercano al aro y el siguiente defensor rota al jugador que ha dejado libre esa ayuda; el balón sale y todos recuperan.",
    m: (f) => f === "3c3" ? { at: F3, defensa: "individual", balon: "2", pasos: [{ m: [bota("2", [24.0, 12.4], [26.0, 10.2])], dm: [["3", [26.0, 8.6]], ["1", [24.6, 5.0]]] }, { pase: ["2", "3"] }, { tiro: "3" }] }
      : f === "4c4" ? { at: F4, defensa: "individual", balon: "2", pasos: [{ m: [bota("2", [23.0, 12.2], [26.0, 10.6])], dm: [["3", [26.0, 8.8]], ["1", [25.6, 3.4]]] }, { pase: ["2", "3"] }, { pase: ["3", "1"] }] }
      : { at: F5, defensa: "individual", balon: "2", pasos: [{ m: [bota("2", [24.0, 12.4], [26.0, 10.4])], dm: [["5", [26.2, 9.0]], ["4", [25.6, 8.2]], ["3", [25.4, 3.6]]] }, { pase: ["2", "5"] }, { tiro: "5" }] } },
  { c: "caida", n: "caída al poste tras pase interior", video: "post double down", d: "Cuando el balón entra al poste, el defensor exterior más cercano cae hacia dentro para molestar (sin dejar de ver a su jugador) y vuelve cuando el poste saca el balón.",
    m: (f) => ({ at: f === "3c3" ? F3P : f === "4c4" ? F4P : F5, defensa: "individual", balon: "1", pasos: f === "3c3" ? [{ pase: ["1", "5"], dm: [["1", [24.0, 10.6]]] }, { pase: ["5", "1"], dm: [["1", [22.0, 11.6]]] }] : [{ pase: ["1", "2"] }, { pase: ["2", "5"], dm: [["2", [24.0, 10.6]]] }, { pase: ["5", "2"], dm: [["2", [22.0, 11.6]]] }] }) },
  { c: "tag", n: "tag al que continúa del directo", video: "tag the roller", d: "Bloqueo directo central: el defensor del lado débil más cercano al aro toca (tag) al jugador que continúa tras el bloqueo y vuelve a su jugador cuando el defensor del bloqueador se recupera.",
    m: (f) => { const at: Record<string, P> = f === "3c3" ? { "1": S.cabeza, "5": [22.2, 9.2], "3": S.esqI } : f === "4c4" ? { "1": S.cabeza, "5": [22.2, 9.2], "2": S.esqD, "3": S.esqI } : { "1": S.cabeza, "5": [22.2, 9.2], "2": S.esqD, "3": S.alaI, "4": S.esqI };
      const tg = f === "5c5" ? "4" : "3";
      return { at, defensa: "individual", balon: "1", pasos: [{ m: [bloq("5", [20.4, 8.4])] }, { m: [bota("1", [21, 10.2], [22.6, 10.8])] }, { m: [corre("5", [25.2, 8.4])], dm: [[tg, [25.2, 7.2]]] }, { pase: ["1", tg], dm: [[tg, [26.2, 2.0]]] }] }; } },
  { c: "fondo", n: "ayuda en la línea de fondo", video: "baseline help defense", d: "Penetración por la línea de fondo: el defensor del poste del lado débil sale a cortarla fuera de la zona y el resto rota hacia abajo para tapar al poste que queda libre.",
    m: (f) => f === "3c3" ? { at: F3P, defensa: "individual", balon: "1", pasos: [{ m: [bota("1", [23.6, 13.2], [26.2, 11.4])], dm: [["5", [26.6, 10.4]], ["2", [25.0, 8.0]]] }, { pase: ["1", "5"] }] }
      : { at: f === "4c4" ? F4P : F5, defensa: "individual", balon: "2", pasos: [{ m: [bota("2", [23.6, 13.2], [26.2, 11.4])], dm: [["5", [26.6, 10.4]], ["3", [25.4, 8.6]]] }, { pase: ["2", "5"] }] } },
  { c: "stunt", n: "finta de ayuda (stunt) y recuperar", video: "stunt and recover", d: "Ante una penetración, el defensor del lado del balón amaga ayudar (stunt) un paso hacia el que bota para frenarle y recupera a su jugador antes de que le llegue el pase.",
    m: (f) => ({ at: f === "3c3" ? F3 : f === "4c4" ? F4 : F5, defensa: "individual", balon: "1", pasos: [{ m: [bota("1", [21.6, 8.8])], dm: [["2", [21.6, 10.4]]] }, { pase: ["1", "2"], dm: [["2", f === "4c4" ? [20.4, 9.8] : [21.8, 11.8]]] }] }) },
  { c: "tapon", n: "ayuda vertical (sin falta)", video: "verticality help defense", d: "El atacante supera a su defensor y llega al aro: el defensor de ayuda llega antes, se planta y salta vertical con los brazos arriba para molestar sin hacer falta.",
    m: (f) => ({ at: f === "3c3" ? F3 : f === "4c4" ? F4 : F5, defensa: "individual", balon: "1", pasos: [{ m: [bota("1", [22.8, 8.6], [25.0, 8.4])], ayuda: f === "5c5" ? "5" : "3" }, { tiro: "1" }] }) },
];
for (const a of AYUDAS) for (const f of [{ c: "3c3" as const, j: 6 }, { c: "4c4" as const, j: 8 }, { c: "5c5" as const, j: 10 }]) defensa.push(ej({
  titulo: `Ayudas: ${a.n} (${f.c})`, categoria: "Defensa", edades: ADULTOS, duracion: 12, jugadores: f.j, material: "1 balón",
  objetivos: `Defensa de equipo: ${a.n}`, descripcion: unir(`${f.c} media pista.`, a.d, "Primero a medio ritmo con paradas del entrenador; después en vivo contando paradas."),
  correcciones: "Hablar antes de ayudar ('¡ayuda!') · Llegar antes que el atacante (posición, no reacción) · Recuperar con pasos cortos y la mano arriba · Siempre ver el balón",
  etiquetas: ["ayudas", "rotaciones", a.c, f.c], video: yt(`${a.video} drill`), montaje: a.m(f.c),
}));

// ============================================================================
// Q) PASES ESPECIALES, TIRO LIBRE Y REBOTE OFENSIVO
// ============================================================================
const PASES_ESP: { c: string; n: string; d: string; video: string; m: (v: "sin" | "linea" | "juego") => Montaje }[] = [
  { c: "poste", n: "pase al poste (entrada interior)", video: "post entry pass", d: "Pase desde el ala al poste bajo por el lado contrario al defensor: picado si le defiende por arriba, bombeado si le defiende por delante.",
    m: (v) => ({ at: { "1": S.alaD, "5": S.posteD, ...(v === "juego" ? { "2": S.cabeza } : {}) }, df: v === "sin" ? {} : { "5": [25.0, 9.8], ...(v === "juego" ? { "1": dfDe(S.alaD), "2": dfDe(S.cabeza) } : {}) }, defensa: v === "juego" ? "individual" : "ninguna", balon: "1", pasos: [{ m: [corre("5", [25.8, 9.0])] }, { pase: ["1", "5"] }, { tiro: "5" }] }) },
  { c: "pocket", n: "pase en el bolsillo (pocket pass)", video: "pocket pass", d: "Tras el bloqueo directo, pase picado entre los dos defensores al que continúa, en cuanto el defensor del bloqueador sube a frenar el balón.",
    m: (v) => ({ at: { "1": S.cabeza, "5": [21.6, 9.4], ...(v === "juego" ? { "2": S.esqD } : {}) }, df: v === "sin" ? {} : { "1": [20.4, 7.6], "5": [22.2, 9.0], ...(v === "juego" ? { "2": dfDe(S.esqD) } : {}) }, defensa: v === "juego" ? "individual" : "ninguna", balon: "1",
      pasos: [{ m: [bloq("5", [20.4, 8.4])] }, { m: [bota("1", [21.0, 10.0])], ...(v !== "sin" ? { dm: [["1", [20.6, 9.0]], ["5", [21.6, 10.4]]] as [string, P][] } : {}) }, { m: [corre("5", [23.6, 9.0])] }, { pase: ["1", "5"] }, { tiro: "5" }] }) },
  { c: "globo", n: "pase bombeado al aro (lob)", video: "lob pass", d: "El alero sobrepasa la negación de su defensor con una puerta atrás y el pasador le pone el balón alto, por encima del defensor, cerca del aro.",
    m: (v) => ({ at: { "1": S.cabeza, "2": S.alaD, ...(v === "juego" ? { "3": S.alaI } : {}) }, df: v === "sin" ? {} : { "2": [21.0, 11.2], ...(v === "juego" ? { "1": dfDe(S.cabeza), "3": dfDe(S.alaI) } : {}) }, defensa: v === "juego" ? "individual" : "ninguna", balon: "1",
      pasos: [{ m: [corre("2", [20.4, 12.0], [25.4, 9.0])], ...(v !== "sin" ? { dm: [["2", [22.4, 10.4]]] as [string, P][] } : {}) }, { pase: ["1", "2"] }, { tiro: "2" }] }) },
  { c: "salida", n: "pase de salida largo (outlet)", video: "outlet pass", d: "Tras el rebote en el aro propio, pase largo de una o dos manos al compañero que corre por la banda hacia el otro aro, por delante de él.",
    m: (v) => ({ vista: "completa", at: { "5": [2.2, 7.5], "2": [8, 2] }, df: v === "sin" ? {} as Record<string, P> : { "2": [10, 3.2] as P }, defensa: "ninguna", balon: "5",
      pasos: [{ m: [corre("2", [17, 2], [21, 3.4])], ...(v !== "sin" ? { dm: [["2", [18, 4.6]]] as [string, P][] } : {}) }, { pase: ["5", "2"] }, { m: [bota("2", [25.4, 6.6])] }, { tiro: "2" }] }) },
  { c: "manoamano", n: "entrega en mano a mano (DHO)", video: "dribble handoff", d: "El que bota va hacia el compañero y le entrega el balón a la altura de la cadera, usando su cuerpo como bloqueo; el receptor sale pegado y ataca.",
    m: (v) => ({ at: { "1": S.cabeza, "2": S.alaD, ...(v === "juego" ? { "3": S.alaI } : {}) }, df: v === "sin" ? {} : { "2": [21.6, 11.4], ...(v === "juego" ? { "1": dfDe(S.cabeza), "3": dfDe(S.alaI) } : {}) }, defensa: v === "juego" ? "individual" : "ninguna", balon: "1",
      pasos: [{ m: [bota("1", [20.4, 10.4]), corre("2", [21.4, 11.6])] }, { mano: ["1", "2"], ...(v === "linea" ? { dm: [["2", [20.8, 11.4]]] as [string, P][] } : {}) }, { m: [bota("2", [23.2, 10.0], [25.2, 8.8])] }, { tiro: "2" }] }) },
  { c: "unmano", n: "pase a una mano tras bote", video: "one hand pass", d: "Pase con una mano en movimiento, sin recoger el balón, al compañero que se abre a la esquina cuando su defensor ayuda en la penetración.",
    m: (v) => ({ at: { "1": S.alaD, "2": S.esqD, ...(v === "juego" ? { "3": S.alaI } : {}) }, df: v === "sin" ? {} : { "2": [25.4, 11.4], ...(v === "juego" ? { "1": dfDe(S.alaD), "3": dfDe(S.alaI) } : {}) }, defensa: v === "juego" ? "individual" : "ninguna", balon: "1",
      pasos: [{ m: [bota("1", [23.4, 10.8], [24.6, 9.6])], ...(v !== "sin" ? { dm: [["2", [25.2, 10.0]]] as [string, P][] } : {}) }, { pase: ["1", "2"] }, { tiro: "2" }] }) },
];
const pasesEsp: EjercicioSemilla[] = [];
for (const p of PASES_ESP) for (const v of [{ c: "sin" as const, s: "sin defensa", e: "Primero sin defensa, por parejas, 10 por lado.", j: 2 }, { c: "linea" as const, s: "con defensor en la línea", e: "Con un defensor que intenta interceptar el pase.", j: 3 }, { c: "juego" as const, s: "en juego (3c3)", e: "En 3c3: el pase solo vale si se hace en situación de juego real.", j: 6 }]) pasesEsp.push(ej({
  titulo: `Pase: ${p.n} (${v.s})`, categoria: "Pase", edades: MAYORES, duracion: 8, jugadores: v.j, material: "2 balones",
  objetivos: `Técnica y momento del ${p.n}`, descripcion: unir(p.d, v.e), correcciones: "Fintar antes de pasar · Pase tenso, al lado lejano del defensor · Pasar al espacio donde va el receptor · El receptor pide con las manos",
  etiquetas: ["pase", p.c], video: yt(`${p.video} drill`), montaje: p.m(v.c),
}));
// Posiciones de tiro libre (aro derecho): casillas de la zona
const CAS = { d1: [25.4, 10.1] as P, d2: [24.4, 10.1] as P, d3: [23.4, 10.1] as P, i1: [25.4, 4.9] as P, i2: [24.4, 4.9] as P, i3: [23.4, 4.9] as P };
const TL: { t: string; d: string; m: Montaje }[] = [
  { t: "Rutina de tiro libre con presión (1 y 1)", d: "Cada jugador lanza un 1 y 1: si falla el primero, carrera hasta el medio campo y vuelta. Simula los finales de partido.",
    m: { at: { "1": [22.2, 7.5] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [14.4, 7.5], [22.2, 7.5])] }] } },
  { t: "Tiros libres tras sprint", d: "Sprint de ida y vuelta al medio campo y 2 tiros libres; se anota el porcentaje con fatiga.",
    m: { at: { "1": [22.2, 7.5] }, entrenador: [24.6, 10.4], balon: "e", pasos: [{ m: [corre("1", [14.4, 8.2], [22.2, 7.5])] }, { pase: ["e", "1"] }, { tiro: "1" }] } },
  { t: "Tiro libre por equipos: llegar a 10 seguidos", d: "El equipo, en fila detrás de la línea, tiene que encadenar 10 tiros libres anotados seguidos (rotando tiradores). Si uno falla, se vuelve a 0.",
    m: { at: { "1": [22.2, 7.5], "2": [20.6, 7.5], "3": [19.6, 7.5], "4": [18.6, 7.5] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [18.6, 8.6]), corre("2", [22.2, 7.5])] }] } },
  { t: "Tiro libre con distracciones", d: "El resto del equipo se coloca en las casillas y hace ruido y movimientos (sin tocar) para simular el ambiente de un pabellón.",
    m: { at: { "1": [22.2, 7.5], "2": CAS.d2, "3": CAS.i2, "4": CAS.d3, "5": CAS.i3 }, balon: "1", pasos: [{ tiro: "1" }] } },
  { t: "Rutina personal de tiro libre", d: "Cada jugador define su rutina (botes, respiración, mirada) y la repite igual en 20 tiros libres; un compañero recoge y le devuelve el balón.",
    m: { at: { "1": [22.2, 7.5], "2": [25.6, 7.5] }, balon: "1", pasos: [{ tiro: "1" }, { rebote: "2" }, { pase: ["2", "1"] }] } },
  { t: "Tiro libre y rebote en juego (tras fallo)", d: "Se lanza el segundo tiro libre fallado a propósito y se juega el rebote 4c4 con las posiciones reglamentarias: los defensores en las primeras casillas cierran por dentro.",
    m: { at: { "1": [22.2, 7.5], "2": CAS.d2, "3": CAS.i2, "4": [19.6, 10.4] }, df: { "2": CAS.d1, "3": CAS.i1, "1": [20.6, 6.0], "4": CAS.d3 }, balon: "1", defensa: "individual",
      pasos: [{ tiro: "1" }, { m: [corre("2", [25.8, 9.0]), corre("3", [25.8, 6.0]), corre("1", [23.4, 7.5])], cierra: true }, { rebote: "d2" }] } },
];
const tiroLibre = TL.map((t) => ej({
  titulo: t.t, categoria: "Tiro", edades: MAYORES, duracion: 8, jugadores: 6, material: "2 balones",
  objetivos: "Tiro libre fiable bajo presión", descripcion: t.d, correcciones: "Misma rutina siempre · Codo bajo el balón · Terminar con la muñeca y mantener el brazo arriba · Respirar antes de tirar",
  etiquetas: ["tiro libre", "rutina", "presión"], video: yt("free throw routine drill"), montaje: t.m,
}));
const REB_EXT: { t: string; d: string; m: Montaje }[] = [
  { t: "Rebote ofensivo de los exteriores (crash desde el ala)", d: "Tras el tiro del entrenador, los aleros van al rebote ofensivo desde el ala esquivando con un paso de rodeo al defensor que les cierra.",
    m: { at: { "2": S.alaD, "3": S.alaI }, df: { "2": [23.2, 10.8], "3": [23.2, 4.2] }, entrenador: [22.2, 7.5], balon: "e", defensa: "ninguna", pasos: [{ tiro: "e" }, { m: [corre("2", [22.6, 12.0], [25.6, 9.2]), corre("3", [22.6, 3.0], [25.6, 5.8]), corre("d2", [24.4, 10.0]), corre("d3", [24.4, 5.0])] }, { rebote: "2" }, { tiro: "2" }] } },
  { t: "Palmeo continuo en el aro (tip drill)", d: "Fila a un lado del aro: palmear el balón contra el tablero 3 veces seguidas y anotar a la cuarta; el siguiente entra y continúa.",
    m: { at: { "1": [26.2, 9.0], "2": [24.6, 10.6] }, balon: "1", pasos: [{ tiro: "1" }, { rebote: "1" }, { tiro: "1" }, { m: [corre("1", [24.4, 11.4]), corre("2", [26.2, 9.0])] }] } },
  { t: "Rebote 'superman' de lado a lado", d: "Lanzar el balón contra el tablero hacia el otro lado, cruzar la zona, saltar a cogerlo en el punto más alto y volver a lanzarlo; 10 seguidos.",
    m: { at: { "1": [26.6, 10.2] }, balon: "1", pasos: [{ tiro: "1" }, { m: [corre("1", [26.6, 4.8])], rebote: "1" }, { tiro: "1" }, { m: [corre("1", [26.6, 10.2])], rebote: "1" }] } },
  { t: "Rebote y pase de salida en 2 segundos", d: "El entrenador tira, el jugador coge el rebote, pivota hacia fuera y hace el pase de salida al compañero que se abre a la banda.",
    m: { at: { "1": [25.4, 8.6], "2": [22.4, 12.6] }, entrenador: [22.2, 7.5], balon: "e", pasos: [{ tiro: "e" }, { m: [corre("1", [26.0, 8.2]), corre("2", [20.6, 14.2])], rebote: "1" }, { pase: ["1", "2"] }] } },
  { t: "Rebote 2c1 (un defensor contra dos atacantes)", d: "Un defensor tiene que cerrar a dos atacantes: cierra al más cercano al aro y pelea el balón; el otro atacante intenta entrar por el lado libre.",
    m: { at: { "2": [23.6, 10.4], "3": [23.6, 4.6] }, df: { "2": [24.8, 7.5] }, entrenador: [21.4, 7.5], balon: "e", defensa: "ninguna", pasos: [{ tiro: "e" }, { m: [corre("2", [25.0, 9.8]), corre("3", [25.8, 5.4]), corre("d2", [25.8, 8.8])] }, { rebote: "3" }, { tiro: "3" }] } },
  { t: "Rebote de tiro libre (posiciones y bloqueo)", d: "Posiciones reglamentarias de tiro libre: los defensores en las primeras casillas cierran por dentro al atacante de su lado y el ataque intenta ganar la posición interior.",
    m: { at: { "1": [22.2, 7.5], "2": CAS.d2, "3": CAS.i2 }, df: { "2": CAS.d1, "3": CAS.i1 }, balon: "1", defensa: "ninguna", pasos: [{ tiro: "1" }, { m: [corre("2", [25.0, 9.4]), corre("3", [25.0, 5.6]), corre("d2", [25.8, 9.2]), corre("d3", [25.8, 5.8])] }, { rebote: "d2" }] } },
];
const reboteExt = REB_EXT.flatMap((r) => [{ s: "", e: "" }, { s: " (competición por puntos)", e: "Cada rebote ganado es 1 punto; el primero a 5 gana." }].map((v) => ej({
  titulo: r.t + v.s, categoria: "Rebote", edades: MAYORES, duracion: 8, jugadores: 4, material: "1-2 balones",
  objetivos: "Agresividad y técnica en el rebote", descripcion: unir(r.d, v.e), correcciones: "Saltar al punto más alto · Coger el balón con las dos manos · Contacto antes que balón · Proteger el balón tras cogerlo",
  etiquetas: ["rebote", "rebote ofensivo"], video: yt("rebounding drills basketball"), montaje: r.m,
})));

// ============================================================================
// R) EJERCICIOS DE EQUIPO QUE COMPARTEN ENTRENADORES (redes, clínics y bibliotecas de ejercicios):
//    muchas filas, varios balones y todos los jugadores activos. Redactados para el club.
// ============================================================================
type Equipo = { t: string; cat: string; j: number; bal: string; d: string; corr: string; obj: string; et: string[]; video: string; ed?: string[]; m: Montaje };
const EQUIPO: Equipo[] = [
  // ---------------------------------------------------------------- TIRO
  { t: "Tiro Maryland: 3 filas, 4 balones y por minutos", cat: "Tiro", j: 10, bal: "4 balones", video: "Maryland shooting drill basketball", et: ["tiro", "3 filas", "competición", "por minutos"],
    obj: "Mucho volumen de tiro con pase, rebote y comunicación · Tirar con cansancio y con prisa",
    d: "Tres filas: una en la cabeza (con dos balones), otra en la esquina derecha y otra en el ala izquierda (con dos balones). La cabeza pasa a la esquina, que tira; ese tirador sube corriendo a la parte alta del arco y recibe un segundo balón del ala izquierda para volver a tirar. Cada uno coge su rebote y se va a la fila que toca sin que el entrenador lo diga (tienen que organizarse hablando). Un minuto por posición: minuto 1 esquina y arriba, minuto 2 las dos alas, minuto 3 esquina contraria; luego se cambia de canasta. Canastas de 2 y de 3 puntúan; se apunta el total de cada minuto para batir el récord. Idea de Mike Neighbors (Maryland / Arkansas).",
    corr: "Pase al bolsillo de tiro y en el momento en que el tirador llega · Pies preparados antes del balón · Rebote propio sin dejar que bote dos veces · Hablar: nombre del receptor en cada pase",
    m: { at: { "1": S.cabeza, "4": [17.8, 7.5], "2": S.esqD, "5": [27.4, 14.6], "3": S.alaI, "6": [19.8, 1.4] }, balones: ["1", "3"],
      pasos: [{ pase: ["1", "2"] }, { tiro: "2" }, { m: [corre("2", [24.6, 12.4], [20.0, 9.6]), corre("1", [26.2, 13.6])] }, { pase: ["3", "2"] }, { tiro: "2" }] } },
  { t: "Tiro Hurricanes: pase a la esquina corta y skip a la otra ala", cat: "Tiro", j: 9, bal: "3 balones", video: "Miami Hurricanes shooting drill skip pass", et: ["tiro", "skip pass", "dos filas"],
    obj: "Tiro tras pase interior-exterior y tras pase por encima · Recepción con los pies preparados",
    d: "Dos pasadores arriba (con balón), uno en la esquina corta derecha y dos filas de tiradores, una en cada ala. Un pasador de arriba pasa al ala derecha, que se la entrega al de la esquina corta; este hace un pase cruzado por encima al ala izquierda mientras el otro pasador de arriba vuelve a dar balón al ala derecha. Tiran los dos aleros a la vez, cogen su rebote y cambian de fila. Cada fila tiene que llegar a un número de canastas (por ejemplo 15) antes que la otra. Inspirado en el ejercicio de tiro de los Miami Hurricanes.",
    corr: "El del ala derecha pasa y se recoloca (paso atrás) para volver a recibir · Pase cruzado tenso, a la altura del pecho · Recibir con el pie interior adelantado",
    m: { at: { "1": [19.2, 8.6], "4": [19.2, 6.4], "5": [26.4, 11.8], "2": S.alaD, "7": [19.8, 13.6], "3": S.alaI, "6": [19.8, 1.4] }, balones: ["1", "4"],
      pasos: [{ pase: ["1", "2"] }, { pase: ["2", "5"], m: [corre("2", [20.6, 12.8])] }, { pases: [["5", "3"], ["4", "2"]] }, { tiros: ["2", "3"] }, { m: [corre("2", [19.8, 1.4]), corre("3", [19.8, 13.6])] }] } },
  { t: "Tiro en las 4 esquinas con bloqueos (curl, abrirse, puerta atrás)", cat: "Tiro", j: 10, bal: "4 balones", video: "4 corner shooting drill screens", et: ["tiro", "bloqueos", "lectura", "4 filas"],
    obj: "Leer el bloqueo indirecto a velocidad de partido y anunciar el corte · Tirar tras curl, salida abierta o puerta atrás",
    d: "Dos pasadores arriba con balón (uno a cada lado) y en cada lado un bloqueador en el ala y un cortador en la esquina corta. A la vez en los dos lados: el bloqueador baja a bloquear y el cortador elige y grita su salida: rodear hacia el codo (curl), abrirse a la esquina (fade) o salir recto. Recibe del pasador de su lado y tira. Rotación: el tirador coge el rebote y va a la fila de pasadores, el pasador pasa a bloquear y el bloqueador a cortar. Cada vuelta se cambia la salida obligatoria.",
    corr: "El cortador lleva a su defensor imaginario hacia abajo antes de salir · Grita la salida antes de usar el bloqueo · El bloqueador se gira hacia el balón tras el contacto · Pase cuando el cortador sale del bloqueo, no antes",
    m: { at: { "1": [19.6, 9.4], "4": [19.6, 5.6], "2": [22.4, 11.8], "3": [26.4, 11.4], "5": [22.4, 3.2], "6": [26.4, 3.6] }, balones: ["1", "4"],
      pasos: [{ m: [bloq("2", [24.0, 10.8]), bloq("5", [24.0, 4.2])] }, { m: [corre("3", [24.8, 10.2], [22.6, 9.0]), corre("6", [25.8, 3.0], [26.8, 1.4])] }, { pases: [["1", "3"], ["4", "6"]] }, { tiros: ["3", "6"] }] } },
  { t: "Tiro IU: tres pasadores bajo el aro, de la esquina al ala", cat: "Tiro", j: 9, bal: "3 balones", video: "IU shooting drill basketball", et: ["tiro", "3 filas", "rueda"],
    obj: "Tiro con ritmo alto y rotación continua · Pase extra de la esquina al ala",
    d: "Tres jugadores bajo el aro con un balón cada uno, una fila en la esquina y otra en el ala del mismo lado. El primero de abajo pasa a la esquina, la esquina pasa al ala y el ala tira. El tirador coge su rebote y se queda bajo el aro como pasador; el de la esquina sube a la fila del ala y el pasador va a la esquina. Por tiempo o por canastas en cada uno de los 5 puntos (esquina, ala y cabeza de cada lado).",
    corr: "El de la esquina recibe y pasa sin botar · El tirador espera el pase con las manos arriba · Rebote rápido y pase al siguiente",
    m: { at: { "1": [27.2, 6.8], "4": [27.2, 7.8], "7": [27.2, 8.8], "2": S.esqD, "5": [27.6, 14.6], "3": S.alaD, "6": [19.8, 13.6] }, balones: ["1", "4", "7"],
      pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { tiro: "3" }, { m: [corre("3", [26.6, 9.6]), corre("2", [21.4, 13.0]), corre("1", [26.8, 13.6])] }, { pase: ["4", "5"] }] } },
  { t: "Tiro con penetración y relleno: esquina y ala (12 minutos)", cat: "Tiro", j: 8, bal: "4 balones", video: "drive and fill shooting drill", et: ["tiro", "drive and kick", "relleno", "por tiempo"],
    obj: "Tirar tras el pase de la penetración y rellenar el espacio correcto · Volumen alto de tiro",
    d: "Un pasador bajo el aro con balones, una fila en la esquina y otra en el ala. Primer balón: tiro de la esquina. Segundo balón: el de la esquina penetra por la línea de fondo y el del ala se desliza hasta la esquina (rellena por detrás, sin atajar) para recibir y tirar. Cada 2-3 minutos cambian las posiciones (ala y cabeza, cabeza y ala contraria, esquina contraria) hasta completar 12 minutos. Se puede añadir un cierre en cada tiro.",
    corr: "Rellenar hasta la esquina del todo (no quedarse a medio camino) · El que penetra fija la ayuda antes de pasar · Pase al lado de la mano de tiro",
    m: { at: { "5": [26.6, 8.8], "8": [26.6, 7.6], "2": S.esqD, "4": [27.6, 14.6], "3": S.alaD, "6": [19.8, 13.6] }, balones: ["5", "8"],
      pasos: [{ pase: ["5", "2"] }, { tiro: "2" }, { pase: ["8", "4"], m: [corre("4", [26.8, 13.8])] }, { m: [bota("4", [26.0, 11.2]), corre("3", [24.0, 13.6], [26.8, 14.0])] }, { pase: ["4", "3"] }, { tiro: "3" }] } },
  { t: "Tiro con cortes desde la línea de fondo (dos filas cruzadas)", cat: "Tiro", j: 8, bal: "4 balones", video: "endline cutter shooting drill", et: ["tiro", "cortes", "dos filas"],
    obj: "Recibir en movimiento tras cortar · Pies de tiro en la recepción (paso interior)",
    d: "Dos filas en la línea de fondo, a los lados de la zona, con balón todos menos el primero de una fila. El primero cruza la zona y sale al codo contrario, recibe del primero de la otra fila y tira en suspensión. En cuanto pasa, el pasador corta en sentido contrario hacia el otro codo y recibe del siguiente. Sin botar. Cada uno coge su rebote y va a la fila contraria. Se empieza cerca del aro, luego desde los codos y al final desde el arco.",
    corr: "Corte en ángulo y bajo, con el pie interior para frenar · Pedir el balón con las manos · El pase llega al bolsillo de tiro, no a los pies",
    m: { at: { "2": [27.4, 9.8], "4": [27.4, 11.0], "1": [27.4, 5.2], "3": [27.4, 4.0] }, balones: ["1", "4"],
      pasos: [{ m: [corre("2", [25.0, 8.6], [22.8, 5.8])] }, { pase: ["1", "2"] }, { tiro: "2", m: [corre("1", [25.0, 6.4], [22.8, 9.2])] }, { pase: ["4", "1"] }, { tiro: "1" }] } },
  { t: "Tiro desde las alas con corte en V (dos filas, rebotador)", cat: "Tiro", j: 9, bal: "4 balones", video: "sideline v cut shooting drill", et: ["tiro", "corte en V", "dos filas"],
    obj: "Ganar la recepción con un corte en V y tirar equilibrado",
    d: "Dos filas en las alas (a la altura de la prolongación del tiro libre) y un rebotador bajo el aro. El primero de una fila hace un corte en V hacia la otra fila, recibe del primero de esa fila y tira. El que ha pasado es el siguiente en cortar hacia el lado contrario. El rebotador coge el balón y lo lleva botando con la mano débil a la fila de la que salió el pase. Se tira y se queda (no se sigue el tiro), como en partido.",
    corr: "Llevar al defensor hacia el aro y salir con cambio de ritmo · Pivotar sobre el pie interior · Caer en el mismo sitio del salto",
    m: { at: { "1": S.alaI, "3": [19.8, 1.4], "2": S.alaD, "4": [19.8, 13.6], "5": [26.6, 7.5] }, balones: ["1", "3"],
      pasos: [{ m: [corre("2", [23.4, 11.0], [20.6, 9.4])] }, { pase: ["1", "2"] }, { tiro: "2", m: [corre("1", [23.4, 4.0], [20.6, 5.6])] }, { pase: ["3", "1"], rebote: "5" }, { tiro: "1" }] } },
  { t: "Entradas en 3 filas con puerta atrás (rebotador y 3 balones)", cat: "Tiro", j: 10, bal: "3 balones", video: "3 line backdoor layup drill", et: ["finalización", "puerta atrás", "3 filas", "calentamiento"],
    obj: "Puerta atrás leyendo el bote del compañero · Finalizar con las dos manos en carrera",
    d: "Tres filas (ala izquierda con balones, cabeza y ala derecha) y un rebotador bajo el aro. El ala izquierda pasa a la cabeza, que bota uno o dos veces hacia el ala derecha; el del ala derecha amaga subir y corta por la espalda (puerta atrás), recibe y finaliza. El rebotador coge y pasa a la fila del balón. Rotación: cada uno a la fila siguiente y el que finaliza pasa a rebotear. Variantes: pase bombeado en el segundo pase, defensor pasivo y el mismo trabajo por la izquierda.",
    corr: "El que bota hacia el ala es la señal para cortar · Amago creíble hacia arriba y corte explosivo · Pase picado al lado del aro",
    m: { at: { "3": S.alaI, "6": [19.8, 1.4], "1": S.cabeza, "7": [17.8, 7.5], "2": S.alaD, "8": [19.8, 13.6], "4": [27.0, 8.6] }, balones: ["3", "6"],
      pasos: [{ pase: ["3", "1"] }, { m: [bota("1", [20.0, 9.8]), corre("2", [20.4, 13.0], [25.4, 9.2])] }, { pase: ["1", "2"] }, { tiro: "2" }, { rebote: "4" }, { pase: ["4", "6"] }] } },
  { t: "Tiro 45: nueve puntos, triple y media distancia (contra un récord)", cat: "Tiro", j: 8, bal: "2 balones por canasta", video: "45 point shooting drill basketball", et: ["tiro", "competición", "9 puntos"],
    obj: "Tiro de 3 y tiro tras finta en 9 puntos · Competir contra una marca",
    d: "Medio equipo en cada canasta. En cada uno de los 9 puntos del arco (desde una esquina hasta la otra): un triple y, tras finta de tiro, un bote hacia dentro y tiro de media distancia. El rebotador coge el triple y le pasa; tras la media distancia, el tirador pasa a rebotear para el siguiente. Triple = 3 puntos, media = 2 (máximo 45). Quien no llega a la marca del equipo hace una penalización breve.",
    corr: "La finta vende el tiro (balón arriba y mirada al aro) · Un solo bote fuerte · Mismo gesto de tiro en los 9 puntos",
    m: { conos: [[26.6, 1.4], [23.4, 1.8], [21.2, 3.4], [19.9, 5.4], [19.6, 7.5], [19.9, 9.6], [21.2, 11.6], [23.4, 13.2], [26.6, 13.6]], at: { "1": [26.6, 1.4], "2": [26.4, 6.4], "3": [24.4, 2.6] }, balon: "2",
      pasos: [{ pase: ["2", "1"] }, { tiro: "1" }, { rebote: "2" }, { pase: ["2", "1"] }, { m: [bota("1", [25.2, 3.0])] }, { tiro: "1" }] } },
  { t: "Tiro Knicks: dos triples, sprint a medio campo y triple cansado", cat: "Tiro", j: 12, bal: "2 balones por grupo", video: "Knicks shooting drill sprint", et: ["tiro", "fatiga", "transición"],
    obj: "Tirar de 3 cansado y en transición, como en los finales de cuarto",
    d: "Grupos de tres por canasta (un tirador y dos pasadores con balón bajo el aro). El tirador tira dos triples seguidos desde la esquina; tras el segundo, sprint hasta el medio campo y vuelta a la esquina para recibir y tirar otro triple, y así hasta cinco triples por puesto. Luego pasa al ala y repite. Se cuentan canastas; se rota el tirador. Con 4 grupos (dos por canasta) trabaja todo el equipo.",
    corr: "Volver a la esquina pisando la línea y frenar antes de recibir · Mismos pies de tiro aunque llegues cansado · Pases puntuales para no romper el ritmo",
    m: { at: { "1": S.esqD, "2": [26.4, 8.6], "3": [26.4, 9.8] }, balones: ["2", "3"],
      pasos: [{ pase: ["2", "1"] }, { tiro: "1" }, { pase: ["3", "1"] }, { tiro: "1" }, { m: [corre("1", [14.6, 13.6], [26.8, 13.8])], rebote: "2" }, { pase: ["2", "1"] }, { tiro: "1" }] } },
  { t: "Tiro en transición: 3 carriles, esquinas y trailer", cat: "Tiro", j: 10, bal: "3 balones", video: "full court transition shooting drill trailer", et: ["tiro", "transición", "toda la pista", "trailer"],
    obj: "Correr los carriles y tirar en transición desde la esquina y como trailer",
    d: "Cuatro filas en un fondo: el base en el centro con balón, dos aleros en las bandas y el trailer detrás. Los aleros corren hasta las esquinas del otro lado, el base sube botando y pasa a una esquina para tirar de 3; el trailer llega por detrás a la cabeza y recibe un segundo balón de un pasador que espera bajo el aro. Los tiradores cogen su rebote y vuelven por las bandas a la fila contraria. Continuo durante 4-5 minutos.",
    corr: "Los aleros llegan a la esquina antes que el balón · El trailer llega a la cabeza en el momento del primer tiro · El base pasa sin parar el bote",
    m: { vista: "completa", at: { "1": [3, 7.5], "2": [3, 2], "3": [3, 13], "4": [1, 9.6], "5": [26.6, 8.6] }, balones: ["1", "5"],
      pasos: [{ m: [bota("1", [18, 7.5]), corre("2", [18, 1.4], [27, 1]), corre("3", [18, 13.6], [27, 14]), corre("4", [14, 9.6])] }, { pase: ["1", "2"] }, { tiro: "2", m: [corre("4", [19.8, 8.4])] }, { pase: ["5", "4"] }, { tiro: "4" }] } },
  { t: "Tiro tras bloqueo directo en 3 filas (base, bloqueador y esquina)", cat: "Tiro", j: 9, bal: "3 balones", video: "pick and roll shooting drill 3 lines", et: ["tiro", "bloqueo directo", "3 filas", "lectura"],
    obj: "Las tres lecturas del directo sin defensa y a máxima velocidad: tiro tras bote, abrirse (pop) y pase a la esquina",
    d: "Tres filas: bases en la cabeza (con balón), bloqueadores en el codo y tiradores en la esquina del lado contrario. El bloqueador pone el directo y el base sale botando hacia el codo; el entrenador grita la lectura: tiro tras bote, pase al bloqueador que se abre a la línea de 3 o pase a la esquina (que se desliza a la línea de visión). Cada uno coge su rebote y pasa a la fila siguiente (base → bloqueador → esquina → base).",
    corr: "El base espera a que el bloqueo esté puesto · Salir pegado al bloqueador · El que se abre lo hace detrás de la línea, con los pies preparados · La esquina se desplaza a la vista del pasador",
    m: { at: { "1": S.cabeza, "4": [17.8, 7.5], "5": [22.4, 9.6], "8": [22.6, 11.0], "3": S.esqI, "6": [27.6, 0.4] }, balones: ["1", "4"],
      pasos: [{ m: [bloq("5", [20.4, 8.4])] }, { m: [bota("1", [21.0, 10.0], [22.8, 10.6]), corre("5", [19.8, 5.4]), corre("3", [25.4, 1.4])] }, { pase: ["1", "3"] }, { tiro: "3" }] } },
  { t: "Tiro en rueda de mano a mano (DHO en cadena)", cat: "Tiro", j: 8, bal: "2 balones", video: "dribble handoff shooting drill", et: ["tiro", "mano a mano", "rueda"],
    obj: "Recibir la entrega pegado al que entrega y tirar o atacar · Encadenar entregas",
    d: "Filas en la cabeza (con balón), en las dos alas y un rebotador. La cabeza bota hacia el ala derecha y entrega en mano a mano; el receptor sale pegado y tira tras bote o finaliza. El que entrega se queda en el ala y el siguiente de la cabeza va hacia el otro lado. Rebote del tirador, pase al siguiente de la cabeza y a la fila del ala contraria. Variante: el receptor rechaza la entrega y corta por la espalda.",
    corr: "Entregar a la altura de la cadera y bloquear con el cuerpo · El receptor sale rozando el hombro del que entrega · Leer: si su defensor pasa por debajo, tiro",
    m: { at: { "1": S.cabeza, "4": [17.8, 7.5], "2": S.alaD, "6": [19.8, 13.6], "3": S.alaI, "5": [26.6, 7.5] }, balones: ["1", "4"],
      pasos: [{ m: [bota("1", [20.4, 10.6]), corre("2", [21.6, 11.8])] }, { mano: ["1", "2"] }, { m: [bota("2", [22.8, 10.0])] }, { tiro: "2", m: [bota("4", [20.4, 4.4]), corre("3", [21.6, 3.2])] }, { mano: ["4", "3"] }] } },
  { t: "Tiro con cierre en 3 filas (el pasador cierra al tirador)", cat: "Tiro", j: 9, bal: "4 balones", video: "shooting closeout drill 3 lines", et: ["tiro", "cierres", "3 filas"],
    obj: "Tirar con un cierre encima y cerrar bien: dos trabajos en uno",
    d: "Una fila de pasadores bajo el aro con balón y dos filas de tiradores en las alas. Dos pasadores pasan a la vez, uno a cada ala, y salen a cerrarles con la mano arriba (sin tocar ni saltar). Los aleros tiran por encima del cierre o, si el cierre llega encima, finta y un bote de ataque. Rotación: el pasador pasa a la fila de tiradores, el tirador coge su rebote y va a la fila de pasadores.",
    corr: "Cierre: sprint y pasos cortos al final, mano arriba al lado del tiro · Tirador: no mirar al defensor, mirar el aro · Si el cierre llega muy encima, finta y bote",
    m: { at: { "1": [26.4, 8.4], "4": [26.4, 6.6], "7": [27.4, 7.5], "2": S.alaD, "5": [19.8, 13.6], "3": S.alaI, "6": [19.8, 1.4] }, balones: ["1", "4"],
      pasos: [{ pases: [["1", "2"], ["4", "3"]], m: [corre("1", [22.2, 11.4]), corre("4", [22.2, 3.6])] }, { tiros: ["2", "3"] }] } },
  { t: "Tiro en estrella con 5 filas y 2 balones (pasa y sigue)", cat: "Tiro", j: 10, bal: "2 balones", video: "5 spot passing shooting drill", et: ["tiro", "5 filas", "calentamiento"],
    obj: "Tiro de 3 desde los 5 puntos con todos moviéndose",
    d: "Una fila en cada uno de los 5 puntos (esquinas, alas y cabeza) y dos balones. Dos pases a la vez al punto siguiente (en sentido contrario al reloj): el receptor tira, coge su rebote y se va a la fila siguiente; el pasador sigue su pase y ocupa el sitio del tirador. Cuando se llega a 10 canastas, cambia el sentido.",
    corr: "Pase y carrera inmediata · Recibir girado hacia el aro · Rebote sin que el balón toque dos veces el suelo",
    m: { at: { "1": S.esqI, "2": S.alaI, "3": S.cabeza, "4": S.alaD, "5": S.esqD, "6": [27.6, 0.4], "8": [17.8, 7.5], "10": [27.6, 14.6] }, balones: ["1", "3"],
      pasos: [{ pases: [["1", "2"], ["3", "4"]] }, { tiros: ["2", "4"], m: [corre("1", [21.4, 2.2]), corre("3", [21.4, 12.8])] }] } },
  { t: "Penetrar y doblar en cadena con 4 filas (dos lados a la vez)", cat: "Tiro", j: 8, bal: "2 balones", video: "drive and kick shooting drill 4 lines", et: ["tiro", "drive and kick", "4 filas"],
    obj: "Penetrar por la línea de fondo, ver al que se desplaza y tirar tras el pase de la penetración",
    d: "Cuatro filas: alas y esquinas de los dos lados, con balón en las alas. A la vez en los dos lados, el ala penetra por la línea de fondo y el de la esquina sube unos pasos (se desplaza a la línea de visión) para recibir y tirar. El tirador coge el rebote y va a la fila del ala, el que penetra a la esquina. Variante: el de la esquina corta por detrás hacia el aro en vez de subir.",
    corr: "Penetrar con intención de anotar · Pase con una mano, sin recoger el balón · El de la esquina llega quieto antes del pase",
    m: { at: { "1": S.alaD, "5": [19.8, 13.6], "2": S.esqD, "6": [27.6, 14.6], "3": S.alaI, "7": [19.8, 1.4], "4": S.esqI, "8": [27.6, 0.4] }, balones: ["1", "3"],
      pasos: [{ m: [bota("1", [23.8, 11.2], [25.2, 10.4]), bota("3", [23.8, 3.8], [25.2, 4.6]), corre("2", [24.4, 13.8]), corre("4", [24.4, 1.2])] }, { pases: [["1", "2"], ["3", "4"]] }, { tiros: ["2", "4"] }] } },
  // ---------------------------------------------------------------- DEFENSA
  { t: "Sobrecarga 4c3: rotar con cada pase (scramble)", cat: "Defensa", j: 7, bal: "1 balón", video: "4 on 3 overload defense drill", et: ["defensa", "rotaciones", "inferioridad", "cierres"], ed: ADULTOS,
    obj: "Defender en inferioridad: cerrar al balón, ayudar y rotar al más peligroso",
    d: "Cuatro atacantes en el perímetro (dos alas y dos esquinas) contra tres defensores. Con cada pase, el defensor más cercano cierra al balón y los otros dos se colocan en ayuda; se permite el pase por encima (skip) y penetrar dentro del espacio de cada uno. Primero casi estático, después en vivo hasta parada o canasta. Progresión: el ataque se mueve, intercambia posiciones y bloquea; luego se añade un cuarto defensor (5c4).",
    corr: "Moverse mientras el balón vuela · Cierre fuerte pero controlado · Hablar: quién va al balón y quién ayuda · El lado débil, siempre por debajo del balón",
    m: { at: { "1": S.alaD, "2": S.esqD, "3": S.alaI, "4": S.esqI }, df: { "1": [22.4, 10.8], "2": [25.4, 9.6], "3": [23.6, 5.4] }, defensa: "zonaLibre", balon: "1",
      pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { pase: ["3", "4"] }] } },
  { t: "4c4 sin pintura (el ataque puntúa si toca la zona)", cat: "Defensa", j: 9, bal: "1 balón", video: "no paint defense drill", et: ["defensa", "contención", "ayudas"], ed: MAYORES,
    obj: "Contener el bote y la línea de pase interior: que el balón no entre en la zona",
    d: "4c4 con el entrenador arriba dando el primer pase. El ataque gana un punto cada vez que el balón entra en la pintura (botando o con un pase); cambia la posesión tras punto, pérdida o rebote defensivo. Primero a 3. Variantes: un punto extra si un triple toca el aro; punto para el ataque si el defensor para el bote con las manos en lugar de con los pies.",
    corr: "Parar el bote con los pies, no con las manos · Ayudas por delante de la penetración · Negar el pase al poste por el lado del balón",
    m: { at: { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD }, entrenador: [17.6, 7.5], defensa: "individual", balon: "e",
      pasos: [{ pase: ["e", "2"] }, { m: [bota("2", [22.6, 10.6], [23.8, 9.6])] }, { pase: ["2", "4"] }, { m: [bota("4", [26.4, 11.6])] }] } },
  { t: "Cierre 1c1 en dos filas: el compañero pasa desde el aro", cat: "Defensa", j: 8, bal: "2 balones", video: "1 on 1 closeout drill two lines", et: ["defensa", "cierres", "1c1"], ed: MAYORES,
    obj: "Cerrar, defender el 1c1 y cerrar el rebote",
    d: "Dos defensores bajo el aro con balón y dos filas de atacantes en las alas. Uno de los defensores pasa al ala y su compañero cierra a ese atacante: sprint, mano arriba, cortar la penetración y, tras el tiro, cerrar el rebote. Progresión: primero el atacante no puede jugar hasta que el defensor le toca la mano; después juega en cuanto recibe. El que no consigue parar se queda defendiendo.",
    corr: "Sprint los primeros pasos y frenar con pasos cortos · Mano arriba y pies orientados para cortar la penetración · Tras el tiro, contacto y rebote",
    m: { at: { "1": S.alaD, "3": [19.8, 13.6], "2": S.alaI, "4": [19.8, 1.4] }, df: { "1": [26.4, 8.2], "2": [26.4, 6.8] }, balones: ["d2"], defensa: "ninguna",
      pasos: [{ pase: ["d2", "1"], m: [corre("d1", [22.2, 11.6])] }, { m: [bota("1", [23.6, 12.8], [25.6, 10.8]), corre("d1", [24.4, 12.0], [25.8, 10.2])] }, { tiro: "1" }] } },
  { t: "Hombre en el agujero: un defensor contra tres atacantes seguidos", cat: "Defensa", j: 8, bal: "1 balón por carril", video: "man in the hole defensive drill", et: ["defensa", "1c1", "toda la pista", "contención"], ed: MAYORES,
    obj: "Contener el bote en toda la pista y recuperar cuando te superan",
    d: "Pista dividida en 3-4 carriles. En cada carril, un defensor (el del agujero) y tres atacantes repartidos a lo largo. El primero ataca al defensor en toda la pista; al llegar donde está el segundo, le entrega el balón en mano a mano y este ataca de vuelta al defensor hacia el tercero. El defensor defiende tres veces seguidas y sale; entra el siguiente. Si le superan, se gira, corre a cortar el bote y vuelve a defender desde donde le ganaron.",
    corr: "Parar el balón primero · Paso de empuje y sprint si te superan · No cruzar los pies en los cambios de dirección",
    m: { vista: "completa", at: { "2": [1, 3], "4": [12, 3], "3": [24, 3] }, df: { "1": [2.4, 3.4] }, balon: "2", defensa: "ninguna",
      pasos: [{ m: [bota("2", [6, 4.4], [11, 3.2]), corre("d1", [6.8, 4.0], [10.2, 3.0])] }, { mano: ["2", "4"] }, { m: [bota("4", [17, 1.8], [22.6, 3.4]), corre("d1", [17.6, 2.4], [21.6, 3.0])] }, { mano: ["4", "3"] }] } },
  { t: "1c1 que se convierte en 3c3 en toda la pista", cat: "Defensa", j: 8, bal: "1 balón", video: "1 on 1 to 3 on 3 full court defense drill", et: ["defensa", "toda la pista", "3c3", "ayudas"], ed: MAYORES,
    obj: "Contener el balón en toda la pista y defender la ventaja que llega al medio campo",
    d: "Un atacante con balón y su defensor en un fondo; en el otro medio campo, dos parejas atacante-defensor. El atacante intenta superar a su defensor; al cruzar el medio campo se juega 3c3 en vivo. La defensa solo puede conceder un tiro y nunca una bandeja. Tras cada posesión cambian los papeles y el balón vuelve al fondo. Variante: los ganadores se quedan.",
    corr: "El defensor del balón no deja ir en línea recta · Los del lado del balón niegan el pase · Ayudar y recuperar; ayuda desde el lado, no desde arriba",
    m: { vista: "completa", at: { "2": [2, 7.5], "1": [20, 3], "3": [20, 12] }, df: { "2": [3.4, 7.5] }, balon: "2", defensa: "individual",
      pasos: [{ m: [bota("2", [8, 4], [13, 10])], dm: [["2", [9, 5], [14, 9.4]]] }, { m: [bota("2", [19, 8]), corre("1", [22, 2.4]), corre("3", [22.6, 12.6])], dm: [["2", [20.2, 8.0]]] }, { pase: ["2", "3"] }] } },
  { t: "Shell con intercambios: pasar y cambiar de sitio", cat: "Defensa", j: 8, bal: "1 balón", video: "shell drill interchange", et: ["defensa", "shell", "cortes", "saltar al balón"], ed: MAYORES,
    obj: "Defender cortes e intercambios sin perder la posición de ayuda",
    d: "Shell 4c4 en el perímetro. A la voz de 'intercambio', el que pasa corta hacia el aro y se va a la esquina contraria, y el de la esquina sube a ocupar su sitio. El defensor del que corta salta hacia el balón (no le deja pasar por delante) y le acompaña por debajo; el defensor del que sube niega la recepción. Después se juega en vivo.",
    corr: "Saltar al balón en cuanto sale el pase · El cortador pasa por tu espalda, nunca por delante · Ver balón y jugador en todo momento",
    m: { at: { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD }, defensa: "individual", balon: "1",
      pasos: [{ pase: ["1", "2"] }, { m: [corre("1", [24.4, 6.6], [26.8, 1.6]), corre("3", [24.4, 2.8], [19.8, 4.8])] }, { pase: ["2", "3"] }] } },
  { t: "Shell: bloqueo hacia abajo en el lado débil (entrenador en el codo)", cat: "Defensa", j: 9, bal: "1 balón", video: "shell drill down screen defense", et: ["defensa", "shell", "bloqueo indirecto"], ed: ADULTOS,
    obj: "Defender el bloqueo hacia abajo lejos del balón: perseguir y ayudar",
    d: "Cuatro atacantes y cuatro defensores, el entrenador con el balón arriba. En el lado débil, el ala baja a bloquear al que está en el poste bajo, que sube al ala. El defensor del bloqueador se queda un instante en la línea del corte (ayuda) y el del cortador persigue pegado. El entrenador pasa al que sale del bloqueo y se juega en vivo cuando la defensa lo hace bien.",
    corr: "Avisar el bloqueo ('¡bloqueo!') · Perseguir por el lado del balón · El defensor del bloqueador da un paso hacia el corte y vuelve",
    m: { at: { "1": S.alaD, "2": S.esqD, "3": S.alaI, "4": [25.4, 5.0] }, entrenador: S.cabeza, defensa: "individual", balon: "e",
      pasos: [{ m: [bloq("3", [24.2, 4.2])] }, { m: [corre("4", [24.8, 3.4], [21.2, 2.6])] }, { pase: ["e", "4"] }] } },
  { t: "Shell: bloqueo de espaldas con 'portero' (proteger el aro)", cat: "Defensa", j: 9, bal: "1 balón", video: "shell drill back screen defense", et: ["defensa", "shell", "bloqueo de espaldas"], ed: ADULTOS,
    obj: "Defender el bloqueo de espaldas: que el corte no llegue al aro",
    d: "Cuatro atacantes y cuatro defensores; el entrenador recibe en el codo. El del poste bajo del lado débil sube a poner un bloqueo de espaldas al del codo contrario, que corta hacia el aro. El defensor más bajo del lado débil hace de 'portero': protege el aro hasta que el defensor del cortador se recupera y luego cierra a su jugador, que se ha abierto.",
    corr: "El defensor del cortador se pone del lado del balón antes del bloqueo · El portero, en la línea del corte · Recuperar y cerrar en cuanto el cortador está cubierto",
    m: { at: { "1": S.alaD, "2": S.alaI, "3": [25.6, 5.4], "4": S.codoI }, entrenador: S.codoD, defensa: "individual", balon: "e",
      pasos: [{ m: [bloq("3", [23.6, 6.2])] }, { m: [corre("4", [24.4, 6.8], [26.0, 7.4]), corre("3", [23.0, 4.4])], dm: [["2", [25.6, 6.8]]] }, { pase: ["e", "3"], dm: [["2", [22.0, 3.4]]] }] } },
  { t: "2 sprints, 2 amagos y en vivo (2c2 con el entrenador)", cat: "Defensa", j: 6, bal: "1 balón", video: "2 sprints 2 stunts defensive drill", et: ["defensa", "cierres", "stunt", "2c2"], ed: MAYORES,
    obj: "Cerrar y volver a la ayuda con cada pase · Amagar ayuda (stunt) y recuperar",
    d: "2c2 con el entrenador arriba. El entrenador pasa a un ala: su defensor cierra ('¡balón!') y el otro corre a la ayuda ('¡ayuda!'). Pase al otro ala: se invierten los papeles. Después, el que tiene el balón bota hacia el defensor de ayuda, que amaga salir (stunt) y vuelve cuando sale el pase. Tras cuatro pases bien defendidos se juega 2c2 en vivo. Si la defensa para, sigue defendiendo; si no habla, no corre o le anotan, sale.",
    corr: "Hablar en cada pase · Sprint a la ayuda, no andar · Amago corto (un paso) y volver con las manos arriba",
    m: { at: { "1": S.alaD, "2": S.alaI }, df: { "1": [24.0, 8.6], "2": [24.0, 6.4] }, entrenador: S.cabeza, defensa: "ninguna", balon: "e",
      pasos: [{ pase: ["e", "1"], m: [corre("d1", [22.0, 11.6]), corre("d2", [23.6, 6.8])] }, { pase: ["1", "2"], m: [corre("d2", [22.0, 3.4]), corre("d1", [23.6, 8.2])] }, { m: [bota("2", [21.6, 5.2]), corre("d1", [22.6, 7.0])] }, { pase: ["2", "1"], m: [corre("d1", [22.0, 11.6]), corre("d2", [23.6, 6.8])] }] } },
  { t: "Cierres a la posición de ayuda (3c3 sin bote)", cat: "Defensa", j: 6, bal: "1 balón", video: "3 line closeout help position drill", et: ["defensa", "posición de ayuda", "cierres", "3c3"], ed: MAYORES,
    obj: "Que cada defensor cierre al sitio correcto aunque su jugador no reciba",
    d: "Los tres defensores empiezan bajo el aro. El ataque se pasa el balón sin botar entre la cabeza y las alas; con cada pase, cada defensor sprinta al sitio que le toca: el del balón, encima; el que está a un pase, negando; el del lado débil, en la línea media. Se rota para que todos pasen por todos los puestos. Después se permite botar y se juega en vivo.",
    corr: "Sprint y pasos cortos al final, también hacia la ayuda · La ayuda, en la línea media (entre el balón y el aro) · Hablar: '¡balón!', '¡ayuda!'",
    m: { at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI }, df: { "1": [26.6, 7.5], "2": [26.6, 8.6], "3": [26.6, 6.4] }, defensa: "individual", balon: "2",
      pasos: [{ pase: ["2", "1"] }, { pase: ["1", "3"] }] } },
  { t: "Cierres en cadena y en vivo (3c3, defensores bajo el aro)", cat: "Defensa", j: 6, bal: "1 balón", video: "Arico closeout drill 3 on 3", et: ["defensa", "cierres", "3c3", "competición"], ed: MAYORES,
    obj: "Encadenar cierres con cada pase y pasar a jugar sin pausa",
    d: "Tres atacantes en la cabeza y las alas; tres defensores bajo el aro. El primer defensor da el balón a la cabeza y cierra; la cabeza pasa a un ala y el mismo defensor vuelve a cerrar; el balón vuelve a la cabeza y cierra el segundo defensor, y así hasta que los tres están emparejados: entonces 3c3 en vivo hasta canasta o parada. Por equipos, 5-7 posesiones cada uno; el que pierde paga.",
    corr: "Cerrar al balón y volver a la ayuda sin pararse · Pasos cortos al final de cada cierre · Comunicar quién se queda con quién",
    m: { at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI }, df: { "1": [26.4, 7.5], "2": [26.6, 8.8], "3": [26.6, 6.2] }, balones: ["d1"], defensa: "ninguna",
      pasos: [{ pase: ["d1", "1"], m: [corre("d1", [20.6, 7.5])] }, { pase: ["1", "2"], m: [corre("d1", [22.0, 11.6])] }, { pase: ["2", "1"], m: [corre("d2", [20.6, 7.8])] }, { pase: ["1", "3"], m: [corre("d3", [22.0, 3.4]), corre("d1", [23.4, 9.0])] }] } },
  { t: "4c3+1: cierre, ayuda en la línea de fondo y rotación", cat: "Defensa", j: 8, bal: "1 balón", video: "Bartzokas close out rotation drill", et: ["defensa", "rotaciones", "línea de fondo", "inferioridad"], ed: ADULTOS,
    obj: "Cierre que manda a la línea de fondo, ayuda que para la penetración y rotación del tercero",
    d: "Cuatro atacantes (cabeza, dos alas y una esquina) contra tres defensores más un cuarto que entra. Pase a la cabeza y luego al ala: su defensor cierra y le manda a la línea de fondo, el defensor bajo sale a parar la penetración y el de la cabeza baja a colocarse entre la esquina y el ala contraria (ayuda al que ayuda). Si el balón sale a la esquina, rota él. Tras dos transiciones se cambian los papeles. Idea del entrenador griego Giorgos Bartzokas.",
    corr: "El cierre manda hacia la línea de fondo, donde está la ayuda · La ayuda llega antes que el atacante, fuera de la zona · El tercero rota al más cercano al aro",
    m: { at: { "1": S.cabeza, "3": S.alaD, "4": S.esqD, "2": S.alaI }, df: { "2": [23.6, 6.0], "3": [24.4, 8.8], "1": [22.6, 7.8] }, balones: ["d2"], defensa: "ninguna",
      pasos: [{ pase: ["d2", "1"], m: [corre("d2", [20.6, 7.2])] }, { pase: ["1", "3"], m: [corre("d3", [22.0, 11.4]), corre("d2", [22.0, 5.2])] }, { m: [bota("3", [24.0, 13.2], [25.6, 12.2]), corre("d3", [24.6, 12.6]), corre("d1", [25.8, 10.6])] }, { pase: ["3", "4"], m: [corre("d1", [26.4, 12.8]), corre("d2", [25.0, 8.6])] }] } },
  { t: "Triple cierre: un defensor contra tres pases", cat: "Defensa", j: 4, bal: "1 balón", video: "triple closeout drill", et: ["defensa", "cierres", "condición"], ed: MAYORES,
    obj: "Cierres repetidos con buena técnica aunque llegue el cansancio",
    d: "Tres atacantes (ala, cabeza y ala) y un defensor bajo el aro. El balón va de un ala a la cabeza y de la cabeza al otro ala; el defensor cierra al receptor en cada pase. Al tercer cierre, el atacante juega 1c1 en vivo. El defensor repite tres veces y rota.",
    corr: "Cada cierre igual que el primero: sprint, pasos cortos, mano arriba · No adelantarse al pase · En el 1c1 final, sin falta",
    m: { at: { "1": S.alaI, "2": S.cabeza, "3": S.alaD }, df: { "1": [25.8, 7.5] }, defensa: "zonaLibre", balon: "1",
      pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { m: [bota("3", [23.6, 12.6], [25.6, 10.6])] }] } },
  { t: "3c3 negación y puerta atrás (sin bote)", cat: "Defensa", j: 6, bal: "1 balón", video: "deny defense backdoor drill 3 on 3", et: ["defensa", "negación", "puerta atrás", "3c3"], ed: MAYORES,
    obj: "Negar la línea de pase sin que te ganen la espalda",
    d: "3c3 sin bote: el ataque solo puede pasar y cortar. La defensa niega todos los pases cercanos (brazo y pie en la línea); cuando el atacante corta por la espalda, el defensor gira la cabeza hacia el balón, abre y le acompaña. Canasta tras puerta atrás vale doble para el ataque; cada intercepción, un punto para la defensa.",
    corr: "Ver balón y jugador (no darle la espalda al balón) · Si corta por detrás, girar hacia el balón y seguirle · No negar tan lejos que te gane la espalda",
    m: { at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI }, defensa: "individual", balon: "1",
      pasos: [{ m: [corre("2", [20.4, 12.0], [25.4, 9.4])] }, { pase: ["1", "2"] }, { tiro: "2" }] } },
];
const equipo: EjercicioSemilla[] = EQUIPO.map((x) => ej({
  titulo: x.t, categoria: x.cat, edades: x.ed ?? MAYORES, duracion: 12, jugadores: x.j, material: x.bal, objetivos: x.obj,
  descripcion: x.d, correcciones: x.corr, etiquetas: x.et, video: yt(x.video), montaje: x.m,
}));

export const GENERADOS: EjercicioSemilla[] = (() => {
  const todos = [...juegoReducido, ...pnr, ...indirectos, ...tiroMov, ...finalizaciones, ...shell, ...rebote, ...transicion, ...presion, ...zona, ...interior, ...unoContraUno, ...pase, ...fisico, ...calentamiento,
    ...bote, ...defensa, ...pasesEsp, ...tiroLibre, ...reboteExt, ...equipo];
  const vistos = new Set<string>();
  return todos.filter((e) => !vistos.has(e.titulo) && vistos.add(e.titulo));
})();
