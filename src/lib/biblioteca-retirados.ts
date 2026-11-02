// Ejercicios de la biblioteca inicial que se han retirado o renombrado (al sincronizar se aplican en la base de datos).
// Retirados: bote sin defensa ni rotaciones, variantes con la misma pizarra que otro ejercicio (shell a medio ritmo / en vivo,
// cierres con penalización, defensa en competición, directo 4c4 = 5c5) y presiones de 5 en formatos que no tienen sentido.
export const RETIRADOS: string[] = [
  "Movilidad y bote en conos",
  "Cambios de ritmo y de dirección (1c0)",
  "Calentamiento dinámico con balón (activación)",
  "Manejo de dos balones (estático y en movimiento)",
  "4c3 con defensor que llega tarde · solo pase (sin bote)",
  "5c4 y 5c5 (el último defensor entra tarde) · solo pase (sin bote)",
  "Transición de 11 jugadores (11-man break) · defensa en inferioridad",
  "Balance defensivo tras tiro (4c4 + 1) · defensa en inferioridad",
  "Balance defensivo tras tiro (4c4 + 1) · solo pase (sin bote)",
  "Primer pase tras rebote en menos de 2 segundos · defensa en inferioridad",
  "Primer pase tras rebote en menos de 2 segundos · solo pase (sin bote)",
  "Presión 2-2-1 en 3c3",
  "Superar la presión 2-2-1 en 3c3",
  "Presión 2-2-1 en 4c4",
  "Superar la presión 2-2-1 en 4c4",
  "Presión 1-2-1-1 en 3c3",
  "Superar la presión 1-2-1-1 en 3c3",
  "Presión 1-2-1-1 en 4c4",
  "Superar la presión 1-2-1-1 en 4c4",
  "Presión 1-3-1 de medio campo en 3c3",
  "Superar la presión 1-3-1 de medio campo en 3c3",
  "Presión 1-3-1 de medio campo en 4c4",
  "Superar la presión 1-3-1 de medio campo en 4c4",
  "2c1 (penetrador y tirador): pase extra obligatorio",
  "Calentamiento dinámico con 2 balones",
  "Bote de reacción por parejas",
  "Bote: cambio por delante (crossover) estático con cono",
  "Bote: entre las piernas estático con cono",
  "Bote: por la espalda estático con cono",
  "Bote: amago de parada (hesitation) estático con cono",
  "Bote: dentro-fuera (in and out) estático con cono",
  "Bote: reverso (spin) estático con cono",
  "Bote: bote de retroceso (retreat dribble) estático con cono",
  "Bote: bote de recogida (snatch back) estático con cono",
  "Bote: con dos balones estático con cono",
  "Defensa: zigzag defensivo con balón (con ayuda)",
  "Defensa: parar el bote y defender el pase (con ayuda)",
  "Defender el directo con defensa atrás (drop): 4c4 con lado débil",
  "Defender el directo con salir y volver (show / hedge): 4c4 con lado débil",
  "Defender el directo con cambio de asignación (switch): 4c4 con lado débil",
  "Defender el directo con mandar a la banda (ice / down): 4c4 con lado débil",
  "Defender el directo con trampa al que bota (blitz): 4c4 con lado débil",
  "Defender el directo con pasar por debajo (under): 4c4 con lado débil",
  "Defender el directo con subir a la altura del bloqueo (level / up to touch): 4c4 con lado débil",
  "Shell 4c4: desplazamientos con cada pase (en vivo)",
  "Shell 5c5: desplazamientos con cada pase (en vivo)",
  "Shell 4c4: ayuda y recuperación ante penetración (en vivo)",
  "Shell 5c5: ayuda y recuperación ante penetración (en vivo)",
  "Shell 4c4: defender el pase al poste (en vivo)",
  "Shell 5c5: defender el pase al poste (en vivo)",
  "Shell 4c4: cierres tras pase por encima (en vivo)",
  "Shell 5c5: cierres tras pase por encima (en vivo)",
  "Shell 4c4: defender bloqueos indirectos (en vivo)",
  "Shell 5c5: defender bloqueos indirectos (en vivo)",
  "Shell 4c4: defender el bloqueo directo con rotación (en vivo)",
  "Shell 5c5: defender el bloqueo directo con rotación (en vivo)",
  "Shell 4c4: rotación en X (X-out) tras pase (en vivo)",
  "Shell 5c5: rotación en X (X-out) tras pase (en vivo)",
  "Shell 4c4: defender el mano a mano (en vivo)",
  "Shell 5c5: defender el mano a mano (en vivo)",
  "Cierres 1c1 desde la pintura (con penalización por falta)",
  "Cierres en la esquina contra la línea de fondo (con penalización por falta)",
  "Cierre y caída: 2c2 desde la ayuda (con penalización por falta)",
  "Cierre largo tras skip (3c3) (con penalización por falta)",
  "Cierre con tapón de atrás (contest) (con penalización por falta)",
  "Cierres en cadena (rueda de 4) (con penalización por falta)",
  "Defensa: zigzag defensivo con balón (competición)",
  "Defensa: negar la línea de fondo (competición)",
  "Defensa: parar el bote y defender el pase (competición)",
  "Defensa: defender al tirador tras bote (competición)",
  "Defensa: defensa del poste por delante (competición)",
  "Defensa: defender el corte (no dejar pasar por delante) (competición)"
];
/** Títulos antiguos → nuevos */
export const RENOMBRADOS: [string, string][] = [
  [
    "Defensa en zona 2-3: defender el poste alto y el poste corto",
    "Defensa en zona 2-3: defender el poste alto y el poste bajo"
  ],
  [
    "Defensa en zona 3-2: defender el poste alto y el poste corto",
    "Defensa en zona 3-2: defender el poste alto y el poste bajo"
  ],
  [
    "Defensa en zona 1-3-1: defender el poste alto y el poste corto",
    "Defensa en zona 1-3-1: defender el poste alto y el poste bajo"
  ],
  [
    "Defensa en zona zona de emparejamientos (match-up): defender el poste alto y el poste corto",
    "Defensa en zona de emparejamientos (match-up): defender el poste alto y el poste bajo"
  ],
  [
    "Defensa en zona zona de emparejamientos (match-up): desplazamientos con cada pase",
    "Defensa en zona de emparejamientos (match-up): desplazamientos con cada pase"
  ],
  [
    "Defensa en zona zona de emparejamientos (match-up): salir a la esquina y recuperar",
    "Defensa en zona de emparejamientos (match-up): salir a la esquina y recuperar"
  ],
  [
    "Defensa en zona zona de emparejamientos (match-up): cerrar el rebote desde la zona",
    "Defensa en zona de emparejamientos (match-up): cerrar el rebote desde la zona"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): penetrar al hueco y pasar",
    "Atacar la zona de emparejamientos (match-up): penetrar al hueco y pasar"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): poste alto encarado",
    "Atacar la zona de emparejamientos (match-up): poste alto encarado"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): pases por encima de la zona",
    "Atacar la zona de emparejamientos (match-up): pases por encima de la zona"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): corredor de línea de fondo",
    "Atacar la zona de emparejamientos (match-up): corredor de línea de fondo"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): bloqueos a la zona",
    "Atacar la zona de emparejamientos (match-up): bloqueos a la zona"
  ],
  [
    "Atacar la zona zona de emparejamientos (match-up): rebote contra zona",
    "Atacar la zona de emparejamientos (match-up): rebote contra zona"
  ],
  [
    "Shell 4c4: desplazamientos con cada pase (a medio ritmo)",
    "Shell 4c4: desplazamientos con cada pase"
  ],
  [
    "Shell 5c5: desplazamientos con cada pase (a medio ritmo)",
    "Shell 5c5: desplazamientos con cada pase"
  ],
  [
    "Shell 4c4: ayuda y recuperación ante penetración (a medio ritmo)",
    "Shell 4c4: ayuda y recuperación ante penetración"
  ],
  [
    "Shell 5c5: ayuda y recuperación ante penetración (a medio ritmo)",
    "Shell 5c5: ayuda y recuperación ante penetración"
  ],
  [
    "Shell 4c4: defender el pase al poste (a medio ritmo)",
    "Shell 4c4: defender el pase al poste"
  ],
  [
    "Shell 5c5: defender el pase al poste (a medio ritmo)",
    "Shell 5c5: defender el pase al poste"
  ],
  [
    "Shell 4c4: cierres tras pase por encima (a medio ritmo)",
    "Shell 4c4: cierres tras pase por encima"
  ],
  [
    "Shell 5c5: cierres tras pase por encima (a medio ritmo)",
    "Shell 5c5: cierres tras pase por encima"
  ],
  [
    "Shell 4c4: defender bloqueos indirectos (a medio ritmo)",
    "Shell 4c4: defender bloqueos indirectos"
  ],
  [
    "Shell 5c5: defender bloqueos indirectos (a medio ritmo)",
    "Shell 5c5: defender bloqueos indirectos"
  ],
  [
    "Shell 4c4: defender el bloqueo directo con rotación (a medio ritmo)",
    "Shell 4c4: defender el bloqueo directo con rotación"
  ],
  [
    "Shell 5c5: defender el bloqueo directo con rotación (a medio ritmo)",
    "Shell 5c5: defender el bloqueo directo con rotación"
  ],
  [
    "Shell 4c4: rotación en X (X-out) tras pase (a medio ritmo)",
    "Shell 4c4: rotación en X (X-out) tras pase"
  ],
  [
    "Shell 5c5: rotación en X (X-out) tras pase (a medio ritmo)",
    "Shell 5c5: rotación en X (X-out) tras pase"
  ],
  [
    "Shell 4c4: defender el mano a mano (a medio ritmo)",
    "Shell 4c4: defender el mano a mano"
  ],
  [
    "Shell 5c5: defender el mano a mano (a medio ritmo)",
    "Shell 5c5: defender el mano a mano"
  ]
];
