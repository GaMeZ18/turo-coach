# Turó Coach

Herramienta web para los entrenadores del CB Turó de la Peira: equipos, jugadores, entrenamientos con asistencia, biblioteca de ejercicios y pizarra animada.

**Stack:** Next.js 15 (App Router) · Supabase (base de datos + login) · Tailwind 4 · Konva (pizarra) · Vercel.

---

## Puesta en marcha (una sola vez, ~20 min)

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (región `eu-west`).
2. **SQL Editor** → pega el contenido de `supabase/migrations/0001_inicial.sql` → *Run*.
3. **Authentication → Sign In / Providers → Email**: desactiva *Allow new users to sign up* (solo se entra por invitación).
4. **Authentication → URL Configuration**: *Site URL* = la URL de Vercel (p. ej. `https://turo-coach.vercel.app`) y añádela también en *Redirect URLs* con `/**` al final.
5. **Plantillas de email**: no hace falta tocarlas; la app funciona con las de Supabase. (Para personalizarlas, Supabase exige configurar antes un SMTP propio.)
6. **Project Settings → API**: copia la *Project URL* y la *anon public key*.

### 2. GitHub + Vercel
1. Sube esta carpeta a un repo nuevo de GitHub.
2. En Vercel: *Add New → Project* → importa el repo.
3. Variables de entorno (las de `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. *Deploy*. A partir de aquí, cada cambio que subas a `main` se publica solo.

### 3. Primer usuario (coordinador)
Supabase → **Authentication → Users → Invite user** con tu email. El **primer usuario** que se crea pasa a ser **coordinador** automáticamente; los siguientes son entrenadores (se puede cambiar en la sección *Club* de la app).

---

## Cómo se usa

- **Coordinador**: crea los equipos de la temporada en *Equipos* y asigna entrenadores. En *Club* gestiona roles y temporadas.
- **Entrenador**: elige su equipo en el selector de arriba → *Jugadores*, *Entrenamientos*, *Ejercicios*.
- **Instalar como app** (se abre en su propia ventana, con el escudo como icono):
  | Dispositivo | Cómo |
  |---|---|
  | iPhone / iPad | Safari → Compartir → *Añadir a pantalla de inicio* |
  | Android | Chrome → aviso *Instalar* en la portada, o menú ⋮ → *Instalar aplicación* |
  | Windows | Edge o Chrome → icono de instalar en la barra de direcciones (queda en el menú Inicio y la barra de tareas) |
  | Mac | Safari → Archivo → *Añadir al Dock*, o Chrome → instalar |

  En *Mi cuenta* hay un botón de instalar y las instrucciones para cada dispositivo. Las actualizaciones llegan solas: cada vez que subes cambios a GitHub, la app instalada los recibe al abrirla.

### Pizarra
Funciona como la de Coach Studio:

- **Añadir**: atacante, 5 atacantes, balón, defensor, 5 defensores, entrenador, canasta, cono, aro, escalera, valla, chino, pica y texto. El color elegido se aplica a lo que añadas o a lo que tengas seleccionado.
- **Mover**: toca y arrastra. Sin grabar, recolocas los elementos. Doble toque para cambiar la etiqueta.
- **Balón**: toca el balón y después un jugador, y ese jugador lo tiene.
- **● REC**: arrastra a un jugador y su movimiento queda grabado como un fotograma (`01/01`, `02/02`…). Si lleva el balón, la línea sale en zigzag (bote). Para un **pase**, toca el balón y luego al receptor; si están muy cerca, se dibuja como **mano a mano**. Para un **tiro**, toca el balón y luego una canasta.
- **Bloqueo** y **Mano a mano**: botones junto al lápiz. Activas uno y la siguiente acción sale con ese símbolo.
- **Líneas limpias**: al soltar, un trazo casi recto queda perfectamente recto, un cambio de dirección queda con la esquina nítida y una curva sale suave.
- **Movimientos a la vez**: con **‹** vuelves un fotograma atrás y mueves a otro jugador; los dos se moverán a la vez.
- **📷 Captura**: limpia las líneas y sigues grabando. Cada captura es una imagen de la tira; ⧉ las superpone todas.
- **▶** reproduce la jugada; ⏮ ⏭ ‹ › navegan por los fotogramas; **|←** deshace el último paso; **🗑** borra la grabación.
- **Descargar**: PDF con una página por captura, vídeo de la animación (MP4, o WebM según el navegador) o imagen PNG.
- **Completa / Media ofensiva / Media defensiva**, **Reiniciar**, **Pantalla completa** y ⚙ (tamaño de los jugadores y velocidad).

Símbolos universales: atacante = número en círculo · defensor = X · desplazamiento = línea continua · bote = zigzag · pase = discontinua · bloqueo = línea en T · mano a mano = línea con dos barras · tiro = doble línea.

Teclado: `←` `→` fotogramas · `Espacio` reproducir · `C` captura · `Supr` borrar · `R` girar · `Ctrl+Z` deshacer · `Esc` deseleccionar.

## Desarrollo en local
```bash
cp .env.example .env.local   # y rellena las dos claves
npm install
npm run dev                  # http://localhost:3000
```

## Estructura
```
supabase/migrations/      Esquema SQL y permisos (RLS)
src/app/login             Acceso (contraseña o enlace por email)
src/app/(app)/            Pantallas con sesión iniciada
  equipos/ jugadores/ entrenamientos/ ejercicios/ pizarra/ club/ cuenta/
src/components/pizarra/   Editor de pizarra (modelo.ts = formato de datos)
src/app/globals.css       Colores del club (bloque @theme)
public/marca/             Escudo e imagen del 10º aniversario
public/icons/             Iconos de la app (generados a partir del escudo)
```

### Partidos y calendario
- **Partidos**: rival, casa/fuera, competición, jornada, resultado (V/D y balance), notas y **convocatoria** (con botón para copiarla y pegarla en WhatsApp).
- **Calendario**: mes con entrenos, partidos, eventos y cumpleaños de la plantilla; del equipo activo o de todo el club. Eventos del equipo (staff) o del club (coordinador).

- **Actualizar desde la FCBQ** (botón en Partidos): con la extensión `extension/` instalada (Chrome/Brave/Edge, «Cargar descomprimida»), abre basquetcatala.cat en una pestaña —el usuario resuelve la verificación si sale—, lee el calendario del club de toda la temporada, la página de cada equipo, sus resultados y su clasificación, y lo guarda todo. La FCBQ bloquea las lecturas desde servidores, por eso se hace en el navegador. Tras cambiar la extensión: `python3 extension/empaquetar.py` (regenera `public/extension/turo-coach-fcbq.zip`).
- **Importación manual** (Partidos → Importar): botón de marcadores «Enviar a Turó Coach» que, pulsado en basquetcatala.cat, manda la página a la app (corre en el navegador del usuario, así el captcha de la FCBQ lo resuelve él). Lee el *Calendari Mensual Club* (partidos de todos los equipos) y las páginas de *Resultats* de cada competición (marcadores y jornada). Crea o actualiza sin duplicar y recuerda qué equipo de la FCBQ es cada equipo de Turó Coach. También admite pegar el texto o subir la página guardada.
- **Liga y clasificación** (en Partidos, debajo de los jugados): al enviar la página de *Resultats* se guardan los resultados de todos los equipos de la liga, por jornadas, y la clasificación (la oficial si envías la página de *Classificació*; si no, calculada con los resultados). Enlace «Actualizar en la FCBQ» para repetirlo.

> Requiere ejecutar en el SQL Editor de Supabase `0002_partidos_calendario.sql`, `0003_fcbq.sql` y `0004_liga_fcbq.sql`.

### Planificaciones
- Árbol de objetivos (y subobjetivos) con color y descripción. Del club (las crea el coordinador y las usa cualquier equipo) o de un equipo. «Copiar a» duplica una planificación con todo su árbol para adaptarla.
- En cada entrenamiento, «Objetivos del entreno» marca qué se trabaja (de varias planificaciones a la vez).
- «Cuándo se ha trabajado»: cuadrícula por semanas de septiembre a junio con los entrenos de cada objetivo y su total.

> Requiere ejecutar `0005_planificaciones.sql`.

### Scouting
Solo lo ve el cuerpo técnico de cada equipo (y el coordinador).
- **Liga**: todos los equipos con balance, puntos a favor y en contra, triples, % de tiros libres y faltas por partido. Próximo rival destacado.
- **Equipo**: medias, puntos por periodo, resultados, jugadores (minutos, puntos, canastas de 2 y de 3, tiros libres, faltas, +/-, máximo) y fichas del equipo y de cada jugador (posición, mano, etiquetas, notas).
- Las estadísticas de cada partido las descarga el botón «Actualizar desde la FCBQ» (extensión 1.1). La FCBQ solo da los tiros de campo anotados, no los intentados.
- **Control de periodos** (en cada partido): rejilla jugador × periodo, rellenable desde la FCBQ, con mínimo por jugador; resumen de la temporada en el scouting del propio equipo.

> Requiere ejecutar `0006_scouting.sql`.

### Partidos (extra)
- **Previa** (cuerpo técnico): ficha del rival del scouting, plan de partido y sistemas/ejercicios elegidos con su pizarra.
- **Estadísticas de la FCBQ** en cada partido: parciales por periodo y box score de los dos equipos.
- **Informe PDF** (`/imprimir/partido/<id>`): resultado, parciales, plan, sistemas, box score, convocatoria con periodos y notas.
- **Aplazados**: al actualizar desde la FCBQ avisa de los partidos futuros que ya no están en su calendario y permite marcarlos como aplazados.

> Requiere ejecutar `0009_partidos_previa.sql`.

### Entrenamientos (extra)
- **Plantillas**: «Guardar como plantilla» en cualquier entreno; se usan al crear un entreno o al programar varios. Las del club (coordinador) las ven todos los equipos.
- **Programar varios**: días de la semana, hora y fechas → crea todos los entrenos (con o sin plantilla) sin duplicar días.
- **PDF / imprimir** (`/imprimir/entreno/<id>`): sesión con horas, pizarras, claves, objetivos y lista de asistencia para rellenar.
- **Asistencia**: historial por jugador (presente, tarde, justificado, lesionado, ausente), % y motivos.

> Requiere ejecutar `0008_plantillas_entreno.sql`.

### Biblioteca
- Ejercicios y sistemas del club, por categorías, con filtro por edad (Mini, Infantil, Cadete, Junior, Sénior), tipo y texto, y la pizarra dibujada en cada tarjeta.
- Cada entrenador decide al crear o editar un ejercicio si lo publica («Publicar en la Biblioteca del club»), y puede quitarlo después.
- El coordinador carga los ejercicios iniciales (incluye sistemas habituales en ACB y ejercicios avanzados) (`src/lib/biblioteca-semilla.ts`, con su pizarra) con un botón.

> Requiere ejecutar `0007_biblioteca.sql`.

## Próximas fases
- Partidos y scouting (rivales, notas, control de periodos de minibásquet, informe PDF)
- Vídeo (etiquetado por categorías y descriptores)
- Catalán como segundo idioma
