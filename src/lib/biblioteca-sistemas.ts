// Biblioteca del CB Turó · sistemas (NBA, ACB, Euroliga y NCAA): media pista, saques de fondo y de banda,
// ataque a zona y salida de presión. Cada uno con su pizarra y un enlace a vídeos que lo explican.
import type { EjercicioSemilla } from "./biblioteca-semilla";

type P = [number, number];
const BASE: P = [19.2, 7.5], ALA_I: P = [21, 2.6], ALA_D: P = [21, 12.4], ESQ_I: P = [27, 1], ESQ_D: P = [27, 14];
const POSTE_I: P = [25.6, 5.4], POSTE_D: P = [25.6, 9.6], CODO_I: P = [22.6, 5.6], CODO_D: P = [22.6, 9.4];
const TL: P = [22.2, 7.5], BASE_I: P = [19.6, 5], BASE_D: P = [19.6, 10];
const FONDO: P = [27.9, 10.4];          // sacador de fondo (fuera, lado derecho del aro)
const BANDA: P = [20, 15];              // sacador de banda (lado derecho)

const ADULTOS = ["Junior", "Sénior"];
const MAYORES = ["Cadete", "Junior", "Sénior"];
/** Enlace a la búsqueda en YouTube (siempre funciona y saca varios vídeos de entrenadores explicándolo) */
export const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

type Sis = Omit<EjercicioSemilla, "tipo" | "categoria" | "jugadores" | "material"> & { jugadores?: number };
const sis = (s: Sis): EjercicioSemilla => ({ tipo: "sistema", categoria: "Sistema de juego", jugadores: 5, material: "1 balón", ...s });

export const SISTEMAS: EjercicioSemilla[] = [
  // =====================================================================
  // MEDIA PISTA · CUERNOS (HORNS)
  // =====================================================================
  sis({
    titulo: "Cuernos: bloqueo de salida al tirador (Horns Flare)", edades: ADULTOS, duracion: 15,
    objetivos: "Tiro abierto del escolta tras bloqueo de salida · Castigar a la defensa que se fija en el bloqueo directo",
    descripcion: "Formación de cuernos: 4 y 5 en los codos, 2 y 3 en las esquinas. El base pasa al 4 en el codo y corta hacia la esquina contraria. El 5 baja a poner un bloqueo de salida (flare) al 2, que se abre al ala del lado del 5. El 4 pasa al 2 para tiro. Segunda opción: si el defensor del 2 pasa por debajo, el 5 continúa hacia el aro (slip) tras el bloqueo.",
    correcciones: "El 2 lleva a su defensor hacia dentro antes de abrirse · El bloqueo de salida se pone de espaldas al aro, con el ángulo hacia la banda · El 4 recibe de cara al aro y amenaza antes de pasar · Espaciado: la esquina débil vacía",
    etiquetas: ["cuernos", "horns", "bloqueo de salida", "flare", "NBA"],
    video: yt("horns flare basketball play"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": [24.5, 12.6], "3": ESQ_I }, balon: "1", pasos: [
      { pase: ["1", "4"], m: [["1", "correr", [22, 4], [26.8, 1.5]], ["3", "correr", [24, 2], [21, 2.8]]] },
      { m: [["5", "bloqueo", [22.8, 11.2]], ["2", "correr", [23.4, 11.6], [20.6, 12.8]]] },
      { pase: ["4", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Cuernos: corte por la espalda del codo (Horns Rip / 45 cut)", edades: ADULTOS, duracion: 15,
    objetivos: "Canasta fácil del 4 tras bloqueo de corte · Atacar el cambio defensivo",
    descripcion: "Desde cuernos, el base pasa al 5 en el codo derecho. El 4 baja del codo izquierdo hacia el poste bajo y el 1 le pone un bloqueo de corte (rip) en la línea de 45º. El 4 corta hacia el aro y recibe del 5. Si la defensa cambia, el 1 queda emparejado con el pívot: el 1 sale hacia fuera y el 5 lo busca para un 1c1 con ventaja de velocidad.",
    correcciones: "El 1 bloquea con el pecho mirando a la banda contraria · El 4 lleva a su defensor hacia arriba antes de cortar · Pase del 5 por encima (bombeado) o picado según la posición del defensor · Los aleros mantienen las esquinas",
    etiquetas: ["cuernos", "horns", "bloqueo de corte", "rip", "pase alto-bajo"],
    video: yt("horns rip screen basketball play"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": ESQ_I, "3": ESQ_D }, balon: "1", pasos: [
      { pase: ["1", "5"] },
      { m: [["1", "bloqueo", [21.4, 6.2]], ["4", "correr", [21.2, 5.2], [25.6, 6.6]]] },
      { pase: ["5", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Cuernos: aclarado para el 4 en el codo (Horns Elbow Iso)", edades: ADULTOS, duracion: 12,
    objetivos: "Aislar a un interior con buen tiro o bote en el codo · Espaciado para el 1c1",
    descripcion: "El base pasa al 4 en el codo izquierdo y vacía hacia la esquina derecha con el escolta (doble esquina). El 5 baja al poste bajo del lado contrario. El 4 tiene todo el lado izquierdo para atacar en 1c1 desde el codo: tiro, finta y penetración, o pasar al 5 si la ayuda llega desde su lado.",
    correcciones: "El 4 recibe y se encara antes de botar (triple amenaza) · Los tiradores en esquina y ala contrarias, lejos de la ayuda · El 5 sella a su defensor para la continuación · Leer de dónde viene la ayuda",
    etiquetas: ["cuernos", "aclarado", "1c1", "codo", "4 abierto"],
    video: yt("horns elbow isolation basketball"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": ESQ_I, "3": ESQ_D }, balon: "1", pasos: [
      { pase: ["1", "4"], m: [["1", "correr", [21.2, 11.4]], ["5", "correr", [25.6, 9.8]], ["2", "correr", [23.6, 1.6], [22, 1.6]]] },
      { m: [["4", "botar", [24.2, 4.4], [25.6, 5.8]]] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Cuernos: bloqueo directo y abrirse (Horns Pick & Pop)", edades: ADULTOS, duracion: 12,
    objetivos: "Tiro del interior que se abre tras el bloqueo · Obligar a la defensa a decidir entre el bloqueador y el que continúa",
    descripcion: "El base elige un codo y ataca el bloqueo directo del 4 (que se abre a la línea de 3) mientras el 5 continúa hacia el aro desde el otro codo (doble acción: uno se abre, otro corta). El base lee: si el defensor del 4 ayuda, pase al 4 para tiro; si el del 5 sale, pase al 5 en el aro; si nadie ayuda, penetra.",
    correcciones: "El base usa el bloqueo pegado, hombro con hombro · El 4 se abre detrás de la línea, con los pies preparados · El 5 corta en el momento en que el balón supera el bloqueo · Esquinas llenas para fijar las ayudas",
    etiquetas: ["cuernos", "pick and pop", "bloqueo directo", "doble acción"],
    video: yt("horns pick and pop set"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": ESQ_I, "3": ESQ_D }, balon: "1", pasos: [
      { m: [["4", "bloqueo", [20.2, 6.4]], ["1", "botar", [20.8, 5.2], [22.6, 4.2]]] },
      { m: [["4", "correr", [19.6, 4.4]], ["5", "correr", [25.4, 8.4]]] },
      { pase: ["1", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Cuernos: doble bloqueo escalonado para el escolta (Horns Stagger)", edades: ADULTOS, duracion: 15,
    objetivos: "Tiro del mejor tirador saliendo de dos bloqueos · Esconder la jugada tras la formación de cuernos",
    descripcion: "El base pasa al 4 y se va a la esquina. El escolta, que estaba en la esquina izquierda, sube por el carril central usando dos bloqueos seguidos (escalonados) del 5 y del 3, hasta el ala derecha. El 4 le pasa para tiro. Si su defensor le sigue muy pegado, el escolta cambia la salida y corta hacia el aro (curl).",
    correcciones: "Los bloqueadores separados 2 metros, en línea con la salida · El tirador pasa rozando los bloqueos (hombro con cadera) · Leer al defensor: si sigue → curl, si se queda por debajo → salida abierta · El pasador espera a que el tirador salga del segundo bloqueo",
    etiquetas: ["cuernos", "stagger", "bloqueos escalonados", "tirador"],
    video: yt("horns stagger screen set basketball"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": ESQ_I, "3": POSTE_D }, balon: "1", pasos: [
      { pase: ["1", "4"], m: [["1", "correr", [22, 11], [27, 13.6]]] },
      { m: [["5", "bloqueo", [24.8, 6.8]], ["3", "bloqueo", [23, 9.6]], ["2", "correr", [25.4, 4.6], [24, 8], [21, 12]]] },
      { pase: ["4", "2"] }, { tiro: "2" },
    ] },
  }),
  // =====================================================================
  // MEDIA PISTA · BLOQUEO DIRECTO Y SUS VARIANTES
  // =====================================================================
  sis({
    titulo: "Bloqueo al bloqueador antes del directo (Ram screen)", edades: ADULTOS, duracion: 12,
    objetivos: "Liberar al bloqueador del directo antes de bloquear · Que su defensor llegue tarde al bloqueo directo",
    descripcion: "El escolta sale desde la esquina y pone un bloqueo de espaldas al defensor del 5 (que está en el poste bajo). El 5, ya liberado, sube a poner el bloqueo directo central al base. El escolta, tras bloquear, se abre a la esquina o al ala para recibir si su defensor ayuda. Muy usado en NBA y Euroliga.",
    correcciones: "El bloqueo de ram se pone al defensor, no al jugador · El 5 sube con ritmo: no esperar a que el ram termine · El base espera a que el bloqueo esté puesto (no salir antes) · El que ha hecho el ram se abre al espacio",
    etiquetas: ["ram", "bloqueo directo", "bloquear al bloqueador", "NBA"],
    video: yt("ram screen pick and roll action"),
    montaje: { at: { "1": BASE, "5": POSTE_D, "2": ESQ_D, "3": ESQ_I, "4": ALA_I }, df: { "5": [25, 9] }, balon: "1", pasos: [
      { m: [["2", "bloqueo", [24.6, 9.6]]] },
      { m: [["5", "correr", [21.4, 8.4]], ["2", "correr", [24.8, 12.6], [21.8, 13.2]]] },
      { m: [["5", "bloqueo", [20.2, 8]], ["1", "botar", [20.4, 9.6], [22.2, 11]]] },
      { m: [["5", "correr", [25.2, 8.4]]], pase: ["1", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Directo lateral con sobrecarga (Side pick & roll)", edades: ADULTOS, duracion: 12,
    objetivos: "Atacar el directo en el ala con espacio para el pase a la esquina · Castigar la ayuda del lado débil",
    descripcion: "El base bota hacia el ala derecha. El 5 pone el bloqueo directo lateral mirando hacia el centro. El 2 está en la esquina del mismo lado y el 3 y el 4 llenan el lado contrario (ala y esquina). El base ataca el centro: si la ayuda viene de la esquina, pase a la esquina; si viene del lado débil, pase al ala contraria (skip); si nadie ayuda, el 5 continúa al aro.",
    correcciones: "Ángulo del bloqueo hacia el centro (no dejar ir a la banda) · El base ataca en diagonal hacia el codo · El que está en la esquina se desplaza a la línea de visión del base · El 5 continúa pegado a la línea de fondo si su defensor sale alto",
    etiquetas: ["bloqueo directo lateral", "side pick and roll", "lectura de ayudas"],
    video: yt("side pick and roll reads basketball"),
    montaje: { at: { "1": BASE_D, "5": POSTE_D, "2": ESQ_D, "3": ALA_I, "4": ESQ_I }, balon: "1", pasos: [
      { m: [["5", "bloqueo", [20.6, 11.4]], ["1", "botar", [20.4, 12.4]]] },
      { m: [["1", "botar", [21.4, 9.6], [23, 8.4]], ["5", "correr", [25.4, 9.8]]] },
      { pase: ["1", "3"] }, { tiro: "3" },
    ] },
  }),
  sis({
    titulo: "Mano a mano que acaba en directo (Get / DHO a pick & roll)", edades: ADULTOS, duracion: 12,
    objetivos: "Encadenar dos acciones con el mismo balón · Ganar ventaja antes del bloqueo directo",
    descripcion: "El base pasa al 5, que sube al ala con balón (o se lo da en mano a mano). El escolta sale de la esquina a recibir el mano a mano del 5 y, sin parar, el 5 se gira y le pone un bloqueo directo. El escolta ya llega con ventaja al directo: penetra, pasa al 5 que continúa, o tira tras bote.",
    correcciones: "Entregar el balón en la cadera del receptor · El 5 se gira rápido al bloqueo tras la entrega (no quedarse parado) · El receptor del mano a mano ataca con el primer bote hacia el aro · Los demás ocupan esquinas y ala contraria",
    etiquetas: ["mano a mano", "DHO", "get", "bloqueo directo", "encadenar acciones"],
    video: yt("dribble handoff into pick and roll"),
    montaje: { at: { "1": BASE, "5": CODO_D, "2": ESQ_D, "3": ESQ_I, "4": ALA_I }, balon: "1", pasos: [
      { pase: ["1", "5"], m: [["5", "correr", [21.6, 10.4]]] },
      { m: [["5", "botar", [21, 11.6]], ["2", "correr", [24.4, 13], [21.2, 12.4]]] },
      { mano: ["5", "2"] },
      { m: [["5", "bloqueo", [21.8, 11.2]], ["2", "botar", [22.8, 10], [25, 8.6]]] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Directo central con 4 abiertos (Spread pick & roll)", edades: ADULTOS, duracion: 10,
    objetivos: "Final de posesión con la mejor pareja · Máximo espacio para el bloqueo directo",
    descripcion: "Los 4 jugadores que no participan ocupan las dos esquinas y las dos alas, bien abiertos. El 5 pone el bloqueo directo en la cabeza de la zona al base. Lecturas: continuación del 5 al aro, pase a la esquina cuya defensa ayuda en la continuación (tag), o pase a la ala contraria si la defensa rota. Habitual para los últimos segundos de posesión.",
    correcciones: "Espaciado: pies detrás de la línea de 3 y a la vista del base · El 5 bloquea y continúa por el centro de la zona · El base ataca el bloqueo con 2 botes, no 5 · Relocalizarse si el balón va al lado de uno",
    etiquetas: ["bloqueo directo", "spread", "4 abiertos", "final de posesión"],
    video: yt("spread pick and roll offense"),
    montaje: { at: { "1": BASE, "5": TL, "2": ESQ_D, "3": ESQ_I, "4": ALA_I }, balon: "1", pasos: [
      { m: [["5", "bloqueo", [19.9, 8.6]], ["1", "botar", [20.4, 10], [22.6, 10.4]]] },
      { m: [["5", "correr", [25.2, 8]]] }, { pase: ["1", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Doble directo en la cabeza (Double high / Horns PnR)", edades: ADULTOS, duracion: 12,
    objetivos: "Dos bloqueos directos seguidos para el base · Confundir a la defensa en las coberturas",
    descripcion: "Los dos interiores ponen un bloqueo directo uno al lado del otro en la cabeza de la zona (o escalonados). El base usa los dos: el primero (4) se abre a la línea de 3 y el segundo (5) continúa hacia el aro. El base lee quién queda libre. Variante: el base rechaza (refuse) los dos bloqueos y ataca hacia el otro lado.",
    correcciones: "Bloqueos con un metro de separación, mirando a la banda · El base pasa pegado a los dos · Uno abre (pop) y otro continúa (roll): nunca los dos al mismo sitio · Esquinas llenas",
    etiquetas: ["doble bloqueo directo", "double high", "pick and roll", "pick and pop"],
    video: yt("double high pick and roll set"),
    montaje: { at: { "1": [18.8, 9.6], "4": [20, 8.6], "5": [21, 7.4], "2": ESQ_D, "3": ESQ_I }, balon: "1", pasos: [
      { m: [["1", "botar", [20.4, 7.2], [21.8, 5.6]]] },
      { m: [["4", "correr", [20, 11.6]], ["5", "correr", [25.2, 7.2]]] }, { pase: ["1", "5"] }, { tiro: "5" },
    ] },
  }),
  // =====================================================================
  // MEDIA PISTA · ACCIONES SIN BALÓN Y SISTEMAS COMPLETOS
  // =====================================================================
  sis({
    titulo: "Bloqueo indirecto doble para tirador (Double stack / Pin down doble)", edades: MAYORES, duracion: 12,
    objetivos: "Liberar al tirador desde el poste bajo con dos bloqueos · Lectura de salida (abierta o curl)",
    descripcion: "Interiores y aleros apilados en los dos postes bajos (cada alero detrás de un interior). El base sube por el centro. Los aleros salen a la vez hacia las alas usando el bloqueo de su interior. El base pasa al que queda libre. Tras el pase, el interior de ese lado sella y busca el poste bajo.",
    correcciones: "Salir a la vez y a tope de velocidad · El bloqueador espera el contacto y luego sella al defensor · Leer al defensor: si persigue por detrás, curl al aro · Pase al hombro de fuera del receptor",
    etiquetas: ["bloqueo indirecto", "pin down", "stack", "tirador"],
    video: yt("double stack pin down play basketball"),
    montaje: { at: { "1": BASE, "4": [25, 4.6], "5": [25, 10.4], "2": [26.6, 4], "3": [26.6, 11] }, balon: "1", pasos: [
      { m: [["2", "correr", [24.2, 3.4], [21.2, 2.6]], ["3", "correr", [24.2, 11.6], [21.2, 12.4]]] },
      { pase: ["1", "3"] }, { m: [["5", "correr", [25.8, 9.6]]] }, { tiro: "3" },
    ] },
  }),
  sis({
    titulo: "Bloqueos escalonados lejos del balón (Stagger away)", edades: ADULTOS, duracion: 12,
    objetivos: "Tirador que sale de dos bloqueos hacia el lado contrario del balón · Pase de lado a lado (swing)",
    descripcion: "El balón está en un ala. En el lado contrario, el 4 y el 5 se colocan en línea (uno en el poste bajo y otro en el codo). El tirador sale desde debajo del aro usando los dos bloqueos hasta el ala débil. El balón vuelve por la cabeza (base → ala) para el tiro. Si el defensor se va por debajo, el tirador sigue hacia la esquina (fade).",
    correcciones: "El tirador lleva a su defensor hacia el balón antes de salir · Bloqueadores firmes, sin moverse · El pase de la cabeza llega cuando el tirador sale del segundo bloqueo · Leer si curl, abierta o fade",
    etiquetas: ["stagger", "bloqueos escalonados", "lado débil", "tirador"],
    video: yt("stagger screen away basketball"),
    montaje: { at: { "1": BASE, "3": ALA_D, "2": [26.4, 7.5], "4": POSTE_I, "5": CODO_I }, balon: "3", pasos: [
      { pase: ["3", "1"] },
      { m: [["4", "bloqueo", [25.4, 5]], ["5", "bloqueo", [22.8, 4.6]], ["2", "correr", [25.6, 6], [23.6, 4.6], [21, 2.6]]] },
      { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Ataque Shuffle (corte shuffle continuo)", edades: ADULTOS, duracion: 15,
    objetivos: "Ataque de continuidad con cortes por la espalda del codo · Todos los jugadores pasan por todas las posiciones",
    descripcion: "Desde una formación de ala sobrecargada, el balón pasa del ala a la cabeza. El jugador que está en el ala contraria (lado débil) corta por detrás del bloqueo del codo hacia el aro (corte shuffle). Si no recibe, sigue a la esquina y el bloqueador del codo baja a bloquear para el siguiente que sube a la cabeza. Así se repite por los dos lados.",
    correcciones: "El cortador lleva a su defensor hacia fuera y corta rozando el bloqueo · El bloqueo del codo en diagonal · Pasar el balón rápido de lado a lado · Paciencia: el corte bueno sale a la 2ª o 3ª vuelta",
    etiquetas: ["shuffle", "continuidad", "cortes", "sistema completo"],
    video: yt("shuffle offense basketball"),
    montaje: { at: { "1": BASE, "2": ALA_D, "5": CODO_I, "3": ALA_I, "4": POSTE_D }, balon: "2", pasos: [
      { pase: ["2", "1"] },
      { m: [["3", "correr", [21.6, 4], [23.6, 5.6], [26, 7.2]]] }, { pase: ["1", "3"] }, { tiro: "3" },
    ] },
  }),
  sis({
    titulo: "Movimiento 5 abiertos: pasa y corta (5-out motion)", edades: MAYORES, duracion: 15,
    objetivos: "Ataque libre basado en reglas para equipos sin pívot claro · Cortes tras pase y relleno de espacios",
    descripcion: "Los cinco jugadores abiertos detrás de la línea de 3 (cabeza, dos alas y dos esquinas). Reglas: tras pasar, cortar al aro y salir al lado contrario; el que está más cerca rellena el hueco que se ha dejado; si te niegan el pase, puerta atrás. Desde ahí se pueden añadir bloqueos indirectos y mano a mano.",
    correcciones: "Cortes con cambio de ritmo, no paseando · Rellenar el espacio que deja el cortador · Puerta atrás cuando el defensor niega con el brazo · Recibir con los pies preparados para tirar o atacar",
    etiquetas: ["5 abiertos", "motion", "pasa y corta", "puerta atrás"],
    video: yt("5 out motion offense"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "4": ESQ_D, "5": ESQ_I }, balon: "1", pasos: [
      { pase: ["1", "2"] },
      { m: [["1", "correr", [24, 8.4], [26.2, 7.4], [24.2, 2.2]], ["3", "correr", [19.6, 6.6]], ["5", "correr", [21.6, 2.4]]] },
      { pase: ["2", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Movimiento 4 abiertos 1 dentro (4-out 1-in)", edades: MAYORES, duracion: 15,
    objetivos: "Ataque de reglas con un interior en el poste · Combinar juego interior y cortes",
    descripcion: "Cuatro exteriores (cabeza y alas, o alas y esquinas) y un pívot que se mueve por el lado del balón. Reglas: pase y corta; el pívot siempre en el lado del balón (poste bajo o alto); pase al poste → el pasador corta o se mueve a ser visible; si el pívot sube al codo, bloqueo directo o mano a mano.",
    correcciones: "El pívot cambia de lado cuando el balón cambia de lado · Los exteriores no se acercan al poste: le dejan espacio · Tras pase al poste, mover a los defensores (cortar o relocalizarse) · Pase al poste desde el ángulo del ala",
    etiquetas: ["4 abiertos", "motion", "juego interior", "reglas"],
    video: yt("4 out 1 in motion offense"),
    montaje: { at: { "1": BASE_I, "2": BASE_D, "3": ESQ_I, "4": ESQ_D, "5": POSTE_D }, balon: "1", pasos: [
      { pase: ["1", "2"] }, { m: [["2", "correr", [21, 12]], ["5", "correr", [25.4, 10.2]]] },
      { pase: ["2", "5"], m: [["2", "correr", [23.6, 11.6], [26.4, 12.6]]] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Ataque de penetración (Dribble drive motion)", edades: ADULTOS, duracion: 15,
    objetivos: "Ganar por bote y leer las ayudas · Posiciones fijas de recepción tras cada penetración",
    descripcion: "Cuatro abiertos y un interior en el poste del lado contrario. El que tiene el balón penetra por el carril. Reglas de los compañeros: si penetra por el centro, las alas bajan a la esquina (drift); si penetra por la línea de fondo, la esquina sube al ala (lift) y la cabeza se desplaza (behind); el interior se mueve a la línea de fondo contraria. El penetrador termina, pasa al que deja libre la ayuda o saca el balón y reinicia.",
    correcciones: "Penetrar hasta el aro con intención de anotar · Moverse a la vez que el penetrador, a los espacios fijos · Recibir y decidir en menos de medio segundo · El interior no se queda en el camino de la penetración",
    etiquetas: ["dribble drive", "penetración", "lectura de ayudas", "espaciado"],
    video: yt("dribble drive motion offense"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "4": ESQ_I, "5": POSTE_D }, balon: "2", pasos: [
      { m: [["2", "botar", [23.8, 11.2], [25.4, 9.6]], ["5", "correr", [27.2, 6.4]], ["1", "correr", [20.4, 11]], ["4", "correr", [23.6, 1.6]]] },
      { pase: ["2", "1"] }, { tiro: "1" },
    ] },
  }),
  sis({
    titulo: "Trenza para iniciar (Weave)", edades: MAYORES, duracion: 12,
    objetivos: "Iniciar el ataque con manos a manos encadenados · Atacar cuando el defensor queda atrás",
    descripcion: "Tres exteriores encadenan manos a manos en la parte alta: el base bota hacia el ala y entrega al que viene, que bota hacia el otro lado y entrega al tercero. En cualquier entrega en que el defensor quede detrás, el receptor ataca el aro. Si nada sale, se acaba con un bloqueo directo del interior.",
    correcciones: "Entregar el balón y bloquear con el cuerpo al defensor del receptor · El receptor sale pegado a la entrega · Atacar en el primer hueco, no dar 6 vueltas · Los interiores lejos, sin taponar la penetración",
    etiquetas: ["weave", "trenza", "mano a mano", "inicio"],
    video: yt("weave offense handoff basketball"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "4": POSTE_I, "5": POSTE_D }, balon: "1", pasos: [
      { m: [["1", "botar", [20.4, 10.6]], ["2", "correr", [20.6, 11.6]]] }, { mano: ["1", "2"] },
      { m: [["2", "botar", [19.8, 7], [20.6, 4.6]], ["3", "correr", [20.8, 3.6]]] }, { mano: ["2", "3"] },
      { m: [["3", "botar", [23.4, 3.6], [25.6, 5.8]]] }, { tiro: "3" },
    ] },
  }),
  sis({
    titulo: "Alto-bajo entre interiores desde 1-4 alto (High-Low)", edades: MAYORES, duracion: 12,
    objetivos: "Pase del poste alto al poste bajo · Sellar al defensor que juega por delante",
    descripcion: "Formación 1-4 alto: interiores en los codos y aleros en las alas a la altura del tiro libre. El base pasa a un interior en el codo. El otro interior baja al poste bajo contrario y sella a su defensor. Pase alto-bajo por encima o picado. Si la defensa ayuda desde el ala, el interior del poste bajo pasa al ala abierta.",
    correcciones: "Sellar con el trasero y el brazo, pidiendo con la mano lejana · El pasador del codo encarado al aro · Pase al lado contrario de donde está el defensor · Aleros abiertos para castigar la ayuda",
    etiquetas: ["alto-bajo", "high low", "1-4 alto", "juego interior"],
    video: yt("high low post offense basketball"),
    montaje: { at: { "1": BASE, "4": CODO_I, "5": CODO_D, "2": [21.6, 2], "3": [21.6, 13] }, df: { "5": [23.4, 9] }, balon: "1", pasos: [
      { pase: ["1", "4"] }, { m: [["5", "correr", [25.4, 9]], ["d5", "correr", [24.8, 8.4]]] }, { pase: ["4", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Corte de poste alto en el lado débil (Blind pig)", edades: ADULTOS, duracion: 10,
    objetivos: "Castigar la defensa que niega al ala · Puerta atrás con pase desde el poste alto",
    descripcion: "Cuando el defensor niega el pase al ala, un interior sube del lado débil al poste alto (flash) y recibe del base. En ese momento el ala, al que estaban negando, corta por la puerta atrás hacia el aro y recibe del interior. Muy usado contra defensas agresivas en la línea de pase.",
    correcciones: "El ala lleva al defensor hacia fuera antes de cortar · El interior recibe en el poste alto encarado · Pase picado o bombeado al cortador · Sincronizar: el corte empieza cuando el balón llega al poste alto",
    etiquetas: ["blind pig", "puerta atrás", "poste alto", "contra negación"],
    video: yt("blind pig backdoor basketball"),
    montaje: { at: { "1": BASE, "2": ALA_D, "5": POSTE_I, "3": ESQ_I, "4": POSTE_D }, df: { "2": [20.4, 11.4] }, balon: "1", pasos: [
      { m: [["5", "correr", [22.4, 7]]] }, { pase: ["1", "5"] },
      { m: [["2", "correr", [20, 13.2], [24.4, 10], [25.8, 8.2]]] }, { pase: ["5", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Princeton: barbilla y puerta atrás (Chin series)", edades: ADULTOS, duracion: 15,
    objetivos: "Ataque de lecturas con poste alto pasador · Puertas atrás y manos a manos",
    descripcion: "Formación 2-2-1 abierta con el pívot en el poste alto. El base pasa al ala y corta por detrás del poste alto (barbilla, 'chin') hacia la esquina contraria. El ala pasa al poste alto; el jugador del ala contraria, si le niegan, hace puerta atrás y recibe del poste. Si no, el poste alto da mano a mano al ala que sube.",
    correcciones: "El poste alto es el organizador: recibir, encararse y leer · Cortes por la espalda cuando el defensor mira el balón · Espacios amplios entre todos · Pase picado en las puertas atrás",
    etiquetas: ["princeton", "chin", "puerta atrás", "poste alto pasador"],
    video: yt("princeton offense chin series"),
    montaje: { at: { "1": BASE_I, "2": BASE_D, "3": ALA_I, "4": ALA_D, "5": TL }, balon: "1", pasos: [
      { pase: ["1", "3"], m: [["1", "correr", [21.8, 6.2], [26.4, 12.6]]] }, { pase: ["3", "5"] },
      { m: [["4", "correr", [20.4, 13], [24.6, 10.4], [25.8, 8.2]]] }, { pase: ["5", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Triángulo: entrada al poste y cortes (Triangle sideline)", edades: ADULTOS, duracion: 15,
    objetivos: "Formar el triángulo de lado (esquina, ala y poste) · Lecturas tras el pase al poste",
    descripcion: "El base pasa al ala y corta a la esquina de ese lado, formando el triángulo con el ala y el pívot en el poste bajo. El ala pasa al poste. Lecturas: el ala corta por encima (split) con el base de la esquina, se cruzan y el poste busca al que queda libre, o juega 1c1 si los defensores no ayudan. El lado débil mantiene dos jugadores (2-man game).",
    correcciones: "Distancias de 4-5 metros entre los vértices del triángulo · Pase al poste desde el ala, por el lado lejano del defensor · Cortes tras el pase al poste, cruzándose (split) · El poste lee: 1c1, cortador o lado débil",
    etiquetas: ["triángulo", "triangle offense", "poste", "split"],
    video: yt("triangle offense sideline triangle"),
    montaje: { at: { "1": BASE, "2": ALA_D, "5": POSTE_D, "3": ALA_I, "4": CODO_I }, balon: "1", pasos: [
      { pase: ["1", "2"], m: [["1", "correr", [24, 11.4], [27, 13.6]]] }, { pase: ["2", "5"] },
      { m: [["2", "correr", [23.6, 10.6]], ["1", "correr", [24.6, 12], [21, 12]]] }, { pase: ["5", "1"] }, { tiro: "1" },
    ] },
  }),
  sis({
    titulo: "Ataque Swing (bloqueo indirecto y continuidad)", edades: ADULTOS, duracion: 15,
    objetivos: "Continuidad con bloqueos de cambio de lado · Ataque paciente y con buenos tiros",
    descripcion: "Desde una formación 2-2-1, cuando el balón cambia de lado (swing), el jugador del lado del balón baja a bloquear para el que sale de abajo, y el interior pone un bloqueo de espaldas en el lado débil para un corte. Se repite al cambiar el balón de lado. Popularizado por Wisconsin (Bo Ryan).",
    correcciones: "Cambiar el balón de lado con 2 pases rápidos · Bloqueos al defensor, con ángulo · Tras bloquear, abrirse a recibir (el bloqueador suele quedar libre) · No forzar: dar 2-3 vueltas",
    etiquetas: ["swing", "continuidad", "bloqueos indirectos", "NCAA"],
    video: yt("swing offense basketball wisconsin"),
    montaje: { at: { "1": BASE_I, "2": BASE_D, "3": POSTE_I, "4": ALA_D, "5": POSTE_D }, balon: "1", pasos: [
      { pase: ["1", "2"] }, { pase: ["2", "4"] },
      { m: [["2", "bloqueo", [24.6, 10.6]], ["5", "correr", [23.4, 11.4], [21, 10.8]]] }, { pase: ["4", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Apilados en el centro para el tirador (Stack cross)", edades: MAYORES, duracion: 10,
    objetivos: "Liberar al tirador desde la fila central · Elegir lado según su defensor",
    descripcion: "Fila central apilada (stack): interior delante y tirador detrás, en la zona. El tirador elige: salir a un ala por un lado del bloqueo o por el otro, mientras el interior se gira y sella al defensor para el poste bajo. El base pasa al ala del tirador.",
    correcciones: "El tirador mira a su defensor y sale al lado contrario · El bloqueador espera el contacto antes de girarse · Pase cuando el tirador sale del bloqueo · El interior sella y pide en el poste bajo",
    etiquetas: ["stack", "apilados", "tirador", "elegir lado"],
    video: yt("stack set basketball play shooter"),
    montaje: { at: { "1": BASE, "5": [23.6, 7.5], "2": [25.4, 7.5], "3": ESQ_I, "4": ESQ_D }, balon: "1", pasos: [
      { m: [["2", "correr", [24.6, 9.8], [21.4, 12]], ["5", "correr", [24.4, 8.6]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Corte y mano a mano en el poste alto (Split action)", edades: ADULTOS, duracion: 12,
    objetivos: "Dos exteriores juegan alrededor de un interior pasador en el poste alto · Bloqueos y cortes sin balón",
    descripcion: "Pase al interior en el poste alto (o en el codo). Los dos exteriores del lado (pasador y vecino) hacen un 'split': uno bloquea al otro y el bloqueado sale hacia el balón (mano a mano) o corta al aro; el bloqueador, tras bloquear, sale abierto a la línea de 3 (bloquear y salir). Base del ataque de los Warriors.",
    correcciones: "El poste alto sostiene el balón arriba y lee · El bloqueo con buen ángulo; el bloqueador sale tras el contacto · El cortador lee: si el defensor le sigue → al aro; si se queda → mano a mano · Espacio en el lado contrario",
    etiquetas: ["split", "poste alto", "bloquear y salir", "Warriors"],
    video: yt("split action basketball warriors"),
    montaje: { at: { "1": BASE_I, "2": ALA_I, "5": CODO_I, "3": ALA_D, "4": ESQ_D }, balon: "1", pasos: [
      { pase: ["1", "5"] }, { m: [["1", "bloqueo", [21, 3.8]], ["2", "correr", [21.8, 4.8], [24.6, 6.4]]] },
      { m: [["1", "correr", [19.4, 5]]] }, { pase: ["5", "1"] }, { tiro: "1" },
    ] },
  }),
  sis({
    titulo: "Ataque rápido: carril y trailer (Secondary break)", edades: MAYORES, duracion: 12,
    objetivos: "Atacar antes de que la defensa se organice · Entradas del trailer al poste alto o al aro",
    descripcion: "Tras rebote, el base sube por el centro, los aleros corren los carriles hasta las esquinas y el pívot más rápido corre al poste bajo del lado del balón. El trailer (segundo interior) llega a la cabeza: recibe, cambia el balón de lado y el 5 sella para un pase alto-bajo o el trailer pone un directo al ala.",
    correcciones: "Correr los carriles anchos, hasta la esquina · El primer interior corre al aro y sella · El trailer llega detrás del balón, no en línea con él · Si no hay ventaja, encadenar con un directo sin parar",
    etiquetas: ["transición", "ataque rápido", "trailer", "secondary break"],
    video: yt("secondary break trailer basketball"),
    montaje: { vista: "completa", at: { "1": [12, 7.5], "2": [12, 2], "3": [12, 13], "5": [10, 9.6], "4": [8, 7] }, balon: "1", pasos: [
      { m: [["1", "botar", [19.4, 9.2], [21, 11.6]], ["2", "correr", [20, 1.4], [27, 1]], ["3", "correr", [20, 13.8], [27, 14]], ["5", "correr", [25.6, 9.6]], ["4", "correr", [19.4, 7.5]]] },
      { pase: ["1", "4"] }, { pase: ["4", "2"] }, { tiro: "2" },
    ] },
  }),
  // =====================================================================
  // ATAQUE CONTRA ZONA
  // =====================================================================
  sis({
    titulo: "Contra zona 2-3: sobrecarga del lado (Overload)", edades: MAYORES, duracion: 12,
    objetivos: "Superioridad en un lado de la zona · Tiro desde la esquina y el poste corto",
    descripcion: "Cuatro jugadores en un lado de la zona: cabeza, ala, esquina y poste bajo; el quinto en el poste alto contrario. Pase al ala y a la esquina: la zona no puede cubrir a todos. Si el defensor bajo sale a la esquina, el poste bajo queda libre; si no sale, tiro de la esquina. Cambio rápido al otro lado si la zona se desplaza mucho.",
    correcciones: "Posiciones en los huecos entre defensores (no delante de ellos) · Pasar rápido, sin botar · El poste bajo sella al defensor que sale a la esquina · Fintas de pase para mover la zona",
    etiquetas: ["ataque a zona", "2-3", "sobrecarga", "overload"],
    video: yt("overload offense vs 2-3 zone"),
    montaje: { at: { "1": BASE_D, "2": ALA_D, "3": ESQ_D, "5": POSTE_D, "4": CODO_I }, df: { "1": [21.2, 6.2], "2": [21.2, 8.8], "3": [24.4, 4.6], "4": [24.4, 10.4], "5": [25, 7.5] }, balon: "1", pasos: [
      { pase: ["1", "2"] }, { pase: ["2", "3"], m: [["d4", "correr", [26, 12.6]]] }, { pase: ["3", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Contra zona 2-3: poste corto y alto-bajo (Short corner)", edades: MAYORES, duracion: 12,
    objetivos: "Atacar el centro de la zona con poste alto y poste corto · Pase alto-bajo dentro de la zona",
    descripcion: "Un interior en el poste alto (centro de la zona, en la línea de tiro libre) y otro en el 'poste corto' (línea de fondo, entre la esquina y la zona). Pase al poste alto: se encara y lee. Si el central sube, pase al poste corto o al otro lado; si el lateral cierra, pase a la ala. El poste corto también ataca la línea de fondo.",
    correcciones: "El poste alto recibe encarado (pivotar al recibir) · El poste corto se esconde detrás del defensor bajo · Pase al poste alto desde la cabeza o el ala · Los exteriores en los huecos de la zona",
    etiquetas: ["ataque a zona", "2-3", "poste alto", "poste corto"],
    video: yt("attack 2-3 zone high post short corner"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "5": TL, "4": [27.2, 11.2] }, df: { "1": [21.2, 6.2], "2": [21.2, 8.8], "3": [24.4, 4.6], "4": [24.4, 10.4], "5": [25, 7.5] }, balon: "1", pasos: [
      { pase: ["1", "5"] }, { m: [["d5", "correr", [23.4, 7.5]]] }, { pase: ["5", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Contra zona 1-3-1: esquinas y línea de fondo (Baseline runner)", edades: MAYORES, duracion: 12,
    objetivos: "Atacar el punto débil de la 1-3-1: esquinas y línea de fondo · Corredor que cambia de esquina",
    descripcion: "Un jugador corre la línea de fondo de esquina a esquina (baseline runner) según el lado del balón. Dos exteriores en las alas altas, uno en la cabeza y un interior en el poste alto. Pase al ala → pase a la esquina donde llega el corredor → el defensor del fondo tiene que elegir entre la esquina y el poste. Cambiar rápido de lado con el poste alto.",
    correcciones: "El corredor llega a la esquina a la vez que el balón al ala · Pases por encima de la 1-3-1 (alta y larga) · El poste alto se mueve a los huecos entre las líneas · Atacar la esquina que la zona deja libre",
    etiquetas: ["ataque a zona", "1-3-1", "baseline runner", "esquinas"],
    video: yt("attack 1-3-1 zone baseline runner"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "5": TL, "4": [27.4, 6] }, df: { "1": [20.4, 7.5], "2": [22.6, 3.6], "3": [22.6, 11.4], "5": [23.4, 7.5], "4": [26, 7.5] }, balon: "1", pasos: [
      { pase: ["1", "2"], m: [["4", "correr", [27.6, 10.4], [27, 14]]] }, { pase: ["2", "4"] }, { tiro: "4" },
    ] },
  }),
  sis({
    titulo: "Contra zona: bloqueo a la zona en el lado débil (Screen the zone)", edades: ADULTOS, duracion: 12,
    objetivos: "Usar bloqueos indirectos contra la zona · Tiro de 3 del ala débil tras cambio de lado",
    descripcion: "Con el balón en un lado, el interior del lado débil pone un bloqueo de espaldas al defensor bajo de la zona (o al lateral). El balón cambia de lado con un pase rápido (o por encima, skip) y el tirador recibe detrás del bloqueo con espacio. La zona no está acostumbrada a pelear bloqueos.",
    correcciones: "Bloquear al defensor que tiene que salir a tapar al tirador · Pase de lado a lado rápido o por encima · El tirador se coloca en la línea de visión del pasador · Sincronizar el bloqueo con el pase",
    etiquetas: ["ataque a zona", "bloqueo a la zona", "skip", "tiro de 3"],
    video: yt("screen the zone offense basketball"),
    montaje: { at: { "1": BASE, "2": ALA_D, "3": ALA_I, "5": POSTE_I, "4": POSTE_D }, df: { "1": [21.2, 6.2], "2": [21.2, 8.8], "3": [24.4, 4.6], "4": [24.4, 10.4], "5": [25, 7.5] }, balon: "2", pasos: [
      { m: [["5", "bloqueo", [23.8, 4.4]]] }, { pase: ["2", "3"] }, { tiro: "3" },
    ] },
  }),
  sis({
    titulo: "Contra zona: penetrar el hueco y pasar (Gap attack)", edades: MAYORES, duracion: 10,
    objetivos: "Fijar a dos defensores de la zona con un bote · Pase al compañero que queda libre",
    descripcion: "Los exteriores se colocan en los huecos de la zona. El que recibe penetra con 1-2 botes al hueco entre dos defensores (el 'gap'): los dos tienen que salir a él. Pasa al compañero que ha dejado libre el defensor que ha cerrado. Así sucesivamente hasta el tiro abierto.",
    correcciones: "Penetrar al hueco, no al defensor · Parar con un tiempo y pivotar para pasar · Los compañeros se recolocan en la línea de pase · No penetrar sin plan: fijar y pasar",
    etiquetas: ["ataque a zona", "penetrar el hueco", "fijar", "pase extra"],
    video: yt("gap attack zone offense drill"),
    montaje: { at: { "1": BASE_I, "2": BASE_D, "3": ALA_I, "4": ALA_D, "5": POSTE_D }, df: { "1": [21.2, 6.2], "2": [21.2, 8.8], "3": [24.4, 4.6], "4": [24.4, 10.4], "5": [25, 7.5] }, balon: "2", pasos: [
      { m: [["2", "botar", [21.4, 7.6]], ["d1", "correr", [21.6, 7]], ["d2", "correr", [21.8, 8.2]]] }, { pase: ["2", "3"] }, { tiro: "3" },
    ] },
  }),
  // =====================================================================
  // SALIDA DE PRESIÓN
  // =====================================================================
  sis({
    titulo: "Salida de presión 1-4 (Press break)", edades: MAYORES, duracion: 12,
    objetivos: "Superar la presión de toda la pista con pases, no con bote · Ocupar el centro del campo",
    descripcion: "El 4 saca de fondo. 1 y 2 se separan a las esquinas de la zona propia; 3 en el medio campo y 5 en el campo de ataque. Tras recibir uno de los bases, el que saca entra por el centro (pase de seguridad detrás). El balón va al centro (3) siempre que se pueda: desde ahí, pase largo al 5 o a los carriles.",
    correcciones: "Recibir encarados hacia el campo de ataque · No botar hacia las esquinas (trampa) · Pase al centro de la presión · Siempre un jugador detrás del balón como salida de seguridad",
    etiquetas: ["salida de presión", "press break", "toda la pista", "1-4"],
    video: yt("press break 1-4 basketball"),
    montaje: { vista: "completa", at: { "4": [0.2, 9], "1": [4, 4], "2": [4, 11], "3": [11, 7.5], "5": [20, 7.5] }, balon: "4", pasos: [
      { pase: ["4", "1"] }, { m: [["4", "correr", [3, 7.5]], ["3", "correr", [9, 6]]] }, { pase: ["1", "3"] }, { pase: ["3", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Salida de presión en diamante contra 1-2-1-1", edades: MAYORES, duracion: 12,
    objetivos: "Romper la presión de trampa con cambio de lado · Atacar en superioridad tras superar la trampa",
    descripcion: "Contra la presión 1-2-1-1 (trampa en el primer pase): sacador, receptor en la esquina, un jugador en el centro (medio de la presión), otro en la banda contraria y uno largo. Tras el primer pase, cuando llega la trampa, el balón va al centro o vuelve al sacador, que cambia de lado. El centro gira y ataca: 3c2 hacia la canasta.",
    correcciones: "Pasar antes de que se cierre la trampa (no botar dentro de ella) · El centro se mueve a la vista del balón · Pase por encima, con fuerza · Tras superar la presión, atacar sin parar",
    etiquetas: ["salida de presión", "1-2-1-1", "trampa", "diamante"],
    video: yt("break 1-2-1-1 press diamond"),
    montaje: { vista: "completa", at: { "4": [0.2, 6], "1": [3, 12], "3": [7, 7.5], "2": [10, 2], "5": [18, 7.5] }, df: { "1": [2, 7.5], "2": [4.6, 11], "3": [8.4, 9.4] }, balon: "4", pasos: [
      { pase: ["4", "1"] }, { m: [["d1", "correr", [3, 10.8]]] }, { pase: ["1", "3"] }, { pase: ["3", "5"] }, { tiro: "5" },
    ] },
  }),
  // =====================================================================
  // SAQUES DE FONDO (BLOB)
  // =====================================================================
  sis({
    titulo: "Saque de fondo: fila (Stack / Line)", edades: MAYORES, duracion: 10,
    objetivos: "Saque seguro con varias opciones desde una fila · Tiro de 3 o canasta fácil",
    descripcion: "Los cuatro jugadores en fila en la línea de tiro libre. A la señal: el primero (5) corta al aro, el segundo (2) sale hacia la esquina del lado del sacador, el tercero (3) sale hacia la esquina contraria y el cuarto (1) se abre a la cabeza como pase de seguridad. El sacador elige: 5 al aro, 2 o 3 en la esquina, o 1 arriba.",
    correcciones: "Salir todos a la vez, con la palmada del sacador · Cortes con cambio de ritmo · El sacador mira primero al aro · Siempre un pase de seguridad arriba",
    etiquetas: ["saque de fondo", "BLOB", "fila", "stack"],
    video: yt("stack baseline out of bounds play"),
    montaje: { at: { "4": FONDO, "5": [24.6, 7.5], "2": [23.6, 7.5], "3": [22.6, 7.5], "1": [21.6, 7.5] }, balon: "4", pasos: [
      { m: [["5", "correr", [26.2, 8.4]], ["2", "correr", [25, 11.4], [27, 13.6]], ["3", "correr", [24.4, 3.6], [27, 1.4]], ["1", "correr", [19.4, 7.5]]] },
      { pase: ["4", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo: bloqueo al sacador (Box screen the inbounder)", edades: ADULTOS, duracion: 10,
    objetivos: "Que el sacador quede libre tras sacar · Engañar a la defensa con la primera opción",
    descripcion: "Formación en caja. Primera acción: bloqueo cruzado entre los postes bajos y salida de los de arriba (como la caja normal). El sacador pasa a la esquina o a la cabeza y entra al campo: un interior le pone un bloqueo y recibe de nuevo para tiro o entrada. Muy efectivo porque el defensor del sacador suele mirar el balón.",
    correcciones: "El sacador entra al campo justo tras pasar · Bloquear al defensor del sacador por la espalda · El que tiene el balón devuelve rápido · Los demás vacían el lado",
    etiquetas: ["saque de fondo", "BLOB", "caja", "bloqueo al sacador"],
    video: yt("box baseline out of bounds screen the inbounder"),
    montaje: { at: { "1": FONDO, "2": CODO_D, "3": CODO_I, "4": POSTE_D, "5": POSTE_I }, balon: "1", pasos: [
      { m: [["2", "correr", [24.4, 12.4], [27, 13.4]]] }, { pase: ["1", "2"] },
      { m: [["1", "correr", [26.2, 9.4]], ["4", "bloqueo", [25.6, 8.4]]] }, { m: [["1", "correr", [24.4, 6.6]]] }, { pase: ["2", "1"] }, { tiro: "1" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo: ascensor en la línea (Elevator BLOB)", edades: ADULTOS, duracion: 10,
    objetivos: "Tiro de 3 del tirador que pasa entre dos bloqueadores · Saque para final de partido",
    descripcion: "Dos interiores juntos a la altura del codo (como unas puertas). El tirador empieza bajo el aro y corre entre los dos; en cuanto pasa, los interiores se juntan (cierran las puertas) y su defensor se queda atrapado. El tirador recibe arriba del arco para tiro de 3.",
    correcciones: "Las puertas se cierran justo cuando pasa el tirador · El tirador sale a tope, pegado a los bloqueadores · El sacador espera a que las puertas se cierren · Pase al pecho para tiro inmediato",
    etiquetas: ["saque de fondo", "BLOB", "ascensor", "tiro de 3", "final de partido"],
    video: yt("elevator doors baseline out of bounds"),
    montaje: { at: { "1": FONDO, "4": [22.2, 6.8], "5": [22.2, 8.2], "2": [25.6, 7.5], "3": ESQ_I }, balon: "1", pasos: [
      { m: [["2", "correr", [23.6, 7.5], [20.4, 7.5]]] }, { m: [["4", "bloqueo", [22, 7.2]], ["5", "bloqueo", [22, 7.8]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo: diamante con globo (Diamond lob)", edades: ADULTOS, duracion: 10,
    objetivos: "Canasta fácil del interior con pase bombeado · Bloqueo de espaldas en el saque",
    descripcion: "Formación en diamante: uno en la cabeza de la zona, dos en los codos y uno en el aro. El jugador de la cabeza baja a bloquear de espaldas al defensor del interior del codo, que corta hacia el aro y recibe un pase bombeado (globo) del sacador. Si la defensa cambia, el bloqueador sale hacia la esquina.",
    correcciones: "Bloqueo de espaldas firme, sin moverse · El cortador espera el bloqueo y sale rápido · Globo alto, al lado del aro contrario al defensor · Saltar a por el balón en el punto más alto",
    etiquetas: ["saque de fondo", "BLOB", "diamante", "globo", "alley"],
    video: yt("baseline out of bounds lob play diamond"),
    montaje: { at: { "1": FONDO, "2": TL, "4": CODO_I, "5": CODO_D, "3": [26.6, 6.6] }, df: { "5": [23.4, 9] }, balon: "1", pasos: [
      { m: [["2", "bloqueo", [23.4, 8.6]]] }, { m: [["5", "correr", [25.6, 6.6]]] }, { pase: ["1", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo contra zona: hombro y esquina (BLOB vs zone)", edades: MAYORES, duracion: 10,
    objetivos: "Saque contra zona que busca la esquina y el poste · Bloquear al defensor de la esquina",
    descripcion: "Contra zona: un jugador en la esquina del lado del sacador, un interior en el poste bajo de ese lado, otro jugador en el codo y un pase de seguridad arriba. El interior bloquea al defensor bajo de la zona por dentro y el jugador de la esquina recibe para tiro. Segunda opción: el interior se da la vuelta y sella para recibir al lado del aro.",
    correcciones: "Bloquear al defensor que tiene que salir a la esquina · El tirador ya preparado en la esquina · El sacador lee primero el sello del interior · Seguridad arriba siempre",
    etiquetas: ["saque de fondo", "BLOB", "contra zona", "esquina"],
    video: yt("baseline out of bounds play vs zone"),
    montaje: { at: { "1": FONDO, "2": ESQ_D, "5": POSTE_D, "4": CODO_I, "3": BASE }, df: { "4": [24.6, 11], "5": [25.2, 7.5] }, balon: "1", pasos: [
      { m: [["5", "bloqueo", [24.8, 11.4]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo: cremallera hacia el sacador (Zipper BLOB)", edades: MAYORES, duracion: 10,
    objetivos: "Liberar al mejor tirador cerca del sacador · Opción de continuación con el bloqueador",
    descripcion: "El tirador empieza en el poste bajo contrario al sacador. Sube por el carril (cremallera) usando el bloqueo de un interior en el codo y sale al ala del lado del sacador. El bloqueador, tras bloquear, rueda hacia el aro como segunda opción. Opción de seguridad: base en la cabeza.",
    correcciones: "El tirador lleva al defensor al aro antes de subir · Bloqueo con ángulo hacia el aro · El bloqueador rueda tras el contacto · Pase al pecho del tirador en el ala",
    etiquetas: ["saque de fondo", "BLOB", "zipper", "cremallera"],
    video: yt("zipper baseline out of bounds play"),
    montaje: { at: { "1": FONDO, "2": POSTE_I, "5": CODO_D, "4": ESQ_I, "3": BASE }, balon: "1", pasos: [
      { m: [["5", "bloqueo", [23.4, 9.2]], ["2", "correr", [24.8, 6.8], [23.8, 9.6], [21.2, 12]]] }, { pase: ["1", "2"] },
      { m: [["5", "correr", [25.6, 8.2]]] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de fondo: cortina para la esquina (Line flare)", edades: ADULTOS, duracion: 10,
    objetivos: "Tiro de 3 en la esquina contraria con bloqueo de salida · Final de partido cuando se necesita un triple",
    descripcion: "Fila en el lado contrario del sacador. El primero de la fila (interior) pone un bloqueo de salida al tirador, que se abre hacia la esquina contraria del sacador. Pase largo cruzado por encima o, si la defensa cambia, pase al interior que corta al aro tras bloquear.",
    correcciones: "Pase cruzado con fuerza y por encima de la defensa · El tirador ya colocado al recibir · El bloqueador corta al aro tras bloquear · Ensayar la distancia del pase",
    etiquetas: ["saque de fondo", "BLOB", "flare", "tiro de 3"],
    video: yt("baseline out of bounds flare play corner three"),
    montaje: { at: { "1": FONDO, "4": [24.8, 4.8], "2": [24.8, 3.6], "5": CODO_D, "3": BASE }, balon: "1", pasos: [
      { m: [["4", "bloqueo", [25.4, 3]], ["2", "correr", [26.4, 2.4], [27, 1]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  // =====================================================================
  // SAQUES DE BANDA (SLOB)
  // =====================================================================
  sis({
    titulo: "Saque de banda: fila para el tirador (SLOB stack)", edades: MAYORES, duracion: 10,
    objetivos: "Saque de banda seguro con salida del tirador · Opción de pase al interior",
    descripcion: "Saque desde la banda en campo de ataque. Fila de dos (interior delante, tirador detrás) en el ala del lado del saque. El tirador elige salida hacia el sacador (ala alta) o hacia la esquina. El interior, tras el contacto, se gira y busca el poste bajo. Base como seguridad en la cabeza.",
    correcciones: "El tirador lee al defensor y sale al lado contrario · El interior sella tras el bloqueo · El sacador no pasa en el centro de la defensa · Seguridad arriba siempre",
    etiquetas: ["saque de banda", "SLOB", "fila", "tirador"],
    video: yt("sideline out of bounds stack play"),
    montaje: { at: { "1": BANDA, "5": [22.6, 11.6], "2": [23.4, 11.2], "3": BASE, "4": POSTE_I }, balon: "1", pasos: [
      { m: [["2", "correr", [24.8, 12.8], [27, 14]], ["5", "correr", [24.6, 10]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de banda: caja con bloqueo cruzado (SLOB box)", edades: MAYORES, duracion: 10,
    objetivos: "Varias opciones desde la caja en saque de banda · Pase al interior o tiro tras bloqueo",
    descripcion: "Caja en el lado del saque: dos jugadores a la altura de la línea de 3 y dos en el poste bajo y la esquina. Primera acción: el jugador alto bloquea en diagonal al de abajo, que sube hacia el balón. Segunda: el bloqueador sale tras el bloqueo hacia el aro (bloquear y cortar). Seguridad: el otro alto se abre a la cabeza.",
    correcciones: "Bloqueos al defensor y con ángulo · Salidas a tope tras el contacto · El sacador mira primero lejos (aro) y luego cerca · No pasar flotado a la banda",
    etiquetas: ["saque de banda", "SLOB", "caja", "bloqueo"],
    video: yt("sideline out of bounds box play"),
    montaje: { at: { "1": BANDA, "2": [21.4, 11], "3": BASE_D, "4": POSTE_D, "5": ESQ_D }, balon: "1", pasos: [
      { m: [["2", "bloqueo", [24.6, 10]], ["4", "correr", [24.6, 10.8], [21.8, 12.6]]] }, { pase: ["1", "4"] },
      { m: [["2", "correr", [26, 8.4]]] }, { pase: ["4", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de banda: globo a la puerta atrás (SLOB lob)", edades: ADULTOS, duracion: 10,
    objetivos: "Castigar la negación del pase con un globo al aro · Saque para canasta rápida",
    descripcion: "Un exterior sube hacia el sacador como si fuera a recibir (la defensa niega). En ese momento un interior le pone un bloqueo de espaldas y el exterior corta hacia el aro para recibir un globo. Si la defensa cambia, el interior sale hacia el balón y recibe de cara.",
    correcciones: "Vender la salida hacia el balón · Bloqueo de espaldas sin moverse · Globo al lado de fuera del aro · Saltar en el punto más alto",
    etiquetas: ["saque de banda", "SLOB", "globo", "puerta atrás"],
    video: yt("sideline out of bounds lob play"),
    montaje: { at: { "1": BANDA, "2": [22.6, 11], "5": [21, 9.4], "3": BASE_I, "4": ESQ_I }, df: { "2": [21.8, 12] }, balon: "1", pasos: [
      { m: [["2", "correr", [21.4, 12.2]]] }, { m: [["5", "bloqueo", [22.2, 12.6]], ["2", "correr", [23.2, 11.6], [25.8, 8.4]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
  sis({
    titulo: "Saque de banda en el último segundo: bloqueo al pasador y pase largo", edades: ADULTOS, duracion: 10,
    objetivos: "Tiro decisivo con muy poco tiempo · Opción del sacador tras pasar",
    descripcion: "Saque en campo de ataque con 2-3 segundos. Un interior sube a recibir el primer pase en la cabeza. El sacador entra al campo usando un bloqueo de otro interior y recibe de vuelta para tiro. Alternativa: pase largo del interior al tirador que sale de un bloqueo en el lado contrario.",
    correcciones: "Ensayarlo con el reloj: 1 pase y tiro, o 2 pases máximo · El sacador entra en el momento del pase · Bloqueo al defensor del sacador · Recibir ya en posición de tiro",
    etiquetas: ["saque de banda", "SLOB", "último segundo", "final de partido"],
    video: yt("last second sideline out of bounds play"),
    montaje: { at: { "1": BANDA, "4": TL, "5": [21.8, 12.6], "2": ESQ_I, "3": ALA_I }, balon: "1", pasos: [
      { m: [["4", "correr", [19.6, 9.6]]] }, { pase: ["1", "4"] },
      { m: [["5", "bloqueo", [20.6, 13.4]], ["1", "correr", [20.4, 13.6], [20, 11.6]]] }, { pase: ["4", "1"] }, { tiro: "1" },
    ] },
  }),
  sis({
    titulo: "Saque de banda: cremallera y directo (SLOB zipper into pick & roll)", edades: ADULTOS, duracion: 10,
    objetivos: "Saque de banda que acaba en un bloqueo directo con ventaja · Organizar el ataque tras tiempo muerto",
    descripcion: "El base sube por el carril con un bloqueo de cremallera (zipper) del interior y recibe en el ala alta. El interior que ha bloqueado sube inmediatamente a poner un bloqueo directo al base. El sacador entra al campo y se abre a la esquina del lado del balón.",
    correcciones: "Recibir encarado al aro · El bloqueo directo llega sin pausa tras el saque · El sacador llena la esquina rápido · Espaciado en el lado contrario",
    etiquetas: ["saque de banda", "SLOB", "zipper", "bloqueo directo", "ATO"],
    video: yt("sideline out of bounds zipper pick and roll ATO"),
    montaje: { at: { "1": [25.6, 10], "5": [23.4, 10.2], "3": BANDA, "2": ESQ_I, "4": ALA_I }, balon: "3", pasos: [
      { m: [["1", "correr", [23.6, 11.4], [20.6, 11.8]]] }, { pase: ["3", "1"], m: [["3", "correr", [24, 14], [27, 14]]] },
      { m: [["5", "bloqueo", [20.4, 10.8]], ["1", "botar", [20.2, 9.4], [21.6, 7.8]]] }, { m: [["5", "correr", [25.4, 9]]] }, { pase: ["1", "5"] }, { tiro: "5" },
    ] },
  }),
  sis({
    titulo: "Saque de banda: doble bloqueo vertical (SLOB Iverson-ladder)", edades: ADULTOS, duracion: 10,
    objetivos: "Liberar al tirador subiendo por dos bloqueos verticales · Saque de banda a campo de ataque",
    descripcion: "Dos interiores en línea en el carril del lado del saque (uno en el poste bajo y otro en el codo). El tirador, debajo del aro, sube por los dos bloqueos (escalera) hasta el ala alta del lado del saque. Si su defensor le sigue, el tirador corta hacia el aro (curl) por dentro del segundo bloqueo.",
    correcciones: "Bloqueadores separados y firmes · El tirador lee al defensor en el segundo bloqueo · Pase al pecho para tiro · Opción del bloqueador que rueda",
    etiquetas: ["saque de banda", "SLOB", "doble bloqueo", "tirador"],
    video: yt("sideline out of bounds double screen play shooter"),
    montaje: { at: { "1": BANDA, "4": POSTE_D, "5": CODO_D, "2": [26.4, 7.5], "3": ALA_I }, balon: "1", pasos: [
      { m: [["2", "correr", [25.4, 8.2], [23.8, 8.8], [21, 11.4]]] }, { pase: ["1", "2"] }, { tiro: "2" },
    ] },
  }),
];
