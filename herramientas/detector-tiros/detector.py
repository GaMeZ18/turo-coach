#!/usr/bin/env python3
"""
Detector de tiros · Coach Manager CBTuró (prueba piloto)

Analiza en tu ordenador el vídeo original de un partido grabado con cámara fija y busca
los momentos en los que el balón llega al aro desde arriba: «tiro candidato», y si puede, si entra o no.
Sigue el balón por su movimiento y tamaño (no por el color) y necesita vídeo de 1080p o, como mínimo, 720p.
El resultado es un archivo JSON que se importa en Coach Manager (Vídeo → Importar detecciones)
como clips «por revisar».

Solo usa OpenCV y NumPy (licencias Apache 2.0 y BSD). No envía nada a internet.

Uso:
  python detector.py calibrar  PARTIDO.mp4                # marcar los aros con el ratón
  python detector.py analizar  PARTIDO.mp4                # buscar los tiros
  python detector.py evaluar   PARTIDO.detecciones.json ETIQUETAS.json   # comparar con lo etiquetado a mano
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field, asdict

# Consola de Windows: que las tildes no rompan la salida
for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import numpy as np  # antes que cv2 (necesario en el ejecutable de Windows)
    import cv2
except ImportError as _e:  # mensaje claro si falta algo
    print(f"({_e})")
    print("Falta OpenCV o NumPy. Ejecuta primero instalar.bat (o: pip install -r requirements.txt).")
    sys.exit(1)

VERSION = "0.4.0"

# Perfiles: fotogramas por segundo que se analizan alrededor de los aros
PERFILES = {"rapido": 8, "equilibrado": 12, "preciso": 20}

# Color del balón por defecto (HSV de OpenCV: H 0-180). Se puede ajustar al calibrar.
BALON_DEFECTO = {"h_min": 2, "h_max": 22, "s_min": 90, "v_min": 70}


# ----------------------------------------------------------------------------- utilidades
def ruta_calibracion(video: str) -> str:
    return os.path.splitext(video)[0] + ".aros.json"


def ruta_salida(video: str) -> str:
    return os.path.splitext(video)[0] + ".detecciones.json"


def mmss(s: float) -> str:
    s = max(0, int(round(s)))
    h, m, ss = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{ss:02d}" if h else f"{m}:{ss:02d}"


def abrir_video(ruta: str):
    if not os.path.isfile(ruta):
        raise SystemExit(f"No encuentro el vídeo: {ruta}")
    cap = cv2.VideoCapture(ruta)
    if not cap.isOpened():
        raise SystemExit(f"No puedo abrir el vídeo (¿formato raro o archivo dañado?): {ruta}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    ancho = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    alto = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if fps <= 0 or fps > 240:
        fps = 25.0
    return cap, fps, n, ancho, alto


# ----------------------------------------------------------------------------- autocalibración
def fondo_mediana(cap, n: int, fps: float, muestras: int = 40):
    """Imagen del pabellón sin jugadores: mediana de fotogramas repartidos por el vídeo."""
    dur = n / fps if n else 600
    fs = []
    for k in range(muestras):
        cap.set(cv2.CAP_PROP_POS_MSEC, (dur * (k + 0.5) / muestras) * 1000)
        ok, f = cap.read()
        if ok:
            fs.append(f)
    if not fs:
        raise SystemExit("No he podido leer el vídeo.")
    return np.median(np.array(fs), axis=0).astype(np.uint8)


def candidatos_tablero(fondo) -> list[tuple[int, int, int, int]]:
    """Rectángulos de líneas blancas finas con forma de tablero (incluye los de otras pistas)."""
    H, W = fondo.shape[:2]
    gris = cv2.cvtColor(fondo, cv2.COLOR_BGR2GRAY)
    sat = cv2.cvtColor(fondo, cv2.COLOR_BGR2HSV)[..., 1]
    k = max(5, int(W / 210) | 1)
    claro = cv2.morphologyEx(gris, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    m = ((claro > 18) & (sat < 70)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    res = []
    for c in cs:
        x, y, w, h = cv2.boundingRect(c)
        if not (0.012 * W < w < 0.1 * W and 0.5 < w / max(h, 1) < 2.6 and y + h < 0.7 * H):
            continue
        if cv2.countNonZero(m[y:y + h, x:x + w]) / float(w * h) > 0.45:
            continue  # macizo: un cartel, no un tablero
        res.append((x, y, w, h))
    return res


def aro_de_tablero(nombre: str, t: tuple[int, int, int, int], ancho_img: int | None = None) -> dict:
    """Primera estimación del aro: abajo en el tablero, algo desplazado hacia el centro de la imagen
    (vista desde la banda: el aro sobresale del tablero hacia la pista)."""
    x, y, w, h = t
    aw = max(4, round(0.3 * w))
    hacia = (1 if ancho_img / 2 > x + w / 2 else -1) * 0.25 * w if ancho_img else 0
    return {"nombre": nombre, "x": int(x + w / 2 + hacia - aw / 2), "y": int(y + h - 0.12 * h), "w": aw, "h": max(2, round(aw * 0.3))}


def autocalibrar(ruta: str, minutos: float = 6.0, aviso=print) -> dict:
    """Encuentra las dos canastas del partido: de los tableros que se ven, las dos a las que llegan
    más balones desde arriba. Con esos tiros afina la posición del aro."""
    cap, fps, n, ancho, alto = abrir_video(ruta)
    aviso("Buscando las canastas del partido…")
    fondo = fondo_mediana(cap, n, fps)
    tableros = candidatos_tablero(fondo)
    if not tableros:
        raise SystemExit("No encuentro ningún tablero en la imagen. Marca los aros a mano con 1-calibrar.bat.")
    aros = [aro_de_tablero(f"c{i}", t, ancho) for i, t in enumerate(tableros)]
    dur = n / fps if n else 600
    # Tramos repartidos por el partido (o todo el vídeo si es corto)
    tramo = 45.0
    num = max(1, min(int(minutos * 60 / tramo), int(dur // tramo) or 1))
    inicios = [0.0] if dur <= minutos * 60 else [dur * (k + 0.5) / num - tramo / 2 for k in range(num)]
    largo = dur if dur <= minutos * 60 else tramo
    fps_an = 10.0
    paso = max(1, round(fps / fps_an))
    seguidores = []
    for a in aros:
        aro = Aro(a["nombre"], a["x"], a["y"], a["w"], a["h"])
        aro.preparar(ancho, alto)
        sg = SeguidorAro(aro, {}, fps / paso)
        sg.preparar_zona(ancho, alto)
        seguidores.append(sg)
    for ini in inicios:
        cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, ini) * 1000)
        i = 0
        while i / fps < largo:
            if i % paso:
                if not cap.grab():
                    break
                i += 1
                continue
            ok, f = cap.read()
            if not ok:
                break
            t = max(0.0, ini) + i / fps
            for sg in seguidores:
                sg.procesar(t, f)
            i += 1
        for sg in seguidores:
            sg.cerrar()
            sg.fondo = cv2.createBackgroundSubtractorMOG2(history=int(sg.fps * 8), varThreshold=20, detectShadows=False)
    cap.release()
    def nota(sg):
        ruido = sg.ruido / max(1, sg.cuadros)   # encima de un aro de juego casi nunca pasa gente
        return len(sg.eventos) * max(0.0, 1.0 - 12 * ruido)
    for k, sg in enumerate(seguidores):
        if os.environ.get("DETECTOR_DEPURAR"):
            print(aros[k], len(sg.eventos), round(sg.ruido / max(1, sg.cuadros), 3))
    # Las dos canastas de una pista: lados opuestos, altura y tamaño parecidos. Mejor pareja; si no hay, la mejor sola.
    validos = [(nota(sg), k) for k, sg in enumerate(seguidores) if nota(sg) >= 0.9]
    cx = lambda a: a["x"] + a["w"] / 2
    elegidos, mejor = [], 0.0
    for i1 in range(len(validos)):
        for i2 in range(i1 + 1, len(validos)):
            (n1, k1), (n2, k2) = validos[i1], validos[i2]
            a, b = aros[k1], aros[k2]
            if abs(cx(a) - cx(b)) < 0.3 * ancho or abs(a["y"] - b["y"]) > 0.15 * alto or max(a["w"], b["w"]) / min(a["w"], b["w"]) > 1.8:
                continue
            n = min(n1, n2) * 2 + max(n1, n2) * 0.01
            if n > mejor:
                mejor, elegidos = n, [k1, k2]
    if not elegidos and validos:
        elegidos = [max(validos)[1]]
    if not elegidos:
        raise SystemExit("No he visto tiros en ninguna canasta. Marca los aros a mano con 1-calibrar.bat.")
    res = []
    for k in sorted(elegidos, key=lambda k: aros[k]["x"]):
        a = dict(aros[k])
        pts = np.array([e.px for e in seguidores[k].eventos if e.px])
        if len(pts) >= 2:  # el aro está donde llegan los tiros
            # en horizontal, donde llegan los tiros; la altura, la del tablero (los tiros se ven llegar desde arriba)
            a["x"] = int(round(np.median(pts[:, 0]) - a["w"] / 2))
        a["tiros_vistos"] = len(seguidores[k].eventos)
        res.append(a)
    nombres = ["izquierda", "derecha"] if len(res) == 2 else ["canasta"]
    for a, nm in zip(res, nombres):
        a["nombre"] = nm
    return {"video": os.path.basename(ruta), "ancho": ancho, "alto": alto, "aros": res, "auto": True, "fondo": fondo}


def guardar_calibracion(ruta_video: str, datos: dict) -> str:
    salida = ruta_calibracion(ruta_video)
    fondo = datos.pop("fondo", None)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    if fondo is not None:  # imagen para comprobar a ojo dónde ha puesto los aros
        img = fondo.copy()
        for a in datos["aros"]:
            cv2.rectangle(img, (a["x"], a["y"]), (a["x"] + a["w"], a["y"] + a["h"]), (0, 255, 255), 2)
            cv2.putText(img, a["nombre"], (a["x"] - 10, max(15, a["y"] - 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.imwrite(os.path.splitext(salida)[0] + ".jpg", img)
    return salida


# ----------------------------------------------------------------------------- calibración
def calibrar(args) -> None:
    cap, fps, n, ancho, alto = abrir_video(args.video)
    datos = {"video": os.path.basename(args.video), "ancho": ancho, "alto": alto, "aros": [], "balon": dict(BALON_DEFECTO)}

    if args.aro:  # sin ventanas: --aro izquierda=x,y,w,h
        for txt in args.aro:
            nombre, _, nums = txt.partition("=")
            x, y, w, h = (int(float(v)) for v in nums.split(","))
            datos["aros"].append({"nombre": nombre.strip() or f"aro{len(datos['aros']) + 1}", "x": x, "y": y, "w": w, "h": h})
    else:
        cap.set(cv2.CAP_PROP_POS_MSEC, args.segundo * 1000)
        ok, frame = cap.read()
        if not ok:
            raise SystemExit("No he podido leer ese momento del vídeo. Prueba con --segundo 60.")
        manual = getattr(args, "manual", False)
        if not manual:
            # Propuesta automática: se enseña y se acepta con Enter (o M para marcar a mano)
            try:
                prop = autocalibrar(args.video)
            except SystemExit as e:
                print(e)
                prop = None
            if prop:
                img = frame.copy()
                for a in prop["aros"]:
                    cv2.rectangle(img, (a["x"] - 3, a["y"] - 3), (a["x"] + a["w"] + 3, a["y"] + a["h"] + 3), (0, 255, 255), 2)
                    cv2.putText(img, a["nombre"], (a["x"] - 10, max(15, a["y"] - 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                print("\nHe encontrado estas canastas (recuadros amarillos). Enter = correcto · M = marcarlas a mano")
                ventana = "Canastas encontradas · Enter = correcto, M = a mano"
                cv2.namedWindow(ventana, cv2.WINDOW_NORMAL)
                esc = min(1.0, 1400 / img.shape[1])
                cv2.resizeWindow(ventana, int(img.shape[1] * esc), int(img.shape[0] * esc))
                cv2.imshow(ventana, img)
                tecla = cv2.waitKey(0) & 0xFF
                cv2.destroyAllWindows()
                if tecla not in (ord("m"), ord("M")):
                    cap.release()
                    salida = args.salida or ruta_calibracion(args.video)
                    guardar_calibracion(args.video, prop) if not args.salida else None
                    if args.salida:
                        prop.pop("fondo", None)
                        with open(salida, "w", encoding="utf-8") as f:
                            json.dump(prop, f, ensure_ascii=False, indent=2)
                    print(f"\nCalibración guardada en: {salida}")
                    return
        for nombre in ("izquierda", "derecha"):
            print(f"\nDibuja un rectángulo justo alrededor del ARO de la canasta {nombre.upper()} (solo el aro, no el tablero).")
            print("  Enter o Espacio = aceptar · C = no se ve esta canasta / saltar")
            r = cv2.selectROI(f"Aro {nombre} · Enter para aceptar, C para saltar", frame, showCrosshair=True)
            cv2.destroyAllWindows()
            if r[2] > 3 and r[3] > 1:
                datos["aros"].append({"nombre": nombre, "x": int(r[0]), "y": int(r[1]), "w": int(r[2]), "h": int(r[3])})
        if False:  # desde la 0.2 el balón se busca por movimiento, no por color
            print("\n(Opcional) Busca un momento en el que se vea bien el balón y dibuja un rectángulo pequeño SOLO sobre el balón.")
            print("  Si en este fotograma no se ve, pulsa C y se usará el naranja por defecto.")
            r = cv2.selectROI("Balón (opcional) · Enter para aceptar, C para saltar", frame, showCrosshair=True)
            cv2.destroyAllWindows()
            if r[2] > 2 and r[3] > 2:
                datos["balon"] = color_balon(frame[r[1]:r[1] + r[3], r[0]:r[0] + r[2]])
    cap.release()
    if not datos["aros"]:
        raise SystemExit("No se ha marcado ningún aro. Vuelve a ejecutar la calibración.")
    salida = args.salida or ruta_calibracion(args.video)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"\nCalibración guardada en: {salida}")
    for a in datos["aros"]:
        print(f"  Aro {a['nombre']}: x={a['x']} y={a['y']} ancho={a['w']} alto={a['h']}")


def color_balon(recorte) -> dict:
    hsv = cv2.cvtColor(recorte, cv2.COLOR_BGR2HSV).reshape(-1, 3)
    # nos quedamos con los píxeles con color (no el fondo gris)
    con_color = hsv[(hsv[:, 1] > 60) & (hsv[:, 2] > 50)]
    if len(con_color) < 5:
        return dict(BALON_DEFECTO)
    h, s, v = np.median(con_color, axis=0)
    return {"h_min": int(max(0, h - 10)), "h_max": int(min(179, h + 10)), "s_min": int(max(60, s - 70)), "v_min": int(max(50, v - 80))}


# ----------------------------------------------------------------------------- análisis
@dataclass
class Aro:
    nombre: str
    x: int
    y: int
    w: int
    h: int
    # zona de trabajo alrededor del aro (recorte del fotograma)
    x0: int = 0
    y0: int = 0
    x1: int = 0
    y1: int = 0

    def preparar(self, ancho: int, alto: int) -> None:
        W = self.w
        self.x0 = max(0, int(self.x - 1.6 * W))
        self.x1 = min(ancho, int(self.x + self.w + 1.6 * W))
        self.y0 = max(0, int(self.y - 2.8 * W))
        self.y1 = min(alto, int(self.y + self.h + 1.6 * W))

    def a_aro(self, cx: float, cy: float) -> tuple[float, float]:
        """Coordenadas relativas al aro, en «anchos de aro»: u horizontal desde el centro, v vertical desde el borde superior (negativo = por encima)."""
        return ((cx - (self.x + self.w / 2)) / self.w, (cy - self.y) / self.w)


@dataclass
class Evento:
    t: float               # momento del tiro (llegada al aro), en segundos del vídeo
    t_inicio: float
    t_fin: float
    canasta: str
    resultado: str         # anotada / fallada / desconocido
    confianza: float
    observaciones: int
    trayectoria: list = field(default_factory=list)  # [(t, u, v)] para depurar
    px: list = field(default_factory=list)           # punto de llegada al aro en píxeles (para la autocalibración)


class SeguidorAro:
    """Busca el balón en vuelo cerca de un aro y decide si hay tiro (y, si se ve, si entra).

    No depende del color (con poca luz el balón sale marrón oscuro): busca manchas que se mueven,
    del tamaño del balón, y las une en trayectorias. Un tiro es una trayectoria que viene desde
    encima del aro y baja hasta él.
    """

    U_MAX, V_MIN, V_MAX = 6.0, -7.0, 2.0   # zona vigilada, en anchos de aro

    def __init__(self, aro: Aro, balon: dict, fps_analisis: float):
        self.aro = aro
        self.balon = balon
        self.fps = fps_analisis
        self.fondo = cv2.createBackgroundSubtractorMOG2(history=int(fps_analisis * 8), varThreshold=20, detectShadows=False)
        self.d = 0.5 * aro.w  # diámetro esperado del balón (24 cm de balón / 45 cm de aro)
        area = math.pi * (self.d / 2) ** 2
        self.area_min = max(4.0, area * 0.25)
        self.area_max = area * 2.6
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        self.pistas: list[list[tuple[float, float, float]]] = []   # trayectorias abiertas [(t, u, v)]
        self.ultimo_t = -1e9
        self.obs: list = []          # compatibilidad: hay algo pendiente de cerrar
        self.eventos: list[Evento] = []
        self.fin_ultimo = -1e9
        self.cuadros = 0   # fotogramas analizados
        self.ruido = 0     # fotogramas con algo grande moviéndose encima del aro (gente): no es un aro de juego

    def preparar_zona(self, ancho: int, alto: int) -> None:
        a, W = self.aro, self.aro.w
        a.x0 = max(0, int(a.x + a.w / 2 - self.U_MAX * W))
        a.x1 = min(ancho, int(a.x + a.w / 2 + self.U_MAX * W))
        a.y0 = max(0, int(a.y + self.V_MIN * W))
        a.y1 = min(alto, int(a.y + self.V_MAX * W))

    def candidatos(self, frame) -> list[tuple[float, float]]:
        a = self.aro
        rec = frame[a.y0:a.y1, a.x0:a.x1]
        if rec.size == 0:
            return []
        mov = self.fondo.apply(rec)
        mov = cv2.morphologyEx(mov, cv2.MORPH_OPEN, self.kernel)
        mov = cv2.dilate(mov, self.kernel, iterations=1)
        contornos, _ = cv2.findContours(mov, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        grande = False
        res = []
        self.cuadros += 1
        grande = False
        for c in contornos:
            area = cv2.contourArea(c)
            if area > self.area_max * 4:
                x, y, w, h = cv2.boundingRect(c)
                if a.a_aro(a.x0 + x + w / 2, a.y0 + y + h / 2)[1] < -1.0:
                    grande = True
            if not (self.area_min <= area <= self.area_max):
                continue
            x, y, w, h = cv2.boundingRect(c)
            if max(w, h) > 2.2 * self.d + 3 or not (0.45 <= w / max(h, 1) <= 2.2):
                continue
            if area / max(1.0, w * h) < 0.4:   # poco «relleno»: un brazo, una línea
                continue
            u, v = a.a_aro(a.x0 + x + w / 2, a.y0 + y + h / 2)
            res.append((u, v))
        if grande:
            self.ruido += 1
        return res

    def procesar(self, t: float, frame) -> None:
        cands = self.candidatos(frame)
        if len(cands) > 6:   # demasiado movimiento (gente pasando, cambio de luz): no fiable
            cands = []
        usados = set()
        # Cada trayectoria abierta se queda con el candidato más cercano a donde debería estar
        for pista in sorted(self.pistas, key=len, reverse=True):
            t1, u1, v1 = pista[-1]
            if len(pista) >= 2:
                t0, u0, v0 = pista[-2]
                dt0 = max(1e-3, t1 - t0)
                du, dv = (u1 - u0) / dt0, (v1 - v0) / dt0
            else:
                du = dv = 0.0
            dt = t - t1
            pu, pv = u1 + du * dt, v1 + dv * dt
            margen = 1.6 + (0.0 if len(pista) >= 2 else 1.4)
            mejor = None
            for k, (u, v) in enumerate(cands):
                if k in usados:
                    continue
                dist = math.hypot(u - pu, v - pv)
                if dist < margen and (mejor is None or dist < mejor[0]):
                    mejor = (dist, k)
            if mejor:
                usados.add(mejor[1])
                pista.append((t, *cands[mejor[1]]))
        for k, (u, v) in enumerate(cands):
            if k not in usados:
                self.pistas.append([(t, u, v)])
        # Cerrar las que llevan un rato sin verse
        vivas = []
        for pista in self.pistas:
            if t - pista[-1][0] > 0.35:
                self.evaluar(pista)
            else:
                vivas.append(pista)
        self.pistas = vivas
        self.obs = self.pistas

    def cerrar(self) -> None:
        for pista in self.pistas:
            self.evaluar(pista)
        self.pistas = []
        self.obs = []

    def evaluar(self, obs: list[tuple[float, float, float]]) -> None:
        if len(obs) < 3 or obs[-1][0] - obs[0][0] < 0.12:
            return
        recorrido = sum(math.hypot(b[1] - a[1], b[2] - a[2]) for a, b in zip(obs, obs[1:]))
        if recorrido < 1.5:
            return  # casi quieto: no es un balón en vuelo
        arriba = [o for o in obs if o[2] < -1.0]
        cerca = [k for k, o in enumerate(obs) if abs(o[1]) < 1.4 and -1.8 < o[2] < 0.9]
        if arriba and cerca:
            k = cerca[0]
            if obs[k][0] < arriba[0][0]:
                # llega al aro antes de haber estado arriba: solo vale si después sube (palmeo / rebote)
                if not any(o[0] > obs[k][0] for o in arriba):
                    return
            # Tiene que llegar bajando
            previos = [o for o in obs[:k + 1] if o[0] >= obs[k][0] - 0.4]
            if len(previos) >= 2 and previos[-1][2] < previos[0][2] - 0.2:
                return
        else:
            # Bandeja: el balón sube desde abajo hasta la altura del aro, junto a él, y luego cae en el aro
            pico = min(range(len(obs)), key=lambda j: obs[j][2])
            tras = [j for j in range(pico, len(obs)) if abs(obs[j][1]) < 0.9 and -0.7 < obs[j][2] < 0.9]
            if obs[0][2] > 0.6 and obs[pico][2] < -0.4 and abs(obs[pico][1]) < 1.8 and tras:
                k = tras[0]
            elif abs(obs[0][1]) < 1 and -1.3 < obs[0][2] < -0.3 and any(abs(o[1]) < 0.75 and 0.35 < o[2] < 2 for o in obs[1:]):
                k = 0  # aparece a la altura del aro (la subida se perdió entre los brazos) y cae por la red
            else:
                return
        llegada = obs[k][0]
        despues = obs[k + 1:]
        red = [o for o in despues if abs(o[1]) < 0.75 and 0.35 < o[2] < 2.0]
        sube = [o for o in despues if o[2] < obs[k][2] - 1.0]
        sale = [o for o in despues if abs(o[1]) > 1.1 and o[2] < 1.0]   # rebota hacia un lado
        if red and not sube:
            resultado = "anotada"
        elif sube or sale:
            resultado = "fallada"
        else:
            resultado = "desconocido"
        conf = min(1.0, 0.3 + 0.07 * len(obs)) * (0.85 if resultado == "desconocido" else 1.0)
        if llegada - self.fin_ultimo < 1.6 and self.eventos and self.eventos[-1].canasta == self.aro.nombre:
            # sigue la misma jugada (el balón bota en el aro y vuelve a caer)
            prev = self.eventos[-1]
            if resultado == "anotada" or prev.resultado == "desconocido":
                prev.resultado = resultado if resultado != "desconocido" else ("fallada" if prev.resultado == "desconocido" else prev.resultado)
            prev.t_fin = round(obs[-1][0], 2)
            prev.observaciones += len(obs)
            prev.confianza = round(max(prev.confianza, conf), 2)
            prev.trayectoria += [[round(x, 2) for x in o] for o in obs]
            self.fin_ultimo = obs[-1][0]
            return
        a = self.aro
        self.eventos.append(Evento(
            t=round(llegada, 2), t_inicio=round(obs[0][0], 2), t_fin=round(obs[-1][0], 2), canasta=self.aro.nombre,
            resultado=resultado, confianza=round(conf, 2), observaciones=len(obs), trayectoria=[[round(x, 2) for x in o] for o in obs],
            px=[round(a.x + a.w / 2 + obs[k][1] * a.w, 1), round(a.y + obs[k][2] * a.w, 1)],
        ))
        self.fin_ultimo = obs[-1][0]


def analizar(args) -> dict:
    cal = args.calibracion or ruta_calibracion(args.video)
    if not os.path.isfile(cal):
        # Sin calibrar: busca él solo las canastas (cada partido es un pabellón distinto)
        datos = autocalibrar(args.video)
        cal = guardar_calibracion(args.video, datos)
        print("Canastas encontradas:")
        for a in datos["aros"]:
            print(f"  {a['nombre']}: x={a['x']} y={a['y']} (tiros vistos al buscar: {a.get('tiros_vistos', 0)})")
        print(f"  Comprueba que los recuadros están sobre los aros en: {os.path.splitext(cal)[0]}.jpg")
        print("  Si no, borra ese .aros.json y márcalos con 1-calibrar.bat\n")
    with open(cal, encoding="utf-8") as f:
        c = json.load(f)
    cap, fps, n, ancho, alto = abrir_video(args.video)
    if (c.get("ancho"), c.get("alto")) not in ((ancho, alto), (None, None)):
        print(f"Aviso: la calibración se hizo con un vídeo de {c.get('ancho')}x{c.get('alto')} y este es {ancho}x{alto}.")
    fps_an = args.fps or PERFILES[args.perfil]
    paso = max(1, round(fps / fps_an))
    aros = []
    for a in c["aros"]:
        aro = Aro(a["nombre"], a["x"], a["y"], a["w"], a["h"])
        aro.preparar(ancho, alto)
        aros.append(aro)
    seguidores = [SeguidorAro(a, c.get("balon", BALON_DEFECTO), fps / paso) for a in aros]
    for sg in seguidores:
        sg.preparar_zona(ancho, alto)
    inicio = max(0.0, args.inicio or 0.0)
    fin = args.fin if args.fin else (n / fps if n else 1e9)
    if inicio:
        cap.set(cv2.CAP_PROP_POS_MSEC, inicio * 1000)
    i = int(round(inicio * fps))
    t0 = time.time()
    ultimo_aviso = 0.0
    duracion = max(1.0, fin - inicio)
    interrumpido = False
    print(f"Analizando {os.path.basename(args.video)}: {ancho}x{alto}, {fps:.1f} fps, {mmss(duracion)} · {len(aros)} aro(s) · {fps / paso:.1f} fotogramas por segundo")
    try:
        while True:
            t = i / fps
            if t > fin:
                break
            if (i - int(round(inicio * fps))) % paso:
                if not cap.grab():
                    break
                i += 1
                continue
            ok, frame = cap.read()
            if not ok:
                break
            for s in seguidores:
                s.procesar(t, frame)
            i += 1
            if time.time() - ultimo_aviso > 2:
                ultimo_aviso = time.time()
                hecho = (t - inicio) / duracion
                pasado = time.time() - t0
                resto = pasado / hecho - pasado if hecho > 0.02 else None
                tiros = sum(len(s.eventos) for s in seguidores)
                print(f"\r  {hecho * 100:5.1f} %  vídeo {mmss(t)}  · tiros encontrados: {tiros}" + (f"  · faltan ~{mmss(resto)}" if resto else ""), end="", flush=True)
    except KeyboardInterrupt:
        interrumpido = True
        print("\nInterrumpido: guardo lo que se ha analizado hasta ahora.")
    for s in seguidores:
        if s.obs:
            s.cerrar()
    cap.release()
    eventos = sorted((e for s in seguidores for e in s.eventos), key=lambda e: e.t)
    if args.confianza_min:
        eventos = [e for e in eventos if e.confianza >= args.confianza_min]
    res = {
        "herramienta": "detector-tiros", "version": VERSION, "video": {"archivo": os.path.basename(args.video), "fps": fps, "ancho": ancho, "alto": alto, "duracion": round(n / fps, 1) if n else None},
        "ajustes": {"perfil": args.perfil, "fps_analisis": round(fps / paso, 2), "inicio": inicio, "fin": None if fin >= 1e9 else fin},
        "aros": [{"nombre": a.nombre, "x": a.x, "y": a.y, "w": a.w, "h": a.h} for a in aros],
        "analizado_hasta": round(min(fin, i / fps), 1), "interrumpido": interrumpido, "segundos_proceso": round(time.time() - t0, 1),
        "eventos": [{k: v for k, v in asdict(e).items() if k != "px" and (args.depurar or k != "trayectoria")} for e in eventos],
    }
    salida = args.salida or ruta_salida(args.video)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    an = sum(1 for e in eventos if e.resultado == "anotada")
    fa = sum(1 for e in eventos if e.resultado == "fallada")
    print(f"\n\nListo en {mmss(time.time() - t0)}: {len(eventos)} tiros candidatos ({an} anotados, {fa} fallados, {len(eventos) - an - fa} sin saber).")
    for a in aros:
        print(f"  Canasta {a.nombre}: {sum(1 for e in eventos if e.canasta == a.nombre)}")
    print(f"Archivo para importar en Coach Manager: {salida}")
    if args.depurar:
        guardar_capturas(args.video, eventos, aros, os.path.splitext(salida)[0] + "_capturas")
    return res


def guardar_capturas(video: str, eventos: list[Evento], aros: list[Aro], carpeta: str) -> None:
    """Una imagen por tiro con la zona del aro y la trayectoria detectada (para comprobar a ojo)."""
    os.makedirs(carpeta, exist_ok=True)
    cap, fps, *_ = abrir_video(video)
    por_nombre = {a.nombre: a for a in aros}
    for k, e in enumerate(eventos):
        a = por_nombre[e.canasta]
        cap.set(cv2.CAP_PROP_POS_MSEC, e.t * 1000)
        ok, frame = cap.read()
        if not ok:
            continue
        img = frame[a.y0:a.y1, a.x0:a.x1].copy()
        cv2.rectangle(img, (a.x - a.x0, a.y - a.y0), (a.x - a.x0 + a.w, a.y - a.y0 + a.h), (255, 255, 0), 1)
        for _, u, v in e.trayectoria:
            px = int(a.x + a.w / 2 + u * a.w - a.x0)
            py = int(a.y + v * a.w - a.y0)
            cv2.circle(img, (px, py), 3, (0, 255, 0) if e.resultado == "anotada" else (0, 0, 255), -1)
        nombre = f"{k + 1:03d}_{mmss(e.t).replace(':', 'm')}s_{e.canasta}_{e.resultado}.jpg"
        cv2.imwrite(os.path.join(carpeta, nombre), img)
    cap.release()
    print(f"Capturas para revisar en: {carpeta}")


# ----------------------------------------------------------------------------- evaluación
def evaluar(args) -> dict:
    with open(args.detecciones, encoding="utf-8") as f:
        det = json.load(f)
    with open(args.etiquetas, encoding="utf-8") as f:
        eti = json.load(f)
    reales = [c for c in eti.get("clips", []) if c.get("estadistica") in ("t2", "t3", "tl")]
    if not args.con_libres:
        reales = [c for c in reales if c["estadistica"] != "tl"]
    detectados = list(det.get("eventos", []))
    hasta = det.get("analizado_hasta")
    if hasta:
        reales = [c for c in reales if c["momento"] <= hasta + args.tolerancia]
    usados = set()
    pares = []
    for d in sorted(detectados, key=lambda x: x["t"]):
        t = d["t"] + args.desfase
        cand = [(abs(c["momento"] - t), j) for j, c in enumerate(reales) if j not in usados and abs(c["momento"] - t) <= args.tolerancia]
        if cand:
            _, j = min(cand)
            usados.add(j)
            pares.append((d, reales[j]))
    tp = len(pares)
    precision = tp / len(detectados) if detectados else 0.0
    recall = tp / len(reales) if reales else 0.0
    con_res = [(d, c) for d, c in pares if d["resultado"] in ("anotada", "fallada") and c.get("resultado") in ("bien", "mal")]
    acierto_res = sum(1 for d, c in con_res if (d["resultado"] == "anotada") == (c["resultado"] == "bien")) / len(con_res) if con_res else None
    res = {
        "tiros_etiquetados": len(reales), "tiros_detectados": len(detectados), "coinciden": tp,
        "precision": round(precision, 3), "recall": round(recall, 3),
        "acierto_resultado": None if acierto_res is None else round(acierto_res, 3), "con_resultado_comparable": len(con_res),
        "no_encontrados": [round(reales[j]["momento"], 1) for j in range(len(reales)) if j not in usados],
        "falsos": [round(d["t"], 1) for d in detectados if not any(d is p[0] for p in pares)],
    }
    print(f"Tiros etiquetados a mano: {len(reales)}  ·  detectados: {len(detectados)}  ·  coinciden (±{args.tolerancia:g} s): {tp}")
    print(f"  Encuentra el {recall * 100:.0f} % de los tiros (recall) · el {precision * 100:.0f} % de lo detectado son tiros de verdad (precisión)")
    if acierto_res is not None:
        print(f"  Anotada/fallada correcta en el {acierto_res * 100:.0f} % de {len(con_res)} tiros comparables")
    if res["no_encontrados"]:
        print("  No encontrados (segundo del vídeo): " + ", ".join(mmss(x) for x in res["no_encontrados"][:30]))
    if res["falsos"]:
        print("  Detectados que no son tiros: " + ", ".join(mmss(x) for x in res["falsos"][:30]))
    if args.salida:
        with open(args.salida, "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
    return res


# ----------------------------------------------------------------------------- asistente (un solo programa)
def elegir_video() -> str | None:
    """Ventana de Windows para elegir el vídeo (sin instalar nada); si no se puede, se pide la ruta."""
    if os.name == "nt":
        import subprocess
        ps = ("Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; "
              "$d.Title = 'Elige el vídeo del partido'; $d.Filter = 'Vídeos|*.mp4;*.mov;*.mkv;*.avi;*.m4v|Todos|*.*'; "
              "if ($d.ShowDialog() -eq 'OK') { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $d.FileName }")
        try:
            r = subprocess.run(["powershell", "-NoProfile", "-STA", "-Command", ps], capture_output=True, timeout=600)
            ruta = r.stdout.decode("utf-8", "replace").strip()
            if ruta:
                return ruta
        except Exception:
            pass
    print("Arrastra aquí el vídeo del partido (o escribe su ruta) y pulsa Enter:")
    ruta = input("> ").strip().strip('"')
    return ruta or None


def abrir_carpeta(ruta: str) -> None:
    if os.name == "nt":
        import subprocess
        try:
            subprocess.Popen(["explorer", "/select,", os.path.normpath(ruta)])
        except Exception:
            pass


def asistente(args) -> None:
    print("=" * 60)
    print(f"  DETECTOR DE TIROS · Coach Manager CBTuró  (v{VERSION})")
    print("=" * 60)
    video = args.video or elegir_video()
    if not video:
        raise SystemExit("No has elegido ningún vídeo.")
    video = os.path.abspath(video.strip('"'))
    abrir_video(video)[0].release()  # comprueba que se puede abrir
    print(f"\nVídeo: {video}\n")
    cal = ruta_calibracion(video)
    if not os.path.isfile(cal):
        print("Paso 1 de 2 · Buscando las canastas del partido (unos minutos)…")
        print("  Te enseñaré dónde están: Enter si es correcto, M para marcarlas a mano.\n")
        calibrar(argparse.Namespace(video=video, aro=None, segundo=120.0, salida=None, manual=False, sin_balon=True))
    else:
        print("Este vídeo ya tiene las canastas marcadas (archivo .aros.json). Para volver a buscarlas, bórralo.\n")
    print("\nPaso 2 de 2 · Buscando los tiros…  (puedes pararlo con Ctrl+C y se guarda lo hecho)\n")
    analizar(argparse.Namespace(video=video, perfil="equilibrado", fps=None, inicio=None, fin=None, calibracion=None,
                                confianza_min=0.0, depurar=True, salida=None))
    salida = ruta_salida(video)
    print("\n" + "=" * 60)
    print("  HECHO. Ahora en coach.cbturo.com abre el vídeo del partido →")
    print("  Detecciones → Importar, sube este archivo y pulsa «Revisar ahora»:")
    print(f"  {salida}")
    print("=" * 60)
    abrir_carpeta(salida)


# ----------------------------------------------------------------------------- línea de órdenes
def main(argv=None) -> None:
    p = argparse.ArgumentParser(description="Detector de tiros de Coach Manager CBTuró (prueba piloto)")
    sub = p.add_subparsers(dest="orden", required=True)

    w = sub.add_parser("asistente", help="Todo seguido: elegir vídeo, buscar canastas, analizar")
    w.add_argument("video", nargs="?")
    w.set_defaults(func=asistente)

    c = sub.add_parser("calibrar", help="Marcar los aros (y el color del balón) con el ratón")
    c.add_argument("video")
    c.add_argument("--segundo", type=float, default=120, help="Momento del vídeo que se muestra para marcar (por defecto 120)")
    c.add_argument("--aro", action="append", help="Sin ventana: nombre=x,y,ancho,alto (se puede repetir)")
    c.add_argument("--sin-balon", action="store_true", help="No preguntar por el color del balón")
    c.add_argument("--manual", action="store_true", help="Marcar los aros a mano sin propuesta automática")
    c.add_argument("--salida")
    c.set_defaults(func=calibrar)

    a = sub.add_parser("analizar", help="Buscar los tiros en el vídeo")
    a.add_argument("video")
    a.add_argument("--perfil", choices=PERFILES, default="equilibrado")
    a.add_argument("--fps", type=float, help="Fotogramas por segundo a analizar (anula el perfil)")
    a.add_argument("--inicio", type=float, help="Empezar en este segundo")
    a.add_argument("--fin", type=float, help="Acabar en este segundo")
    a.add_argument("--calibracion")
    a.add_argument("--confianza-min", type=float, default=0.0)
    a.add_argument("--depurar", action="store_true", help="Guardar una imagen por tiro y la trayectoria en el JSON")
    a.add_argument("--salida")
    a.set_defaults(func=analizar)

    e = sub.add_parser("evaluar", help="Comparar las detecciones con las etiquetas exportadas de Coach Manager")
    e.add_argument("detecciones")
    e.add_argument("etiquetas")
    e.add_argument("--tolerancia", type=float, default=3.0, help="Segundos de margen (por defecto 3)")
    e.add_argument("--desfase", type=float, default=0.0, help="Segundos a sumar a las detecciones si el vídeo de YouTube no empieza igual que el original")
    e.add_argument("--con-libres", action="store_true", help="Contar también los tiros libres")
    e.add_argument("--salida")
    e.set_defaults(func=evaluar)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
