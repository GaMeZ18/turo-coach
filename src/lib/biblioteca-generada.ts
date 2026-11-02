// Biblioteca del CB Turó · ampliación grande (sobre todo sénior): ejercicios por familias, con variantes que cambian
// de verdad el trabajo (la defensa que hay que leer, la regla del juego, el formato o la acción).
// Cada ejercicio trae su pizarra y un enlace a vídeos de entrenadores que trabajan lo mismo.
import type { EjercicioSemilla } from "./biblioteca-semilla";
import { yt } from "./biblioteca-sistemas";

type P = [number, number];
type Montaje = EjercicioSemilla["montaje"];

// ---------------------------------------------------------------------------- posiciones (media pista)
const ARO: P = [26.4, 7.5];
const S = {
  cabeza: [19.4, 7.5] as P, alaD: [21, 12.4] as P, alaI: [21, 2.6] as P, esqD: [27, 14] as P, esqI: [27, 1] as P,
  posteD: [25.6, 9.6] as P, posteI: [25.6, 5.4] as P, codoD: [22.6, 9.4] as P, codoI: [22.6, 5.6] as P,
  baseD: [19.6, 10] as P, baseI: [19.6, 5] as P, tl: [22.2, 7.5] as P, medio: [14.6, 7.5] as P,
};
/** Defensor colocado entre su atacante y el aro */
const dfDe = (p: P, d = 1.1): P => {
  const vx = ARO[0] - p[0], vy = ARO[1] - p[1], n = Math.hypot(vx, vy) || 1;
  return [Math.round((p[0] + (vx / n) * d) * 10) / 10, Math.round((p[1] + (vy / n) * d) * 10) / 10];
};
const hacia = (p: P, q: P, f: number): P => [Math.round((p[0] + (q[0] - p[0]) * f) * 10) / 10, Math.round((p[1] + (q[1] - p[1]) * f) * 10) / 10];

const ADULTOS = ["Junior", "Sénior"];
const MAYORES = ["Cadete", "Junior", "Sénior"];
const SENIOR = ["Sénior"];
const DESDE_INF = ["Infantil", "Cadete", "Junior", "Sénior"];

type Base = Omit<EjercicioSemilla, "tipo">;
/** Quita de la pizarra los pasos que mencionan a jugadores que no están en la pista */
const sano = (m: Montaje): Montaje => {
  const at = m.at ?? {}, df = m.df ?? {};
  const existe = (k: string) => k in at || k in df || (k[0] === "d" && k.slice(1) in df);
  return { ...m, pasos: (m.pasos ?? []).map((p) => ({
    ...(p.m ? { m: p.m.filter(([q]) => existe(q)) } : {}),
    ...(p.pase && existe(p.pase[0]) && existe(p.pase[1]) ? { pase: p.pase } : {}),
    ...(p.mano && existe(p.mano[0]) && existe(p.mano[1]) ? { mano: p.mano } : {}),
    ...(p.tiro && existe(p.tiro) ? { tiro: p.tiro } : {}),
  })).filter((p) => (p.m?.length ?? 0) > 0 || p.pase || p.mano || p.tiro) };
};
const ej = (e: Base): EjercicioSemilla => ({ tipo: "ejercicio", ...e, montaje: sano(e.montaje) });
const unir = (...x: (string | false | undefined | null)[]) => x.filter(Boolean).join(" ");

// ============================================================================
// A) JUEGO REDUCIDO CON REGLAS QUE OBLIGAN A ROTAR (3c3, 4c4, 5c5, media y toda la pista)
// ============================================================================
type Formato = {
  clave: string; nombre: string; jugadores: number; poste: boolean; todaPista: boolean; duracion: number;
  montaje: Montaje; organizacion: string; video: string;
};
const F3 = { "1": S.cabeza, "2": S.alaD, "3": S.alaI };
const F3P = { "1": S.alaD, "2": S.alaI, "5": S.posteD };
const F4 = { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD };
const F4P = { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "5": S.posteD };
const F5 = { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqI, "5": S.posteD };
const conDf = (at: Record<string, P>) => Object.fromEntries(Object.entries(at).map(([k, p]) => [k, dfDe(p)]));
const FORMATOS: Formato[] = [
  { clave: "3c3", nombre: "3c3 abiertos", jugadores: 6, poste: false, todaPista: false, duracion: 12, video: "3 on 3 basketball drill rules",
    organizacion: "3c3 en media pista con los tres atacantes abiertos (cabeza y alas), sin interior fijo.",
    montaje: { at: F3, df: conDf(F3), balon: "1", pasos: [{ pase: ["1", "2"], m: [["1", "correr", [24.6, 8.4], [21, 5.6]], ["3", "correr", [20, 6.8]]] }] } },
  { clave: "3c3p", nombre: "3c3 con poste", jugadores: 6, poste: true, todaPista: false, duracion: 12, video: "3 on 3 post play drill basketball",
    organizacion: "3c3 en media pista: dos exteriores en las alas y un interior en el poste bajo.",
    montaje: { at: F3P, df: conDf(F3P), balon: "1", pasos: [{ pase: ["1", "5"], m: [["1", "correr", [23.6, 11.8]]] }] } },
  { clave: "4c4", nombre: "4c4 abiertos", jugadores: 8, poste: false, todaPista: false, duracion: 15, video: "4 on 4 advantage disadvantage drill",
    organizacion: "4c4 en media pista con cuatro abiertos (dos arriba y dos esquinas).",
    montaje: { at: F4, df: conDf(F4), balon: "1", pasos: [{ pase: ["1", "2"], m: [["1", "correr", [24.4, 6.4], [26.4, 3]], ["3", "correr", [21, 2.6]]] }] } },
  { clave: "4c4p", nombre: "4c4 con poste", jugadores: 8, poste: true, todaPista: false, duracion: 15, video: "4 on 4 basketball drill post",
    organizacion: "4c4 en media pista: tres exteriores (cabeza y alas) y un interior que se mueve por el lado del balón.",
    montaje: { at: F4P, df: conDf(F4P), balon: "1", pasos: [{ pase: ["1", "2"], m: [["5", "correr", [25.6, 10.2]]] }, { pase: ["2", "5"] }] } },
  { clave: "5c5", nombre: "5c5 media pista", jugadores: 10, poste: true, todaPista: false, duracion: 15, video: "5 on 5 basketball drill constraints",
    organizacion: "5c5 en media pista, ataque libre del equipo.",
    montaje: { at: F5, df: conDf(F5), balon: "1", pasos: [{ pase: ["1", "3"] }, { pase: ["3", "4"], m: [["5", "correr", [25.6, 5.6]]] }] } },
  { clave: "3c3t", nombre: "3c3 toda la pista (continuo)", jugadores: 9, poste: false, todaPista: true, duracion: 15, video: "3 on 3 continuous full court drill",
    organizacion: "3c3 en toda la pista con tres equipos: el que ataca y anota se queda a defender en esa canasta y ataca el siguiente equipo que espera.",
    montaje: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 2.5], "3": [8, 12.5] }, df: { "1": [15, 7.5], "2": [17, 4], "3": [17, 11] }, balon: "1", pasos: [{ m: [["1", "botar", [18, 7.5]], ["2", "correr", [21, 2.6]], ["3", "correr", [21, 12.4]]] }] } },
  { clave: "4c4t", nombre: "4c4 toda la pista", jugadores: 8, poste: false, todaPista: true, duracion: 15, video: "4 on 4 full court drill transition",
    organizacion: "4c4 en toda la pista: tras canasta, rebote o robo, transición inmediata hacia el otro aro sin parar.",
    montaje: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 2.5], "3": [8, 12.5], "4": [5, 9] }, df: { "1": [14, 7.5], "2": [18, 4], "3": [18, 11], "4": [22, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [18.6, 7.5]], ["2", "correr", [21, 2.6]], ["3", "correr", [21, 12.4]], ["4", "correr", [19, 9.6]]] }] } },
  { clave: "5c5t", nombre: "5c5 toda la pista", jugadores: 10, poste: true, todaPista: true, duracion: 20, video: "5 on 5 full court scrimmage rules",
    organizacion: "5c5 en toda la pista, partido con la regla del ejercicio.",
    montaje: { vista: "completa", at: { "1": [10, 7.5], "2": [10, 2.5], "3": [10, 12.5], "4": [7, 5], "5": [7, 10] }, df: { "1": [15, 7.5], "2": [19, 4], "3": [19, 11], "4": [22, 6], "5": [23, 9] }, balon: "1", pasos: [{ m: [["1", "botar", [19, 7.5]], ["2", "correr", [27, 1]], ["3", "correr", [27, 14]], ["5", "correr", [25.6, 9.6]], ["4", "correr", [21, 5]]] }] } },
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

const juegoReducido: EjercicioSemilla[] = [];
for (const f of FORMATOS) for (const r of REGLAS) {
  if (r.vale && !r.vale(f)) continue;
  juegoReducido.push(ej({
    titulo: `${f.nombre}: ${r.titulo}`, categoria: "Juego reducido", edades: r.edades ?? (f.jugadores >= 8 ? ADULTOS : MAYORES),
    duracion: f.duracion, jugadores: f.jugadores, material: `1 balón${f.jugadores >= 8 ? ", petos" : ""}`, objetivos: r.objetivo,
    descripcion: unir(f.organizacion, "Regla:", r.regla, f.todaPista ? "Se juega a 3-4 minutos o a canastas, con rotación de equipos." : "Series de 4-5 minutos; ataque y defensa cambian cada 3 posesiones o tras canasta."),
    correcciones: r.correcciones, etiquetas: [f.clave, ...r.etiquetas, f.todaPista ? "toda la pista" : "media pista"],
    video: yt(r.video ?? `${f.video} ${r.etiquetas[0]}`), montaje: f.montaje,
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
for (const cob of COBERTURAS) for (const fm of PNR_FORMATOS) {
  pnr.push(ej({
    titulo: `Defender el directo con ${cob.nombre}: ${fm.nombre}`, categoria: "Defensa", edades: fm.edades, duracion: 12, jugadores: fm.jugadores, material: "1 balón",
    objetivos: `Ejecutar la cobertura «${cob.ing.split(" ")[0]}» con sus ayudas y recuperaciones`,
    descripcion: unir("El ataque juega bloqueos directos centrales y laterales.", fm.extra, "La defensa trabaja:", cob.defensa, "Primero el ataque a medio ritmo para fijar posiciones y comunicación; luego en vivo, contando paradas defensivas. 4 posesiones por grupo."),
    correcciones: cob.defCorr, etiquetas: ["defensa del bloqueo directo", "pick and roll", cob.clave, fm.clave, "coberturas"],
    video: yt(`${cob.ing} defense drill`), montaje: pnrMontaje(fm, PNR_LUGARES[0], cob),
  }));
}

// ============================================================================
// C) BLOQUEOS SIN BALÓN: CADA ACCIÓN CONTRA CADA DEFENSA
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
  const at: Record<string, P> = { "2": b.cortador, "4": b.bloqueador, "1": S.cabeza.join() === b.cortador.join() ? S.alaI : S.cabeza };
  const df: Record<string, P> = { "2": dfDe(b.cortador, 0.8), "4": dfDe(b.bloqueador, 0.8), ...(fm.c === "3c3" ? { "1": dfDe(at["1"]) } : {}) };
  indirectos.push(ej({
    titulo: `${b.nombre[0].toUpperCase()}${b.nombre.slice(1)} contra ${d.nombre} (${fm.n})`, categoria: "Ataque", edades: ADULTOS, duracion: 10, jugadores: fm.j, material: "1 balón",
    objetivos: `Usar el ${b.nombre.split(" (")[0]} leyendo al defensor · ${d.lectura.split(".")[0]}`,
    descripcion: unir(b.desc, fm.extra, "La defensa juega así:", d.defensa, "Lectura del ataque:", d.lectura, "6 repeticiones por lado y cambio de roles."),
    correcciones: "Preparar el corte: llevar al defensor en dirección contraria antes de usar el bloqueo · Pasar hombro con hombro con el bloqueador · El bloqueador espera el contacto y luego sella o se abre · El pasador espera a que el cortador salga del bloqueo",
    etiquetas: ["bloqueo indirecto", b.clave, d.clave, fm.c, "sin balón"], video: yt(`${b.ing} reads drill`),
    montaje: { at, df, balon: "1", pasos: [{ m: [["4", "bloqueo", b.bloq]] }, { m: [["2", "correr", ...b.corte]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
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
for (const s of SALIDAS) for (const f of FINALES) {
  if (s.clave === "closeout" && f.clave === "cs") continue;
  tiroMov.push(ej({
    titulo: `Tiro: ${s.nombre} + ${f.nombre}`, categoria: "Tiro", edades: ADULTOS, duracion: 10, jugadores: 3, material: "2-3 balones",
    objetivos: `Tiro con ritmo de partido tras ${s.nombre} · ${f.nombre}`,
    descripcion: unir(s.desc, "Final:", f.desc, "Series de 1 minuto por lado o de 10 canastas; el pasador recoge el rebote y cambia de rol. Variante competitiva: contar canastas y comparar con el récord del equipo."),
    correcciones: f.corr, etiquetas: ["tiro", s.clave, f.clave, "tiro en movimiento"], video: yt(s.ing),
    montaje: { at: s.at, balon: s.clave === "dho" ? "5" : s.at["1"] ? "1" : Object.keys(s.at)[0], pasos: s.pasos },
  }));
}
// Series de tiro de equipo con formato competitivo
type SerieTiro = { titulo: string; desc: string; corr: string; jug: number; mont: Montaje; video: string; et: string[] };
const SERIES_TIRO: SerieTiro[] = [
  { titulo: "Tiro en 3 filas con rotación (pasa, tira y cambia)", desc: "Tres filas: cabeza, ala y esquina, con dos balones. Pase de la cabeza al ala, del ala a la esquina para tirar; el tirador coge su rebote y va a la fila de la cabeza. Rotación continua.", corr: "Pase al bolsillo de tiro del compañero · Pies preparados al recibir · Rebote propio rápido", jug: 6, video: "3 line shooting drill rotation", et: ["rueda", "tiro de 3"], mont: { at: { "1": S.cabeza, "2": S.alaD, "3": S.esqD }, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "3"] }, { tiro: "3" }] } },
  { titulo: "Tiro en estrella (5 puntos y 2 balones)", desc: "Cinco puntos alrededor del arco (esquinas, alas y cabeza). El tirador recorre los 5 puntos recibiendo de dos pasadores alternos: sale de un punto, recibe en el siguiente y tira.", corr: "Correr entre puntos a velocidad de partido · Girar hacia el pasador antes de recibir · Mismo gesto en los 5 puntos", jug: 3, video: "star shooting drill 5 spots", et: ["5 puntos", "tiro de 3"], mont: { at: { "2": S.esqI, "1": S.tl, "3": S.tl }, balon: "1", pasos: [{ m: [["2", "correr", [21, 2.6]]] }, { pase: ["1", "2"] }, { tiro: "2" }] } },
  { titulo: "Tiro contra reloj: 1 minuto desde 5 puntos", desc: "Un minuto por tirador, con un reboteador-pasador: tiros desde 5 puntos, cambiando de punto tras cada canasta. Se anota la cifra de cada jugador cada semana.", corr: "Ritmo alto sin perder la mecánica · Pedir el balón con las manos · Pase del reboteador rápido y al pecho", jug: 2, video: "1 minute shooting drill", et: ["contra reloj", "competición"], mont: { at: { "2": S.alaD, "1": [24.6, 8.6] }, balon: "1", pasos: [{ pase: ["1", "2"] }, { tiro: "2" }] } },
  { titulo: "Tiro por parejas con cierre (shoot & closeout)", desc: "Por parejas con un balón: A pasa a B y corre a cerrarle (sin tocar); B tira. B coge su rebote, pasa a A y le cierra. 2 minutos y se cuentan canastas.", corr: "Cierre con pasos cortos al final y la mano arriba · Tirar a pesar del cierre · Rebote y pase rápido", jug: 2, video: "partner shooting closeout drill", et: ["por parejas", "cierres"], mont: { at: { "1": S.tl, "2": S.alaD }, df: { "1": hacia(S.tl, S.alaD, 0.6) }, balon: "1", pasos: [{ pase: ["1", "2"], m: [["1", "correr", hacia(S.tl, S.alaD, 0.75)]] }, { tiro: "2" }] } },
  { titulo: "Tiro 'gana el que antes llegue a 10'", desc: "Dos grupos de 3 en dos canastas: tiran desde el mismo punto, el que anota cambia de punto. Primer grupo en llegar a 10 canastas gana; el que pierde hace una carrera.", corr: "Competir sin perder la técnica · Rebote y pase sin pausa · Comunicación del grupo", jug: 6, video: "competitive team shooting drill", et: ["competición", "grupos"], mont: { at: { "1": [24.6, 8.6], "2": S.alaD, "3": S.alaI }, balon: "1", pasos: [{ pase: ["1", "2"] }, { tiro: "2" }] } },
  { titulo: "Tiro en transición de esquina a esquina (11 hombres de tiro)", desc: "Tiradores salen en carriles desde el fondo contrario; el base recibe de un pasador, sube botando y pasa a la esquina para tirar de 3. El tirador coge el rebote y sale hacia el otro aro. Continuo.", corr: "Correr hasta la esquina, pisando la línea de fondo · Girar hacia el balón en los últimos pasos · Tiro con las caderas de cara al aro", jug: 6, video: "transition corner three drill", et: ["transición", "esquina", "tiro de 3"], mont: { vista: "completa", at: { "1": [8, 7.5], "2": [8, 1.5] }, balon: "1", pasos: [{ m: [["1", "botar", [18, 7.5]], ["2", "correr", [18, 1.2], [27, 1]]] }, { pase: ["1", "2"] }, { tiro: "2" }] } },
];
for (const s of SERIES_TIRO) for (const v of [
  { suf: "", extra: "" },
  { suf: " (con presión de defensor)", extra: "Variante con un defensor que cierra a cada tirador con la mano arriba (sin tapar)." },
  { suf: " (tras ejercicio físico)", extra: "Variante con fatiga: antes de cada serie, una carrera de ida y vuelta para tirar cansados, como en el último cuarto." },
]) tiroMov.push(ej({
  titulo: s.titulo + v.suf, categoria: "Tiro", edades: MAYORES, duracion: 10, jugadores: s.jug, material: "2-3 balones",
  objetivos: "Volumen de tiro con ritmo y competición", descripcion: unir(s.desc, v.extra), correcciones: s.corr,
  etiquetas: ["tiro", ...s.et], video: yt(s.video), montaje: s.mont,
}));

// ============================================================================
// E) FINALIZACIONES CONTRA AYUDAS Y CON ROTACIONES
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
type Sit = { clave: string; nombre: string; desc: string; at: Record<string, P>; df: Record<string, P>; pasos: NonNullable<Montaje>["pasos"]; jug: number };
const SITUACIONES_FIN: Sit[] = [
  { clave: "ayuda", nombre: "contra ayuda del lado débil", desc: "El atacante penetra desde el ala y un defensor sale del lado débil a ayudar en el último momento.", jug: 2,
    at: { "1": S.alaD }, df: { "4": [25.2, 4.4] }, pasos: [{ m: [["1", "botar", [23.6, 10.4], [25.4, 8.6]], ["d4", "correr", [25.6, 7.4]]] }, { tiro: "1" }] },
  { clave: "drop", nombre: "contra el pívot que espera atrás", desc: "Tras salir de un bloqueo directo, el atacante se encuentra al pívot defensor esperando en la pintura.", jug: 3,
    at: { "1": S.cabeza, "5": [20.4, 8.6] }, df: { "5": [23.6, 8] }, pasos: [{ m: [["1", "botar", [21, 10], [23.4, 9.2]]] }, { tiro: "1" }] },
  { clave: "contacto", nombre: "con contacto en transición", desc: "En transición 1c1, un defensor persigue al que bota y le da contacto con un escudo en el último paso.", jug: 2,
    at: { "1": [16, 9] }, df: { "1": [15, 10.4] }, pasos: [{ m: [["1", "botar", [22, 9], [25.4, 8.4]], ["d1", "correr", [24.6, 9.4]]] }, { tiro: "1" }] },
  { clave: "corte", nombre: "tras corte desde la esquina (línea de fondo)", desc: "El jugador de la esquina corta por la línea de fondo al ver la penetración y recibe para finalizar contra el defensor que rota.", jug: 3,
    at: { "1": S.alaI, "2": S.esqD }, df: { "5": [25, 8.6] }, pasos: [{ m: [["1", "botar", [23.4, 4.4], [24.6, 6]], ["2", "correr", [27.4, 11], [26.6, 9]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
  { clave: "2c1", nombre: "en 2c1 contra el defensor que duda", desc: "Dos atacantes contra un defensor que protege el aro: el que bota ataca y decide entre finalizar o pasar.", jug: 3,
    at: { "1": [17, 9], "2": [17, 4] }, df: { "1": [23.6, 7.5] }, pasos: [{ m: [["1", "botar", [23.4, 9]], ["2", "correr", [25.4, 4.6]]] }, { tiro: "1" }] },
];
const finalizaciones: EjercicioSemilla[] = [];
for (const f of FINALIZACIONES) for (const s of SITUACIONES_FIN) finalizaciones.push(ej({
  titulo: `Finalización: ${f.nombre} ${s.nombre}`, categoria: "Tiro", edades: ADULTOS, duracion: 10, jugadores: s.jug + 2, material: "2 balones, escudo de contacto",
  objetivos: `Dominar la ${f.nombre} en situación real (${s.nombre})`,
  descripcion: unir(s.desc, "Técnica a usar:", f.tec, "Primero sin oposición (5 por lado), después con el defensor real. Se cuentan canastas por serie de 10."),
  correcciones: "Leer al defensor antes del último bote · Proteger el balón con el cuerpo y el brazo libre · Terminar arriba y suave, a tabla si hay ángulo · Seguir la jugada al rebote si falla",
  etiquetas: ["finalización", f.clave, s.clave], video: yt(f.ing), montaje: { at: s.at, df: s.df, balon: "1", pasos: s.pasos },
}));

// ============================================================================
// F) DEFENSA: SHELL, CIERRES Y ROTACIONES
// ============================================================================
type Shell = { clave: string; nombre: string; ing: string; desc: string; corr: string; pasos: NonNullable<Montaje>["pasos"]; balon?: string };
const SHELL: Shell[] = [
  { clave: "pase", nombre: "desplazamientos con cada pase", ing: "shell drill basic", desc: "El ataque pasa el balón alrededor (sin penetrar). Cada defensor ajusta su posición con cada pase: presión al balón, negación a un pase, ayuda en el lado débil.", corr: "Moverse mientras el balón está en el aire · Ver balón y atacante (triángulo) · Hablar: 'balón', 'ayuda', 'niego'", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }] },
  { clave: "penetra", nombre: "ayuda y recuperación ante penetración", ing: "shell drill help and recover", desc: "El atacante con balón penetra; el defensor de ayuda frena (stunt o ayuda completa) y recupera cuando el balón sale.", corr: "Ayudar con el cuerpo, no con las manos · Recuperar con pasos cortos y la mano arriba · El siguiente defensor rota si la ayuda se queda", balon: "2", pasos: [{ m: [["2", "botar", [23.6, 10.4]]] }, { pase: ["2", "4"] }] },
  { clave: "poste", nombre: "defender el pase al poste", ing: "post defense shell drill", desc: "El ataque pasa al poste (o lo intenta). La defensa niega el poste por delante o por detrás según la posición del balón y ayuda tras el pase interior (doble o caída).", corr: "Negar por el lado del balón (3/4 por delante) · Tras pase al poste, caer a la línea de pase de vuelta · Doble defensa solo si está pactada", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }] },
  { clave: "skip", nombre: "cierres tras pase por encima", ing: "skip pass closeout shell", desc: "El ataque hace pases de lado a lado por encima (skip). El defensor del lado débil tiene que cerrar desde la ayuda a su jugador.", corr: "Salir con el pase, no después · Cierre con pasos cortos al final · Mano arriba al lado del tiro", balon: "2", pasos: [{ pase: ["2", "3"] }] },
  { clave: "indirecto", nombre: "defender bloqueos indirectos", ing: "shell drill screens", desc: "El ataque pone bloqueos indirectos lejos del balón; la defensa trabaja perseguir, pasar por debajo o cambiar, con comunicación.", corr: "Avisar el bloqueo antes de que llegue · El defensor del bloqueador ayuda un instante (show) · Pasar pegados al cortador", pasos: [{ m: [["4", "bloqueo", [24.2, 11]], ["2", "correr", [25.4, 11.4], [21.4, 12.6]]] }] },
  { clave: "directo", nombre: "defender el bloqueo directo con rotación", ing: "pick and roll defense shell rotation", desc: "El ataque juega un bloqueo directo; la defensa ejecuta la cobertura y el lado débil rota al que continúa (tag) y luego al tirador libre (X-out).", corr: "El tag del lado débil, al que continúa · Rotaciones 'del fondo a la esquina' · Recuperar al más peligroso", pasos: [{ m: [["5", "bloqueo", [20.4, 8.6]], ["1", "botar", [21, 10.2]]] }] },
  { clave: "xout", nombre: "rotación en X (X-out) tras pase", ing: "x out rotation drill", desc: "Tras una ayuda, el balón sale al lado débil: los defensores del lado débil cambian de jugador en X (el de arriba baja, el de abajo sube) para no llegar tarde.", corr: "El que está más cerca del pase va al balón · Hablar el cambio · Cierre controlado, sin saltar", balon: "2", pasos: [{ pase: ["2", "3"] }, { pase: ["3", "4"] }] },
  { clave: "mano", nombre: "defender el mano a mano", ing: "defend dribble handoff", desc: "El ataque hace manos a manos en el perímetro; la defensa practica pasar por encima, adelantarse (top) o cambiar.", corr: "El defensor del receptor se anticipa a la entrega · El del que entrega se pone pegado (no dejar el pase al aro) · Hablar", pasos: [{ m: [["1", "botar", [20.4, 10.8]]] }, { mano: ["1", "2"] }] },
];
const shell: EjercicioSemilla[] = [];
for (const s of SHELL) for (const fmt of [
  { c: "4c4", j: 8, at: { "1": S.baseI, "2": S.baseD, "3": S.esqI, "4": S.esqD } as Record<string, P> },
  { c: "5c5", j: 10, at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI, "4": S.esqD, "5": S.posteI } as Record<string, P> },
]) for (const fase of [{ suf: "a medio ritmo", d: "Primero a medio ritmo, el entrenador para el juego para corregir posiciones." }, { suf: "en vivo", d: "En vivo: tras 4 pases el ataque puede atacar y se juega hasta canasta o rebote defensivo." }]) {
  shell.push(ej({
    titulo: `Shell ${fmt.c}: ${s.nombre} (${fase.suf})`, categoria: "Defensa", edades: ADULTOS, duracion: 12, jugadores: fmt.j, material: "1 balón",
    objetivos: `Defensa de equipo: ${s.nombre}`, descripcion: unir(`${fmt.c} en media pista.`, s.desc, fase.d),
    correcciones: s.corr, etiquetas: ["shell", "defensa de equipo", s.clave, fmt.c, "rotaciones"], video: yt(s.ing),
    montaje: { at: fmt.at, df: conDf(fmt.at), balon: s.balon ?? "1", pasos: s.pasos },
  }));
}
const CIERRES = [
  { t: "Cierres 1c1 desde la pintura", d: "El defensor en la pintura pasa al atacante del ala y cierra; el atacante juega 1c1 con 2 botes como máximo." },
  { t: "Cierres en la esquina contra la línea de fondo", d: "Cierre al jugador de la esquina negando la línea de fondo: el defensor llega con los pies orientados hacia el centro." },
  { t: "Cierre y caída: 2c2 desde la ayuda", d: "Dos defensores en la pintura; el entrenador pasa a uno de los dos atacantes abiertos y su defensor cierra mientras el otro hace la ayuda." },
  { t: "Cierre largo tras skip (3c3)", d: "El balón cambia de lado por encima y el defensor del lado débil cierra desde la línea de fondo hasta el ala contraria." },
  { t: "Cierre con tapón de atrás (contest)", d: "El defensor llega tarde a propósito y practica molestar el tiro con la mano sin saltar al cuerpo." },
  { t: "Cierres en cadena (rueda de 4)", d: "Cuatro atacantes en el arco y dos defensores: cada pase obliga a un cierre del defensor más cercano, sin parar." },
];
for (const c of CIERRES) for (const v of [{ s: "", e: "" }, { s: " (con penalización por falta)", e: "Si el defensor hace falta o salta al tirador, vuelve a la pintura y repite." }]) shell.push(ej({
  titulo: c.t + v.s, categoria: "Defensa", edades: MAYORES, duracion: 10, jugadores: 4, material: "2 balones",
  objetivos: "Cerrar al tirador sin ser superado · Pasos cortos y mano arriba",
  descripcion: unir(c.d, v.e, "Series de 6 cierres por jugador."),
  correcciones: "Sprint los primeros pasos y pasos cortos al final · Mano arriba al lado de la mano de tiro · Pies orientados para cortar la penetración · No saltar", etiquetas: ["cierres", "close out", "defensa"],
  video: yt("closeout drill basketball"), montaje: { at: { "2": S.alaD, "1": S.cabeza }, df: { "2": [25, 8.6] }, balon: "1", pasos: [{ pase: ["1", "2"], m: [["d2", "correr", [22, 11.4]]] }, { m: [["2", "botar", [23.6, 10.6]]] }] },
}));

// ============================================================================
// G) REBOTE
// ============================================================================
const REBOTE = [
  { t: "Rebote 1c1 tras tiro del entrenador (cerrar y salir)", f: "1c1", j: 2, d: "El entrenador tira; el defensor cierra el rebote con contacto y el atacante intenta ganarlo. El que gana sale con el balón al ala (salida de rebote).", at: { "2": S.alaD }, df: { "2": [23.4, 10.6] } },
  { t: "Rebote 2c2 desde el lado débil", f: "2c2", j: 4, d: "Dos atacantes en el lado débil (ala y esquina) y sus defensores en posición de ayuda. Tras el tiro del entrenador, cierre del rebote desde la ayuda (más lejos, más difícil).", at: { "2": S.alaI, "3": S.esqI }, df: { "2": [23, 5.6], "3": [25.2, 4.6] } },
  { t: "Rebote 3c3 con atacantes en movimiento", f: "3c3", j: 6, d: "Los atacantes se mueven (cortes, cruces) hasta que el entrenador tira. La defensa tiene que localizar, contactar y cerrar mientras el atacante se mueve.", at: { "1": S.cabeza, "2": S.alaD, "3": S.alaI }, df: conDf({ "1": S.cabeza, "2": S.alaD, "3": S.alaI }) },
  { t: "Rebote 4c4 (shell) tras tiro y transición", f: "4c4", j: 8, d: "Shell 4c4; tras 4 pases, tiro. La defensa cierra el rebote y sale en transición a la otra canasta (4c4 toda la pista).", at: F4, df: conDf(F4) },
  { t: "Rebote 5c5 con puntos por rebote", f: "5c5", j: 10, d: "5c5 media pista: cada rebote ofensivo suma 1 punto al ataque y cada rebote defensivo + salida limpia suma 1 a la defensa.", at: F5, df: conDf(F5) },
  { t: "Guerra de rebote 3 contra 3 en la pintura", f: "3c3", j: 6, d: "Tres contra tres dentro de la zona; el entrenador tira y se juega el rebote hasta canasta (2 puntos por canasta tras rebote ofensivo). El que no gana, sale.", at: { "1": S.posteD, "2": S.posteI, "3": S.tl }, df: { "1": [25.4, 9], "2": [25.4, 6], "3": [23.6, 7.5] } },
];
const rebote: EjercicioSemilla[] = [];
for (const r of REBOTE) for (const v of [
  { s: "", e: "", c: "Contactar primero (pie y antebrazo) y luego buscar el balón · Bajar el centro de gravedad · Coger el balón con las dos manos y protegerlo en la barbilla" },
  { s: " · rebote ofensivo", e: "El foco está en el ataque: tiene que ganar la posición por dentro con pasos de rodeo (swim, spin) y palmear si no puede coger.", c: "Ir al rebote desde el lado débil · Esquivar el contacto con pasos de rodeo · Palmear el balón si no se puede coger" },
  { s: " · salida de rebote", e: "Tras ganar el rebote defensivo, salida inmediata: pase de salida al base en el ala (outlet) en menos de 2 segundos.", c: "Pivotar hacia fuera tras el rebote · Pase de salida por encima de la cabeza · El base se abre a la banda a recibir" },
]) rebote.push(ej({
  titulo: r.t + v.s, categoria: "Rebote", edades: MAYORES, duracion: 10, jugadores: r.j, material: "1 balón",
  objetivos: "Ganar el rebote con contacto y posición", descripcion: unir(r.d, v.e, "Series de 6 tiros por grupo."),
  correcciones: v.c, etiquetas: ["rebote", r.f, v.s ? v.s.replace(" · ", "") : "cerrar el rebote"],
  video: yt(`${r.f} rebounding drill box out`), montaje: { at: r.at as Record<string, P>, df: r.df as Record<string, P>, entrenador: [22.4, 7.5], balones: [], pasos: [] },
}));

// ============================================================================
// H) TRANSICIÓN
// ============================================================================
const TRANS = [
  { t: "2c1 continuo (ida y vuelta)", j: 5, d: "Dos atacantes contra un defensor; tras canasta o rebote, el defensor y el que ha anotado salen 2c1 al otro aro contra un nuevo defensor que espera.", ing: "2 on 1 continuous drill" },
  { t: "3c2 → 2c1 (continuo)", j: 5, d: "Tres atacantes contra dos defensores; al acabar, los dos defensores atacan 2c1 hacia el otro aro contra el atacante que ha tirado.", ing: "3 on 2 2 on 1 drill" },
  { t: "4c3 con defensor que llega tarde", j: 8, d: "Cuatro atacantes contra tres defensores; el cuarto defensor sale tarde (toca la línea de fondo) y tiene que incorporarse.", ing: "4 on 3 transition drill" },
  { t: "5c4 y 5c5 (el último defensor entra tarde)", j: 10, d: "Cinco contra cuatro con el quinto defensor entrando tras tocar la línea de medio campo: el ataque tiene que atacar rápido la superioridad.", ing: "5 on 4 transition drill" },
  { t: "Transición de 11 jugadores (11-man break)", j: 11, d: "Tres atacantes contra dos defensores; quien coge el rebote o la canasta saca rápido a dos compañeros en las alas y atacan el otro aro contra los dos que esperan allí.", ing: "11 man break drill" },
  { t: "3c3 tras saque de fondo rápido", j: 6, d: "Tras canasta, el equipo que ha recibido saca rápido y ataca 3c3 en toda la pista, buscando ventaja antes de que la defensa se coloque.", ing: "quick inbound transition drill" },
  { t: "Balance defensivo tras tiro (4c4 + 1)", j: 9, d: "Se juega 4c4 media pista; al tirar, el ataque tiene que mandar a dos al balance mientras un quinto atacante sale corriendo desde el fondo hacia el otro aro.", ing: "defensive transition balance drill" },
  { t: "Primer pase tras rebote en menos de 2 segundos", j: 6, d: "El entrenador tira, la defensa coge el rebote y tiene que hacer el pase de salida al base en la banda en menos de 2 segundos; los aleros corren los carriles.", ing: "outlet pass fast break drill" },
];
const transicion: EjercicioSemilla[] = [];
for (const t of TRANS) for (const v of [
  { s: "", e: "", c: "Correr los carriles anchos · El balón por el centro · Atacar el aro antes de que se coloque la defensa" },
  { s: " · con límite de 5 segundos", e: "El ataque tiene 5 segundos para tirar desde que cruza el medio campo.", c: "Decidir rápido · El primer pase hacia delante · No botar si hay un compañero por delante" },
  { s: " · defensa en inferioridad", e: "El foco está en la defensa: frenar el balón, proteger el aro y ganar tiempo con fintas de ayuda hasta que lleguen los compañeros.", c: "El primero protege el aro, el segundo frena el balón · Fintas de ayuda para que el ataque dude · Hablar" },
  { s: " · solo pase (sin bote)", e: "No se puede botar hasta el último bote para finalizar: el balón avanza solo con pases.", c: "Pases por delante del receptor · Correr sin balón · Pase picado para terminar" },
]) transicion.push(ej({
  titulo: t.t + v.s, categoria: "Transición", edades: MAYORES, duracion: 12, jugadores: t.j, material: "2 balones",
  objetivos: "Transición rápida y eficaz (ataque y defensa)", descripcion: unir(t.d, v.e, "Series de 4 minutos."),
  correcciones: v.c, etiquetas: ["transición", "toda la pista", v.s ? v.s.replace(" · ", "") : "contraataque"], video: yt(t.ing),
  montaje: { vista: "completa", at: { "1": [9, 7.5], "2": [9, 2.5], "3": [9, 12.5] }, df: { "1": [21, 7.5], "2": [24.4, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [19.4, 7.5]], ["2", "correr", [23, 2.4]], ["3", "correr", [23, 12.6]], ["d1", "correr", [20.4, 7.5]]] }, { pase: ["1", "3"] }, { tiro: "3" }] },
}));

// ============================================================================
// I) PRESIÓN DE TODA LA PISTA (defenderla y atacarla)
// ============================================================================
const PRESIONES = [
  { c: "221", n: "2-2-1", ing: "2-2-1 press", d: "Dos defensores arriba dejan pasar el primer pase a la banda y hacen trampa en la línea de banda; el resto cierra las líneas de pase cercanas y el último protege el aro." },
  { c: "1211", n: "1-2-1-1", ing: "1-2-1-1 press", d: "Un defensor molesta al sacador, dos hacen la trampa tras el primer pase a la esquina, el central intercepta el pase de vuelta al medio y el último protege el aro." },
  { c: "131", n: "1-3-1 de medio campo", ing: "1-3-1 half court trap", d: "Trampa al cruzar el medio campo en las esquinas de la pista (banda y medio campo), con el central anticipando el pase al medio." },
  { c: "runjump", n: "run and jump", ing: "run and jump press", d: "Cuando el que bota se acerca a otro defensor, este sale a por el balón por sorpresa (jump) y el defensor original cambia a su atacante libre (run)." },
  { c: "negar", n: "negación del primer pase (hombre a hombre)", ing: "deny inbound pass full court", d: "Defensa individual en toda la pista negando la recepción del saque y presionando al que bota hasta el medio campo." },
];
const presion: EjercicioSemilla[] = [];
for (const p of PRESIONES) for (const fmt of [{ c: "3c3", j: 6 }, { c: "4c4", j: 8 }, { c: "5c5", j: 10 }]) for (const lado of ["defender", "atacar"]) {
  presion.push(ej({
    titulo: `${lado === "defender" ? "Presión" : "Superar la presión"} ${p.n} en ${fmt.c}`, categoria: lado === "defender" ? "Defensa" : "Transición", edades: ADULTOS, duracion: 12, jugadores: fmt.j, material: "1 balón",
    objetivos: lado === "defender" ? `Ejecutar la presión ${p.n}: trampas y rotaciones` : `Romper la presión ${p.n} con pases y ocupando el centro`,
    descripcion: lado === "defender"
      ? unir(`${fmt.c} en toda la pista tras saque de fondo.`, p.d, "Se cuenta si la defensa provoca pérdida o 8 segundos. 5 posesiones por equipo.")
      : unir(`${fmt.c} en toda la pista tras saque de fondo, contra la presión ${p.n}.`, "El ataque tiene que superar la presión con pases (no botar en las esquinas), ocupar el centro y atacar la superioridad al cruzar.", p.d),
    correcciones: lado === "defender" ? "Trampa sin falta: pies cerrando la salida y brazos arriba · Anticipar el pase de salida, no el balón · El último siempre protege el aro" : "Recibir encarado hacia el campo de ataque · Pasar antes de que se cierre la trampa · Siempre un pase de seguridad detrás · Tras romper, atacar sin parar",
    etiquetas: ["presión", p.c, fmt.c, "toda la pista", lado === "defender" ? "defensa" : "salida de presión"], video: yt(`${p.ing} ${lado === "defender" ? "drill" : "break"}`),
    montaje: { vista: "completa", at: { "1": [3, 4], "2": [3, 11], "4": [0.4, 8] }, df: { "1": [4.6, 5], "2": [4.6, 10] }, balon: "4", pasos: [{ pase: ["4", "1"] }, { m: [["d2", "correr", [4, 5.6]]] }, { pase: ["1", "2"] }] },
  }));
}

// ============================================================================
// J) ZONA: ATACARLA Y DEFENDERLA
// ============================================================================
const ZONAS = [
  { c: "23", n: "2-3", df: { "1": [21.2, 6.2], "2": [21.2, 8.8], "3": [24.4, 4.6], "4": [24.4, 10.4], "5": [25, 7.5] } },
  { c: "32", n: "3-2", df: { "1": [20.6, 7.5], "2": [21.8, 4], "3": [21.8, 11], "4": [24.8, 5.6], "5": [24.8, 9.4] } },
  { c: "131", n: "1-3-1", df: { "1": [20.4, 7.5], "2": [22.6, 3.6], "3": [22.6, 11.4], "5": [23.4, 7.5], "4": [26, 7.5] } },
  { c: "match", n: "zona de emparejamientos (match-up)", df: { "1": [20.6, 7.5], "2": [21.8, 3.8], "3": [21.8, 11.2], "4": [24.8, 5.6], "5": [24.8, 9.4] } },
];
const CONCEPTOS_ZONA = [
  { c: "hueco", n: "penetrar al hueco y pasar", d: "Cada receptor penetra al hueco entre dos defensores para fijarlos y pasa al compañero liberado." },
  { c: "postealto", n: "poste alto encarado", d: "Un atacante en el poste alto recibe, se encara y lee: tiro, pase al poste bajo o pase a la esquina." },
  { c: "skip", n: "pases por encima de la zona", d: "Pases rápidos de lado a lado por encima de la zona para que no llegue a desplazarse a tiempo." },
  { c: "fondo", n: "corredor de línea de fondo", d: "Un jugador corre la línea de fondo de esquina a esquina según el lado del balón, buscando la espalda de la zona." },
  { c: "bloqueo", n: "bloqueos a la zona", d: "Bloqueos indirectos a los defensores de la zona para liberar al tirador del lado débil." },
  { c: "rebote", n: "rebote contra zona", d: "Contra zona es más difícil cerrar el rebote: el ataque manda 3 jugadores al rebote desde el lado débil." },
];
const zona: EjercicioSemilla[] = [];
for (const z of ZONAS) for (const c of CONCEPTOS_ZONA) zona.push(ej({
  titulo: `Atacar la zona ${z.n}: ${c.n}`, categoria: "Ataque", edades: MAYORES, duracion: 12, jugadores: 10, material: "1 balón",
  objetivos: `Superar la zona ${z.n} con ${c.n}`, descripcion: unir(`5c5 media pista contra zona ${z.n}.`, c.d, "Primero contra la zona a medio ritmo, luego en vivo: 5 posesiones por equipo, contando tiros de calidad."),
  correcciones: "Colocarse en los huecos de la zona, no delante de los defensores · Pasar rápido y fintar antes de pasar · Recibir preparados para tirar · Rebote ofensivo desde el lado débil",
  etiquetas: ["ataque a zona", z.c, c.c], video: yt(`attack ${z.n.split(" ")[0]} zone ${c.c === "hueco" ? "gap" : c.c === "skip" ? "skip pass" : c.c}`),
  montaje: { at: { "1": S.baseI, "2": S.baseD, "3": S.alaI, "4": S.alaD, "5": S.posteD }, df: z.df as Record<string, P>, balon: "1", pasos: [{ pase: ["1", "2"] }, { pase: ["2", "4"] }, { tiro: "4" }] },
}));
for (const z of ZONAS) for (const s of [
  { c: "despl", n: "desplazamientos con cada pase", d: "El ataque pasa alrededor sin tirar; cada defensor ajusta su posición con cada pase y se corrigen huecos." },
  { c: "poste", n: "defender el poste alto y el poste corto", d: "El ataque mete balones al poste alto y al poste corto; la zona practica quién sale a cada uno y cómo se cierran las líneas." },
  { c: "esquina", n: "salir a la esquina y recuperar", d: "Balones a la esquina: practicar quién sale (el de abajo o el lateral) y las rotaciones que provoca." },
  { c: "rebote", n: "cerrar el rebote desde la zona", d: "Tras tiro, cada defensor de la zona busca al atacante más cercano a su zona y lo cierra." },
]) zona.push(ej({
  titulo: `Defensa en zona ${z.n}: ${s.n}`, categoria: "Defensa", edades: MAYORES, duracion: 12, jugadores: 10, material: "1 balón",
  objetivos: `Zona ${z.n}: ${s.n}`, descripcion: unir(`5c5 media pista, la defensa en zona ${z.n}.`, s.d, "Primero sin tirar, luego en vivo."),
  correcciones: "Manos arriba y activas · Moverse mientras el balón está en el aire · Hablar en cada pase · Cerrar el rebote buscando al más cercano",
  etiquetas: ["defensa en zona", z.c, s.c], video: yt(`${z.n.split(" ")[0]} zone defense drill`),
  montaje: { at: { "1": S.baseI, "2": S.baseD, "3": S.alaI, "4": S.alaD, "5": S.posteD }, df: z.df as Record<string, P>, balon: "1", pasos: [{ pase: ["1", "3"] }, { pase: ["3", "5"] }] },
}));

// ============================================================================
// K) JUEGO INTERIOR
// ============================================================================
const MOVS_POSTE = [
  { c: "drop", n: "paso atrás hacia el aro (drop step)", d: "Recibe de espaldas, siente al defensor y da un paso atrás largo hacia el aro por el lado libre, finalizando con las dos manos." },
  { c: "giro", n: "giro y tiro (turnaround)", d: "Recibe, gira sobre el pie de pivote para encararse y tira en suspensión a tabla." },
  { c: "gancho", n: "gancho", d: "Recibe, un bote hacia el centro y gancho con el brazo lejano al defensor." },
  { c: "updown", n: "finta y por debajo (up and under)", d: "Finta de tiro tras giro; cuando el defensor salta, paso cruzado por debajo y finalización." },
  { c: "cara", n: "de cara al aro (face up)", d: "Recibe en el poste, se encara y ataca con un bote largo o tira si el defensor se separa." },
  { c: "sello", n: "sellar y recibir alto-bajo", d: "Sella al defensor con el cuerpo y recibe el pase bombeado de un compañero en el poste alto." },
  { c: "doble", n: "salir del 2 contra 1 en el poste", d: "Recibe y llega un segundo defensor (doble). Tiene que pasar al compañero libre (que se recoloca) en menos de 2 segundos." },
  { c: "pase", n: "pasar desde el poste a los cortadores", d: "Recibe en el poste y lee los cortes de los exteriores (cruzándose) para dar el pase." },
];
const interior: EjercicioSemilla[] = [];
for (const m of MOVS_POSTE) for (const f of [{ c: "1c1", j: 3, e: "1c1 con un pasador en el ala." }, { c: "2c2", j: 4, e: "2c2 (interior y exterior con sus defensores): el exterior se mueve tras el pase." }, { c: "3c3", j: 6, e: "3c3 con dos exteriores: tras el pase al poste, los exteriores se cruzan o se relocalizan." }]) interior.push(ej({
  titulo: `Poste: ${m.n} (${f.c})`, categoria: "Ataque", edades: MAYORES, duracion: 10, jugadores: f.j, material: "2 balones",
  objetivos: `Recurso de poste bajo: ${m.n}`, descripcion: unir(f.e, m.d, "6 repeticiones por lado; primero defensa pasiva, luego activa."),
  correcciones: "Pedir con la mano lejana al defensor · Recibir con dos manos y el balón protegido en la barbilla · Leer al defensor antes de moverse · Pies anchos y equilibrio",
  etiquetas: ["juego interior", "poste", m.c, f.c], video: yt(`post move ${m.c === "drop" ? "drop step" : m.c === "giro" ? "turnaround" : m.c === "gancho" ? "hook shot" : m.c === "updown" ? "up and under" : m.c === "cara" ? "face up" : m.c === "sello" ? "seal high low" : m.c === "doble" ? "double team" : "passing"} drill`),
  montaje: { at: { "5": S.posteD, "2": S.alaD, ...(f.c === "3c3" ? { "3": S.alaI } : {}) }, df: { "5": [25, 9.2], ...(f.c !== "1c1" ? { "2": dfDe(S.alaD) } : {}) }, balon: "2", pasos: [{ pase: ["2", "5"] }, { m: [["5", "correr", [26, 8.4]]] }, { tiro: "5" }] },
}));

// ============================================================================
// L) 1c1 DESDE SITUACIONES DE PARTIDO
// ============================================================================
const SIT_1C1 = [
  { c: "ala", n: "tras recibir en el ala", d: "El atacante sale a recibir al ala y juega 1c1 con su defensor, que le niega." },
  { c: "cierre", n: "contra el cierre", d: "El defensor sale desde la pintura cuando el atacante recibe y el atacante ataca el cierre." },
  { c: "mano", n: "tras mano a mano", d: "El atacante recibe en mano a mano del entrenador y ataca con la ventaja de la entrega." },
  { c: "esquina", n: "desde la esquina", d: "1c1 desde la esquina: el defensor niega la línea de fondo y el atacante tiene poco espacio." },
  { c: "codo", n: "desde el codo", d: "1c1 desde el codo, encarado al aro: tiro, finta y penetración a ambos lados." },
  { c: "trans", n: "en transición (desde medio campo)", d: "1c1 desde medio campo con el defensor delante: hay que llegar al aro botando a velocidad." },
  { c: "persig", n: "con el defensor persiguiendo", d: "El atacante sale con ventaja y el defensor persigue desde atrás: finalizar sin que llegue el tapón." },
  { c: "poste", n: "desde el poste alto de espaldas", d: "El atacante recibe de espaldas en el poste alto, gira y ataca." },
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
  montaje: { at: { "1": s.c === "esquina" ? S.esqD : s.c === "codo" || s.c === "poste" ? S.codoD : s.c === "trans" ? [15, 7.5] : S.alaD }, df: { "1": dfDe(s.c === "esquina" ? S.esqD : s.c === "codo" || s.c === "poste" ? S.codoD : s.c === "trans" ? [15, 7.5] : S.alaD) }, balon: "1", pasos: [{ m: [["1", "botar", [24.6, 9.4]]] }, { tiro: "1" }] },
}));

// ============================================================================
// M) PASE Y LECTURA: PENETRAR Y PASAR
// ============================================================================
const PASE_FMT = [
  { c: "2c1", j: 3, n: "2c1 (penetrador y tirador)", d: "Penetración desde el ala con un tirador en la esquina y un defensor que tiene que elegir." },
  { c: "3c2", j: 5, n: "3c2 en media pista", d: "Tres atacantes contra dos defensores: penetrar, fijar y encontrar al libre." },
  { c: "4c3", j: 7, n: "4c3 en media pista", d: "Cuatro atacantes contra tres: la defensa rota y el ataque tiene que hacer el pase extra." },
  { c: "5c4", j: 9, n: "5c4 en media pista", d: "Cinco contra cuatro: con superioridad, el ataque busca siempre al libre." },
];
const PASE_REG = [
  { c: "base", n: "penetrar y sacar (drive and kick)", d: "Cada ataque empieza con una penetración y el pase de salida." },
  { c: "picado", n: "solo pase picado tras penetración", d: "El pase tras penetrar tiene que ser picado (más difícil de interceptar)." },
  { c: "extra", n: "pase extra obligatorio", d: "El primer receptor libre no puede tirar: tiene que hacer un pase más." },
  { c: "fondo", n: "pase al cortador de la línea de fondo", d: "El que está en la esquina corta por la línea de fondo al ver la penetración y es la primera opción de pase." },
  { c: "salto", n: "pase en salto prohibido", d: "No se permite pasar en el aire: hay que pasar con los pies en el suelo (parada en uno o dos tiempos)." },
];
const pase: EjercicioSemilla[] = [];
for (const f of PASE_FMT) for (const r of PASE_REG) pase.push(ej({
  titulo: `${f.n}: ${r.n}`, categoria: "Pase", edades: MAYORES, duracion: 10, jugadores: f.j, material: "2 balones",
  objetivos: "Fijar a la ayuda y encontrar al compañero libre · Pase en movimiento", descripcion: unir(f.d, r.d, "Series de 3 minutos; el que tira recoge el rebote y rota a defensa."),
  correcciones: "Penetrar con intención de anotar para que llegue la ayuda · Ver al defensor que ayuda, no al compañero · Pase al bolsillo de tiro · Los receptores se mueven a la línea de visión",
  etiquetas: ["pase", "drive and kick", f.c, r.c], video: yt(`${f.c.replace("c", " on ")} drive and kick drill`),
  montaje: { at: { "1": S.alaD, "2": S.esqD, ...(f.j >= 5 ? { "3": S.alaI } : {}), ...(f.j >= 7 ? { "4": S.esqI } : {}), ...(f.j >= 9 ? { "5": S.cabeza } : {}) }, df: { "2": [25.4, 11.4], ...(f.j >= 5 ? { "3": [24.6, 5.4] } : {}), ...(f.j >= 7 ? { "4": [25.6, 3] } : {}) }, balon: "1", pasos: [{ m: [["1", "botar", [23.6, 10.6], [25, 9.4]], ["d2", "correr", [25.8, 10]]] }, { pase: ["1", "2"] }, { tiro: "2" }] },
}));

// ============================================================================
// N) FÍSICO CON BALÓN (sénior) Y CALENTAMIENTOS
// ============================================================================
const FISICO = [
  { t: "Carrera de 17 (bandas) con tiro final", d: "Cruzar el ancho de la pista 17 veces en menos de 1 minuto y, sin descanso, 2 tiros libres." },
  { t: "Suicidas con entrada a canasta", d: "Carreras de ida y vuelta a las líneas (tiro libre, medio campo, tiro libre contrario y fondo) terminando cada vuelta con una entrada botando." },
  { t: "Desplazamientos defensivos en zigzag + cierre", d: "Desplazamiento lateral en zigzag por media pista y, al llegar al fondo, sprint a cerrar a un tirador." },
  { t: "Circuito de saltos y rebote", d: "Saltos continuos tocando el tablero (10), rebote del balón que lanza el entrenador y salida botando." },
  { t: "Sprint con balón y parada en un tiempo", d: "Sprints botando de 10 metros con parada en un tiempo, pivote y pase; 8 repeticiones." },
  { t: "Mikan continuo (30 segundos)", d: "Canastas alternas por ambos lados del aro sin que el balón toque el suelo durante 30 segundos; 4 series." },
  { t: "Tiro libre tras fatiga", d: "Carrera de ida y vuelta y 2 tiros libres seguidos, como en un final de partido; 10 series contando el porcentaje." },
  { t: "Ida y vuelta en 3 carriles con 3 pases", d: "Tres jugadores corren todo el campo con 3 pases máximo y entrada; vuelta inmediata. Tiempo objetivo por debajo de 10 segundos." },
  { t: "Lucha por el balón en el suelo y salida", d: "El entrenador lanza un balón al suelo, dos jugadores lo pelean y el que lo gana sale botando 1c1 a canasta." },
  { t: "Circuito de fuerza con balón medicinal y tiro", d: "Estaciones: lanzamiento de balón medicinal al pecho, sentadillas con balón y 5 tiros desde el ala en cada vuelta." },
];
const fisico: EjercicioSemilla[] = [];
for (const f of FISICO) for (const v of [{ s: "", e: "" }, { s: " (por equipos, competición)", e: "Por equipos: el equipo que termina antes (o con más canastas) gana; el que pierde, una repetición extra." }]) fisico.push(ej({
  titulo: f.t + v.s, categoria: "Físico", edades: ADULTOS, duracion: 8, jugadores: 6, material: "Balones",
  objetivos: "Condición física específica con balón", descripcion: unir(f.d, v.e), correcciones: "Mantener la técnica con fatiga · Recuperar entre series lo justo · Hidratación",
  etiquetas: ["físico", "condición", "con balón"], video: yt("basketball conditioning drills with ball"),
  montaje: { vista: "completa", at: { "1": [2, 7.5] }, balon: "1", pasos: [{ m: [["1", "botar", [14, 7.5], [25.6, 7]]] }, { tiro: "1" }] },
}));
const CALENT = [
  { t: "Calentamiento dinámico con 2 balones", d: "Bote con dos balones a lo largo de la pista con distintos ritmos (a la vez, alternos, alto y bajo) y entrada al final." },
  { t: "Tiro de calentamiento en forma de Mikan a tiro libre", d: "Progresión de cerca a lejos: Mikan, tiros a 2 metros, a 4 metros y tiros libres, 5 de cada." },
  { t: "Rueda de pases con dos balones y entrada", d: "Cuatro filas en las esquinas de media pista con dos balones; pase y sigue en cuadrado y, a la señal, entrada." },
  { t: "Calentamiento de movilidad + tiro de forma", d: "Movilidad de tobillos, caderas y hombros (5 minutos) seguida de tiro de forma con una mano cerca del aro." },
  { t: "3 carriles con pase y bandeja (calentamiento)", d: "Tres filas en el fondo: carrera a todo el campo pasando el balón y bandeja; vuelta por los carriles exteriores." },
  { t: "Bote de reacción por parejas", d: "Por parejas: uno bota y el otro le da señales (manos arriba = cambio, palmada = parada) para trabajar la vista arriba." },
  { t: "Pases en movimiento por parejas (5 tipos)", d: "Parejas desplazándose: pase de pecho, picado, de béisbol, por encima de la cabeza y con una mano, 2 idas y vueltas cada uno." },
  { t: "Tiro en estrella de calentamiento (sin defensa)", d: "Cinco puntos, dos tiros en cada uno y cambio; a ritmo suave para coger sensaciones." },
  { t: "Entradas con contacto suave (calentamiento)", d: "Fila de entradas con un compañero que da un pequeño contacto con el escudo en el aire." },
  { t: "1c1 de bote en un círculo (quitar el balón)", d: "Todos botando dentro del círculo central: hay que proteger el balón propio e intentar sacar el de los demás." },
];
const calentamiento: EjercicioSemilla[] = CALENT.map((c) => ej({
  titulo: c.t, categoria: "Calentamiento", edades: DESDE_INF, duracion: 8, jugadores: 8, material: "Balones",
  objetivos: "Activar el cuerpo y coger sensaciones con el balón", descripcion: c.d, correcciones: "Intensidad progresiva · Técnica correcta desde el primer minuto · Comunicación",
  etiquetas: ["calentamiento"], video: yt("basketball warm up drills team"),
  montaje: { at: { "1": [16, 12.5], "2": [16, 2.5] }, balon: "1", pasos: [{ m: [["1", "botar", [21, 11], [25.6, 9]]] }, { tiro: "1" }] },
}));

// ============================================================================
// O) BOTE AVANZADO (sénior): cada recurso en cada contexto
// ============================================================================
const RECURSOS_BOTE = [
  { c: "cruce", n: "cambio por delante (crossover)", ing: "crossover", t: "Cambio de mano por delante, bajo y rápido, con el hombro protegiendo." },
  { c: "piernas", n: "entre las piernas", ing: "between the legs", t: "Cambio entre las piernas con el paso adelantado, sin perder velocidad." },
  { c: "espalda", n: "por la espalda", ing: "behind the back", t: "Cambio por la espalda para mantener la dirección cuando el defensor corta el paso." },
  { c: "hesit", n: "amago de parada (hesitation)", ing: "hesitation dribble", t: "Frenar levantando la cabeza como para tirar o pasar y salir explosivo." },
  { c: "inout", n: "dentro-fuera (in and out)", ing: "in and out dribble", t: "Amago de cambio con la misma mano (el balón va hacia dentro y vuelve fuera)." },
  { c: "giro", n: "reverso (spin)", ing: "spin move", t: "Giro sobre el pie adelantado protegiendo el balón cuando el defensor se pega." },
  { c: "atras", n: "bote de retroceso (retreat dribble)", ing: "retreat dribble", t: "Dos botes hacia atrás para separarse de la presión o de una trampa y ver el pase." },
  { c: "snatch", n: "bote de recogida (snatch back)", ing: "snatch back dribble", t: "Bote hacia delante y recogida brusca hacia atrás para crear espacio para el tiro." },
  { c: "dos", n: "con dos balones", ing: "two ball dribbling", t: "Combinaciones con dos balones (a la vez, alternos, cruce de los dos) para la mano débil y la coordinación." },
];
const CONTEXTOS_BOTE = [
  { c: "estatico", n: "estático con cono", d: "Frente a un cono o silla, 30 segundos por mano y por recurso, a máxima velocidad sin perder el control.", at: { "1": S.alaD } as Record<string, P>, df: {} as Record<string, P>, j: 1 },
  { c: "presion", n: "contra presión en toda la pista", d: "1c1 en toda la pista: el defensor presiona y el atacante tiene que superar el medio campo usando el recurso.", at: { "1": [3, 7.5] } as Record<string, P>, df: { "1": [4.4, 7.5] } as Record<string, P>, j: 2 },
  { c: "cierre", n: "atacando el cierre", d: "El atacante recibe en el ala con un defensor que cierra y usa el recurso para superarle y finalizar.", at: { "1": S.alaD } as Record<string, P>, df: { "1": [23, 11] } as Record<string, P>, j: 2 },
  { c: "directo", n: "antes del bloqueo directo", d: "Usar el recurso para preparar al defensor antes de atacar el bloqueo directo (que el defensor quede atrapado).", at: { "1": S.cabeza, "5": [20.4, 8.6] } as Record<string, P>, df: { "1": [20.4, 7.4] } as Record<string, P>, j: 3 },
];
const bote: EjercicioSemilla[] = [];
for (const r of RECURSOS_BOTE) for (const c of CONTEXTOS_BOTE) {
  if (r.c === "dos" && c.c !== "estatico") continue;
  bote.push(ej({
    titulo: `Bote: ${r.n} ${c.n}`, categoria: "Bote", edades: r.c === "dos" ? DESDE_INF : MAYORES, duracion: 8, jugadores: c.j, material: r.c === "dos" ? "2 balones por jugador" : "1 balón por jugador, conos",
    objetivos: `Dominar el ${r.n} y usarlo con intención`, descripcion: unir(r.t, c.d, "Series de 4-6 repeticiones por mano."),
    correcciones: "Cabeza arriba · Bote por debajo de la cintura en el cambio · Cambio de ritmo tras el recurso (lento-rápido) · Proteger con el brazo libre",
    etiquetas: ["bote", r.c, c.c], video: yt(`${r.ing} basketball drill`),
    montaje: { at: c.at, df: c.df, balon: "1", pasos: [{ m: [["1", "botar", ...(c.c === "presion" ? [[9, 4] as P, [15, 9] as P] : [[23.4, 10.8] as P, [25.2, 9] as P])]] }, ...(c.c === "presion" ? [] : [{ tiro: "1" }])] },
  }));
}

// ============================================================================
// P) DEFENSA INDIVIDUAL Y AYUDAS
// ============================================================================
const DEF_IND_BAL = [
  { c: "zigzag", n: "zigzag defensivo con balón", d: "1c1 en zigzag por toda la pista: el defensor obliga al atacante a cambiar de dirección cada 3 botes." },
  { c: "linea", n: "negar la línea de fondo", d: "1c1 desde el ala: el defensor manda siempre al centro (donde está la ayuda), nunca a la línea de fondo." },
  { c: "parar", n: "parar el bote y defender el pase", d: "Cuando el atacante deja de botar, el defensor se pega (presión) y molesta el pase sin hacer falta." },
  { c: "tirador", n: "defender al tirador tras bote", d: "1c1 contra un buen tirador: el defensor no deja tirar tras bote pero sin dejarse superar." },
  { c: "poste", n: "defensa del poste por delante", d: "Defender al poste bajo por delante (3/4) cuando el balón está en el ala y por detrás cuando está en la cabeza." },
  { c: "corte", n: "defender el corte (no dejar pasar por delante)", d: "Tras pasar, el atacante corta: el defensor salta hacia el balón (jump to the ball) y obliga a cortar por detrás." },
];
const defensa: EjercicioSemilla[] = [];
for (const d of DEF_IND_BAL) for (const v of [{ s: "", e: "", j: 2 }, { s: " (con ayuda)", e: "Se añade un compañero de ayuda en el lado débil: si el defensor es superado, la ayuda llega y hay que recuperar.", j: 4 }, { s: " (competición)", e: "Se cuentan paradas defensivas: el que más consiga en 5 intentos gana.", j: 2 }]) defensa.push(ej({
  titulo: `Defensa: ${d.n}${v.s}`, categoria: "Defensa", edades: MAYORES, duracion: 10, jugadores: v.j, material: "1 balón",
  objetivos: "Defensa individual del balón y del jugador sin balón", descripcion: unir(d.d, v.e),
  correcciones: "Posición baja, pies más anchos que los hombros · No cruzar los pies · Mano activa en el balón sin buscar el robo · Cabeza por delante del atacante",
  etiquetas: ["defensa individual", d.c], video: yt(`${d.c === "poste" ? "post defense" : d.c === "corte" ? "jump to the ball" : "on ball defense"} drill`),
  montaje: { at: { "1": S.alaD }, df: { "1": [22.2, 11.4], ...(v.j > 2 ? { "4": [24.8, 5.6] } : {}) }, balon: "1", pasos: [{ m: [["1", "botar", [23.6, 10.8]], ["d1", "correr", [24.2, 10.4]]] }] },
}));
const AYUDAS = [
  { c: "ayudaal", n: "ayudar al que ayuda (help the helper)", d: "Tras una ayuda del lado débil, el siguiente defensor rota al que ha dejado libre la ayuda, y así hasta que el balón sale." },
  { c: "caida", n: "caída al poste tras pase interior", d: "Cuando el balón entra al poste, los defensores exteriores caen hacia dentro para molestar y vuelven al pase de salida." },
  { c: "tag", n: "tag al que continúa del directo", d: "El defensor del lado débil más cercano toca (tag) al jugador que continúa tras el bloqueo directo y vuelve a su jugador." },
  { c: "fondo", n: "ayuda en la línea de fondo", d: "Penetración por la línea de fondo: el defensor del poste del lado débil sale a cortar y el resto rota hacia abajo." },
  { c: "stunt", n: "finta de ayuda (stunt) y recuperar", d: "Ante una penetración, el defensor del lado del balón amaga ayudar (stunt) para frenar al que bota sin dejar libre a su jugador." },
  { c: "tapon", n: "ayuda vertical (sin falta)", d: "El defensor de ayuda llega al aro y salta vertical, con los brazos arriba, para molestar sin hacer falta." },
];
for (const a of AYUDAS) for (const f of [{ c: "3c3", j: 6 }, { c: "4c4", j: 8 }, { c: "5c5", j: 10 }]) defensa.push(ej({
  titulo: `Ayudas: ${a.n} (${f.c})`, categoria: "Defensa", edades: ADULTOS, duracion: 12, jugadores: f.j, material: "1 balón",
  objetivos: `Defensa de equipo: ${a.n}`, descripcion: unir(`${f.c} media pista.`, a.d, "Primero a medio ritmo con paradas del entrenador; después en vivo contando paradas."),
  correcciones: "Hablar antes de ayudar ('¡ayuda!') · Llegar antes que el atacante (posición, no reacción) · Recuperar con pasos cortos y la mano arriba · Siempre ver el balón",
  etiquetas: ["ayudas", "rotaciones", a.c, f.c], video: yt(`${a.c === "ayudaal" ? "help the helper" : a.c === "tag" ? "tag the roller" : a.c === "stunt" ? "stunt and recover" : a.c === "tapon" ? "verticality help defense" : "help defense"} drill`),
  montaje: { at: f.c === "3c3" ? F3 : f.c === "4c4" ? F4 : F5, df: conDf(f.c === "3c3" ? F3 : f.c === "4c4" ? F4 : F5), balon: "1", pasos: [{ m: [["1", "botar", [22.6, 8.4]]] }, { pase: ["1", "2"] }] },
}));

// ============================================================================
// Q) PASES ESPECIALES Y TIRO LIBRE
// ============================================================================
const PASES_ESP = [
  { c: "poste", n: "pase al poste (entrada interior)", d: "Pase desde el ala al poste por el lado contrario al defensor: picado, bombeado o por encima, según cómo defienda." },
  { c: "pocket", n: "pase en el bolsillo (pocket pass)", d: "Tras el bloqueo directo, pase picado entre los dos defensores al que continúa." },
  { c: "globo", n: "pase bombeado al aro (lob)", d: "Pase alto al aro para el compañero que corta por detrás de la defensa (puerta atrás o tras bloqueo)." },
  { c: "salida", n: "pase de salida largo (outlet)", d: "Tras el rebote, pase largo de una o dos manos al compañero que corre hacia el otro aro." },
  { c: "manoamano", n: "entrega en mano a mano (DHO)", d: "Entrega del balón en mano a mano con el cuerpo como bloqueo, a la altura de la cadera del receptor." },
  { c: "unmano", n: "pase a una mano tras bote", d: "Pase con una mano en movimiento, sin recoger el balón, al compañero que se abre." },
];
const pasesEsp: EjercicioSemilla[] = [];
for (const p of PASES_ESP) for (const v of [{ s: "sin defensa", e: "Primero sin defensa, por parejas, 10 por lado.", j: 2 }, { s: "con defensor en la línea", e: "Con un defensor que intenta interceptar el pase.", j: 3 }, { s: "en juego (3c3)", e: "En 3c3: el pase solo vale si se hace en situación de juego real.", j: 6 }]) pasesEsp.push(ej({
  titulo: `Pase: ${p.n} (${v.s})`, categoria: "Pase", edades: MAYORES, duracion: 8, jugadores: v.j, material: "2 balones",
  objetivos: `Técnica y momento del ${p.n}`, descripcion: unir(p.d, v.e), correcciones: "Fintar antes de pasar · Pase tenso, al lado lejano del defensor · Pasar al espacio donde va el receptor · El receptor pide con las manos",
  etiquetas: ["pase", p.c], video: yt(`${p.c === "pocket" ? "pocket pass" : p.c === "globo" ? "lob pass" : p.c === "salida" ? "outlet pass" : p.c === "poste" ? "post entry pass" : p.c === "manoamano" ? "dribble handoff" : "one hand pass"} drill`),
  montaje: { at: { "1": S.alaD, "5": S.posteD }, df: v.j > 2 ? { "5": [25, 9.2] } : {}, balon: "1", pasos: [{ pase: ["1", "5"] }, { tiro: "5" }] },
}));
const TL = [
  { t: "Rutina de tiro libre con presión (1 y 1)", d: "Cada jugador lanza un 1 y 1: si falla el primero, carrera. Simula los finales de partido." },
  { t: "Tiros libres tras sprint", d: "Sprint de ida y vuelta y 2 tiros libres; se anota el porcentaje con fatiga." },
  { t: "Tiro libre por equipos: llegar a 10 seguidos", d: "El equipo tiene que encadenar 10 tiros libres anotados seguidos (rotando tiradores). Si uno falla, se vuelve a 0." },
  { t: "Tiro libre con distracciones", d: "El resto del equipo hace ruido y movimientos (sin tocar) para simular el ambiente de un pabellón." },
  { t: "Rutina personal de tiro libre", d: "Cada jugador define su rutina (botes, respiración, mirada) y la repite igual en 20 tiros libres." },
  { t: "Tiro libre y rebote en juego (tras fallo)", d: "Se lanza el segundo tiro libre fallado a propósito y se juega el rebote 4c4 con las posiciones reglamentarias." },
];
const tiroLibre = TL.map((t) => ej({
  titulo: t.t, categoria: "Tiro", edades: MAYORES, duracion: 8, jugadores: 6, material: "2 balones",
  objetivos: "Tiro libre fiable bajo presión", descripcion: t.d, correcciones: "Misma rutina siempre · Codo bajo el balón · Terminar con la muñeca y mantener el brazo arriba · Respirar antes de tirar",
  etiquetas: ["tiro libre", "rutina", "presión"], video: yt("free throw routine drill"),
  montaje: { at: { "1": [22.2, 7.5] }, balon: "1", pasos: [{ tiro: "1" }] },
}));
const REB_EXT = [
  { t: "Rebote ofensivo de los exteriores (crash desde el ala)", d: "Tras el tiro del entrenador, los aleros van al rebote ofensivo desde el ala esquivando al defensor que cierra." },
  { t: "Palmeo continuo en el aro (tip drill)", d: "Fila a un lado del aro: palmear el balón contra el tablero 3 veces seguidas y anotar a la cuarta." },
  { t: "Rebote 'superman' de lado a lado", d: "Lanzar el balón contra el tablero hacia el otro lado, saltar a cogerlo en el punto más alto y volver a lanzarlo; 10 seguidos." },
  { t: "Rebote y pase de salida en 2 segundos", d: "El entrenador tira, el jugador coge el rebote, pivota hacia fuera y hace el pase de salida a la banda." },
  { t: "Rebote 2c1 (un defensor contra dos atacantes)", d: "Un defensor tiene que cerrar a dos atacantes: practicar el cierre al más cercano y la pelea por el balón." },
  { t: "Rebote de tiro libre (posiciones y bloqueo)", d: "Posiciones reglamentarias de tiro libre: los defensores cierran por dentro y el ataque intenta la posición interior." },
];
const reboteExt = REB_EXT.flatMap((r) => [{ s: "", e: "" }, { s: " (competición por puntos)", e: "Cada rebote ganado es 1 punto; el primero a 5 gana." }].map((v) => ej({
  titulo: r.t + v.s, categoria: "Rebote", edades: MAYORES, duracion: 8, jugadores: 4, material: "1-2 balones",
  objetivos: "Agresividad y técnica en el rebote", descripcion: unir(r.d, v.e), correcciones: "Saltar al punto más alto · Coger el balón con las dos manos · Contacto antes que balón · Proteger el balón tras cogerlo",
  etiquetas: ["rebote", "rebote ofensivo"], video: yt("rebounding drills basketball"),
  montaje: { at: { "2": S.alaD, "3": S.alaI }, df: { "2": [23.2, 10.8], "3": [23.2, 4.2] }, entrenador: [22.2, 7.5], pasos: [{ m: [["2", "correr", [24.6, 10.4], [25.8, 8.6]], ["3", "correr", [24.6, 4.6], [25.8, 6.4]]] }] },
})));

export const GENERADOS: EjercicioSemilla[] = (() => {
  const todos = [...juegoReducido, ...pnr, ...indirectos, ...tiroMov, ...finalizaciones, ...shell, ...rebote, ...transicion, ...presion, ...zona, ...interior, ...unoContraUno, ...pase, ...fisico, ...calentamiento,
    ...bote, ...defensa, ...pasesEsp, ...tiroLibre, ...reboteExt];
  const vistos = new Set<string>();
  return todos.filter((e) => !vistos.has(e.titulo) && vistos.add(e.titulo));
})();
void SENIOR;
