# Detector de tiros · Coach Manager CBTuró (prueba piloto)

Programa para **tu ordenador** que busca en el vídeo original de un partido los momentos en los que
**el balón llega al aro** (tiro) y, si puede, **si entra o no**. El resultado se importa en
Coach Manager (*Vídeo → Importar detecciones*) como **clips por revisar**: tú solo confirmas
el tipo de tiro, el jugador y anotada/fallada (en canastas, la FCBQ ya propone el jugador).

- Todo se procesa en tu PC: **no se sube el vídeo a ningún sitio** y no cuesta nada.
- Funciona sin tarjeta gráfica (pensado para un Intel i5 con 16 GB).
- Usa solo OpenCV (Apache 2.0) y NumPy (BSD).

> Es una **prueba piloto**: antes de mejorarlo hay que medir cuánto acierta con partidos reales
> (paso 5). Con cámara fija desde la grada debería encontrar la mayoría de tiros; los rebotes,
> robos, pases o dorsales **no** los detecta.

## 1. Instalar (una vez)
1. Instala **Python 3.12** desde <https://www.python.org/downloads/> marcando *«Add python.exe to PATH»*.
2. Doble clic en **`instalar.bat`**.

## 2. Calibrar (una vez por pabellón y posición de cámara)
Arrastra el vídeo del partido encima de **`1-calibrar.bat`**. Se abre un fotograma:
1. Dibuja un rectángulo **justo alrededor del aro izquierdo** (solo el aro) y pulsa *Enter*.
2. Igual con el **aro derecho**. Si una canasta no se ve, pulsa *C*.
3. (Opcional) Dibuja un rectángulo pequeño **sobre el balón** para ajustar su color. Si no se ve, *C*.

Se guarda `PARTIDO.aros.json` junto al vídeo. Si la cámara está siempre en el mismo sitio,
puedes copiar ese archivo con el nombre de otros vídeos.

## 3. Analizar
Arrastra el vídeo encima de **`2-analizar.bat`**. Verás el progreso y lo que falta.
Al acabar tendrás:
- `PARTIDO.detecciones.json` → el archivo que se importa en Coach Manager.
- `PARTIDO.detecciones_capturas/` → una imagen por tiro con la trayectoria del balón, para comprobar a ojo.

Opciones (en una ventana de comandos, desde esta carpeta):
```
.venv\Scripts\python detector.py analizar PARTIDO.mp4 --perfil rapido      (8 fotogramas/s)
.venv\Scripts\python detector.py analizar PARTIDO.mp4 --perfil preciso     (20 fotogramas/s)
.venv\Scripts\python detector.py analizar PARTIDO.mp4 --inicio 600 --fin 1200   (solo de 10:00 a 20:00)
```
Si lo paras con *Ctrl+C*, guarda lo analizado hasta ese momento.

## 4. Importar en Coach Manager
Sube el **mismo vídeo** a YouTube (oculto) y añádelo en *Vídeo*. Dentro del vídeo:
*Importar detecciones* → elige el `.detecciones.json`. Aparecerán como clips **por revisar**
(no cuentan en la estadística hasta que los confirmes). Pulsa **Revisar** y ve uno a uno:
tipo de tiro (2, 3, TL o «no es tiro»), jugador y anotada/fallada.

Si el vídeo de YouTube empieza en otro segundo que el original, indica el desfase al importar.

## 5. Medir cuánto acierta
1. Etiqueta a mano un partido en Coach Manager (como hasta ahora) y pulsa *Exportar etiquetas*.
2. Analiza el mismo partido con el detector.
3. Ejecuta: `3-evaluar.bat PARTIDO.detecciones.json etiquetas.json`

Te dirá qué porcentaje de tiros encuentra (*recall*), cuántas detecciones son tiros de verdad
(*precisión*), si acierta anotada/fallada y los minutos exactos que ha fallado. Con eso decidimos
qué mejorar.

## Cómo funciona (resumen técnico)
Solo mira la zona de alrededor de cada aro. En cada fotograma separa lo que se mueve del fondo
(sustracción de fondo MOG2), se queda con lo que tiene **color de balón** y el **tamaño esperado**
(el balón mide ~0,53 veces el aro) y sigue su trayectoria en «anchos de aro»:
- pasa **por encima del aro** → tiro candidato;
- después pasa **por dentro del aro y por la red**, centrado y bajando → anotada;
- estuvo arriba y no baja por la red → fallada; si no está claro → «desconocido».

Limitaciones conocidas: balón tapado por jugadores o por el tablero, cámaras que se mueven,
equipaciones o carteles naranjas cerca del aro, vídeos muy comprimidos o de noche.

## Pruebas
`pruebas.bat` genera un vídeo sintético (aro, «jugadores» y balón con 2 canastas, 1 fallo y 1 pase)
y comprueba que encuentra los 3 tiros, ignora el pase, acierta el resultado y que la evaluación funciona.
