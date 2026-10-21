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
Funciona como Coach Studio: **colocar → ● Grabar → 📷 Captura**.

1. **Colocar** (imagen *Inicio*): añade jugadores (atacante, defensor, entrenador o los presets *5 ataque* / *5 vs 5*) y material (cono, chino, aro, pica, valla, escalera, balón, texto). Arrástralos a su sitio. Si tocas uno, puedes cambiarle la etiqueta, el color o la rotación, o darle el balón.
2. **● Grabar**: arrastra a los jugadores por donde se mueven y cada recorrido se queda grabado. El tipo de línea sale solo (*Auto*: bote si lleva el balón, desplazamiento si no) o lo eliges tú: desplazamiento, bote o bloqueo.
3. Para el balón: **Pase** (y tocas al receptor), **Mano a mano** (y tocas al receptor) o **Tiro**.
4. **📷 Captura**: cierra la imagen actual y empieza otra limpia (máx. 6). *Animar* las reproduce todas seguidas; *Todas* las superpone numeradas (es la miniatura del ejercicio).

Símbolos (los universales): atacante = número en círculo · defensor = X · desplazamiento = línea continua con flecha · bote = zigzag · pase = discontinua · bloqueo = línea en T · mano a mano = línea con dos barras · tiro = doble línea.

Teclado: `Supr` borra · `R` / `Mayús+R` gira · `Espacio` anima · `Ctrl+Z` deshace · `Esc` deselecciona.

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

## Próximas fases
- Calendario (partidos + entrenos + eventos)
- Planificaciones (árbol de objetivos vinculados a entrenos)
- Partidos y scouting (rivales, notas, control de periodos de minibásquet, informe PDF)
- Vídeo (etiquetado por categorías y descriptores)
- Biblioteca de enlaces · Catalán como segundo idioma
