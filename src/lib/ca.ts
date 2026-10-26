// Traducció al català de la interfície (castellà → català).
// La fa el component <Traductor/> sobre el text que es veu: només canvia textos que coincideixen
// exactament amb una clau (els noms, les notes i els exercicis que escriu cadascú no es toquen).

export const CA: Record<string, string> = {
  // ---------- Menú, capçalera i comuns ----------
  "Inicio": "Inici", "Equipos": "Equips", "Jugadores": "Jugadors", "Calendario": "Calendari", "Entrenamientos": "Entrenaments",
  "Partidos": "Partits", "Scouting": "Scouting", "Ejercicios": "Exercicis", "Biblioteca": "Biblioteca", "Pizarra": "Pissarra",
  "Planificaciones": "Planificacions", "Club": "Club", "Vídeo": "Vídeo", "Avisos": "Avisos", "Cuenta": "Compte", "Salir": "Sortir",
  "Mi cuenta": "El meu compte", "Equipo activo": "Equip actiu", "— Elige equipo —": "— Tria equip —",
  "Guardar": "Desa", "Guardado.": "Desat.", "Guardando…": "Desant…", "Cancelar": "Cancel·la", "Cerrar": "Tanca", "Borrar": "Esborra",
  "Editar": "Edita", "Añadir": "Afegeix", "Crear": "Crea", "Nuevo": "Nou", "Copiar": "Copia", "Copiado": "Copiat", "Copiada": "Copiada",
  "Quitar": "Treu", "Filtrar": "Filtra", "Quitar filtros": "Treu els filtres", "Subir": "Puja", "Bajar": "Baixa", "Todo": "Tot", "Todos": "Tots",
  "Total": "Total", "Recargar": "Recarrega", "Reintentar": "Torna-ho a provar", "Cambiar": "Canvia", "Asignar": "Assigna", "Instalar": "Instal·la",
  "Descargar": "Descarrega", "Compartir": "Comparteix", "Pista": "Pista", "Fecha": "Data", "Día": "Dia", "Días": "Dies", "Hora": "Hora",
  "Desde": "Des de", "Hasta": "Fins a", "Título": "Títol", "Título (opcional)": "Títol (opcional)", "Nombre": "Nom", "Apellidos": "Cognoms",
  "Notas": "Notes", "Notas:": "Notes:", "Descripción": "Descripció", "Categoría": "Categoria", "Material": "Material", "Material:": "Material:",
  "Minutos": "Minuts", "Equipo": "Equip", "Jugador": "Jugador", "Rival": "Rival", "Temporada": "Temporada", "Temporadas": "Temporades",
  "Error": "Error", "Error inesperado.": "Error inesperat.", "Algo ha fallado": "Alguna cosa ha fallat", "Sin título": "Sense títol",
  "Visible": "Visible", "Solo yo": "Només jo", "Para": "Per a", "Dónde": "On", "En casa": "A casa", "Fuera": "Fora", "Casa": "Casa",
  "o": "o", "vs": "vs", "Del club": "Del club", "Todo el club": "Tot el club", "Próximamente": "Properament", "Sin categoría": "Sense categoria",
  "Turó Coach · CB Turó de la Peira": "Turó Coach · CB Turó de la Peira",

  // ---------- Inici ----------
  "Temporada del 10è aniversari": "Temporada del 10è aniversari", "Trabajando con": "Treballant amb",
  "Elige un equipo arriba para trabajar con él.": "Tria un equip a dalt per treballar-hi.",
  "Equipos de la temporada y su staff": "Equips de la temporada i el seu staff", "Plantilla y fichas del equipo activo": "Plantilla i fitxes de l'equip actiu",
  "Prepara la sesión y pasa lista": "Prepara la sessió i passa llista", "La biblioteca del club y la tuya": "La biblioteca del club i la teva",
  "Dibuja y anima jugadas al momento": "Dibuixa i anima jugades al moment", "Partidos, entrenos, eventos y cumpleaños": "Partits, entrenaments, esdeveniments i aniversaris",
  "Resultados y convocatorias": "Resultats i convocatòries", "Objetivos de temporada en árbol": "Objectius de temporada en arbre",
  "Liga, rivales, estadísticas y fichas": "Lliga, rivals, estadístiques i fitxes", "Etiqueta acciones por categorías": "Etiqueta accions per categories",
  "Ejercicios del club listos para usar": "Exercicis del club a punt per fer servir", "Ejercicios y sistemas": "Exercicis i sistemes",
  "Instala Turó Coach": "Instal·la Turó Coach", "Instalar Turó Coach": "Instal·la Turó Coach", "Instalar la app": "Instal·la l'app",
  "Tenla a mano como una app más, con su icono.": "Tingues-la a mà com una app més, amb la seva icona.",
  "Ya la estás usando como app instalada.": "Ja la fas servir com a app instal·lada.",
  "Se abre en su propia ventana, con el escudo como icono, en el móvil, la tablet o el ordenador.": "S'obre en una finestra pròpia, amb l'escut com a icona, al mòbil, la tauleta o l'ordinador.",
  "Abre esta web en Chrome, Edge o Safari para instalarla.": "Obre aquest web a Chrome, Edge o Safari per instal·lar-lo.",
  "Hay una versión nueva de la app": "Hi ha una versió nova de l'app", "Recarga para seguir trabajando con la última versión.": "Recarrega per continuar treballant amb l'última versió.",

  // ---------- Accés i compte ----------
  "Entrar": "Entra", "Entrando…": "Entrant…", "Email": "Correu", "Contraseña": "Contrasenya", "Enviarme un enlace (sin contraseña)": "Envia'm un enllaç (sense contrasenya)",
  "Acceso solo por invitación del coordinador del club.": "Accés només amb invitació del coordinador del club.",
  "Te hemos enviado un enlace de acceso al correo.": "T'hem enviat un enllaç d'accés al correu.",
  "Email o contraseña incorrectos": "Correu o contrasenya incorrectes", "Este email aún no está confirmado": "Aquest correu encara no està confirmat",
  "Ese email no tiene acceso. Pide invitación al coordinador.": "Aquest correu no té accés. Demana invitació al coordinador.",
  "El enlace ha caducado. Pide otro.": "L'enllaç ha caducat. Demana'n un altre.", "No se ha podido entrar con ese enlace.": "No s'ha pogut entrar amb aquest enllaç.",
  "El enlace ha caducado o ya se ha usado. Pide otra invitación o un enlace nuevo.": "L'enllaç ha caducat o ja s'ha fet servir. Demana una altra invitació o un enllaç nou.",
  "No se ha podido iniciar la sesión. Vuelve a intentarlo.": "No s'ha pogut iniciar la sessió. Torna-ho a provar.",
  "Cambiar contraseña": "Canvia la contrasenya", "Nueva contraseña": "Contrasenya nova", "Nueva contraseña (mín. 8 caracteres)": "Contrasenya nova (mín. 8 caràcters)",
  "Repite la contraseña": "Repeteix la contrasenya", "Contraseña cambiada.": "Contrasenya canviada.", "Guardar nombre": "Desa el nom", "Nombre guardado.": "Nom desat.",
  "Escribe un nombre.": "Escriu un nom.", "La contraseña debe tener al menos 8 caracteres.": "La contrasenya ha de tenir almenys 8 caràcters.",
  "Las dos contraseñas no coinciden.": "Les dues contrasenyes no coincideixen.", "No se ha podido guardar el nombre:": "No s'ha pogut desar el nom:",
  "¡Bienvenido! Ponte una contraseña para entrar la próxima vez.": "Benvingut! Posa't una contrasenya per entrar la propera vegada.",
  "Idioma": "Idioma", "Sin sesión": "Sense sessió",

  // ---------- Equips, jugadors i club ----------
  "Añadir equipo": "Afegeix equip", "Asignar entrenador…": "Assigna entrenador…", "Sin entrenador asignado": "Sense entrenador assignat",
  "Entrenador": "Entrenador", "Entrenadores": "Entrenadors", "Ayudante": "Ajudant", "Delegado": "Delegat", "Coordinador": "Coordinador",
  "Congelar": "Congela", "Descongelar": "Descongela", "Congelado": "Congelat", "Trabajar con este": "Treballa amb aquest", "Borrar equipo": "Esborra l'equip",
  "Aún no hay equipos esta temporada. Crea el primero arriba.": "Encara no hi ha equips aquesta temporada. Crea'n el primer a dalt.",
  "El coordinador aún no ha creado equipos.": "El coordinador encara no ha creat equips.", "Primero elige un equipo": "Primer tria un equip",
  "Nuevo jugador": "Jugador nou", "Buscar jugador…": "Cerca jugador…", "Incorporar": "Incorpora", "Incorporar jugador existente": "Incorpora un jugador existent",
  "Para jugadores de otros equipos o de la temporada pasada.": "Per a jugadors d'altres equips o de la temporada passada.",
  "Aún no hay jugadores en este equipo.": "Encara no hi ha jugadors en aquest equip.", "El equipo no tiene jugadores.": "L'equip no té jugadors.",
  "Añadido ✓ Puedes añadir el siguiente.": "Afegit ✓ Pots afegir el següent.", "Dorsal": "Dorsal", "Posición": "Posició", "Posición (base, alero…)": "Posició (base, aler…)",
  "Fecha de nacimiento": "Data de naixement", "Contacto (familia)": "Contacte (família)", "Teléfono o email": "Telèfon o correu",
  "Notas técnicas": "Notes tècniques", "Puntos fuertes, a mejorar, objetivos…": "Punts forts, a millorar, objectius…", "Quitar del equipo": "Treu de l'equip",
  "Asistencia reciente": "Assistència recent", "Sin registros todavía.": "Encara no hi ha registres.", "ver equipo": "veure equip",
  "Estadísticas FCBQ": "Estadístiques FCBQ", "Titular": "Titular", "Puntos": "Punts", "Faltas": "Faltes",
  "Medias por partido jugado · T2 y T3: canastas anotadas · TL: % de tiros libres": "Mitjanes per partit jugat · T2 i T3: cistelles anotades · TL: % de tirs lliures",
  "* titular · Per.: periodos jugados (control de periodos o, si no, los de la FCBQ)": "* titular · Per.: períodes jugats (control de períodes o, si no, els de la FCBQ)",
  "Res.": "Res.", "Per.": "Per.", "Periodos jugados": "Períodes jugats",
  "Sin datos todavía. Se cargan con «Actualizar desde la FCBQ» (si el nombre o el dorsal no coinciden con el acta, revisa la ficha).": "Encara no hi ha dades. Es carreguen amb «Actualitza des de la FCBQ» (si el nom o el dorsal no coincideixen amb l'acta, revisa la fitxa).",
  "Nueva temporada": "Temporada nova", "La nueva temporada pasará a ser la actual. ¿Continuar?": "La temporada nova passarà a ser l'actual. Vols continuar?",
  "Al crear una temporada nueva se convierte en la actual. Crea los equipos y usa «Incorporar jugador existente» para pasar jugadores de un año a otro.": "En crear una temporada nova es converteix en l'actual. Crea els equips i fes servir «Incorpora un jugador existent» per passar jugadors d'un any a l'altre.",
  "Solo visible para coordinadores.": "Només visible per als coordinadors.", "¿Quitar a esta persona del staff del equipo?": "Vols treure aquesta persona del staff de l'equip?",

  // ---------- Calendari ----------
  "Agenda del mes": "Agenda del mes", "Nada programado este mes.": "No hi ha res programat aquest mes.", "Nuevo evento": "Esdeveniment nou",
  "Añadir al calendario": "Afegeix al calendari", "Volver a hoy": "Torna a avui", "Mes anterior": "Mes anterior", "Mes siguiente": "Mes següent",
  "Evento": "Esdeveniment", "Reunión": "Reunió", "Torneo": "Torneig", "Otro": "Altre", "Entreno": "Entrenament", "Partido": "Partit", "Cumpleaños": "Aniversari",
  "Lugar (opcional)": "Lloc (opcional)", "Detalles (opcional)": "Detalls (opcional)", "Reunión de padres, torneo, foto oficial…": "Reunió de pares, torneig, foto oficial…",
  "Elige un equipo arriba para crear eventos.": "Tria un equip a dalt per crear esdeveniments.", "¿Borrar este evento?": "Vols esborrar aquest esdeveniment?",
  "Borrar evento": "Esborra l'esdeveniment", "Ponle un título al evento.": "Posa un títol a l'esdeveniment", "Equipos:": "Equips:",
  "Mostrar también entrenos": "Mostra també els entrenaments", "Ocultar entrenos": "Amaga els entrenaments",
  "Todo el club · partidos de todos los equipos": "Tot el club · partits de tots els equips",

  // ---------- Entrenaments ----------
  "Entrenamiento": "Entrenament", "Sesión": "Sessió", "Próximos": "Propers", "Anteriores": "Anteriors", "No hay entrenos programados.": "No hi ha entrenaments programats.",
  "Todavía no hay entrenos pasados.": "Encara no hi ha entrenaments passats.", "Ej.: Bloqueo directo": "Ex.: Bloqueig directe", "Pista (opcional)": "Pista (opcional)",
  "Sesión vacía": "Sessió buida", "Programar varios entrenos (cada semana)": "Programa diversos entrenaments (cada setmana)", "Programar": "Programa",
  "Sin plantilla (sesiones vacías)": "Sense plantilla (sessions buides)", "Los días que ya tienen entreno se saltan. Aparecen también en el calendario.": "Els dies que ja tenen entrenament se salten. També surten al calendari.",
  "Elige los días y las fechas.": "Tria els dies i les dates.", "Asistencia": "Assistència", "Plantillas": "Plantilles", "Plantilla": "Plantilla",
  "Plantillas de entreno": "Plantilles d'entrenament", "Guardar como plantilla": "Desa com a plantilla", "Guardar plantilla": "Desa la plantilla",
  "Nombre de la plantilla": "Nom de la plantilla", "Para qué sirve (opcional)": "Per a què serveix (opcional)", "Plantilla del club (para todos los equipos)": "Plantilla del club (per a tots els equips)",
  "Borrar plantilla": "Esborra la plantilla", "Todavía no hay plantillas. Abre un entreno y pulsa «Guardar como plantilla».": "Encara no hi ha plantilles. Obre un entrenament i prem «Desa com a plantilla».",
  "Sesiones tipo para reutilizar. Se crean desde un entreno («Guardar como plantilla») y se usan al crear o programar entrenos.": "Sessions tipus per reutilitzar. Es creen des d'un entrenament («Desa com a plantilla») i es fan servir en crear o programar entrenaments.",
  "+1 semana": "+1 setmana", "Copia este entreno a la semana siguiente": "Copia aquest entrenament a la setmana següent", "Borrar entrenamiento": "Esborra l'entrenament",
  "¿Borrar este entrenamiento con sus actividades y la asistencia? No se puede deshacer.": "Vols esborrar aquest entrenament amb les activitats i l'assistència? No es pot desfer.",
  "Notas del entreno": "Notes de l'entrenament", "Objetivo de la sesión, material, avisos…": "Objectiu de la sessió, material, avisos…", "Notas para este entreno…": "Notes per a aquest entrenament…",
  "Abrir ejercicio": "Obre l'exercici", "Añade ejercicios o actividades abajo.": "Afegeix exercicis o activitats a sota.", "Actividad genérica (elige tipo) →": "Activitat genèrica (tria el tipus) →",
  "Ejercicio": "Exercici", "Calentamiento": "Escalfament", "Estiramientos": "Estiraments", "Series": "Sèries", "Agua": "Aigua", "Nota": "Nota",
  "Todos presentes": "Tots presents", "Presente": "Present", "Ausente": "Absent", "Justificado": "Justificat", "Lesionado": "Lesionat", "Tarde": "Tard", "Motivo": "Motiu",
  "% de asistencia (presente o tarde)": "% d'assistència (present o tard)",
  "P presente · T tarde · J justificado · L lesionado · A ausente. Con * hay motivo (pasa el ratón por encima para verlo).": "P present · T tard · J justificat · L lesionat · A absent. Amb * hi ha motiu (passa el ratolí per sobre per veure'l).",
  "Objetivos del entreno": "Objectius de l'entrenament", "Elegir objetivos": "Tria objectius", "Ningún objetivo marcado.": "Cap objectiu marcat.",
  "No hay planificaciones para este equipo.": "No hi ha planificacions per a aquest equip.", "Crea una": "Crea'n una", "Sin objetivos.": "Sense objectius.",
  "Imprimir o guardar en PDF": "Imprimeix o desa en PDF", "← Volver al entreno": "← Torna a l'entrenament", "Objetivos:": "Objectius:", "Claves:": "Claus:",
  "← Entrenamientos": "← Entrenaments", "← Jugadores": "← Jugadors", "← Partidos": "← Partits", "← Ejercicios": "← Exercicis", "← Planificaciones": "← Planificacions", "← Scouting": "← Scouting",

  // ---------- Partits ----------
  "Resultado": "Resultat", "Resultados": "Resultats", "Jugados": "Jugats", "Todavía no hay partidos jugados.": "Encara no hi ha partits jugats.",
  "No hay partidos programados.": "No hi ha partits programats.", "Balance": "Balanç", "PF/partido": "PF/partit", "PC/partido": "PC/partit",
  "Competición": "Competició", "Competición (Liga, Copa…)": "Competició (Lliga, Copa…)", "Jornada": "Jornada", "Pista / dirección (opcional)": "Pista / adreça (opcional)",
  "CB Rival": "CB Rival", "Aplazado": "Ajornat", "Notas del partido": "Notes del partit", "Qué funcionó, qué hay que trabajar, incidencias…": "Què ha funcionat, què cal treballar, incidències…",
  "Borrar partido": "Esborra el partit", "¿Borrar este partido y su convocatoria? No se puede deshacer.": "Vols esborrar aquest partit i la convocatòria? No es pot desfer.",
  "Convocatoria": "Convocatòria", "Copiar lista (para WhatsApp)": "Copia la llista (per a WhatsApp)", "Control de periodos": "Control de períodes",
  "No hay jugadores convocados.": "No hi ha jugadors convocats.", "Jugaron": "Van jugar", "Rellenar desde la FCBQ": "Omple des de la FCBQ",
  "Previa del partido": "Prèvia del partit", "Plan de partido": "Pla de partit", "Guardar plan": "Desa el pla", "Scouting del rival": "Scouting del rival",
  "Defensa, emparejamientos, ritmo, claves en ataque, a quién no dejar tirar…": "Defensa, aparellaments, ritme, claus en atac, a qui no deixar tirar…",
  "Sistemas y ejercicios para el partido": "Sistemes i exercicis per al partit", "Añadir sistema o ejercicio…": "Afegeix sistema o exercici…",
  "Sin ficha manual del rival (se rellena en Scouting).": "Sense fitxa manual del rival (s'omple a Scouting).", "Informe PDF": "Informe PDF",
  "Estadísticas (FCBQ)": "Estadístiques (FCBQ)", "* titular · T2 y T3: canastas anotadas · TL: anotados/intentados": "* titular · T2 i T3: cistelles anotades · TL: anotats/intentats",
  "Convocatoria y periodos": "Convocatòria i períodes", "Sistemas": "Sistemes", "Victoria": "Victòria", "Derrota": "Derrota", "Empate": "Empat",
  "Actualizar desde la FCBQ": "Actualitza des de la FCBQ", "Importar de la FCBQ": "Importa de la FCBQ", "Actualizar en la FCBQ": "Actualitza a la FCBQ",
  "Abriendo basquetcatala.cat…": "Obrint basquetcatala.cat…", "Guardando en Turó Coach…": "Desant a Turó Coach…", "Guardando estadísticas…": "Desant estadístiques…",
  "Detalle de lo leído": "Detall del que s'ha llegit", "Copiar informe": "Copia l'informe", "Marcarlos como aplazados": "Marca'ls com a ajornats",
  "¿Qué equipo de Turó Coach es cada uno?": "Quin equip de Turó Coach és cadascun?", "Solo la primera vez.": "Només la primera vegada.", "No importar": "No importis",
  "La FCBQ no ha devuelto partidos del Turó.": "La FCBQ no ha retornat partits del Turó.",
  "Se ha cortado la conexión con la extensión. Vuelve a pulsar Actualizar.": "S'ha tallat la connexió amb l'extensió. Torna a prémer Actualitza.",
  "Liga y clasificación": "Lliga i classificació", "Clasificación": "Classificació", "Resultados de la liga": "Resultats de la lliga",
  "Ver partidos": "Veure partits", "Ver calendario del club": "Veure calendari del club", "Importación manual (sin extensión: móvil, otro navegador…)": "Importació manual (sense extensió: mòbil, un altre navegador…)",
  "Instalar el botón (una sola vez por ordenador)": "Instal·la el botó (una sola vegada per ordinador)", "Descarga la extensión": "Descarrega l'extensió",
  "Modo de desarrollador": "Mode de desenvolupador", "Cargar descomprimida": "Carrega descomprimida",

  // ---------- Exercicis, pissarra i biblioteca ----------
  "Nuevo ejercicio": "Exercici nou", "Crear ejercicio": "Crea un exercici", "Buscar por título, texto o etiqueta": "Cerca per títol, text o etiqueta",
  "Cualquier categoría": "Qualsevol categoria", "Todas las categorías": "Totes les categories", "Todas las edades": "Totes les edats",
  "Ejercicios y sistemas ": "Exercicis i sistemes", "Sistema": "Sistema", "Sistema de juego": "Sistema de joc", "Sin pizarra": "Sense pissarra",
  "Este ejercicio no tiene pizarra.": "Aquest exercici no té pissarra.", "Correcciones": "Correccions", "Correcciones / puntos clave": "Correccions / punts clau",
  "Etiquetas (separadas por comas)": "Etiquetes (separades per comes)", "Vídeo (YouTube o Vimeo)": "Vídeo (YouTube o Vimeo)", "Vídeo del ejercicio": "Vídeo de l'exercici",
  "Organización, desarrollo, reglas…": "Organització, desenvolupament, regles…", "Edades": "Edats", "Guardar y añadir al entreno": "Desa i afegeix a l'entrenament",
  "Publicar en la Biblioteca del club": "Publica a la Biblioteca del club", "Biblioteca del club": "Biblioteca del club", "Biblioteca de ejercicios": "Biblioteca d'exercicis",
  "Lo verán todos los entrenadores en la Biblioteca y podrán copiarlo o usarlo en sus entrenos.": "El veuran tots els entrenadors a la Biblioteca i el podran copiar o fer servir als seus entrenaments.",
  "A la biblioteca": "A la biblioteca", "Quitar de la biblioteca": "Treu de la biblioteca", "Quitar de la Biblioteca del club": "Treu de la Biblioteca del club",
  "Hacer una copia para modificarla": "Fes-ne una còpia per modificar-la", "Borrar ejercicio": "Esborra l'exercici", "Buscar: entrada, 2c1, zona…": "Cerca: entrada, 2c1, zona…",
  "Los ejercicios del club, con su pizarra. Ábrelos para verlos animados, cópialos para adaptarlos o añádelos a un entreno.": "Els exercicis del club, amb la seva pissarra. Obre'ls per veure'ls animats, copia'ls per adaptar-los o afegeix-los a un entrenament.",
  "No hay ejercicios con esos filtros.": "No hi ha exercicis amb aquests filtres.", "Todavía no hay ejercicios en la biblioteca.": "Encara no hi ha exercicis a la biblioteca.",
  "Cargar ejercicios iniciales": "Carrega els exercicis inicials", "Ya estaban todos cargados.": "Ja estaven tots carregats.",
  "Cargando pizarra…": "Carregant la pissarra…", "Grabar (REC)": "Grava (REC)", "Parar de grabar": "Atura la gravació", "Reproducir": "Reprodueix", "Pausa": "Pausa",
  "Reiniciar": "Reinicia", "Pantalla completa": "Pantalla completa", "Configuración": "Configuració", "Completa": "Completa", "Media ofensiva": "Mitja ofensiva",
  "Media defensiva": "Mitja defensiva", "Atacante": "Atacant", "Defensor": "Defensor", "Balón": "Pilota", "Canasta": "Cistella", "Cono": "Con", "Aro": "Cèrcol",
  "Escalera": "Escala", "Valla": "Tanca", "Chino": "Xinès", "Pica": "Pica", "Texto": "Text", "5 atacantes": "5 atacants", "5 defensores": "5 defensors",
  "Bloqueo": "Bloqueig", "Mano": "Mà", "Dibujo": "Dibuix", "Flecha": "Fletxa", "Lápiz (dibujo libre)": "Llapis (dibuix lliure)", "Borrar dibujo": "Esborra el dibuix",
  "Borrar la grabación": "Esborra la gravació", "Borrar su movimiento": "Esborra el seu moviment", "Fotograma anterior": "Fotograma anterior", "Fotograma siguiente": "Fotograma següent",
  "Captura (limpia las líneas y sigue grabando)": "Captura (neteja les línies i continua gravant)", "Todas las imágenes": "Totes les imatges", "Todas las imágenes superpuestas": "Totes les imatges superposades",
  "Guardar como ejercicio": "Desa com a exercici", "PDF con las capturas": "PDF amb les captures", "Vídeo de la animación": "Vídeo de l'animació", "Imagen de lo que se ve": "Imatge del que es veu",
  "Pequeño": "Petit", "Grande": "Gran", "Muy grande": "Molt gran", "Lenta": "Lenta", "Rápida": "Ràpida", "Normal": "Normal",
  "Deshacer el último movimiento (Ctrl+Z)": "Desfés l'últim moviment (Ctrl+Z)", "Girar (R)": "Gira (R)", "Girar (Mayús+R)": "Gira (Maj+R)",
  "Todavía no hay nada grabado.": "Encara no hi ha res gravat.", "No hay capturas que exportar.": "No hi ha captures per exportar.",
  "Preparando PDF…": "Preparant el PDF…", "Grabando vídeo…": "Gravant el vídeo…", "No se ha podido generar el PDF.": "No s'ha pogut generar el PDF.",
  "Lo que dibujes se queda en este dispositivo hasta que lo guardes como ejercicio.": "El que dibuixis es queda en aquest dispositiu fins que el desis com a exercici.",
  "Puedes probar cambios aquí, pero solo se guardan desde «Editar».": "Pots provar canvis aquí, però només es desen des d'«Edita».",
  "¿Empezar una pizarra nueva? Se borrará todo.": "Vols començar una pissarra nova? S'esborrarà tot.", "¿Empezar una pizarra en blanco?": "Vols començar una pissarra en blanc?",
  "Toca el balón y después un jugador para dárselo.": "Toca la pilota i després un jugador per donar-li-la.", "Toca al jugador que tendrá el balón.": "Toca el jugador que tindrà la pilota.",
  "Toca al jugador que recibe el pase, o una canasta para tirar.": "Toca el jugador que rep la passada, o una cistella per tirar.",
  "Suelta el balón encima de un jugador para dárselo.": "Deixa anar la pilota damunt d'un jugador per donar-li-la.",
  "Grabando: arrastra jugadores; toca el balón y luego a quien lo recibe.": "Gravant: arrossega jugadors; toca la pilota i després qui la rep.",
  "Para pasar el balón durante la jugada, pulsa REC.": "Per passar la pilota durant la jugada, prem REC.", "Para tirar, pulsa REC.": "Per tirar, prem REC.",
  "Para tirar, el balón tiene que tenerlo un jugador.": "Per tirar, la pilota l'ha de tenir un jugador.", "Pulsa REC para grabar y capturar.": "Prem REC per gravar i capturar.",
  "Pulsa REC para grabar un bloqueo.": "Prem REC per gravar un bloqueig.", "Pulsa REC para grabar un mano a mano.": "Prem REC per gravar un mà a mà.",
  "Haz algún movimiento antes de capturar.": "Fes algun moviment abans de capturar.", "Graba algún movimiento antes de exportar el vídeo.": "Grava algun moviment abans d'exportar el vídeo.",
  "Este navegador no permite grabar vídeo. Prueba con Chrome.": "Aquest navegador no permet gravar vídeo. Prova amb Chrome.",
  "Bloqueo: el siguiente jugador que arrastres hará un bloqueo": "Bloqueig: el següent jugador que arrossegueu farà un bloqueig",
  "Bloqueo: arrastra al jugador hasta donde pone el bloqueo.": "Bloqueig: arrossega el jugador fins on posa el bloqueig.",
  "Mano a mano: el siguiente pase será una entrega en mano": "Mà a mà: la següent passada serà una entrega en mà", "Mano a mano: toca el balón y luego al jugador que lo recibe.": "Mà a mà: toca la pilota i després el jugador que la rep.",
  "Color para lo que añadas o para lo seleccionado": "Color per al que afegeixis o per al que hi ha seleccionat", "Etiqueta": "Etiqueta",
  "Etiqueta (número o nombre corto):": "Etiqueta (número o nom curt):", "Texto a mostrar en la pista:": "Text per mostrar a la pista:", "Texto:": "Text:",
  "Desplazamiento": "Desplaçament", "Bote": "Bot", "Pase": "Passada", "Tiro": "Tir", "Fundamentos": "Fonaments", "Ataque": "Atac", "Defensa": "Defensa",
  "Transición": "Transició", "Rebote": "Rebot", "Juego reducido": "Joc reduït", "Físico": "Físic", "Mini": "Mini", "Infantil": "Infantil", "Cadete": "Cadet", "Junior": "Júnior", "Sénior": "Sènior",

  // ---------- Planificacions ----------
  "Planificación": "Planificació", "Nueva planificación": "Planificació nova", "Objetivos": "Objectius", "Objetivo": "Objectiu", "Añadir objetivo": "Afegeix objectiu",
  "Subobjetivo": "Subobjectiu", "Sin objetivos todavía.": "Encara no hi ha objectius.", "Sin trabajar": "Sense treballar", "Cuándo se ha trabajado": "Quan s'ha treballat",
  "Copiar a": "Copia a", "Borrar planificación": "Esborra la planificació", "Editar nombre y descripción": "Edita el nom i la descripció",
  "Hacer una copia con todos los objetivos": "Fes-ne una còpia amb tots els objectius", "Para qué es, a qué edades, criterios…": "Per a què és, a quines edats, criteris…",
  "Descripción, criterios de éxito…": "Descripció, criteris d'èxit…", "el del objetivo padre": "el de l'objectiu pare", "Color": "Color",
  "Elige un equipo para ver su seguimiento.": "Tria un equip per veure'n el seguiment.", "Todavía no hay planificaciones del club.": "Encara no hi ha planificacions del club.",
  "Las puede usar cualquier equipo en sus entrenos, o copiarlas para adaptarlas.": "Les pot fer servir qualsevol equip als seus entrenaments, o copiar-les per adaptar-les.",
  "Cada casilla es una semana. Color fuerte: el objetivo; claro: alguno de sus subobjetivos.": "Cada casella és una setmana. Color fort: l'objectiu; clar: algun dels subobjectius.",
  "Los objetivos se marcan dentro de cada entrenamiento, en «Objetivos del entreno».": "Els objectius es marquen dins de cada entrenament, a «Objectius de l'entrenament».",
  "Fundamentos individuales, Defensa, Temporada U14…": "Fonaments individuals, Defensa, Temporada U14…",

  // ---------- Scouting ----------
  "Equipos de la liga": "Equips de la lliga", "Próximo rival": "Proper rival", "Ver scouting →": "Veure scouting →", "Nuestro equipo": "El nostre equip",
  "Jugadores ": "Jugadors", "Puntos a favor": "Punts a favor", "Puntos en contra": "Punts en contra", "Triples": "Triples", "Tiros libres": "Tirs lliures",
  "Puntos por periodo (media)": "Punts per període (mitjana)", "Anotados": "Anotats", "Recibidos": "Rebuts", "Máx": "Màx",
  "Medias por partido jugado. Toca un nombre para su ficha. En rojo, los máximos anotadores.": "Mitjanes per partit jugat. Toca un nom per a la seva fitxa. En vermell, els màxims anotadors.",
  "Guardar ficha": "Desa la fitxa", "Cómo defenderle, qué hace…": "Com defensar-lo, què fa…", "Ritmo": "Ritme", "Tiro exterior": "Tir exterior",
  "Ataque / sistemas": "Atac / sistemes", "Puntos fuertes": "Punts forts", "Puntos débiles": "Punts febles", "Cómo jugarles": "Com jugar-hi",
  "Qué hacen bien": "Què fan bé", "Dónde atacarles": "On atacar-los", "Plan de partido: defensa, emparejamientos, ritmo…": "Pla de partit: defensa, aparellaments, ritme…",
  "Entrenador, pista, horarios, lo que vimos en la primera vuelta…": "Entrenador, pista, horaris, el que vam veure a la primera volta…",
  "Individual": "Individual", "Zona 2-3": "Zona 2-3", "Zona 3-2": "Zona 3-2", "Zona 1-3-1": "Zona 1-3-1", "Presión toda pista": "Pressió tota la pista",
  "Lento, posesiones largas": "Lent, possessions llargues", "Medio": "Mitjà", "Rápido, contraataque": "Ràpid, contraatac", "Débil": "Feble", "Fuerte": "Fort",
  "Poco": "Poc", "Mucho": "Molt", "Base": "Base", "Escolta": "Escorta", "Alero": "Aler", "Ala-pívot": "Ala-pivot", "Pívot": "Pivot",
  "Tirador": "Tirador", "Penetrador": "Penetrador", "Pasador": "Passador", "Reboteador": "Rebotejador", "Juego interior": "Joc interior", "Buen defensor": "Bon defensor",
  "Defiende mal": "Defensa malament", "Contraataque": "Contraatac", "Zurdo": "Esquerrà", "Diestro": "Dretà", "Se carga de faltas": "Es carrega de faltes",
  "Líder": "Líder", "Mal tirador de TL": "Mal tirador de TL", "Sinergias": "Sinergies", "Quintetos": "Quintets", "Parejas": "Parelles",
  "Pts titulares": "Pts titulars", "Pts banquillo": "Pts banqueta", "Máx. ventaja": "Màx. avantatge", "Mayor parcial": "Parcial més gran",
  "En pista y en el banquillo (on/off)": "A pista i a la banqueta (on/off)", "En pista 10′": "A pista 10′", "Fuera 10′": "Fora 10′", "Dif.": "Dif.", "+/- en pista": "+/- a pista",
  "Cómo va el equipo con cada jugador en pista y sin él, cada 10 minutos. «Dif.» es lo que mejora (o empeora) al equipo.": "Com va l'equip amb cada jugador a pista i sense ell, cada 10 minuts. «Dif.» és el que millora (o empitjora) l'equip.",
  "Los más utilizados (más de 2 minutos juntos).": "Els més utilitzats (més de 2 minuts junts).", "Las parejas que más minutos comparten en pista.": "Les parelles que comparteixen més minuts a pista.",
  "Parcial": "Parcial", "Sin datos suficientes.": "No hi ha prou dades.", "Informe automático (datos FCBQ)": "Informe automàtic (dades FCBQ)",
  "Verde: punto débil del rival. Rojo: peligro.": "Verd: punt feble del rival. Vermell: perill.", "Periodos jugados en la temporada": "Períodes jugats a la temporada",
  "Sale del control de periodos de cada partido.": "Surt del control de períodes de cada partit.", "Sin estadísticas todavía. Se descargan con «Actualizar desde la FCBQ».": "Encara no hi ha estadístiques. Es descarreguen amb «Actualitza des de la FCBQ».",
  "Elige arriba uno de tus equipos.": "Tria a dalt un dels teus equips.", "Tiene ficha": "Té fitxa",
  "Faltan los datos de jugada a jugada. Pulsa «Actualizar desde la FCBQ» (extensión 1.4.1 o posterior) y se descargarán.": "Falten les dades de jugada a jugada. Prem «Actualitza des de la FCBQ» (extensió 1.4.1 o posterior) i es descarregaran.",

  // ---------- Avisos ----------
  "Avisos en este dispositivo": "Avisos en aquest dispositiu", "Activar avisos": "Activa els avisos", "Desactivar en este dispositivo": "Desactiva en aquest dispositiu",
  "Marcar todo como leído": "Marca-ho tot com a llegit", "Cambios de horario o de pista, aplazamientos y resultados de tus equipos.": "Canvis d'horari o de pista, ajornaments i resultats dels teus equips.",
  "Listo: recibirás los avisos en este dispositivo.": "Fet: rebràs els avisos en aquest dispositiu.", "No se han podido activar.": "No s'han pogut activar.",
  "No hay avisos. Llegarán cuando la FCBQ cambie un horario, una pista, aplace un partido o publique un resultado.": "No hi ha avisos. Arribaran quan la FCBQ canviï un horari, una pista, ajorni un partit o publiqui un resultat.",
  "Este navegador no admite avisos. En iPhone/iPad, primero instala la app (Compartir → Añadir a pantalla de inicio) y ábrela desde el icono.": "Aquest navegador no admet avisos. A l'iPhone/iPad, primer instal·la l'app (Comparteix → Afegeix a la pantalla d'inici) i obre-la des de la icona.",
  "Los avisos están bloqueados para esta web. Permítelos en los ajustes del navegador (icono del candado junto a la dirección).": "Els avisos estan bloquejats per a aquest web. Permet-los a la configuració del navegador (icona del cadenat al costat de l'adreça).",

  // ---------- Panel del coordinador ----------
  "Panel del coordinador": "Tauler del coordinador", "Staff de cada equipo": "Staff de cada equip", "Sin entrenador": "Sense entrenador",
  "Añadir persona…": "Afegeix persona…", "Añadir persona al staff": "Afegeix una persona al staff", "Nombre y apellidos": "Nom i cognoms",
  "Función": "Funció", "Permisos": "Permisos", "Staff (solo sus equipos)": "Staff (només els seus equips)", "Coordinador (todo el club)": "Coordinador (tot el club)",
  "Crear acceso": "Crea l'accés", "Personas con acceso": "Persones amb accés", "Nueva contraseña ": "Contrasenya nova", "Quitar acceso": "Treu l'accés",
  "Devolver acceso": "Retorna l'accés", "Sin acceso": "Sense accés", "Staff": "Staff", "Copiar mensaje para WhatsApp": "Copia el missatge per a WhatsApp",
  "Crear con contraseña provisional (se la mandas tú por WhatsApp)": "Crea amb contrasenya provisional (l'envies tu per WhatsApp)",
  "Enviar invitación por email": "Envia invitació per correu", "Crea antes los equipos en Equipos.": "Crea abans els equips a Equips.",
  "Staff de cada equipo, accesos a la app y temporadas. Solo lo ves tú.": "Staff de cada equip, accessos a l'app i temporades. Només ho veus tu.",
  "Listo. Datos de acceso (solo se muestran ahora):": "Fet. Dades d'accés (només es mostren ara):", "Coordinador (tú)": "Coordinador (tu)",

  "Revisar e importar": "Revisa i importa", "En las actas de la FCBQ": "A les actes de la FCBQ", "En el acta": "A l'acta",
  "Revisa cómo ha separado nombre y apellidos. Si el jugador ya existe en el club (otra temporada), se vincula en lugar de duplicarlo.": "Revisa com ha separat el nom i els cognoms. Si el jugador ja existeix al club (una altra temporada), es vincula en lloc de duplicar-lo.",

  // ---------- Errors comuns ----------
  "No tienes permiso para hacer esto en este equipo.": "No tens permís per fer això en aquest equip.", "Ya existe un registro igual.": "Ja existeix un registre igual.",
  "No se puede: hay otros datos que dependen de este.": "No es pot: hi ha altres dades que en depenen.", "No hay conexión con la base de datos. Inténtalo de nuevo.": "No hi ha connexió amb la base de dades. Torna-ho a provar.",
  "No se ha podido guardar.": "No s'ha pogut desar.", "No se ha podido importar.": "No s'ha pogut importar.",
  "No se ha podido cargar. Recarga la página (Ctrl+Shift+R) y vuelve a probar.": "No s'ha pogut carregar. Recarrega la pàgina (Ctrl+Shift+R) i torna-ho a provar.",
};

// Dies i mesos (per a les dates escrites)
const PARAULES: Record<string, string> = {
  lunes: "dilluns", martes: "dimarts", "miércoles": "dimecres", jueves: "dijous", viernes: "divendres", "sábado": "dissabte", domingo: "diumenge",
  lun: "dl.", mar: "dt.", "mié": "dc.", jue: "dj.", vie: "dv.", "sáb": "ds.", dom: "dg.",
  enero: "gener", febrero: "febrer", marzo: "març", abril: "abril", mayo: "maig", junio: "juny", julio: "juliol", agosto: "agost",
  septiembre: "setembre", octubre: "octubre", noviembre: "novembre", diciembre: "desembre",
  ene: "gen.", feb: "febr.", abr: "abr.", may: "maig", jun: "juny", jul: "jul.", ago: "ag.", sept: "set.", sep: "set.", oct: "oct.", nov: "nov.", dic: "des.",
  de: "de", del: "de",
};
const RE_FECHA = /^[\s,.\d:·]*(?:(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo|lun|mar|mié|jue|vie|sáb|dom|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|abr|may|jun|jul|ago|sept|sep|oct|nov|dic|de|del)\.?[\s,.\d:·]*)+$/i;

/** Traduce un texto si es de la interfaz (coincidencia exacta) o una fecha */
export function aCatalan(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const d = CA[t];
  if (d !== undefined) return d === t ? null : texto.replace(t, d);
  if (RE_FECHA.test(t) && /[a-zé]/i.test(t)) {
    let numero = false;
    const r = texto.replace(/[a-záéíóú]+\.?|\d+/gi, (w) => {
      if (/^\d+$/.test(w)) { numero = true; return w; }
      const k = w.replace(/\.$/, "").toLowerCase();
      // "mar" es martes antes del día y marzo después
      if (k === "mar") return numero ? "març" : "dt.";
      return PARAULES[k] ?? w;
    });
    return r.replace(/\bde (?=[aeiouàèéíòóú])/gi, "d'");
  }
  return null;
}
