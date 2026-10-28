"""Genera un vídeo de prueba: canasta fija, «jugadores» moviéndose y un balón naranja que hace tiros conocidos."""
import math
import cv2
import numpy as np

ARO = (900, 300, 60, 8)          # x, y, ancho, alto
FPS = 25
ANCHO, ALTO = 1280, 720
# (segundo, tipo): anotada / fallada / pase
JUGADAS = [(10, "anotada"), (22, "fallada"), (34, "pase"), (42, "anotada")]
DURACION = 50


def trayectoria(tipo: str, k: float):
    """Posición del balón en la jugada (k de 0 a 1), o None si no se ve."""
    ax, ay, aw, _ = ARO
    cx = ax + aw / 2
    if tipo == "pase":
        return (500 + 600 * k, 620)
    if k < 0.7:  # vuelo en parábola desde la izquierda hasta el aro
        s = k / 0.7
        x0, y0 = 620, 520
        x1 = cx if tipo == "anotada" else cx + 30
        y1 = ay - 4
        x = x0 + (x1 - x0) * s
        y = y0 + (y1 - y0) * s - 330 * math.sin(math.pi * s) * (1 - 0.15 * s)
        return (x, y)
    s = (k - 0.7) / 0.3
    if tipo == "anotada":   # cae por dentro del aro y la red
        return (cx, ay - 4 + 110 * s)
    return (cx + 30 + 120 * s, ay - 4 - 70 * math.sin(math.pi * s * 0.8))  # rebota hacia fuera


def generar(ruta: str) -> list:
    w = cv2.VideoWriter(ruta, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (ANCHO, ALTO))
    rng = np.random.default_rng(7)
    fondo = np.full((ALTO, ANCHO, 3), (60, 110, 160), np.uint8)  # parquet
    fondo[: ALTO // 3] = (90, 90, 90)                              # grada
    cv2.rectangle(fondo, (870, 200), (990, 280), (240, 240, 240), -1)  # tablero
    ax, ay, aw, ah = ARO
    cv2.rectangle(fondo, (ax, ay), (ax + aw, ay + ah), (20, 90, 230), -1)  # aro (naranja, quieto)
    reales = []
    for i in range(DURACION * FPS):
        t = i / FPS
        img = fondo.copy()
        img = cv2.add(img, rng.integers(0, 6, img.shape, dtype=np.uint8))
        # jugadores (rectángulos oscuros que se mueven)
        for j in range(4):
            px = int(300 + 200 * j + 120 * math.sin(t * 0.7 + j))
            cv2.rectangle(img, (px, 420), (px + 40, 600), (40 + 20 * j, 30, 30), -1)
        for t0, tipo in JUGADAS:
            k = (t - t0) / 1.6
            if 0 <= k <= 1:
                p = trayectoria(tipo, k)
                if p:
                    cv2.circle(img, (int(p[0]), int(p[1])), 15, (0, 110, 240), -1)
        w.write(img)
    w.release()
    for t0, tipo in JUGADAS:
        if tipo != "pase":
            reales.append({"momento": t0 + 1.6 * 0.7, "estadistica": "t2", "resultado": "bien" if tipo == "anotada" else "mal"})
    return reales


if __name__ == "__main__":
    import sys
    print(generar(sys.argv[1] if len(sys.argv) > 1 else "sintetico.mp4"))
